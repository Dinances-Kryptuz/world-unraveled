import {
  doc,
  getDoc,
  updateDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  runTransaction,
  deleteField,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { Inventory } from '../types/character';
import type { BaseStat } from '../gameData/classStats';
import { MAX_VARIANTS_PER_BASE_ITEM } from '../gameData/equipmentRolls';
import { chargedInstanceId } from '../gameData/consumableCharges';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';

// Shared by all three grant functions below — surfaces exactly what the bag
// being full actually cost the player, the "message saying you received
// this loot but your inventory was full" half of the "don't cancel the
// action, just don't add the loot" convention documented on
// grantInventoryItems. Not gated by notificationsEnabled (unlike the
// routine "crafted"/"defeated" toasts) since this reports something
// actually lost, not just flavor.
function notifyDroppedForFullBag(dropped: { itemId: string; quantity: number }[]): void {
  if (dropped.length === 0) return;
  notify(
    'Inventory full',
    dropped.map((d) => `${d.quantity}x ${ITEMS[d.itemId]?.name ?? d.itemId} — not added, your bag was full`)
  );
}

// grantEquipmentInstances' OTHER cap — MAX_VARIANTS_PER_BASE_ITEM distinct
// rolled stat combinations of the same base item — used to be reported
// under this same "Inventory full" toast, which is actively misleading: a
// player crafting the same armor piece repeatedly for a better roll can hit
// this cap with their bag nowhere near full, and "Inventory full" sends
// them looking for bag space that was never the problem.
function notifyDroppedForVariantCap(itemId: string, quantity: number): void {
  if (quantity <= 0) return;
  notify('Too many variants', [
    `${quantity}x ${ITEMS[itemId]?.name ?? itemId} — not added, you already have ${MAX_VARIANTS_PER_BASE_ITEM} different rolls of this item`,
  ]);
}

export async function getInventory(uid: string): Promise<Inventory> {
  const snap = await getDoc(doc(db, 'characters', uid, 'inventory', 'main'));
  if (!snap.exists()) return { items: {} };
  return migratePotionsOutOfChargeBuckets(uid, selfHealFractionalQuantities(uid, snap.data() as Inventory));
}

// A pre-fix build of resolveCraftingOffline (craftingEngine.ts) applied the
// Mastery ingredient-save-chance bonus as a fractional expected-value share
// directly to the Firestore increment() for consumed materials, with no
// flooring step — unlike itemsCrafted's own bonus-output share, which was
// always floored before being persisted. That left some players' `items`
// stacks sitting on a non-integer value (e.g. `497.98`, or tiny float-sum
// residue like `0.0000000000001`) that would never self-correct on its own,
// since every subsequent autosave only ever adds/subtracts relative to
// whatever is already stored. This self-heals it the same lazy, idempotent
// way equipment refs get normalized elsewhere in this codebase: round once
// on read (so the caller never sees a fractional quantity) and fire a
// one-time corrective `increment()` — not an overwrite, so it can't race a
// concurrent autosave write — so the stored value itself settles to the
// same integer and this never has to run again for that item.
function selfHealFractionalQuantities(uid: string, inventory: Inventory): Inventory {
  const items = inventory.items ?? {};
  const corrections: Record<string, unknown> = {};
  const roundedItems: Record<string, number> = { ...items };
  for (const [itemId, quantity] of Object.entries(items)) {
    if (Number.isInteger(quantity)) continue;
    const rounded = Math.round(quantity);
    roundedItems[itemId] = rounded;
    corrections[`items.${itemId}`] = increment(rounded - quantity);
  }
  if (Object.keys(corrections).length > 0) {
    void updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), corrections).catch((err) =>
      console.error('Failed to self-heal fractional inventory quantity:', err)
    );
  }
  return { ...inventory, items: roundedItems };
}

// No-more-charges redesign — every Alchemy-crafted potion (healing, mana,
// offensive, defensive, stat — any recipe tagged alchemyZoneId) used to be
// granted into chargedConsumables instead of the plain `items` stack
// (the root cause of the "potion says I don't have one" bug: several
// consumption paths only ever checked `items`). Only Cooking's Stat Food
// still legitimately uses chargedConsumables going forward (see
// consumableCharges.ts's own doc comment) — any OTHER itemId still sitting
// in a player's chargedConsumables bucket from before this fix is stale
// pre-migration data. Self-heals it the same lazy, idempotent way
// selfHealFractionalQuantities does: fold it into `items` once on read (so
// the caller never sees the stale shape) and fire a one-time corrective
// write that can't race a concurrent autosave. Converts quantity x
// remainingCharges (not just quantity) so a player doesn't lose the
// "attacks worth" they'd already banked under the old charge-per-potion
// model — e.g. 5 potions at 4 charges each becomes 20 plain potions.
function migratePotionsOutOfChargeBuckets(uid: string, inventory: Inventory): Inventory {
  const buckets = inventory.chargedConsumables ?? {};
  const staleEntries = Object.entries(buckets).filter(
    ([, bucket]) => ITEMS[bucket.itemId]?.consumableEffect?.buff?.category !== 'stat_food'
  );
  if (staleEntries.length === 0) return inventory;

  const corrections: Record<string, unknown> = {};
  const migratedItems: Record<string, number> = { ...inventory.items };
  const remainingChargedConsumables = { ...buckets };
  for (const [instanceId, bucket] of staleEntries) {
    const migratedQuantity = bucket.quantity * bucket.remainingCharges;
    migratedItems[bucket.itemId] = (migratedItems[bucket.itemId] ?? 0) + migratedQuantity;
    corrections[`items.${bucket.itemId}`] = increment(migratedQuantity);
    corrections[`chargedConsumables.${instanceId}`] = deleteField();
    delete remainingChargedConsumables[instanceId];
  }
  void updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), corrections).catch((err) =>
    console.error('Failed to self-heal stale charge-bucketed potions:', err)
  );
  return { ...inventory, items: migratedItems, chargedConsumables: remainingChargedConsumables };
}

// The single choke point every loot-granting write (combat kills, gathering/
// fishing yields, crafting results, disenchant yields, quest rewards) goes
// through, instead of a raw increment() — bagSlots caps the number of
// DISTINCT item ids held (see InventoryScreen.tsx's distinctItemCount),
// never total quantity, so stacking more of an item already held is always
// free; only a genuinely NEW item id can be turned away, and only once
// every slot is full. Reads inventory/bagSlots fresh so a slot freed by the
// SAME action (e.g. a crafting recipe's material consumption, which callers
// should write BEFORE calling this — see applyCraftingProfessionResult)
// is already reflected. The action that produced the loot is never blocked
// by this — only the item grant itself is capped; a full bag silently
// drops the new item rather than stopping combat/gathering/crafting/
// disenchanting, matching "online or offline, actions should not stop, you
// just don't receive loot." Returns what was actually granted, for a caller
// that wants to report it (e.g. a toast).
export async function grantInventoryItems(
  uid: string,
  grants: { itemId: string; quantity: number }[]
): Promise<{ itemId: string; quantity: number }[]> {
  const positiveGrants = grants.filter((g) => g.quantity > 0);
  if (positiveGrants.length === 0) return [];

  const invRef = doc(db, 'characters', uid, 'inventory', 'main');
  const charRef = doc(db, 'characters', uid);
  // The bag-slot check-then-write below must be atomic relative to any
  // OTHER grant happening around the same moment (a kill reward and a
  // quest reward landing within the same autosave window, two tabs open,
  // etc.) — two independent getDoc()-then-updateDoc() calls could each
  // read "one slot free" and both accept a new distinct item, pushing the
  // bag over its cap (e.g. 25/24). A transaction makes the whole read+
  // decide+write one atomic unit instead, same fix for all three grant
  // functions below.
  let dropped: { itemId: string; quantity: number }[] = [];

  const accepted = await runTransaction(db, async (tx) => {
    const [invSnap, charSnap] = await Promise.all([tx.get(invRef), tx.get(charRef)]);
    const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
    const items = inventory.items ?? {};
    const bagSlots: number = charSnap.exists() ? ((charSnap.data().bagSlots as number) ?? 0) : 0;

    // Must include equipmentInstances/chargedConsumables-only base items
    // (countDistinctBaseItems — same helper grantEquipmentInstances/
    // grantChargedConsumables below already use), not just `items` — a
    // player holding several items ONLY as rolled-gear or charged-potion
    // buckets (never as a plain `items` stack) would otherwise have those
    // slots invisible to this count, letting a combat/gathering/quest/
    // vendor grant through this function accept new items past the bag's
    // real occupancy. Same root cause as the "22/24" miscount this
    // project has already hit once elsewhere, reproduced here.
    let distinctCount = Object.values(items).filter((q) => q > 0).length + countDistinctBaseItems(inventory);
    const seenNew = new Set<string>();
    const acceptedInner: { itemId: string; quantity: number }[] = [];
    dropped = [];

    for (const grant of positiveGrants) {
      const alreadyHeld = (items[grant.itemId] ?? 0) > 0 || seenNew.has(grant.itemId);
      if (!alreadyHeld) {
        if (distinctCount >= bagSlots) {
          dropped.push(grant); // bag full — this one new item is dropped
          continue;
        }
        distinctCount++;
        seenNew.add(grant.itemId);
      }
      acceptedInner.push(grant);
    }

    if (acceptedInner.length > 0) {
      const updates: Record<string, unknown> = {};
      for (const g of acceptedInner) updates[`items.${g.itemId}`] = increment(g.quantity);
      tx.update(invRef, updates);
    }
    return acceptedInner;
  });

  // Side effects (the toast) happen AFTER the transaction settles, never
  // inside the callback above — Firestore retries a transaction callback
  // on contention, and a notify() call inside it could fire more than
  // once for the same logical grant.
  notifyDroppedForFullBag(dropped);
  return accepted;
}

// The randomized-equipment counterpart to grantInventoryItems above — grants
// rolled instances of ONE base item (itemId), bucketed by their own
// deterministic instanceId (gameData/equipmentRolls.ts's canonicalInstanceId)
// so identical rolls stack together instead of each needing a new bucket.
// Two caps apply, checked independently:
//   1. bagSlots (same as grantInventoryItems) — only spent once, the first
//      time this base item id is ever held (by either a plain `items` stack
//      or an `equipmentInstances` bucket); further rolls of an
//      already-held item never spend another slot.
//   2. MAX_VARIANTS_PER_BASE_ITEM — how many DISTINCT instanceIds this one
//      base item may have bucketed at once; a new distinct roll beyond this
//      is silently dropped (same "loot dropped, nothing stops" convention
//      grantInventoryItems already uses for a full bag), while more of an
//      ALREADY-bucketed instanceId always stacks freely.
// Returns what was actually granted, mirroring grantInventoryItems.
export async function grantEquipmentInstances(
  uid: string,
  itemId: string,
  grants: { instanceId: string; rolls: Partial<Record<BaseStat, number>>; quantity: number }[]
): Promise<{ instanceId: string; quantity: number }[]> {
  // Aggregate by instanceId first — a caller may pass the same instanceId
  // more than once (e.g. several offline-crafting batches rolling the same
  // stats), and each must add to one running total, not overwrite it.
  const rollsByInstance = new Map<string, Partial<Record<BaseStat, number>>>();
  const requestedQuantities = new Map<string, number>();
  for (const g of grants) {
    if (g.quantity <= 0) continue;
    requestedQuantities.set(g.instanceId, (requestedQuantities.get(g.instanceId) ?? 0) + g.quantity);
    if (!rollsByInstance.has(g.instanceId)) rollsByInstance.set(g.instanceId, g.rolls);
  }
  if (requestedQuantities.size === 0) return [];

  const invRef = doc(db, 'characters', uid, 'inventory', 'main');
  const charRef = doc(db, 'characters', uid);
  // Same atomicity fix as grantInventoryItems above — see its doc comment.
  let droppedForBagFull = 0;
  let droppedForVariantCap = 0;

  const accepted = await runTransaction(db, async (tx) => {
    const [invSnap, charSnap] = await Promise.all([tx.get(invRef), tx.get(charRef)]);
    const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
    const bagSlots: number = charSnap.exists() ? ((charSnap.data().bagSlots as number) ?? 0) : 0;

    const existingInstances = inventory.equipmentInstances ?? {};
    const existingVariantIds = new Set(Object.keys(existingInstances).filter((id) => existingInstances[id].itemId === itemId));
    let baseItemSlotSpent = (inventory.items[itemId] ?? 0) > 0 || existingVariantIds.size > 0;
    let distinctCount = Object.values(inventory.items).filter((q) => q > 0).length + countDistinctBaseItems(inventory);

    const acceptedInner: { instanceId: string; quantity: number }[] = [];
    droppedForBagFull = 0;
    droppedForVariantCap = 0;
    for (const [instanceId, quantity] of requestedQuantities) {
      const isNewVariant = !existingVariantIds.has(instanceId);
      if (isNewVariant) {
        // Two independent caps, each dropped loot for a DIFFERENT reason —
        // conflating them under one "Inventory full" toast (as this used
        // to) is misleading when the bag has plenty of free slots left but
        // this one base item has simply rolled too many distinct stat
        // combinations already (easy to hit crafting the same armor piece
        // repeatedly hoping for a better roll).
        if (existingVariantIds.size >= MAX_VARIANTS_PER_BASE_ITEM) {
          droppedForVariantCap += quantity;
          continue;
        }
        if (!baseItemSlotSpent) {
          if (distinctCount >= bagSlots) {
            droppedForBagFull += quantity; // bag full — this item id is dropped entirely
            continue;
          }
          distinctCount++;
          baseItemSlotSpent = true;
        }
        existingVariantIds.add(instanceId);
      }
      acceptedInner.push({ instanceId, quantity });
    }

    if (acceptedInner.length > 0) {
      const updates: Record<string, unknown> = {};
      for (const { instanceId, quantity } of acceptedInner) {
        if (existingInstances[instanceId]) {
          updates[`equipmentInstances.${instanceId}.quantity`] = increment(quantity);
        } else {
          // A brand-new bucket — no existing quantity to add to, so no
          // increment() sentinel needed here, just the literal starting
          // value. acquiredAt is stamped ONLY here (never touched again by
          // later grants of more of this exact roll) — see
          // Inventory.equipmentInstances' doc comment for why that's the
          // right "when was this acquired" value.
          updates[`equipmentInstances.${instanceId}`] = {
            itemId,
            rolls: rollsByInstance.get(instanceId) ?? {},
            quantity,
            acquiredAt: serverTimestamp(),
          };
        }
      }
      tx.update(invRef, updates);
    }
    return acceptedInner;
  });

  notifyDroppedForFullBag(droppedForBagFull > 0 ? [{ itemId, quantity: droppedForBagFull }] : []);
  notifyDroppedForVariantCap(itemId, droppedForVariantCap);
  return accepted;
}

// Distinct base item ids represented in equipmentInstances OR
// chargedConsumables, for bagSlots accounting — a base item already present
// only as instance/charge buckets (never as a plain `items` stack) still
// counts as one occupied slot, same as any other item id.
function countDistinctBaseItems(inventory: Inventory): number {
  const baseIds = new Set([
    ...Object.values(inventory.equipmentInstances ?? {}).map((inst) => inst.itemId),
    ...Object.values(inventory.chargedConsumables ?? {}).map((inst) => inst.itemId),
  ]);
  for (const itemId of baseIds) {
    if ((inventory.items[itemId] ?? 0) > 0) baseIds.delete(itemId); // already counted by the items.* pass
  }
  return baseIds.size;
}

// Read-only mirror of grantInventoryItems' own distinctCount check — same
// "occupied item slots" definition (items.* plus any base item only held as
// an equipmentInstances/chargedConsumables bucket), exported so a UI
// warning (e.g. "you won't receive loot from this" before starting a
// gather/craft) can ask the same question without a Firestore round trip.
export function distinctItemSlotCount(inventory: Inventory): number {
  return Object.values(inventory.items ?? {}).filter((q) => q > 0).length + countDistinctBaseItems(inventory);
}

// Whether granting one more unit of itemId would actually cost a NEW slot —
// false whenever it's already held in any of the 3 buckets (stacking is
// always free, see grantInventoryItems' own doc comment).
export function isItemAlreadyHeld(inventory: Inventory, itemId: string): boolean {
  if ((inventory.items[itemId] ?? 0) > 0) return true;
  if (Object.values(inventory.equipmentInstances ?? {}).some((inst) => inst.itemId === itemId)) return true;
  if (Object.values(inventory.chargedConsumables ?? {}).some((inst) => inst.itemId === itemId)) return true;
  return false;
}

// The charge-count-distinguished counterpart to grantEquipmentInstances
// above — grants freshly-crafted offensive/defensive potions (always at
// FULL charge, since crafting never produces a partially-used potion) of
// ONE base item, bucketed by gameData/consumableCharges.ts's
// chargedInstanceId. Only the bag-slot-once-per-base-item cap applies (no
// per-base-item variant cap — at most 4 distinct charge levels can ever
// exist for one item, well under MAX_VARIANTS_PER_BASE_ITEM, so a separate
// cap would never actually bind). Returns what was actually granted,
// mirroring grantEquipmentInstances/grantInventoryItems.
export async function grantChargedConsumables(
  uid: string,
  itemId: string,
  grants: { remainingCharges: number; quantity: number }[]
): Promise<{ remainingCharges: number; quantity: number }[]> {
  const requestedQuantities = new Map<number, number>();
  for (const g of grants) {
    if (g.quantity <= 0 || g.remainingCharges <= 0) continue;
    requestedQuantities.set(g.remainingCharges, (requestedQuantities.get(g.remainingCharges) ?? 0) + g.quantity);
  }
  if (requestedQuantities.size === 0) return [];

  const invRef = doc(db, 'characters', uid, 'inventory', 'main');
  const charRef = doc(db, 'characters', uid);
  // Same atomicity fix as grantInventoryItems above — see its doc comment.
  let droppedQuantity = 0;

  const accepted = await runTransaction(db, async (tx) => {
    const [invSnap, charSnap] = await Promise.all([tx.get(invRef), tx.get(charRef)]);
    const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
    const bagSlots: number = charSnap.exists() ? ((charSnap.data().bagSlots as number) ?? 0) : 0;

    const existingBuckets = inventory.chargedConsumables ?? {};
    const existingLevelsForItem = new Set(
      Object.values(existingBuckets).filter((b) => b.itemId === itemId).map((b) => b.remainingCharges)
    );
    let baseItemSlotSpent = (inventory.items[itemId] ?? 0) > 0 || existingLevelsForItem.size > 0;
    let distinctCount =
      Object.values(inventory.items).filter((q) => q > 0).length + countDistinctBaseItems(inventory);

    const acceptedInner: { remainingCharges: number; quantity: number }[] = [];
    droppedQuantity = 0;
    for (const [remainingCharges, quantity] of requestedQuantities) {
      if (!baseItemSlotSpent) {
        if (distinctCount >= bagSlots) {
          droppedQuantity += quantity; // bag full — this item id is dropped entirely
          continue;
        }
        distinctCount++;
        baseItemSlotSpent = true;
      }
      acceptedInner.push({ remainingCharges, quantity });
    }

    if (acceptedInner.length > 0) {
      const updates: Record<string, unknown> = {};
      for (const { remainingCharges, quantity } of acceptedInner) {
        const id = chargedInstanceId(itemId, remainingCharges);
        if (existingBuckets[id]) {
          updates[`chargedConsumables.${id}.quantity`] = increment(quantity);
        } else {
          updates[`chargedConsumables.${id}`] = { itemId, remainingCharges, quantity };
        }
      }
      tx.update(invRef, updates);
    }
    return acceptedInner;
  });

  notifyDroppedForFullBag(droppedQuantity > 0 ? [{ itemId, quantity: droppedQuantity }] : []);
  return accepted;
}

// Live-updates the moment Firestore actually changes, instead of polling on
// a timer that could be out of sync with when a save actually happens.
export function subscribeToInventory(uid: string, callback: (inventory: Inventory) => void): Unsubscribe {
  return onSnapshot(doc(db, 'characters', uid, 'inventory', 'main'), (snap) => {
    callback(snap.exists() ? migratePotionsOutOfChargeBuckets(uid, snap.data() as Inventory) : { items: {} });
  });
}

// Equipment Locking — identifier is an equipmentInstances key for a
// randomized roll, or a plain itemId for a non-instanced equipment item
// (see Inventory.lockedInstanceIds' doc comment). A pure read-side check,
// used by every destructive action (sellItem, applyDisenchantResult, the
// disenchant queue's enqueue/process steps) to refuse to touch a locked
// item — never bypassed by any of them.
export function isLocked(inventory: Inventory, identifier: string): boolean {
  return (inventory.lockedInstanceIds ?? []).includes(identifier);
}

export async function setItemLocked(uid: string, identifier: string, locked: boolean): Promise<void> {
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    lockedInstanceIds: locked ? arrayUnion(identifier) : arrayRemove(identifier),
  });
}

import { doc, getDoc, updateDoc, increment, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import type { Inventory } from '../types/character';
import type { BaseStat } from '../gameData/classStats';
import { MAX_VARIANTS_PER_BASE_ITEM } from '../gameData/equipmentRolls';

export async function getInventory(uid: string): Promise<Inventory> {
  const snap = await getDoc(doc(db, 'characters', uid, 'inventory', 'main'));
  if (!snap.exists()) return { items: {} };
  return selfHealFractionalQuantities(uid, snap.data() as Inventory);
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

  const [invSnap, charSnap] = await Promise.all([
    getDoc(doc(db, 'characters', uid, 'inventory', 'main')),
    getDoc(doc(db, 'characters', uid)),
  ]);
  const items: Record<string, number> = invSnap.exists() ? ((invSnap.data() as Inventory).items ?? {}) : {};
  const bagSlots: number = charSnap.exists() ? ((charSnap.data().bagSlots as number) ?? 0) : 0;

  let distinctCount = Object.values(items).filter((q) => q > 0).length;
  const seenNew = new Set<string>();
  const accepted: { itemId: string; quantity: number }[] = [];

  for (const grant of positiveGrants) {
    const alreadyHeld = (items[grant.itemId] ?? 0) > 0 || seenNew.has(grant.itemId);
    if (!alreadyHeld) {
      if (distinctCount >= bagSlots) continue; // bag full — this one new item is dropped
      distinctCount++;
      seenNew.add(grant.itemId);
    }
    accepted.push(grant);
  }

  if (accepted.length === 0) return [];

  const updates: Record<string, unknown> = {};
  for (const g of accepted) {
    updates[`items.${g.itemId}`] = increment(g.quantity);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), updates);
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

  const [invSnap, charSnap] = await Promise.all([
    getDoc(doc(db, 'characters', uid, 'inventory', 'main')),
    getDoc(doc(db, 'characters', uid)),
  ]);
  const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
  const bagSlots: number = charSnap.exists() ? ((charSnap.data().bagSlots as number) ?? 0) : 0;

  const existingInstances = inventory.equipmentInstances ?? {};
  const existingVariantIds = new Set(Object.keys(existingInstances).filter((id) => existingInstances[id].itemId === itemId));
  let baseItemSlotSpent = (inventory.items[itemId] ?? 0) > 0 || existingVariantIds.size > 0;
  let distinctCount = Object.values(inventory.items).filter((q) => q > 0).length + countDistinctBaseItems(inventory);

  const accepted: { instanceId: string; quantity: number }[] = [];
  for (const [instanceId, quantity] of requestedQuantities) {
    const isNewVariant = !existingVariantIds.has(instanceId);
    if (isNewVariant) {
      if (existingVariantIds.size >= MAX_VARIANTS_PER_BASE_ITEM) continue; // variant cap — this roll is dropped
      if (!baseItemSlotSpent) {
        if (distinctCount >= bagSlots) continue; // bag full — this item id is dropped entirely
        distinctCount++;
        baseItemSlotSpent = true;
      }
      existingVariantIds.add(instanceId);
    }
    accepted.push({ instanceId, quantity });
  }
  if (accepted.length === 0) return [];

  const updates: Record<string, unknown> = {};
  for (const { instanceId, quantity } of accepted) {
    if (existingInstances[instanceId]) {
      updates[`equipmentInstances.${instanceId}.quantity`] = increment(quantity);
    } else {
      // A brand-new bucket — no existing quantity to add to, so no
      // increment() sentinel needed here, just the literal starting value.
      updates[`equipmentInstances.${instanceId}`] = { itemId, rolls: rollsByInstance.get(instanceId) ?? {}, quantity };
    }
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), updates);
  return accepted;
}

// Distinct base item ids represented in equipmentInstances, for bagSlots
// accounting — a base item already present only as instance buckets (never
// as a plain `items` stack) still counts as one occupied slot, same as any
// other item id.
function countDistinctBaseItems(inventory: Inventory): number {
  const baseIds = new Set(Object.values(inventory.equipmentInstances ?? {}).map((inst) => inst.itemId));
  for (const itemId of baseIds) {
    if ((inventory.items[itemId] ?? 0) > 0) baseIds.delete(itemId); // already counted by the items.* pass
  }
  return baseIds.size;
}

// Live-updates the moment Firestore actually changes, instead of polling on
// a timer that could be out of sync with when a save actually happens.
export function subscribeToInventory(uid: string, callback: (inventory: Inventory) => void): Unsubscribe {
  return onSnapshot(doc(db, 'characters', uid, 'inventory', 'main'), (snap) => {
    callback(snap.exists() ? (snap.data() as Inventory) : { items: {} });
  });
}

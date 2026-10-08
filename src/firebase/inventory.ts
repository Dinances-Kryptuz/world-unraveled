import { doc, getDoc, updateDoc, increment, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import type { Inventory } from '../types/character';

export async function getInventory(uid: string): Promise<Inventory> {
  const snap = await getDoc(doc(db, 'characters', uid, 'inventory', 'main'));
  if (!snap.exists()) return { items: {} };
  return snap.data() as Inventory;
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

// Live-updates the moment Firestore actually changes, instead of polling on
// a timer that could be out of sync with when a save actually happens.
export function subscribeToInventory(uid: string, callback: (inventory: Inventory) => void): Unsubscribe {
  return onSnapshot(doc(db, 'characters', uid, 'inventory', 'main'), (snap) => {
    callback(snap.exists() ? (snap.data() as Inventory) : { items: {} });
  });
}

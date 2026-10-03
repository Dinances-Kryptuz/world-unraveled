import { doc, getDoc, onSnapshot, updateDoc, increment, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory } from './inventory';
import { MAX_BANK_SLOTS, nextBankSlotCost } from '../gameData/bank';
import type { Inventory } from '../types/character';

export async function getBank(uid: string): Promise<Inventory> {
  const snap = await getDoc(doc(db, 'characters', uid, 'bank', 'main'));
  if (!snap.exists()) return { items: {} };
  return snap.data() as Inventory;
}

// Live-updates the moment Firestore actually changes — same pattern as
// firebase/inventory.ts's subscribeToInventory.
export function subscribeToBank(uid: string, callback: (bank: Inventory) => void): Unsubscribe {
  return onSnapshot(doc(db, 'characters', uid, 'bank', 'main'), (snap) => {
    callback(snap.exists() ? (snap.data() as Inventory) : { items: {} });
  });
}

export interface BankActionResult {
  success: boolean;
  reason?: string;
}

// Moves `quantity` of an item from the player's inventory into their bank.
// bankSlots is currently a displayed capacity rather than a hard-enforced
// one — same convention as Character.bagSlots (see InventoryScreen.tsx),
// which has never blocked a pickup either.
export async function depositItem(uid: string, itemId: string, quantity: number): Promise<BankActionResult> {
  if (quantity <= 0) return { success: false, reason: 'Invalid quantity.' };
  const inventory = await getInventory(uid);
  if ((inventory.items[itemId] ?? 0) < quantity) {
    return { success: false, reason: 'You don’t have that many.' };
  }

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-quantity),
  });
  await updateDoc(doc(db, 'characters', uid, 'bank', 'main'), {
    [`items.${itemId}`]: increment(quantity),
  });
  return { success: true };
}

export async function withdrawItem(uid: string, itemId: string, quantity: number): Promise<BankActionResult> {
  if (quantity <= 0) return { success: false, reason: 'Invalid quantity.' };
  const bank = await getBank(uid);
  if ((bank.items[itemId] ?? 0) < quantity) {
    return { success: false, reason: 'Your bank doesn’t have that many.' };
  }

  await updateDoc(doc(db, 'characters', uid, 'bank', 'main'), {
    [`items.${itemId}`]: increment(-quantity),
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(quantity),
  });
  return { success: true };
}

// The gold sink: one more bank slot, at an exponentially rising gold cost
// (gameData/bank.ts's nextBankSlotCost), re-validated server-side the same
// as every other gated purchase in this codebase.
export async function buyBankSlot(uid: string): Promise<BankActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (character.bankSlots >= MAX_BANK_SLOTS) {
    return { success: false, reason: 'Your bank is already at maximum capacity.' };
  }
  const cost = nextBankSlotCost(character.bankSlots);
  if (character.gold < cost) {
    return { success: false, reason: `Requires ${cost} gold (you have ${Math.floor(character.gold)}).` };
  }

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-cost),
    bankSlots: increment(1),
  });
  return { success: true };
}

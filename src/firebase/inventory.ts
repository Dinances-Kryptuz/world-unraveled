import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './config';
import type { Inventory } from '../types/character';

export async function getInventory(uid: string): Promise<Inventory> {
  const snap = await getDoc(doc(db, 'characters', uid, 'inventory', 'main'));
  if (!snap.exists()) return { items: {} };
  return snap.data() as Inventory;
}

// Live-updates the moment Firestore actually changes, instead of polling on
// a timer that could be out of sync with when a save actually happens.
export function subscribeToInventory(uid: string, callback: (inventory: Inventory) => void): Unsubscribe {
  return onSnapshot(doc(db, 'characters', uid, 'inventory', 'main'), (snap) => {
    callback(snap.exists() ? (snap.data() as Inventory) : { items: {} });
  });
}

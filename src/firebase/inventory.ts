import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { Inventory } from '../types/character';

export async function getInventory(uid: string): Promise<Inventory> {
  const snap = await getDoc(doc(db, 'characters', uid, 'inventory', 'main'));
  if (!snap.exists()) return { items: {} };
  return snap.data() as Inventory;
}

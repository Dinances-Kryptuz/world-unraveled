import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory, isLocked } from './inventory';
import { ITEMS } from '../gameData/items';

export async function sellItem(uid: string, itemId: string, quantity: number): Promise<void> {
  const item = ITEMS[itemId];
  if (!item || quantity <= 0) return;
  // Equipment Locking overhaul — a locked item (identified by its plain
  // itemId here, since sellItem only ever touches the `items` stack, never
  // equipmentInstances — see this function's own module comment history)
  // can never be sold, full stop.
  const inventory = await getInventory(uid);
  if (isLocked(inventory, itemId)) return;
  const goldGained = item.sellValue * quantity;

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-quantity),
  });
  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(goldGained),
  });
}

export async function buyItem(
  uid: string,
  itemId: string,
  quantity: number,
  unitPrice: number,
  currency: 'gold' | 'voidShards' = 'gold'
): Promise<void> {
  if (quantity <= 0) return;
  const cost = unitPrice * quantity;

  const character = await getCharacter(uid);
  if (!character || character[currency] < cost) return;

  await updateDoc(doc(db, 'characters', uid), {
    [currency]: increment(-cost),
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(quantity),
  });
}

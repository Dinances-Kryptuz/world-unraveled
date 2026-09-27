import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { ITEMS } from '../gameData/items';

export async function sellItem(uid: string, itemId: string, quantity: number): Promise<void> {
  const item = ITEMS[itemId];
  if (!item || quantity <= 0) return;
  const goldGained = item.sellValue * quantity;

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-quantity),
  });
  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(goldGained),
  });
}

export async function buyItem(uid: string, itemId: string, quantity: number, unitPrice: number): Promise<void> {
  if (quantity <= 0) return;
  const cost = unitPrice * quantity;

  const character = await getCharacter(uid);
  if (!character || character.gold < cost) return;

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-cost),
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(quantity),
  });
}

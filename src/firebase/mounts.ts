import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { MOUNTS } from '../gameData/mounts';

export interface MountPurchaseResult {
  success: boolean;
  reason?: string;
}

export async function buyMount(uid: string, mountId: string): Promise<MountPurchaseResult> {
  const mount = MOUNTS[mountId];
  if (!mount) return { success: false, reason: 'Unknown mount.' };

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (character.mounts.includes(mountId)) return { success: false, reason: 'You already own this mount.' };
  if (character.gold < mount.cost) return { success: false, reason: 'Not enough gold.' };

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-mount.cost),
    mounts: arrayUnion(mountId),
  });
  return { success: true };
}

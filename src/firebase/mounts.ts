import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { MOUNTS, requiredPriorMountId } from '../gameData/mounts';
import { ZONES } from '../gameData/zones';

export interface MountTrainResult {
  success: boolean;
  reason?: string;
}

// The Mount Trainer's "Train" action — same zone-checked, server-side-
// validated posture as firebase/character.ts's trainAbility and firebase/
// professions.ts's learnProfession/advanceProfessionRank.
export async function trainMount(uid: string, mountId: string): Promise<MountTrainResult> {
  const mount = MOUNTS[mountId];
  if (!mount) return { success: false, reason: 'Unknown mount.' };

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (character.mounts.includes(mountId)) return { success: false, reason: 'You already own this mount.' };

  const priorId = requiredPriorMountId(mountId);
  if (priorId && !character.mounts.includes(priorId)) {
    return { success: false, reason: `Train ${MOUNTS[priorId].name} first.` };
  }

  if (character.currentZoneId !== mount.requiredZoneId) {
    return { success: false, reason: `Train this at ${ZONES[mount.requiredZoneId]?.name ?? mount.requiredZoneId}.` };
  }
  if (character.gold < mount.cost) return { success: false, reason: `Requires ${mount.cost} gold (have ${Math.floor(character.gold)}).` };

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-mount.cost),
    mounts: arrayUnion(mountId),
  });
  return { success: true };
}

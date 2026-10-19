import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { MOUNTS, requiredPriorMountId } from '../gameData/mounts';
import { ZONES, isZoneUnlocked } from '../gameData/zones';

export interface MountTrainResult {
  success: boolean;
  reason?: string;
}

// The Mount Trainer's "Train" action — same zone-checked, server-side-
// validated posture as firebase/character.ts's trainAbility and firebase/
// professions.ts's learnProfession/advanceProfessionRank. The zone check
// only requires the trainer's zone to be UNLOCKED, not that the character
// is currently standing in it — the Mount Trainer is now hosted in
// Ashenfall's Stables district, reachable regardless of currentZoneId.
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

  if (!isZoneUnlocked(ZONES[mount.requiredZoneId], character.level)) {
    return { success: false, reason: `Requires ${ZONES[mount.requiredZoneId]?.name ?? mount.requiredZoneId} to be unlocked.` };
  }
  if (character.gold < mount.cost) return { success: false, reason: `Requires ${mount.cost} gold (have ${Math.floor(character.gold)}).` };

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-mount.cost),
    mounts: arrayUnion(mountId),
  });
  return { success: true };
}

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { AUTO_EAT_RANKS, autoEatRankDef } from '../gameData/cooking';
import { ZONES } from '../gameData/zones';

export interface AutoEatPurchaseResult {
  success: boolean;
  reason?: string;
}

// Auto Eat's "Train" action — same zone-checked, server-validated,
// sequential-rank posture as firebase/mounts.ts's trainMount (a plain
// incrementing int field here instead of an owned-id array, since ranks
// fully replace each other rather than stacking).
export async function purchaseAutoEatRank(uid: string, rank: number): Promise<AutoEatPurchaseResult> {
  const def = autoEatRankDef(rank);
  if (!def) return { success: false, reason: 'Unknown Auto Eat rank.' };

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const currentRank = character.autoEatRank ?? 0;
  if (currentRank >= rank) return { success: false, reason: 'You already own this rank.' };
  if (currentRank !== rank - 1) {
    const priorDef = AUTO_EAT_RANKS.find((r) => r.rank === rank - 1);
    return { success: false, reason: `Learn Auto Eat Rank ${priorDef?.rank ?? rank - 1} first.` };
  }

  if (character.currentZoneId !== def.requiredZoneId) {
    return { success: false, reason: `Learn this at ${ZONES[def.requiredZoneId]?.name ?? def.requiredZoneId}.` };
  }
  if (character.gold < def.cost) {
    return { success: false, reason: `Requires ${def.cost} gold (have ${Math.floor(character.gold)}).` };
  }

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-def.cost),
    autoEatRank: rank,
  });
  return { success: true };
}

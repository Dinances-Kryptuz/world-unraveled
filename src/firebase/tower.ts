// The Tower of Infinity — server-trusted gold deduction (mirrors
// payDungeonCompanionFee's exact pattern) and attempt-result application
// (mirrors applyCombatResult's pattern, plus the Tower's own highest-
// floor/consecutive-failure bookkeeping and milestone reward grant).
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { grantInventoryItems } from './inventory';
import { MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
import { REQUIRED_DUNGEON_PARTY_SIZE } from '../gameData/companions';
import { towerAttemptCost } from '../gameData/tower';
import { TOWER_MILESTONE_ITEM_IDS } from '../gameData/towerLoot';
import type { Character } from '../types/character';

export interface TowerActionResult {
  success: boolean;
  reason?: string;
  costPaid?: number;
}

// Mirrors payDungeonCompanionFee's own level-gate/affordability checks —
// the one server-trusted checkpoint every attempt passes through (the
// TowerScreen's own button mirrors this client-side first, but this is
// the real gate).
export async function payTowerAttemptCost(uid: string, character: Character, floor: number): Promise<TowerActionResult> {
  if (character.level < MAX_CHARACTER_LEVEL) {
    return { success: false, reason: `Requires character level ${MAX_CHARACTER_LEVEL}.` };
  }
  const partySize = 1 + character.activeCompanionIds.length + character.activeAltSlots.length;
  if (partySize < REQUIRED_DUNGEON_PARTY_SIZE) {
    return { success: false, reason: `Requires a full party of ${REQUIRED_DUNGEON_PARTY_SIZE} — you have ${partySize}/${REQUIRED_DUNGEON_PARTY_SIZE}.` };
  }
  const cost = towerAttemptCost(floor);
  if (character.gold < cost) {
    return { success: false, reason: `This floor costs ${cost} gold up front (you have ${Math.floor(character.gold)}).` };
  }
  await updateDoc(doc(db, 'characters', uid), { gold: increment(-cost) });
  return { success: true, costPaid: cost };
}

export interface TowerAttemptResult {
  newHighestFloor: number;
  droppedDown: boolean;
  milestoneItemId?: string;
}

// Called once the live fight has already resolved client-side (same
// "simulate live, then persist the outcome" posture as combat/dungeons —
// see CombatScreen.tsx/DungeonScreen.tsx). `floor` is the floor that was
// just attempted (always character.towerHighestFloor+1, i.e. the next
// floor up — the Tower only ever climbs forward or drops back exactly 1,
// never skips).
export async function applyTowerAttemptResult(
  uid: string,
  character: Character,
  args: { floor: number; won: boolean; xpGained: number; goldGained: number; hpAfter: number }
): Promise<TowerAttemptResult> {
  const currentHighest = character.towerHighestFloor ?? 0;
  const currentFailures = character.towerConsecutiveFailures ?? 0;
  const update: Record<string, unknown> = {
    xp: increment(args.xpGained),
    gold: increment(args.goldGained),
    currentHp: args.hpAfter,
  };

  let newHighestFloor = currentHighest;
  let droppedDown = false;
  let milestoneItemId: string | undefined;

  if (args.won) {
    newHighestFloor = Math.max(currentHighest, args.floor);
    update.towerHighestFloor = newHighestFloor;
    update.towerConsecutiveFailures = 0;

    // A milestone reward is a ONE-TIME guaranteed grant the first time a
    // character reaches that floor (see towerLoot.ts's own doc comment)
    // — gated on this being a genuinely NEW personal best, not just a
    // re-clear of an already-passed milestone (which could otherwise be
    // farmed via the 3-fail-drop-back-then-reclimb rule).
    const candidateIds = args.floor > currentHighest ? TOWER_MILESTONE_ITEM_IDS[args.floor] : undefined;
    if (candidateIds && candidateIds.length > 0) {
      milestoneItemId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
    }
  } else {
    const newFailures = currentFailures + 1;
    if (newFailures >= 3) {
      newHighestFloor = Math.max(0, currentHighest - 1);
      update.towerHighestFloor = newHighestFloor;
      update.towerConsecutiveFailures = 0;
      droppedDown = true;
    } else {
      update.towerConsecutiveFailures = newFailures;
    }
  }

  await updateDoc(doc(db, 'characters', uid), update);
  if (milestoneItemId) {
    await grantInventoryItems(uid, [{ itemId: milestoneItemId, quantity: 1 }]);
  }
  return { newHighestFloor, droppedDown, milestoneItemId };
}

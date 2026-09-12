import { resolveElapsedProgress, COMBAT_OFFLINE_THROTTLE } from './activityEngine';
import type { FullCombatProfile } from './combatProfileWithTalents';

export interface MonsterLootInfo {
  goldMin: number;
  goldMax: number;
  lootTable: { itemId: string; chance: number; minQty: number; maxQty: number }[];
}

export interface CombatResolutionResult {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
  loot: { itemId: string; quantity: number }[];
  hpAfter: number;
  forcedRetreat: boolean;
}

export function resolveCombatEncounter(
  startedAt: Date,
  now: Date,
  startingHp: number,
  profile: FullCombatProfile,
  monster: MonsterLootInfo
): CombatResolutionResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;

  const secondsPerKill = progress.isLiveSession
    ? profile.timeToKill
    : profile.timeToKill * COMBAT_OFFLINE_THROTTLE;

  const killsByTime =
    secondsPerKill > 0 && isFinite(secondsPerKill) ? Math.floor(effectiveSeconds / secondsPerKill) : 0;

  const hpChangePerKill = profile.netHpChangePerSec * profile.timeToKill;

  let killsByHp = Infinity;
  if (hpChangePerKill > 0) {
    killsByHp = Math.floor(startingHp / hpChangePerKill);
  }

  const monstersDefeated = Math.max(0, Math.min(killsByTime, killsByHp));
  const forcedRetreat = killsByHp < killsByTime;

  const hpAfter = Math.max(0, Math.min(profile.playerMaxHp, startingHp - monstersDefeated * hpChangePerKill));

  const xpGained = monstersDefeated * profile.xpPerKill;
  const avgGold = (monster.goldMin + monster.goldMax) / 2;
  const goldGained = monstersDefeated * avgGold;

  const loot = monster.lootTable
    .map((drop) => {
      const avgQty = (drop.minQty + drop.maxQty) / 2;
      return { itemId: drop.itemId, quantity: monstersDefeated * drop.chance * avgQty };
    })
    .filter((l) => l.quantity > 0);

  return { monstersDefeated, xpGained, goldGained, loot, hpAfter, forcedRetreat };
}

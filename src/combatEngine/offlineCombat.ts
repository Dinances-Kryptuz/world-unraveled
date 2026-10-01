// Offline/idle combat catch-up (Phase 6) — runs the SAME discrete engine
// live combat uses (advanceCombat), just fed a throttled combat-time budget
// instead of real-time ticks. Replaces the old aggregate DPS-formula model
// (combatResolver.ts/combatProfileWithTalents.ts), which is a rough
// approximation of a character's expected performance and — critically —
// has no idea what abilities/conditions the player actually equipped. This
// simulation reuses the player's real Combat Setup, so offline results
// reflect the same build that fights live.
import type { ClassId, SpecDef, SpecId, BaseStat } from '../gameData/classStats';
import { maxHp } from '../gameData/combatFormulas';
import type { TalentBonusTotals } from '../utils/talentEvaluator';
import type { BuffTotals } from '../gameData/buffs';
import type { Monster } from '../gameData/types';
import { characterXpForLevelV2 } from '../gameData/xpTables';
import { resolveElapsedProgress, COMBAT_OFFLINE_THROTTLE } from '../gameData/activityEngine';
import { createEncounterState, createPlayerCombatant, advanceCombat, type EncounterSetupInput, type TickContext } from './engine';
import type { CombatState, ConditionGroup } from './types';

export interface OfflineCombatInput {
  startedAt: Date;
  now: Date;
  cls: ClassId;
  specId: SpecId | null;
  specDef: SpecDef;
  talentTotals: TalentBonusTotals;
  buffTotals: BuffTotals;
  extraDamageTakenPct: number;
  equipmentBonuses: Partial<Record<BaseStat, number>>;
  startingLevel: number;
  startingXp: number;
  startingHp: number;
  savedEquippedAbilityIds: string[];
  savedAbilityConditions: Record<string, ConditionGroup>;
  monster: Monster;
}

export interface OfflineCombatResult {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
  loot: { itemId: string; quantity: number }[];
  hpAfter: number;
  finalLevel: number;
  forcedRetreat: boolean;
  simulatedCombatSeconds: number;
}

const TICK_SECONDS = 1;
// Belt-and-suspenders only — the throttled combat-time budget for even the
// full 24h offline cap works out to well under an hour of simulated combat
// seconds, so this should never actually bind.
const MAX_TICKS = 200_000;

export function simulateOfflineCombat(input: OfflineCombatInput): OfflineCombatResult {
  const progress = resolveElapsedProgress(input.startedAt, input.now);
  // Same relationship as the old model's secondsPerKill = timeToKill *
  // THROTTLE: dividing the available time budget by the throttle up front
  // and then running it at real pace produces the same expected kill count,
  // while letting the real engine (misses, buffs, dots, healFrac, actual
  // equipped abilities) determine what happens within that budget instead
  // of a hand-derived DPS formula.
  const combatSecondsBudget = (progress.effectiveHours * 3600) / COMBAT_OFFLINE_THROTTLE;

  function buildInput(level: number, currentHp: number): EncounterSetupInput {
    return {
      cls: input.cls,
      level,
      specId: input.specId,
      specDef: input.specDef,
      talentTotals: input.talentTotals,
      buffTotals: input.buffTotals,
      extraDamageTakenPct: input.extraDamageTakenPct,
      equipmentBonuses: input.equipmentBonuses,
      currentHp,
      monster: input.monster,
      savedEquippedAbilityIds: input.savedEquippedAbilityIds,
      savedAbilityConditions: input.savedAbilityConditions,
    };
  }

  let level = input.startingLevel;
  let xpTotal = input.startingXp;
  let goldGained = 0;
  let monstersDefeated = 0;
  let forcedRetreat = false;
  const lootTotals: Record<string, number> = {};

  const state: CombatState = createEncounterState(buildInput(level, input.startingHp));
  const ctx: TickContext = { monster: input.monster, playerLevel: level, playerCombatType: input.specDef.combatType };

  let elapsed = 0;
  let ticks = 0;
  while (elapsed < combatSecondsBudget && ticks < MAX_TICKS) {
    const result = advanceCombat(state, ctx, TICK_SECONDS);
    elapsed += TICK_SECONDS;
    ticks++;

    for (const kill of result.kills) {
      monstersDefeated++;
      xpTotal += kill.xpGained;
      goldGained += kill.goldGained;
      for (const drop of kill.loot) {
        lootTotals[drop.itemId] = (lootTotals[drop.itemId] ?? 0) + drop.quantity;
      }
    }

    if (result.playerDied) {
      forcedRetreat = true;
      break;
    }

    // Level up mid-simulation exactly like the live autosave path does: a
    // full HP restore at the new level, then keep simulating from there.
    // Only the player Combatant is rebuilt — the current enemy keeps its
    // HP, same as live combat never resets the enemy on a mid-fight level
    // up either.
    let leveledUp = false;
    while (xpTotal >= characterXpForLevelV2(level + 1)) {
      level++;
      leveledUp = true;
    }
    if (leveledUp) {
      ctx.playerLevel = level;
      const freshMaxHp = maxHp(input.cls, level, input.equipmentBonuses, input.talentTotals.hpMultPct);
      state.party = [createPlayerCombatant(buildInput(level, freshMaxHp))];
    }
  }

  const player = state.party.find((p) => p.isPlayer)!;
  return {
    monstersDefeated,
    xpGained: xpTotal - input.startingXp,
    goldGained: Math.round(goldGained),
    loot: Object.entries(lootTotals).map(([itemId, quantity]) => ({ itemId, quantity })),
    hpAfter: player.hp,
    finalLevel: level,
    forcedRetreat,
    simulatedCombatSeconds: elapsed,
  };
}

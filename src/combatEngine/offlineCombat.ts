// Offline/idle combat catch-up (Phase 6) — runs the SAME discrete engine
// live combat uses (advanceCombat), just fed a throttled combat-time budget
// instead of real-time ticks. Replaces the old aggregate DPS-formula model
// (combatResolver.ts/combatProfileWithTalents.ts), which is a rough
// approximation of a character's expected performance and — critically —
// has no idea what abilities/conditions the player actually equipped. This
// simulation reuses the player's real Combat Setup, so offline results
// reflect the same build that fights live.
import type { ClassId, SpecDef, SpecId, BaseStat } from '../gameData/classStats';
import { maxHp, DUNGEON_TRASH_DAMAGE_MULTIPLIER, DUNGEON_BOSS_DAMAGE_MULTIPLIER } from '../gameData/combatFormulas';
import type { TalentBonusTotals } from '../utils/talentEvaluator';
import type { BuffTotals } from '../gameData/buffs';
import type { EquipmentSlot, Monster } from '../gameData/types';
import { characterXpForLevelV2, MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
import { resolveElapsedProgress } from '../gameData/activityEngine';
import type { CompanionCombatSetup } from '../gameData/companions';
import type { ConsumableAutomationRuntimeState } from '../gameData/consumableAutomation';
import { ENCHANTS, buildActiveEnchantTotals, type EnchantTotals, type EnchantProcDef } from '../gameData/enchanting';
import {
  createEncounterState,
  createPlayerCombatant,
  createCompanionCombatant,
  advanceCombat,
  type EncounterSetupInput,
  type TickContext,
} from './engine';
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
  trainedAbilityIds: string[];
  savedAbilityConditions: Record<string, ConditionGroup>;
  disabledAbilityIds: string[];
  // Attribute/Specialization overhaul's Shield Block Value — see
  // EncounterSetupInput.hasShieldEquipped's doc comment.
  hasShieldEquipped?: boolean;
  monster: Monster;
  // Same as EncounterSetupInput.companions — each one's `level` is
  // overwritten on every buildInput() call (including after a
  // mid-simulation level-up) to track the player's current simulated
  // level, since a companion always fights at the player's level.
  companions?: CompanionCombatSetup[];
  // Herbalism/Alchemy overhaul's Part 8 automation — built once by the
  // caller (gameData/consumableAutomation.ts's buildConsumableAutomationState)
  // from the character's CURRENT inventory/settings, then mutated in place
  // by this same tick-by-tick loop exactly like live combat's ctx.consumableState
  // (see TickContext's doc comment) — the one thing that makes offline charge
  // consumption exact rather than an aggregate approximation: this loop calls
  // advanceCombat once per simulated second, same as a live 1s tick.
  consumableState?: ConsumableAutomationRuntimeState;
  // Tailoring overhaul's Shirt of Fortune — see TickContext.goldFindPct's
  // doc comment. Resolved by the caller from whichever shirt-snapshot
  // mechanism applies (CurrentActivity.equippedShirtItemId for ordinary
  // offline combat, or the dungeon's own entry-time snapshot).
  goldFindPct?: number;
  // Enchanting overhaul's per-slot charge model — passed RAW (not
  // pre-summed into hastePct/flatDamageBonus/etc, unlike every other
  // bonus in this input) specifically so this loop can track each slot's
  // remaining charges tick-by-tick and stop applying an enchant's effect
  // the instant its charges hit 0 — "do not allow an expired enchantment
  // to affect the remainder of an offline session," per the design
  // brief's explicit, repeated instruction. See simulateOfflineCombat's
  // buildInput/charges handling below. Absent/undefined behaves exactly
  // like an empty enchantments record (zero effect, matching every
  // character before this field existed).
  enchantments?: Partial<Record<EquipmentSlot, string>>;
  enchantmentCharges?: Partial<Record<EquipmentSlot, number>>;
  // The Citadel of Krypt's Full Citadel legendary (Lightningfury) — see
  // buildActiveEnchantTotals's own doc comment for why this is resolved
  // once by the caller (gameData/equipmentStats.ts's getInnateWeaponProc)
  // and passed raw rather than pre-summed, same posture as enchantments/
  // enchantmentCharges above, even though (unlike those) it never changes
  // mid-window.
  innateWeaponProc?: EnchantProcDef;
}

export interface OfflineCombatResult {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
  voidShardsGained: number;
  loot: { itemId: string; quantity: number }[];
  hpAfter: number;
  finalLevel: number;
  forcedRetreat: boolean;
  simulatedCombatSeconds: number;
  // Echoes input.consumableState back out after every tick's mutations —
  // undefined iff input.consumableState was never passed in. The caller
  // reads its offensiveChargesConsumed/defensiveChargesConsumed/healingUsed/
  // manaUsed to persist exactly one batch of inventory/cooldown deltas (see
  // firebase/consumables.ts's applyConsumableAutomationUsage), the same
  // "accumulate in memory, write once" rule the online autosave path follows.
  finalConsumableState?: ConsumableAutomationRuntimeState;
  // Enchanting overhaul's charge-consumption counts, tallied across the
  // WHOLE simulated window from the same per-tick events online combat
  // counts from (damage_out/miss_out -> offensiveAction, damage_in ->
  // damageTaken) — this is what makes offline enchant-charge consumption
  // exact rather than an aggregate approximation, same "simulate tick by
  // tick, write once" property every other offline-exact mechanic in this
  // engine already has. The caller combines offensiveAction/damageTaken
  // with monstersDefeated (this result's own kill count, for passive
  // enchants) into one consumeEnchantCharges call.
  enchantTriggerCounts: { offensiveAction: number; damageTaken: number };
}

const TICK_SECONDS = 1;
// Belt-and-suspenders only — the 24h offline cap bounds combatSecondsBudget
// to 86,400 seconds, comfortably under this.
const MAX_TICKS = 200_000;

// Shared by simulateOfflineCombat and simulateOfflineDungeonCombat below —
// the 12 EncounterSetupInput fields that never differ between the two
// (only the dungeon-specific wave-shape fields — monsterHpMultiplier/
// monsterDamageMultiplier/encounterSize — differ, layered on top by the
// dungeon simulator's own buildInput). Previously duplicated near-verbatim
// in both functions' nested buildInput closures.
function buildBaseEncounterInput(
  base: Pick<
    OfflineCombatInput,
    | 'cls'
    | 'specId'
    | 'specDef'
    | 'talentTotals'
    | 'buffTotals'
    | 'extraDamageTakenPct'
    | 'equipmentBonuses'
    | 'savedEquippedAbilityIds'
    | 'trainedAbilityIds'
    | 'savedAbilityConditions'
    | 'disabledAbilityIds'
    | 'hasShieldEquipped'
    | 'companions'
  >,
  level: number,
  currentHp: number,
  monster: Monster,
  enchantTotals: EnchantTotals
): EncounterSetupInput {
  return {
    cls: base.cls,
    level,
    specId: base.specId,
    specDef: base.specDef,
    talentTotals: base.talentTotals,
    buffTotals: base.buffTotals,
    extraDamageTakenPct: base.extraDamageTakenPct,
    equipmentBonuses: base.equipmentBonuses,
    currentHp,
    monster,
    savedEquippedAbilityIds: base.savedEquippedAbilityIds,
    trainedAbilityIds: base.trainedAbilityIds,
    savedAbilityConditions: base.savedAbilityConditions,
    disabledAbilityIds: base.disabledAbilityIds,
    hasShieldEquipped: base.hasShieldEquipped,
    companions: base.companions?.map((c) => ({ ...c, level })),
    ...enchantTotals,
  };
}

// Decrements `charges` IN PLACE for every slot whose enchant's charge-
// consumption category matches this tick's events — the SAME category->
// trigger mapping consumeEnchantCharges (firebase/enchanting.ts) uses for
// the real DB write, just applied one tick at a time instead of once at the
// end of the window. Returns whether any slot just crossed to exactly 0, so
// the caller knows whether a mid-window rebuild is actually needed. Shared
// by both offline simulators below (previously copy-pasted byte-for-byte).
function decrementEnchantCharges(
  enchantments: Partial<Record<EquipmentSlot, string>>,
  charges: Partial<Record<EquipmentSlot, number>>,
  offensiveActions: number,
  damageTaken: number,
  kills: number
): boolean {
  let anyJustExhausted = false;
  for (const [slot, enchantId] of Object.entries(enchantments) as [EquipmentSlot, string | undefined][]) {
    if (!enchantId) continue;
    const enchant = ENCHANTS[enchantId];
    const current = charges[slot];
    if (!enchant || current === undefined || current <= 0) continue;
    const count =
      enchant.category === 'offensive' ? offensiveActions : enchant.category === 'defensive' ? damageTaken : kills;
    if (count <= 0) continue;
    const next = Math.max(0, current - count);
    charges[slot] = next;
    if (next === 0) anyJustExhausted = true;
  }
  return anyJustExhausted;
}

export function simulateOfflineCombat(input: OfflineCombatInput): OfflineCombatResult {
  const progress = resolveElapsedProgress(input.startedAt, input.now);
  // Offline time is worth exactly as much as live time (see
  // activityEngine.ts's resolveElapsedProgress doc comment) — the budget is
  // just the capped elapsed time itself, run through the real engine
  // (misses, buffs, dots, healFrac, actual equipped abilities) instead of a
  // hand-derived DPS formula.
  const combatSecondsBudget = progress.effectiveHours * 3600;

  // Enchanting overhaul's per-slot charge model — a LOCAL mutable copy,
  // decremented tick by tick below as this exact simulation actually
  // consumes charges, never mutated back onto `input`. The DB-side final
  // charge count is still resolved the existing way (consumeEnchantCharges,
  // via this function's returned enchantTriggerCounts/monstersDefeated —
  // subtracting the AGGREGATE trigger count from the starting charge,
  // floored at 0, which produces the exact same FINAL number a one-at-a-
  // time decrement-with-floor would). This local copy exists purely so
  // buildInput() below can stop crediting an enchant's MECHANICAL effect
  // (haste, flat damage, resistance, proc, etc.) for the remainder of the
  // window the instant its charges reach 0 mid-simulation — "do not allow
  // an expired enchantment to affect the remainder of an offline session."
  const enchantments = input.enchantments ?? {};
  const charges: Partial<Record<EquipmentSlot, number>> = { ...(input.enchantmentCharges ?? {}) };

  function buildInput(level: number, currentHp: number): EncounterSetupInput {
    return buildBaseEncounterInput(input, level, currentHp, input.monster, buildActiveEnchantTotals(enchantments, charges, input.innateWeaponProc));
  }

  let level = input.startingLevel;
  let xpTotal = input.startingXp;
  let goldGained = 0;
  let voidShardsGained = 0;
  let monstersDefeated = 0;
  let forcedRetreat = false;
  const lootTotals: Record<string, number> = {};
  let offensiveActionCount = 0;
  let damageTakenCount = 0;

  const state: CombatState = createEncounterState(buildInput(level, input.startingHp));
  const ctx: TickContext = {
    monster: input.monster,
    playerLevel: level,
    playerCombatType: input.specDef.combatType,
    consumableState: input.consumableState,
    goldFindPct: input.goldFindPct,
  };

  let elapsed = 0;
  let ticks = 0;
  while (elapsed < combatSecondsBudget && ticks < MAX_TICKS) {
    const result = advanceCombat(state, ctx, TICK_SECONDS);
    elapsed += TICK_SECONDS;
    ticks++;

    // Enchanting overhaul's charge-trigger tally — see
    // OfflineCombatResult.enchantTriggerCounts's doc comment.
    let tickOffensiveActions = 0;
    let tickDamageTaken = 0;
    for (const event of result.events) {
      if (event.kind === 'damage_out' || event.kind === 'miss_out') {
        offensiveActionCount++;
        tickOffensiveActions++;
      } else if (event.kind === 'damage_in') {
        damageTakenCount++;
        tickDamageTaken++;
      }
    }

    for (const kill of result.kills) {
      monstersDefeated++;
      xpTotal += kill.xpGained;
      goldGained += kill.goldGained;
      voidShardsGained += kill.voidShardsGained;
      for (const drop of kill.loot) {
        lootTotals[drop.itemId] = (lootTotals[drop.itemId] ?? 0) + drop.quantity;
      }
    }

    // Mid-window enchant-exhaustion rebuild — the local `charges` copy is
    // decremented at the SAME per-tick granularity live combat consumes
    // charges at, so a slot can cross to 0 partway through this one tick's
    // events. Rebuilding every exhaustion (not just level-ups) is what
    // makes "the first 80 of 100 attacks get the bonus, the last 20 don't"
    // exact instead of approximated — same property this whole offline
    // simulation already has for everything else.
    const anyExhausted = decrementEnchantCharges(enchantments, charges, tickOffensiveActions, tickDamageTaken, result.kills.length);

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
    while (level < MAX_CHARACTER_LEVEL && xpTotal >= characterXpForLevelV2(level + 1)) {
      level++;
      leveledUp = true;
    }
    if (leveledUp || anyExhausted) {
      ctx.playerLevel = level;
      const currentPlayer = state.party.find((p) => p.isPlayer)!;
      // A level-up fully restores HP (existing behavior, unchanged); a
      // charge exhaustion with no level-up keeps whatever HP the player
      // currently has, capped against the freshly-recomputed max (which
      // only actually shrinks if the enchant that just ran out was a flat
      // Health enchant — createPlayerCombatant's own Math.min handles the
      // capping, same as it already does for ordinary re-equips).
      const enchantTotals = buildActiveEnchantTotals(enchantments, charges, input.innateWeaponProc);
      const freshMaxHp = maxHp(input.cls, level, input.equipmentBonuses, input.talentTotals.hpMultPct, enchantTotals.flatHpBonus);
      const freshParty = [createPlayerCombatant(buildInput(level, leveledUp ? freshMaxHp : currentPlayer.hp))];
      for (const companion of input.companions ?? []) {
        freshParty.push(createCompanionCombatant({ ...companion, level }, input.monster));
      }
      state.party = freshParty;
    }
  }

  const player = state.party.find((p) => p.isPlayer)!;
  return {
    monstersDefeated,
    xpGained: xpTotal - input.startingXp,
    goldGained: Math.round(goldGained),
    voidShardsGained: Math.round(voidShardsGained),
    loot: Object.entries(lootTotals).map(([itemId, quantity]) => ({ itemId, quantity })),
    hpAfter: player.hp,
    finalLevel: level,
    forcedRetreat,
    simulatedCombatSeconds: elapsed,
    finalConsumableState: ctx.consumableState,
    enchantTriggerCounts: { offensiveAction: offensiveActionCount, damageTaken: damageTakenCount },
  };
}

// Equipment Rarity overhaul's Part 8 — offline/overnight dungeon farming.
// A sibling to simulateOfflineCombat above (same tick-by-tick engine,
// MAX_TICKS/TICK_SECONDS, consumable/enchant-charge threading, level-up
// rebuild), but fights a FIXED SEQUENCE of stages instead of one monster
// respawning as itself, and includes the party's companions — mirroring
// DungeonScreen.tsx's live stage-sequencing (nextMonster/encounterSize/
// monsterHpMultiplier/monsterDamageMultiplier) exactly, including its
// one-tick-stale wave-sizing on a stage transition (this function rebuilds
// those three ctx fields from whatever stage is current BEFORE each tick's
// advanceCombat call, same as DungeonScreen's own per-tick ctx construction
// — see the loop below), so offline farming behaves identically to a live
// session rather than a separate approximation.
//
// Deliberately decoupled from gameData/dungeons.ts and gameData/monsters.ts
// (takes already-resolved Monster[] stages rather than a dungeonId) — same
// "caller resolves data, this module just simulates" posture
// simulateOfflineCombat already has for its own `monster` param. The
// caller (WelcomeBackScreen) is responsible for folding any Feast stat
// bonuses into equipmentBonuses/each companion's equipmentBonuses before
// calling this, exactly like DungeonScreen's buildEncounterInput does live
// — this function has no Feast-specific logic of its own, same posture as
// it already has no shirt-specific logic (goldFindPct is pre-resolved too).
export interface OfflineDungeonCombatInput extends Omit<OfflineCombatInput, 'monster'> {
  // Ordered monster defs for each dungeon stage (Dungeon.stages resolved
  // through MONSTERS by the caller) — the last entry is the boss.
  stages: Monster[];
  // Dungeon.combatType/encounterSize — see DungeonScreen.tsx's
  // currentEncounterSize for the exact same "never the boss stage" rule
  // this mirrors.
  dungeonCombatType?: 'single_target' | 'multi_target' | 'dot_heavy';
  dungeonEncounterSize?: number;
}

export interface OfflineDungeonCombatResult extends OfflineCombatResult {
  // How many times the whole stage sequence looped back to stage 0 after
  // killing the boss during this window — the lifetime total
  // Character.dungeonClears tracks (same meaning as DungeonScreen's own
  // pendingDungeonClearsRef, just accumulated for the whole offline window
  // in one go instead of per-autosave).
  dungeonClearsGained: number;
}

export function simulateOfflineDungeonCombat(input: OfflineDungeonCombatInput): OfflineDungeonCombatResult {
  const progress = resolveElapsedProgress(input.startedAt, input.now);
  const combatSecondsBudget = progress.effectiveHours * 3600;

  const enchantments = input.enchantments ?? {};
  const charges: Partial<Record<EquipmentSlot, number>> = { ...(input.enchantmentCharges ?? {}) };

  // Same "never the boss stage" rule as DungeonScreen's currentEncounterSize.
  function encounterSizeFor(monster: Monster): number {
    if (input.dungeonCombatType !== 'multi_target' || monster.isBoss) return 1;
    return input.dungeonEncounterSize ?? 2;
  }
  // Same party-size-divided-across-the-wave rule as currentMonsterHpMultiplier.
  function hpMultiplierFor(monster: Monster, companionCount: number): number {
    return (1 + companionCount) / encounterSizeFor(monster);
  }
  // Same fixed (not party-size-scaled) rule as currentMonsterDamageMultiplier.
  function damageMultiplierFor(monster: Monster): number {
    return monster.isBoss ? DUNGEON_BOSS_DAMAGE_MULTIPLIER : DUNGEON_TRASH_DAMAGE_MULTIPLIER;
  }

  function buildInput(level: number, currentHp: number, monster: Monster): EncounterSetupInput {
    const base = buildBaseEncounterInput(input, level, currentHp, monster, buildActiveEnchantTotals(enchantments, charges, input.innateWeaponProc));
    return {
      ...base,
      monsterHpMultiplier: hpMultiplierFor(monster, input.companions?.length ?? 0),
      monsterDamageMultiplier: damageMultiplierFor(monster),
      encounterSize: encounterSizeFor(monster),
    };
  }

  let level = input.startingLevel;
  let xpTotal = input.startingXp;
  let goldGained = 0;
  let voidShardsGained = 0;
  let monstersDefeated = 0;
  let dungeonClearsGained = 0;
  let forcedRetreat = false;
  const lootTotals: Record<string, number> = {};
  let offensiveActionCount = 0;
  let damageTakenCount = 0;

  let stageIndex = 0;
  let currentMonster = input.stages[0];

  const state: CombatState = createEncounterState(buildInput(level, input.startingHp, currentMonster));

  // Mirrors DungeonScreen's nextMonster — advances the stage (looping back
  // to the first after the boss) and tallies a full clear.
  function nextMonster(justDefeated: Monster): Monster {
    if (justDefeated.isBoss) dungeonClearsGained++;
    stageIndex = (stageIndex + 1) % input.stages.length;
    currentMonster = input.stages[stageIndex];
    return currentMonster;
  }

  const ctx: TickContext = {
    monster: currentMonster,
    playerLevel: level,
    playerCombatType: input.specDef.combatType,
    nextMonster,
    encounterSize: encounterSizeFor(currentMonster),
    monsterHpMultiplier: hpMultiplierFor(currentMonster, input.companions?.length ?? 0),
    monsterDamageMultiplier: damageMultiplierFor(currentMonster),
    consumableState: input.consumableState,
    goldFindPct: input.goldFindPct,
  };

  let elapsed = 0;
  let ticks = 0;
  while (elapsed < combatSecondsBudget && ticks < MAX_TICKS) {
    // Rebuild the wave-shape fields from whatever stage is current BEFORE
    // this tick's advanceCombat call — same per-tick ctx construction (and
    // same one-tick staleness on a stage transition) as DungeonScreen's
    // live interval handler. See this function's own doc comment above.
    ctx.monster = currentMonster;
    ctx.playerLevel = level;
    ctx.encounterSize = encounterSizeFor(currentMonster);
    ctx.monsterHpMultiplier = hpMultiplierFor(currentMonster, state.party.length - 1);
    ctx.monsterDamageMultiplier = damageMultiplierFor(currentMonster);

    const result = advanceCombat(state, ctx, TICK_SECONDS);
    elapsed += TICK_SECONDS;
    ticks++;

    let tickOffensiveActions = 0;
    let tickDamageTaken = 0;
    for (const event of result.events) {
      if (event.kind === 'damage_out' || event.kind === 'miss_out') {
        offensiveActionCount++;
        tickOffensiveActions++;
      } else if (event.kind === 'damage_in') {
        damageTakenCount++;
        tickDamageTaken++;
      }
    }

    for (const kill of result.kills) {
      monstersDefeated++;
      xpTotal += kill.xpGained;
      goldGained += kill.goldGained;
      voidShardsGained += kill.voidShardsGained;
      for (const drop of kill.loot) {
        lootTotals[drop.itemId] = (lootTotals[drop.itemId] ?? 0) + drop.quantity;
      }
    }

    const anyExhausted = decrementEnchantCharges(enchantments, charges, tickOffensiveActions, tickDamageTaken, result.kills.length);

    if (result.playerDied) {
      forcedRetreat = true;
      break;
    }

    let leveledUp = false;
    while (level < MAX_CHARACTER_LEVEL && xpTotal >= characterXpForLevelV2(level + 1)) {
      level++;
      leveledUp = true;
    }
    if (leveledUp || anyExhausted) {
      ctx.playerLevel = level;
      const currentPlayer = state.party.find((p) => p.isPlayer)!;
      const enchantTotals = buildActiveEnchantTotals(enchantments, charges, input.innateWeaponProc);
      const freshMaxHp = maxHp(input.cls, level, input.equipmentBonuses, input.talentTotals.hpMultPct, enchantTotals.flatHpBonus);
      const freshParty = [createPlayerCombatant(buildInput(level, leveledUp ? freshMaxHp : currentPlayer.hp, currentMonster))];
      for (const companion of input.companions ?? []) {
        freshParty.push(createCompanionCombatant({ ...companion, level }, currentMonster));
      }
      state.party = freshParty;
    }
  }

  const player = state.party.find((p) => p.isPlayer)!;
  return {
    monstersDefeated,
    xpGained: xpTotal - input.startingXp,
    goldGained: Math.round(goldGained),
    voidShardsGained: Math.round(voidShardsGained),
    loot: Object.entries(lootTotals).map(([itemId, quantity]) => ({ itemId, quantity })),
    hpAfter: player.hp,
    finalLevel: level,
    forcedRetreat,
    simulatedCombatSeconds: elapsed,
    finalConsumableState: ctx.consumableState,
    enchantTriggerCounts: { offensiveAction: offensiveActionCount, damageTaken: damageTakenCount },
    dungeonClearsGained,
  };
}

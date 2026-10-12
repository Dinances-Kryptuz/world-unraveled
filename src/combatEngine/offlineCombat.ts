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
import type { EquipmentSlot, Monster } from '../gameData/types';
import { characterXpForLevelV2, MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
import { resolveElapsedProgress } from '../gameData/activityEngine';
import type { CompanionCombatSetup } from '../gameData/companions';
import type { ConsumableAutomationRuntimeState } from '../gameData/consumableAutomation';
import { ENCHANTS, buildActiveEnchantTotals } from '../gameData/enchanting';
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
    const enchantTotals = buildActiveEnchantTotals(enchantments, charges);
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
      trainedAbilityIds: input.trainedAbilityIds,
      savedAbilityConditions: input.savedAbilityConditions,
      disabledAbilityIds: input.disabledAbilityIds,
      hasShieldEquipped: input.hasShieldEquipped,
      companions: input.companions?.map((c) => ({ ...c, level })),
      ...enchantTotals,
    };
  }

  // Decrements `charges` for every slot whose enchant's charge-consumption
  // category matches this tick's events — the SAME category->trigger
  // mapping consumeEnchantCharges (firebase/enchanting.ts) uses for the
  // real DB write, just applied one tick at a time instead of once at the
  // end of the window. Returns whether any slot just crossed to exactly 0,
  // so the caller knows whether a rebuild is actually needed.
  function decrementCharges(offensiveActions: number, damageTaken: number, kills: number): boolean {
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
    const anyExhausted = decrementCharges(tickOffensiveActions, tickDamageTaken, result.kills.length);

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
      const enchantTotals = buildActiveEnchantTotals(enchantments, charges);
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

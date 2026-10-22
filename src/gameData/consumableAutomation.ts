// Turns the single pinned Potion quick-use slot (Character.
// equippedConsumables.potion) + current inventory into the flat runtime
// shape combatEngine/engine.ts actually consumes, the same bridging role
// gameData/buffs.ts's evaluateActiveBuffs already plays for the OLD
// duration/fixed-charge buff system. Built ONCE per encounter setup (online:
// when CombatScreen/DungeonScreen mount or switch monster/dungeon; offline:
// once at the start of simulateOfflineCombat) and then mutated in place by
// the engine as the fight actually happens — never rebuilt mid-fight, same
// "fixed for the fight" convention buffTotals/talentTotals/equipmentBonuses
// already follow.
//
// Whatever is pinned to the Potion slot always auto-fires — there used to
// be a separate player-configured settings object (4 independently
// toggled categories, each with its own item picker and, for the two
// resource categories, a threshold) but that's gone; a single slot can
// only ever be one shape at a time, read straight off the pinned item's
// own consumableEffect, so there's nothing left to configure (see
// buildConsumableAutomationState below).
//
// Deliberately NOT the old activeBuffs.offensive_potion/defensive_potion
// single-slot mechanism (gameData/buffs.ts/firebase/consumables.ts) — that
// stays untouched for the old, now-frozen potions that still use it
// (minor_battle_draught etc., whose charges are fixed on the item itself).
// This is a second, PARALLEL mechanism whose charge pool is a flat sum
// across every owned chargedConsumables bucket for the pinned item
// (mastery-rolled, 1-4 per unit) — matching the design brief's own worked
// example ("20 potions x 4 charges = 80 charges; 100 attacks -> first 80
// buffed, last 20 not") exactly. The two can coexist (they'd simply add),
// but in practice a player only ever runs one or the other.
import type { Character, Inventory } from '../types/character';
import { ITEMS } from './items';
import { totalChargesAvailable, type ChargeBucket } from './consumableCharges';
import { autoEatRankDef } from './cooking';

export interface OffensiveAutomationState {
  itemId: string;
  damageMultiplierPct: number;
  chargesRemaining: number;
}

export interface DefensiveAutomationState {
  itemId: string;
  chargesRemaining: number;
  armorBonusPct?: number;
  maxHpBonusPct?: number;
  fireResistancePct?: number;
  shadowResistancePct?: number;
  healOnTriggerPct?: number;
}

export interface ResourceAutomationState {
  itemId: string;
  thresholdPct: number;
  cooldownSeconds: number;
  cooldownRemaining: number;
  stockRemaining: number;
  healPctMax?: number;
  manaPctMax?: number;
  healAmount?: number;
  manaAmount?: number;
}

// The engine only ever reads/mutates this plain shape — it never looks at
// Character, Inventory, or ITEMS itself (same decoupling as BuffTotals).
// offensiveChargesConsumed/defensiveChargesConsumed/healingUsed/manaUsed are
// OUTPUT accumulators the engine increments as it resolves hits/ticks; the
// caller reads them once per autosave/offline-claim batch and resets them to
// 0 (never the state's own chargesRemaining/stockRemaining/cooldownRemaining,
// which keep draining continuously across batches within one encounter) —
// see firebase/consumables.ts's applyConsumableAutomationUsage for where
// that one Firestore write per batch happens.
export interface ConsumableAutomationRuntimeState {
  offensive?: OffensiveAutomationState;
  defensive?: DefensiveAutomationState;
  healing?: ResourceAutomationState;
  mana?: ResourceAutomationState;
  // Cooking overhaul Tier 1 — Auto Eat. Reuses ResourceAutomationState's
  // exact shape (thresholdPct/cooldown/stock) so engine.ts's trigger check
  // is the same code path as the healing automation above, just fed
  // rank-derived numbers (gameData/cooking.ts's AUTO_EAT_RANKS) instead of
  // player-set ones, and gated additionally on "not a dungeon/raid" at the
  // call site (see engine.ts's step 1b).
  autoEat?: ResourceAutomationState;
  offensiveChargesConsumed: number;
  defensiveChargesConsumed: number;
  healingUsed: number;
  manaUsed: number;
  autoEatUsed: number;
}

export function emptyConsumableAutomationState(): ConsumableAutomationRuntimeState {
  return { offensiveChargesConsumed: 0, defensiveChargesConsumed: 0, healingUsed: 0, manaUsed: 0, autoEatUsed: 0 };
}

function bucketsForItem(inventory: Inventory, itemId: string): ChargeBucket[] {
  return Object.values(inventory.chargedConsumables ?? {})
    .filter((b) => b.itemId === itemId)
    .map((b) => ({ remainingCharges: b.remainingCharges, quantity: b.quantity }));
}

// Mirrors firebase/consumables.ts's remainingCooldownSeconds exactly —
// duplicated as a tiny pure calc rather than imported, since gameData/ can
// never depend on firebase/ (the reverse is fine and is how every other
// writer already works).
function remainingCooldown(character: Character, itemId: string, cooldownSeconds: number, now: Date): number {
  const lastUsed = character.itemCooldowns[itemId];
  if (!lastUsed) return 0;
  const elapsed = (now.getTime() - lastUsed.getTime()) / 1000;
  return Math.max(0, cooldownSeconds - elapsed);
}

function buildResourceState(
  character: Character,
  inventory: Inventory,
  itemId: string | null,
  thresholdPct: number,
  now: Date
): ResourceAutomationState | undefined {
  if (!itemId) return undefined;
  const item = ITEMS[itemId];
  const effect = item?.consumableEffect;
  if (!effect) return undefined;
  const stockRemaining = inventory.items[itemId] ?? 0;
  if (stockRemaining <= 0) return undefined;
  return {
    itemId,
    thresholdPct,
    cooldownSeconds: effect.cooldownSeconds,
    cooldownRemaining: remainingCooldown(character, itemId, effect.cooldownSeconds, now),
    stockRemaining,
    healPctMax: effect.healPctMax,
    manaPctMax: effect.manaPctMax,
    healAmount: effect.healAmount,
    manaAmount: effect.manaAmount,
  };
}

// Whatever's pinned to the Potion quick-use slot always auto-fires in
// combat — no settings toggle, no per-category item picker, no way to turn
// it off short of unpinning. The old Part 8 design (4 independently
// toggled categories, each with its own item/threshold) is gone; a single
// potion slot can only ever BE one of these categories at a time, read
// straight off the pinned item's own consumableEffect shape, so there's
// nothing left to configure. Healing/mana potions fire at a fixed 50%-of-
// max threshold (the old settings' own default) since there's no UI left
// to set one.
const POTION_AUTO_THRESHOLD_PCT = 50;

export function buildConsumableAutomationState(
  character: Character,
  inventory: Inventory,
  now: Date
): ConsumableAutomationRuntimeState {
  const potionItemId = character.equippedConsumables.potion;
  let offensive: OffensiveAutomationState | undefined;
  let defensive: DefensiveAutomationState | undefined;
  let healing: ResourceAutomationState | undefined;
  let mana: ResourceAutomationState | undefined;

  if (potionItemId) {
    const item = ITEMS[potionItemId];
    const effect = item?.consumableEffect;
    const buff = effect?.buff;
    if (buff?.category === 'offensive_potion') {
      const chargesRemaining = totalChargesAvailable(bucketsForItem(inventory, potionItemId));
      if (chargesRemaining > 0) {
        offensive = { itemId: potionItemId, damageMultiplierPct: buff.damageMultiplierPct ?? 0, chargesRemaining };
      }
    } else if (buff?.category === 'defensive_potion') {
      const chargesRemaining = totalChargesAvailable(bucketsForItem(inventory, potionItemId));
      if (chargesRemaining > 0) {
        defensive = {
          itemId: potionItemId,
          chargesRemaining,
          armorBonusPct: buff.armorBonusPct,
          maxHpBonusPct: buff.maxHpBonusPct,
          fireResistancePct: buff.fireResistancePct,
          shadowResistancePct: buff.shadowResistancePct,
          healOnTriggerPct: buff.healOnTriggerPct,
        };
      }
    } else if (!buff && effect && (effect.healAmount !== undefined || effect.healPctMax !== undefined)) {
      healing = buildResourceState(character, inventory, potionItemId, POTION_AUTO_THRESHOLD_PCT, now);
    } else if (!buff && effect && (effect.manaAmount !== undefined || effect.manaPctMax !== undefined)) {
      mana = buildResourceState(character, inventory, potionItemId, POTION_AUTO_THRESHOLD_PCT, now);
    }
  }

  return {
    offensive,
    defensive,
    healing,
    mana,
    autoEat: buildAutoEatState(character, inventory, now),
    offensiveChargesConsumed: 0,
    defensiveChargesConsumed: 0,
    healingUsed: 0,
    manaUsed: 0,
    autoEatUsed: 0,
  };
}

// Auto Eat's own builder — same shape as buildResourceState above, but
// rank-driven (no player on/off toggle or item/threshold picker: owning a
// rank at all IS "enabled") and food-specific. Only fires if the pinned
// Food slot (Character.equippedConsumables.food) is actually a Recovery
// Food item right now — switching the pinned food to something else (or
// unpinning it) silently turns Auto Eat off without touching autoEatRank
// itself, same "the pin is just a pointer" posture as every other
// equippedConsumables read in this codebase.
function buildAutoEatState(character: Character, inventory: Inventory, now: Date): ResourceAutomationState | undefined {
  const rank = character.autoEatRank ?? 0;
  if (rank <= 0) return undefined;
  const def = autoEatRankDef(rank);
  if (!def) return undefined;
  const itemId = character.equippedConsumables.food;
  if (!itemId) return undefined;
  const item = ITEMS[itemId];
  if (!item?.consumableEffect?.recoveryFood) return undefined;
  const stockRemaining = inventory.items[itemId] ?? 0;
  if (stockRemaining <= 0) return undefined;
  return {
    itemId,
    thresholdPct: def.hpTriggerPct,
    cooldownSeconds: item.consumableEffect.cooldownSeconds,
    cooldownRemaining: remainingCooldown(character, itemId, item.consumableEffect.cooldownSeconds, now),
    stockRemaining,
    healPctMax: def.healEfficiencyPct,
  };
}

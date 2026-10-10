// Herbalism/Alchemy overhaul's Part 8 automation — turns
// Character.consumableAutomation + current inventory into the flat runtime
// shape combatEngine/engine.ts actually consumes, the same bridging role
// gameData/buffs.ts's evaluateActiveBuffs already plays for the OLD
// duration/fixed-charge buff system. Built ONCE per encounter setup (online:
// when CombatScreen/DungeonScreen mount or switch monster/dungeon; offline:
// once at the start of simulateOfflineCombat) and then mutated in place by
// the engine as the fight actually happens — never rebuilt mid-fight, same
// "fixed for the fight" convention buffTotals/talentTotals/equipmentBonuses
// already follow.
//
// Deliberately NOT the old activeBuffs.offensive_potion/defensive_potion
// single-slot mechanism (gameData/buffs.ts/firebase/consumables.ts) — that
// stays untouched for the old, now-frozen potions that still use it
// (minor_battle_draught etc., whose charges are fixed on the item itself).
// This is a second, PARALLEL mechanism scoped to automation-selected items
// only, because its charge pool is a flat sum across every owned
// chargedConsumables bucket for that item (mastery-rolled, 1-4 per unit) —
// matching the design brief's own worked example ("20 potions x 4 charges =
// 80 charges; 100 attacks -> first 80 buffed, last 20 not") exactly. The two
// can coexist (they'd simply add), but in practice a player only ever runs
// one or the other.
import type { Character, ConsumableAutomationSettings, Inventory } from '../types/character';
import { ITEMS } from './items';
import { totalChargesAvailable, type ChargeBucket } from './consumableCharges';

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
  offensiveChargesConsumed: number;
  defensiveChargesConsumed: number;
  healingUsed: number;
  manaUsed: number;
}

export function emptyConsumableAutomationState(): ConsumableAutomationRuntimeState {
  return { offensiveChargesConsumed: 0, defensiveChargesConsumed: 0, healingUsed: 0, manaUsed: 0 };
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

export function buildConsumableAutomationState(
  character: Character,
  inventory: Inventory,
  now: Date
): ConsumableAutomationRuntimeState {
  const automation: ConsumableAutomationSettings | undefined = character.consumableAutomation;
  if (!automation) return emptyConsumableAutomationState();

  let offensive: OffensiveAutomationState | undefined;
  if (automation.autoOffensiveEnabled && automation.offensiveItemId) {
    const item = ITEMS[automation.offensiveItemId];
    const buff = item?.consumableEffect?.buff;
    const chargesRemaining = totalChargesAvailable(bucketsForItem(inventory, automation.offensiveItemId));
    if (buff && chargesRemaining > 0) {
      offensive = {
        itemId: automation.offensiveItemId,
        damageMultiplierPct: buff.damageMultiplierPct ?? 0,
        chargesRemaining,
      };
    }
  }

  let defensive: DefensiveAutomationState | undefined;
  if (automation.autoDefensiveEnabled && automation.defensiveItemId) {
    const item = ITEMS[automation.defensiveItemId];
    const buff = item?.consumableEffect?.buff;
    const chargesRemaining = totalChargesAvailable(bucketsForItem(inventory, automation.defensiveItemId));
    if (buff && chargesRemaining > 0) {
      defensive = {
        itemId: automation.defensiveItemId,
        chargesRemaining,
        armorBonusPct: buff.armorBonusPct,
        maxHpBonusPct: buff.maxHpBonusPct,
        fireResistancePct: buff.fireResistancePct,
        shadowResistancePct: buff.shadowResistancePct,
        healOnTriggerPct: buff.healOnTriggerPct,
      };
    }
  }

  const healing = automation.autoHealingEnabled
    ? buildResourceState(character, inventory, automation.healingItemId, automation.healingThresholdPct, now)
    : undefined;
  const mana = automation.autoManaEnabled
    ? buildResourceState(character, inventory, automation.manaItemId, automation.manaThresholdPct, now)
    : undefined;

  return { offensive, defensive, healing, mana, offensiveChargesConsumed: 0, defensiveChargesConsumed: 0, healingUsed: 0, manaUsed: 0 };
}

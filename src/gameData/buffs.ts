import type { BaseStat } from './classStats';
import type { BuffCategory, BuffEffect } from './types';
import { ITEMS } from './items';
import type { Character } from '../types/character';

// Evaluates Character.activeBuffs into the flat totals combat actually
// reads — same "evaluate once per encounter setup" pattern as
// talentEvaluator.ts's evaluateTalents, and combined with talent totals the
// same way (both just add onto the same profile fields). A buff past its
// expiresAt (duration-based) is treated as already gone even if it's still
// sitting in Firestore — there's no separate cleanup pass; the next potion
// of that category (or a fresh evaluate call) is what actually overwrites
// or ignores it, and activeBuffs is capped at 5 entries (one per
// BuffCategory) regardless, so a stale expired entry costs nothing.
export interface BuffTotals {
  statBonuses: Partial<Record<BaseStat, number>>;
  damageMultiplierPct: number;
  mitigationMultiplierPct: number;
  avoidanceAddPct: number;
  hitChanceBonusPct: number;
  healthRegenPerSecond: number;
  manaRegenPerSecond: number;
}

export const EMPTY_BUFF_TOTALS: BuffTotals = {
  statBonuses: {},
  damageMultiplierPct: 0,
  mitigationMultiplierPct: 0,
  avoidanceAddPct: 0,
  hitChanceBonusPct: 0,
  healthRegenPerSecond: 0,
  manaRegenPerSecond: 0,
};

function isBuffActive(buff: { charges?: number; expiresAt?: Date }, now: Date): boolean {
  if (buff.charges !== undefined) return buff.charges > 0;
  if (buff.expiresAt !== undefined) return buff.expiresAt.getTime() > now.getTime();
  return true;
}

function applyBuffEffect(totals: BuffTotals, effect: BuffEffect): void {
  if (effect.statBonuses) {
    for (const [stat, value] of Object.entries(effect.statBonuses)) {
      const key = stat as BaseStat;
      totals.statBonuses[key] = (totals.statBonuses[key] ?? 0) + (value ?? 0);
    }
  }
  totals.damageMultiplierPct += effect.damageMultiplierPct ?? 0;
  totals.mitigationMultiplierPct += effect.mitigationMultiplierPct ?? 0;
  totals.avoidanceAddPct += effect.dodgeBonusPct ?? 0;
  totals.hitChanceBonusPct += effect.hitChanceBonusPct ?? 0;
  totals.healthRegenPerSecond += effect.healthRegenPerSecond ?? 0;
  totals.manaRegenPerSecond += effect.manaRegenPerSecond ?? 0;
}

export function evaluateActiveBuffs(activeBuffs: Character['activeBuffs'], now: Date): BuffTotals {
  const totals: BuffTotals = {
    statBonuses: {},
    damageMultiplierPct: 0,
    mitigationMultiplierPct: 0,
    avoidanceAddPct: 0,
    hitChanceBonusPct: 0,
    healthRegenPerSecond: 0,
    manaRegenPerSecond: 0,
  };
  for (const buff of Object.values(activeBuffs)) {
    if (!buff || !isBuffActive(buff, now)) continue;
    const item = ITEMS[buff.itemId];
    if (!item?.consumableEffect?.buff) continue;
    applyBuffEffect(totals, item.consumableEffect.buff);
  }
  return totals;
}

// How many charges of category `category` should be consumed by `triggerCount`
// matching combat events this autosave batch — see CombatScreen/
// DungeonScreen's autosave, which counts 'damage_out'/'damage_in' events
// from the just-resolved tick batch and calls this once per active
// charge-based buff category.
export function chargesToConsume(currentCharges: number, triggerCount: number): number {
  return Math.min(currentCharges, triggerCount);
}

export const BUFF_CATEGORY_TRIGGER: Partial<Record<BuffCategory, 'offensive_action' | 'damage_taken'>> = {
  offensive_potion: 'offensive_action',
  defensive_potion: 'damage_taken',
};

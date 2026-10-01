import type { ArmorType, ItemDef } from './types';
import type { CombatType } from './combatTriangle';

export type ClassId = 'warrior' | 'priest' | 'paladin';
export type SpecId =
  | 'warrior_dps'
  | 'warrior_tank'
  | 'shadow_priest'
  | 'holy_priest'
  | 'prot_paladin'
  | 'holy_paladin';

export type BaseStat = 'STR' | 'STA' | 'INT' | 'SPI';

// Per-level growth rate for each base stat, by class. Every character starts
// at 5 in each stat at level 1; stat(level) = 5 + (level - 1) * growth.
// Paladin STA deliberately matches Warrior's — plate-wearer parity, fixed
// during Pass 1 calibration (Prot Paladin was underwater at Warrior-equal STA).
export const CLASS_GROWTH: Record<ClassId, Record<BaseStat, number>> = {
  warrior: { STR: 1.2, STA: 1.0, INT: 0.2, SPI: 0.2 },
  priest: { STR: 0.2, STA: 0.5, INT: 1.2, SPI: 1.0 },
  paladin: { STR: 0.8, STA: 1.0, INT: 0.6, SPI: 0.6 },
};

export const PRIMARY_STAT: Record<ClassId, BaseStat> = {
  warrior: 'STR',
  priest: 'INT',
  paladin: 'STR',
};

export interface SpecDef {
  class: ClassId;
  damageCoef: number;
  survivabilityCoef: number;
  avoidance: number; // 0-1
  healFrac: number; // fraction of own damage dealt converted to self-heal, 0-1
  passiveHealPct: number; // fraction of max HP healed per second, 0-1
  // The combat-triangle type this spec fights as (see combatTriangle.ts) —
  // deliberately its own field rather than derived from class, so a future
  // spec of an existing class can fight as a different type without any
  // triangle-side change.
  combatType: CombatType;
  // Relative chance of being the one a monster attacks when there's more
  // than one party member to choose from (combatEngine/targeting.ts's
  // LOWEST_HP_ALLY-adjacent weighted pick for CURRENT_ENEMY) — a simple
  // stand-in for a real threat/taunt system. 1 for everyone except the two
  // tank specs, which are deliberately high enough that a dungeon group
  // without one visibly spreads damage (and risk) across its squishier
  // members instead — the whole point of "a tank" mattering once dungeon
  // groups exist. Solo play (a one-member party) never reads this at all.
  threatWeight: number;
}

// Final Pass 1 calibrated values — every spec verified solvent (margin >= ~1.0x)
// at every level 1-59 in the naked-kit (no talent, no gear) baseline sim.
export const SPECS: Record<SpecId, SpecDef> = {
  warrior_dps: { class: 'warrior', damageCoef: 1.0, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.0, combatType: 'melee', threatWeight: 1 },
  warrior_tank: { class: 'warrior', damageCoef: 0.75, survivabilityCoef: 1.5, avoidance: 0.1, healFrac: 0.0, passiveHealPct: 0.0, combatType: 'melee', threatWeight: 4 },
  shadow_priest: { class: 'priest', damageCoef: 1.0, survivabilityCoef: 0.8, avoidance: 0.05, healFrac: 0.35, passiveHealPct: 0.018, combatType: 'magic', threatWeight: 1 },
  holy_priest: { class: 'priest', damageCoef: 0.4, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.35, passiveHealPct: 0.044, combatType: 'magic', threatWeight: 1 },
  prot_paladin: { class: 'paladin', damageCoef: 0.75, survivabilityCoef: 1.5, avoidance: 0.1, healFrac: 0.0, passiveHealPct: 0.006, combatType: 'melee', threatWeight: 4 },
  holy_paladin: { class: 'paladin', damageCoef: 0.5, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.3, passiveHealPct: 0.022, combatType: 'magic', threatWeight: 1 },
};

export function statAtLevel(cls: ClassId, stat: BaseStat, level: number): number {
  return 5 + (level - 1) * CLASS_GROWTH[cls][stat];
}

export const CLASS_LABELS: Record<ClassId, string> = {
  warrior: 'Warrior',
  priest: 'Priest',
  paladin: 'Paladin',
};

// Which armor types each class can equip. Priest is cloth-only; the two
// physical classes can wear anything (cloth included, just off-stat for
// them) — matches the classic "plate/mail wearer can always drop down to
// lighter armor" convention. Weapons and rings have no armorType and are
// unrestricted for everyone.
export const ALLOWED_ARMOR_TYPES: Record<ClassId, ArmorType[]> = {
  warrior: ['cloth', 'leather', 'mail', 'plate'],
  paladin: ['cloth', 'leather', 'mail', 'plate'],
  priest: ['cloth'],
};

export function canClassEquip(cls: ClassId, item: Pick<ItemDef, 'armorType'>): boolean {
  return !item.armorType || ALLOWED_ARMOR_TYPES[cls].includes(item.armorType);
}

export const SPEC_LABELS: Record<SpecId, string> = {
  warrior_dps: 'Melee DPS',
  warrior_tank: 'Tank',
  shadow_priest: 'Shadow',
  holy_priest: 'Holy',
  prot_paladin: 'Protection',
  holy_paladin: 'Holy',
};

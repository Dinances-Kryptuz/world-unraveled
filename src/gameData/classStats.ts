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
}

// Final Pass 1 calibrated values — every spec verified solvent (margin >= ~1.0x)
// at every level 1-59 in the naked-kit (no talent, no gear) baseline sim.
export const SPECS: Record<SpecId, SpecDef> = {
  warrior_dps: { class: 'warrior', damageCoef: 1.0, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.0 },
  warrior_tank: { class: 'warrior', damageCoef: 0.75, survivabilityCoef: 1.5, avoidance: 0.1, healFrac: 0.0, passiveHealPct: 0.0 },
  shadow_priest: { class: 'priest', damageCoef: 1.0, survivabilityCoef: 0.8, avoidance: 0.05, healFrac: 0.35, passiveHealPct: 0.018 },
  holy_priest: { class: 'priest', damageCoef: 0.4, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.35, passiveHealPct: 0.044 },
  prot_paladin: { class: 'paladin', damageCoef: 0.75, survivabilityCoef: 1.5, avoidance: 0.1, healFrac: 0.0, passiveHealPct: 0.006 },
  holy_paladin: { class: 'paladin', damageCoef: 0.5, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.3, passiveHealPct: 0.022 },
};

export function statAtLevel(cls: ClassId, stat: BaseStat, level: number): number {
  return 5 + (level - 1) * CLASS_GROWTH[cls][stat];
}

export const CLASS_LABELS: Record<ClassId, string> = {
  warrior: 'Warrior',
  priest: 'Priest',
  paladin: 'Paladin',
};

export const SPEC_LABELS: Record<SpecId, string> = {
  warrior_dps: 'Melee DPS',
  warrior_tank: 'Tank',
  shadow_priest: 'Shadow',
  holy_priest: 'Holy',
  prot_paladin: 'Protection',
  holy_paladin: 'Holy',
};

import type { ClassId, SpecId, SpecDef } from './classStats';
import { SPECS } from './classStats';
import type { CombatType } from './combatTriangle';
import { WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60, type TalentPicks } from './talents';

export const PRE_SPEC_DEFAULT: Omit<SpecDef, 'class' | 'combatType'> = {
  damageCoef: 0.85,
  survivabilityCoef: 1.0,
  avoidance: 0.05,
  healFrac: 0,
  passiveHealPct: 0,
  threatWeight: 1,
};

// Before the level-5 spec choice, there's no SpecDef to read a combatType
// from yet — fall back to the type every spec of that class ends up as
// (all warrior/paladin specs are melee, all priest specs are magic).
const PRE_SPEC_COMBAT_TYPE: Record<ClassId, CombatType> = {
  warrior: 'melee',
  paladin: 'melee',
  priest: 'magic',
  // Unreachable for a real player (no character ever has class 'mage' —
  // see classStats.ts) — present only so this stays a true Record.
  mage: 'magic',
};

export function resolveSpecDef(cls: ClassId, spec: SpecId | null): SpecDef {
  if (spec) return SPECS[spec];
  return { class: cls, combatType: PRE_SPEC_COMBAT_TYPE[cls], ...PRE_SPEC_DEFAULT };
}

export function getExtraDamageTakenPct(spec: SpecId | null, talentPicks: TalentPicks): number {
  if (spec === 'warrior_dps' && talentPicks[60] === 'damage') {
    return WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60;
  }
  return 0;
}

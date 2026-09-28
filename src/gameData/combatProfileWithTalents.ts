import type { ClassId, SpecId, SpecDef } from './classStats';
import { SPECS } from './classStats';
import { WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60, type TalentPicks } from './talents';

export const PRE_SPEC_DEFAULT: Omit<SpecDef, 'class'> = {
  damageCoef: 0.85,
  survivabilityCoef: 1.0,
  avoidance: 0.05,
  healFrac: 0,
  passiveHealPct: 0,
};

export function resolveSpecDef(cls: ClassId, spec: SpecId | null): SpecDef {
  if (spec) return SPECS[spec];
  return { class: cls, ...PRE_SPEC_DEFAULT };
}

export function getExtraDamageTakenPct(spec: SpecId | null, talentPicks: TalentPicks): number {
  if (spec === 'warrior_dps' && talentPicks[60] === 'damage') {
    return WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60;
  }
  return 0;
}

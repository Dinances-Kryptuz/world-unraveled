import type { ClassId, SpecId, SpecDef } from './classStats';
import { SPECS } from './classStats';
import type { CombatType } from './combatTriangle';
import { WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60, type TalentPicks } from './talents';

// Buffed from the original 0.85/1.0/0.05/0 — a simulation against the real
// combat formulas found the pre-spec stretch (levels 1-4) took ~58-60 hours
// of continuous play to clear, with ~90% of that being HP-regen downtime
// rather than actual fighting (pre-spec characters could barely survive
// anything but the single weakest monster in Greenhollow Fields). These
// values bring it to ~18-20 hours with combat and rest time roughly
// balanced — still a real early-game stretch, just not one that buries the
// class-identity payoff (spec choice unlocks at 5) under a rest-timer slog.
// Scoped to only the first 4 levels, so it doesn't touch the calibrated
// 1-60 curve or any spec's own tuned numbers.
export const PRE_SPEC_DEFAULT: Omit<SpecDef, 'class' | 'combatType'> = {
  damageCoef: 1.05,
  survivabilityCoef: 1.6,
  avoidance: 0.08,
  healFrac: 0,
  passiveHealPct: 0.012,
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

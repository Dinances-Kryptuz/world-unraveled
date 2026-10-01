// The secondary Melee -> Ranged -> Magic -> Melee triangle. An efficiency
// advantage, not a hard counter — deliberately isolated from class/spec and
// monster logic (rather than folded into combatFormulas.ts or engine.ts
// directly) so the percentages and even the win cycle can be retuned later
// without touching any combat/content file, per the design doc's explicit
// "keep the combat triangle modifiers configurable" instruction.
export type CombatType = 'melee' | 'ranged' | 'magic';

export const COMBAT_TYPE_ADVANTAGE_PCT = 12;
export const COMBAT_TYPE_DISADVANTAGE_PCT = 12;

// Each type beats the next one in the cycle; same type is always neutral.
const BEATS: Record<CombatType, CombatType> = {
  melee: 'ranged',
  ranged: 'magic',
  magic: 'melee',
};

export type CombatTypeMatchup = 'advantage' | 'disadvantage' | 'neutral';

export function combatTypeMatchup(attacker: CombatType, defender: CombatType): CombatTypeMatchup {
  if (attacker === defender) return 'neutral';
  return BEATS[attacker] === defender ? 'advantage' : 'disadvantage';
}

// The multiplier applied to the ATTACKER's damage coefficient, attacker type
// vs. defender type — used symmetrically in both directions (see
// engine.ts's buildPlayerProfile/buildMonsterProfile), so a melee player
// fighting a ranged monster both deals extra damage AND takes less.
export function combatTypeModifier(attacker: CombatType, defender: CombatType): number {
  switch (combatTypeMatchup(attacker, defender)) {
    case 'advantage':
      return 1 + COMBAT_TYPE_ADVANTAGE_PCT / 100;
    case 'disadvantage':
      return 1 - COMBAT_TYPE_DISADVANTAGE_PCT / 100;
    default:
      return 1;
  }
}

export const COMBAT_TYPE_LABELS: Record<CombatType, string> = {
  melee: 'Melee',
  ranged: 'Ranged',
  magic: 'Magic',
};

export const COMBAT_TYPE_ICONS: Record<CombatType, string> = {
  melee: '⚔',
  ranged: '🏹',
  magic: '✨',
};

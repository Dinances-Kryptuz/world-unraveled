import type { Character } from '../types/character';

// V1 has no weapon/equipment system yet (that's Step 9), so this is a simple
// level-scaled baseline — matches the flat "4 attack power" baseline used to
// balance monster HP earlier. Once equipment exists, its stat bonuses get
// added on top of this same baseline rather than replacing it.
export function derivePlayerCombatStats(character: Character): {
  attackPower: number;
  attackIntervalSeconds: number;
} {
  const attackPower = 4 + (character.level - 1);
  const attackIntervalSeconds = 2.0;
  return { attackPower, attackIntervalSeconds };
}

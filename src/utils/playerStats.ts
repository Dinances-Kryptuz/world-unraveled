import type { Character } from '../types/character';
import { ITEMS } from '../gameData/items';

export function derivePlayerCombatStats(character: Character): {
  attackPower: number;
  attackIntervalSeconds: number;
} {
  let equipmentAttack = 0;
  for (const itemId of Object.values(character.equipment)) {
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (item?.statBonuses?.attack) equipmentAttack += item.statBonuses.attack;
  }

  const attackPower = 4 + (character.level - 1) + equipmentAttack;
  const attackIntervalSeconds = 2.0;
  return { attackPower, attackIntervalSeconds };
}

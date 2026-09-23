import type { BaseStat } from './classStats';
import type { EquipmentSlot } from './types';
import { ITEMS } from './items';

export function getEquipmentStatBonuses(
  equipment: Record<EquipmentSlot, string | null>
): Partial<Record<BaseStat, number>> {
  const totals: Partial<Record<BaseStat, number>> = {};
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (!item?.statBonuses) continue;
    for (const [stat, value] of Object.entries(item.statBonuses)) {
      const key = stat as BaseStat;
      totals[key] = (totals[key] ?? 0) + (value ?? 0);
    }
  }
  return totals;
}

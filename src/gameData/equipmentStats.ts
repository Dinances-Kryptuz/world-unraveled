import type { BaseStat } from './classStats';
import type { EquipmentSlot, ItemDef } from './types';
import { ITEMS } from './items';

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  chest: 'Chest',
  helmet: 'Helmet',
  gloves: 'Gloves',
  legs: 'Legs',
  boots: 'Boots',
  ring: 'Ring',
  tool: 'Tool',
};

// A one-line summary of what a piece of equipment actually does — slot,
// armor type, and its stat bonuses — for a hover tooltip on a crafting
// recipe (or anywhere else that shows an item by name without its stats).
export function describeItemStats(item: ItemDef): string {
  if (item.type !== 'equipment' || !item.equipSlot) return item.description;
  const parts: string[] = [SLOT_LABELS[item.equipSlot]];
  if (item.armorType) parts.push(item.armorType);
  const bonuses = Object.entries(item.statBonuses ?? {})
    .filter(([, value]) => value)
    .map(([stat, value]) => `+${value} ${stat}`);
  if (bonuses.length > 0) parts.push(bonuses.join(', '));
  return parts.join(' — ');
}

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

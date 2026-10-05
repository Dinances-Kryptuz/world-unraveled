import type { BaseStat } from './classStats';
import type { EquipmentSlot, ItemDef } from './types';
import { ITEMS } from './items';
import { ENCHANTS } from './enchanting';

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  offhand: 'Off Hand',
  chest: 'Chest',
  helmet: 'Helmet',
  gloves: 'Gloves',
  legs: 'Legs',
  boots: 'Boots',
  ring: 'Ring',
  ring2: 'Ring',
  necklace: 'Necklace',
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

// `enchantments` is optional and defaults to none — most callers that
// don't care about enchantments (e.g. a vendor tooltip) can omit it
// entirely. Bonuses are additive on top of the item's own statBonuses,
// applied regardless of which specific item currently sits in that slot
// (enchantments bind to the SLOT — see gameData/enchanting.ts's doc
// comment for why).
export function getEquipmentStatBonuses(
  equipment: Record<EquipmentSlot, string | null>,
  enchantments: Partial<Record<EquipmentSlot, string>> = {}
): Partial<Record<BaseStat, number>> {
  const totals: Partial<Record<BaseStat, number>> = {};
  const addBonuses = (bonuses: Partial<Record<BaseStat, number>> | undefined) => {
    if (!bonuses) return;
    for (const [stat, value] of Object.entries(bonuses)) {
      const key = stat as BaseStat;
      totals[key] = (totals[key] ?? 0) + (value ?? 0);
    }
  };
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue;
    addBonuses(ITEMS[itemId]?.statBonuses);
  }
  for (const enchantId of Object.values(enchantments)) {
    if (!enchantId) continue;
    addBonuses(ENCHANTS[enchantId]?.statBonuses);
  }
  return totals;
}

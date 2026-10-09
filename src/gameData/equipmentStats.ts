import type { BaseStat } from './classStats';
import type { EquipmentSlot, ItemDef } from './types';
import { ITEMS } from './items';
import { ENCHANTS } from './enchanting';

// Two-handed weapons — a small, deliberately short list rather than a
// keyword guess across the whole weapon catalog: most of this game's
// weapons (the paired sword/battleaxe lines every Blacksmithing tier
// crafts, daggers, wands, scepters) are a one-handed progression line by
// design, matched 1:1 across tiers, and reclassifying an entire line as
// two-handed would silently cut its offhand pairing without any
// compensating stat budget. These 4 are each already flavored as
// unusually heavy/bulky in their own description ("too heavy for most",
// "heavier...than anything else") or are the classic caster 2H
// implement (a staff) — real candidates, not a guess. See the equip-rule
// doc comment on canEquipInOffhand below for what this gates.
const TWO_HANDED_WEAPON_IDS = new Set(['apprentice_staff', 'chieftains_warhammer', 'kaldrun_warhammer', 'overseers_greatmace']);

export function isTwoHandedWeapon(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  return item.equipSlot === 'weapon' && TWO_HANDED_WEAPON_IDS.has(item.id);
}

// Whether `item` is allowed in the offhand slot at all — either a genuine
// offhand item (a shield, or a cloth-flavored tome/orb for non-plate
// casters) or a one-handed WEAPON (dual wielding two one-handers). A
// two-handed weapon never fits here; see equipItem in firebase/character.ts
// for the matching "equipping a 2H weapon auto-unequips the offhand, and
// the offhand can't be equipped while a 2H weapon is already there" rules.
export function canEquipInOffhand(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  if (item.equipSlot === 'offhand') return true;
  return item.equipSlot === 'weapon' && !isTwoHandedWeapon(item);
}

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

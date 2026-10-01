import type { BaseStat } from './classStats';
import type { EquipmentSlot, ItemDef } from './types';

// Enchantments bind to the equipment SLOT, not a specific item instance —
// this engine has no concept of a unique item instance (every item of the
// same id is identical; see Character.enchantments's doc comment in
// types/character.ts). An enchant applies its bonus to whatever is
// currently in that slot and persists across re-equips, which is the
// closest honest equivalent to "enchantments are persistent on the item"
// without a much larger item-instancing rewrite. Re-enchanting a slot
// (applyEnchant in firebase/enchanting.ts) simply overwrites the old one.
export interface EnchantDef {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  requiredSkill: number;
  statBonuses: Partial<Record<BaseStat, number>>;
  materials: { itemId: string; quantity: number }[];
  goldCost: number;
}

// Weapon/Chest/Gloves/Legs/Boots/Ring — the 6 of the design brief's 7
// requested slots (Weapon/Boots/Bracers/Chest/Cloak/Gloves/Shield) that
// actually exist in this game's itemization. Bracers/Cloak/Shield aren't
// implemented as equipment slots at all yet (see EquipmentSlot in
// types.ts) — adding them is an itemization expansion outside this
// profession system's scope, not an Enchanting limitation.
export const ENCHANTS: Record<string, EnchantDef> = {
  enchant_weapon_minor_might: {
    id: 'enchant_weapon_minor_might', name: 'Enchant Weapon: Minor Might',
    description: '+4 Strength', slot: 'weapon', requiredSkill: 20,
    statBonuses: { STR: 4 }, materials: [{ itemId: 'arcane_dust', quantity: 4 }], goldCost: 5,
  },
  enchant_weapon_greater_might: {
    id: 'enchant_weapon_greater_might', name: 'Enchant Weapon: Greater Might',
    description: '+10 Strength', slot: 'weapon', requiredSkill: 120,
    statBonuses: { STR: 10 }, materials: [{ itemId: 'arcane_essence', quantity: 4 }], goldCost: 25,
  },
  enchant_weapon_superior_might: {
    id: 'enchant_weapon_superior_might', name: 'Enchant Weapon: Superior Might',
    description: '+18 Strength', slot: 'weapon', requiredSkill: 230,
    statBonuses: { STR: 18 }, materials: [{ itemId: 'arcane_crystal', quantity: 3 }], goldCost: 80,
  },

  enchant_chest_minor_stats: {
    id: 'enchant_chest_minor_stats', name: 'Enchant Chest: Minor Vigor',
    description: '+5 Stamina', slot: 'chest', requiredSkill: 15,
    statBonuses: { STA: 5 }, materials: [{ itemId: 'arcane_dust', quantity: 4 }], goldCost: 5,
  },
  enchant_chest_greater_stats: {
    id: 'enchant_chest_greater_stats', name: 'Enchant Chest: Greater Vigor',
    description: '+12 Stamina', slot: 'chest', requiredSkill: 125,
    statBonuses: { STA: 12 }, materials: [{ itemId: 'arcane_essence', quantity: 4 }], goldCost: 25,
  },
  enchant_chest_superior_stats: {
    id: 'enchant_chest_superior_stats', name: 'Enchant Chest: Superior Vigor',
    description: '+20 Stamina', slot: 'chest', requiredSkill: 235,
    statBonuses: { STA: 20 }, materials: [{ itemId: 'arcane_crystal', quantity: 3 }], goldCost: 80,
  },

  enchant_gloves_minor_focus: {
    id: 'enchant_gloves_minor_focus', name: 'Enchant Gloves: Minor Focus',
    description: '+4 Intellect', slot: 'gloves', requiredSkill: 25,
    statBonuses: { INT: 4 }, materials: [{ itemId: 'arcane_dust', quantity: 3 }], goldCost: 5,
  },
  enchant_gloves_greater_focus: {
    id: 'enchant_gloves_greater_focus', name: 'Enchant Gloves: Greater Focus',
    description: '+9 Intellect', slot: 'gloves', requiredSkill: 135,
    statBonuses: { INT: 9 }, materials: [{ itemId: 'arcane_essence', quantity: 3 }], goldCost: 25,
  },

  enchant_legs_minor_vitality: {
    id: 'enchant_legs_minor_vitality', name: 'Enchant Legs: Minor Vitality',
    description: '+6 Stamina', slot: 'legs', requiredSkill: 30,
    statBonuses: { STA: 6 }, materials: [{ itemId: 'arcane_dust', quantity: 4 }], goldCost: 6,
  },
  enchant_legs_greater_vitality: {
    id: 'enchant_legs_greater_vitality', name: 'Enchant Legs: Greater Vitality',
    description: '+14 Stamina', slot: 'legs', requiredSkill: 150,
    statBonuses: { STA: 14 }, materials: [{ itemId: 'arcane_essence', quantity: 4 }], goldCost: 28,
  },

  enchant_boots_minor_spirit: {
    id: 'enchant_boots_minor_spirit', name: 'Enchant Boots: Minor Spirit',
    description: '+4 Spirit', slot: 'boots', requiredSkill: 10,
    statBonuses: { SPI: 4 }, materials: [{ itemId: 'arcane_dust', quantity: 3 }], goldCost: 4,
  },
  enchant_boots_greater_spirit: {
    id: 'enchant_boots_greater_spirit', name: 'Enchant Boots: Greater Spirit',
    description: '+9 Spirit', slot: 'boots', requiredSkill: 110,
    statBonuses: { SPI: 9 }, materials: [{ itemId: 'arcane_essence', quantity: 3 }], goldCost: 22,
  },

  enchant_ring_minor_power: {
    id: 'enchant_ring_minor_power', name: 'Enchant Ring: Minor Power',
    description: '+3 Strength, +3 Intellect', slot: 'ring', requiredSkill: 45,
    statBonuses: { STR: 3, INT: 3 }, materials: [{ itemId: 'arcane_essence', quantity: 2 }], goldCost: 15,
  },
  enchant_ring_greater_power: {
    id: 'enchant_ring_greater_power', name: 'Enchant Ring: Greater Power',
    description: '+7 Strength, +7 Intellect', slot: 'ring', requiredSkill: 180,
    statBonuses: { STR: 7, INT: 7 }, materials: [{ itemId: 'arcane_crystal', quantity: 2 }], goldCost: 60,
  },
};

export function enchantsForSlot(slot: EquipmentSlot): EnchantDef[] {
  return Object.values(ENCHANTS).filter((e) => e.slot === slot);
}

// ── Disenchanting ──────────────────────────────────────────────────────
// Deliberately a formula over the item's own statBonuses/sellValue rather
// than a static per-item field — "any equipment item of sufficient level
// should be disenchantable" (per the design brief) would otherwise mean
// hand-tagging 100+ existing items. Tools are excluded (equipSlot ===
// 'tool') — they're profession gear, not armor/weapons/jewelry.
export type DisenchantTier = 'dust' | 'essence' | 'crystal';

function statTotal(item: ItemDef): number {
  return Object.values(item.statBonuses ?? {}).reduce((sum, v) => sum + (v ?? 0), 0);
}

export function isDisenchantable(item: ItemDef): boolean {
  return item.type === 'equipment' && item.equipSlot !== undefined && item.equipSlot !== 'tool';
}

export function disenchantTier(item: ItemDef): DisenchantTier {
  const total = statTotal(item);
  if (total < 10) return 'dust';
  if (total < 20) return 'essence';
  return 'crystal';
}

// Required Enchanting skill scales with the item's own power — a level-60
// raid drop needs real Enchanting investment to break down, a starter
// item needs none, matching "higher-level gear should require higher
// Enchanting skill to disenchant."
export function disenchantRequiredSkill(item: ItemDef): number {
  return Math.min(280, Math.round(statTotal(item) * 6));
}

const DISENCHANT_YIELD: Record<DisenchantTier, { itemId: string; min: number; max: number }> = {
  dust: { itemId: 'arcane_dust', min: 2, max: 4 },
  essence: { itemId: 'arcane_essence', min: 1, max: 3 },
  crystal: { itemId: 'arcane_crystal', min: 1, max: 2 },
};

export function disenchantYield(item: ItemDef): { itemId: string; quantity: number } {
  const tier = DISENCHANT_YIELD[disenchantTier(item)];
  const quantity = tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
  return { itemId: tier.itemId, quantity };
}

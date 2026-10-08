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
//
// requiredSkill/xpAward are on the SAME 1-100 shared profession scale every
// other profession uses (craftingEngine.ts) — unlike every other crafting
// profession, Enchanting has no craftSeconds/timed-activity concept at all
// (applying or disenchanting is a single instant action, with no idle/
// offline progression), so it resolves through craftingEngine.ts's
// resolveEnchantApply/resolveDisenchant (one action's worth of XP at a
// time) rather than resolveCraftingOffline's time-batched loop. Before this,
// Enchanting granted no profession XP at all — applyEnchant/disenchantItem
// only ever gated on skill, never raised it.
export interface EnchantDef {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  requiredSkill: number;
  // Base profession XP for applying this enchant — also this recipe's
  // Mastery XP per application (keyed by enchant id, same as any other
  // crafting recipe). Enchanting Mastery only grants the shared ingredient-
  // save-chance bonus (see craftingMasteryIngredientSaveChance) — there's no
  // craft time to speed up and no "extra output" for a single-slot enchant.
  xpAward: number;
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
    description: '+4 Strength', slot: 'weapon', requiredSkill: 5, xpAward: 13,
    statBonuses: { STR: 4 }, materials: [{ itemId: 'arcane_dust', quantity: 4 }], goldCost: 5,
  },
  enchant_weapon_greater_might: {
    id: 'enchant_weapon_greater_might', name: 'Enchant Weapon: Greater Might',
    description: '+10 Strength', slot: 'weapon', requiredSkill: 49, xpAward: 106,
    statBonuses: { STR: 10 }, materials: [{ itemId: 'arcane_essence', quantity: 4 }], goldCost: 25,
  },
  enchant_weapon_superior_might: {
    id: 'enchant_weapon_superior_might', name: 'Enchant Weapon: Superior Might',
    description: '+18 Strength', slot: 'weapon', requiredSkill: 98, xpAward: 202,
    statBonuses: { STR: 18 }, materials: [{ itemId: 'arcane_crystal', quantity: 3 }], goldCost: 80,
  },

  enchant_chest_minor_stats: {
    id: 'enchant_chest_minor_stats', name: 'Enchant Chest: Minor Vigor',
    description: '+5 Stamina', slot: 'chest', requiredSkill: 3, xpAward: 8,
    statBonuses: { STA: 5 }, materials: [{ itemId: 'arcane_dust', quantity: 4 }], goldCost: 5,
  },
  enchant_chest_greater_stats: {
    id: 'enchant_chest_greater_stats', name: 'Enchant Chest: Greater Vigor',
    description: '+12 Stamina', slot: 'chest', requiredSkill: 52, xpAward: 112,
    statBonuses: { STA: 12 }, materials: [{ itemId: 'arcane_essence', quantity: 4 }], goldCost: 25,
  },
  enchant_chest_superior_stats: {
    id: 'enchant_chest_superior_stats', name: 'Enchant Chest: Superior Vigor',
    description: '+20 Stamina', slot: 'chest', requiredSkill: 100, xpAward: 206,
    statBonuses: { STA: 20 }, materials: [{ itemId: 'arcane_crystal', quantity: 3 }], goldCost: 80,
  },

  enchant_gloves_minor_focus: {
    id: 'enchant_gloves_minor_focus', name: 'Enchant Gloves: Minor Focus',
    description: '+4 Intellect', slot: 'gloves', requiredSkill: 8, xpAward: 20,
    statBonuses: { INT: 4 }, materials: [{ itemId: 'arcane_dust', quantity: 3 }], goldCost: 5,
  },
  enchant_gloves_greater_focus: {
    id: 'enchant_gloves_greater_focus', name: 'Enchant Gloves: Greater Focus',
    description: '+9 Intellect', slot: 'gloves', requiredSkill: 56, xpAward: 120,
    statBonuses: { INT: 9 }, materials: [{ itemId: 'arcane_essence', quantity: 3 }], goldCost: 25,
  },

  enchant_legs_minor_vitality: {
    id: 'enchant_legs_minor_vitality', name: 'Enchant Legs: Minor Vitality',
    description: '+6 Stamina', slot: 'legs', requiredSkill: 10, xpAward: 24,
    statBonuses: { STA: 6 }, materials: [{ itemId: 'arcane_dust', quantity: 4 }], goldCost: 6,
  },
  enchant_legs_greater_vitality: {
    id: 'enchant_legs_greater_vitality', name: 'Enchant Legs: Greater Vitality',
    description: '+14 Stamina', slot: 'legs', requiredSkill: 63, xpAward: 134,
    statBonuses: { STA: 14 }, materials: [{ itemId: 'arcane_essence', quantity: 4 }], goldCost: 28,
  },

  enchant_boots_minor_spirit: {
    id: 'enchant_boots_minor_spirit', name: 'Enchant Boots: Minor Spirit',
    description: '+4 Spirit', slot: 'boots', requiredSkill: 1, xpAward: 3,
    statBonuses: { SPI: 4 }, materials: [{ itemId: 'arcane_dust', quantity: 3 }], goldCost: 4,
  },
  enchant_boots_greater_spirit: {
    id: 'enchant_boots_greater_spirit', name: 'Enchant Boots: Greater Spirit',
    description: '+9 Spirit', slot: 'boots', requiredSkill: 45, xpAward: 98,
    statBonuses: { SPI: 9 }, materials: [{ itemId: 'arcane_essence', quantity: 3 }], goldCost: 22,
  },

  enchant_ring_minor_power: {
    id: 'enchant_ring_minor_power', name: 'Enchant Ring: Minor Power',
    description: '+3 Strength, +3 Intellect', slot: 'ring', requiredSkill: 16, xpAward: 37,
    statBonuses: { STR: 3, INT: 3 }, materials: [{ itemId: 'arcane_essence', quantity: 2 }], goldCost: 15,
  },
  enchant_ring_greater_power: {
    id: 'enchant_ring_greater_power', name: 'Enchant Ring: Greater Power',
    description: '+7 Strength, +7 Intellect', slot: 'ring', requiredSkill: 76, xpAward: 159,
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

// Required Enchanting level scales with the item's own power — a level-60
// raid drop needs real Enchanting investment to break down, a starter
// item needs none, matching "higher-level gear should require higher
// Enchanting skill to disenchant." On the shared 1-100 profession scale
// (rescaled from an original 1-300-shaped 280 cap/x6 multiplier by the same
// /3 factor every other profession's old data was rescaled by).
export function disenchantRequiredSkill(item: ItemDef): number {
  return Math.min(93, Math.round(statTotal(item) * 2));
}

// Profession XP for disenchanting one item — no separate Mastery (there's
// no fixed "recipe" to master; any sufficiently-leveled item qualifies, see
// resolveDisenchant's doc comment in craftingEngine.ts). Scales with the
// item's own required-skill the same way an enchant's own xpAward scales
// with its requiredSkill.
export function disenchantXpAward(item: ItemDef): number {
  return Math.max(1, Math.round(3 + disenchantRequiredSkill(item) * 2.1));
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

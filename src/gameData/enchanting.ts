import type { BaseStat } from './classStats';
import type { EquipmentSlot, ItemDef } from './types';
import { RECIPES } from './recipes';
import { MONSTERS } from './monsters';
import { ZONE_TIER, DEFAULT_ZONE_ID } from './zones';
import { tierForLevel } from './professionTiers';
import { TRAINER_ZONE_BY_RANK } from './professionTrainers';

// Enchantments bind to the equipment SLOT, not a specific item instance —
// this engine has no concept of a unique item instance (every item of the
// same id is identical; see Character.enchantments's doc comment in
// types/character.ts). An enchant applies its bonus to whatever is
// currently in that slot and persists across re-equips, which is the
// closest honest equivalent to "enchantments are persistent on the item"
// without a much larger item-instancing rewrite. Re-enchanting a slot
// (useEnchantScroll in firebase/enchanting.ts) simply overwrites the old one.
//
// Scrolls, not instant application: an ENCHANTS entry is purely the EFFECT
// (what it does, and which scroll item applies it) — the requiredSkill/
// xpAward/materials/goldCost that used to live here moved onto the matching
// scroll_* Recipe (recipes.ts's "Enchanting scrolls" section), so crafting a
// scroll now runs through the exact same timed/offline/AFK-capable
// craftingEngine.ts pipeline every other crafting profession uses instead of
// a single instant click. Using the finished scroll (useEnchantScroll) is
// then a free, instant, no-skill-gated action — the time/material/skill
// cost was already paid once, at craft time, matching a classic MMO's
// enchanting-vellum workflow and the "far less daunting, more AFK" goal
// this redesign was built for.
export interface EnchantDef {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  statBonuses: Partial<Record<BaseStat, number>>;
  // The enchant_scroll item (items.ts) that applies this enchant when used.
  scrollItemId: string;
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
    description: '+4 Strength', slot: 'weapon', statBonuses: { STR: 4 }, scrollItemId: 'scroll_weapon_minor_might',
  },
  enchant_weapon_greater_might: {
    id: 'enchant_weapon_greater_might', name: 'Enchant Weapon: Greater Might',
    description: '+10 Strength', slot: 'weapon', statBonuses: { STR: 10 }, scrollItemId: 'scroll_weapon_greater_might',
  },
  enchant_weapon_superior_might: {
    id: 'enchant_weapon_superior_might', name: 'Enchant Weapon: Superior Might',
    description: '+18 Strength', slot: 'weapon', statBonuses: { STR: 18 }, scrollItemId: 'scroll_weapon_superior_might',
  },

  enchant_chest_minor_stats: {
    id: 'enchant_chest_minor_stats', name: 'Enchant Chest: Minor Vigor',
    description: '+5 Stamina', slot: 'chest', statBonuses: { STA: 5 }, scrollItemId: 'scroll_chest_minor_stats',
  },
  enchant_chest_greater_stats: {
    id: 'enchant_chest_greater_stats', name: 'Enchant Chest: Greater Vigor',
    description: '+12 Stamina', slot: 'chest', statBonuses: { STA: 12 }, scrollItemId: 'scroll_chest_greater_stats',
  },
  enchant_chest_superior_stats: {
    id: 'enchant_chest_superior_stats', name: 'Enchant Chest: Superior Vigor',
    description: '+20 Stamina', slot: 'chest', statBonuses: { STA: 20 }, scrollItemId: 'scroll_chest_superior_stats',
  },

  enchant_gloves_minor_focus: {
    id: 'enchant_gloves_minor_focus', name: 'Enchant Gloves: Minor Focus',
    description: '+4 Intellect', slot: 'gloves', statBonuses: { INT: 4 }, scrollItemId: 'scroll_gloves_minor_focus',
  },
  enchant_gloves_greater_focus: {
    id: 'enchant_gloves_greater_focus', name: 'Enchant Gloves: Greater Focus',
    description: '+9 Intellect', slot: 'gloves', statBonuses: { INT: 9 }, scrollItemId: 'scroll_gloves_greater_focus',
  },

  enchant_legs_minor_vitality: {
    id: 'enchant_legs_minor_vitality', name: 'Enchant Legs: Minor Vitality',
    description: '+6 Stamina', slot: 'legs', statBonuses: { STA: 6 }, scrollItemId: 'scroll_legs_minor_vitality',
  },
  enchant_legs_greater_vitality: {
    id: 'enchant_legs_greater_vitality', name: 'Enchant Legs: Greater Vitality',
    description: '+14 Stamina', slot: 'legs', statBonuses: { STA: 14 }, scrollItemId: 'scroll_legs_greater_vitality',
  },

  enchant_boots_minor_spirit: {
    id: 'enchant_boots_minor_spirit', name: 'Enchant Boots: Minor Spirit',
    description: '+4 Spirit', slot: 'boots', statBonuses: { SPI: 4 }, scrollItemId: 'scroll_boots_minor_spirit',
  },
  enchant_boots_greater_spirit: {
    id: 'enchant_boots_greater_spirit', name: 'Enchant Boots: Greater Spirit',
    description: '+9 Spirit', slot: 'boots', statBonuses: { SPI: 9 }, scrollItemId: 'scroll_boots_greater_spirit',
  },

  enchant_ring_minor_power: {
    id: 'enchant_ring_minor_power', name: 'Enchant Ring: Minor Power',
    description: '+3 Strength, +3 Intellect', slot: 'ring', statBonuses: { STR: 3, INT: 3 }, scrollItemId: 'scroll_ring_minor_power',
  },
  enchant_ring_greater_power: {
    id: 'enchant_ring_greater_power', name: 'Enchant Ring: Greater Power',
    description: '+7 Strength, +7 Intellect', slot: 'ring', statBonuses: { STR: 7, INT: 7 }, scrollItemId: 'scroll_ring_greater_power',
  },
};

export function enchantsForSlot(slot: EquipmentSlot): EnchantDef[] {
  return Object.values(ENCHANTS).filter((e) => e.slot === slot);
}

// ── Disenchanting ──────────────────────────────────────────────────────
// Deliberately formulas over the item's own data (stat total for the reward
// category below, origin zone for the skill gate above) rather than static
// per-item fields — "any item can be disenchanted" (per the design brief)
// would otherwise mean hand-tagging 200+ existing items. Tools are excluded
// (equipSlot === 'tool') — they're profession gear, not armor/weapons/
// jewelry.
//
// Widened (Enchanting overhaul) from 3 generic tiers to a 2-axis system:
// WHICH ZONE's material family (dust/essence/shard all come in one of 6
// zone-specific flavors, see items.ts's "Enchanting materials" section) ×
// WHICH CATEGORY within that family (dust/lesser essence/greater essence/
// shard). The original 3-tier DisenchantTier type/ZONE_TIER_DISENCHANT_TIER
// mapping is gone (both axes below now fully replace what it only
// approximated), but the original arcane_dust/arcane_essence/arcane_crystal
// ITEMS are kept exactly as-is — just reassigned into this new table (zone 1
// dust/lesser essence, zone 5 shard) — so nothing already in a player's
// inventory or an existing scroll recipe's material list silently breaks.
export type DisenchantCategory = 'dust' | 'lesser_essence' | 'greater_essence' | 'shard';

// Zone tier (1-6, via ZONE_TIER) -> which actual item each category yields
// in that zone's family. Zones 1-2 have no shard tier at all (same "shards
// only start appearing partway through the game" posture as a classic
// MMO's own disenchant table); zone 6 collapses lesser/greater essence into
// one tier (Ember Essence) per the design brief's explicit zone-6 note.
const ZONE_DISENCHANT_MATERIALS: Record<number, Partial<Record<DisenchantCategory, string>>> = {
  1: { dust: 'arcane_dust', lesser_essence: 'arcane_essence', greater_essence: 'greater_arcane_essence' },
  2: { dust: 'faded_dust', lesser_essence: 'lesser_faded_essence', greater_essence: 'greater_faded_essence' },
  3: {
    dust: 'smoldering_dust', lesser_essence: 'lesser_smoldering_essence',
    greater_essence: 'greater_smoldering_essence', shard: 'smoldering_shard',
  },
  4: {
    dust: 'charred_dust', lesser_essence: 'lesser_charred_essence',
    greater_essence: 'greater_charred_essence', shard: 'charred_shard',
  },
  5: {
    dust: 'molten_dust', lesser_essence: 'lesser_molten_essence',
    greater_essence: 'greater_molten_essence', shard: 'arcane_crystal',
  },
  6: { dust: 'ember_dust', lesser_essence: 'ember_essence', greater_essence: 'ember_essence', shard: 'ember_shards' },
};

// Per-category yield range, independent of zone — a rarer category always
// yields fewer units per item, same escalating-scarcity shape the original
// 3-tier table had (dust > essence > crystal).
const CATEGORY_YIELD_RANGE: Record<DisenchantCategory, { min: number; max: number }> = {
  dust: { min: 2, max: 4 },
  lesser_essence: { min: 1, max: 3 },
  greater_essence: { min: 1, max: 2 },
  shard: { min: 1, max: 1 },
};

function statTotal(item: ItemDef): number {
  return Object.values(item.statBonuses ?? {}).reduce((sum, v) => sum + (v ?? 0), 0);
}

export function isDisenchantable(item: ItemDef): boolean {
  return item.type === 'equipment' && item.equipSlot !== undefined && item.equipSlot !== 'tool';
}

// Result item id -> Recipe.rarity, for every Recipe.materialId-tagged
// recipe (the consolidated, randomized-stat armor/jewelry set — see
// types.ts's Recipe comment). Computed once from recipe data rather than
// hand-maintained, so this never drifts out of sync with which items are
// actually randomized, or with a recipe's own rarity tuning.
let randomizedArmorRarityByItemId: Map<string, 'common' | 'uncommon' | 'rare'> | null = null;
function randomizedArmorRarity(itemId: string): 'common' | 'uncommon' | 'rare' | undefined {
  if (!randomizedArmorRarityByItemId) {
    randomizedArmorRarityByItemId = new Map(
      Object.values(RECIPES)
        .filter((r) => r.materialId)
        .map((r) => [r.resultItemId, r.rarity])
    );
  }
  return randomizedArmorRarityByItemId.get(itemId);
}

// Which DisenchantCategory a given item falls into, independent of zone.
// Randomized-stat armor (gameData/equipmentRolls.ts) has no fixed
// statBonuses to sum — its stats vary per roll — so it uses the recipe's
// own authored rarity instead (previously unused by disenchanting at all):
// common->dust, uncommon->lesser essence, rare->greater essence/shard when
// that zone has a shard tier, else greater essence. Every other item
// (weapons, pre-overhaul "Sacred" legacy items, monster-drop jewelry) keeps
// the original statTotal-based thresholds, now mapped onto 4 categories
// instead of 3 (same cutoffs, shard only when the zone's family has one).
function disenchantCategory(item: ItemDef, zoneTier: number): DisenchantCategory {
  const hasShard = !!ZONE_DISENCHANT_MATERIALS[zoneTier]?.shard;
  const rarity = randomizedArmorRarity(item.id);
  if (rarity) {
    if (rarity === 'rare') return hasShard ? 'shard' : 'greater_essence';
    if (rarity === 'uncommon') return 'lesser_essence';
    return 'dust';
  }
  const total = statTotal(item);
  if (total >= 20) return hasShard ? 'shard' : 'greater_essence';
  if (total >= 10) return 'lesser_essence';
  return 'dust';
}

// The Enchanting skill required to disenchant gear scales with the ZONE the
// gear came from, not the item's own stat total — "any item can be
// disenchanted as long as your Enchanting is trained to the same level as
// the zone the equipment came from," per the design brief. ZONE_TIER (1-6,
// zones.ts) already orders zones by content progression; this maps that
// ordering onto the shared 1-100 Enchanting scale using the same 20/40/60/
// 80/100 rank ceilings the profession-trainer system uses for the 5 zones
// that host a trainer (professionTrainers.ts's TRAINER_ZONE_BY_RANK), with
// Molten Scar (tier 5, the one zone with no trainer of its own — it sits
// between Cinderfall's Artisan gear and Cinderheart's Master gear) filling
// the gap at 90. Zone 1 (the starting zone) is 1, not 20 — a brand-new
// Enchanter should be able to disenchant the starter gear they're already
// standing on top of, not need to rank up first.
const ZONE_TIER_DISENCHANT_SKILL: Record<number, number> = {
  1: 1, // Greenhollow Fields
  2: 40, // Stonecrag Foothills
  3: 60, // Emberfall Ridge
  4: 80, // Cinderfall Depths
  5: 90, // The Molten Scar
  6: 100, // Cinderheart Crater
};

// Crafted gear "comes from" the zone whose trainer teaches the recipe that
// makes it (by the recipe's requiredSkill rank band); dropped gear comes
// from the lowest-tier zone among the monsters whose loot table includes it
// (the earliest a player could plausibly have obtained it). Gear tied to
// neither (starter/vendor/quest items) defaults to the game's starting
// zone — never harder to disenchant than the easiest gear in the game.
export function originZoneId(item: ItemDef): string {
  const recipe = Object.values(RECIPES).find((r) => r.resultItemId === item.id);
  if (recipe) return TRAINER_ZONE_BY_RANK[tierForLevel(recipe.requiredSkill)];

  let bestZoneId: string | null = null;
  let bestTier = Infinity;
  for (const monster of Object.values(MONSTERS)) {
    if (!monster.lootTable.some((drop) => drop.itemId === item.id)) continue;
    for (const zoneId of monster.zoneIds) {
      const tier = ZONE_TIER[zoneId] ?? Infinity;
      if (tier < bestTier) {
        bestTier = tier;
        bestZoneId = zoneId;
      }
    }
  }
  return bestZoneId ?? DEFAULT_ZONE_ID;
}

export function disenchantRequiredSkill(item: ItemDef): number {
  const tier = ZONE_TIER[originZoneId(item)] ?? 1;
  return ZONE_TIER_DISENCHANT_SKILL[tier] ?? 100;
}

// Profession XP for disenchanting one item — no separate Mastery (there's
// no fixed "recipe" to master; any sufficiently-leveled item qualifies, see
// resolveDisenchantOffline's doc comment in craftingEngine.ts). Scales with
// the item's own required-skill the same way an enchant's own xpAward scales
// with its requiredSkill.
export function disenchantXpAward(item: ItemDef): number {
  return Math.max(1, Math.round(3 + disenchantRequiredSkill(item) * 2.1));
}

// The deterministic {itemId, min, max} range disenchanting this item rolls
// from, per unit disenchanted — resolveDisenchantOffline (craftingEngine.ts)
// rolls its own random quantity in that range once per item inside its
// batch loop (a single stack-wide roll wouldn't reflect "N independent
// disenchants" the way a real batch should). Combines both axes: zone tier
// picks the material FAMILY, disenchantCategory picks which member of that
// family.
export function disenchantYieldRange(item: ItemDef): { itemId: string; min: number; max: number } {
  const zoneTier = ZONE_TIER[originZoneId(item)] ?? 1;
  const category = disenchantCategory(item, zoneTier);
  const itemId = ZONE_DISENCHANT_MATERIALS[zoneTier]?.[category] ?? 'arcane_dust';
  return { itemId, ...CATEGORY_YIELD_RANGE[category] };
}

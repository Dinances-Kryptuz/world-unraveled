import { ZONE_TIER } from './zones';

// The Herbalism/Alchemy overhaul's single source of truth for herb identity
// and zone ownership — every other system (gather nodes in zones.ts, the 30
// Alchemy recipes in recipes.ts, Herbalism/Alchemy zone Mastery crediting)
// reads from here rather than re-deriving a herb's zone from wherever it
// happens to be gathered. This mirrors materials.ts's role for the
// Blacksmithing material-Mastery system — one registry, nothing downstream
// hardcodes a herb id in a conditional.
//
// 18 primary herbs (3 per zone, gatherable from a dedicated node) + 7 bonus
// herbs (never have their own node — see zones.ts's herb nodes; they drop
// alongside specific primary herbs per BONUS_SOURCES below). This is the
// complete, final herb roster — the old ad hoc herb set (Wildroot, Mountain
// Sage, Frostcap, Sunpetal, Emberleaf, Emberpetal, Ashroot, Cinderbloom,
// Scorchweed, Emberheart Bloom, Heartbloom) is retired: its items and the 6
// nodes that aren't Peacebloom's stay defined in items.ts/zones.ts exactly
// as they were (so existing stacks keep working) but are no longer reachable
// from any Zone.gatherNodeIds list. Peacebloom alone carries forward as a
// live, still-gatherable item, since it coincidentally matches this design's
// own herb list.
export interface PrimaryHerbDef {
  id: string;
  name: string;
  type: 'primary';
  zoneId: string;
  requiredLevel: number;
}

export interface BonusHerbDef {
  id: string;
  name: string;
  type: 'bonus';
  zoneId: string; // explicit home zone for Alchemy Mastery crediting — see module comment
  sourceHerbIds: string[]; // which primary herbs can roll this bonus herb
  dropChance: number; // 0-1, rolled independently per successful primary harvest
}

export type HerbDef = PrimaryHerbDef | BonusHerbDef;

// Flat per-zone XP/time (every primary herb in a zone shares its zone's
// values — Herbalism 1.3's table). Keyed by ZONE_TIER number (1-6).
export const HERB_ZONE_XP: Record<number, number> = { 1: 10, 2: 18, 3: 30, 4: 48, 5: 75, 6: 110 };
export const HERB_ZONE_SECONDS: Record<number, number> = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 16, 6: 18 };

export const PRIMARY_HERBS: PrimaryHerbDef[] = [
  { id: 'peacebloom', name: 'Peacebloom', type: 'primary', zoneId: 'greenhollow_fields', requiredLevel: 1 },
  { id: 'silverleaf', name: 'Silverleaf', type: 'primary', zoneId: 'greenhollow_fields', requiredLevel: 8 },
  { id: 'earthroot', name: 'Earthroot', type: 'primary', zoneId: 'greenhollow_fields', requiredLevel: 15 },

  { id: 'mageroyal', name: 'Mageroyal', type: 'primary', zoneId: 'stonecrag_foothills', requiredLevel: 18 },
  { id: 'briarthorn', name: 'Briarthorn', type: 'primary', zoneId: 'stonecrag_foothills', requiredLevel: 24 },
  { id: 'bruiseweed', name: 'Bruiseweed', type: 'primary', zoneId: 'stonecrag_foothills', requiredLevel: 30 },

  { id: 'kingsblood', name: 'Kingsblood', type: 'primary', zoneId: 'emberfall_ridge', requiredLevel: 35 },
  { id: 'liferoot', name: 'Liferoot', type: 'primary', zoneId: 'emberfall_ridge', requiredLevel: 41 },
  { id: 'goldthorn', name: 'Goldthorn', type: 'primary', zoneId: 'emberfall_ridge', requiredLevel: 47 },

  { id: 'khadgars_whisker', name: "Khadgar's Whisker", type: 'primary', zoneId: 'cinderfall_depths', requiredLevel: 52 },
  { id: 'firebloom', name: 'Firebloom', type: 'primary', zoneId: 'cinderfall_depths', requiredLevel: 58 },
  { id: 'sungrass', name: 'Sungrass', type: 'primary', zoneId: 'cinderfall_depths', requiredLevel: 64 },

  { id: 'blindweed', name: 'Blindweed', type: 'primary', zoneId: 'molten_scar', requiredLevel: 69 },
  { id: 'ghost_mushroom', name: 'Ghost Mushroom', type: 'primary', zoneId: 'molten_scar', requiredLevel: 75 },
  { id: 'gromsblood', name: 'Gromsblood', type: 'primary', zoneId: 'molten_scar', requiredLevel: 81 },

  { id: 'dreamfoil', name: 'Dreamfoil', type: 'primary', zoneId: 'cinderheart_crater', requiredLevel: 86 },
  { id: 'mountain_silversage', name: 'Mountain Silversage', type: 'primary', zoneId: 'cinderheart_crater', requiredLevel: 92 },
  { id: 'black_lotus', name: 'Black Lotus', type: 'primary', zoneId: 'cinderheart_crater', requiredLevel: 98 },
];

// Bonus herb home zone = the HIGHER-required-level source herb's zone (the
// rarer/later-game source) — explicit per the design brief's own
// requirement, never inferred from whichever node actually produced it.
export const BONUS_HERBS: BonusHerbDef[] = [
  { id: 'swiftthistle', name: 'Swiftthistle', type: 'bonus', zoneId: 'stonecrag_foothills', sourceHerbIds: ['mageroyal', 'briarthorn'], dropChance: 0.12 },
  { id: 'grave_moss', name: 'Grave Moss', type: 'bonus', zoneId: 'emberfall_ridge', sourceHerbIds: ['bruiseweed', 'kingsblood'], dropChance: 0.08 },
  { id: 'stranglekelp', name: 'Stranglekelp', type: 'bonus', zoneId: 'emberfall_ridge', sourceHerbIds: ['liferoot'], dropChance: 0.10 },
  { id: 'fadeleaf', name: 'Fadeleaf', type: 'bonus', zoneId: 'cinderfall_depths', sourceHerbIds: ['goldthorn', 'khadgars_whisker'], dropChance: 0.08 },
  { id: 'purple_lotus', name: 'Purple Lotus', type: 'bonus', zoneId: 'molten_scar', sourceHerbIds: ['sungrass', 'blindweed'], dropChance: 0.07 },
  { id: 'arthas_tears', name: "Arthas' Tears", type: 'bonus', zoneId: 'molten_scar', sourceHerbIds: ['ghost_mushroom', 'gromsblood'], dropChance: 0.06 },
  { id: 'plaguebloom', name: 'Plaguebloom', type: 'bonus', zoneId: 'cinderheart_crater', sourceHerbIds: ['dreamfoil', 'mountain_silversage'], dropChance: 0.05 },
];

export const HERBS: Record<string, HerbDef> = Object.fromEntries(
  [...PRIMARY_HERBS, ...BONUS_HERBS].map((h) => [h.id, h])
);

export function getHerb(id: string): HerbDef | undefined {
  return HERBS[id];
}

// The one lookup every Alchemy-Mastery-crediting call site needs — resolves
// to undefined for a non-herb material (e.g. a bar, a bonus-only drop with
// no assigned zone would be a bug), so callers can safely skip crediting
// mastery for materials that aren't herbs at all.
export function herbZoneOf(itemId: string): string | undefined {
  return HERBS[itemId]?.zoneId;
}

// Which bonus herbs can roll off a successful harvest of this primary herb,
// with their drop chance — used by the gathering resolver.
export function bonusHerbsFor(primaryHerbId: string): { itemId: string; chance: number }[] {
  return BONUS_HERBS.filter((b) => b.sourceHerbIds.includes(primaryHerbId)).map((b) => ({ itemId: b.id, chance: b.dropChance }));
}

export function zoneTierOf(zoneId: string): number {
  return ZONE_TIER[zoneId] ?? 1;
}

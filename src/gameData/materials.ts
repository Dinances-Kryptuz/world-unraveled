// The registry every dynamic material-Mastery system (achievements, titles,
// the Blacksmithing Mastery UI panel, equipmentRolls.ts's stat-roll ranges)
// iterates over — the SINGLE source of truth for which materials exist.
// Nothing outside this file names a specific material id in a conditional;
// adding a new tier here is the only step needed for it to get its own
// Mastery track, "Master of [name]" achievement/title, and UI row. Mirrors
// components/professions/ProfessionScreen.tsx's SMITHING_TIER_ORDER, which
// already treats these exact 10 slugs as Blacksmithing's material tiers.
export interface MaterialDef {
  id: string;
  // Used verbatim in "Master of {name}" (see gameData/titles.ts) — keep it
  // a bare material name (no "Jewelry"/tier-number suffix) so the title
  // reads the same way for every material, metal or jewelry alike.
  name: string;
  // The bar/ingot item a crafting recipe's materials list is checked
  // against to compute this material's Mastery XP per craft (bars required
  // × MASTERY_XP_PER_BAR — see equipmentRolls.ts). Recipes declare which
  // material they belong to explicitly via Recipe.materialId rather than
  // this being inferred from materials[0], so barItemId is documentation/
  // the Mastery-XP lookup key, not itself the linkage mechanism.
  barItemId: string;
}

export const MATERIALS: MaterialDef[] = [
  { id: 'copper', name: 'Copper', barItemId: 'copper_bar' },
  { id: 'bronze', name: 'Bronze', barItemId: 'bronze_bar' },
  { id: 'iron', name: 'Iron', barItemId: 'iron_bar' },
  { id: 'steel', name: 'Steel', barItemId: 'steel_bar' },
  { id: 'mithril', name: 'Mithril', barItemId: 'mithril_bar' },
  { id: 'thorium', name: 'Thorium', barItemId: 'thorium_bar' },
  { id: 'obsidian', name: 'Obsidian', barItemId: 'obsidian_bar' },
  { id: 'silver', name: 'Silver', barItemId: 'silver_bar' },
  { id: 'gold', name: 'Gold', barItemId: 'gold_bar' },
  { id: 'platinum', name: 'Platinum', barItemId: 'platinum_bar' },
];

// Leatherworking's own material registry — kept SEPARATE from MATERIALS
// (not appended to it) so Blacksmithing-only generators that read MATERIALS
// directly (SMITHING_TIER_ORDER/JEWELRY_MATERIAL_IDS in ProfessionScreen.tsx,
// MASTER_BLACKSMITH_ACHIEVEMENT in achievements.ts, the Blacksmith-mastery
// check in firebase/character.ts) never pick up leather tiers. Leatherworking
// gets its own parallel generators (generateLeatherMasteryAchievements,
// generateLeatherMaterialTitles, MASTER_LEATHERWORKER_ACHIEVEMENT) over this
// array instead — same pattern, different registry. barItemId points at
// each tier's primary leather item (items.ts); id slugs match the user's
// exact "Master of {name}" title wording.
export const LEATHER_MATERIALS: MaterialDef[] = [
  { id: 'light_leather', name: 'Light Leather', barItemId: 'skinned_light_leather' },
  { id: 'medium_leather', name: 'Medium Leather', barItemId: 'medium_leather' },
  { id: 'heavy_leather', name: 'Heavy Leather', barItemId: 'heavy_leather' },
  { id: 'thick_leather', name: 'Thick Leather', barItemId: 'thick_leather' },
  { id: 'rugged_leather', name: 'Rugged Leather', barItemId: 'rugged_leather' },
  { id: 'emberscar_leather', name: 'Emberscar Leather', barItemId: 'emberscar_leather' },
];

// Tailoring's own material registry — same separate-array pattern as
// LEATHER_MATERIALS above. name fields match the Tailoring overhaul's own
// "Completion title" table verbatim (most are the bare material name;
// Ember Cloth keeps "Cloth" since that's the material's actual full name).
export const CLOTH_MATERIALS: MaterialDef[] = [
  { id: 'linen_cloth', name: 'Linen', barItemId: 'linen_cloth' },
  { id: 'wool_cloth', name: 'Wool', barItemId: 'wool_cloth' },
  { id: 'silk_cloth', name: 'Silk', barItemId: 'silk_cloth' },
  { id: 'mageweave_cloth', name: 'Mageweave', barItemId: 'mageweave_cloth' },
  { id: 'runecloth', name: 'Runecloth', barItemId: 'runecloth' },
  { id: 'ember_cloth', name: 'Ember Cloth', barItemId: 'ember_cloth' },
];

// Enchanting overhaul's own material registry — ONE combined Mastery track
// per zone, shared by that zone's Wand/Staff/Book recipes (not three
// separate tracks), same "feeds one bar, no per-piece bar" posture as
// CLOTH_MATERIALS' capes. barItemId points at the zone's own magic Wood
// (items.ts, vendor-only — see vendors.ts — never monster-dropped and with
// no Woodcutting profession, per the design brief). Displayed in the UI as
// "Enchanted Armaments I"-"V" / "Ember Armaments" rather than "{name}
// Mastery" (see ProfessionScreen.tsx's ENCHANTING_ARMAMENTS_LABELS) — name
// here stays a bare wood name so "Master of {name}" titles/achievements
// read naturally like every other material's.
export const WOOD_MATERIALS: MaterialDef[] = [
  { id: 'rough_wood', name: 'Rough Wood', barItemId: 'rough_wood' },
  { id: 'aged_wood', name: 'Aged Wood', barItemId: 'aged_wood' },
  { id: 'heartwood', name: 'Heartwood', barItemId: 'heartwood' },
  { id: 'ironwood', name: 'Ironwood', barItemId: 'ironwood' },
  { id: 'charwood', name: 'Charwood', barItemId: 'charwood' },
  { id: 'emberwood', name: 'Emberwood', barItemId: 'emberwood' },
];

const MATERIALS_BY_ID: Record<string, MaterialDef> = Object.fromEntries(
  [...MATERIALS, ...LEATHER_MATERIALS, ...CLOTH_MATERIALS, ...WOOD_MATERIALS].map((m) => [m.id, m])
);

// Resolves across ALL registries — CraftingScreen.tsx calls this generically
// for any recipe.materialId regardless of profession, so Leatherworking/
// Tailoring recipes need to resolve here too or their Mastery wiring would
// silently never build (see MaterialMasteryInput construction in
// CraftingScreen.tsx).
export function getMaterial(materialId: string): MaterialDef | undefined {
  return MATERIALS_BY_ID[materialId];
}

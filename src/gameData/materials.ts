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

const MATERIALS_BY_ID: Record<string, MaterialDef> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

export function getMaterial(materialId: string): MaterialDef | undefined {
  return MATERIALS_BY_ID[materialId];
}

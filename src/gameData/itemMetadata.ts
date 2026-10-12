// Inventory sorting/filtering overhaul — resolves an equipment item id back
// to its crafting material/tier, for the "Material / Equipment Tier" sort
// and filter options. Built once at module load from the existing
// Recipe.materialId field (gameData/recipes.ts) rather than adding a new
// materialId field directly on ItemDef — a recipe's resultItemId is already
// the single source of truth linking an item to the material it's made
// from (see materials.ts's getMaterial), so this is purely a reverse index
// over data that already exists, not new authored data.
import { RECIPES } from './recipes';
import { MATERIALS, LEATHER_MATERIALS, CLOTH_MATERIALS, WOOD_MATERIALS, getMaterial } from './materials';

const ITEM_ID_TO_MATERIAL_ID: Record<string, string> = {};
for (const recipe of Object.values(RECIPES)) {
  if (recipe.materialId) ITEM_ID_TO_MATERIAL_ID[recipe.resultItemId] = recipe.materialId;
}

export function materialIdForItem(itemId: string): string | undefined {
  return ITEM_ID_TO_MATERIAL_ID[itemId];
}

export function materialNameForItem(itemId: string): string | undefined {
  const materialId = materialIdForItem(itemId);
  return materialId ? getMaterial(materialId)?.name : undefined;
}

// Combined tier ordering across every profession's material registry, used
// only to rank "Material / Equipment Tier" sort consistently (earliest/
// lowest tier first) — matches each registry's own authored zone-
// progression order (materials.ts's module comment). An item with no
// resolvable material (anything not crafted via a materialId recipe — e.g.
// a monster-drop/quest/damaged item) sorts after every tiered item, not
// before, so untiered gear doesn't crowd the top of a tier-sorted list.
const MATERIAL_TIER_ORDER: string[] = [...MATERIALS, ...LEATHER_MATERIALS, ...CLOTH_MATERIALS, ...WOOD_MATERIALS].map(
  (m) => m.id
);

export function materialTierRank(itemId: string): number {
  const materialId = materialIdForItem(itemId);
  if (!materialId) return MATERIAL_TIER_ORDER.length;
  const idx = MATERIAL_TIER_ORDER.indexOf(materialId);
  return idx === -1 ? MATERIAL_TIER_ORDER.length : idx;
}

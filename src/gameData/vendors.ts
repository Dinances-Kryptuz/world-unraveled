// Zone-scoped vendor stock — items purchasable for gold, distinct from the
// Shop's universal "sell anything" flow. Keyed by zoneId so a vendor's
// goods are only available while browsing that zone (e.g. Simple Thread
// is a Greenhollow Fields good, not something you can buy while out in
// Stonecrag Foothills).

export interface VendorStockEntry {
  itemId: string;
  price: number;
  // Absent means gold, the overwhelmingly common case — only Cinderheart
  // Crater's Void Vendor (below) sells for Void Shards, the endgame
  // currency earned from that zone's monsters and its dungeon boss.
  currency?: 'gold' | 'voidShards';
}

export const VENDOR_STOCK: Record<string, VendorStockEntry[]> = {
  greenhollow_fields: [
    // Tailoring overhaul — thread is deliberately CUMULATIVE (unlike the
    // tool lines below, which are zone-exclusive): a higher-zone vendor
    // keeps selling every earlier thread tier too, per the design brief's
    // explicit "higher-zone vendors should also sell previously unlocked
    // thread" call. simple_thread (the old, single pre-overhaul thread) is
    // frozen, not sold here anymore.
    { itemId: 'coarse_thread', price: 2 },
    // Enchanting overhaul — magic Wood, same CUMULATIVE-per-zone posture as
    // thread above: never monster-dropped, no Woodcutting profession, sold
    // only by vendors (see items.ts's "Enchanting overhaul's magic Wood"
    // section and materials.ts's WOOD_MATERIALS).
    { itemId: 'rough_wood', price: 3 },
    { itemId: 'health_potion', price: 10 },
    { itemId: 'bread', price: 5 },
    { itemId: 'orange_juice', price: 6 },
    { itemId: 'rusty_mining_pick', price: 5 },
    { itemId: 'worn_skinning_knife', price: 5 },
    { itemId: 'simple_fishing_rod', price: 5 },
  ],
  stonecrag_foothills: [
    { itemId: 'coarse_thread', price: 2 },
    { itemId: 'fine_thread', price: 5 },
    { itemId: 'rough_wood', price: 3 },
    { itemId: 'aged_wood', price: 8 },
    { itemId: 'sturdy_mining_pick', price: 15 },
    { itemId: 'honed_skinning_knife', price: 15 },
    { itemId: 'reinforced_fishing_rod', price: 15 },
  ],
  emberfall_ridge: [
    { itemId: 'coarse_thread', price: 2 },
    { itemId: 'fine_thread', price: 5 },
    { itemId: 'silken_thread', price: 10 },
    { itemId: 'rough_wood', price: 3 },
    { itemId: 'aged_wood', price: 8 },
    { itemId: 'heartwood', price: 16 },
    { itemId: 'embertempered_pick', price: 35 },
    { itemId: 'embertempered_skinning_knife', price: 35 },
    { itemId: 'embercured_fishing_rod', price: 35 },
  ],
  cinderfall_depths: [
    { itemId: 'coarse_thread', price: 2 },
    { itemId: 'fine_thread', price: 5 },
    { itemId: 'silken_thread', price: 10 },
    { itemId: 'heavy_silken_thread', price: 18 },
    { itemId: 'rough_wood', price: 3 },
    { itemId: 'aged_wood', price: 8 },
    { itemId: 'heartwood', price: 16 },
    { itemId: 'ironwood', price: 28 },
    { itemId: 'dwarven_mining_pick', price: 70 },
    { itemId: 'dwarven_skinning_knife', price: 70 },
    { itemId: 'dwarven_fishing_rod', price: 70 },
  ],
  molten_scar: [
    { itemId: 'coarse_thread', price: 2 },
    { itemId: 'fine_thread', price: 5 },
    { itemId: 'silken_thread', price: 10 },
    { itemId: 'heavy_silken_thread', price: 18 },
    { itemId: 'rune_thread', price: 30 },
    { itemId: 'rough_wood', price: 3 },
    { itemId: 'aged_wood', price: 8 },
    { itemId: 'heartwood', price: 16 },
    { itemId: 'ironwood', price: 28 },
    { itemId: 'charwood', price: 45 },
    { itemId: 'brimstone_pick', price: 120 },
    { itemId: 'brimstone_skinning_knife', price: 120 },
    { itemId: 'brimstone_fishing_rod', price: 120 },
    // High-tier finished consumables for sale — most recipes in this game
    // are skill-gated rather than item-taught (see Recipe.learnedAutomatically),
    // so a "recipe vendor" here sells the end product rather than a
    // formula; formula_emberforged_gauntlets (The Lost Forge quest chain)
    // is the one recipe that genuinely needs to be taught by an item.
    { itemId: 'draught_of_resistance', price: 40 },
    { itemId: 'magma_darter_skewers', price: 35 },
  ],
  cinderheart_crater: [
    { itemId: 'coarse_thread', price: 2 },
    { itemId: 'fine_thread', price: 5 },
    { itemId: 'silken_thread', price: 10 },
    { itemId: 'heavy_silken_thread', price: 18 },
    { itemId: 'rune_thread', price: 30 },
    { itemId: 'ember_thread', price: 45 },
    { itemId: 'rough_wood', price: 3 },
    { itemId: 'aged_wood', price: 8 },
    { itemId: 'heartwood', price: 16 },
    { itemId: 'ironwood', price: 28 },
    { itemId: 'charwood', price: 45 },
    { itemId: 'emberwood', price: 65 },
    { itemId: 'emberforged_pick', price: 180 },
    { itemId: 'emberforged_skinning_knife', price: 180 },
    { itemId: 'emberforged_fishing_rod', price: 180 },
    { itemId: 'greater_battle_draught', price: 70 },
    { itemId: 'greater_stoneskin_draught', price: 70 },
    { itemId: 'emberheart_feast', price: 60 },
    // The Void Vendor — Cinderheart Crater's endgame currency sink. Void
    // Shards drop from this zone's own monsters and its dungeon boss
    // (Pyraxis), so this gear is a capstone a character earns by staying
    // and farming the final zone, not something bought in passing.
    { itemId: 'voidforged_warblade', price: 40, currency: 'voidShards' },
    { itemId: 'voidforged_scepter', price: 40, currency: 'voidShards' },
    { itemId: 'voidforged_chestguard', price: 35, currency: 'voidShards' },
    { itemId: 'voidforged_vestments', price: 35, currency: 'voidShards' },
    { itemId: 'voidforged_signet', price: 25, currency: 'voidShards' },
  ],
};

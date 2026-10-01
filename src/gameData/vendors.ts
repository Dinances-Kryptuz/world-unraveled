// Zone-scoped vendor stock — items purchasable for gold, distinct from the
// Shop's universal "sell anything" flow. Keyed by zoneId so a vendor's
// goods are only available while browsing that zone (e.g. Simple Thread
// is a Greenhollow Fields good, not something you can buy while out in
// Stonecrag Foothills).

export interface VendorStockEntry {
  itemId: string;
  price: number;
}

export const VENDOR_STOCK: Record<string, VendorStockEntry[]> = {
  greenhollow_fields: [
    { itemId: 'simple_thread', price: 2 },
    { itemId: 'health_potion', price: 10 },
    { itemId: 'bread', price: 5 },
    { itemId: 'orange_juice', price: 6 },
    { itemId: 'rusty_mining_pick', price: 5 },
    { itemId: 'worn_skinning_knife', price: 5 },
    { itemId: 'simple_fishing_rod', price: 5 },
  ],
  stonecrag_foothills: [
    { itemId: 'sturdy_mining_pick', price: 15 },
    { itemId: 'honed_skinning_knife', price: 15 },
    { itemId: 'reinforced_fishing_rod', price: 15 },
  ],
  emberfall_ridge: [
    { itemId: 'embertempered_pick', price: 35 },
    { itemId: 'embertempered_skinning_knife', price: 35 },
    { itemId: 'embercured_fishing_rod', price: 35 },
  ],
  cinderfall_depths: [
    { itemId: 'dwarven_mining_pick', price: 70 },
    { itemId: 'dwarven_skinning_knife', price: 70 },
    { itemId: 'dwarven_fishing_rod', price: 70 },
  ],
  molten_scar: [
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
    { itemId: 'emberforged_pick', price: 180 },
    { itemId: 'emberforged_skinning_knife', price: 180 },
    { itemId: 'emberforged_fishing_rod', price: 180 },
    { itemId: 'greater_battle_draught', price: 70 },
    { itemId: 'greater_stoneskin_draught', price: 70 },
    { itemId: 'emberheart_feast', price: 60 },
  ],
};

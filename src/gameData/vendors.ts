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
  ],
  cinderheart_crater: [
    { itemId: 'emberforged_pick', price: 180 },
    { itemId: 'emberforged_skinning_knife', price: 180 },
    { itemId: 'emberforged_fishing_rod', price: 180 },
  ],
};

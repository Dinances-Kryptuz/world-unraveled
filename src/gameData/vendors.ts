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
  ],
};

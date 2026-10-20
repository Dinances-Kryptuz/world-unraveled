import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { sellItem, sellEquipmentInstance, sellChargedConsumable, buyItem, buyBagSlot } from '../firebase/vendor';
import { subscribeToInventory, isLocked } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import { VENDOR_STOCK, type VendorStockEntry } from '../gameData/vendors';
import { shopkeeperMaxBagSlots, nextShopkeeperSlotCost } from '../gameData/bagSlotShop';
import { ItemSlot } from './ItemSlot';
import type { Inventory } from '../types/character';
import type { BaseStat } from '../gameData/classStats';
import type { ItemDef } from '../gameData/types';

// One row per sellable "thing" the player holds, regardless of which of
// the three inventory buckets it actually lives in (items/
// equipmentInstances/chargedConsumables) — see buildSellableEntries below
// for why all three need to show up here, not just `items`.
interface SellableEntry {
  key: string;
  item: ItemDef;
  quantity: number;
  statOverride?: Partial<Record<BaseStat, number>>;
  remainingCharges?: number;
  locked: boolean;
  sell: (uid: string, quantity: number) => Promise<void>;
}

// `inventory.items` was the ONLY bucket this screen ever looked at for
// selling — but randomized-stat equipment (every piece of gear a player
// actually wears, since the Equipment Rarity overhaul) lives in
// equipmentInstances, and charge-distinguished potion stacks live in
// chargedConsumables; neither bucket was ever reachable from the Sell
// list, so no armor/weapon could be sold at all. This combines all three
// into one list so every owned item shows up here exactly once.
function buildSellableEntries(inventory: Inventory): SellableEntry[] {
  const entries: SellableEntry[] = [];
  for (const [itemId, quantity] of Object.entries(inventory.items)) {
    if (quantity <= 0) continue;
    const item = ITEMS[itemId];
    if (!item) continue;
    entries.push({ key: itemId, item, quantity, locked: isLocked(inventory, itemId), sell: (uid, q) => sellItem(uid, itemId, q) });
  }
  for (const [instanceId, instance] of Object.entries(inventory.equipmentInstances ?? {})) {
    if (instance.quantity <= 0) continue;
    const item = ITEMS[instance.itemId];
    if (!item) continue;
    entries.push({
      key: instanceId,
      item,
      quantity: instance.quantity,
      statOverride: instance.rolls,
      locked: isLocked(inventory, instanceId),
      sell: (uid, q) => sellEquipmentInstance(uid, instanceId, q),
    });
  }
  for (const [instanceId, bucket] of Object.entries(inventory.chargedConsumables ?? {})) {
    if (bucket.quantity <= 0) continue;
    const item = ITEMS[bucket.itemId];
    if (!item) continue;
    entries.push({
      key: instanceId,
      item,
      quantity: bucket.quantity,
      remainingCharges: bucket.remainingCharges,
      locked: isLocked(inventory, instanceId),
      sell: (uid, q) => sellChargedConsumable(uid, instanceId, q),
    });
  }
  return entries;
}

function parseQuantity(raw: string | undefined, max: number): number {
  const parsed = parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, max);
}

// `stockOverride` is the Grand Market's aggregated cross-zone list
// (gameData/vendors.ts's grandMarketStock) — passed by CapitalScreen
// instead of the plain per-zone VENDOR_STOCK lookup. Without it, the
// per-zone Shopkeeper (Sidebar's standalone 'shop' section) only ever
// shows zoneId's own stock — and since Ashenfall itself has no
// VENDOR_STOCK entry, standing there and opening Shopkeeper shows a
// redirect to the Grand Market instead of an empty Buy list.
export function VendorScreen({
  zoneId,
  stockOverride,
  title = 'Shopkeeper',
}: {
  zoneId: string;
  stockOverride?: VendorStockEntry[];
  title?: string;
}) {
  const { user } = useAuth();
  const { character, refetch, applyOptimisticUpdate } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selling, setSelling] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyQty, setBuyQty] = useState<Record<string, string>>({});
  const [sellQty, setSellQty] = useState<Record<string, string>>({});
  const [buyingSlot, setBuyingSlot] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!inventory || !character) return null;

  if (!stockOverride && zoneId === 'ashenfall') {
    return (
      <div className="vendor-screen">
        <h2>{title}</h2>
        <p>There's no shopkeeper out here in the streets — visit the Grand Market.</p>
      </div>
    );
  }

  const sellableEntries = buildSellableEntries(inventory);
  const stock = stockOverride ?? (VENDOR_STOCK[zoneId] ?? []);

  async function handleSell(entry: SellableEntry, quantity: number) {
    if (!user || quantity <= 0) return;
    setSelling(entry.key);
    const unitValue = entry.item.sellValue;
    applyOptimisticUpdate((c) => ({ ...c, gold: c.gold + unitValue * quantity }));
    try {
      await entry.sell(user.uid, quantity);
      await refetch();
    } finally {
      setSelling(null);
    }
  }

  async function handleBuy(itemId: string, price: number, quantity: number, currency: 'gold' | 'voidShards') {
    if (!user || quantity <= 0) return;
    setBuying(itemId);
    applyOptimisticUpdate((c) => ({ ...c, [currency]: c[currency] - price * quantity }));
    try {
      const result = await buyItem(user.uid, itemId, quantity, price, currency);
      if (!result.success) {
        // Refused (not enough currency) or refunded (bag was full) —
        // either way nothing was actually spent, so undo the optimistic
        // deduction above rather than leaving the displayed balance wrong
        // until the next refetch.
        applyOptimisticUpdate((c) => ({ ...c, [currency]: c[currency] + price * quantity }));
      }
      await refetch();
    } finally {
      setBuying(null);
    }
  }

  const slotsPurchased = character.shopkeeperBagSlotsPurchased ?? 0;
  const maxSlots = shopkeeperMaxBagSlots(character.level);
  const nextSlotCost = nextShopkeeperSlotCost(slotsPurchased);
  const canBuySlot = slotsPurchased < maxSlots && character.gold >= nextSlotCost;

  async function handleBuySlot() {
    if (!user || !canBuySlot) return;
    setBuyingSlot(true);
    applyOptimisticUpdate((c) => ({
      ...c,
      gold: c.gold - nextSlotCost,
      bagSlots: c.bagSlots + 1,
      shopkeeperBagSlotsPurchased: (c.shopkeeperBagSlotsPurchased ?? 0) + 1,
    }));
    try {
      await buyBagSlot(user.uid);
      await refetch();
    } finally {
      setBuyingSlot(false);
    }
  }

  return (
    <div className="vendor-screen">
      <h2>{title}</h2>

      {stock.length > 0 && (
        <>
          <h3>Buy</h3>
          <ul>
            {stock.map(({ itemId, price, currency = 'gold' }) => {
              const item = ITEMS[itemId];
              const isBusy = buying === itemId;
              const qty = parseQuantity(buyQty[itemId], Infinity);
              const label = currency === 'voidShards' ? 'Void Shards' : 'gold';
              const balance = character[currency];
              const canAffordOne = balance >= price;
              const canAffordQty = balance >= price * qty;
              return (
                <li key={itemId}>
                  <div className="item-row-main">
                    {item ? <ItemSlot item={item} /> : null}
                    <span>
                      {price} {label} each
                    </span>
                  </div>
                  <button onClick={() => handleBuy(itemId, price, 1, currency)} disabled={isBusy || !canAffordOne}>
                    Buy 1
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={buyQty[itemId] ?? ''}
                    placeholder="qty"
                    onChange={(e) => setBuyQty((q) => ({ ...q, [itemId]: e.target.value }))}
                  />
                  <button onClick={() => handleBuy(itemId, price, qty, currency)} disabled={isBusy || !canAffordQty}>
                    Buy X ({price * qty} {label})
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>Bag Slots</h3>
      <p>
        {character.bagSlots} slots total — bought {slotsPurchased} / {maxSlots} available here (8 per zone you've
        unlocked).
      </p>
      {slotsPurchased >= maxSlots ? (
        <p>Unlock another zone to buy more bag slots here.</p>
      ) : (
        <button onClick={handleBuySlot} disabled={buyingSlot || character.gold < nextSlotCost}>
          Buy 1 Slot ({nextSlotCost.toLocaleString()} gold)
        </button>
      )}

      <h3>Sell</h3>
      <p>Sell unwanted items for gold.</p>
      {sellableEntries.length === 0 ? (
        <p>Nothing to sell.</p>
      ) : (
        <ul>
          {sellableEntries.map((entry) => {
            const { key, item, quantity, locked } = entry;
            const unitValue = item.sellValue;
            const isBusy = selling === key;
            const qty = parseQuantity(sellQty[key], quantity);
            return (
              <li key={key}>
                <div className="item-row-main">
                  <ItemSlot
                    item={item}
                    quantity={quantity}
                    statOverride={entry.statOverride}
                    remainingCharges={entry.remainingCharges}
                    locked={locked}
                  />
                  <span>{unitValue} gold each</span>
                </div>
                {locked ? (
                  <small>Locked — unlock it in Inventory to sell.</small>
                ) : (
                  <>
                    <button onClick={() => handleSell(entry, 1)} disabled={isBusy}>
                      Sell 1
                    </button>
                    <button onClick={() => handleSell(entry, quantity)} disabled={isBusy}>
                      Sell All ({quantity * unitValue} gold)
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={quantity}
                      value={sellQty[key] ?? ''}
                      placeholder="qty"
                      onChange={(e) => setSellQty((q) => ({ ...q, [key]: e.target.value }))}
                    />
                    <button onClick={() => handleSell(entry, qty)} disabled={isBusy}>
                      Sell X ({qty * unitValue} gold)
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
  const [buyingSlot, setBuyingSlot] = useState(false);
  // Click-a-tile-to-open-a-slider overhaul — one item selected at a time
  // per side (Buy/Sell), so the grid itself stays compact (just icons, like
  // Inventory's) instead of every row carrying its own always-visible
  // input + three buttons. Quantity resets to 1 on every new selection.
  const [selectedBuyItemId, setSelectedBuyItemId] = useState<string | null>(null);
  const [selectedSellKey, setSelectedSellKey] = useState<string | null>(null);
  const [buyQty, setBuyQty] = useState(1);
  const [sellQty, setSellQty] = useState(1);

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
      setSelectedSellKey(null);
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
      setSelectedBuyItemId(null);
    } finally {
      setBuying(null);
    }
  }

  function selectBuyItem(itemId: string) {
    setSelectedBuyItemId((prev) => (prev === itemId ? null : itemId));
    setBuyQty(1);
  }

  function selectSellEntry(entry: SellableEntry) {
    if (entry.locked) return;
    setSelectedSellKey((prev) => (prev === entry.key ? null : entry.key));
    setSellQty(1);
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
          <div className="inventory-grid">
            {stock.map(({ itemId, price, currency = 'gold' }) => {
              const item = ITEMS[itemId];
              if (!item) return null;
              const balance = character[currency];
              return (
                <ItemSlot
                  key={itemId}
                  item={item}
                  highlight={selectedBuyItemId === itemId}
                  disabled={balance < price}
                  onClick={() => selectBuyItem(itemId)}
                />
              );
            })}
          </div>
          {selectedBuyItemId &&
            (() => {
              const entry = stock.find((s) => s.itemId === selectedBuyItemId);
              const item = entry ? ITEMS[entry.itemId] : undefined;
              if (!entry || !item) return null;
              const { price, currency = 'gold' } = entry;
              const label = currency === 'voidShards' ? 'Void Shards' : 'gold';
              const balance = character[currency];
              const maxAffordable = Math.max(1, Math.floor(balance / price));
              const isBusy = buying === item.id;
              const canAfford = balance >= price * buyQty;
              return (
                <div className="vendor-trade-panel">
                  <div className="item-row-main">
                    <ItemSlot item={item} />
                    <span>
                      {item.name} — {price.toLocaleString()} {label} each
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={maxAffordable}
                    value={Math.min(buyQty, maxAffordable)}
                    disabled={maxAffordable <= 1}
                    onChange={(e) => setBuyQty(Number(e.target.value))}
                  />
                  <span>{buyQty}</span>
                  <button onClick={() => handleBuy(item.id, price, buyQty, currency)} disabled={isBusy || !canAfford}>
                    Buy {buyQty} ({(price * buyQty).toLocaleString()} {label})
                  </button>
                  <button onClick={() => setSelectedBuyItemId(null)}>Cancel</button>
                  {!canAfford && (
                    <p>
                      <small>Not enough {label.toLowerCase()} for {buyQty}.</small>
                    </p>
                  )}
                </div>
              );
            })()}
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
      <p>Sell unwanted items for gold. Click an item to choose how many.</p>
      {sellableEntries.length === 0 ? (
        <p>Nothing to sell.</p>
      ) : (
        <>
          <div className="inventory-grid">
            {sellableEntries.map((entry) => (
              <ItemSlot
                key={entry.key}
                item={entry.item}
                quantity={entry.quantity}
                statOverride={entry.statOverride}
                remainingCharges={entry.remainingCharges}
                locked={entry.locked}
                highlight={selectedSellKey === entry.key}
                disabled={entry.locked}
                onClick={() => selectSellEntry(entry)}
              />
            ))}
          </div>
          {selectedSellKey &&
            (() => {
              const entry = sellableEntries.find((e) => e.key === selectedSellKey);
              if (!entry) return null;
              const { item, quantity } = entry;
              const unitValue = item.sellValue;
              const isBusy = selling === entry.key;
              const qty = Math.min(sellQty, quantity);
              return (
                <div className="vendor-trade-panel">
                  <div className="item-row-main">
                    <ItemSlot item={item} statOverride={entry.statOverride} remainingCharges={entry.remainingCharges} />
                    <span>
                      {item.name} — {unitValue} gold each ({quantity} owned)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={quantity}
                    value={qty}
                    disabled={quantity <= 1}
                    onChange={(e) => setSellQty(Number(e.target.value))}
                  />
                  <span>{qty}</span>
                  <button onClick={() => handleSell(entry, qty)} disabled={isBusy}>
                    Sell {qty} ({(qty * unitValue).toLocaleString()} gold)
                  </button>
                  <button onClick={() => handleSell(entry, quantity)} disabled={isBusy}>
                    Sell All ({(quantity * unitValue).toLocaleString()} gold)
                  </button>
                  <button onClick={() => setSelectedSellKey(null)}>Cancel</button>
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}

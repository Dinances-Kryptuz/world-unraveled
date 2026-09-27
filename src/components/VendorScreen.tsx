import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { sellItem, buyItem } from '../firebase/vendor';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import { VENDOR_STOCK } from '../gameData/vendors';
import type { Inventory } from '../types/character';

function parseQuantity(raw: string | undefined, max: number): number {
  const parsed = parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, max);
}

export function VendorScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch, applyOptimisticUpdate } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selling, setSelling] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyQty, setBuyQty] = useState<Record<string, string>>({});
  const [sellQty, setSellQty] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!inventory || !character) return null;

  const sellableEntries = Object.entries(inventory.items).filter(([, quantity]) => quantity > 0);
  const stock = VENDOR_STOCK[zoneId] ?? [];

  async function handleSell(itemId: string, quantity: number, unitValue: number) {
    if (!user || quantity <= 0) return;
    setSelling(itemId);
    applyOptimisticUpdate((c) => ({ ...c, gold: c.gold + unitValue * quantity }));
    try {
      await sellItem(user.uid, itemId, quantity);
      await refetch();
    } finally {
      setSelling(null);
    }
  }

  async function handleBuy(itemId: string, price: number, quantity: number) {
    if (!user || quantity <= 0) return;
    setBuying(itemId);
    applyOptimisticUpdate((c) => ({ ...c, gold: c.gold - price * quantity }));
    try {
      await buyItem(user.uid, itemId, quantity, price);
      await refetch();
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="vendor-screen">
      <h2>Shop</h2>

      {stock.length > 0 && (
        <>
          <h3>Buy</h3>
          <ul>
            {stock.map(({ itemId, price }) => {
              const item = ITEMS[itemId];
              const isBusy = buying === itemId;
              const qty = parseQuantity(buyQty[itemId], Infinity);
              const canAffordOne = character.gold >= price;
              const canAffordQty = character.gold >= price * qty;
              return (
                <li key={itemId}>
                  {item?.name ?? itemId} ({price} gold each)
                  <button onClick={() => handleBuy(itemId, price, 1)} disabled={isBusy || !canAffordOne}>
                    Buy 1
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={buyQty[itemId] ?? ''}
                    placeholder="qty"
                    onChange={(e) => setBuyQty((q) => ({ ...q, [itemId]: e.target.value }))}
                  />
                  <button onClick={() => handleBuy(itemId, price, qty)} disabled={isBusy || !canAffordQty}>
                    Buy X ({price * qty} gold)
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>Sell</h3>
      <p>Sell unwanted items for gold.</p>
      {sellableEntries.length === 0 ? (
        <p>Nothing to sell.</p>
      ) : (
        <ul>
          {sellableEntries.map(([itemId, quantity]) => {
            const item = ITEMS[itemId];
            const name = item?.name ?? itemId;
            const unitValue = item?.sellValue ?? 0;
            const isBusy = selling === itemId;
            const qty = parseQuantity(sellQty[itemId], quantity);
            return (
              <li key={itemId}>
                {name} x{quantity} ({unitValue} gold each)
                <button onClick={() => handleSell(itemId, 1, unitValue)} disabled={isBusy}>
                  Sell 1
                </button>
                <button onClick={() => handleSell(itemId, quantity, unitValue)} disabled={isBusy}>
                  Sell All ({quantity * unitValue} gold)
                </button>
                <input
                  type="number"
                  min={1}
                  max={quantity}
                  value={sellQty[itemId] ?? ''}
                  placeholder="qty"
                  onChange={(e) => setSellQty((q) => ({ ...q, [itemId]: e.target.value }))}
                />
                <button onClick={() => handleSell(itemId, qty, unitValue)} disabled={isBusy}>
                  Sell X ({qty * unitValue} gold)
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

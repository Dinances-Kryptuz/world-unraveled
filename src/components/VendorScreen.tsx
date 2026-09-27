import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { sellItem, buyItem } from '../firebase/vendor';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import { VENDOR_STOCK } from '../gameData/vendors';
import type { Inventory } from '../types/character';

export function VendorScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selling, setSelling] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!inventory || !character) return null;

  const sellableEntries = Object.entries(inventory.items).filter(([, quantity]) => quantity > 0);
  const stock = VENDOR_STOCK[zoneId] ?? [];

  async function handleSell(itemId: string, quantity: number) {
    if (!user) return;
    setSelling(itemId);
    try {
      await sellItem(user.uid, itemId, quantity);
    } finally {
      setSelling(null);
    }
  }

  async function handleBuy(itemId: string, price: number, quantity: number) {
    if (!user) return;
    setBuying(itemId);
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
              const canAfford = character.gold >= price;
              return (
                <li key={itemId}>
                  {item?.name ?? itemId} ({price} gold each)
                  <button onClick={() => handleBuy(itemId, price, 1)} disabled={isBusy || !canAfford}>
                    Buy 1
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
            return (
              <li key={itemId}>
                {name} x{quantity} ({unitValue} gold each)
                <button onClick={() => handleSell(itemId, 1)} disabled={isBusy}>
                  Sell 1
                </button>
                <button onClick={() => handleSell(itemId, quantity)} disabled={isBusy}>
                  Sell All ({quantity * unitValue} gold)
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

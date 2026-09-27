import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sellItem } from '../firebase/vendor';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import type { Inventory } from '../types/character';

export function VendorScreen() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selling, setSelling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!inventory) return null;

  const sellableEntries = Object.entries(inventory.items).filter(([, quantity]) => quantity > 0);

  async function handleSell(itemId: string, quantity: number) {
    if (!user) return;
    setSelling(itemId);
    try {
      await sellItem(user.uid, itemId, quantity);
    } finally {
      setSelling(null);
    }
  }

  return (
    <div className="vendor-screen">
      <h2>Shop</h2>
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

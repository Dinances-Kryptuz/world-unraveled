import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import type { Inventory } from '../types/character';

const REFRESH_INTERVAL_SECONDS = 10;

export function InventoryScreen() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<Inventory | null>(null);

  async function load() {
    if (!user) return;
    const loaded = await getInventory(user.uid);
    setInventory(loaded);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_SECONDS * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!inventory) return null;

  const entries = Object.entries(inventory.items)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => {
      const nameA = ITEMS[a]?.name ?? a;
      const nameB = ITEMS[b]?.name ?? b;
      return nameA.localeCompare(nameB);
    });

  return (
    <div className="inventory-screen">
      <h2>Inventory</h2>
      {entries.length === 0 ? (
        <p>Empty so far — go fight or gather something.</p>
      ) : (
        <ul>
          {entries.map(([itemId, quantity]) => {
            const item = ITEMS[itemId];
            return (
              <li key={itemId}>
                {item ? item.name : itemId}: {quantity}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

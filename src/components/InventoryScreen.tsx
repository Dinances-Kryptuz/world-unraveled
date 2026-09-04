import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import type { Inventory } from '../types/character';

export function InventoryScreen() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<Inventory | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
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

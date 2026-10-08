import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { subscribeToInventory } from '../firebase/inventory';
import { useConsumableOutOfCombat } from '../firebase/consumables';
import { ITEMS } from '../gameData/items';
import { ConsumablesBar } from './ConsumablesBar';
import { ItemSlot } from './ItemSlot';
import type { Inventory } from '../types/character';

export function InventoryScreen() {
  const { user } = useAuth();
  const { character, refetch, applyOptimisticUpdate } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!inventory || !character) return null;

  async function handleUseConsumable(itemId: string) {
    if (!user) return;
    setError(null);
    // Optimistic cooldown so a rapid second click can't slip in before the
    // write round-trips — matches the pattern applyOptimisticUpdate already
    // exists for (xp/gold elsewhere).
    const usedAt = new Date();
    applyOptimisticUpdate((c) => ({ ...c, itemCooldowns: { ...c.itemCooldowns, [itemId]: usedAt } }));
    const result = await useConsumableOutOfCombat(user.uid, itemId);
    if (!result.success) {
      setError(result.reason ?? 'Could not use that item.');
      applyOptimisticUpdate((c) => {
        const next = { ...c.itemCooldowns };
        delete next[itemId];
        return { ...c, itemCooldowns: next };
      });
    }
    await refetch();
  }

  const distinctItemCount = Object.values(inventory.items).filter((q) => q > 0).length;

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
      <p>
        <small>
          {distinctItemCount} / {character.bagSlots} item slots used
        </small>
      </p>
      <ConsumablesBar character={character} inventoryItems={inventory.items} allowMana={false} onUse={handleUseConsumable} />
      {error && <p className="error">{error}</p>}
      {entries.length === 0 ? (
        <p>Empty so far — go fight or gather something.</p>
      ) : (
        <ul>
          {entries.map(([itemId, quantity]) => {
            const item = ITEMS[itemId];
            if (!item) {
              return (
                <li key={itemId}>
                  {itemId}: {quantity}
                </li>
              );
            }
            return (
              <li key={itemId}>
                <div className="item-row-main">
                  <ItemSlot item={item} quantity={quantity} />
                  <span>{item.name}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

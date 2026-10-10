import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { subscribeToInventory } from '../firebase/inventory';
import { useConsumableOutOfCombat, setEquippedConsumable } from '../firebase/consumables';
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

  async function handleEquipConsumable(slot: 'food' | 'potion', itemId: string | null) {
    if (!user) return;
    const result = await setEquippedConsumable(user.uid, slot, itemId);
    if (!result.success) setError(result.reason ?? 'Could not equip that.');
    await refetch();
  }

  // A base item already counts as one occupied slot whether it's a plain
  // stack, one or more randomized-roll instances, one or more charge
  // buckets, or any combination — see firebase/inventory.ts's
  // grantEquipmentInstances/grantChargedConsumables, which enforce the same
  // accounting server-side.
  const instanceBaseItemIds = new Set([
    ...Object.values(inventory.equipmentInstances ?? {}).map((inst) => inst.itemId),
    ...Object.values(inventory.chargedConsumables ?? {}).map((bucket) => bucket.itemId),
  ]);
  for (const itemId of Object.keys(inventory.items)) instanceBaseItemIds.delete(itemId);
  const distinctItemCount = Object.values(inventory.items).filter((q) => q > 0).length + instanceBaseItemIds.size;

  const entries: { key: string; itemId: string; quantity: number; rolls?: Record<string, number>; remainingCharges?: number }[] = [
    ...Object.entries(inventory.items)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ key: itemId, itemId, quantity })),
    // Randomized-roll equipment (gameData/equipmentRolls.ts) lives in its
    // own instanceId-keyed bucket — each distinct roll shown as its own row
    // so different stat combinations of the same base item stay
    // distinguishable, same as the Equipment/Disenchant pickers.
    ...Object.entries(inventory.equipmentInstances ?? {})
      .filter(([, inst]) => inst.quantity > 0)
      .map(([instanceId, inst]) => ({ key: instanceId, itemId: inst.itemId, quantity: inst.quantity, rolls: inst.rolls })),
    // Charge-count-distinguished offensive/defensive potions
    // (gameData/consumableCharges.ts) — same "each distinct bucket its own
    // row" treatment, so a player can see which stack is nearly spent
    // before using it.
    ...Object.entries(inventory.chargedConsumables ?? {})
      .filter(([, bucket]) => bucket.quantity > 0)
      .map(([instanceId, bucket]) => ({
        key: instanceId,
        itemId: bucket.itemId,
        quantity: bucket.quantity,
        remainingCharges: bucket.remainingCharges,
      })),
  ].sort((a, b) => (ITEMS[a.itemId]?.name ?? a.itemId).localeCompare(ITEMS[b.itemId]?.name ?? b.itemId));

  return (
    <div className="inventory-screen">
      <h2>Inventory</h2>
      <p>
        <small>
          {distinctItemCount} / {character.bagSlots} item slots used
        </small>
      </p>
      <ConsumablesBar
        character={character}
        inventoryItems={inventory.items}
        allowMana={false}
        onUse={handleUseConsumable}
        onEquip={handleEquipConsumable}
      />
      {error && <p className="error">{error}</p>}
      {entries.length === 0 ? (
        <p>Empty so far — go fight or gather something.</p>
      ) : (
        <ul>
          {entries.map(({ key, itemId, quantity, rolls, remainingCharges }) => {
            const item = ITEMS[itemId];
            if (!item) {
              return (
                <li key={key}>
                  {itemId}: {quantity}
                </li>
              );
            }
            return (
              <li key={key}>
                <div className="item-row-main">
                  <ItemSlot item={item} quantity={quantity} statOverride={rolls} remainingCharges={remainingCharges} />
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

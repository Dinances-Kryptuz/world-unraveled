import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { equipItem, unequipItem } from '../firebase/character';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import type { Inventory } from '../types/character';
import type { EquipmentSlot } from '../gameData/types';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'ring'];

export function EquipmentScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!character || !inventory) return null;

  async function handleEquip(slot: EquipmentSlot, itemId: string) {
    if (!user) return;
    await equipItem(user.uid, slot, itemId);
    await refetch();
  }

  async function handleUnequip(slot: EquipmentSlot) {
    if (!user) return;
    await unequipItem(user.uid, slot);
    await refetch();
  }

  const equippableInInventory = Object.entries(inventory.items).filter(([itemId, quantity]) => {
    const item = ITEMS[itemId];
    return item?.type === 'equipment' && quantity > 0;
  });

  return (
    <div className="equipment-screen">
      <h2>Equipment</h2>
      <ul>
        {SLOT_ORDER.map((slot) => {
          const equippedId = character.equipment[slot];
          const equippedItem = equippedId ? ITEMS[equippedId] : null;
          return (
            <li key={slot}>
              {slot}: {equippedItem ? equippedItem.name : '(empty)'}
              {equippedItem && <button onClick={() => handleUnequip(slot)}>Unequip</button>}
            </li>
          );
        })}
      </ul>

      <h3>Equip from inventory</h3>
      {equippableInInventory.length === 0 ? (
        <p>No equippable items in inventory.</p>
      ) : (
        <ul>
          {equippableInInventory.map(([itemId, quantity]) => {
            const item = ITEMS[itemId];
            if (!item?.equipSlot) return null;
            return (
              <li key={itemId}>
                {item.name} x{quantity}
                <button onClick={() => handleEquip(item.equipSlot!, itemId)}>Equip</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { equipItem, unequipItem } from '../firebase/character';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import { ENCHANTS } from '../gameData/enchanting';
import { canClassEquip } from '../gameData/classStats';
import { ItemSlot } from './ItemSlot';
import type { Inventory } from '../types/character';
import type { EquipmentSlot } from '../gameData/types';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'offhand', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'necklace', 'ring', 'ring2', 'tool'];

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
          const enchantId = character.enchantments[slot];
          const enchant = enchantId ? ENCHANTS[enchantId] : null;
          return (
            <li key={slot}>
              <div className="item-row-main">
                {equippedItem ? <ItemSlot item={equippedItem} /> : <div className="item-slot item-slot-empty" />}
                <span>
                  {slot}: {equippedItem ? equippedItem.name : '(empty)'}
                </span>
              </div>
              {equippedItem && <button onClick={() => handleUnequip(slot)}>Unequip</button>}
              {enchant && (
                <>
                  {' '}
                  — <em>{enchant.name}</em> ({enchant.description})
                </>
              )}
            </li>
          );
        })}
      </ul>
      {character.professions.enchanting && (
        <p>
          <small>Apply, remove, or disenchant enchants from the Enchanting tab.</small>
        </p>
      )}

      <h3>Equip from inventory</h3>
      {equippableInInventory.length === 0 ? (
        <p>No equippable items in inventory.</p>
      ) : (
        <ul>
          {equippableInInventory.map(([itemId, quantity]) => {
            const item = ITEMS[itemId];
            if (!item?.equipSlot) return null;
            const allowed = canClassEquip(character.class, item);
            // A ring item fits either independent ring slot (see types.ts's
            // EquipmentSlot doc comment) — the inventory list can't guess
            // which one the player wants, so it offers both rather than
            // always targeting 'ring' and leaving 'ring2' unreachable here.
            if (item.equipSlot === 'ring') {
              return (
                <li key={itemId}>
                  <div className="item-row-main">
                    <ItemSlot item={item} quantity={quantity} />
                    <span>{item.name}</span>
                  </div>
                  <button onClick={() => handleEquip('ring', itemId)} disabled={!allowed}>
                    {allowed ? 'Equip (Ring 1)' : `${item.armorType} — not usable`}
                  </button>
                  {allowed && <button onClick={() => handleEquip('ring2', itemId)}>Equip (Ring 2)</button>}
                </li>
              );
            }
            return (
              <li key={itemId}>
                <div className="item-row-main">
                  <ItemSlot item={item} quantity={quantity} />
                  <span>{item.name}</span>
                </div>
                <button onClick={() => handleEquip(item.equipSlot!, itemId)} disabled={!allowed}>
                  {allowed ? 'Equip' : `${item.armorType} — not usable`}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

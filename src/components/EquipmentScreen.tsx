import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { equipItem, unequipItem } from '../firebase/character';
import { setEquippedConsumable, useConsumableOutOfCombat } from '../firebase/consumables';
import { subscribeToInventory } from '../firebase/inventory';
import { ITEMS } from '../gameData/items';
import { ENCHANTS } from '../gameData/enchanting';
import { canClassEquip } from '../gameData/classStats';
import { canEquipInOffhand, isTwoHandedWeapon, equippedItemId } from '../gameData/equipmentStats';
import { ItemSlot } from './ItemSlot';
import { ConsumablesBar } from './ConsumablesBar';
import type { Inventory } from '../types/character';
import type { EquipmentSlot, ItemDef } from '../gameData/types';
import type { BaseStat } from '../gameData/classStats';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'offhand', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'necklace', 'ring', 'ring2', 'tool'];

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Weapon', offhand: 'Off Hand', chest: 'Chest', helmet: 'Helmet', gloves: 'Gloves',
  legs: 'Legs', boots: 'Boots', ring: 'Ring', ring2: 'Ring', necklace: 'Necklace', tool: 'Tool',
};

// Shown on an empty slot tile so the grid still reads as "this is where
// your helmet goes" rather than a row of identical blank boxes — purely
// decorative placeholders, replaced by the item's own icon once equipped.
const SLOT_PLACEHOLDER_ICON: Record<EquipmentSlot, string> = {
  weapon: '⚔️', offhand: '🛡️', chest: '👕', helmet: '🪖', gloves: '🧤',
  legs: '👖', boots: '🥾', ring: '💍', ring2: '💍', necklace: '📿', tool: '🛠️',
};

// An item is offered for `slot` if it's the slot's own type, OR (offhand
// only) a one-handed weapon for dual wielding, OR (ring only) any ring item
// — both independent ring slots draw from the same pool. See
// equipmentStats.ts's canEquipInOffhand for the two-handed exclusion.
function fitsSlot(item: ItemDef, slot: EquipmentSlot): boolean {
  if (slot === 'offhand') return canEquipInOffhand(item);
  if (slot === 'ring' || slot === 'ring2') return item.equipSlot === 'ring';
  return item.equipSlot === slot;
}

// Icon-grid paper doll: one tile per slot, hover for name/stats (ItemSlot's
// own tooltip), click to open a small picker of what from your inventory
// fits there instead of a standing wall of text rows for all 11 slots plus
// a second full-text "equip from inventory" list below it.
export function EquipmentScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!character || !inventory) return null;

  async function handleEquip(slot: EquipmentSlot, itemId: string, instanceId?: string) {
    if (!user) return;
    setError(null);
    try {
      await equipItem(user.uid, slot, itemId, instanceId);
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not equip that.');
    }
    await refetch();
  }

  async function handleUnequip(slot: EquipmentSlot) {
    if (!user) return;
    await unequipItem(user.uid, slot);
    await refetch();
  }

  async function handleUseConsumable(itemId: string) {
    if (!user) return;
    const result = await useConsumableOutOfCombat(user.uid, itemId);
    if (!result.success) setError(result.reason ?? 'Could not use that item.');
    await refetch();
  }

  async function handleEquipConsumable(slot: 'food' | 'potion', itemId: string | null) {
    if (!user) return;
    const result = await setEquippedConsumable(user.uid, slot, itemId);
    if (!result.success) setError(result.reason ?? 'Could not equip that.');
    await refetch();
  }

  const pickerSlot = selectedSlot;
  const pickerOptions: {
    item: ItemDef;
    quantity: number;
    instanceId?: string;
    rolls?: Partial<Record<BaseStat, number>>;
  }[] = pickerSlot
    ? [
        ...Object.entries(inventory.items)
          .filter(([itemId, quantity]) => quantity > 0 && ITEMS[itemId] && fitsSlot(ITEMS[itemId]!, pickerSlot))
          .map(([itemId, quantity]) => ({ item: ITEMS[itemId]!, quantity })),
        // Randomized-roll equipment (gameData/equipmentRolls.ts) lives in its
        // own instanceId-keyed bucket, not inventory.items — see
        // types/character.ts's Inventory.equipmentInstances doc comment.
        ...Object.entries(inventory.equipmentInstances ?? {})
          .filter(([, inst]) => inst.quantity > 0 && ITEMS[inst.itemId] && fitsSlot(ITEMS[inst.itemId]!, pickerSlot))
          .map(([instanceId, inst]) => ({
            item: ITEMS[inst.itemId]!,
            quantity: inst.quantity,
            instanceId,
            rolls: inst.rolls,
          })),
      ]
    : [];

  return (
    <div className="equipment-screen">
      <h2>Equipment</h2>
      {error && <p className="error">{error}</p>}

      <div className="equipment-grid">
        {/* Cape isn't an equippable slot yet — a non-interactive placeholder
            just holds its spot in the paper-doll layout until one exists. */}
        <div className="equipment-grid-tile" style={{ gridArea: 'cape' }}>
          <div className="item-slot item-slot-empty item-slot-disabled" title="Cape — coming soon">
            <span className="item-slot-icon item-slot-placeholder">🧣</span>
          </div>
        </div>
        {SLOT_ORDER.map((slot) => {
          const equippedId = equippedItemId(character.equipment[slot]);
          const equippedItem = equippedId ? ITEMS[equippedId] : null;
          const enchantId = character.enchantments[slot];
          const enchant = enchantId ? ENCHANTS[enchantId] : null;
          return (
            <div key={slot} className="equipment-grid-tile" style={{ gridArea: slot }}>
              {equippedItem ? (
                <ItemSlot
                  item={equippedItem}
                  highlight={selectedSlot === slot}
                  statOverride={character.equipment[slot]?.rolls}
                  onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                >
                  {enchant && <span className="item-slot-enchant-dot" title={`${enchant.name} — ${enchant.description}`} />}
                </ItemSlot>
              ) : (
                <button
                  className={`item-slot item-slot-empty${selectedSlot === slot ? ' item-slot-highlight' : ''}`}
                  onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                  title={SLOT_LABEL[slot]}
                  type="button"
                >
                  <span className="item-slot-icon item-slot-placeholder">{SLOT_PLACEHOLDER_ICON[slot]}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pickerSlot && (
        <div className="equipment-picker">
          <h3>{SLOT_LABEL[pickerSlot]}</h3>
          {character.equipment[pickerSlot] && <button onClick={() => handleUnequip(pickerSlot)}>Unequip</button>}
          {pickerOptions.length === 0 ? (
            <p>Nothing in your inventory fits here.</p>
          ) : (
            <div className="item-grid">
              {pickerOptions.map(({ item, quantity, instanceId, rolls }) => {
                const allowed = canClassEquip(character.class, item);
                const willDropOffhand =
                  pickerSlot === 'weapon' && isTwoHandedWeapon(item) && !!character.equipment.offhand;
                return (
                  <div key={instanceId ?? item.id} className="loot-entry">
                    <ItemSlot
                      item={item}
                      quantity={quantity}
                      disabled={!allowed}
                      statOverride={rolls}
                      onClick={() => handleEquip(pickerSlot, item.id, instanceId)}
                    />
                    {!allowed && <small>{item.armorType} — not usable</small>}
                    {allowed && willDropOffhand && <small>unequips off hand</small>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {character.professions.enchanting && (
        <p>
          <small>Apply, remove, or disenchant enchants from the Enchanting tab.</small>
        </p>
      )}

      <h3>Quick-use</h3>
      <ConsumablesBar
        character={character}
        inventoryItems={inventory.items}
        allowMana={false}
        onUse={handleUseConsumable}
        onEquip={handleEquipConsumable}
      />
    </div>
  );
}

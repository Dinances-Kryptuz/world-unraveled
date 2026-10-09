import { useEffect, useState } from 'react';
import { ITEMS } from '../gameData/items';
import { remainingCooldownSeconds } from '../firebase/consumables';
import { ItemSlot } from './ItemSlot';
import type { Character } from '../types/character';
import type { ItemDef } from '../gameData/types';

function isFoodItem(item: ItemDef): boolean {
  return item.consumableEffect?.buff?.category === 'well_fed';
}

// The two pinned quick-use slots (Character.equippedConsumables) — pick one
// owned food and one owned potion once, then just click Use from here on
// instead of hunting through the full grid below every time. The pin is
// only a pointer: using it decrements inventory exactly like any other
// consumable use, and its displayed quantity IS the inventory count (the
// "stack" the slot shows and draws down from, per the design brief).
function EquippedSlot({
  slot,
  label,
  character,
  inventoryItems,
  allowMana,
  onUse,
  onEquip,
}: {
  slot: 'food' | 'potion';
  label: string;
  character: Character;
  inventoryItems: Record<string, number>;
  allowMana: boolean;
  onUse: (itemId: string) => void;
  onEquip: (slot: 'food' | 'potion', itemId: string | null) => void;
}) {
  const pinnedId = character.equippedConsumables[slot];
  const pinnedItem = pinnedId ? ITEMS[pinnedId] : null;

  const options = Object.values(ITEMS).filter(
    (item) =>
      item.type === 'consumable' &&
      item.consumableEffect &&
      isFoodItem(item) === (slot === 'food') &&
      (inventoryItems[item.id] ?? 0) > 0
  );

  const quantity = pinnedId ? (inventoryItems[pinnedId] ?? 0) : 0;
  const effect = pinnedItem?.consumableEffect;
  const manaOnly = !!effect && effect.healAmount === undefined && effect.manaAmount !== undefined;
  const remaining = pinnedItem ? remainingCooldownSeconds(character, pinnedId!, effect!.cooldownSeconds, new Date()) : 0;
  const blockedOutOfCombat = manaOnly && !allowMana;

  return (
    <div className="equipped-consumable-slot">
      <small>{label}</small>
      <div className="item-row-main">
        {pinnedItem ? (
          <ItemSlot item={pinnedItem} quantity={quantity} onClick={() => onUse(pinnedId!)} disabled={quantity <= 0 || remaining > 0 || blockedOutOfCombat} />
        ) : (
          <div className="item-slot item-slot-empty" />
        )}
        <select
          value={pinnedId ?? ''}
          onChange={(e) => onEquip(slot, e.target.value || null)}
        >
          <option value="">— None —</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({inventoryItems[item.id]})
            </option>
          ))}
        </select>
      </div>
      {remaining > 0 && <small>{Math.ceil(remaining)}s</small>}
    </div>
  );
}

// Shown in the Inventory screen (out of combat, allowMana=false — mana has
// no persisted value to restore outside a live encounter) and in
// CombatScreen/DungeonScreen (allowMana=true). The two equipped slots above
// are the primary way to use a consumable day-to-day; the grid below still
// lists every owned consumable directly, same convention as the vendor's
// "Sell" list, for anything not currently pinned.
export function ConsumablesBar({
  character,
  inventoryItems,
  allowMana,
  onUse,
  onEquip,
}: {
  character: Character;
  inventoryItems: Record<string, number>;
  allowMana: boolean;
  onUse: (itemId: string) => void;
  onEquip: (slot: 'food' | 'potion', itemId: string | null) => void;
}) {
  // Keeps the cooldown countdown fresh even though nothing else about this
  // component's own state ever changes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const consumables = Object.values(ITEMS).filter(
    (item) => item.type === 'consumable' && item.consumableEffect && (inventoryItems[item.id] ?? 0) > 0
  );

  return (
    <>
      <div className="equipped-consumable-slots">
        <EquippedSlot slot="food" label="Food" character={character} inventoryItems={inventoryItems} allowMana={allowMana} onUse={onUse} onEquip={onEquip} />
        <EquippedSlot slot="potion" label="Potion" character={character} inventoryItems={inventoryItems} allowMana={allowMana} onUse={onUse} onEquip={onEquip} />
      </div>
      {consumables.length > 0 && (
        <details>
          <summary>All consumables</summary>
          <div className="item-grid">
            {consumables.map((item) => {
              const effect = item.consumableEffect!;
              const manaOnly = effect.healAmount === undefined && effect.manaAmount !== undefined;
              const remaining = remainingCooldownSeconds(character, item.id, effect.cooldownSeconds, new Date());
              const blockedOutOfCombat = manaOnly && !allowMana;
              const quantity = inventoryItems[item.id] ?? 0;
              return (
                <div key={item.id} className="loot-entry">
                  <ItemSlot
                    item={item}
                    quantity={quantity}
                    onClick={() => onUse(item.id)}
                    disabled={remaining > 0 || blockedOutOfCombat}
                  />
                  {remaining > 0 && <small>{Math.ceil(remaining)}s</small>}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </>
  );
}

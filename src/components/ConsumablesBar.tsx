import { useEffect, useState } from 'react';
import { ITEMS } from '../gameData/items';
import { remainingCooldownSeconds } from '../firebase/consumables';
import { ItemSlot } from './ItemSlot';
import type { Character } from '../types/character';

// Shown in the Inventory screen (out of combat, allowMana=false — mana has
// no persisted value to restore outside a live encounter) and in
// CombatScreen/DungeonScreen (allowMana=true). Only lists consumables the
// player actually owns, same convention as the vendor's "Sell" list.
export function ConsumablesBar({
  character,
  inventoryItems,
  allowMana,
  onUse,
}: {
  character: Character;
  inventoryItems: Record<string, number>;
  allowMana: boolean;
  onUse: (itemId: string) => void;
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

  if (consumables.length === 0) return null;

  return (
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
  );
}

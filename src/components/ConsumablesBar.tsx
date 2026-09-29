import { useEffect, useState } from 'react';
import { ITEMS } from '../gameData/items';
import { remainingCooldownSeconds } from '../firebase/consumables';
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
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      {consumables.map((item) => {
        const effect = item.consumableEffect!;
        const manaOnly = effect.healAmount === undefined && effect.manaAmount !== undefined;
        const remaining = remainingCooldownSeconds(character, item.id, effect.cooldownSeconds, new Date());
        const blockedOutOfCombat = manaOnly && !allowMana;
        const quantity = inventoryItems[item.id] ?? 0;
        return (
          <button
            key={item.id}
            onClick={() => onUse(item.id)}
            disabled={remaining > 0 || blockedOutOfCombat}
            title={blockedOutOfCombat ? 'Only usable in combat' : item.description}
            style={{ marginRight: 8, marginBottom: 8 }}
          >
            {item.name} x{quantity}
            {remaining > 0 ? ` (${Math.ceil(remaining)}s)` : ''}
          </button>
        );
      })}
    </div>
  );
}

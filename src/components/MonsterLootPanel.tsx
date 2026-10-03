import { ITEMS } from '../gameData/items';
import { ItemSlot } from './ItemSlot';
import type { Monster } from '../gameData/types';

function qtyLabel(minQty: number, maxQty: number): string {
  return minQty === maxQty ? `${minQty}` : `${minQty}-${maxQty}`;
}

export function MonsterLootPanel({ monster }: { monster: Monster }) {
  const sortedLoot = [...monster.lootTable].sort((a, b) => b.chance - a.chance);

  return (
    <div className="monster-loot-panel">
      <strong>Combat drops</strong>
      <div className="item-grid">
        {sortedLoot.map((drop) => {
          const item = ITEMS[drop.itemId];
          if (!item) return null;
          return (
            <div key={drop.itemId} className="loot-entry">
              <ItemSlot item={item} />
              <small>{qtyLabel(drop.minQty, drop.maxQty)}</small>
            </div>
          );
        })}
      </div>
      <p>
        <small>Gold: {qtyLabel(monster.goldMin, monster.goldMax)}</small>
      </p>
    </div>
  );
}

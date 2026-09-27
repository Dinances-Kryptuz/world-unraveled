import { ITEMS } from '../gameData/items';
import type { Monster } from '../gameData/types';

function itemName(itemId: string): string {
  return ITEMS[itemId]?.name ?? itemId;
}

function qtyLabel(minQty: number, maxQty: number): string {
  return minQty === maxQty ? `${minQty}` : `${minQty}-${maxQty}`;
}

export function MonsterLootPanel({ monster }: { monster: Monster }) {
  const sortedLoot = [...monster.lootTable].sort((a, b) => b.chance - a.chance);

  return (
    <div
      style={{
        margin: '4px 0 10px 1.5rem',
        padding: '8px 12px',
        background: '#f4efe4',
        border: '1px solid #d8ccb4',
        borderRadius: 4,
      }}
    >
      <strong>Combat drops</strong>
      <ul style={{ margin: '4px 0' }}>
        {sortedLoot.map((drop) => (
          <li key={drop.itemId}>
            {itemName(drop.itemId)} ({qtyLabel(drop.minQty, drop.maxQty)})
          </li>
        ))}
        <li>Gold — {qtyLabel(monster.goldMin, monster.goldMax)}</li>
      </ul>
    </div>
  );
}

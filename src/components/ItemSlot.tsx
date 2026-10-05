import { useState, type ReactNode } from 'react';
import { getItemIcon } from '../gameData/itemIcons';
import type { ItemDef } from '../gameData/types';

const TYPE_LABEL: Record<ItemDef['type'], string> = {
  equipment: 'Equipment',
  material: 'Material',
  consumable: 'Consumable',
  recipe: 'Recipe',
};

function buildTooltip(item: ItemDef): ReactNode {
  const statLine = item.statBonuses
    ? Object.entries(item.statBonuses)
        .map(([stat, val]) => `+${val} ${stat}`)
        .join('  ')
    : '';
  const metaParts = [TYPE_LABEL[item.type]];
  if (item.equipSlot) metaParts.push(item.equipSlot[0].toUpperCase() + item.equipSlot.slice(1));
  if (item.armorType) metaParts.push(item.armorType[0].toUpperCase() + item.armorType.slice(1));

  return (
    <div className="item-tooltip">
      <div className="item-tooltip-name">{item.name}</div>
      <div className="item-tooltip-meta">{metaParts.join(' · ')}</div>
      {statLine && <div className="item-tooltip-stats">{statLine}</div>}
      {item.gatherBonusPct ? <div className="item-tooltip-stats">+{item.gatherBonusPct}% gather success</div> : null}
      {item.consumableEffect?.healAmount ? (
        <div className="item-tooltip-stats">Heals {item.consumableEffect.healAmount} HP</div>
      ) : null}
      {item.consumableEffect?.manaAmount ? (
        <div className="item-tooltip-stats">Restores {item.consumableEffect.manaAmount} mana</div>
      ) : null}
      <div className="item-tooltip-desc">{item.description}</div>
      <div className="item-tooltip-sell">Sells for {item.sellValue} gold</div>
    </div>
  );
}

// Resolves to /item-art/{id}.<ext> by convention — same "no per-item data
// field, just a naming convention" approach as gameData/zoneThemes.ts's
// LOGIN_ART_URL/zone backdrops. Tries .webp first, then .png (most image
// tools/OS "save as" dialogs don't offer a WebP option, so requiring it
// would've meant everyone needs a converter just to add art), then falls
// back to the emoji glyph (getItemIcon). Art can be dropped into
// public/item-art/ as either format, for any subset of the ~350 items,
// with zero code or data changes — a missing file just quietly keeps
// showing its emoji.
const ART_EXTENSIONS = ['webp', 'png'];

function ItemIcon({ item }: { item: ItemDef }) {
  const [extIndex, setExtIndex] = useState(0);
  if (extIndex >= ART_EXTENSIONS.length) {
    return <span className="item-slot-icon">{getItemIcon(item)}</span>;
  }
  return (
    <img
      className="item-slot-icon item-slot-icon-img"
      src={`/item-art/${item.id}.${ART_EXTENSIONS[extIndex]}`}
      alt=""
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}

// The square icon tile every item list in the game now renders as (see
// index.css's .item-slot/.item-tooltip rules) — Melvor Idle/Rock Idle-style
// grid of icons with a hover tooltip, replacing the old plain-text <li>
// rows. The tooltip is pure CSS (:hover-triggered, absolutely positioned
// relative to the slot) rather than JS-tracked, so rendering a few dozen of
// these in one grid (a full inventory/bank page) costs nothing extra.
export function ItemSlot({
  item,
  quantity,
  highlight,
  disabled,
  onClick,
  children,
}: {
  item: ItemDef;
  quantity?: number;
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`item-slot${highlight ? ' item-slot-highlight' : ''}${disabled ? ' item-slot-disabled' : ''}`}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      type={onClick ? 'button' : undefined}
    >
      <ItemIcon item={item} />
      {quantity !== undefined && quantity > 1 && <span className="item-slot-qty">{quantity}</span>}
      {buildTooltip(item)}
      {children}
    </Tag>
  );
}

import { useState, type ReactNode } from 'react';
import { getItemIcon } from '../gameData/itemIcons';
import type { BaseStat } from '../gameData/classStats';
import type { ItemDef } from '../gameData/types';

const TYPE_LABEL: Record<ItemDef['type'], string> = {
  equipment: 'Equipment',
  material: 'Material',
  consumable: 'Consumable',
  recipe: 'Recipe',
  enchant_scroll: 'Enchanting Scroll',
};

// `statOverride` shows a randomized-roll item's ACTUAL rolled stats
// (gameData/equipmentRolls.ts) instead of the base item's static
// statBonuses — passed by any caller rendering a specific
// Inventory.equipmentInstances entry or an equipped EquippedItemRef with
// `rolls`. Omitted, this falls back to the item's own static definition
// exactly as before this prop existed.
// `remainingCharges` is this specific chargedConsumables bucket's charge
// count (gameData/consumableCharges.ts) — only ever passed for an
// offensive/defensive potion stack, since resource (heal/mana) potions
// never carry charges at all (see ConsumableEffect's doc comment), so there
// is nothing else to gate this on.
function buildTooltip(
  item: ItemDef,
  statOverride?: Partial<Record<BaseStat, number>>,
  remainingCharges?: number
): ReactNode {
  const stats = statOverride ?? item.statBonuses;
  const statLine = stats
    ? Object.entries(stats)
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
      {remainingCharges !== undefined ? (
        <div className="item-tooltip-stats">
          {remainingCharges} charge{remainingCharges === 1 ? '' : 's'} remaining
        </div>
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
  statOverride,
  remainingCharges,
  children,
}: {
  item: ItemDef;
  quantity?: number;
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  // The actual rolled stats of a specific randomized-equipment instance
  // (gameData/equipmentRolls.ts) — see buildTooltip's doc comment above.
  statOverride?: Partial<Record<BaseStat, number>>;
  // This specific chargedConsumables bucket's charge count — see
  // buildTooltip's doc comment above. Shown as a small corner badge (like
  // quantity) PLUS the tooltip line, since "which stack has more charges
  // left" is exactly the kind of thing worth seeing without hovering.
  remainingCharges?: number;
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
      <ItemIcon key={item.id} item={item} />
      {quantity !== undefined && quantity > 1 && <span className="item-slot-qty">{quantity}</span>}
      {remainingCharges !== undefined && <span className="item-slot-charges">{remainingCharges}c</span>}
      {buildTooltip(item, statOverride, remainingCharges)}
      {children}
    </Tag>
  );
}

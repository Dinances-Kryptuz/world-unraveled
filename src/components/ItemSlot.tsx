import { useState, type ReactNode } from 'react';
import { getItemIcon } from '../gameData/itemIcons';
import { getItemDisplayName } from '../gameData/equipmentSuffixes';
import { compareEquipmentStats } from '../gameData/equipmentComparison';
import { inferItemRarity, RARITY_COLORS, RARITY_LABELS } from '../gameData/itemRarity';
import { ARMOR_STAT_VALUES } from '../gameData/equipmentRolls';
import { ENCHANTS, describeEnchantEffect } from '../gameData/enchanting';
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
// `compareStats`, when passed, is the effective stats (rolls or static
// statBonuses) of whatever is CURRENTLY EQUIPPED in this item's slot —
// Equipment Comparison overhaul. Its presence (even as `{}`, meaning the
// slot is empty) switches the stat lines from a flat "+N STAT" list to a
// per-stat diff with a colored up/down/unchanged indicator, per the design
// brief's comparison-indicator spec. Omitted entirely (the default, used by
// every pre-existing call site), the tooltip renders exactly as before this
// feature existed.
function buildTooltip(
  item: ItemDef,
  statOverride?: Partial<Record<BaseStat, number>>,
  remainingCharges?: number,
  compareStats?: Partial<Record<BaseStat, number>>,
  locked?: boolean
): ReactNode {
  const stats = statOverride ?? item.statBonuses;
  // Previewing a base item (no statOverride — e.g. a recipe's result in
  // ProfessionScreen) that actually rolls 2 random stats at craft time
  // (equipmentRolls.ts's ARMOR_STAT_VALUES) — item.statBonuses here is
  // stale pre-Mastery-overhaul data never actually applied at craft time,
  // so showing its specific numbers as if guaranteed is misleading. The
  // Stat Budget Redesign fixed the magnitude, though (only which 2 stats
  // land is still random), so the preview shows that real, known number.
  const randomRollValue = !statOverride ? ARMOR_STAT_VALUES[item.id] : undefined;
  const comparison = compareStats !== undefined ? compareEquipmentStats(stats, compareStats) : null;
  const statLine = randomRollValue !== undefined
    ? `+${randomRollValue} to 2 random stats`
    : !comparison && stats
      ? Object.entries(stats).map(([stat, val]) => `+${val} ${stat}`).join('  ')
      : '';
  const metaParts = [TYPE_LABEL[item.type]];
  if (item.equipSlot) metaParts.push(item.equipSlot[0].toUpperCase() + item.equipSlot.slice(1));
  if (item.armorType) metaParts.push(item.armorType[0].toUpperCase() + item.armorType.slice(1));
  const rarity = inferItemRarity(item);

  return (
    <div className="item-tooltip">
      <div className="item-tooltip-name" style={rarity ? { color: RARITY_COLORS[rarity] } : undefined}>
        {getItemDisplayName(item.name, statOverride)}
        {locked ? ' 🔒' : ''}
      </div>
      {rarity && <div className="item-tooltip-rarity" style={{ color: RARITY_COLORS[rarity] }}>{RARITY_LABELS[rarity]}</div>}
      <div className="item-tooltip-meta">{metaParts.join(' · ')}</div>
      {statLine && <div className="item-tooltip-stats">{statLine}</div>}
      {comparison && comparison.rows.length > 0 && (
        <div className="item-tooltip-compare">
          {comparison.rows.map((row) => {
            const dir = row.diff > 0 ? 'up' : row.diff < 0 ? 'down' : 'same';
            const arrow = row.diff > 0 ? '▲' : row.diff < 0 ? '▼' : '●';
            return (
              <div key={row.stat} className={`item-tooltip-compare-row stat-diff-${dir}`}>
                {row.stat}: {row.candidateValue} vs {row.equippedValue}{' '}
                <span>
                  {arrow} {row.diff > 0 ? '+' : ''}
                  {row.diff}
                </span>
              </div>
            );
          })}
          <div
            className={`item-tooltip-compare-total stat-diff-${
              comparison.totalDiff > 0 ? 'up' : comparison.totalDiff < 0 ? 'down' : 'same'
            }`}
          >
            Total: {comparison.totalDiff > 0 ? '+' : ''}
            {comparison.totalDiff}
          </div>
        </div>
      )}
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
      {/* Enchant scrolls' own item.description is a generic "use this to
          apply the enchant" line — it never states the actual mechanical
          effect, which only lives on the matching ENCHANTS entry (and only
          surfaces today inside the Enchanting profession screen's own
          "Use Scroll" list). Showing that enchant's description here too
          means every scroll's effect is visible from wherever it's looked
          at (inventory, bank, vendor, loot), not just that one screen. */}
      {item.scrollEnchantId && ENCHANTS[item.scrollEnchantId] ? (
        <div className="item-tooltip-stats">{describeEnchantEffect(ENCHANTS[item.scrollEnchantId])}</div>
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
  compareStats,
  locked,
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
  // Equipment Comparison overhaul — see buildTooltip's doc comment above.
  compareStats?: Partial<Record<BaseStat, number>>;
  // Equipment Locking overhaul — shows a small lock badge + the tooltip's
  // 🔒 marker. Purely display; actual lock enforcement lives server-side
  // (firebase/inventory.ts's isLocked), not here.
  locked?: boolean;
  children?: ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  // Equipment Rarity overhaul — a colored border on the tile itself, same
  // color as the tooltip name, so rarity reads at a glance across a grid
  // without needing to hover every item. 'white' (RARITY_COLORS.white ===
  // 'inherit') intentionally renders no special border, matching WoW's own
  // "Common quality items aren't highlighted" convention.
  const rarity = inferItemRarity(item);
  const rarityBorderColor = rarity && RARITY_COLORS[rarity] !== 'inherit' ? RARITY_COLORS[rarity] : undefined;
  return (
    <Tag
      className={`item-slot${highlight ? ' item-slot-highlight' : ''}${disabled ? ' item-slot-disabled' : ''}`}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      type={onClick ? 'button' : undefined}
      style={rarityBorderColor ? { borderColor: rarityBorderColor } : undefined}
    >
      <ItemIcon key={item.id} item={item} />
      {quantity !== undefined && quantity > 1 && <span className="item-slot-qty">{quantity}</span>}
      {remainingCharges !== undefined && <span className="item-slot-charges">{remainingCharges}c</span>}
      {locked && <span className="item-slot-locked">🔒</span>}
      {buildTooltip(item, statOverride, remainingCharges, compareStats, locked)}
      {children}
    </Tag>
  );
}

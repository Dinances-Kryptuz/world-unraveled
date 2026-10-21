// Equipment Rarity overhaul — WoW-Classic-style quality tiers for display
// only (color-coding names/borders/tooltips). The actual stat-generation
// logic for each tier lives where it already does: green stays
// equipmentRolls.ts's randomized roll system; blue/purple are fixed-stat
// dungeon items authored directly in items.ts (see dungeonLoot.ts);
// nothing here computes stats.
import type { ItemDef, ItemRarity } from './types';
import { ARMOR_STAT_VALUES } from './equipmentRolls';

export const RARITY_LABELS: Record<ItemRarity, string> = {
  gray: 'Poor',
  white: 'Common',
  green: 'Uncommon',
  blue: 'Rare',
  purple: 'Epic',
  orange: 'Legendary',
};

// Standard WoW Classic quality hexes, used verbatim per the design brief's
// "use recognizable... colors consistently" instruction. 'white' is
// deliberately NOT literal #ffffff — WoW's own convention renders
// Common-quality item names in the UI's default text color rather than a
// true white swatch (true white would also be unreadable on this game's
// light parchment theme), so 'inherit' is the accurate choice here, not a
// simplification.
export const RARITY_COLORS: Record<ItemRarity, string> = {
  gray: '#9d9d9d',
  white: 'inherit',
  green: '#1eff00',
  blue: '#0070dd',
  purple: '#a335ee',
  orange: '#ff8000',
};

// Best-effort rarity for an item that has no explicit ItemDef.rarity set —
// every other equippable item in the 650+-item catalog predates this
// overhaul, and hand-tagging all of them isn't tractable or necessary: the
// two signals below already cover the real distinction that matters today
// (the existing randomized-roll crafted system IS green, by the design
// brief's own definition) — everything else defaults to white, the correct
// "ordinary gear, no special treatment" bucket for starter kit, vendor
// jewelry, quest rewards, and legacy static items.
export function inferItemRarity(item: ItemDef): ItemRarity | null {
  if (item.rarity) return item.rarity;
  if (item.type !== 'equipment' || !item.equipSlot) return null;
  if (item.id in ARMOR_STAT_VALUES) return 'green';
  return 'white';
}

export function rarityColor(item: ItemDef): string | null {
  const rarity = inferItemRarity(item);
  return rarity ? RARITY_COLORS[rarity] : null;
}

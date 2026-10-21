// Inventory Sorting/Filtering overhaul — pure client-side sort+filter over
// an already-loaded Inventory's entries (see InventoryScreen.tsx). Never
// touches Firestore, item instance ids, rolls, or ownership; presentation
// only, exactly per the design brief's "never change item data" rule.
import { ITEMS } from './items';
import type { BaseStat } from './classStats';
import type { EquipmentSlot } from './types';
import type { InventorySortOption } from '../types/character';
import { equipmentSuffixFor } from './equipmentSuffixes';
import { materialTierRank, materialIdForItem } from './itemMetadata';

export interface InventoryEntry {
  key: string;
  itemId: string;
  quantity: number;
  rolls?: Partial<Record<BaseStat, number>>;
  acquiredAt?: Date;
  locked: boolean;
}

export interface InventoryFilter {
  slot?: EquipmentSlot | null;
  materialId?: string | null;
  suffix?: string | null;
  locked?: 'locked' | 'unlocked' | null;
}

// Matches the paper-doll's own visual order (EquipmentScreen.tsx's
// LEFT_COLUMN + RIGHT_COLUMN + BOTTOM_ROW + tool) so a slot-sorted list
// reads in the same order the slots appear on the Equipment screen. Kept
// as its own small constant here (rather than imported from a component)
// to keep gameData free of any dependency on the components layer.
export const EQUIPMENT_SLOT_SORT_ORDER: EquipmentSlot[] = [
  'helmet', 'necklace', 'shoulders', 'cape', 'chest', 'shirt', 'tabard', 'bracers',
  'gloves', 'belt', 'legs', 'boots', 'ring', 'ring2',
  'weapon', 'offhand', 'ammo', 'tool_mining', 'tool_skinning', 'tool_fishing',
];

function slotRank(itemId: string): number {
  const slot = ITEMS[itemId]?.equipSlot;
  if (!slot) return EQUIPMENT_SLOT_SORT_ORDER.length;
  const idx = EQUIPMENT_SLOT_SORT_ORDER.indexOf(slot);
  return idx === -1 ? EQUIPMENT_SLOT_SORT_ORDER.length : idx;
}

function totalStats(rolls: Partial<Record<BaseStat, number>> | undefined): number {
  if (!rolls) return 0;
  return Object.values(rolls).reduce((sum, v) => sum + (v ?? 0), 0);
}

export function matchesInventoryFilter(entry: InventoryEntry, filter: InventoryFilter): boolean {
  const item = ITEMS[entry.itemId];
  if (filter?.slot && item?.equipSlot !== filter.slot) return false;
  if (filter?.materialId && materialIdForItem(entry.itemId) !== filter.materialId) return false;
  if (filter?.suffix) {
    if (equipmentSuffixFor(entry.rolls) !== filter.suffix) return false;
  }
  if (filter?.locked === 'locked' && !entry.locked) return false;
  if (filter?.locked === 'unlocked' && entry.locked) return false;
  return true;
}

// Stable (ties broken by `key`, the instanceId/itemId — unique per entry)
// — Array.prototype.sort is itself stable since ES2019, but an explicit
// tiebreaker makes that guarantee independent of engine behavior and keeps
// re-sorts (e.g. a quantity change re-rendering the same list) visually
// steady rather than merely "technically stable."
export function sortInventoryEntries(
  entries: InventoryEntry[],
  sortBy: InventorySortOption,
  sortStat?: BaseStat
): InventoryEntry[] {
  const withIndex = entries.map((e, i) => ({ e, i }));
  withIndex.sort((a, b) => {
    const cmp = compareBySortOption(a.e, b.e, sortBy, sortStat);
    if (cmp !== 0) return cmp;
    return a.e.key.localeCompare(b.e.key);
  });
  return withIndex.map(({ e }) => e);
}

function compareBySortOption(a: InventoryEntry, b: InventoryEntry, sortBy: InventorySortOption, sortStat?: BaseStat): number {
  switch (sortBy) {
    case 'slot':
      return slotRank(a.itemId) - slotRank(b.itemId);
    case 'tier':
      return materialTierRank(a.itemId) - materialTierRank(b.itemId);
    case 'suffix': {
      const sa = equipmentSuffixFor(a.rolls) ?? '';
      const sb = equipmentSuffixFor(b.rolls) ?? '';
      return sa.localeCompare(sb);
    }
    case 'totalStats':
      return totalStats(b.rolls) - totalStats(a.rolls); // highest first
    case 'individualStat': {
      const va = (sortStat && a.rolls?.[sortStat]) ?? 0;
      const vb = (sortStat && b.rolls?.[sortStat]) ?? 0;
      return vb - va; // highest first
    }
    case 'newest':
      return (b.acquiredAt?.getTime() ?? 0) - (a.acquiredAt?.getTime() ?? 0);
    case 'oldest':
      return (a.acquiredAt?.getTime() ?? 0) - (b.acquiredAt?.getTime() ?? 0);
    default:
      return 0;
  }
}

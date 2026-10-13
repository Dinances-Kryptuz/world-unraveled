// The Tower of Infinity — milestone rewards, generated the same way
// dungeonLoot.ts generates its blue/purple drops (a compact table crossed
// with the 9 spec variants), reusing that module's SPEC_VARIANTS/SLOT_NOUN
// directly rather than re-authoring them. Per the locked design decision,
// every Tower reward is Purple/Epic — Orange/Legendary stays reserved for
// future raid content, not used here.
import type { ItemDef } from './types';
import { SPEC_VARIANTS, SLOT_NOUN, type SpecVariant } from './dungeonLoot';
import type { EquipmentSlot } from './types';

interface TowerMilestoneEntry {
  floor: number;
  slot: EquipmentSlot;
  // Total stat budget for this milestone's items, split 65/35 primary/
  // secondary like every other fixed-stat drop in this game. Starts at
  // roughly the zone-6 dungeon PURPLE_BUDGET (34, dungeonLoot.ts) for
  // floor 10 — the Tower's lowest milestone is meant to already compete
  // with the best normal-progression gear — and grows modestly per
  // milestone so a future expansion raising the reachable ceiling has
  // real additional rewards already defined, not just more floors to
  // reach the same cap.
  budget: number;
}

// One slot per milestone (every 10 floors, all the way to 100 — floors
// above ~50 aren't reliably reachable yet, per the Phase 0 simulation, but
// the rewards are defined now so a future gear/content expansion raising
// the ceiling doesn't also need a loot-table pass). Slots rotate through
// the highest-value equipment types, mirroring dungeonLoot.ts's own
// "weapon/chest/helmet highest value" weighting.
const TOWER_MILESTONES: TowerMilestoneEntry[] = [
  { floor: 10, slot: 'weapon', budget: 34 },
  { floor: 20, slot: 'chest', budget: 40 },
  { floor: 30, slot: 'helmet', budget: 46 },
  { floor: 40, slot: 'shoulders', budget: 52 },
  { floor: 50, slot: 'legs', budget: 58 },
  { floor: 60, slot: 'weapon', budget: 64 },
  { floor: 70, slot: 'chest', budget: 70 },
  { floor: 80, slot: 'helmet', budget: 76 },
  { floor: 90, slot: 'shoulders', budget: 82 },
  { floor: 100, slot: 'legs', budget: 88 },
];

function itemId(entry: TowerMilestoneEntry, variant: SpecVariant): string {
  return `tower_floor${entry.floor}_${entry.slot}_${variant.key}`;
}

function buildItem(entry: TowerMilestoneEntry, variant: SpecVariant): ItemDef {
  const primaryVal = Math.round(entry.budget * 0.65);
  const secondaryVal = Math.max(1, entry.budget - primaryVal);
  const slotNoun = SLOT_NOUN[entry.slot] ?? entry.slot;
  const isShieldSlot = entry.slot === 'offhand' && variant.armorType === 'plate';
  return {
    id: itemId(entry, variant),
    name: `Infinity-Warded ${slotNoun} of ${variant.label}`,
    type: 'equipment',
    description: `A fixed-stat epic drop from floor ${entry.floor} of the Tower of Infinity, favoring ${variant.label}.`,
    stackable: true,
    equipSlot: entry.slot,
    armorType: variant.armorType,
    statBonuses: { [variant.primary]: primaryVal, [variant.secondary]: secondaryVal },
    rarity: 'purple',
    ...(isShieldSlot ? { isShield: true } : {}),
    sellValue: entry.budget * 3,
  };
}

export const TOWER_LOOT_ITEMS: Record<string, ItemDef> = {};
// floor -> the 9 candidate spec-variant item ids for that milestone's
// reward. The Tower attempt writer (firebase/tower.ts) picks ONE of these
// uniformly at random and grants it GUARANTEED the first time a character
// reaches that floor — not via a monster lootTable Bernoulli roll like
// dungeon loot (which repeats forever on every boss kill): a Tower
// milestone is a one-time "first reach" reward, so there's no repeat-kill
// chance to converge toward "something eventually drops." Still never
// personalized to the player's own class/spec, per the same "a Warrior may
// receive a Priest-oriented item" rule dungeon loot follows.
export const TOWER_MILESTONE_ITEM_IDS: Record<number, string[]> = {};

for (const entry of TOWER_MILESTONES) {
  const ids: string[] = [];
  for (const variant of SPEC_VARIANTS) {
    const item = buildItem(entry, variant);
    TOWER_LOOT_ITEMS[item.id] = item;
    ids.push(item.id);
  }
  TOWER_MILESTONE_ITEM_IDS[entry.floor] = ids;
}

export const TOWER_MILESTONE_FLOORS: number[] = TOWER_MILESTONES.map((e) => e.floor);

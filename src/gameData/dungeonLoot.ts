// Combat/Rarity overhaul Part 3 — dungeon blue/purple fixed-stat
// equipment, generated from a compact table rather than ~180 hand-authored
// item literals. Every dungeon drops gear for only a small, dungeon-
// specific set of slots (never a full set from one dungeon, per the design
// brief), with one fixed-stat variant per current specialization (plus one
// future-leather-class placeholder) — all droppable regardless of the
// looter's own class/spec (never personalized), per the design brief's
// explicit "a Warrior may receive a Priest-oriented item" instruction.
// Item stats are FIXED, never randomized — this is the one thing that
// deliberately does NOT go through equipmentRolls.ts's roll system.
import type { ArmorType, EquipmentSlot, ItemDef, ItemRarity } from './types';
import type { BaseStat, SpecId } from './classStats';

// Exported for reuse by towerLoot.ts (The Tower of Infinity's milestone
// rewards use the exact same "one fixed-stat variant per spec" pattern).
export interface SpecVariant {
  // 'leather_future' isn't a real SpecId — no leather-primary class exists
  // yet (warrior/paladin treat leather as off-stat, priest/mage can't wear
  // it at all) — this is the architecture-only placeholder the design
  // brief explicitly asks for ("future-compatible variants without
  // requiring unfinished class systems").
  key: SpecId | 'leather_future';
  label: string;
  armorType: ArmorType;
  primary: BaseStat;
  secondary: BaseStat;
}

// Primary/secondary stat weighting per spec, reusing this project's own
// Attribute/Specialization-overhaul identity (STA/STR for the two tank
// specs, SPI/INT for the two healers, INT/SPI for Shadow and the two Mage
// companion specs, STR/STA for Warrior DPS) rather than inventing a new
// stat language — see combatFormulas.ts/classStats.ts for why these are
// the stats that actually matter to each spec today.
export const SPEC_VARIANTS: SpecVariant[] = [
  { key: 'warrior_tank', label: 'the Warrior Tank', armorType: 'plate', primary: 'STA', secondary: 'STR' },
  { key: 'warrior_dps', label: 'the Warrior', armorType: 'plate', primary: 'STR', secondary: 'STA' },
  { key: 'prot_paladin', label: 'the Protector', armorType: 'plate', primary: 'STA', secondary: 'STR' },
  { key: 'holy_paladin', label: 'the Paladin Healer', armorType: 'plate', primary: 'SPI', secondary: 'INT' },
  { key: 'holy_priest', label: 'the Priest Healer', armorType: 'cloth', primary: 'SPI', secondary: 'INT' },
  { key: 'shadow_priest', label: 'the Shadow Priest', armorType: 'cloth', primary: 'INT', secondary: 'SPI' },
  { key: 'mage_fire', label: 'the Fire Mage', armorType: 'cloth', primary: 'INT', secondary: 'SPI' },
  { key: 'mage_frost', label: 'the Frost Mage', armorType: 'cloth', primary: 'INT', secondary: 'STA' },
  { key: 'leather_future', label: 'the Hunter', armorType: 'leather', primary: 'AGI', secondary: 'STA' },
];

export const SLOT_NOUN: Partial<Record<EquipmentSlot, string>> = {
  shoulders: 'Shoulders', weapon: 'Blade', ring: 'Ring', chest: 'Chestguard', necklace: 'Pendant',
  boots: 'Boots', helmet: 'Helm', bracers: 'Bracers', gloves: 'Gauntlets', belt: 'Belt',
  offhand: 'Offhand', legs: 'Legguards',
};

// Equipment Rarity overhaul — dungeon rarity now follows the same 6-zone
// ladder as monster/crafted drops (gray/white/green/blue/purple, one or two
// sources per zone), shifted down one notch from this feature's original
// shape: Z1 dungeon gear is 'white', Z2 is 'green', Z3 gets 'green' plus a
// RARE 'blue' chase item (the first blue in the game, per the design
// brief's explicit rule), Z4 is plain 'blue', Z5 is 'blue' plus an
// EXCEPTIONALLY RARE 'purple' chase item (the first purple), and Z6 stays
// all-'purple' (already matched, no change). WHITE_BUDGET/GREEN_BUDGET are
// new; BLUE_BUDGET/PURPLE_BUDGET are the original tables, now anchored two
// zones later than their rarity string might suggest (a Z3 "rare blue" item
// still uses BLUE_BUDGET[3], same magnitude as the old Z3 "guaranteed-ish
// blue" did — only the chance and the zones below it changed).
const WHITE_BUDGET: Record<number, number> = { 1: 6 };
const GREEN_BUDGET: Record<number, number> = { 2: 10, 3: 14 };
const BLUE_BUDGET: Record<number, number> = { 1: 8, 2: 12, 3: 16, 4: 20, 5: 25 };
const PURPLE_BUDGET: Record<number, number> = { 3: 20, 4: 25, 5: 30, 6: 34 };

interface DungeonSlotEntry {
  dungeonId: string;
  dungeonLabel: string;
  zoneTier: number;
  bossMonsterId: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  // Drop chance PER VARIANT (independent roll, matching this game's
  // existing lootTable convention — see monsters.ts's doc comments; there
  // is no "guaranteed one of N" mechanic in this engine) — summed across
  // the 9 variants this lands around a reasonable "something from this
  // slot" chance per boss kill without a new drop-table mechanic.
  chancePerVariant: number;
  // Purple "chase" slots authored for only 3 representative specs (one
  // tank, one healer, one caster-DPS) rather than the full 9 — the design
  // brief's "very rare chance for purple" is about rarity of the drop
  // itself, not a second full 9-variant set per zone; z6 is the one zone
  // where purple IS the full, primary table.
  specSubset?: (SpecId | 'leather_future')[];
}

// Each dungeon covers 3-4 slots (never a full set), rotating across the 6
// dungeons so every real itemized slot is covered at least once by zone 6,
// with weapon/chest/helmet/shoulders double-covered as the highest-value
// slots — see this phase's design report for the full table.
export const DUNGEON_LOOT_SLOTS: DungeonSlotEntry[] = [
  { dungeonId: 'kobold_warrens', dungeonLabel: 'Kobold Warrens', zoneTier: 1, bossMonsterId: 'kobold_chieftain', slot: 'shoulders', rarity: 'white', chancePerVariant: 0.05 },
  { dungeonId: 'kobold_warrens', dungeonLabel: 'Kobold Warrens', zoneTier: 1, bossMonsterId: 'kobold_chieftain', slot: 'weapon', rarity: 'white', chancePerVariant: 0.04 },
  { dungeonId: 'kobold_warrens', dungeonLabel: 'Kobold Warrens', zoneTier: 1, bossMonsterId: 'kobold_chieftain', slot: 'ring', rarity: 'white', chancePerVariant: 0.05 },

  { dungeonId: 'stonecrag_depths', dungeonLabel: 'Stonecrag Depths', zoneTier: 2, bossMonsterId: 'alpha_warlord', slot: 'chest', rarity: 'green', chancePerVariant: 0.04 },
  { dungeonId: 'stonecrag_depths', dungeonLabel: 'Stonecrag Depths', zoneTier: 2, bossMonsterId: 'alpha_warlord', slot: 'necklace', rarity: 'green', chancePerVariant: 0.05 },
  { dungeonId: 'stonecrag_depths', dungeonLabel: 'Stonecrag Depths', zoneTier: 2, bossMonsterId: 'alpha_warlord', slot: 'boots', rarity: 'green', chancePerVariant: 0.05 },

  // The first BLUE equipment in the game, per the design brief's explicit
  // rule — rare (not guaranteed-ish like the other slots here), and only 3
  // spec variants rather than the full 9, matching the "chase item" posture
  // the old Z3 purple entry had before this retier (no purple exists this
  // early anymore — see buried_foundry below for why).
  { dungeonId: 'sundered_forge', dungeonLabel: 'Sundered Forge', zoneTier: 3, bossMonsterId: 'forgemaster_kaldrun', slot: 'helmet', rarity: 'green', chancePerVariant: 0.04 },
  { dungeonId: 'sundered_forge', dungeonLabel: 'Sundered Forge', zoneTier: 3, bossMonsterId: 'forgemaster_kaldrun', slot: 'bracers', rarity: 'green', chancePerVariant: 0.05 },
  { dungeonId: 'sundered_forge', dungeonLabel: 'Sundered Forge', zoneTier: 3, bossMonsterId: 'forgemaster_kaldrun', slot: 'weapon', rarity: 'green', chancePerVariant: 0.04 },
  { dungeonId: 'sundered_forge', dungeonLabel: 'Sundered Forge', zoneTier: 3, bossMonsterId: 'forgemaster_kaldrun', slot: 'weapon', rarity: 'blue', chancePerVariant: 0.015, specSubset: ['warrior_tank', 'holy_priest', 'shadow_priest'] },

  // No purple before Zone 5 (design brief rule) — the old purple-gloves
  // chase entry here was removed; this zone's best drop is plain blue now.
  { dungeonId: 'buried_foundry', dungeonLabel: 'Buried Foundry', zoneTier: 4, bossMonsterId: 'ashen_overseer', slot: 'gloves', rarity: 'blue', chancePerVariant: 0.04 },
  { dungeonId: 'buried_foundry', dungeonLabel: 'Buried Foundry', zoneTier: 4, bossMonsterId: 'ashen_overseer', slot: 'belt', rarity: 'blue', chancePerVariant: 0.05 },
  { dungeonId: 'buried_foundry', dungeonLabel: 'Buried Foundry', zoneTier: 4, bossMonsterId: 'ashen_overseer', slot: 'offhand', rarity: 'blue', chancePerVariant: 0.04 },

  // The first PURPLE equipment in the game, per the design brief's explicit
  // rule — EXCEPTIONALLY rare (chancePerVariant cut to a third of Zone 3's
  // "first blue" rarity) to keep it a genuine, talked-about chase drop.
  { dungeonId: 'scarred_sanctum', dungeonLabel: 'Scarred Sanctum', zoneTier: 5, bossMonsterId: 'molten_herald', slot: 'legs', rarity: 'blue', chancePerVariant: 0.04 },
  { dungeonId: 'scarred_sanctum', dungeonLabel: 'Scarred Sanctum', zoneTier: 5, bossMonsterId: 'molten_herald', slot: 'ring', rarity: 'blue', chancePerVariant: 0.05 },
  { dungeonId: 'scarred_sanctum', dungeonLabel: 'Scarred Sanctum', zoneTier: 5, bossMonsterId: 'molten_herald', slot: 'necklace', rarity: 'blue', chancePerVariant: 0.05 },
  { dungeonId: 'scarred_sanctum', dungeonLabel: 'Scarred Sanctum', zoneTier: 5, bossMonsterId: 'molten_herald', slot: 'legs', rarity: 'purple', chancePerVariant: 0.005, specSubset: ['warrior_dps', 'holy_paladin', 'mage_frost'] },

  { dungeonId: 'cinderheart_sanctum', dungeonLabel: 'Cinderheart Sanctum', zoneTier: 6, bossMonsterId: 'pyraxis', slot: 'weapon', rarity: 'purple', chancePerVariant: 0.035 },
  { dungeonId: 'cinderheart_sanctum', dungeonLabel: 'Cinderheart Sanctum', zoneTier: 6, bossMonsterId: 'pyraxis', slot: 'chest', rarity: 'purple', chancePerVariant: 0.035 },
  { dungeonId: 'cinderheart_sanctum', dungeonLabel: 'Cinderheart Sanctum', zoneTier: 6, bossMonsterId: 'pyraxis', slot: 'helmet', rarity: 'purple', chancePerVariant: 0.035 },
  { dungeonId: 'cinderheart_sanctum', dungeonLabel: 'Cinderheart Sanctum', zoneTier: 6, bossMonsterId: 'pyraxis', slot: 'shoulders', rarity: 'purple', chancePerVariant: 0.035 },
];

const RARITY_FLAVOR: Record<ItemRarity, string> = {
  gray: 'poor', white: 'common', green: 'uncommon', blue: 'rare', purple: 'epic', orange: 'legendary',
};

function budgetFor(entry: DungeonSlotEntry): number {
  switch (entry.rarity) {
    case 'purple': return PURPLE_BUDGET[entry.zoneTier] ?? 10;
    case 'blue': return BLUE_BUDGET[entry.zoneTier] ?? 10;
    case 'green': return GREEN_BUDGET[entry.zoneTier] ?? 10;
    case 'white': return WHITE_BUDGET[entry.zoneTier] ?? 10;
    default: return 10;
  }
}

function itemId(entry: DungeonSlotEntry, variant: SpecVariant): string {
  // Includes rarity so a zone's "very rare purple chase" variant of a slot
  // it ALSO drops in blue (e.g. sundered_forge's helmet) never collides
  // with the blue item of the same slot/spec.
  return `${entry.dungeonId}_${entry.slot}_${entry.rarity}_${variant.key}`;
}

function buildItem(entry: DungeonSlotEntry, variant: SpecVariant): ItemDef {
  const budget = budgetFor(entry);
  const primaryVal = Math.round(budget * 0.65);
  const secondaryVal = Math.max(1, budget - primaryVal);
  const slotNoun = SLOT_NOUN[entry.slot] ?? entry.slot;
  const isShieldSlot = entry.slot === 'offhand' && variant.armorType === 'plate';
  return {
    id: itemId(entry, variant),
    name: `${entry.dungeonLabel} ${slotNoun} of ${variant.label}`,
    type: 'equipment',
    description: `A fixed-stat ${RARITY_FLAVOR[entry.rarity]} drop from ${entry.dungeonLabel}, favoring ${variant.label}.`,
    stackable: true,
    equipSlot: entry.slot,
    armorType: variant.armorType,
    statBonuses: { [variant.primary]: primaryVal, [variant.secondary]: secondaryVal },
    rarity: entry.rarity,
    ...(isShieldSlot ? { isShield: true } : {}),
    sellValue: budget * 3,
  };
}

export const DUNGEON_LOOT_ITEMS: Record<string, ItemDef> = {};
// bossMonsterId -> LootDrop[] (itemId/chance/minQty/maxQty), merged into
// that boss's own lootTable in monsters.ts via a spread — see this file's
// module comment for why these are independent per-variant rolls rather
// than a single guaranteed pick.
export const DUNGEON_BOSS_LOOT_DROPS: Record<string, { itemId: string; chance: number; minQty: number; maxQty: number }[]> = {};

for (const entry of DUNGEON_LOOT_SLOTS) {
  const variants = entry.specSubset
    ? SPEC_VARIANTS.filter((v) => entry.specSubset!.includes(v.key))
    : SPEC_VARIANTS;
  const drops = (DUNGEON_BOSS_LOOT_DROPS[entry.bossMonsterId] ??= []);
  for (const variant of variants) {
    const item = buildItem(entry, variant);
    DUNGEON_LOOT_ITEMS[item.id] = item;
    drops.push({ itemId: item.id, chance: entry.chancePerVariant, minQty: 1, maxQty: 1 });
  }
}

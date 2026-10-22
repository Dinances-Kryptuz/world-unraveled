import type { Character } from '../types/character';
import type { AccountState } from './characterSlots';
import { MAX_CHARACTER_LEVEL } from './xpTables';
import { ALL_PROFESSION_IDS, PROFESSION_LABELS } from './professionTiers';
import { COMPANIONS } from './companions';
import { DUNGEONS } from './dungeons';
import { MAX_CHARACTER_SLOTS } from './characterSlots';
import { MATERIALS, LEATHER_MATERIALS, CLOTH_MATERIALS, WOOD_MATERIALS } from './materials';
import { MATERIAL_MASTERY_XP_THRESHOLDS } from './equipmentRolls';
import { ZONES, CONTENT_ZONE_IDS } from './zones';
import { HERBALISM_ZONE_MASTERY_THRESHOLD, FISHING_ZONE_MASTERY_THRESHOLD } from './gatheringEngine';
import { ALCHEMY_ZONE_MASTERY_THRESHOLD } from './alchemyMastery';
import { ENCHANTING_ZONE_MASTERY_THRESHOLD } from './enchantingMastery';
import { COOKING_ZONE_MASTERY_THRESHOLD } from './cookingMastery';
import { TOWER_MILESTONE_FLOORS } from './towerLoot';

// Snapshot-checked, not event-driven: each check() reads CURRENT persisted
// state and either is or isn't true right now. "Unlocked" is still
// permanent and monotonic — see checkNewlyUnlocked below, which only ever
// ADDS ids to Character.unlockedAchievementIds, never removes one even if
// the underlying condition later stops holding (e.g. gold_hoarder after
// spending it all). dungeonClears is the one piece of state that exists
// purely to make an achievement checkable at all (see types/character.ts);
// everything else here reads a field Phase 1-4 already persisted for other
// reasons.
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (character: Character, account: AccountState) => boolean;
}

function totalDungeonClears(character: Character): number {
  return Object.values(character.dungeonClears).reduce((sum, n) => sum + n, 0);
}

// Milestone 4 (Profession Progression overhaul) — one achievement/title
// pair per profession at 25/50/75/100 on the shared 1-100 level scale.
// 25/50/75 are crafting-opportunity-flavored milestones only (explicitly
// no stat bonus, per the design brief); 100 is the genuine profession-
// level-100 capstone. This is a DIFFERENT axis from the zone-Mastery
// "Grandmaster X" achievements elsewhere in this file (generateForager/
// Angler/Alchemist/Enchanter/ChefAchievements, and the material-Mastery
// generators above) — reaching profession level 100 doesn't require
// having mastered every zone's materials, and vice versa; replaces the
// old 1-300-scale skilled_hands/grandmaster achievements, which could
// never be earned again once the profession curve was rescaled to 1-100.
const PROFESSION_MILESTONE_LEVELS = [25, 50, 75, 100] as const;

function generateProfessionLevelAchievements(): AchievementDef[] {
  return ALL_PROFESSION_IDS.flatMap((professionId) =>
    PROFESSION_MILESTONE_LEVELS.map((level) => ({
      id: `level_${level}_${professionId}`,
      name: level === 100 ? `Master ${PROFESSION_LABELS[professionId]}` : `${PROFESSION_LABELS[professionId]} ${level}`,
      description: `Raise ${PROFESSION_LABELS[professionId]} to level ${level}.`,
      check: (c: Character) => (c.professions[professionId]?.level ?? 0) >= level,
    }))
  );
}

export function isMaterialMastered(character: Character, materialId: string): boolean {
  const xp = character.materialMastery?.[materialId]?.xp ?? 0;
  return xp >= (MATERIAL_MASTERY_XP_THRESHOLDS[materialId] ?? Infinity);
}

// One "Master of {name}" achievement per gameData/materials.ts MaterialDef
// — fully data-driven, no per-material id/condition hand-written here. A
// future material only needs registering in MATERIALS to get its own
// achievement (and, via gameData/titles.ts's matching 1:1 id, its own
// title) automatically — see this file's module comment at the top for why
// a later MATERIALS addition can never revoke one of these once earned.
function generateMasteryAchievements(): AchievementDef[] {
  return MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
    description: `Reach 100% ${material.name} Mastery.`,
    check: (c: Character) => isMaterialMastered(c, material.id),
  }));
}

// Unlocks once every CURRENTLY REGISTERED material is mastered. Relies
// entirely on checkNewlyUnlocked's existing property (check() is never
// re-evaluated for an id already in unlockedAchievementIds — see this
// file's module comment) to stay earned forever once awarded: a later
// expansion registering an 11th material makes this check() harder to
// satisfy for players who haven't earned it yet, but can never revoke it
// from someone who already has. No separate "completion set" snapshot or
// version flag is needed for that guarantee.
const MASTER_BLACKSMITH_ACHIEVEMENT: AchievementDef = {
  id: 'master_blacksmith',
  name: 'Master Blacksmith',
  description: 'Reach 100% Mastery in every Blacksmithing material.',
  check: (c) => MATERIALS.every((m) => isMaterialMastered(c, m.id)),
};

// Mirrors generateMasteryAchievements/MASTER_BLACKSMITH_ACHIEVEMENT exactly,
// over LEATHER_MATERIALS instead of MATERIALS — same isMaterialMastered
// check (it only depends on MATERIAL_MASTERY_XP_THRESHOLDS, which already
// has entries for all 6 leather materialIds), same per-material title
// wording the user specified ("Master of Light Leather", etc.).
function generateLeatherMasteryAchievements(): AchievementDef[] {
  return LEATHER_MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
    description: `Reach 100% ${material.name} Mastery.`,
    check: (c: Character) => isMaterialMastered(c, material.id),
  }));
}

const MASTER_LEATHERWORKER_ACHIEVEMENT: AchievementDef = {
  id: 'master_leatherworker',
  name: 'Master Leatherworker',
  description: 'Reach 100% Mastery in every Leatherworking material.',
  check: (c) => LEATHER_MATERIALS.every((m) => isMaterialMastered(c, m.id)),
};

// Mirrors generateLeatherMasteryAchievements/MASTER_LEATHERWORKER_ACHIEVEMENT
// exactly, over CLOTH_MATERIALS instead of LEATHER_MATERIALS — same
// isMaterialMastered check (MATERIAL_MASTERY_XP_THRESHOLDS already has
// entries for all 6 cloth materialIds, see equipmentRolls.ts).
function generateClothMasteryAchievements(): AchievementDef[] {
  return CLOTH_MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
    description: `Reach 100% ${material.name} Mastery.`,
    check: (c: Character) => isMaterialMastered(c, material.id),
  }));
}

const MASTER_TAILOR_ACHIEVEMENT: AchievementDef = {
  id: 'master_tailor',
  name: 'Master Tailor',
  description: 'Reach 100% Mastery in every Tailoring material.',
  check: (c) => CLOTH_MATERIALS.every((m) => isMaterialMastered(c, m.id)),
};

// Mirrors generateClothMasteryAchievements/MASTER_TAILOR_ACHIEVEMENT
// exactly, over WOOD_MATERIALS — Enchanting's combined Wand/Staff/Book
// equipment-Mastery track (one per zone, not per piece).
function generateWoodMasteryAchievements(): AchievementDef[] {
  return WOOD_MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
    description: `Reach 100% ${material.name} Mastery.`,
    check: (c: Character) => isMaterialMastered(c, material.id),
  }));
}

const MASTER_ENCHANTER_EQUIPMENT_ACHIEVEMENT: AchievementDef = {
  id: 'master_enchanter_armaments',
  name: 'Master of Armaments',
  description: 'Reach 100% Mastery in every Enchanting equipment material.',
  check: (c) => WOOD_MATERIALS.every((m) => isMaterialMastered(c, m.id)),
};

export function isHerbalismZoneMastered(character: Character, zoneId: string): boolean {
  const xp = character.herbalismZoneMastery?.[zoneId]?.xp ?? 0;
  return xp >= HERBALISM_ZONE_MASTERY_THRESHOLD;
}

export function isFishingZoneMastered(character: Character, zoneId: string): boolean {
  const xp = character.fishingZoneMastery?.[zoneId]?.xp ?? 0;
  return xp >= FISHING_ZONE_MASTERY_THRESHOLD;
}

export function isAlchemyZoneMastered(character: Character, zoneId: string): boolean {
  const xp = character.alchemyZoneMastery?.[zoneId]?.xp ?? 0;
  return xp >= ALCHEMY_ZONE_MASTERY_THRESHOLD;
}

// Enchanting overhaul's Phase E7 scroll-crafting zone-Mastery — separate
// from isMaterialMastered/MASTER_ENCHANTER_EQUIPMENT_ACHIEVEMENT above
// (the combined Wand/Staff/Book equipment track), per the design brief's
// explicit "separate scroll-crafting Mastery per zone" ask.
export function isEnchantingZoneMastered(character: Character, zoneId: string): boolean {
  const xp = character.enchantingZoneMastery?.[zoneId]?.xp ?? 0;
  return xp >= ENCHANTING_ZONE_MASTERY_THRESHOLD;
}

// Cooking overhaul's own zone-Mastery axis.
export function isCookingZoneMastered(character: Character, zoneId: string): boolean {
  const xp = character.cookingZoneMastery?.[zoneId]?.xp ?? 0;
  return xp >= COOKING_ZONE_MASTERY_THRESHOLD;
}

// One "Master Forager of {zone.name}" achievement per CONTENT_ZONE_IDS
// zone — same fully data-driven, zero-per-zone-hardcoding pattern as
// generateMasteryAchievements above, reading the real ZONES registry
// instead of MATERIALS. Iterates CONTENT_ZONE_IDS, not every zone in
// ZONES/Object.values(ZONES) — Ashenfall (the capital hub) has no herb
// nodes of its own, so a "Master Forager of Ashenfall" entry generated
// from the full ZONES registry would be permanently unearnable; same
// reasoning for the Angler/Alchemist/Enchanter/Chef generators and their
// "every zone" Grandmaster checks below. See CONTENT_ZONE_IDS's doc
// comment in zones.ts.
function generateForagerAchievements(): AchievementDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({
    id: `forager_${zone.id}`,
    name: `Master Forager of ${zone.name}`,
    description: `Reach 100% Herbalism Mastery in ${zone.name}.`,
    check: (c: Character) => isHerbalismZoneMastered(c, zone.id),
  }));
}

const GRANDMASTER_FORAGER_ACHIEVEMENT: AchievementDef = {
  id: 'grandmaster_forager',
  name: 'Grandmaster Forager',
  description: 'Reach 100% Herbalism Mastery in every zone.',
  check: (c) => CONTENT_ZONE_IDS.every((zoneId) => isHerbalismZoneMastered(c, zoneId)),
};

// One "Master Angler of {zone.name}" achievement per CONTENT_ZONE_IDS zone
// — same fully data-driven pattern as generateForagerAchievements, over
// the Fishing overhaul's own zone-Mastery axis.
function generateAnglerAchievements(): AchievementDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({
    id: `angler_${zone.id}`,
    name: `Master Angler of ${zone.name}`,
    description: `Reach 100% Fishing Mastery in ${zone.name}.`,
    check: (c: Character) => isFishingZoneMastered(c, zone.id),
  }));
}

const GRANDMASTER_ANGLER_ACHIEVEMENT: AchievementDef = {
  id: 'grandmaster_angler',
  name: 'Grandmaster Angler',
  description: 'Reach 100% Fishing Mastery in every zone.',
  check: (c) => CONTENT_ZONE_IDS.every((zoneId) => isFishingZoneMastered(c, zoneId)),
};

function generateAlchemistAchievements(): AchievementDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({
    id: `alchemist_${zone.id}`,
    name: `Master Alchemist of ${zone.name}`,
    description: `Reach 100% Alchemy Mastery in ${zone.name}.`,
    check: (c: Character) => isAlchemyZoneMastered(c, zone.id),
  }));
}

const GRANDMASTER_ALCHEMIST_ACHIEVEMENT: AchievementDef = {
  id: 'grandmaster_alchemist',
  name: 'Grandmaster Alchemist',
  description: 'Reach 100% Alchemy Mastery in every zone.',
  check: (c) => CONTENT_ZONE_IDS.every((zoneId) => isAlchemyZoneMastered(c, zoneId)),
};

// Enchanting overhaul's Phase E7 scroll-crafting zone-Mastery — "Enchanter"
// (not "Alchemist"/"Blacksmith") to read distinctly from the equipment-side
// MASTER_ENCHANTER_EQUIPMENT_ACHIEVEMENT ("Master of Armaments") above.
function generateEnchanterAchievements(): AchievementDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({
    id: `enchanter_${zone.id}`,
    name: `Master Enchanter of ${zone.name}`,
    description: `Reach 100% scroll-crafting Mastery in ${zone.name}.`,
    check: (c: Character) => isEnchantingZoneMastered(c, zone.id),
  }));
}

// Cooking overhaul — "Chef" (not "Alchemist"/"Enchanter"/"Blacksmith"),
// one "Master Chef of {zone.name}" achievement per CONTENT_ZONE_IDS zone.
function generateChefAchievements(): AchievementDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({
    id: `chef_${zone.id}`,
    name: `Master Chef of ${zone.name}`,
    description: `Reach 100% Cooking Mastery in ${zone.name}.`,
    check: (c: Character) => isCookingZoneMastered(c, zone.id),
  }));
}

const GRANDMASTER_CHEF_ACHIEVEMENT: AchievementDef = {
  id: 'grandmaster_chef',
  name: 'Grandmaster Chef',
  description: 'Reach 100% Cooking Mastery in every zone.',
  check: (c) => CONTENT_ZONE_IDS.every((zoneId) => isCookingZoneMastered(c, zoneId)),
};

const GRANDMASTER_ENCHANTER_ACHIEVEMENT: AchievementDef = {
  id: 'grandmaster_enchanter',
  name: 'Grandmaster Enchanter',
  description: 'Reach 100% scroll-crafting Mastery in every zone.',
  check: (c) => CONTENT_ZONE_IDS.every((zoneId) => isEnchantingZoneMastered(c, zoneId)),
};

// One "Floor N Conqueror" achievement per gameData/towerLoot.ts milestone
// floor — fully data-driven like every generator above, reading
// TOWER_MILESTONE_FLOORS instead of hand-listing 10/20/.../100. Checked
// against towerHighestFloor (a lifetime personal-best, per types/character.ts's
// doc comment on that field), so this can never be revoked by the 3-fail
// drop-back rule even though that rule can temporarily lower the field —
// checkNewlyUnlocked (firebase side) only ever adds ids, never removes one.
function generateTowerAchievements(): AchievementDef[] {
  return TOWER_MILESTONE_FLOORS.map((floor) => ({
    id: `tower_floor_${floor}`,
    name: `Floor ${floor} Conqueror`,
    description: `Reach floor ${floor} of the Tower of Infinity.`,
    check: (c: Character) => (c.towerHighestFloor ?? 0) >= floor,
  }));
}

// The Citadel of Krypt — reuses Character.dungeonClears exactly like any
// other dungeon's own achievements would (Citadel Levels 1-3 are, under the
// hood, just three more Dungeon entries — see dungeons.ts's own doc
// comment), so no new Character field was needed for any of this.
const CITADEL_LEVEL_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'citadel_level_1_cleared',
    name: 'Into the Citadel',
    description: 'Clear the Citadel of Krypt: Outer Swarm.',
    check: (c) => (c.dungeonClears['citadel_level_1'] ?? 0) > 0,
  },
  {
    id: 'citadel_level_2_cleared',
    name: 'The Cultist Halls',
    description: 'Clear the Citadel of Krypt: Cultist Halls.',
    check: (c) => (c.dungeonClears['citadel_level_2'] ?? 0) > 0,
  },
  {
    id: 'citadel_level_3_cleared',
    name: 'The Firelord Falls',
    description: 'Defeat Krypt the Firelord.',
    check: (c) => (c.dungeonClears['citadel_level_3'] ?? 0) > 0,
  },
  {
    id: 'citadel_full_cleared',
    name: 'The Unbroken Citadel',
    description: 'Clear the full Citadel of Krypt — all three levels — in a single run.',
    check: (c) => (c.dungeonClears['citadel_full'] ?? 0) > 0,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...generateMasteryAchievements(),
  MASTER_BLACKSMITH_ACHIEVEMENT,
  ...generateLeatherMasteryAchievements(),
  MASTER_LEATHERWORKER_ACHIEVEMENT,
  ...generateClothMasteryAchievements(),
  MASTER_TAILOR_ACHIEVEMENT,
  ...generateWoodMasteryAchievements(),
  MASTER_ENCHANTER_EQUIPMENT_ACHIEVEMENT,
  ...generateForagerAchievements(),
  GRANDMASTER_FORAGER_ACHIEVEMENT,
  ...generateAnglerAchievements(),
  GRANDMASTER_ANGLER_ACHIEVEMENT,
  ...generateAlchemistAchievements(),
  GRANDMASTER_ALCHEMIST_ACHIEVEMENT,
  ...generateEnchanterAchievements(),
  GRANDMASTER_ENCHANTER_ACHIEVEMENT,
  ...generateChefAchievements(),
  GRANDMASTER_CHEF_ACHIEVEMENT,
  ...generateTowerAchievements(),
  ...CITADEL_LEVEL_ACHIEVEMENTS,
  { id: 'first_steps', name: 'First Steps', description: 'Reach character level 5.', check: (c) => c.level >= 5 },
  { id: 'adventurer', name: 'Adventurer', description: 'Reach character level 25.', check: (c) => c.level >= 25 },
  { id: 'veteran', name: 'Veteran', description: 'Reach character level 40.', check: (c) => c.level >= 40 },
  {
    id: 'max_level',
    name: 'Max Level',
    description: `Reach character level ${MAX_CHARACTER_LEVEL}.`,
    check: (c) => c.level >= MAX_CHARACTER_LEVEL,
  },
  {
    id: 'apprentice_of_a_trade',
    name: 'Apprentice of a Trade',
    description: 'Learn your first profession.',
    check: (c) => Object.keys(c.professions).length >= 1,
  },
  {
    id: 'jack_of_all_trades',
    name: 'Jack of All Trades',
    description: 'Learn all 10 professions.',
    check: (c) => ALL_PROFESSION_IDS.every((id) => !!c.professions[id]),
  },
  ...generateProfessionLevelAchievements(),
  {
    id: 'making_friends',
    name: 'Making Friends',
    description: 'Recruit your first companion.',
    check: (c) => Object.keys(c.companions).length >= 1,
  },
  {
    id: 'full_roster',
    name: 'Full Roster',
    description: 'Recruit every companion.',
    check: (c) => Object.keys(COMPANIONS).every((id) => !!c.companions[id]),
  },
  {
    id: 'dungeon_delver',
    name: 'Dungeon Delver',
    description: 'Fully clear a dungeon.',
    check: (c) => totalDungeonClears(c) >= 1,
  },
  {
    id: 'seasoned_raider',
    name: 'Seasoned Raider',
    description: 'Fully clear dungeons 25 times, lifetime.',
    check: (c) => totalDungeonClears(c) >= 25,
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Fully clear every dungeon at least once.',
    check: (c) => Object.keys(DUNGEONS).every((id) => (c.dungeonClears[id] ?? 0) >= 1),
  },
  { id: 'gold_hoarder', name: 'Gold Hoarder', description: 'Have 10,000 gold at once.', check: (c) => c.gold >= 10000 },
  { id: 'wealthy', name: 'Wealthy', description: 'Have 100,000 gold at once.', check: (c) => c.gold >= 100000 },
  {
    id: 'bank_vault',
    name: 'Bank Vault',
    description: 'Own 10 or more bank slots.',
    check: (c) => c.bankSlots >= 10,
  },
  {
    id: 'quest_taker',
    name: 'Quest Taker',
    description: 'Complete your first quest.',
    check: (c) => c.quests.completedIds.length >= 1,
  },
  {
    id: 'quest_master',
    name: 'Quest Master',
    description: 'Complete 25 quests, lifetime.',
    check: (c) => c.quests.completedIds.length >= 25,
  },
  {
    id: 'family_business',
    name: 'Family Business',
    description: 'Unlock a second character slot.',
    check: (_c, account) => account.unlockedSlots >= 2,
  },
  {
    id: 'dynasty',
    name: 'Dynasty',
    description: `Unlock all ${MAX_CHARACTER_SLOTS} character slots.`,
    check: (_c, account) => account.unlockedSlots >= MAX_CHARACTER_SLOTS,
  },
];

// Returns ids newly true this check that aren't already in
// unlockedAchievementIds — callers (CollectionScreen) persist these with an
// arrayUnion-style merge, never a replace, so the permanent list only ever
// grows.
export function checkNewlyUnlocked(character: Character, account: AccountState): string[] {
  const already = new Set(character.unlockedAchievementIds);
  return ACHIEVEMENTS.filter((a) => !already.has(a.id) && a.check(character, account)).map((a) => a.id);
}

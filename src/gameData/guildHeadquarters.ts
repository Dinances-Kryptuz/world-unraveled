// Guild Leveling, Headquarters, and Restoration (Phase 5) — mirrors
// functions/src/guildHeadquarters.ts's own constants (same small-duplication
// precedent as every other Cloud Function in this feature).
//
// guild.level/headquartersTier are stored fields from Phase 2 but were
// never actually advanced — rather than retrofitting every Phase 3/4
// guild-XP write with a level-up side effect, level and HQ tier are
// computed FRESH from guild.xp wherever they're needed (the same "derive
// on read" posture already used elsewhere in this codebase, e.g. Journal's
// discoveredZoneIds backfill). The stored fields are harmless but unused.

export function cumulativeXpForGuildLevel(level: number): number {
  return 100 * (level - 1) * (level - 1);
}

export function guildLevelForXp(xp: number): number {
  let level = 1;
  while (cumulativeXpForGuildLevel(level + 1) <= xp) level++;
  return level;
}

export function guildXpProgress(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const level = guildLevelForXp(xp);
  const xpIntoLevel = xp - cumulativeXpForGuildLevel(level);
  const xpForNextLevel = cumulativeXpForGuildLevel(level + 1) - cumulativeXpForGuildLevel(level);
  return { level, xpIntoLevel, xpForNextLevel };
}

export const HEADQUARTERS_TIER_NAMES = ['Small Lodge', 'Guild Hall', 'Guild Manor', 'Guild Fortress'];

export function headquartersTierForLevel(level: number): number {
  if (level >= 20) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

export type RoomId = 'storehouse' | 'workshop' | 'barracks' | 'warroom' | 'library' | 'trophyhall';

export const ROOM_IDS: RoomId[] = ['storehouse', 'workshop', 'barracks', 'warroom', 'library', 'trophyhall'];

export const ROOM_MAX_LEVEL = 5;

export const ROOM_LABELS: Record<RoomId, string> = {
  storehouse: 'Storehouse',
  workshop: 'Workshop',
  barracks: 'Barracks',
  warroom: 'War Room',
  library: 'Library',
  trophyhall: 'Trophy Hall',
};

// Bonus % granted per upgrade level, capped at ROOM_MAX_LEVEL levels.
// Storehouse/Workshop are computed here and folded into
// useGuildMilestoneBonuses' gatheringTimePct/materialPreservePct fields
// (hooks/useGuildMilestones.tsx) — gatheringEngine.ts/craftingEngine.ts
// stay pure/Firestore-free, the hook is what reads the guild doc and
// hands the combined (level milestone + room) bonus to every consumer.
// Barracks/War Room/Library are wired in server-side instead, since
// functions/src/contracts.ts and expeditions.ts already touch the guild
// doc in the same transaction that would need to read them.
export const ROOM_BONUS_PER_LEVEL: Record<RoomId, number> = {
  storehouse: 0.6, // % gathering speed
  workshop: 0.4, // % crafting material preservation
  barracks: 1, // % companion contribution efficiency — wired into claimCompanionContributions
  warroom: 1, // % expedition Seals/XP reward — wired into claimExpedition
  library: 1, // % guild XP gain from contracts/expeditions — wired into both
  trophyhall: 0, // cosmetic only — displays the guild's momentum/achievements, no mechanical bonus
};

export const ROOM_BONUS_LABEL: Record<RoomId, string> = {
  storehouse: 'Gathering Speed',
  workshop: 'Crafting Material Preservation',
  barracks: 'Companion Contribution Efficiency',
  warroom: 'Expedition Rewards',
  library: 'Guild XP Gain',
  trophyhall: 'Cosmetic Only',
};

export function roomBonusPct(roomId: RoomId, level: number): number {
  return ROOM_BONUS_PER_LEVEL[roomId] * level;
}

export function roomUpgradeCost(currentLevel: number): number {
  return 500 * Math.pow(2, currentLevel);
}

export interface RestorationProject {
  id: string;
  name: string;
  description: string;
  cost: number;
  titleId: string;
}

export const RESTORATION_PROJECTS: RestorationProject[] = [
  {
    id: 'fountain_square',
    name: 'Restore the Fountain Square',
    description: "Clear the rubble from Ashenfall's old fountain square.",
    cost: 1000,
    titleId: 'patron_of_ashenfall',
  },
  {
    id: 'banner_hall',
    name: 'Rebuild the Banner Hall',
    description: 'Raise a hall of banners for every guild that calls Ashenfall home.',
    cost: 2000,
    titleId: 'banner_bearer',
  },
  {
    id: 'old_archive',
    name: 'Repair the Old Archive',
    description: 'Restore the archive that once held the city\'s lost knowledge.',
    cost: 3000,
    titleId: 'keeper_of_lore',
  },
  {
    id: 'training_yard',
    name: 'Reforge the Training Yard',
    description: 'Rebuild the yard where Ashenfall once trained its defenders.',
    cost: 4000,
    titleId: 'vanguard_of_ashenfall',
  },
  {
    id: 'beacon_tower',
    name: 'Light the Beacon Tower',
    description: "Relight the tower that once guided travelers home.",
    cost: 6000,
    titleId: 'beacon_of_the_guild',
  },
];

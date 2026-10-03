import type { Character } from '../types/character';
import type { AccountState } from './characterSlots';
import { MAX_CHARACTER_LEVEL } from './xpTables';
import { ALL_PROFESSION_IDS } from './professionTiers';
import { COMPANIONS } from './companions';
import { DUNGEONS } from './dungeons';
import { MAX_CHARACTER_SLOTS } from './characterSlots';

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

function maxProfessionSkill(character: Character): number {
  return Object.values(character.professions).reduce((max, p) => Math.max(max, p?.level ?? 0), 0);
}

export const ACHIEVEMENTS: AchievementDef[] = [
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
  {
    id: 'skilled_hands',
    name: 'Skilled Hands',
    description: 'Raise any profession to skill 150.',
    check: (c) => maxProfessionSkill(c) >= 150,
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    description: 'Raise any profession to the skill cap (300).',
    check: (c) => maxProfessionSkill(c) >= 300,
  },
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

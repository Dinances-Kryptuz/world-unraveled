import type { ProfessionId, ProfessionTierDef, ProfessionTierName } from './types';
import type { ProfessionState } from '../types/character';

// A character.professions[id] lookup is always a Partial — this gives
// callers a safe level-0 fallback for a profession that isn't known (or, in
// a live React render, hasn't round-tripped from an optimistic update yet)
// instead of every call site needing its own null-check.
const UNKNOWN_PROFESSION_STATE: ProfessionState = { level: 0, xp: 0, unlockedTier: 'apprentice' };

export function getProfessionState(
  professions: Partial<Record<ProfessionId, ProfessionState>>,
  id: ProfessionId
): ProfessionState {
  return professions[id] ?? UNKNOWN_PROFESSION_STATE;
}

// Central profession metadata: which of the 10 professions exist, their
// primary/secondary classification (descriptive only — crafting/gathering
// vs. convenience professions; there is no slot limit on either, by design:
// a character can know all 10 at once), their display labels, and the rank
// system (skill bands, gold costs, and the character-level gate for
// training each rank — all data, not hardcoded per-profession logic, so
// adding an 11th profession or changing a level gate never touches the
// gating functions below).

export const ALL_PROFESSION_IDS: ProfessionId[] = [
  'herbalism', 'skinning', 'mining', 'fishing',
  'alchemy', 'leatherworking', 'smithing', 'tailoring', 'enchanting', 'cooking',
];

// Engineering is intentionally excluded — see the project's profession design brief.
export const PRIMARY_PROFESSIONS: ProfessionId[] = [
  'herbalism', 'skinning', 'mining', 'alchemy', 'leatherworking', 'smithing', 'tailoring', 'enchanting',
];
export const SECONDARY_PROFESSIONS: ProfessionId[] = ['fishing', 'cooking'];

export function isPrimaryProfession(id: ProfessionId): boolean {
  return PRIMARY_PROFESSIONS.includes(id);
}

// 'smithing' is the long-standing internal id for Blacksmithing — see the
// doc comment on ProfessionId in types.ts for why it isn't renamed.
export const PROFESSION_LABELS: Record<ProfessionId, string> = {
  herbalism: 'Herbalism',
  skinning: 'Skinning',
  mining: 'Mining',
  fishing: 'Fishing',
  alchemy: 'Alchemy',
  leatherworking: 'Leatherworking',
  smithing: 'Blacksmithing',
  tailoring: 'Tailoring',
  enchanting: 'Enchanting',
  cooking: 'Cooking',
};

// Which category of level-requirement table (below) a profession uses when
// training a rank. Gathering professions use "no requirement" for their
// first two ranks per the design brief, despite higher-level zones/nodes
// naturally gating access anyway.
export type ProfessionCategory = 'production' | 'fishing' | 'gathering';

export const PROFESSION_CATEGORY: Record<ProfessionId, ProfessionCategory> = {
  herbalism: 'gathering',
  skinning: 'gathering',
  mining: 'gathering',
  fishing: 'fishing',
  alchemy: 'production',
  leatherworking: 'production',
  smithing: 'production',
  tailoring: 'production',
  enchanting: 'production',
  cooking: 'production',
};

// Character level required to TRAIN each rank (0 = no requirement). Keyed
// by category rather than individual profession, per the design brief's
// explicit per-category tables. 'production's `master` entry is otherwise
// unreachable — the 6 crafting professions' own rank table (PROFESSION_TIERS
// below) only ever has 4 ranks — it exists purely because ProfessionTierName
// is one shared enum across every profession's unlockedTier field.
export const RANK_LEVEL_REQUIREMENT: Record<ProfessionCategory, Record<ProfessionTierName, number>> = {
  production: { apprentice: 5, journeyman: 10, expert: 20, artisan: 35, master: 0 },
  fishing: { apprentice: 0, journeyman: 10, expert: 10, artisan: 10, master: 10 },
  gathering: { apprentice: 0, journeyman: 0, expert: 10, artisan: 25, master: 40 },
};

export function requiredCharacterLevelForRank(profession: ProfessionId, rank: ProfessionTierName): number {
  return RANK_LEVEL_REQUIREMENT[PROFESSION_CATEGORY[profession]][rank];
}

// Skill bands and gold cost for the 6 CRAFTING professions (category
// 'production', including Smithing — crafting is explicitly out of scope
// for the 1-100 gathering redesign and keeps this original 4-rank/1-300
// system unchanged). apprentice.goldCost is also the one-time cost to LEARN
// the profession in the first place (there's no separate "learn"
// transaction in classic WoW — becoming Apprentice IS learning it) — "very
// cheap," per the design brief. The curve then rises to "expensive" at
// Artisan without approaching the game's real gold sinks (respec, high-
// level vendor gear).
export const PROFESSION_TIERS: ProfessionTierDef[] = [
  { tier: 'apprentice', minSkill: 1, maxSkill: 75, goldCost: 5 },
  { tier: 'journeyman', minSkill: 76, maxSkill: 150, goldCost: 25 },
  { tier: 'expert', minSkill: 151, maxSkill: 225, goldCost: 100 },
  { tier: 'artisan', minSkill: 226, maxSkill: 300, goldCost: 400 },
];

// Skill bands and gold cost for the 4 GATHERING professions (Mining,
// Herbalism, Skinning, Fishing) on the 1-100 XP+Mastery system — see
// gatheringEngine.ts's module doc comment for the full design. Same 4x-ish
// cost ratio as the crafting table above, extended one more rank (Master).
export const GATHERING_PROFESSION_TIERS: ProfessionTierDef[] = [
  { tier: 'apprentice', minSkill: 1, maxSkill: 20, goldCost: 5 },
  { tier: 'journeyman', minSkill: 21, maxSkill: 40, goldCost: 25 },
  { tier: 'expert', minSkill: 41, maxSkill: 60, goldCost: 100 },
  { tier: 'artisan', minSkill: 61, maxSkill: 80, goldCost: 400 },
  { tier: 'master', minSkill: 81, maxSkill: 100, goldCost: 1600 },
];

// Gathering and Fishing (categories 'gathering'/'fishing') use the 1-100
// table above; every other profession (category 'production') uses the
// original 1-300 one. One switch point so the many call sites below never
// need to know which category they're dealing with.
function tiersFor(profession: ProfessionId): ProfessionTierDef[] {
  const category = PROFESSION_CATEGORY[profession];
  return category === 'production' ? PROFESSION_TIERS : GATHERING_PROFESSION_TIERS;
}

// Which rank a bare level number falls into on the 1-100 gathering table,
// independent of what rank is actually unlocked — used by the one-time
// legacy gathering-profession data migration (see firebase/character.ts's
// getCharacter) to pick a sane unlockedTier for a freshly-rescaled level,
// since a player's OLD unlockedTier (from the crafting-shaped 4-rank table)
// doesn't correspond to anything meaningful on the new 5-rank one.
export function gatheringTierForLevel(level: number): ProfessionTierName {
  const tier = GATHERING_PROFESSION_TIERS.find((t) => level >= t.minSkill && level <= t.maxSkill);
  return (tier ?? GATHERING_PROFESSION_TIERS[GATHERING_PROFESSION_TIERS.length - 1]).tier;
}

// Crafting-only (see tiersFor) — masteryEngine.ts's Smithing XP curve is the
// only remaining caller, since every gathering profession now resolves
// entirely through gatheringEngine.ts's own flat xpForLevel curve instead
// of a per-rank-table one.
export function getTierForSkillLevel(skill: number): ProfessionTierDef {
  const tier = PROFESSION_TIERS.find((t) => skill >= t.minSkill && skill <= t.maxSkill);
  return tier ?? PROFESSION_TIERS[PROFESSION_TIERS.length - 1];
}

export function tierIndex(profession: ProfessionId, tier: ProfessionTierName): number {
  return tiersFor(profession).findIndex((t) => t.tier === tier);
}

export function nextTier(profession: ProfessionId, tier: ProfessionTierName): ProfessionTierDef | null {
  const tiers = tiersFor(profession);
  const next = tiers[tierIndex(profession, tier) + 1];
  return next ?? null;
}

// A profession's skill is only ever allowed to climb to the ceiling of its
// CURRENTLY unlocked rank — e.g. stuck at 20 until Journeyman is trained —
// which is the entire point of ranks gating content. See
// firebase/character.ts's applyCraftingResult/applyGatheringProfessionResult
// and firebase/professions.ts's applyFishingResult.
export function maxSkillForUnlockedTier(profession: ProfessionId, unlockedTier: ProfessionTierName): number {
  const tiers = tiersFor(profession);
  return (tiers.find((t) => t.tier === unlockedTier) ?? tiers[0]).maxSkill;
}

export interface RankUpCheck {
  ok: boolean;
  reason?: string;
  goldCost: number;
  requiredCharacterLevel: number;
}

// Pure gating check for training the NEXT rank up from a profession's
// current unlockedTier — shared by the UI (to grey out/explain the button)
// and firebase/professions.ts (to re-validate before spending gold server
// side, same "don't trust the client" posture as the rest of this project).
export function checkRankUp(
  profession: ProfessionId,
  currentSkill: number,
  currentUnlockedTier: ProfessionTierName,
  characterLevel: number,
  gold: number
): RankUpCheck {
  const next = nextTier(profession, currentUnlockedTier);
  if (!next) {
    const topRank = PROFESSION_CATEGORY[profession] === 'production' ? 'Artisan' : 'Master';
    return { ok: false, reason: `Already ${topRank} — no further rank to train.`, goldCost: 0, requiredCharacterLevel: 0 };
  }

  const currentTierDef = tiersFor(profession).find((t) => t.tier === currentUnlockedTier)!;
  const requiredCharacterLevel = requiredCharacterLevelForRank(profession, next.tier);

  if (currentSkill < currentTierDef.maxSkill) {
    return {
      ok: false,
      reason: `Reach ${currentTierDef.maxSkill} skill in your current rank first (currently ${currentSkill}).`,
      goldCost: next.goldCost,
      requiredCharacterLevel,
    };
  }
  if (characterLevel < requiredCharacterLevel) {
    return {
      ok: false,
      reason: `Requires character level ${requiredCharacterLevel} (currently ${characterLevel}).`,
      goldCost: next.goldCost,
      requiredCharacterLevel,
    };
  }
  if (gold < next.goldCost) {
    return {
      ok: false,
      reason: `Requires ${next.goldCost} gold (have ${Math.floor(gold)}).`,
      goldCost: next.goldCost,
      requiredCharacterLevel,
    };
  }
  return { ok: true, goldCost: next.goldCost, requiredCharacterLevel };
}

export interface LearnProfessionCheck {
  ok: boolean;
  reason?: string;
  goldCost: number;
}

// Pure gating check for learning a profession for the very first time
// (apprentice rank) — no slot limit on how many professions a character can
// know (primary or secondary); only gold and character level gate it.
export function checkLearnProfession(
  profession: ProfessionId,
  alreadyKnown: ProfessionId[],
  characterLevel: number,
  gold: number
): LearnProfessionCheck {
  const apprentice = tiersFor(profession)[0];
  if (alreadyKnown.includes(profession)) {
    return { ok: false, reason: 'Already known.', goldCost: apprentice.goldCost };
  }
  const requiredCharacterLevel = requiredCharacterLevelForRank(profession, 'apprentice');
  if (characterLevel < requiredCharacterLevel) {
    return { ok: false, reason: `Requires character level ${requiredCharacterLevel}.`, goldCost: apprentice.goldCost };
  }
  if (gold < apprentice.goldCost) {
    return { ok: false, reason: `Requires ${apprentice.goldCost} gold.`, goldCost: apprentice.goldCost };
  }
  return { ok: true, goldCost: apprentice.goldCost };
}

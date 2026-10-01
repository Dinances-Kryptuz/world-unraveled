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
// explicit per-category tables.
export const RANK_LEVEL_REQUIREMENT: Record<ProfessionCategory, Record<ProfessionTierName, number>> = {
  production: { apprentice: 5, journeyman: 10, expert: 20, artisan: 35 },
  fishing: { apprentice: 0, journeyman: 10, expert: 10, artisan: 10 },
  gathering: { apprentice: 0, journeyman: 0, expert: 10, artisan: 25 },
};

export function requiredCharacterLevelForRank(profession: ProfessionId, rank: ProfessionTierName): number {
  return RANK_LEVEL_REQUIREMENT[PROFESSION_CATEGORY[profession]][rank];
}

// Skill bands and gold cost are universal across all 10 professions.
// apprentice.goldCost is also the one-time cost to LEARN the profession in
// the first place (there's no separate "learn" transaction in classic WoW —
// becoming Apprentice IS learning it) — "very cheap," per the design brief.
// The curve then rises to "expensive" at Artisan without approaching the
// game's real gold sinks (respec, high-level vendor gear).
export const PROFESSION_TIERS: ProfessionTierDef[] = [
  { tier: 'apprentice', minSkill: 1, maxSkill: 75, goldCost: 5 },
  { tier: 'journeyman', minSkill: 76, maxSkill: 150, goldCost: 25 },
  { tier: 'expert', minSkill: 151, maxSkill: 225, goldCost: 100 },
  { tier: 'artisan', minSkill: 226, maxSkill: 300, goldCost: 400 },
];

export function getTierForSkillLevel(skill: number): ProfessionTierDef {
  const tier = PROFESSION_TIERS.find((t) => skill >= t.minSkill && skill <= t.maxSkill);
  return tier ?? PROFESSION_TIERS[PROFESSION_TIERS.length - 1];
}

export function tierIndex(tier: ProfessionTierName): number {
  return PROFESSION_TIERS.findIndex((t) => t.tier === tier);
}

export function nextTier(tier: ProfessionTierName): ProfessionTierDef | null {
  const next = PROFESSION_TIERS[tierIndex(tier) + 1];
  return next ?? null;
}

// A profession's skill is only ever allowed to climb to the ceiling of its
// CURRENTLY unlocked rank — e.g. stuck at 75 until Journeyman is trained —
// which is the entire point of ranks gating content. See
// firebase/character.ts's checkAndApplyProfessionLevelUp.
export function maxSkillForUnlockedTier(unlockedTier: ProfessionTierName): number {
  return (PROFESSION_TIERS.find((t) => t.tier === unlockedTier) ?? PROFESSION_TIERS[0]).maxSkill;
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
  const next = nextTier(currentUnlockedTier);
  if (!next) return { ok: false, reason: 'Already Artisan — no further rank to train.', goldCost: 0, requiredCharacterLevel: 0 };

  const currentTierDef = PROFESSION_TIERS.find((t) => t.tier === currentUnlockedTier)!;
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
  const apprentice = PROFESSION_TIERS[0];
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

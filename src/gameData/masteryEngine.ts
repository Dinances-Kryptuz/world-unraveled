// A parallel profession engine for Mining and Smithing — the two professions
// piloting the "Gathering Progression Overhaul" design (one gathering skill,
// one crafting skill) before any decision on rolling it out further. The
// other 8 professions (Herbalism, Skinning, Fishing, Alchemy, Leatherworking,
// Tailoring, Enchanting, Cooking) are untouched and keep using
// activityEngine.ts's discrete skill-up-chance model exactly as shipped.
//
// This engine reuses GatherNode/Recipe's existing requiredLevel/
// colorBreakpoints fields (they already match the design's
// requiredSkill/orangeUntil/yellowUntil/greenUntil shape) but changes what
// the color MEANS for these two professions: a continuous Profession-XP-rate
// multiplier (100/65/30/10%) rather than a discrete skill-up chance, with
// Grey deliberately never zero. A second, independent axis — Item Mastery,
// 0-10 per specific resource/crafted item — tracks gathering/crafting
// efficiency for that one thing, separate from what the profession's overall
// skill unlocks.
import { getTierForSkillLevel } from './professionTiers';
import { resolveElapsedProgress } from './activityEngine';
import type { ProfessionId, ProfessionTierName } from './types';

// Only these two professions use this engine — checked by callers (UI,
// firebase writers) to decide which engine/persistence path applies.
export const MASTERY_PILOT_PROFESSIONS: ProfessionId[] = ['mining', 'smithing'];
export function usesMasteryEngine(profession: ProfessionId): boolean {
  return MASTERY_PILOT_PROFESSIONS.includes(profession);
}

// ── Profession XP curve ──────────────────────────────────────────────────
// XP required to go from `level` to `level + 1` — NOT a cumulative total
// (unlike the old shared professionXpForLevel, which this replaces for
// these two professions only). Scales up within each rank, and jumps again
// at each rank boundary, so Apprentice is quick and Artisan is a real grind.
// Central config, easy to retune without touching the resolvers below.
//
// Rebalanced from an earlier (150/400/1000/2200, exponent 1.35) pass that,
// simulated against the real Mining node table under optimal play (always on
// the best currently-unlocked ore, per-node Mastery resetting on each
// switch), worked out to ~46,000 hours for a full 1->300 climb — and made
// the very first 10 levels (to unlock Tin Ore) alone cost 4.8 hours, with
// the single level 9->10 step costing more XP than levels 1->8 combined.
// This curve targets ~150 hours for the same 1->300 climb (apprentice done
// in under an hour, journeyman by ~14h, expert by ~58h — the back half of
// artisan, grinding the endgame ore long after its node has gone Grey past
// skill 118, is deliberately where most of the 150 hours lives). The lower
// exponent (1.0 vs 1.35) also flattens the WITHIN-rank shape so late levels
// in a rank don't balloon disproportionately against early ones — same
// relative rank-to-rank jump (roughly 1:2.5:6.5:14), just far less overall
// weight and a gentler climb inside each rank.
const RANK_BASE_XP: Record<ProfessionTierName, number> = {
  apprentice: 2,
  journeyman: 5,
  expert: 13,
  artisan: 28,
};
const RANK_XP_EXPONENT = 1.0;

export function masteryProfessionXpForNextLevel(level: number): number {
  const tier = getTierForSkillLevel(level);
  const levelInRank = level - tier.minSkill + 1; // 1-based position within the current rank
  return Math.round(RANK_BASE_XP[tier.tier] * Math.pow(levelInRank, RANK_XP_EXPONENT));
}

// ── Difficulty colors ────────────────────────────────────────────────────
// Same four-tier shape as activityEngine.ts's craftingColorTier, but the
// percentages represent a continuous Profession-XP rate instead of a
// discrete skill-up chance, and Grey is 10%, never 0 — per the design,
// "gathering Copper is still worth something" even once far outlevelled,
// which matters most for idle/offline play crossing from Green into Grey
// mid-session.
export type MasteryColorTier = 'orange' | 'yellow' | 'green' | 'grey';

export const MASTERY_COLOR_XP_PCT: Record<MasteryColorTier, number> = {
  orange: 1.0,
  yellow: 0.65,
  green: 0.3,
  grey: 0.1,
};

export function masteryColorTier(
  currentSkill: number,
  colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number }
): MasteryColorTier {
  if (currentSkill <= colorBreakpoints.orangeUntil) return 'orange';
  if (currentSkill <= colorBreakpoints.yellowUntil) return 'yellow';
  if (currentSkill <= colorBreakpoints.greenUntil) return 'green';
  return 'grey';
}

// ── Item Mastery ─────────────────────────────────────────────────────────
// Per-resource (Mining) or per-crafted-item (Smithing) skill within a skill.
// Levels 0-10, independent of profession color — gathering/crafting the
// same thing is equally good practice at it whether the node/recipe is
// currently Orange or Grey to your profession skill.
export const MASTERY_MAX_LEVEL = 10;

// "+X% speed" multiplies the action RATE by (1 + X), so the interval is
// divided by (1 + X) — never subtract X from the duration directly (a flat
// subtraction would make high mastery give disproportionately more benefit
// on already-fast actions). Index = mastery level.
const MASTERY_SPEED_BONUS_PCT: number[] = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

export function masterySpeedMultiplier(masteryLevel: number): number {
  const clamped = Math.max(0, Math.min(MASTERY_MAX_LEVEL, masteryLevel));
  return 1 + MASTERY_SPEED_BONUS_PCT[clamped] / 100;
}

// Milestone-only, not cumulative-additive — Mastery 10 means a 5% chance of
// a bonus unit, not 2% + 5%. Capped low on purpose (at most +20% speed and
// +5% bonus chance, about 1.26x total output at the top) so Mastery rewards
// specializing without trivializing the profession skill grind itself.
export function masteryBonusChance(masteryLevel: number): number {
  if (masteryLevel >= 10) return 0.05;
  if (masteryLevel >= 5) return 0.02;
  return 0;
}

const MASTERY_XP_BASE = 40;
const MASTERY_XP_EXPONENT = 1.6;

export function masteryXpForNextLevel(masteryLevel: number): number {
  return Math.round(MASTERY_XP_BASE * Math.pow(masteryLevel + 1, MASTERY_XP_EXPONENT));
}

// ── Gathering (Mining) ───────────────────────────────────────────────────

export interface MasteryGatherNodeLike {
  itemId: string;
  baseProfessionXp: number;
  secondsPerAction: number;
  requiredLevel: number;
  colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number };
  rareBonus?: { itemId: string; chance: number };
}

export interface MasteryGatherResult {
  itemId: string;
  quantityGained: number; // guaranteed units only — rareBonusQuantity is separate
  rareBonusQuantity: number;
  professionXpGained: number;
  masteryXpGained: number;
  actionsAttempted: number;
  colorTier: MasteryColorTier;
  xpPct: number; // for UI display, e.g. "Yellow — 65% XP"
}

// Live per-autosave-chunk resolution — one skill/mastery snapshot for the
// whole elapsed window, same granularity convention activityEngine.ts's
// resolveGathering already uses (negligible error at a ~20s autosave
// cadence). The offline resolver below is the one that actually needs to
// cross multiple thresholds inside one call.
export function resolveMasteryGathering(
  startedAt: Date,
  now: Date,
  node: MasteryGatherNodeLike,
  currentSkill: number,
  currentMasteryLevel: number,
  toolBonusPct = 0
): MasteryGatherResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const speedMult = masterySpeedMultiplier(currentMasteryLevel) * (1 + toolBonusPct / 100);
  const secondsPerAction = node.secondsPerAction / speedMult;
  const actionsAttempted = Math.floor(effectiveSeconds / secondsPerAction);

  const tier = masteryColorTier(currentSkill, node.colorBreakpoints);
  const xpPct = MASTERY_COLOR_XP_PCT[tier];
  const bonusChance = masteryBonusChance(currentMasteryLevel);

  return {
    itemId: node.itemId,
    // Each action guarantees 1 unit, plus bonusChance's expected fraction of
    // a second ("chance to double items" — see masteryBonusChance's doc
    // comment) averaged over actionsAttempted.
    quantityGained: actionsAttempted * (1 + bonusChance),
    rareBonusQuantity: node.rareBonus ? actionsAttempted * node.rareBonus.chance : 0,
    professionXpGained: actionsAttempted * node.baseProfessionXp * xpPct,
    masteryXpGained: actionsAttempted * node.baseProfessionXp,
    actionsAttempted,
    colorTier: tier,
    xpPct,
  };
}

export interface MasteryOfflineGatherResult {
  quantityGained: number;
  rareBonusQuantity: number;
  professionXpGained: number;
  masteryXpGained: number;
  finalSkill: number;
  finalSkillXp: number;
  finalMasteryLevel: number;
  finalMasteryXp: number;
  startColorTier: MasteryColorTier;
  finalColorTier: MasteryColorTier;
  didNotConverge: boolean;
}

// Belt-and-suspenders only, same role as combatEngine/offlineCombat.ts's
// MAX_TICKS — the 24h offline cap plus the smallest realistic per-action
// time bounds how many batches this could ever need; this is just a
// guarantee against an unexpected infinite loop, not a real limit.
const MAX_BATCH_ITERATIONS = 2000;

// Handles multiple profession-level-ups, mastery-level-ups and color changes
// within one elapsed offline period cheaply: each iteration jumps straight
// to whichever comes first (running out of time, the next skill point, or
// the next mastery point) instead of simulating action-by-action. A skill
// level-up IS the only thing that can change color (color is purely a
// function of current skill), so there's no separate "color threshold" to
// track beyond the skill one.
export function resolveMasteryGatheringOffline(
  startedAt: Date,
  now: Date,
  node: MasteryGatherNodeLike,
  startingSkill: number,
  startingSkillXp: number,
  startingMasteryLevel: number,
  startingMasteryXp: number,
  skillCap: number,
  toolBonusPct = 0
): MasteryOfflineGatherResult {
  const progress = resolveElapsedProgress(startedAt, now);
  let remainingSeconds = progress.effectiveHours * 3600;

  let skill = startingSkill;
  let skillXp = startingSkillXp;
  let masteryLevel = startingMasteryLevel;
  let masteryXp = startingMasteryXp;
  const startColorTier = masteryColorTier(skill, node.colorBreakpoints);

  let quantityGained = 0;
  let rareBonusQuantity = 0;
  let professionXpGained = 0;
  let masteryXpGained = 0;
  let iterations = 0;

  while (remainingSeconds > 0 && iterations < MAX_BATCH_ITERATIONS) {
    iterations++;
    const speedMult = masterySpeedMultiplier(masteryLevel) * (1 + toolBonusPct / 100);
    const secondsPerAction = node.secondsPerAction / speedMult;
    const actionsForFullTime = Math.floor(remainingSeconds / secondsPerAction);
    if (actionsForFullTime <= 0) break;

    const tier = masteryColorTier(skill, node.colorBreakpoints);
    const xpPct = MASTERY_COLOR_XP_PCT[tier];
    const profXpPerAction = node.baseProfessionXp * xpPct;
    const masteryXpPerAction = node.baseProfessionXp;

    const actionsToSkillUp =
      skill < skillCap ? Math.max(1, Math.ceil((masteryProfessionXpForNextLevel(skill) - skillXp) / profXpPerAction)) : Infinity;
    const actionsToMasteryUp =
      masteryLevel < MASTERY_MAX_LEVEL
        ? Math.max(1, Math.ceil((masteryXpForNextLevel(masteryLevel) - masteryXp) / masteryXpPerAction))
        : Infinity;

    const actionsThisBatch = Math.min(actionsForFullTime, actionsToSkillUp, actionsToMasteryUp);

    // Same expected-value "chance to double items" as the live resolver
    // above — kept consistent rather than letting the offline path under-
    // count the Mastery bonus just because it resolves in batches.
    quantityGained += actionsThisBatch * (1 + masteryBonusChance(masteryLevel));
    rareBonusQuantity += node.rareBonus ? actionsThisBatch * node.rareBonus.chance : 0;
    professionXpGained += actionsThisBatch * profXpPerAction;
    masteryXpGained += actionsThisBatch * masteryXpPerAction;
    remainingSeconds -= actionsThisBatch * secondsPerAction;

    skillXp += actionsThisBatch * profXpPerAction;
    masteryXp += actionsThisBatch * masteryXpPerAction;

    while (skill < skillCap && skillXp >= masteryProfessionXpForNextLevel(skill)) {
      skillXp -= masteryProfessionXpForNextLevel(skill);
      skill++;
    }
    while (masteryLevel < MASTERY_MAX_LEVEL && masteryXp >= masteryXpForNextLevel(masteryLevel)) {
      masteryXp -= masteryXpForNextLevel(masteryLevel);
      masteryLevel++;
    }
  }

  return {
    quantityGained,
    rareBonusQuantity,
    professionXpGained,
    masteryXpGained,
    finalSkill: skill,
    finalSkillXp: skillXp,
    finalMasteryLevel: masteryLevel,
    finalMasteryXp: masteryXp,
    startColorTier,
    finalColorTier: masteryColorTier(skill, node.colorBreakpoints),
    didNotConverge: iterations >= MAX_BATCH_ITERATIONS,
  };
}

// ── Crafting (Smithing) ──────────────────────────────────────────────────
// Same engine, adapted for a materials/gold-gated action instead of an
// always-available node: "bonus yield" becomes "chance to double the
// craft's output" (there's no discrete "one extra unit" to grant when a
// craft can itself produce more than 1, per the clarified design — matching
// gathering's mastery framework while fitting how crafting actually works).

export interface MasteryCraftRecipeLike {
  resultItemId: string;
  resultQuantity: number;
  baseProfessionXp: number;
  craftSeconds: number;
  requiredSkill: number;
  colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number };
  materials: { itemId: string; quantity: number }[];
  goldCost?: number;
}

export interface MasteryCraftResult {
  itemsCrafted: number; // batches of resultQuantity, i.e. actual crafts completed (doubles counted as 2)
  professionXpGained: number;
  masteryXpGained: number;
  materialsConsumed: { itemId: string; quantity: number }[];
  goldSpent: number;
  colorTier: MasteryColorTier;
  xpPct: number;
}

export function resolveMasteryCrafting(
  startedAt: Date,
  now: Date,
  recipe: MasteryCraftRecipeLike,
  currentSkill: number,
  currentMasteryLevel: number,
  availableMaterialQuantities: Record<string, number>,
  availableGold = Infinity
): MasteryCraftResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const speedMult = masterySpeedMultiplier(currentMasteryLevel);
  const craftSeconds = recipe.craftSeconds / speedMult;

  const timeLimitedCrafts = Math.floor(effectiveSeconds / craftSeconds);
  const materialLimitedCrafts = Math.min(
    ...recipe.materials.map((m) => Math.floor((availableMaterialQuantities[m.itemId] ?? 0) / m.quantity))
  );
  const goldLimitedCrafts = recipe.goldCost ? Math.floor(availableGold / recipe.goldCost) : Infinity;
  const craftAttempts = Math.max(0, Math.min(timeLimitedCrafts, materialLimitedCrafts, goldLimitedCrafts));

  const tier = masteryColorTier(currentSkill, recipe.colorBreakpoints);
  const xpPct = MASTERY_COLOR_XP_PCT[tier];
  const doubleChance = masteryBonusChance(currentMasteryLevel);
  // Expected extra successful crafts from the double-output chance — folded
  // into itemsCrafted (and so into materials/gold spent, which stay keyed
  // to craftAttempts, the actual number of times the recipe was run, not
  // itemsCrafted) same "expected value over a batch" convention the
  // gathering side uses for bonus yield.
  const itemsCrafted = craftAttempts + craftAttempts * doubleChance;

  return {
    itemsCrafted,
    professionXpGained: craftAttempts * recipe.baseProfessionXp * xpPct,
    masteryXpGained: craftAttempts * recipe.baseProfessionXp,
    materialsConsumed: recipe.materials.map((m) => ({ itemId: m.itemId, quantity: m.quantity * craftAttempts })),
    goldSpent: craftAttempts * (recipe.goldCost ?? 0),
    colorTier: tier,
    xpPct,
  };
}

export interface MasteryOfflineCraftResult {
  itemsCrafted: number;
  professionXpGained: number;
  masteryXpGained: number;
  materialsConsumed: { itemId: string; quantity: number }[];
  goldSpent: number;
  finalSkill: number;
  finalSkillXp: number;
  finalMasteryLevel: number;
  finalMasteryXp: number;
  startColorTier: MasteryColorTier;
  finalColorTier: MasteryColorTier;
  stoppedForMaterials: boolean;
  didNotConverge: boolean;
}

export function resolveMasteryCraftingOffline(
  startedAt: Date,
  now: Date,
  recipe: MasteryCraftRecipeLike,
  startingSkill: number,
  startingSkillXp: number,
  startingMasteryLevel: number,
  startingMasteryXp: number,
  skillCap: number,
  availableMaterialQuantities: Record<string, number>,
  availableGold = Infinity
): MasteryOfflineCraftResult {
  const progress = resolveElapsedProgress(startedAt, now);
  let remainingSeconds = progress.effectiveHours * 3600;

  let skill = startingSkill;
  let skillXp = startingSkillXp;
  let masteryLevel = startingMasteryLevel;
  let masteryXp = startingMasteryXp;
  const startColorTier = masteryColorTier(skill, recipe.colorBreakpoints);

  const remainingMaterials = { ...availableMaterialQuantities };
  let remainingGold = availableGold;
  const materialsConsumedTotal: Record<string, number> = {};
  let itemsCrafted = 0;
  let professionXpGained = 0;
  let masteryXpGained = 0;
  let iterations = 0;
  let stoppedForMaterials = false;

  while (remainingSeconds > 0 && iterations < MAX_BATCH_ITERATIONS) {
    iterations++;
    const speedMult = masterySpeedMultiplier(masteryLevel);
    const craftSeconds = recipe.craftSeconds / speedMult;
    const timeLimitedCrafts = Math.floor(remainingSeconds / craftSeconds);
    const materialLimitedCrafts = Math.min(
      ...recipe.materials.map((m) => Math.floor((remainingMaterials[m.itemId] ?? 0) / m.quantity))
    );
    const goldLimitedCrafts = recipe.goldCost ? Math.floor(remainingGold / recipe.goldCost) : Infinity;
    const craftsAvailableNow = Math.max(0, Math.min(timeLimitedCrafts, materialLimitedCrafts, goldLimitedCrafts));
    if (craftsAvailableNow <= 0) {
      stoppedForMaterials = materialLimitedCrafts <= 0 || goldLimitedCrafts <= 0;
      break;
    }

    const tier = masteryColorTier(skill, recipe.colorBreakpoints);
    const xpPct = MASTERY_COLOR_XP_PCT[tier];
    const profXpPerCraft = recipe.baseProfessionXp * xpPct;
    const masteryXpPerCraft = recipe.baseProfessionXp;

    const craftsToSkillUp =
      skill < skillCap ? Math.max(1, Math.ceil((masteryProfessionXpForNextLevel(skill) - skillXp) / profXpPerCraft)) : Infinity;
    const craftsToMasteryUp =
      masteryLevel < MASTERY_MAX_LEVEL
        ? Math.max(1, Math.ceil((masteryXpForNextLevel(masteryLevel) - masteryXp) / masteryXpPerCraft))
        : Infinity;

    const craftAttempts = Math.min(craftsAvailableNow, craftsToSkillUp, craftsToMasteryUp);
    const doubleChance = masteryBonusChance(masteryLevel);

    itemsCrafted += craftAttempts + craftAttempts * doubleChance;
    professionXpGained += craftAttempts * profXpPerCraft;
    masteryXpGained += craftAttempts * masteryXpPerCraft;
    remainingSeconds -= craftAttempts * craftSeconds;
    if (recipe.goldCost) remainingGold -= craftAttempts * recipe.goldCost;
    for (const m of recipe.materials) {
      const consumed = m.quantity * craftAttempts;
      remainingMaterials[m.itemId] = (remainingMaterials[m.itemId] ?? 0) - consumed;
      materialsConsumedTotal[m.itemId] = (materialsConsumedTotal[m.itemId] ?? 0) + consumed;
    }

    skillXp += craftAttempts * profXpPerCraft;
    masteryXp += craftAttempts * masteryXpPerCraft;
    while (skill < skillCap && skillXp >= masteryProfessionXpForNextLevel(skill)) {
      skillXp -= masteryProfessionXpForNextLevel(skill);
      skill++;
    }
    while (masteryLevel < MASTERY_MAX_LEVEL && masteryXp >= masteryXpForNextLevel(masteryLevel)) {
      masteryXp -= masteryXpForNextLevel(masteryLevel);
      masteryLevel++;
    }
  }

  return {
    itemsCrafted,
    professionXpGained,
    masteryXpGained,
    materialsConsumed: Object.entries(materialsConsumedTotal).map(([itemId, quantity]) => ({ itemId, quantity })),
    goldSpent: availableGold - remainingGold,
    finalSkill: skill,
    finalSkillXp: skillXp,
    finalMasteryLevel: masteryLevel,
    finalMasteryXp: masteryXp,
    startColorTier,
    finalColorTier: masteryColorTier(skill, recipe.colorBreakpoints),
    stoppedForMaterials,
    didNotConverge: iterations >= MAX_BATCH_ITERATIONS,
  };
}

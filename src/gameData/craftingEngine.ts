// The 1-100 XP+Mastery engine for the six CRAFTING professions
// (Blacksmithing/'smithing', Tailoring, Leatherworking, Alchemy, Enchanting,
// Cooking) — generalizes masteryEngine.ts's original Smithing-only pilot
// (1-300/0-10) onto the SAME 1-100 profession-level curve and 0-50
// Recipe Mastery scale gatheringEngine.ts already established for Mining/
// Herbalism/Skinning/Fishing, reusing that module's curve/color-delta/
// Mastery math directly (not reimplementing it) so leveling FEELS identical
// across all 10 professions — only each profession's own recipe economy
// (baseXp, craftSeconds, and here, MATERIAL cost) differs, exactly like
// Fishing's catchChance<1 differs from Mining's economy on the same curve.
//
// Crafting differs from gathering in exactly the ways crafting itself
// differs: every action consumes materials (and sometimes gold) rather than
// always being available, so a batch is limited by materials/gold/time
// together (see resolveCraftingOffline), and Mastery gets an extra
// crafting-only bonus axis — a chance to not consume a material on a given
// craft — on top of the shared speed/bonus-yield bonuses gathering Mastery
// already has. Enchanting is further different again (see its own section
// below): applying/disenchanting are instant, one-shot actions with no
// craftSeconds and no idle/offline activity at all (confirmed — Enchanting
// currently grants no profession XP whatsoever), so it gets its own
// instant, non-batched resolver instead of resolveCraftingOffline.
import {
  GATHERING_LEVEL_CAP,
  gatheringXpForNextLevel,
  gatheringColorTier,
  GATHERING_COLOR_XP_PCT,
  type GatheringColorTier,
  MASTERY_MAX_LEVEL,
  masteryXpForNextLevel,
  gatheringMasterySpeedMultiplier,
  gatheringMasteryBonusChance,
  bankedXpCapAt,
} from './gatheringEngine';
import { resolveElapsedProgress } from './activityEngine';

export const CRAFTING_LEVEL_CAP = GATHERING_LEVEL_CAP; // 100, same cap, same curve
export const craftingXpForNextLevel = gatheringXpForNextLevel;
export type CraftingColorTier = GatheringColorTier;
export const CRAFTING_COLOR_XP_PCT = GATHERING_COLOR_XP_PCT;
// Level-delta formula, exactly like gathering — recipe.requiredSkill is the
// "appropriate for this level" reference point, same role GatherNode's
// requiredLevel plays.
export const craftingColorTier = gatheringColorTier;
export const RECIPE_MASTERY_MAX_LEVEL = MASTERY_MAX_LEVEL; // 50
export const recipeMasteryXpForNextLevel = masteryXpForNextLevel;
export const craftingMasterySpeedMultiplier = gatheringMasterySpeedMultiplier;
export const craftingMasteryBonusChance = gatheringMasteryBonusChance; // extra-output chance
export const craftingBankedXpCapAt = bankedXpCapAt;

// NEW for crafting only — a chance to not consume one unit of EACH material
// on a given craft ("chance to save an ingredient" per the design brief).
// Gathering has no analogous mechanic since there's no input to save.
// Milestone-gated and capped low, same posture as every other Mastery bonus
// in this game (never enough to make material cost negligible — at the cap,
// ~92% of normal consumption over a long run).
export function craftingMasteryIngredientSaveChance(masteryLevel: number): number {
  const milestone = Math.min(10, Math.floor(masteryLevel / 5));
  if (milestone >= 10) return 0.08;
  if (milestone >= 6) return 0.05;
  if (milestone >= 3) return 0.02;
  return 0;
}

// Belt-and-suspenders only, same role as gatheringEngine.ts's own
// MAX_BATCH_ITERATIONS.
const MAX_BATCH_ITERATIONS = 2000;

// ── Timed crafting (Smithing, Tailoring, Leatherworking, Alchemy, Cooking) ──

export interface CraftingRecipeLike {
  resultItemId: string;
  resultQuantity: number;
  baseXp: number;
  craftSeconds: number;
  requiredSkill: number;
  materials: { itemId: string; quantity: number }[];
  goldCost?: number;
}

export interface CraftingOfflineResult {
  itemsCrafted: number;
  materialsConsumed: { itemId: string; quantity: number }[];
  goldSpent: number;
  professionXpGained: number;
  masteryXpGained: number;
  finalSkill: number;
  finalSkillXp: number;
  finalMasteryLevel: number;
  finalMasteryXp: number;
  startColorTier: CraftingColorTier;
  finalColorTier: CraftingColorTier;
  stoppedForMaterials: boolean;
  didNotConverge: boolean;
}

// Always the OFFLINE/batched resolver, even for a single ~20s autosave
// chunk — same convention gatheringEngine.ts's resolveGatheringOffline
// established (a small chunk just means the batch loop runs once or
// twice). Handles crossing multiple profession-level-ups, Mastery-level-ups,
// and color changes within one elapsed window cheaply, same "jump straight
// to whichever limit comes first" strategy.
export function resolveCraftingOffline(
  startedAt: Date,
  now: Date,
  recipe: CraftingRecipeLike,
  startingSkill: number,
  startingSkillXp: number,
  startingMasteryLevel: number,
  startingMasteryXp: number,
  skillCap: number,
  availableMaterialQuantities: Record<string, number>,
  availableGold = Infinity
): CraftingOfflineResult {
  const progress = resolveElapsedProgress(startedAt, now);
  let remainingSeconds = progress.effectiveHours * 3600;

  let skill = startingSkill;
  let skillXp = startingSkillXp;
  let masteryLevel = startingMasteryLevel;
  let masteryXp = startingMasteryXp;
  const startColorTier = craftingColorTier(skill, recipe.requiredSkill);
  const bankedCap = craftingBankedXpCapAt(skillCap);

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
    const speedMult = craftingMasterySpeedMultiplier(masteryLevel);
    const craftSeconds = recipe.craftSeconds / speedMult;
    const timeLimitedCrafts = Math.floor(remainingSeconds / craftSeconds);
    // Availability is checked against the FULL material cost (ignoring the
    // save chance) — understating how many crafts are affordable is safe;
    // overstating it could drive remainingMaterials negative.
    const materialLimitedCrafts = Math.min(
      ...recipe.materials.map((m) => Math.floor((remainingMaterials[m.itemId] ?? 0) / m.quantity))
    );
    const goldLimitedCrafts = recipe.goldCost ? Math.floor(remainingGold / recipe.goldCost) : Infinity;
    const craftsAvailableNow = Math.max(0, Math.min(timeLimitedCrafts, materialLimitedCrafts, goldLimitedCrafts));
    if (craftsAvailableNow <= 0) {
      stoppedForMaterials = materialLimitedCrafts <= 0 || goldLimitedCrafts <= 0;
      break;
    }

    // Both branches re-check the LIVE skill/skillXp every iteration — see
    // gatheringEngine.ts's matching comment for why a stale snapshot here
    // risks hitting MAX_BATCH_ITERATIONS on an ordinary multi-hour gap.
    const belowCap = skill < skillCap;
    const bankNotFull = skillXp < bankedCap;
    const tier = craftingColorTier(skill, recipe.requiredSkill);
    const xpPct = CRAFTING_COLOR_XP_PCT[tier];
    // Never zero — same "even Gray still teaches something" floor as gathering.
    const xpPerCraft = Math.max(1, Math.round(recipe.baseXp * xpPct));
    const masteryXpPerCraft = recipe.baseXp;

    const skillXpRoom = belowCap ? craftingXpForNextLevel(skill) - skillXp : bankedCap - skillXp;
    const craftsToSkillCapOrLevel =
      belowCap || bankNotFull ? Math.max(1, Math.ceil(skillXpRoom / xpPerCraft)) : Infinity;
    const craftsToMasteryUp =
      masteryLevel < RECIPE_MASTERY_MAX_LEVEL
        ? Math.max(1, Math.ceil((recipeMasteryXpForNextLevel(masteryLevel) - masteryXp) / masteryXpPerCraft))
        : Infinity;

    const craftAttempts = Math.min(craftsAvailableNow, craftsToSkillCapOrLevel, craftsToMasteryUp);
    const bonusChance = craftingMasteryBonusChance(masteryLevel);
    const saveChance = craftingMasteryIngredientSaveChance(masteryLevel);

    itemsCrafted += craftAttempts * (1 + bonusChance);
    remainingSeconds -= craftAttempts * craftSeconds;
    if (recipe.goldCost) remainingGold -= craftAttempts * recipe.goldCost;
    for (const m of recipe.materials) {
      const consumed = m.quantity * craftAttempts * (1 - saveChance);
      remainingMaterials[m.itemId] = (remainingMaterials[m.itemId] ?? 0) - consumed;
      materialsConsumedTotal[m.itemId] = (materialsConsumedTotal[m.itemId] ?? 0) + consumed;
    }

    const skillXpThisBatch = belowCap || bankNotFull ? craftAttempts * xpPerCraft : 0;
    professionXpGained += skillXpThisBatch;
    masteryXpGained += craftAttempts * masteryXpPerCraft;
    skillXp = belowCap ? skillXp + skillXpThisBatch : Math.min(bankedCap, skillXp + skillXpThisBatch);
    masteryXp += craftAttempts * masteryXpPerCraft;

    while (skill < skillCap && skillXp >= craftingXpForNextLevel(skill)) {
      skillXp -= craftingXpForNextLevel(skill);
      skill++;
    }
    while (masteryLevel < RECIPE_MASTERY_MAX_LEVEL && masteryXp >= recipeMasteryXpForNextLevel(masteryLevel)) {
      masteryXp -= recipeMasteryXpForNextLevel(masteryLevel);
      masteryLevel++;
    }
  }

  return {
    itemsCrafted,
    materialsConsumed: Object.entries(materialsConsumedTotal).map(([itemId, quantity]) => ({ itemId, quantity })),
    goldSpent: availableGold - remainingGold,
    professionXpGained,
    masteryXpGained,
    finalSkill: skill,
    finalSkillXp: skillXp,
    finalMasteryLevel: masteryLevel,
    finalMasteryXp: masteryXp,
    startColorTier,
    finalColorTier: craftingColorTier(skill, recipe.requiredSkill),
    stoppedForMaterials,
    didNotConverge: iterations >= MAX_BATCH_ITERATIONS,
  };
}

// ── Enchanting (instant, one-shot — no craftSeconds, no idle/offline) ─────
// Applying an enchant (or disenchanting an item) is a single immediate
// Firestore write, not a timed activity — there is no "elapsed time" to
// batch over. This resolves exactly ONE action's worth of profession XP
// (and, for a named enchant, Recipe Mastery) using the same curve/color math
// as timed crafting, just without a time/materials-availability loop.
export interface EnchantActionXpResult {
  professionXpGained: number;
  masteryXpGained: number;
  finalSkill: number;
  finalSkillXp: number;
  finalMasteryLevel: number;
  finalMasteryXp: number;
  colorTier: CraftingColorTier;
}

function applyOneCraftXp(
  baseXp: number,
  requiredSkill: number,
  startingSkill: number,
  startingSkillXp: number,
  skillCap: number
): { professionXpGained: number; finalSkill: number; finalSkillXp: number; colorTier: CraftingColorTier } {
  const colorTier = craftingColorTier(startingSkill, requiredSkill);
  const xpPct = CRAFTING_COLOR_XP_PCT[colorTier];
  const xpGained = startingSkill < skillCap ? Math.max(1, Math.round(baseXp * xpPct)) : 0;

  let skill = startingSkill;
  let skillXp = startingSkillXp + xpGained;
  while (skill < skillCap && skillXp >= craftingXpForNextLevel(skill)) {
    skillXp -= craftingXpForNextLevel(skill);
    skill++;
  }
  return { professionXpGained: xpGained, finalSkill: skill, finalSkillXp: skillXp, colorTier };
}

// Applying a named enchant — tracks Recipe Mastery per enchant id, same as
// any other crafting recipe.
export function resolveEnchantApply(
  baseXp: number,
  requiredSkill: number,
  startingSkill: number,
  startingSkillXp: number,
  startingMasteryLevel: number,
  startingMasteryXp: number,
  skillCap: number
): EnchantActionXpResult {
  const { professionXpGained, finalSkill, finalSkillXp, colorTier } = applyOneCraftXp(
    baseXp,
    requiredSkill,
    startingSkill,
    startingSkillXp,
    skillCap
  );

  let masteryLevel = startingMasteryLevel;
  let masteryXp = startingMasteryXp + baseXp;
  while (masteryLevel < RECIPE_MASTERY_MAX_LEVEL && masteryXp >= recipeMasteryXpForNextLevel(masteryLevel)) {
    masteryXp -= recipeMasteryXpForNextLevel(masteryLevel);
    masteryLevel++;
  }

  return {
    professionXpGained,
    masteryXpGained: baseXp,
    finalSkill,
    finalSkillXp,
    finalMasteryLevel: masteryLevel,
    finalMasteryXp: masteryXp,
    colorTier,
  };
}

// Disenchanting any qualifying item — profession XP only, no Mastery (there
// is no fixed "recipe" to master; any sufficiently-leveled item qualifies).
export function resolveDisenchant(
  baseXp: number,
  requiredSkill: number,
  startingSkill: number,
  startingSkillXp: number,
  skillCap: number
): { professionXpGained: number; finalSkill: number; finalSkillXp: number; colorTier: CraftingColorTier } {
  return applyOneCraftXp(baseXp, requiredSkill, startingSkill, startingSkillXp, skillCap);
}

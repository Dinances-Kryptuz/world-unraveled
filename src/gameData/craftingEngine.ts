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
import {
  MASTERY_XP_PER_BAR,
  materialMasteryPercent,
  materialMasteryXpToNextPercentPoint,
  materialMasterySpeedMultiplier,
  materialMasteryBonusChance,
} from './equipmentRolls';

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
  // Only populated when resolveCraftingOffline is called with a
  // `materialMastery` param (a Recipe.materialId-tagged recipe) — the old
  // per-recipe masteryXpGained/finalMasteryLevel/finalMasteryXp above are
  // frozen at their starting values in that case (the recipe no longer
  // populates the old per-recipe Mastery bucket at all, see
  // types/character.ts's ProfessionState.mastery comment), and these fields
  // carry the real result instead.
  materialMasteryXpGained?: number;
  finalMaterialMasteryXp?: number;
  // One entry per batch-loop iteration that produced items, recording how
  // many (including the fractional Mastery bonus-output share) were crafted
  // at that iteration's STARTING material-Mastery percent — needed so stat
  // rolls for items crafted early in a long offline window use that
  // lower mastery quality instead of the window's final percent (see
  // firebase/character.ts's applyCraftingProfessionResult, which rolls one
  // batch entry at a time rather than rolling `itemsCrafted` all at the
  // final percent).
  materialMasteryBatches?: { quantity: number; masteryPercentAtCraft: number }[];
}

// Passed to resolveCraftingOffline only for a Recipe.materialId-tagged
// recipe — everything the function needs to run the material-Mastery axis
// instead of (not in addition to) the old per-recipe Mastery axis.
// `barsPerCraft` is read from the recipe's OWN materials list by the
// caller (never reduced by a future material-cost perk — see
// gameData/materials.ts's module comment), matching "Mastery XP = base bar
// requirement × Mastery XP per bar" exactly regardless of what the batch
// loop's ingredient-save-chance (always 0 in this mode — see below) might
// otherwise have discounted.
export interface MaterialMasteryInput {
  materialId: string;
  startingXp: number;
  barsPerCraft: number;
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
  availableGold = Infinity,
  materialMastery?: MaterialMasteryInput
): CraftingOfflineResult {
  const progress = resolveElapsedProgress(startedAt, now);
  let remainingSeconds = progress.effectiveHours * 3600;

  let skill = startingSkill;
  let skillXp = startingSkillXp;
  // The old per-recipe Mastery axis is frozen (never advanced) when
  // materialMastery is supplied — a materialId-tagged recipe contributes
  // only to Character.materialMastery instead, see ProfessionState.mastery's
  // comment. materialXp is the new axis's own running total.
  let masteryLevel = startingMasteryLevel;
  let masteryXp = startingMasteryXp;
  let materialXp = materialMastery?.startingXp ?? 0;
  const startColorTier = craftingColorTier(skill, recipe.requiredSkill);
  const bankedCap = craftingBankedXpCapAt(skillCap);

  const remainingMaterials = { ...availableMaterialQuantities };
  let remainingGold = availableGold;
  const materialsConsumedTotal: Record<string, number> = {};
  let itemsCrafted = 0;
  let professionXpGained = 0;
  let masteryXpGained = 0;
  let materialMasteryXpGained = 0;
  const materialMasteryBatches: { quantity: number; masteryPercentAtCraft: number }[] = [];
  let iterations = 0;
  let stoppedForMaterials = false;

  while (remainingSeconds > 0 && iterations < MAX_BATCH_ITERATIONS) {
    iterations++;
    const materialPercent = materialMastery ? materialMasteryPercent(materialXp, materialMastery.materialId) : 0;
    const speedMult = materialMastery
      ? materialMasterySpeedMultiplier(materialPercent)
      : craftingMasterySpeedMultiplier(masteryLevel);
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
    // Mastery XP per craft: bars-based for a materialId-tagged recipe (per
    // the recipe's ORIGINAL material requirement, unaffected by saveChance
    // below), else the old recipe.baseXp-based figure, unchanged.
    const masteryXpPerCraft = materialMastery ? materialMastery.barsPerCraft * MASTERY_XP_PER_BAR : recipe.baseXp;

    const skillXpRoom = belowCap ? craftingXpForNextLevel(skill) - skillXp : bankedCap - skillXp;
    const craftsToSkillCapOrLevel =
      belowCap || bankNotFull ? Math.max(1, Math.ceil(skillXpRoom / xpPerCraft)) : Infinity;
    const craftsToMasteryUp =
      !materialMastery && masteryLevel < RECIPE_MASTERY_MAX_LEVEL
        ? Math.max(1, Math.ceil((recipeMasteryXpForNextLevel(masteryLevel) - masteryXp) / masteryXpPerCraft))
        : Infinity;
    // Caps each iteration so material-Mastery percent moves at most ~1 point
    // before stat-quality bonuses are recomputed — see
    // CraftingOfflineResult.materialMasteryBatches's comment.
    const craftsToNextMasteryPercentPoint =
      materialMastery && materialPercent < 100
        ? Math.max(1, Math.ceil(materialMasteryXpToNextPercentPoint(materialXp, materialMastery.materialId) / masteryXpPerCraft))
        : Infinity;

    const craftAttempts = Math.min(
      craftsAvailableNow,
      craftsToSkillCapOrLevel,
      craftsToMasteryUp,
      craftsToNextMasteryPercentPoint
    );
    const bonusChance = materialMastery
      ? materialMasteryBonusChance(materialPercent)
      : craftingMasteryBonusChance(masteryLevel);
    // Ingredient-save is strictly a per-recipe-Mastery bonus (no material-
    // Mastery equivalent in the 3-bonus design — speed/bonus-output/stat-
    // quality only), so it's 0 whenever materialMastery is active.
    const saveChance = materialMastery ? 0 : craftingMasteryIngredientSaveChance(masteryLevel);

    const quantityThisBatch = craftAttempts * (1 + bonusChance);
    itemsCrafted += quantityThisBatch;
    remainingSeconds -= craftAttempts * craftSeconds;
    if (recipe.goldCost) remainingGold -= craftAttempts * recipe.goldCost;
    for (const m of recipe.materials) {
      const consumed = m.quantity * craftAttempts * (1 - saveChance);
      remainingMaterials[m.itemId] = (remainingMaterials[m.itemId] ?? 0) - consumed;
      materialsConsumedTotal[m.itemId] = (materialsConsumedTotal[m.itemId] ?? 0) + consumed;
    }

    const skillXpThisBatch = belowCap || bankNotFull ? craftAttempts * xpPerCraft : 0;
    professionXpGained += skillXpThisBatch;
    skillXp = belowCap ? skillXp + skillXpThisBatch : Math.min(bankedCap, skillXp + skillXpThisBatch);

    if (materialMastery) {
      materialMasteryBatches.push({ quantity: quantityThisBatch, masteryPercentAtCraft: materialPercent });
      const materialXpThisBatch = craftAttempts * masteryXpPerCraft;
      materialMasteryXpGained += materialXpThisBatch;
      materialXp += materialXpThisBatch;
    } else {
      masteryXpGained += craftAttempts * masteryXpPerCraft;
      masteryXp += craftAttempts * masteryXpPerCraft;
    }

    while (skill < skillCap && skillXp >= craftingXpForNextLevel(skill)) {
      skillXp -= craftingXpForNextLevel(skill);
      skill++;
    }
    if (!materialMastery) {
      while (masteryLevel < RECIPE_MASTERY_MAX_LEVEL && masteryXp >= recipeMasteryXpForNextLevel(masteryLevel)) {
        masteryXp -= recipeMasteryXpForNextLevel(masteryLevel);
        masteryLevel++;
      }
    }
  }

  return {
    itemsCrafted,
    // Flooring here (never rounding up) matches this file's "safe to
    // understate" convention — the per-iteration ingredient-save-chance
    // bonus (craftingMasteryIngredientSaveChance) is an expected-value
    // fraction, same approach as itemsCrafted's bonus-output share, but
    // unlike itemsCrafted this total is used directly as a Firestore
    // `increment()` amount (firebase/character.ts's applyCraftingProfessionResult)
    // with no later flooring step of its own — leaving it fractional would
    // permanently decrement the player's real material stack into a
    // non-integer value (compounding into float noise over many autosave
    // ticks) instead of just an in-memory display estimate.
    materialsConsumed: Object.entries(materialsConsumedTotal).map(([itemId, quantity]) => ({
      itemId,
      quantity: Math.floor(quantity),
    })),
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
    ...(materialMastery
      ? { materialMasteryXpGained, finalMaterialMasteryXp: materialXp, materialMasteryBatches }
      : {}),
  };
}

// ── Enchanting ─────────────────────────────────────────────────────────
// Applying an enchant is no longer a standalone instant action — it's
// crafting a scroll (a normal timed Recipe, resolved through
// resolveCraftingOffline above like any other profession's goods) and then
// using the finished scroll, a free action with no XP of its own (the XP
// was already earned crafting it — see firebase/enchanting.ts's
// useEnchantScroll). Disenchanting, below, is the one Enchanting action that
// still needs its own resolver: there's no fixed "recipe" for an arbitrary
// qualifying item, so it can't go through resolveCraftingOffline's
// materials-based batching, but it's now a timed, quantity-capped, idle-
// capable batch (resolveDisenchantOffline) rather than a single click.
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

// Flat per-item time, independent of skill/Mastery (there's no Mastery axis
// to speed it up — see the module comment above) — short enough that a
// modest stack clears in well under a minute of live play, but still a real
// timed/offline activity rather than an instant click, so "disenchant my
// whole stack" is something you queue up and let run (optionally while
// away), the same AFK-first idle posture as every other profession action.
export const DISENCHANT_SECONDS = 5;

export interface DisenchantOfflineResult {
  itemsDisenchanted: number;
  yieldQuantity: number;
  professionXpGained: number;
  finalSkill: number;
  finalSkillXp: number;
  // True once `maxQuantity` has been processed — the caller (
  // DisenchantingScreen) stops the activity when this flips, same
  // "automatically wraps up" behavior the quantity slider promises.
  reachedRequestedQuantity: boolean;
  didNotConverge: boolean;
}

// Disenchanting any qualifying item, N at a time — profession XP only, no
// Mastery (there is no fixed "recipe" to master; any sufficiently-leveled
// item qualifies). `maxQuantity` is min(requested slider value, stack size
// actually owned) — the caller is responsible for that clamp since this
// resolver has no inventory access of its own.
export function resolveDisenchantOffline(
  startedAt: Date,
  now: Date,
  requiredSkill: number,
  baseXp: number,
  yieldMin: number,
  yieldMax: number,
  maxQuantity: number,
  startingSkill: number,
  startingSkillXp: number,
  skillCap: number
): DisenchantOfflineResult {
  const progress = resolveElapsedProgress(startedAt, now);
  let remainingSeconds = progress.effectiveHours * 3600;
  let skill = startingSkill;
  let skillXp = startingSkillXp;
  let itemsDisenchanted = 0;
  let yieldQuantity = 0;
  let professionXpGained = 0;
  let iterations = 0;

  while (remainingSeconds >= DISENCHANT_SECONDS && itemsDisenchanted < maxQuantity && iterations < MAX_BATCH_ITERATIONS) {
    iterations++;
    remainingSeconds -= DISENCHANT_SECONDS;
    itemsDisenchanted++;
    const result = applyOneCraftXp(baseXp, requiredSkill, skill, skillXp, skillCap);
    professionXpGained += result.professionXpGained;
    skill = result.finalSkill;
    skillXp = result.finalSkillXp;
    yieldQuantity += yieldMin + Math.floor(Math.random() * (yieldMax - yieldMin + 1));
  }

  return {
    itemsDisenchanted,
    yieldQuantity,
    professionXpGained,
    finalSkill: skill,
    finalSkillXp: skillXp,
    reachedRequestedQuantity: itemsDisenchanted >= maxQuantity,
    didNotConverge: iterations >= MAX_BATCH_ITERATIONS,
  };
}

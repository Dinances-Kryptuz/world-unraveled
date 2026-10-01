// The single resolver used by combat, gathering, skinning, and crafting.
// There is still no stored "online/offline" flag anywhere — the resolver
// decides which rate regime to use purely from the SIZE of the elapsed gap
// since activityStartedAt:
//
//   - A short gap (<= LIVE_SESSION_THRESHOLD_SECONDS) means the player is
//     actively here. During an active session the client periodically
//     autosaves and resets activityStartedAt, so a "live" resolution never
//     sees a gap bigger than one autosave interval. This regime uses the
//     TRUE per-action time (real monster/node stats) — the pace the player
//     actually watches happen.
//
//   - A long gap means the player was away (tab closed, or just never
//     autosaved that recently). This regime applies an OFFLINE_THROTTLE on
//     top of the true per-action time before running it through the same
//     24h-cap / 12h-tier efficiency curve as before. This keeps a 24-hour
//     absence from producing thousands of kills while still rewarding
//     longer absences more than short ones.
//
// This intentionally reverses the earlier "one rate for everything" design —
// the two target numbers (10-22s live fight vs. 100-200 kills/24h) are only
// reconcilable with two rate regimes. Throttle factors below are tuned to
// land roughly in the requested ranges across all 4 V1 monsters/nodes; treat
// them as a first pass, not final balance.

export const OFFLINE_CAP_HOURS = 24;
export const FULL_EFFICIENCY_HOURS = 12;
export const REDUCED_EFFICIENCY_RATE = 0.75;

// Gaps at or under this are treated as "still live" — real-time pace, no throttle.
export const LIVE_SESSION_THRESHOLD_SECONDS = 300; // 5 minutes

// Multiplies true per-action seconds when resolving an away-gap.
// Tuned against V1's 4 monsters/2 nodes to land near 100-200 kills and
// 100-300 gathered resources per 24h (see /gameData sanity checks).
export const COMBAT_OFFLINE_THROTTLE = 38;
export const GATHERING_OFFLINE_THROTTLE = 45; // Mining, Herbalism, Skinning — flat per-action nodes

// Gathering-node failure chance: at exactly the node's required skill level,
// there's a real chance of coming away empty-handed on a given action. That
// chance shrinks as skill rises above the requirement, down to a floor that
// never quite hits zero (V1 default: 40% fail at the requirement, decaying
// to a 5% floor by 20 levels above it).
export const GATHER_FAIL_CHANCE_AT_REQUIRED_LEVEL = 0.4;
export const GATHER_FAIL_CHANCE_FLOOR = 0.05;
export const GATHER_FAIL_CHANCE_LEVELS_TO_FLOOR = 20;

/**
 * Success chance for a single gathering action, given the player's current
 * skill and the node's required level. Skill below the requirement isn't
 * handled here — that's an availability gate elsewhere (the player shouldn't
 * be able to start gathering a node they don't meet the level for at all).
 */
export function gatheringSuccessChance(currentSkill: number, requiredLevel: number): number {
  const levelsAboveRequired = Math.max(0, currentSkill - requiredLevel);
  const progressToFloor = Math.min(1, levelsAboveRequired / GATHER_FAIL_CHANCE_LEVELS_TO_FLOOR);
  const failChance =
    GATHER_FAIL_CHANCE_AT_REQUIRED_LEVEL -
    progressToFloor * (GATHER_FAIL_CHANCE_AT_REQUIRED_LEVEL - GATHER_FAIL_CHANCE_FLOOR);
  return 1 - failChance;
}

export interface ResolvedProgress {
  effectiveHours: number; // hours of progress actually credited, after caps/efficiency
  rawElapsedHours: number; // true wall-clock hours elapsed, uncapped (for display only)
  cappedAtMax: boolean; // true if the player exceeded the 24h cap
  isLiveSession: boolean; // true if this gap was small enough to use the untouched live rate
}

/**
 * Converts raw elapsed time into "effective hours" of progress. If the gap is
 * small (a live session), returns the raw elapsed time uncapped/unthrottled —
 * the tiered cap only matters for genuine absences.
 */
export function resolveElapsedProgress(startedAt: Date, now: Date): ResolvedProgress {
  const rawElapsedSeconds = Math.max(0, (now.getTime() - startedAt.getTime()) / 1000);
  const rawElapsedHours = rawElapsedSeconds / 3600;

  if (rawElapsedSeconds <= LIVE_SESSION_THRESHOLD_SECONDS) {
    return {
      effectiveHours: rawElapsedHours,
      rawElapsedHours,
      cappedAtMax: false,
      isLiveSession: true,
    };
  }

  const cappedHours = Math.min(rawElapsedHours, OFFLINE_CAP_HOURS);
  const fullHours = Math.min(cappedHours, FULL_EFFICIENCY_HOURS);
  const reducedHours = Math.max(0, cappedHours - FULL_EFFICIENCY_HOURS);
  const effectiveHours = fullHours + reducedHours * REDUCED_EFFICIENCY_RATE;

  return {
    effectiveHours,
    rawElapsedHours,
    cappedAtMax: rawElapsedHours >= OFFLINE_CAP_HOURS,
    isLiveSession: false,
  };
}

// ── Gathering resolution (Mining, Herbalism, Skinning — node-based) ──────

export interface GatherNodeResult {
  itemId: string;
  quantityGained: number; // successful actions only
  xpGained: number; // awarded for successful actions only
  actionsAttempted: number;
  successfulActions: number;
  successChance: number; // for UI display, e.g. "72% success rate"
}

export function resolveGathering(
  startedAt: Date,
  now: Date,
  node: {
    itemId: string;
    xpPerAction: number;
    secondsPerAction: number;
    requiredLevel: number;
    colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number };
  },
  currentSkill: number,
  toolBonusPct = 0
): GatherNodeResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const secondsPerAction = progress.isLiveSession
    ? node.secondsPerAction
    : node.secondsPerAction * GATHERING_OFFLINE_THROTTLE;

  const actionsAttempted = Math.floor(effectiveSeconds / secondsPerAction);
  const successChance = Math.min(1, gatheringSuccessChance(currentSkill, node.requiredLevel) + toolBonusPct / 100);
    // Deliberately NOT rounded — with roughly one action per autosave chunk,
  // rounding here would make the fail chance resolve the same way every
  // single time instead of behaving probabilistically. The caller carries
  // the fractional remainder across chunks (see GatheringScreen.tsx).
  const successfulActions = actionsAttempted * successChance;

  // A node you're well past (grey) still yields the material on success —
  // only the skill-up XP dries up, exactly like a grey crafting recipe.
  // requiredLevel is passed as requiredSkill here since gathering nodes are
  // always attempted at/above their skill requirement (an unmet requirement
  // blocks starting the activity at all, same as crafting's "red" tier).
  const tier = craftingColorTier(currentSkill, 0, node.colorBreakpoints);
  const xpMultiplier = PROFESSION_XP_MULTIPLIER_BY_TIER[tier];

  return {
    itemId: node.itemId,
    quantityGained: successfulActions, // 1 unit per successful action in V1
    xpGained: successfulActions * node.xpPerAction * xpMultiplier,
    actionsAttempted,
    successfulActions,
    successChance,
  };
}

// ── Fishing resolution ──────────────────────────────────────────────────
// Deliberately NOT the orange/yellow/green/grey model: fishing has no
// "recipe," just one universal action with a chance of nothing (per the
// design brief). Skill-up chance instead decreases smoothly as skill rises
// — "the number of successful catches required for the next skill point
// increases" — down to a floor so Fishing stays worth doing at high skill.
export const FISHING_SKILLUP_CHANCE_AT_ZERO = 0.9;
export const FISHING_SKILLUP_CHANCE_FLOOR = 0.08;

export function fishingSkillupChance(currentSkill: number): number {
  const progress = currentSkill / 300;
  return FISHING_SKILLUP_CHANCE_AT_ZERO - progress * (FISHING_SKILLUP_CHANCE_AT_ZERO - FISHING_SKILLUP_CHANCE_FLOOR);
}

export interface FishingResult {
  catches: { itemId: string; quantity: number }[];
  skillupsGained: number; // whole skill points — see firebase/professions.ts's applyFishingResult
  actionsAttempted: number;
  catchChance: number; // chance a cast lands ANY fish, for UI display
}

// Resolves a batch of casts over an elapsed window. Each cast independently
// rolls the loot table for a catch (remainder chance = "your fish got away"
// — no fish, no skillup) and, only on a successful catch, an independent
// roll against fishingSkillupChance for the actual skill point. Returns
// whole skillups directly (not XP) since Fishing's curve is this function's
// job end-to-end rather than feeding the shared professionXpForLevel curve.
export function resolveFishing(
  startedAt: Date,
  now: Date,
  hole: { lootTable: { itemId: string; chance: number; minQty: number; maxQty: number }[]; secondsPerAction: number },
  currentSkill: number,
  toolBonusPct = 0
): FishingResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const secondsPerAction = progress.isLiveSession ? hole.secondsPerAction : hole.secondsPerAction * GATHERING_OFFLINE_THROTTLE;
  const actionsAttempted = Math.floor(effectiveSeconds / secondsPerAction);

  const toolBonus = toolBonusPct / 100;
  const skillupChance = fishingSkillupChance(currentSkill);

  // Each drop is rolled independently per cast (same convention as monster
  // loot — see combatEngine/engine.ts's rollKillReward), so expected
  // quantity is just actionsAttempted * chance * avgQty, summed per item.
  // The tool bonus bumps every drop's effective chance equally.
  let totalCastsThatCaughtSomething = 0;
  const catches = hole.lootTable.map((drop) => {
    const effectiveChance = Math.min(1, drop.chance + toolBonus);
    const avgQty = (drop.minQty + drop.maxQty) / 2;
    totalCastsThatCaughtSomething += actionsAttempted * effectiveChance;
    return { itemId: drop.itemId, quantity: actionsAttempted * effectiveChance * avgQty };
  });

  return {
    catches,
    skillupsGained: totalCastsThatCaughtSomething * skillupChance,
    actionsAttempted,
    catchChance: Math.min(1, hole.lootTable.reduce((sum, drop) => sum + drop.chance, 0) + toolBonus),
  };
}

// ── Crafting resolution ─────────────────────────────────────────────────
// Crafting is unaffected by the live/offline throttle: it's already
// self-limiting by materials on hand, so there's no "thousands of items"
// runaway case the way unbounded combat/gathering had.

// Classic-WoW-style recipe color, driven by current skill vs. the recipe's
// requiredSkill and colorBreakpoints. "red" only shows up in UI contexts
// that list recipes below your skill requirement — resolveCrafting itself
// is never reached below requiredSkill (the UI gates starting the activity).
export type CraftColorTier = 'red' | 'orange' | 'yellow' | 'green' | 'grey';

export function craftingColorTier(
  currentSkill: number,
  requiredSkill: number,
  colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number }
): CraftColorTier {
  if (currentSkill < requiredSkill) return 'red';
  if (currentSkill <= colorBreakpoints.orangeUntil) return 'orange';
  if (currentSkill <= colorBreakpoints.yellowUntil) return 'yellow';
  if (currentSkill <= colorBreakpoints.greenUntil) return 'green';
  return 'grey';
}

// Shared by both crafting and gathering (see resolveGathering above) — the
// data-driven "skill-up chance" curve the design brief asks for, expressed
// as a continuous XP-rate multiplier rather than a discrete per-action dice
// roll (this engine already resolves gathering/crafting in batched elapsed-
// time chunks for idle play, where a continuous rate is the natural fit and
// is mathematically equivalent in expectation to "orange = 100% chance,
// yellow = high, green = low, grey = none"). Grey is exactly 0 — per the
// design brief, grey content must never contribute a skillup.
export const PROFESSION_XP_MULTIPLIER_BY_TIER: Record<CraftColorTier, number> = {
  red: 0, // can't happen in practice — not reachable below requiredSkill
  orange: 1.0,
  yellow: 0.8,
  green: 0.3,
  grey: 0,
};

export interface CraftingResult {
  itemsCrafted: number;
  xpGained: number;
  materialsConsumed: { itemId: string; quantity: number }[];
}

export function resolveCrafting(
  startedAt: Date,
  now: Date,
  recipe: {
    requiredSkill: number;
    craftSeconds: number;
    xpAward: number;
    materials: { itemId: string; quantity: number }[];
  },
  currentSkill: number,
  availableMaterialQuantities: Record<string, number>,
  colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number }
): CraftingResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;

  const timeLimitedCrafts = Math.floor(effectiveSeconds / recipe.craftSeconds);

  const materialLimitedCrafts = Math.min(
    ...recipe.materials.map((m) =>
      Math.floor((availableMaterialQuantities[m.itemId] ?? 0) / m.quantity)
    )
  );

  const itemsCrafted = Math.max(0, Math.min(timeLimitedCrafts, materialLimitedCrafts));

  const tier = craftingColorTier(currentSkill, recipe.requiredSkill, colorBreakpoints);
  const xpMultiplier = PROFESSION_XP_MULTIPLIER_BY_TIER[tier];

  return {
    itemsCrafted,
    xpGained: Math.round(itemsCrafted * recipe.xpAward * xpMultiplier),
    materialsConsumed: recipe.materials.map((m) => ({
      itemId: m.itemId,
      quantity: m.quantity * itemsCrafted,
    })),
  };
}

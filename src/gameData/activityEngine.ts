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
export const GATHERING_OFFLINE_THROTTLE = 45; // Mining, Herbalism — flat per-action nodes
export const SKINNING_OFFLINE_THROTTLE = 55; // Skinning — separate so its chance-weighted
// variable yield (0.9 chance x ~1.5 avg qty per action) still lands near Mining/Herbalism's
// output instead of running hot just because it has richer per-action variance.

// Gathering-node failure chance: at exactly the node's required skill level,
// there's a real chance of coming away empty-handed on a given action. That
// chance shrinks as skill rises above the requirement, down to a floor that
// never quite hits zero (V1 default: 40% fail at the requirement, decaying
// to a 5% floor by 20 levels above it). This does NOT apply to Skinning,
// whose variable yield is its own distinct mechanic (locked in separately).
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

// ── Gathering resolution (Mining, Herbalism — node-based) ────────────────

export interface GatheringResult {
  itemId: string;
  quantityGained: number;
  xpGained: number;
  actionsCompleted: number;
}

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
  node: { itemId: string; xpPerAction: number; secondsPerAction: number; requiredLevel: number },
  currentSkill: number
): GatherNodeResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const secondsPerAction = progress.isLiveSession
    ? node.secondsPerAction
    : node.secondsPerAction * GATHERING_OFFLINE_THROTTLE;

  const actionsAttempted = Math.floor(effectiveSeconds / secondsPerAction);
  const successChance = gatheringSuccessChance(currentSkill, node.requiredLevel);
  const successfulActions = Math.round(actionsAttempted * successChance);

  return {
    itemId: node.itemId,
    quantityGained: successfulActions, // 1 unit per successful action in V1
    xpGained: successfulActions * node.xpPerAction,
    actionsAttempted,
    successfulActions,
    successChance,
  };
}

// ── Skinning resolution (post-combat action, same rate mechanics as gathering) ──

export function resolveSkinning(
  startedAt: Date,
  now: Date,
  skinningYield: { itemId: string; chance: number; minQty: number; maxQty: number; actionSeconds: number },
  skinningXpPerAction: number
): GatheringResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const secondsPerAction = progress.isLiveSession
    ? skinningYield.actionSeconds
    : skinningYield.actionSeconds * SKINNING_OFFLINE_THROTTLE;

  const actionsCompleted = Math.floor(effectiveSeconds / secondsPerAction);
  const avgQty = (skinningYield.minQty + skinningYield.maxQty) / 2;
  const quantityGained = Math.round(actionsCompleted * skinningYield.chance * avgQty);

  return {
    itemId: skinningYield.itemId,
    quantityGained,
    xpGained: actionsCompleted * skinningXpPerAction,
    actionsCompleted,
  };
}

// ── Combat resolution ───────────────────────────────────────────────────

export interface CombatResult {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
  loot: { itemId: string; quantity: number }[];
  liveSecondsPerKill: number; // for UI reference / debugging balance
}

export function resolveCombat(
  startedAt: Date,
  now: Date,
  monster: {
    hp: number;
    xpReward: number;
    goldMin: number;
    goldMax: number;
    lootTable: { itemId: string; chance: number; minQty: number; maxQty: number }[];
  },
  playerAttackPower: number,
  playerAttackIntervalSeconds: number
): CombatResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;

  const attacksToKill = Math.max(1, Math.ceil(monster.hp / Math.max(1, playerAttackPower)));
  const liveSecondsPerKill = attacksToKill * playerAttackIntervalSeconds;
  const secondsPerKill = progress.isLiveSession
    ? liveSecondsPerKill
    : liveSecondsPerKill * COMBAT_OFFLINE_THROTTLE;

  const monstersDefeated = Math.floor(effectiveSeconds / secondsPerKill);

  const avgGoldPerKill = (monster.goldMin + monster.goldMax) / 2;
  const goldGained = Math.round(monstersDefeated * avgGoldPerKill);
  const xpGained = monstersDefeated * monster.xpReward;

  const loot = monster.lootTable.map((drop) => {
    const avgQty = (drop.minQty + drop.maxQty) / 2;
    const expectedQuantity = Math.round(monstersDefeated * drop.chance * avgQty);
    return { itemId: drop.itemId, quantity: expectedQuantity };
  });

  return {
    monstersDefeated,
    xpGained,
    goldGained,
    loot: loot.filter((l) => l.quantity > 0),
    liveSecondsPerKill,
  };
}

// ── Crafting resolution ─────────────────────────────────────────────────
// Crafting is unaffected by the live/offline throttle: it's already
// self-limiting by materials on hand, so there's no "thousands of items"
// runaway case the way unbounded combat/gathering had.

export interface CraftingResult {
  itemsCrafted: number;
  xpGained: number;
  materialsConsumed: { itemId: string; quantity: number }[];
}

export function resolveCrafting(
  startedAt: Date,
  now: Date,
  recipe: {
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

  const xpMultiplier =
    currentSkill <= colorBreakpoints.orangeUntil
      ? 1.0
      : currentSkill <= colorBreakpoints.yellowUntil
      ? 0.75
      : currentSkill <= colorBreakpoints.greenUntil
      ? 0.35
      : 0; // gray

  return {
    itemsCrafted,
    xpGained: Math.round(itemsCrafted * recipe.xpAward * xpMultiplier),
    materialsConsumed: recipe.materials.map((m) => ({
      itemId: m.itemId,
      quantity: m.quantity * itemsCrafted,
    })),
  };
}

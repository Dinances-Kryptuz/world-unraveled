// The single resolver used by combat, gathering, skinning, fishing, and
// crafting. Offline progress is worth exactly as much as live progress,
// per real hour — no throttle, no diminishing-returns tier — up to a flat
// 24-hour cap; time away beyond that cap is simply not credited at all
// (not even at a reduced rate). This replaced an earlier two-regime model
// (live at full rate, offline compressed by a ~38-45x throttle) that made
// offline progress nearly worthless — a 24-hour absence credited only
// around half an hour of live-equivalent progress, which didn't fit this
// being an idle game players check in on rather than leave a tab open in
// 24/7. There is still no stored "online/offline" flag anywhere — this
// resolver only ever looks at the SIZE of the elapsed gap since
// activityStartedAt, it just no longer treats a long gap any differently
// from a short one except for the cap.
//
// The single autosave cadence for every live activity screen (combat,
// gathering, crafting, fishing) — used to live as four separately-declared
// copies of the same constant, one per screen, which is exactly how it
// drifted out of sync with LIVE_SESSION_THRESHOLD_SECONDS below once before
// (see that constant's comment). One shared constant now, so changing the
// save cadence can never again silently invalidate the threshold tuned
// against it. Doubled from the original 10s specifically to cut Firestore
// read/write volume roughly in half for alpha testing on the free Spark
// plan's daily quota — purely a persistence-cadence change, invisible in
// play since every screen's "this session" numbers already interpolate
// smoothly between saves via their own sinceLastSave math.
export const AUTOSAVE_INTERVAL_SECONDS = 20;

// LIVE_SESSION_THRESHOLD_SECONDS no longer affects any rate — it's kept
// only for WelcomeBackScreen's "were you away long enough to show a
// summary" check, a UI question, not a math one. For combat specifically,
// this threshold used to be load-bearing by accident: the offline-combat
// simulation only ever runs inside WelcomeBackScreen, so a gap under this
// threshold got literally zero catch-up (CombatScreen just starts a fresh
// encounter on mount) rather than a reduced one — gathering/crafting/
// fishing don't have this problem since their resolvers always recompute
// from the activity's true startedAt regardless of gap length. Kept low
// (rather than removed) now that combat stays mounted and ticking through
// in-app navigation (see App.tsx's activityNode) — CombatScreen only
// remounts on an actual "came back after being away" event (page reload,
// sign-out/in, tab closed), not routine tab-switching, so showing this
// summary for any real gap isn't spammy.
//
// Derived from AUTOSAVE_INTERVAL_SECONDS rather than a bare number, so it
// can never again quietly fall out of the safe range the way it did when
// the save cadence was 10s and this was also set to 10s: useCharacter has
// no live Firestore listener, so character.currentActivity.startedAt only
// ever advances when an autosave actually banks something — a slow fight
// can go a full AUTOSAVE_INTERVAL_SECONDS tick with no kill, during which
// startedAt sits stale. Worst case that staleness is roughly one kill's
// worth of time (combatFormulas.ts's targetTimeToKill tops out around 25s)
// plus one more full autosave tick before the next save catches it. The x3
// multiplier keeps a comfortable margin over that worst case at any
// reasonable autosave interval, while staying far below the real absences
// (sign-outs measured in minutes) this exists to catch.
export const OFFLINE_CAP_HOURS = 24;
export const LIVE_SESSION_THRESHOLD_SECONDS = AUTOSAVE_INTERVAL_SECONDS * 3;

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
  effectiveHours: number; // hours of progress actually credited — raw elapsed, capped at 24h
  rawElapsedHours: number; // true wall-clock hours elapsed, uncapped (for display only)
  cappedAtMax: boolean; // true if the player exceeded the 24h cap (anything beyond it is lost, not reduced-rate)
}

/**
 * Converts raw elapsed time into "effective hours" of progress — a flat 1:1
 * credit of real time up to the 24-hour cap, same rate whether the player is
 * actively watching or was away. Time beyond 24 hours is simply not
 * credited at all (not reduced-rate, just gone) — this is the only limiter
 * on offline progress now.
 */
export function resolveElapsedProgress(startedAt: Date, now: Date): ResolvedProgress {
  const rawElapsedSeconds = Math.max(0, (now.getTime() - startedAt.getTime()) / 1000);
  const rawElapsedHours = rawElapsedSeconds / 3600;
  const effectiveHours = Math.min(rawElapsedHours, OFFLINE_CAP_HOURS);

  return {
    effectiveHours,
    rawElapsedHours,
    cappedAtMax: rawElapsedHours >= OFFLINE_CAP_HOURS,
  };
}

// ── Gathering resolution (Mining, Herbalism, Skinning — node-based) ──────

export interface GatherNodeResult {
  itemId: string;
  quantityGained: number; // successful actions only
  skillupsGained: number; // expected whole skill points — see PROFESSION_SKILLUP_CHANCE_BY_TIER
  actionsAttempted: number;
  successfulActions: number;
  successChance: number; // for UI display, e.g. "72% success rate"
  // The orange/yellow/green/grey chance already folded into skillupsGained
  // above — exposed separately because GatheringScreen.tsx computes its
  // own whole-items-only skillupsGained (quantityGained is carried as a
  // fraction and only "banked" once it crosses a whole item; skillupsGained
  // needs the same treatment) rather than using skillupsGained directly.
  skillupChance: number;
}

export function resolveGathering(
  startedAt: Date,
  now: Date,
  node: {
    itemId: string;
    secondsPerAction: number;
    requiredLevel: number;
    colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number };
  },
  currentSkill: number,
  toolBonusPct = 0
): GatherNodeResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;
  const actionsAttempted = Math.floor(effectiveSeconds / node.secondsPerAction);
  const successChance = Math.min(1, gatheringSuccessChance(currentSkill, node.requiredLevel) + toolBonusPct / 100);
    // Deliberately NOT rounded — with roughly one action per autosave chunk,
  // rounding here would make the fail chance resolve the same way every
  // single time instead of behaving probabilistically. The caller carries
  // the fractional remainder across chunks (see GatheringScreen.tsx).
  const successfulActions = actionsAttempted * successChance;

  // A node you're well past (grey) still yields the material on every
  // success — only the skill-up chance dries up, exactly like a grey
  // crafting recipe (and exactly like Fishing, which never stops landing
  // fish, just stops teaching you anything once you're skilled enough).
  // requiredLevel is passed as requiredSkill here since gathering nodes are
  // always attempted at/above their skill requirement (an unmet requirement
  // blocks starting the activity at all, same as crafting's "red" tier).
  const tier = craftingColorTier(currentSkill, 0, node.colorBreakpoints);
  const skillupChance = PROFESSION_SKILLUP_CHANCE_BY_TIER[tier];

  return {
    itemId: node.itemId,
    quantityGained: successfulActions, // 1 unit per successful action in V1
    skillupsGained: successfulActions * skillupChance,
    actionsAttempted,
    successfulActions,
    successChance,
    skillupChance,
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
  const actionsAttempted = Math.floor(effectiveSeconds / hole.secondsPerAction);

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
// data-driven skill-up chance per successful action/craft, same model
// Fishing already uses (fishingSkillupChance above): a discrete chance of
// gaining ONE skill point, decaying to exactly 0 once the content is grey.
// Expressed here as an expected-value rate (successes * chance) rather than
// an actual per-action dice roll, since this engine resolves gathering/
// crafting in batched elapsed-time chunks for idle play — mathematically
// equivalent in expectation, and the caller (GatheringScreen/
// CraftingScreen) already carries the fractional remainder across chunks
// the same way Fishing does. Grey is exactly 0 — content you've outgrown
// still yields the item/result on every success, it just never teaches you
// anything anymore, exactly like a trivial fish.
export const PROFESSION_SKILLUP_CHANCE_BY_TIER: Record<CraftColorTier, number> = {
  red: 0, // can't happen in practice — not reachable below requiredSkill
  orange: 1.0,
  yellow: 0.8,
  green: 0.3,
  grey: 0,
};

export interface CraftingResult {
  itemsCrafted: number;
  skillupsGained: number; // expected whole skill points — see PROFESSION_SKILLUP_CHANCE_BY_TIER
  skillupChance: number; // for UI display, e.g. "80% skill-up chance"
  materialsConsumed: { itemId: string; quantity: number }[];
  goldSpent: number;
}

export function resolveCrafting(
  startedAt: Date,
  now: Date,
  recipe: {
    requiredSkill: number;
    craftSeconds: number;
    materials: { itemId: string; quantity: number }[];
    goldCost?: number;
  },
  currentSkill: number,
  availableMaterialQuantities: Record<string, number>,
  colorBreakpoints: { orangeUntil: number; yellowUntil: number; greenUntil: number },
  availableGold = Infinity
): CraftingResult {
  const progress = resolveElapsedProgress(startedAt, now);
  const effectiveSeconds = progress.effectiveHours * 3600;

  const timeLimitedCrafts = Math.floor(effectiveSeconds / recipe.craftSeconds);

  const materialLimitedCrafts = Math.min(
    ...recipe.materials.map((m) =>
      Math.floor((availableMaterialQuantities[m.itemId] ?? 0) / m.quantity)
    )
  );
  const goldLimitedCrafts = recipe.goldCost ? Math.floor(availableGold / recipe.goldCost) : Infinity;

  const itemsCrafted = Math.max(0, Math.min(timeLimitedCrafts, materialLimitedCrafts, goldLimitedCrafts));

  const tier = craftingColorTier(currentSkill, recipe.requiredSkill, colorBreakpoints);
  const skillupChance = PROFESSION_SKILLUP_CHANCE_BY_TIER[tier];

  return {
    itemsCrafted,
    skillupsGained: itemsCrafted * skillupChance,
    skillupChance,
    goldSpent: itemsCrafted * (recipe.goldCost ?? 0),
    materialsConsumed: recipe.materials.map((m) => ({
      itemId: m.itemId,
      quantity: m.quantity * itemsCrafted,
    })),
  };
}

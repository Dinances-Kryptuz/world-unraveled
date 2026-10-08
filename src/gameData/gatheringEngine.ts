// The 1-100 XP+Mastery engine for the four GATHERING professions (Mining,
// Herbalism, Skinning, Fishing) — replaces both the old discrete skill-up-
// chance model (activityEngine.ts's resolveGathering/resolveFishing, which
// no profession uses anymore) and Mining's own Mastery-pilot engine
// (masteryEngine.ts, now Smithing-only — crafting is explicitly out of
// scope for this redesign and keeps its existing 1-300/0-10 system
// unchanged).
//
// Every successful gather/catch awards profession XP directly (no random
// skill-up roll) and Resource Mastery XP for that one specific resource,
// tracked as two independent axes exactly like the old Mining pilot:
// Character.professions[id].level/xp is the profession, .mastery[resourceId]
// is that one resource's own 0-50 track. See the design writeup in this
// session for the full mathematical model this file implements.
import { resolveElapsedProgress } from './activityEngine';

export const GATHERING_LEVEL_CAP = 100;

// ── Profession XP curve ──────────────────────────────────────────────────
// XP required to go from `level` to `level + 1` (not cumulative) — ONE
// smooth curve shared by all four gathering professions, so "level 50"
// always represents the same banked XP regardless of which profession;
// each profession hits its own target total time by tuning its OWN
// resource economy (gatheringResourceTiers below) against this curve, not
// a separate curve per profession. Calibrated by simulation (see session
// notes) so Mining/Herbalism/Skinning land ~40 active hours and Fishing
// (whose economy includes a <100% catch chance) lands ~50, with the
// 1-20/21-40/41-60/61-80/81-100 bracket split front-loaded as designed:
// fast early, a real grind by Master.
const GATHERING_XP_BASE = 8.244;
const GATHERING_XP_EXPONENT = 1.65;

export function gatheringXpForNextLevel(level: number): number {
  return Math.round(GATHERING_XP_BASE * Math.pow(level, GATHERING_XP_EXPONENT));
}

// ── Difficulty colors — level-DELTA driven, not per-resource breakpoints ──
// A resource's own requiredLevel is also "the level this is appropriate
// for" — orange covers the full gap up to the next tier unlocking (20
// comfortably covers every real gap in the game's tier tables, including
// Mining's widest, Thorium(60)->Platinum(80)), so a player working through
// their current-best resource is never pushed into a lower color before
// anything better actually exists. Grey never reaches zero — outdated
// resources stay worth a trickle of XP forever (floored to at least 1 per
// action below), never nothing.
export type GatheringColorTier = 'orange' | 'yellow' | 'green' | 'grey';

const COLOR_DELTA_BANDS = { orange: 20, yellow: 35, green: 55 };
export const GATHERING_COLOR_XP_PCT: Record<GatheringColorTier, number> = {
  orange: 1.0,
  yellow: 0.75,
  green: 0.32,
  grey: 0.08,
};

export function gatheringColorTier(playerLevel: number, resourceRequiredLevel: number): GatheringColorTier {
  const delta = playerLevel - resourceRequiredLevel;
  if (delta <= COLOR_DELTA_BANDS.orange) return 'orange';
  if (delta <= COLOR_DELTA_BANDS.yellow) return 'yellow';
  if (delta <= COLOR_DELTA_BANDS.green) return 'green';
  return 'grey';
}

// ── Resource Mastery (per-resource, 0-50) ─────────────────────────────────
// Deliberately NOT the same 0-10 scale as Smithing's existing Mastery
// (masteryEngine.ts) — gathering Mastery is meant to be a long-term, "come
// back to this resource for hundreds of gathers" investment (see
// MASTERY_MILESTONE_EVERY below), not a quick ramp finished incidentally
// while leveling through a tier. Reaching Mastery 50 on one resource,
// ground exclusively, takes roughly as long as leveling the WHOLE
// profession efficiently (~30-34h by simulation) — during normal play a
// player only spends a fraction of that on any one tier before the next
// one is simply better XP/hour, so maxing a resource's Mastery is always a
// deliberate choice, never a side effect.
export const MASTERY_MAX_LEVEL = 50;
// Bonuses land every 5th level (10 milestones total) rather than every
// single one — same two bonus axes and the same caps (+20% speed, +5% bonus
// yield chance) as Smithing's shipped Mastery, just spread across 50 levels
// instead of 10, per the "milestones, not every level" design goal.
const MASTERY_MILESTONE_EVERY = 5;
const MASTERY_XP_BASE = 25;
const MASTERY_XP_EXPONENT = 1.45;

export function masteryXpForNextLevel(level: number): number {
  return Math.round(MASTERY_XP_BASE * Math.pow(level + 1, MASTERY_XP_EXPONENT));
}

function masteryMilestone(level: number): number {
  return Math.floor(level / MASTERY_MILESTONE_EVERY);
}

export function gatheringMasterySpeedMultiplier(masteryLevel: number): number {
  const milestone = Math.min(10, masteryMilestone(masteryLevel));
  return 1 + (milestone * 2) / 100;
}

// 0% until the halfway milestone (Mastery 25), then a modest ramp to the
// same +5% cap Smithing's Mastery already uses — capped low on purpose so
// Mastery rewards specialization without trivializing the profession grind
// or flooding the economy with doubled output.
export function gatheringMasteryBonusChance(masteryLevel: number): number {
  const milestone = masteryMilestone(masteryLevel);
  if (milestone >= 10) return 0.05;
  if (milestone >= 6) return 0.03;
  if (milestone >= 5) return 0.02;
  return 0;
}

// ── Trainer-cap banked XP ──────────────────────────────────────────────
// A player who hits a rank's level ceiling without having bought the next
// rank keeps gathering normally — level just can't rise past the cap. XP
// keeps accumulating internally (so nothing already earned is lost) but
// only up to a bound: enough for ~2.5 levels at the CURRENT (capped)
// level's own cost, so staying capped on purpose for weeks and then buying
// the next rank can't instantly vault a player dozens of levels. Once
// banked XP hits this ceiling, further gathering still yields the resource
// and Mastery, just no more profession XP until the next rank is trained.
const BANKED_XP_CAP_LEVELS = 2.5;

export function bankedXpCapAt(cappedLevel: number): number {
  return Math.round(gatheringXpForNextLevel(cappedLevel) * BANKED_XP_CAP_LEVELS);
}

// ── Legacy data migration ────────────────────────────────────────────────
// Mining/Herbalism/Skinning/Fishing previously ran on a 1-300 skill scale
// (activityEngine.ts's discrete skill-up model for Herbalism/Skinning/
// Fishing, or masteryEngine.ts's 1-300 Mastery-pilot curve for Mining,
// Mastery 0-10) before this engine's 1-100/Mastery-0-50 redesign. A flat /3
// (and x5 for Mastery) rescale preserves a character's relative standing
// (e.g. an old Expert at skill 180 — 60% through the old scale — becomes a
// new-scale level 60, still squarely Expert) without claiming false
// precision about which exact old level maps to which exact new XP value;
// XP itself always resets to 0 at the rescaled level, since the two curves
// aren't convertible. See firebase/character.ts's getCharacter for where
// this actually runs — once per character, persisted behind a one-time flag
// so this non-idempotent rescale is never silently reapplied on a later
// read.
export function migrateLegacyGatheringLevel(oldLevel: number): number {
  return Math.max(1, Math.min(GATHERING_LEVEL_CAP, Math.round(oldLevel / 3)));
}

export function migrateLegacyMasteryLevel(oldMasteryLevel: number): number {
  return Math.max(0, Math.min(MASTERY_MAX_LEVEL, Math.round(oldMasteryLevel * 5)));
}

// ── Resolver ───────────────────────────────────────────────────────────
export interface GatheringResourceLike {
  itemId: string;
  baseXp: number;
  secondsPerAction: number;
  requiredLevel: number;
  rareBonus?: { itemId: string; chance: number };
  // Fishing only — the chance a single cast lands the fish at all ("your
  // fish got away" otherwise: no catch, no XP, no Mastery). Every other
  // gathering profession always succeeds (undefined behaves as 1.0), same
  // as the shipped Mining Mastery engine before it.
  catchChance?: number;
}

export interface GatheringOfflineResult {
  quantityGained: number;
  rareBonusQuantity: number;
  professionXpGained: number;
  masteryXpGained: number;
  finalSkill: number;
  finalSkillXp: number;
  finalMasteryLevel: number;
  finalMasteryXp: number;
  startColorTier: GatheringColorTier;
  finalColorTier: GatheringColorTier;
  didNotConverge: boolean;
}

// Belt-and-suspenders only, same role as offlineCombat.ts's MAX_TICKS and
// masteryEngine.ts's own MAX_BATCH_ITERATIONS.
const MAX_BATCH_ITERATIONS = 2000;

// Handles crossing multiple profession-level-ups, Mastery-level-ups, and
// color changes within one elapsed window cheaply — each iteration jumps
// straight to whichever comes first (running out of time, the next skill
// point, the next Mastery point, or the banked-XP cap) instead of
// simulating action-by-action. Used for BOTH the live ~20s autosave chunk
// and a genuine multi-hour offline catch-up — same convention
// masteryEngine.ts's offline resolver already established (a small chunk
// just means the batch loop runs once or twice).
export function resolveGatheringOffline(
  startedAt: Date,
  now: Date,
  resource: GatheringResourceLike,
  startingSkill: number,
  startingSkillXp: number,
  startingMasteryLevel: number,
  startingMasteryXp: number,
  skillCap: number,
  toolBonusPct = 0
): GatheringOfflineResult {
  const progress = resolveElapsedProgress(startedAt, now);
  let remainingSeconds = progress.effectiveHours * 3600;
  const catchChance = resource.catchChance ?? 1.0;

  let skill = startingSkill;
  let skillXp = startingSkillXp;
  let masteryLevel = startingMasteryLevel;
  let masteryXp = startingMasteryXp;
  const startColorTier = gatheringColorTier(skill, resource.requiredLevel);
  const bankedCap = bankedXpCapAt(skillCap);

  let quantityGained = 0;
  let rareBonusQuantity = 0;
  let professionXpGained = 0;
  let masteryXpGained = 0;
  let iterations = 0;

  while (remainingSeconds > 0 && iterations < MAX_BATCH_ITERATIONS) {
    iterations++;
    const speedMult = gatheringMasterySpeedMultiplier(masteryLevel) * (1 + toolBonusPct / 100);
    const secondsPerAction = resource.secondsPerAction / speedMult;
    const actionsForFullTime = Math.floor(remainingSeconds / secondsPerAction);
    if (actionsForFullTime <= 0) break;

    const tier = gatheringColorTier(skill, resource.requiredLevel);
    const xpPct = GATHERING_COLOR_XP_PCT[tier];
    // Never zero — even a thoroughly outdated (grey) resource still teaches
    // something, per the design brief's explicit "Copper Ore GRAY +1 Mining
    // XP, never 0" requirement.
    const xpPerAction = Math.max(1, Math.round(resource.baseXp * xpPct)) * catchChance;
    const masteryXpPerAction = resource.baseXp * catchChance; // unthrottled by color, same as Smithing's shipped Mastery

    // Both branches re-check the LIVE skill/skillXp every iteration (not a
    // snapshot from before the loop started) — a long offline catch-up can
    // cross from "below cap" to "at cap" mid-simulation, and a stale check
    // here would force every subsequent iteration down to a single action,
    // risking MAX_BATCH_ITERATIONS on an otherwise ordinary multi-hour gap.
    const belowCap = skill < skillCap;
    const bankNotFull = skillXp < bankedCap;
    const skillXpRoom = belowCap ? gatheringXpForNextLevel(skill) - skillXp : bankedCap - skillXp;
    const actionsToSkillCapOrLevel =
      belowCap || bankNotFull ? Math.max(1, Math.ceil(skillXpRoom / xpPerAction)) : Infinity;
    const actionsToMasteryUp =
      masteryLevel < MASTERY_MAX_LEVEL
        ? Math.max(1, Math.ceil((masteryXpForNextLevel(masteryLevel) - masteryXp) / masteryXpPerAction))
        : Infinity;

    const actionsThisBatch = Math.min(actionsForFullTime, actionsToSkillCapOrLevel, actionsToMasteryUp);

    quantityGained += actionsThisBatch * catchChance * (1 + gatheringMasteryBonusChance(masteryLevel));
    rareBonusQuantity += resource.rareBonus ? actionsThisBatch * resource.rareBonus.chance * catchChance : 0;
    remainingSeconds -= actionsThisBatch * secondsPerAction;

    // Profession XP stops accumulating once both the level is capped AND
    // the banked-XP ceiling is full — the resource/Mastery gains above
    // still happen every action regardless.
    const skillXpThisBatch = belowCap || bankNotFull ? actionsThisBatch * xpPerAction : 0;
    professionXpGained += skillXpThisBatch;
    masteryXpGained += actionsThisBatch * masteryXpPerAction;

    skillXp = belowCap ? skillXp + skillXpThisBatch : Math.min(bankedCap, skillXp + skillXpThisBatch);
    masteryXp += actionsThisBatch * masteryXpPerAction;

    while (skill < skillCap && skillXp >= gatheringXpForNextLevel(skill)) {
      skillXp -= gatheringXpForNextLevel(skill);
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
    finalColorTier: gatheringColorTier(skill, resource.requiredLevel),
    didNotConverge: iterations >= MAX_BATCH_ITERATIONS,
  };
}

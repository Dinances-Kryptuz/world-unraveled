// XP curves are formulas, not hardcoded tables — this keeps xpTables.ts small
// even once professions eventually run to level 300, and means adding levels
// later never requires a data migration.

/**
 * The 1-60 character XP curve. Squished for the alpha test — the original
 * calibration (4000 * level^2.6, ~509 hours of 24/7 play to reach 60) was
 * deliberately a long-haul MMO curve, but that's the wrong shape for
 * getting early alpha data: it buried the level-5 spec choice under ~18-20
 * hours even after the pre-spec combat buff, and ~500+ hours to 60 means
 * nobody reaches endgame content during a short test window.
 *
 * Re-simulated against the real combat formulas (all 6 zones' monster
 * levels, all 6 specs, optimal-but-safe monster selection, factoring in
 * each spec's own self-healing/survivability) to find a curve landing
 * level 5 at roughly 1 hour and level 60 at roughly 90-95 hours for the
 * slowest (non-self-healing) specs — self-healing specs (the two Priest
 * specs, Holy Paladin) finish considerably faster, which is fine; the
 * target is "the slowest reasonable playstyle still reaches 60 within a
 * few days," not every spec taking the same time. These are also
 * pessimistic estimates (the simulation only ever uses starting gear, never
 * accounting for better loot/crafted gear along the way), so real play
 * should be faster than this, not slower.
 */
export function characterXpForLevelV2(level: number): number {
  if (level <= 1) return 0;
  return 290 * Math.pow(level, 2.3);
}

// The level cap — every zone/dungeon/ability in the game is built against
// this ceiling (Cinderheart Sanctum's own level range tops out here). Not
// enforced by characterXpForLevelV2 itself (the curve is happy to keep
// extrapolating past it); callers that turn accumulated xp into a level
// (CombatScreen/DungeonScreen's autosave, offlineCombat's catch-up sim) stop
// incrementing here instead. Also the trigger for Phase 4's character-slot
// unlocks (see firebase/characterSlots.ts) — "hit max level" means reaching
// this number.
export const MAX_CHARACTER_LEVEL = 60;

/**
 * Total cumulative XP required to REACH a given profession level (1–300 eventually,
 * V1 content only exercises roughly 1–30 given Greenhollow Fields' scope).
 * Slightly gentler curve than character XP since professions grind via repetitive actions.
 */
export function professionXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(35 * Math.pow(level - 1, 1.7));
}

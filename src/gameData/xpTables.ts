// XP curves are formulas, not hardcoded tables — this keeps xpTables.ts small
// even once professions eventually run to level 300, and means adding levels
// later never requires a data migration.

/**
 * Total cumulative XP required to REACH a given character level.
 * Level 1 = 0 XP. Roughly matches a classic-MMO-feeling early curve.
 * NOTE: this is the V1 flat-combat-era curve. It is superseded by
 * characterXpForLevelV2 below for anything using the new class/spec combat
 * system (Step 7 onward) — the new per-kill XP values are much larger, and
 * pairing them with this old curve reproduces the "level 60 in under an
 * hour" bug found and fixed when the real XP curve was calibrated. Kept
 * here only in case anything still references it during the migration.
 */
export function characterXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.8));
}

/**
 * The real, calibrated 1-60 character XP curve (simulation-verified against
 * all six specs — see the combat-sim work: ~509 hours of 24/7 play to reach
 * level 60, a smooth ramp rather than a flat/spike shape). This is what the
 * new combat resolver (Step 7+) checks level-ups against.
 */
export function characterXpForLevelV2(level: number): number {
  if (level <= 1) return 0;
  return 4000 * Math.pow(level, 2.6);
}

/**
 * Total cumulative XP required to REACH a given profession level (1–300 eventually,
 * V1 content only exercises roughly 1–30 given Greenhollow Fields' scope).
 * Slightly gentler curve than character XP since professions grind via repetitive actions.
 */
export function professionXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(35 * Math.pow(level - 1, 1.7));
}

/** XP still needed to reach the next level, given current level + current XP-into-level. */
export function xpToNextLevel(
  currentLevel: number,
  currentXp: number,
  curve: (level: number) => number
): number {
  const nextLevelThreshold = curve(currentLevel + 1);
  return Math.max(0, nextLevelThreshold - currentXp);
}

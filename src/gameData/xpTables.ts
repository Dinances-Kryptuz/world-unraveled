// XP curves are formulas, not hardcoded tables — this keeps xpTables.ts small
// even once professions eventually run to level 300, and means adding levels
// later never requires a data migration.

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

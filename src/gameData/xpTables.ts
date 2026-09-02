// XP curves are formulas, not hardcoded tables — this keeps xpTables.ts small
// even once professions eventually run to level 300, and means adding levels
// later never requires a data migration.

/**
 * Total cumulative XP required to REACH a given character level.
 * Level 1 = 0 XP. Roughly matches a classic-MMO-feeling early curve.
 */
export function characterXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.8));
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

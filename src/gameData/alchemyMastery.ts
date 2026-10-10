// Alchemy's zone-Mastery axis — six independent bars (one per
// gameData/zones.ts ZONE), fed by herb UNITS consumed during crafting (1 XP
// per unit, credited to each ingredient's own herb zone — see herbs.ts's
// herbZoneOf), not by number of recipes completed. Mirrors the Blacksmithing
// material-Mastery pattern's shape (percent = min(100, xp/threshold*100),
// milestone-gated bonuses) but with its own, much simpler milestone table —
// exactly 4 tiers at 0/25/60/90%, not a continuous curve.
export const ALCHEMY_ZONE_MASTERY_XP_PER_HERB_UNIT = 1;
export const ALCHEMY_ZONE_MASTERY_THRESHOLD = 2000;

export function alchemyZoneMasteryPercent(xp: number): number {
  return Math.min(100, (xp / ALCHEMY_ZONE_MASTERY_THRESHOLD) * 100);
}

export interface AlchemyMasteryMilestone {
  charges: number;
  craftTimeReductionPct: number;
}

// Exactly the 4 tiers the design calls for — 0-24% / 25-59% / 60-89% /
// 90-100%, never the 50%/75% split discussed and discarded earlier in the
// session's planning. craftTimeReductionPct is applied directly as
// `craftSeconds * (1 - pct/100)` by the resolver — matches the design's own
// worked example (10s base -> 9/8/7s) exactly, no intermediate multiplier.
export function alchemyMasteryMilestone(percent: number): AlchemyMasteryMilestone {
  if (percent >= 90) return { charges: 4, craftTimeReductionPct: 30 };
  if (percent >= 60) return { charges: 3, craftTimeReductionPct: 20 };
  if (percent >= 25) return { charges: 2, craftTimeReductionPct: 10 };
  return { charges: 1, craftTimeReductionPct: 0 };
}

const MILESTONE_XP_THRESHOLDS = [0.25, 0.6, 0.9].map((pct) => pct * ALCHEMY_ZONE_MASTERY_THRESHOLD);

// How much more zone-Mastery XP is needed before crossing into the NEXT
// charge/speed tier — used by craftingEngine.ts's offline batch loop to cap
// each iteration at the next milestone boundary, the same "stop before the
// quality/quantity curve would apply the wrong level to earlier-crafted
// items" technique equipmentRolls.ts's materialMasteryXpToNextPercentPoint
// uses for Blacksmithing, just coarser (4 discrete tiers instead of 100
// continuous points). Infinity once already in the top tier — nothing more
// to step toward for charge/speed purposes (xp can still grow toward the
// achievement, uncapped, just with no further milestone to cross).
export function alchemyZoneMasteryXpToNextMilestone(xp: number): number {
  for (const threshold of MILESTONE_XP_THRESHOLDS) {
    if (xp < threshold) return threshold - xp;
  }
  return Infinity;
}

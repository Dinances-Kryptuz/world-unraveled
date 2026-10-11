// Cooking's zone-Mastery axis — six independent bars (one per
// gameData/zones.ts ZONE), fed by RECIPES CRAFTED in that zone (flat XP per
// craft, credited to the recipe's own cookingZoneId — no cross-zone
// splitting, same posture as Enchanting's scroll-crafting axis, since no
// Cooking recipe spans two zones). Weighted by Recipe.cookingTier per the
// design brief's explicit "Tier1=1x, Tier2=5x, Tier3=25x" ask, balanced
// against real ingredient-acquisition difficulty (a Tier 3 Feast costs far
// more to gather than a Tier 1 dish, so it should move the bar far more).
//
// Mirrors alchemyMastery.ts/enchantingMastery.ts's shape exactly (percent =
// min(100, xp/threshold*100), 4 milestone tiers at 0/25/60/90%) and reuses
// BOTH of their milestone VALUES rather than inventing new ones: charges
// 1/2/3/4 (Alchemy's own numbers — this is what sets a crafted Stat Food
// serving's charges, fixed forever at craft time, never retroactive) and
// craftTimeReductionPct/materialPreserveChancePct 0/10/20/30% and 0/2/5/8%
// (the same two numbers shared by every other crafting-Mastery axis in this
// codebase). tier1BonusServings is the one new lever (+1 Recovery Food
// yield per craft from 25% on) — the design brief's own "25%: +1 Tier1
// serving" ask, which no existing axis has an equivalent for.
export const COOKING_ZONE_MASTERY_THRESHOLD = 2000;
export const COOKING_ZONE_MASTERY_XP_PER_CRAFT: Record<1 | 2 | 3, number> = { 1: 1, 2: 5, 3: 25 };

export function cookingZoneMasteryPercent(xp: number): number {
  return Math.min(100, (xp / COOKING_ZONE_MASTERY_THRESHOLD) * 100);
}

export interface CookingMasteryMilestone {
  tier1BonusServings: number;
  tier2Charges: number;
  craftTimeReductionPct: number;
  materialPreserveChancePct: number;
}

export function cookingMasteryMilestone(percent: number): CookingMasteryMilestone {
  if (percent >= 90) return { tier1BonusServings: 1, tier2Charges: 4, craftTimeReductionPct: 30, materialPreserveChancePct: 8 };
  if (percent >= 60) return { tier1BonusServings: 1, tier2Charges: 3, craftTimeReductionPct: 20, materialPreserveChancePct: 5 };
  if (percent >= 25) return { tier1BonusServings: 1, tier2Charges: 2, craftTimeReductionPct: 10, materialPreserveChancePct: 2 };
  return { tier1BonusServings: 0, tier2Charges: 1, craftTimeReductionPct: 0, materialPreserveChancePct: 0 };
}

const MILESTONE_XP_THRESHOLDS = [0.25, 0.6, 0.9].map((pct) => pct * COOKING_ZONE_MASTERY_THRESHOLD);

// Mirrors alchemyZoneMasteryXpToNextMilestone/enchantingZoneMasteryXpToNextMilestone
// exactly — caps craftingEngine.ts's offline batch loop at the next
// milestone boundary so a long offline window never applies a LATER tier's
// charges/speed/preserve bonus to servings crafted before that tier was
// reached.
export function cookingZoneMasteryXpToNextMilestone(xp: number): number {
  for (const threshold of MILESTONE_XP_THRESHOLDS) {
    if (xp < threshold) return threshold - xp;
  }
  return Infinity;
}

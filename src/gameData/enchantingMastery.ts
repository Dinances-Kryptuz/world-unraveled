// Enchanting's scroll-crafting zone-Mastery axis (Phase E7) — six
// independent bars (one per gameData/zones.ts ZONE), fed by scrolls CRAFTED
// in that zone's own tier (1 scroll = flat XP, credited to the recipe's own
// enchantingZoneId — no cross-zone splitting, unlike Alchemy's per-
// ingredient-unit crediting, since no scroll recipe spans two zones).
// Distinct from the combined Wand/Staff/Book equipment-Mastery track
// (WOOD_MATERIALS, "Enchanted Armaments") per the design brief's explicit
// "separate scroll-crafting Mastery per zone" ask — this is Enchanting's
// SECOND independent Mastery axis, not a replacement for the first.
//
// Per the design brief: "Mastery is shared per zone (not per-enchant);
// improves crafting speed + material-preservation chance only; never
// increases charges; never grants bonus output; title at 100%." Mirrors
// alchemyMastery.ts's shape (percent = min(100, xp/threshold*100), 4
// milestone tiers at 0/25/60/90%) but swaps "charges" for a material-
// preservation (ingredient-save) chance, since scrolls have no charge-
// count-per-item concept — every scroll always grants exactly
// ENCHANT_SCROLL_CHARGES regardless of Mastery (see enchanting.ts).
export const ENCHANTING_ZONE_MASTERY_XP_PER_SCROLL = 10;
export const ENCHANTING_ZONE_MASTERY_THRESHOLD = 2000;

export function enchantingZoneMasteryPercent(xp: number): number {
  return Math.min(100, (xp / ENCHANTING_ZONE_MASTERY_THRESHOLD) * 100);
}

export interface EnchantingMasteryMilestone {
  craftTimeReductionPct: number;
  materialPreserveChancePct: number;
}

// Same 0/10/20/30% craftTimeReductionPct progression as Alchemy's zone
// Mastery at the same 0/25/60/90% breakpoints (see alchemyMastery.ts) —
// deliberately reused rather than invented, so the two Enchanting Mastery
// axes (this one and the per-material equipment one) and Alchemy's zone
// Mastery all feel like the same underlying curve. materialPreserveChancePct
// mirrors craftingEngine.ts's existing craftingMasteryIngredientSaveChance
// milestone VALUES (0/2/5/8%) at these same breakpoints, for the same
// "never invent a new bonus-magnitude scale" reason.
export function enchantingMasteryMilestone(percent: number): EnchantingMasteryMilestone {
  if (percent >= 90) return { craftTimeReductionPct: 30, materialPreserveChancePct: 8 };
  if (percent >= 60) return { craftTimeReductionPct: 20, materialPreserveChancePct: 5 };
  if (percent >= 25) return { craftTimeReductionPct: 10, materialPreserveChancePct: 2 };
  return { craftTimeReductionPct: 0, materialPreserveChancePct: 0 };
}

const MILESTONE_XP_THRESHOLDS = [0.25, 0.6, 0.9].map((pct) => pct * ENCHANTING_ZONE_MASTERY_THRESHOLD);

// Mirrors alchemyZoneMasteryXpToNextMilestone exactly — used by
// craftingEngine.ts's offline batch loop to cap each iteration at the next
// milestone boundary so an in-progress batch never applies a LATER tier's
// speed/preserve bonus to scrolls crafted before that tier was reached.
export function enchantingZoneMasteryXpToNextMilestone(xp: number): number {
  for (const threshold of MILESTONE_XP_THRESHOLDS) {
    if (xp < threshold) return threshold - xp;
  }
  return Infinity;
}

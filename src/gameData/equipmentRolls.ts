// Randomized armor stat rolls + material Mastery math — the engine behind
// the Blacksmithing overhaul's "every consolidated armor piece rolls 2
// distinct random stats, Mastery improves their quality" design. Pure
// functions only; no Firestore access here (see firebase/character.ts for
// where these get called during crafting resolution).
import type { BaseStat } from './classStats';

// AGI added for Leatherworking (see combatFormulas.ts for its crit/dodge
// scaling) — the picker below is already generic over this list, so this is
// the only line needed to make AGI rollable on ANY armor piece, old
// Blacksmithing gear included, not just new Leatherworking gear.
const ARMOR_STATS: BaseStat[] = ['STR', 'STA', 'INT', 'SPI', 'AGI'];

// Per-base-item roll range, derived once (not hand-transcribed) from each
// item's old plain+Sacred pair's values, padded ±1 so the roll's average
// lands on the old static value (preserving pre-overhaul power level) while
// adding real variance. See the Phase 0 balancing pass for how these were
// computed; regenerate by re-running that script if an item's old values
// ever change (they won't, post-consolidation, since the old pairs are
// frozen legacy data — see items.ts's module comment on the 48 retired
// "sacred_*" entries).
export const ARMOR_STAT_RANGES: Record<string, { min: number; max: number }> = {
  copper_helm: { min: 2, max: 4 },
  copper_chestplate: { min: 3, max: 5 },
  copper_gauntlets: { min: 1, max: 3 },
  copper_bracers: { min: 1, max: 3 },
  copper_legplates: { min: 2, max: 5 },
  copper_greaves: { min: 1, max: 4 },
  copper_shield: { min: 2, max: 4 },
  bronze_helm: { min: 3, max: 5 },
  bronze_chestplate: { min: 4, max: 8 },
  bronze_gauntlets: { min: 2, max: 5 },
  bronze_bracers: { min: 2, max: 5 },
  bronze_legplates: { min: 4, max: 7 },
  bronze_greaves: { min: 2, max: 5 },
  bronze_shield: { min: 4, max: 7 },
  iron_helm: { min: 4, max: 7 },
  iron_chestplate: { min: 6, max: 10 },
  iron_gauntlets: { min: 3, max: 6 },
  iron_bracers: { min: 3, max: 6 },
  iron_legplates: { min: 5, max: 9 },
  iron_greaves: { min: 4, max: 7 },
  iron_shield: { min: 5, max: 8 },
  steel_helm: { min: 5, max: 9 },
  steel_chestplate: { min: 8, max: 12 },
  steel_gauntlets: { min: 4, max: 7 },
  steel_bracers: { min: 4, max: 7 },
  steel_legplates: { min: 7, max: 11 },
  steel_greaves: { min: 4, max: 8 },
  steel_shield: { min: 6, max: 10 },
  mithril_helm: { min: 7, max: 10 },
  mithril_chestplate: { min: 10, max: 14 },
  mithril_gauntlets: { min: 5, max: 8 },
  mithril_bracers: { min: 5, max: 8 },
  mithril_legplates: { min: 9, max: 13 },
  mithril_greaves: { min: 5, max: 9 },
  mithril_shield: { min: 8, max: 11 },
  thorium_helm: { min: 8, max: 12 },
  thorium_chestplate: { min: 12, max: 16 },
  thorium_gauntlets: { min: 6, max: 9 },
  thorium_bracers: { min: 6, max: 9 },
  thorium_legplates: { min: 10, max: 15 },
  thorium_greaves: { min: 7, max: 10 },
  thorium_shield: { min: 9, max: 13 },
  obsidian_helm: { min: 9, max: 13 },
  obsidian_chestplate: { min: 13, max: 19 },
  obsidian_gauntlets: { min: 7, max: 11 },
  obsidian_bracers: { min: 7, max: 11 },
  obsidian_legplates: { min: 12, max: 17 },
  obsidian_greaves: { min: 8, max: 11 },
  obsidian_shield: { min: 11, max: 15 },
  silver_necklace: { min: 2, max: 4 },
  silver_ring: { min: 1, max: 4 },
  gold_necklace: { min: 4, max: 8 },
  gold_ring: { min: 4, max: 7 },
  platinum_necklace: { min: 6, max: 10 },
  platinum_ring: { min: 5, max: 8 },

  // ── Leatherworking (6 tiers × 7 pieces) — ranges copied 1:1 from the
  // Blacksmithing analog piece of the same tier (helm/chestplate/gauntlets/
  // legplates/greaves respectively; Shoulders and Belt mirror Gauntlets',
  // since Blacksmithing has no equivalent of those two slots).
  handstitched_leather_helm: { min: 2, max: 4 },
  handstitched_leather_chest: { min: 3, max: 5 },
  handstitched_leather_gloves: { min: 1, max: 3 },
  handstitched_leather_legs: { min: 2, max: 5 },
  handstitched_leather_boots: { min: 1, max: 4 },
  handstitched_leather_shoulders: { min: 1, max: 3 },
  handstitched_leather_belt: { min: 1, max: 3 },
  fine_leather_helm: { min: 3, max: 5 },
  fine_leather_chest: { min: 4, max: 8 },
  fine_leather_gloves: { min: 2, max: 5 },
  fine_leather_legs: { min: 4, max: 7 },
  fine_leather_boots: { min: 2, max: 5 },
  fine_leather_shoulders: { min: 2, max: 5 },
  fine_leather_belt: { min: 2, max: 5 },
  barbaric_leather_helm: { min: 4, max: 7 },
  barbaric_leather_chest: { min: 6, max: 10 },
  barbaric_leather_gloves: { min: 3, max: 6 },
  barbaric_leather_legs: { min: 5, max: 9 },
  barbaric_leather_boots: { min: 4, max: 7 },
  barbaric_leather_shoulders: { min: 3, max: 6 },
  barbaric_leather_belt: { min: 3, max: 6 },
  nightscape_leather_helm: { min: 5, max: 9 },
  nightscape_leather_chest: { min: 8, max: 12 },
  nightscape_leather_gloves: { min: 4, max: 7 },
  nightscape_leather_legs: { min: 7, max: 11 },
  nightscape_leather_boots: { min: 4, max: 8 },
  nightscape_leather_shoulders: { min: 4, max: 7 },
  nightscape_leather_belt: { min: 4, max: 7 },
  wicked_leather_helm: { min: 7, max: 10 },
  wicked_leather_chest: { min: 10, max: 14 },
  wicked_leather_gloves: { min: 5, max: 8 },
  wicked_leather_legs: { min: 9, max: 13 },
  wicked_leather_boots: { min: 5, max: 9 },
  wicked_leather_shoulders: { min: 5, max: 8 },
  wicked_leather_belt: { min: 5, max: 8 },
  emberscar_leather_helm: { min: 8, max: 12 },
  emberscar_leather_chest: { min: 12, max: 16 },
  emberscar_leather_gloves: { min: 6, max: 9 },
  emberscar_leather_legs: { min: 10, max: 15 },
  emberscar_leather_boots: { min: 7, max: 10 },
  emberscar_leather_shoulders: { min: 6, max: 9 },
  emberscar_leather_belt: { min: 6, max: 9 },
};

// Mastery XP = (bars the recipe originally requires) × this constant —
// matches the user's own example (10 XP/bar). Confirmed pacing-neutral
// during the Phase 0 simulation: MATERIAL_MASTERY_XP_THRESHOLDS below
// scales directly with whatever this is set to, so changing it alone never
// changes how long mastery takes, only the raw XP numbers shown.
export const MASTERY_XP_PER_BAR = 10;

// Per-material XP needed to reach 100% Mastery — calibrated individually
// (Phase 0 simulation) so EVERY material takes ~6.5h of dedicated grinding
// on its own best (highest bars-per-craftSecond) recipe, which is ~20% of
// Blacksmithing's ~32.5h 1-100 leveling time, accounting for the
// self-reinforcing crafting-speed Mastery bonus. A single shared threshold
// would've made jewelry (2 bars/craft) take ~3x longer than metals (5
// bars/craft) to master, so this is deliberately per-material data rather
// than one global number — the FORMULA below is still universal, only the
// calibrated number differs, same category as this game's existing
// per-tier craftSeconds/xpAward data.
export const MATERIAL_MASTERY_XP_THRESHOLDS: Record<string, number> = {
  copper: 173854,
  bronze: 163627,
  iron: 144878,
  steel: 141922,
  mithril: 139083,
  thorium: 129984,
  obsidian: 123083,
  silver: 65451,
  gold: 55633,
  platinum: 49233,
  // Leatherworking's 6 tiers deliberately reuse craftSeconds (8/8.5/9.6/
  // 9.8/10/10.7) AND best-recipe (Chestplate, 5 bars) bar count 1:1 from
  // copper/bronze/iron/steel/mithril/thorium respectively (see recipes.ts's
  // module comment) — since this threshold's calibration depends only on
  // those two numbers, the already-calibrated Blacksmithing values apply
  // unchanged rather than needing a fresh simulation.
  light_leather: 173854,
  medium_leather: 163627,
  heavy_leather: 144878,
  thick_leather: 141922,
  rugged_leather: 139083,
  emberscar_leather: 129984,
};

// A material with no recipe tagged to it (shouldn't happen for any
// registered MaterialDef, but guards a typo'd materialId from crashing
// rather than silently mis-pacing) falls back to copper's threshold.
function thresholdFor(materialId: string): number {
  return MATERIAL_MASTERY_XP_THRESHOLDS[materialId] ?? MATERIAL_MASTERY_XP_THRESHOLDS.copper;
}

export function materialMasteryPercent(xp: number, materialId: string): number {
  return Math.min(100, (xp / thresholdFor(materialId)) * 100);
}

// How much mastery XP (0..100) a given amount of XP is short of the next
// whole percentage point — used by craftingEngine.ts's offline batch loop
// to step material-Mastery in ≤1%-point increments so stat-quality rolls
// use the mastery level AT THE TIME each item was crafted, not the batch's
// final mastery (see that file's resolveCraftingOffline).
export function materialMasteryXpToNextPercentPoint(xp: number, materialId: string): number {
  const threshold = thresholdFor(materialId);
  const currentPct = Math.min(100, (xp / threshold) * 100);
  if (currentPct >= 100) return Infinity;
  const nextPct = Math.floor(currentPct) + 1;
  return (nextPct / 100) * threshold - xp;
}

// +40% crafting speed at 100% Mastery, scaling smoothly from 0% — applied
// as a divisor on craftSeconds, same convention as the existing per-recipe
// Mastery speed bonus (craftingEngine.ts's craftingMasterySpeedMultiplier).
export function materialMasterySpeedMultiplier(masteryPercent: number): number {
  return 1 + 0.4 * (masteryPercent / 100);
}

// Up to a 20% chance of one extra free item at 100% Mastery, scaling
// smoothly from 0% — applied as an expected-value fraction on crafted
// quantity, same convention as craftingMasteryBonusChance. Bonus units
// never consume extra materials or award extra Mastery/profession XP (see
// firebase/character.ts's applyCraftingProfessionResult).
export function materialMasteryBonusChance(masteryPercent: number): number {
  return 0.2 * (masteryPercent / 100);
}

// How pronounced the mastery skew is at full tilt (0% or 100%) — the
// lowest-weighted value in a range is never less than
// (1 - MASTERY_SKEW_STRENGTH) / (1 + MASTERY_SKEW_STRENGTH) as likely as
// the highest-weighted one, so even a maxed-Mastery crafter can still roll
// the bottom of the range (never guarantees a perfect roll, per the
// requirement) while a 0%-Mastery crafter can still roll the top (perfect
// rolls must be possible at 0% Mastery, also per the requirement).
const MASTERY_SKEW_STRENGTH = 0.8;

// Range-agnostic, continuously mastery-interpolated weighted roll: favors
// the low end of [min,max] at 0% Mastery, the high end at 100%, flat/
// uniform at 50% — generalizes to ANY integer range with no per-material or
// per-item table (the specific weighting curve is the one tunable; the
// shape itself never changes), per the "do not hardcode this table
// separately for Copper/Bronze/etc" requirement.
export function rollMasteryWeightedValue(min: number, max: number, masteryPercent: number): number {
  if (max <= min) return min;
  const skew = (Math.min(100, Math.max(0, masteryPercent)) / 100 - 0.5) * 2; // -1..+1
  const weights: number[] = [];
  for (let v = min; v <= max; v++) {
    const t = (v - min) / (max - min); // 0..1
    weights.push(1 + MASTERY_SKEW_STRENGTH * skew * (2 * t - 1));
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return min + i;
  }
  return max;
}

export interface ArmorRollResult {
  rolls: Partial<Record<BaseStat, number>>;
}

// Picks 2 distinct stats uniformly from the 4-stat pool (each of the 6
// possible combinations equally likely — pick the first of 4 uniformly,
// then the second of the remaining 3 uniformly; every unordered pair then
// has exactly 2/12 = 1/6 probability), then rolls each one's value via
// rollMasteryWeightedValue using baseItemId's configured range. Mastery
// affects ONLY the numerical quality of the two rolled values, never which
// stats get chosen — the stat pick is independent of masteryPercent.
export function rollArmorStats(baseItemId: string, masteryPercent: number): ArmorRollResult {
  const range = ARMOR_STAT_RANGES[baseItemId];
  if (!range) return { rolls: {} };

  const shuffled = [...ARMOR_STATS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const [statA, statB] = shuffled;

  return {
    rolls: {
      [statA]: rollMasteryWeightedValue(range.min, range.max, masteryPercent),
      [statB]: rollMasteryWeightedValue(range.min, range.max, masteryPercent),
    },
  };
}

// Deterministic id so two identically-rolled items of the same base item
// stack into the same Inventory.equipmentInstances bucket instead of each
// needing their own entry — sorted by stat key so {STR:4,STA:6} and
// {STA:6,STR:4} (same roll, different insertion order) collapse together.
export function canonicalInstanceId(itemId: string, rolls: Partial<Record<BaseStat, number>>): string {
  const parts = Object.keys(rolls)
    .sort()
    .map((stat) => `${stat}${rolls[stat as BaseStat]}`);
  return `${itemId}:${parts.join('-')}`;
}

// How many distinct rolled-stat buckets a single base item id may hold in
// one inventory at once (see firebase/inventory.ts's grantEquipmentInstances)
// — a new distinct roll beyond this is dropped, same "loot dropped, nothing
// stops" convention bag-slot overflow already uses, rather than growing the
// inventory document without bound over a long-played character.
export const MAX_VARIANTS_PER_BASE_ITEM = 8;

// Randomized armor stat rolls + material Mastery math — the engine behind
// the Blacksmithing overhaul's "every consolidated armor piece rolls 2
// distinct random stats" design. Which TWO of the 5 stats land on a given
// piece is still random (and still drives the "of the Bear"-style suffix
// naming — see equipmentSuffixes.ts, which only ever looks at the stat
// KEYS, never their magnitude); the magnitude itself is now a fixed,
// deliberately modest number per item (Stat Budget Redesign — see
// ARMOR_STAT_VALUES below), not a Mastery-improvable roll. Pure functions
// only; no Firestore access here (see firebase/character.ts for where these
// get called during crafting resolution).
import type { BaseStat } from './classStats';

// AGI added for Leatherworking (see combatFormulas.ts for its crit/dodge
// scaling) — the picker below is already generic over this list, so this is
// the only line needed to make AGI rollable on ANY armor piece, old
// Blacksmithing gear included, not just new Leatherworking gear.
const ARMOR_STATS: BaseStat[] = ['STR', 'STA', 'INT', 'SPI', 'AGI'];

// Stat Budget Redesign — every crafted armor/jewelry/wand piece's 2 random
// stats now roll this ONE guaranteed number each, not a range. Previously
// each item rolled within a {min,max} band that improved toward `max` as
// material Mastery rose (the per-material speed/bonus-chance rewards from
// Mastery are untouched — only the "grinding Mastery eventually makes your
// gear noticeably stronger" lever is gone). That upside was quietly
// trivializing content over a long-played character: a maxed crafter's
// near-`max` rolls pushed survival margins well past what monsters/dungeons
// were tuned for (see combatFormulas.ts's MONSTER_DAMAGE_SCALE comment for
// that tuning). Fixing every value at the OLD range's `min` keeps each
// tier's already-tested escalation intact (every tier's min is still higher
// than the previous tier's) while removing the trivializing upside, so a
// zone's monsters/dungeons stay a real fight at every point in that zone's
// gearing curve, not just at the very start of it — leaning on potions/food
// for sustained difficulty stays meaningful throughout, not just early on.
// Equipment Rarity overhaul — thorium/obsidian (and their Leatherworking/
// Tailoring/Enchanting/jewelry equivalents) were bumped further above, no
// longer sitting at a flat "min" value like Z1-Z4. Zone 5/6 crafted gear
// now splits into two rarities by piece (see items.ts's matching `rarity`
// tags): Zone 5's smaller/earlier-unlocking pieces stay 'green' at the
// original value, its larger/later pieces (helm/shield/legplates/chest/
// weapon) become 'blue' at ×11/8; Zone 6's pieces are all 'blue' at ×13/9
// except the single most-desirable piece per profession (chestplate/robe/
// staff/etc.), which is 'purple' at ×15/9 — "limited purple," per the
// design brief's Zone 6 crafting column. The multiplier is applied to each
// tier's OWN old value, so every slot's existing relative weighting
// (chest > legs > helm > gloves/bracers/shoulders) carries over unchanged.
export const ARMOR_STAT_VALUES: Record<string, number> = {
  copper_helm: 2,
  copper_chestplate: 3,
  copper_gauntlets: 1,
  copper_bracers: 1,
  copper_legplates: 2,
  copper_greaves: 1,
  copper_shield: 2,
  bronze_helm: 3,
  bronze_chestplate: 4,
  bronze_gauntlets: 2,
  bronze_bracers: 2,
  bronze_legplates: 4,
  bronze_greaves: 2,
  bronze_shield: 4,
  iron_helm: 4,
  iron_chestplate: 6,
  iron_gauntlets: 3,
  iron_bracers: 3,
  iron_legplates: 5,
  iron_greaves: 4,
  iron_shield: 5,
  steel_helm: 5,
  steel_chestplate: 8,
  steel_gauntlets: 4,
  steel_bracers: 4,
  steel_legplates: 7,
  steel_greaves: 4,
  steel_shield: 6,
  mithril_helm: 7,
  mithril_chestplate: 10,
  mithril_gauntlets: 5,
  mithril_bracers: 5,
  mithril_legplates: 9,
  mithril_greaves: 5,
  mithril_shield: 8,
  thorium_helm: 11,
  thorium_chestplate: 16,
  thorium_gauntlets: 7,
  thorium_bracers: 7,
  thorium_legplates: 14,
  thorium_greaves: 8,
  thorium_shield: 12,
  obsidian_helm: 13,
  obsidian_chestplate: 22,
  obsidian_gauntlets: 10,
  obsidian_bracers: 10,
  obsidian_legplates: 17,
  obsidian_greaves: 12,
  obsidian_shield: 16,
  // ── Blacksmithing Shoulders (7 tiers) — Equipment overhaul's itemization
  // parity fix (user-confirmed): Blacksmithing had every other plate slot
  // (Bracers included) but no Shoulders. Ranges mirror each tier's own
  // Gauntlets 1:1, same "Shoulders mirrors Gauntlets'" rule this file
  // already uses for Leatherworking/Tailoring's Shoulders below.
  copper_shoulders: 1,
  bronze_shoulders: 2,
  iron_shoulders: 3,
  steel_shoulders: 4,
  mithril_shoulders: 5,
  thorium_shoulders: 7,
  obsidian_shoulders: 10,
  silver_necklace: 2,
  silver_ring: 1,
  gold_necklace: 4,
  gold_ring: 4,
  platinum_necklace: 9,
  platinum_ring: 8,
  // ── Leatherworking (6 tiers × 7 pieces) — ranges copied 1:1 from the
  // Blacksmithing analog piece of the same tier (helm/chestplate/gauntlets/
  // legplates/greaves respectively; Shoulders and Belt mirror Gauntlets',
  // since Blacksmithing has no equivalent of those two slots).
  handstitched_leather_helm: 2,
  handstitched_leather_chest: 3,
  handstitched_leather_gloves: 1,
  handstitched_leather_legs: 2,
  handstitched_leather_boots: 1,
  handstitched_leather_shoulders: 1,
  handstitched_leather_belt: 1,
  fine_leather_helm: 3,
  fine_leather_chest: 4,
  fine_leather_gloves: 2,
  fine_leather_legs: 4,
  fine_leather_boots: 2,
  fine_leather_shoulders: 2,
  fine_leather_belt: 2,
  barbaric_leather_helm: 4,
  barbaric_leather_chest: 6,
  barbaric_leather_gloves: 3,
  barbaric_leather_legs: 5,
  barbaric_leather_boots: 4,
  barbaric_leather_shoulders: 3,
  barbaric_leather_belt: 3,
  nightscape_leather_helm: 5,
  nightscape_leather_chest: 8,
  nightscape_leather_gloves: 4,
  nightscape_leather_legs: 7,
  nightscape_leather_boots: 4,
  nightscape_leather_shoulders: 4,
  nightscape_leather_belt: 4,
  wicked_leather_helm: 10,
  wicked_leather_chest: 14,
  wicked_leather_gloves: 6,
  wicked_leather_legs: 12,
  wicked_leather_boots: 6,
  wicked_leather_shoulders: 6,
  wicked_leather_belt: 6,
  emberscar_leather_helm: 12,
  emberscar_leather_chest: 20,
  emberscar_leather_gloves: 9,
  emberscar_leather_legs: 14,
  emberscar_leather_boots: 10,
  emberscar_leather_shoulders: 9,
  emberscar_leather_belt: 9,
  // ── Leatherworking Bracers (6 tiers) — Equipment overhaul's itemization
  // parity fix (user-confirmed): Leatherworking had Shoulders at every
  // tier but no Bracers. Ranges mirror each tier's own Gloves 1:1.
  handstitched_leather_bracers: 1,
  fine_leather_bracers: 2,
  barbaric_leather_bracers: 3,
  nightscape_leather_bracers: 4,
  wicked_leather_bracers: 6,
  emberscar_leather_bracers: 9,
  // ── Tailoring (6 tiers × 6 armor pieces + 6 capes) — ranges copied 1:1
  // from the Blacksmithing analog piece of the same tier (helm/chestplate/
  // gauntlets/legplates/greaves; Shoulders AND Cape mirror Gauntlets').
  tailored_linen_helm: 2,
  tailored_linen_robe: 3,
  tailored_linen_gloves: 1,
  tailored_linen_leggings: 2,
  tailored_linen_boots: 1,
  tailored_linen_shoulders: 1,
  wool_robe_helm: 3,
  wool_robe: 4,
  wool_gloves: 2,
  wool_leggings: 4,
  wool_boots: 2,
  wool_shoulders: 2,
  silk_robe_helm: 4,
  silk_robe: 6,
  silk_gloves: 3,
  silk_leggings: 5,
  silk_boots: 4,
  silk_shoulders: 3,
  mageweave_robe_helm: 5,
  mageweave_robe: 8,
  mageweave_gloves: 4,
  mageweave_leggings: 7,
  mageweave_boots: 4,
  mageweave_shoulders: 4,
  runecloth_robe_helm: 10,
  runecloth_robe: 14,
  runecloth_gloves: 6,
  runecloth_leggings: 12,
  runecloth_boots: 6,
  runecloth_shoulders: 6,
  ember_robe_helm: 12,
  ember_robe: 20,
  ember_gloves: 9,
  ember_leggings: 14,
  ember_boots: 10,
  ember_shoulders: 9,
  // ── Tailoring Bracers (6 tiers) — Equipment overhaul's itemization
  // parity fix (user-confirmed): Tailoring had Shoulders at every tier but
  // no Bracers. Ranges mirror each tier's own Gloves 1:1.
  tailored_linen_bracers: 1,
  wool_bracers: 2,
  silk_bracers: 3,
  mageweave_bracers: 4,
  runecloth_bracers: 6,
  ember_bracers: 9,
  cape_of_linen: 1,
  cape_of_wool: 2,
  cape_of_silk: 3,
  cape_of_mageweave: 4,
  cape_of_runecloth: 6,
  cape_of_ember: 9,
  // ── Enchanting (6 zones x Wand/Staff/Book) — Wand/Book reuse the same
  // "helm"-tier budget as Blacksmithing/Tailoring's own lightest accessory
  // slot at each zone; Staff is roughly double both numbers, "a bigger
  // stat budget to compensate for 2 slots" per the design brief (this
  // engine has no actual 1h/2h slot exclusivity to compensate for — see
  // types.ts's EquipmentSlot comment — so this is purely an itemization
  // choice, not an engine rule).
  rough_wand: 2,
  rough_staff: 4,
  rough_tome: 2,
  aged_wand: 3,
  aged_staff: 6,
  aged_tome: 3,
  heartwood_wand: 4,
  heartwood_staff: 8,
  heartwood_tome: 4,
  ironwood_wand: 5,
  ironwood_staff: 10,
  ironwood_tome: 5,
  charwood_wand: 8,
  charwood_staff: 19,
  charwood_tome: 8,
  emberwood_wand: 12,
  emberwood_staff: 27,
  emberwood_tome: 12,
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
  // Tailoring's 6 tiers reuse the exact same craftSeconds/best-recipe-bar-
  // count trick as Leatherworking above — same 6 Blacksmithing values.
  linen_cloth: 173854,
  wool_cloth: 163627,
  silk_cloth: 144878,
  mageweave_cloth: 141922,
  runecloth: 139083,
  ember_cloth: 129984,
  // Enchanting's 6 zones reuse the exact same craftSeconds/best-recipe-bar-
  // count trick as Leatherworking/Tailoring above — same 6 Blacksmithing
  // values, now covering the ONE combined Wand/Staff/Book track per zone.
  simple_wood: 173854,
  star_wood: 163627,
  mystic_wood: 144878,
  enchanted_hardwood: 141922,
  ancient_runewood: 139083,
  emberheart_wood: 129984,
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

export interface ArmorRollResult {
  rolls: Partial<Record<BaseStat, number>>;
}

// Picks 2 distinct stats uniformly from the 5-stat pool (each of the 10
// possible combinations equally likely — pick the first of 5 uniformly,
// then the second of the remaining 4 uniformly; every unordered pair then
// has exactly 2/20 = 1/10 probability) and assigns each one baseItemId's
// fixed ARMOR_STAT_VALUES amount. Only WHICH stats get picked is random —
// see this file's top-of-module comment for why the magnitude isn't.
export function rollArmorStats(baseItemId: string): ArmorRollResult {
  const value = ARMOR_STAT_VALUES[baseItemId];
  if (value === undefined) return { rolls: {} };

  const shuffled = [...ARMOR_STATS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const [statA, statB] = shuffled;

  return {
    rolls: {
      [statA]: value,
      [statB]: value,
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

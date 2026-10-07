import type { Zone, GatherNode, FishingHole } from './types';

export const DEFAULT_ZONE_ID = 'greenhollow_fields';

// Explicit 1-6 tier ordering — the content-gated progression sequence a
// character moves through (matches each zone's own level range), used
// anywhere a cost or difficulty needs to scale by "how far into the game is
// this zone" rather than by character level directly (e.g. companions.ts's
// dungeonCompanionFee, zone travel time once that lands). An explicit map
// rather than relying on ZONES' object key order, which isn't guaranteed.
export const ZONE_TIER: Record<string, number> = {
  greenhollow_fields: 1,
  stonecrag_foothills: 2,
  emberfall_ridge: 3,
  cinderfall_depths: 4,
  molten_scar: 5,
  cinderheart_crater: 6,
};

// Shared by the zone selector (now in TopBar.tsx, visible from every page —
// see App.tsx) and anywhere else that needs to know if a zone is reachable
// yet, not just ZoneScreen.
export function isZoneUnlocked(zone: Zone, characterLevel: number): boolean {
  return zone.unlockRequirement.type === 'none' || characterLevel >= zone.unlockRequirement.level;
}

// One fishing hole per zone, each yielding that zone's fish (see items.ts).
// Fishing now runs on the exact same Profession XP + Mastery architecture
// as Mining/Herbalism/Skinning (gatheringEngine.ts) — requiredLevel is both
// the gate AND the color-tier reference point, baseXp is the Orange (100%)
// XP award, and a flat 78% catchChance ("your fish got away" otherwise: no
// fish, no XP, no Mastery) is the one thing that still makes Fishing
// different, landing it at ~50 active hours to level 100 versus the other
// three's ~40 — slower because it's safe and predictable, not because its
// curve is harsher. 6 tiers (1 per zone, spread 1-90) rather than the 9-12
// the other three professions use, since Fishing has only ever had one fish
// per zone.
export const FISHING_HOLES: Record<string, FishingHole> = {
  greenhollow_fishing_hole: {
    id: 'greenhollow_fishing_hole', name: 'Greenhollow Stream', zoneId: 'greenhollow_fields',
    requiredLevel: 1, itemId: 'brook_trout', baseXp: 10, secondsPerAction: 9, catchChance: 0.78,
  },
  stonecrag_fishing_hole: {
    id: 'stonecrag_fishing_hole', name: 'Stonecrag Tarn', zoneId: 'stonecrag_foothills',
    requiredLevel: 15, itemId: 'mountain_char', baseXp: 16, secondsPerAction: 10, catchChance: 0.78,
  },
  emberfall_fishing_hole: {
    id: 'emberfall_fishing_hole', name: 'Emberfall Hot Spring', zoneId: 'emberfall_ridge',
    requiredLevel: 30, itemId: 'ember_eel', baseXp: 26, secondsPerAction: 11, catchChance: 0.78,
  },
  cinderfall_fishing_hole: {
    id: 'cinderfall_fishing_hole', name: 'Cinderfall Flooded Hall', zoneId: 'cinderfall_depths',
    requiredLevel: 48, itemId: 'ashfin_carp', baseXp: 43, secondsPerAction: 13, catchChance: 0.78,
  },
  molten_scar_fishing_hole: {
    id: 'molten_scar_fishing_hole', name: 'Molten Scar Cooling Pool', zoneId: 'molten_scar',
    requiredLevel: 68, itemId: 'magma_darter', baseXp: 70, secondsPerAction: 15, catchChance: 0.78,
  },
  cinderheart_fishing_hole: {
    id: 'cinderheart_fishing_hole', name: 'Cinderheart Ember Pool', zoneId: 'cinderheart_crater',
    requiredLevel: 90, itemId: 'emberheart_koi', baseXp: 114, secondsPerAction: 17, catchChance: 0.78,
  },
};

// All 4 gathering professions (Mining, Herbalism, Skinning here; Fishing
// above) now run on the same 1-100 Profession XP + Mastery architecture —
// see gatheringEngine.ts's module doc comment. requiredLevel is both the
// unlock gate AND the color-tier reference point (gatheringColorTier compares
// it against the player's profession level); baseXp is the Orange (100%)
// profession-XP award for that node. rareBonus is unrelated to the XP
// system — it's a flat "10% chance of a bonus material" roll kept unchanged
// from the old design. Each profession's own baseXp/secondsPerAction
// progression (not the shared XP curve) is what makes Mining/Herbalism/
// Skinning each land at ~40 active hours to level 100.
export const GATHER_NODES: Record<string, GatherNode> = {
  greenhollow_copper_vein: {
    id: 'greenhollow_copper_vein',
    name: 'Copper Vein',
    profession: 'mining',
    zoneId: 'greenhollow_fields',
    requiredLevel: 1,
    itemId: 'copper_ore',
    baseXp: 10,
    secondsPerAction: 8,
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'granite_chunk', chance: 0.1 },
  },
  greenhollow_peacebloom_patch: {
    id: 'greenhollow_peacebloom_patch',
    name: 'Peacebloom Patch',
    profession: 'herbalism',
    zoneId: 'greenhollow_fields',
    requiredLevel: 1,
    itemId: 'peacebloom',
    baseXp: 8,
    secondsPerAction: 7,
  },
  greenhollow_hunting_grounds: {
    id: 'greenhollow_hunting_grounds',
    name: 'Hunting Grounds',
    profession: 'skinning',
    zoneId: 'greenhollow_fields',
    requiredLevel: 1,
    itemId: 'leather_scraps',
    baseXp: 8,
    secondsPerAction: 7,
    requiredToolType: 'skinning_knife',
  },

  stonecrag_tin_vein: {
    id: 'stonecrag_tin_vein',
    name: 'Tin Vein',
    profession: 'mining',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'tin_ore',
    baseXp: 13,
    secondsPerAction: 9,
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'flint', chance: 0.1 },
  },
  // Zone 2's second mineable ore per the design spec — a real selectable
  // node (not a rareBonus roll), gated one bracket above the zone's tin vein.
  stonecrag_silver_vein: {
    id: 'stonecrag_silver_vein',
    name: 'Silver Vein',
    profession: 'mining',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 20,
    itemId: 'silver_ore',
    baseXp: 17,
    secondsPerAction: 10,
    requiredToolType: 'mining_pick',
  },
  stonecrag_sage_patch: {
    id: 'stonecrag_sage_patch',
    name: 'Mountain Sage Patch',
    profession: 'herbalism',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'mountain_sage',
    baseXp: 12,
    secondsPerAction: 8,
  },
  stonecrag_foothill_game: {
    id: 'stonecrag_foothill_game',
    name: 'Foothill Game',
    profession: 'skinning',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'coarse_hide',
    baseXp: 12,
    secondsPerAction: 8,
    requiredToolType: 'skinning_knife',
  },

  emberfall_iron_vein: {
    id: 'emberfall_iron_vein',
    name: 'Iron Vein',
    profession: 'mining',
    zoneId: 'emberfall_ridge',
    requiredLevel: 30,
    itemId: 'iron_ore',
    baseXp: 23,
    secondsPerAction: 10,
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'sulfur_chunk', chance: 0.1 },
  },
  emberfall_sunpetal_patch: {
    id: 'emberfall_sunpetal_patch',
    name: 'Sunpetal Patch',
    profession: 'herbalism',
    zoneId: 'emberfall_ridge',
    requiredLevel: 25,
    itemId: 'sunpetal',
    baseXp: 18,
    secondsPerAction: 9,
  },
  emberfall_ashfang_den: {
    id: 'emberfall_ashfang_den',
    name: 'Ashfang Den',
    profession: 'skinning',
    zoneId: 'emberfall_ridge',
    requiredLevel: 25,
    itemId: 'scaled_hide',
    baseXp: 18,
    secondsPerAction: 9,
    requiredToolType: 'skinning_knife',
  },

  cinderfall_ore_seam: {
    id: 'cinderfall_ore_seam',
    name: 'Mithril Vein',
    profession: 'mining',
    zoneId: 'cinderfall_depths',
    requiredLevel: 50,
    itemId: 'mithril_ore',
    baseXp: 40,
    secondsPerAction: 12,
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'shadowore', chance: 0.1 },
  },
  // Zone 4's second mineable ore per the design spec — gated a bracket below
  // the zone's mithril vein.
  cinderfall_gold_vein: {
    id: 'cinderfall_gold_vein',
    name: 'Gold Vein',
    profession: 'mining',
    zoneId: 'cinderfall_depths',
    requiredLevel: 40,
    itemId: 'gold_ore',
    baseXp: 30,
    secondsPerAction: 11,
    requiredToolType: 'mining_pick',
  },
  cinderfall_emberpetal_patch: {
    id: 'cinderfall_emberpetal_patch',
    name: 'Emberpetal Patch',
    profession: 'herbalism',
    zoneId: 'cinderfall_depths',
    requiredLevel: 40,
    itemId: 'emberpetal',
    baseXp: 28,
    secondsPerAction: 10,
  },
  cinderfall_ash_burrow: {
    id: 'cinderfall_ash_burrow',
    name: 'Ash Burrow',
    profession: 'skinning',
    zoneId: 'cinderfall_depths',
    requiredLevel: 40,
    itemId: 'ashhide',
    baseXp: 28,
    secondsPerAction: 10,
    requiredToolType: 'skinning_knife',
  },

  molten_scar_brimstone_vein: {
    id: 'molten_scar_brimstone_vein',
    name: 'Thorium Vein',
    profession: 'mining',
    zoneId: 'molten_scar',
    requiredLevel: 60,
    itemId: 'thorium_ore',
    baseXp: 53,
    secondsPerAction: 13,
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'obsidian_shard', chance: 0.1 },
  },
  molten_scar_cinderbloom_patch: {
    id: 'molten_scar_cinderbloom_patch',
    name: 'Cinderbloom Patch',
    profession: 'herbalism',
    zoneId: 'molten_scar',
    requiredLevel: 60,
    itemId: 'cinderbloom',
    baseXp: 43,
    secondsPerAction: 12,
  },
  molten_scar_scaleback_den: {
    id: 'molten_scar_scaleback_den',
    name: 'Scaleback Den',
    profession: 'skinning',
    zoneId: 'molten_scar',
    requiredLevel: 60,
    itemId: 'scaleback_hide',
    baseXp: 43,
    secondsPerAction: 12,
    requiredToolType: 'skinning_knife',
  },

  cinderheart_ore_vein: {
    id: 'cinderheart_ore_vein',
    name: 'Obsidian Vein',
    profession: 'mining',
    zoneId: 'cinderheart_crater',
    requiredLevel: 90,
    itemId: 'obsidian_ore',
    baseXp: 92,
    secondsPerAction: 16,
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'starforge_ore', chance: 0.1 },
  },
  // Zone 6's second mineable ore per the design spec — gated a bracket below
  // the zone's obsidian vein.
  cinderheart_platinum_vein: {
    id: 'cinderheart_platinum_vein',
    name: 'Platinum Vein',
    profession: 'mining',
    zoneId: 'cinderheart_crater',
    requiredLevel: 80,
    itemId: 'platinum_ore',
    baseXp: 70,
    secondsPerAction: 15,
    requiredToolType: 'mining_pick',
  },
  cinderheart_bloom_patch: {
    id: 'cinderheart_bloom_patch',
    name: 'Emberheart Patch',
    profession: 'herbalism',
    zoneId: 'cinderheart_crater',
    requiredLevel: 85,
    itemId: 'emberheart_bloom',
    baseXp: 65,
    secondsPerAction: 13,
  },
  cinderheart_hide_grounds: {
    id: 'cinderheart_hide_grounds',
    name: 'Emberscale Grounds',
    profession: 'skinning',
    zoneId: 'cinderheart_crater',
    requiredLevel: 85,
    itemId: 'emberscale_hide',
    baseXp: 65,
    secondsPerAction: 13,
    requiredToolType: 'skinning_knife',
  },

  // ── A 2nd node per gathering profession per zone — Herbalism/Skinning run
  // 2 tiers per zone (one at the zone's entry level, one a bit above it);
  // same material-value schedule as the zone's original node's "sibling"
  // bracket, just a different material, so each profession has more than one
  // thing to find per zone and gear changes feel incremental, not stepped.
  greenhollow_wildroot_cluster: {
    id: 'greenhollow_wildroot_cluster', name: 'Wildroot Cluster', profession: 'herbalism', zoneId: 'greenhollow_fields',
    requiredLevel: 4, itemId: 'wildroot', baseXp: 10, secondsPerAction: 7,
  },
  greenhollow_rabbit_warren: {
    id: 'greenhollow_rabbit_warren', name: 'Rabbit Warren', profession: 'skinning', zoneId: 'greenhollow_fields',
    requiredLevel: 4, itemId: 'rabbit_pelt', baseXp: 10, secondsPerAction: 7, requiredToolType: 'skinning_knife',
  },
  stonecrag_frostcap_patch: {
    id: 'stonecrag_frostcap_patch', name: 'Frostcap Patch', profession: 'herbalism', zoneId: 'stonecrag_foothills',
    requiredLevel: 14, itemId: 'frostcap', baseXp: 15, secondsPerAction: 8,
  },
  stonecrag_jackal_den: {
    id: 'stonecrag_jackal_den', name: 'Jackal Den', profession: 'skinning', zoneId: 'stonecrag_foothills',
    requiredLevel: 14, itemId: 'jackal_fur', baseXp: 15, secondsPerAction: 8, requiredToolType: 'skinning_knife',
  },
  emberfall_emberleaf_patch: {
    id: 'emberfall_emberleaf_patch', name: 'Emberleaf Patch', profession: 'herbalism', zoneId: 'emberfall_ridge',
    requiredLevel: 30, itemId: 'emberleaf', baseXp: 23, secondsPerAction: 10,
  },
  emberfall_wolfrun_thicket: {
    id: 'emberfall_wolfrun_thicket', name: 'Wolfrun Thicket', profession: 'skinning', zoneId: 'emberfall_ridge',
    requiredLevel: 30, itemId: 'cinderwolf_pelt', baseXp: 23, secondsPerAction: 10, requiredToolType: 'skinning_knife',
  },
  cinderfall_ashroot_patch: {
    id: 'cinderfall_ashroot_patch', name: 'Ashroot Patch', profession: 'herbalism', zoneId: 'cinderfall_depths',
    requiredLevel: 46, itemId: 'ashroot', baseXp: 35, secondsPerAction: 11,
  },
  cinderfall_scavenger_den: {
    id: 'cinderfall_scavenger_den', name: 'Scavenger Den', profession: 'skinning', zoneId: 'cinderfall_depths',
    requiredLevel: 46, itemId: 'scavenger_hide', baseXp: 35, secondsPerAction: 11, requiredToolType: 'skinning_knife',
  },
  molten_scar_scorchweed_patch: {
    id: 'molten_scar_scorchweed_patch', name: 'Scorchweed Patch', profession: 'herbalism', zoneId: 'molten_scar',
    requiredLevel: 68, itemId: 'scorchweed', baseXp: 52, secondsPerAction: 12,
  },
  molten_scar_scaleback_nest: {
    id: 'molten_scar_scaleback_nest', name: 'Scaleback Nest', profession: 'skinning', zoneId: 'molten_scar',
    requiredLevel: 68, itemId: 'scaleback_scale', baseXp: 52, secondsPerAction: 12, requiredToolType: 'skinning_knife',
  },
  cinderheart_heartbloom_patch: {
    id: 'cinderheart_heartbloom_patch', name: 'Heartbloom Patch', profession: 'herbalism', zoneId: 'cinderheart_crater',
    requiredLevel: 95, itemId: 'heartbloom', baseXp: 80, secondsPerAction: 14,
  },
  cinderheart_emberscale_nest: {
    id: 'cinderheart_emberscale_nest', name: 'Emberscale Nest', profession: 'skinning', zoneId: 'cinderheart_crater',
    requiredLevel: 95, itemId: 'emberscale_claw', baseXp: 80, secondsPerAction: 14, requiredToolType: 'skinning_knife',
  },
};

export const ZONES: Record<string, Zone> = {
  greenhollow_fields: {
    id: 'greenhollow_fields',
    name: 'Greenhollow Fields',
    description:
      'A peaceful farming region surrounded by forests and rolling hills. It is the first place new adventurers learn to fight, gather, and explore.',
    levelRange: [1, 15],
    unlockRequirement: { type: 'none' },
    monsterIds: ['greenhorn_boar', 'forest_wolf', 'wild_kobold', 'thornback_hare'],
    gatherNodeIds: [
      'greenhollow_copper_vein', 'greenhollow_peacebloom_patch', 'greenhollow_hunting_grounds',
      'greenhollow_wildroot_cluster', 'greenhollow_rabbit_warren',
    ],
    fishingHoleIds: ['greenhollow_fishing_hole'],
  },

  stonecrag_foothills: {
    id: 'stonecrag_foothills',
    name: 'Stonecrag Foothills',
    description:
      'Windswept slopes and broken rock rising above Greenhollow Fields. Jackals and goats roam the lower trails; bandits and worse hold the higher ground.',
    levelRange: [8, 25],
    unlockRequirement: { type: 'characterLevel', level: 8 },
    monsterIds: ['ridge_jackal', 'craggy_goat', 'rubble_crawler', 'highland_bandit', 'crag_wolf_alpha'],
    gatherNodeIds: [
      'stonecrag_tin_vein', 'stonecrag_silver_vein', 'stonecrag_sage_patch', 'stonecrag_foothill_game',
      'stonecrag_frostcap_patch', 'stonecrag_jackal_den',
    ],
    fishingHoleIds: ['stonecrag_fishing_hole'],
  },

  emberfall_ridge: {
    id: 'emberfall_ridge',
    name: 'Emberfall Ridge',
    description:
      'A volcanic highland beyond Stonecrag, scarred by old fissures that still breathe heat. Fire-hardened wolves and raiders hold the ridge, and an ancient dwarven forge lies cracked open at its heart.',
    levelRange: [25, 40],
    unlockRequirement: { type: 'characterLevel', level: 25 },
    monsterIds: ['cinder_wolf', 'ashwing_bat', 'molten_crawler', 'ridgeback_marauder', 'scorched_drake'],
    gatherNodeIds: [
      'emberfall_iron_vein', 'emberfall_sunpetal_patch', 'emberfall_ashfang_den',
      'emberfall_emberleaf_patch', 'emberfall_wolfrun_thicket',
    ],
    fishingHoleIds: ['emberfall_fishing_hole'],
  },

  cinderfall_depths: {
    id: 'cinderfall_depths',
    name: 'Cinderfall Depths',
    description:
      'Once a thriving dwarven mining city, Cinderfall was swallowed by fire and ash generations ago. Its ruins are now home to scavengers, restless spirits, and constructs still obeying orders no living dwarf gave.',
    levelRange: [30, 44],
    unlockRequirement: { type: 'characterLevel', level: 30 },
    monsterIds: ['ash_wraith', 'cinder_scavenger', 'ashforge_golem', 'ember_stalker', 'ruin_marauder'],
    gatherNodeIds: [
      'cinderfall_ore_seam', 'cinderfall_gold_vein', 'cinderfall_emberpetal_patch', 'cinderfall_ash_burrow',
      'cinderfall_ashroot_patch', 'cinderfall_scavenger_den',
    ],
    fishingHoleIds: ['cinderfall_fishing_hole'],
  },

  molten_scar: {
    id: 'molten_scar',
    name: 'The Molten Scar',
    description:
      'A massive rift has torn open the earth here, spilling lava and heat into the world above. Cultists who worship the stirring fire below have made this place their own, and the land itself seems to answer their call.',
    levelRange: [40, 54],
    unlockRequirement: { type: 'characterLevel', level: 40 },
    monsterIds: ['cultist_adept', 'living_ember', 'scaleback_drake', 'cultist_zealot', 'magma_hound'],
    gatherNodeIds: [
      'molten_scar_brimstone_vein', 'molten_scar_cinderbloom_patch', 'molten_scar_scaleback_den',
      'molten_scar_scorchweed_patch', 'molten_scar_scaleback_nest',
    ],
    fishingHoleIds: ['molten_scar_fishing_hole'],
  },

  cinderheart_crater: {
    id: 'cinderheart_crater',
    name: 'Cinderheart Crater',
    description:
      'At the world’s molten heart lies a crater no living thing should call home — yet the fire’s servants gather here in growing numbers, drawn by a power stirring after ages of sleep. This is the frontier of what’s still to come.',
    levelRange: [48, 60],
    unlockRequirement: { type: 'characterLevel', level: 48 },
    monsterIds: ['emberlord_cultist', 'flamewalker', 'charhide_behemoth', 'ashfall_harbinger', 'emberguard_sentinel'],
    gatherNodeIds: [
      'cinderheart_ore_vein', 'cinderheart_platinum_vein', 'cinderheart_bloom_patch', 'cinderheart_hide_grounds',
      'cinderheart_heartbloom_patch', 'cinderheart_emberscale_nest',
    ],
    fishingHoleIds: ['cinderheart_fishing_hole'],
  },
};

// Which zone "belongs to" a given character level — the zone with the
// highest unlockRequirement.level that's still <= level, i.e. the most
// advanced zone that level could actually be standing in. Used anywhere
// level-gated content needs a home zone to be trained/bought in (Class
// Trainer spells, gameData/abilityTraining.ts) — the same stepped
// band-by-zone-unlock-level idea professionTrainers.ts already uses for the
// 4 profession-rank trainers, generalized to any level.
export function zoneForLevel(level: number): string {
  let bestZoneId = DEFAULT_ZONE_ID;
  let bestReq = -1;
  for (const zone of Object.values(ZONES)) {
    const req = zone.unlockRequirement.type === 'none' ? 0 : zone.unlockRequirement.level;
    if (req <= level && req > bestReq) {
      bestReq = req;
      bestZoneId = zone.id;
    }
  }
  return bestZoneId;
}

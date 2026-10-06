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
// Deliberately a flat ~65% catch chance per cast with no "requiredLevel"
// skill gate at all — Fishing has no character-level requirement to START
// at any rank (see professionTiers.ts), and resolveFishing's own
// fishingSkillupChance curve (not catch chance) is what makes higher skill
// meaningfully slower to grind, per the design brief.
export const FISHING_HOLES: Record<string, FishingHole> = {
  greenhollow_fishing_hole: {
    id: 'greenhollow_fishing_hole', name: 'Greenhollow Stream', zoneId: 'greenhollow_fields',
    requiredLevel: 1, lootTable: [{ itemId: 'brook_trout', chance: 0.65, minQty: 1, maxQty: 2 }],
    xpPerCatch: 5, secondsPerAction: 10,
  },
  stonecrag_fishing_hole: {
    id: 'stonecrag_fishing_hole', name: 'Stonecrag Tarn', zoneId: 'stonecrag_foothills',
    requiredLevel: 1, lootTable: [{ itemId: 'mountain_char', chance: 0.65, minQty: 1, maxQty: 2 }],
    xpPerCatch: 9, secondsPerAction: 11,
  },
  emberfall_fishing_hole: {
    id: 'emberfall_fishing_hole', name: 'Emberfall Hot Spring', zoneId: 'emberfall_ridge',
    requiredLevel: 1, lootTable: [{ itemId: 'ember_eel', chance: 0.65, minQty: 1, maxQty: 2 }],
    xpPerCatch: 13, secondsPerAction: 12,
  },
  cinderfall_fishing_hole: {
    id: 'cinderfall_fishing_hole', name: 'Cinderfall Flooded Hall', zoneId: 'cinderfall_depths',
    requiredLevel: 1, lootTable: [{ itemId: 'ashfin_carp', chance: 0.65, minQty: 1, maxQty: 2 }],
    xpPerCatch: 17, secondsPerAction: 13,
  },
  molten_scar_fishing_hole: {
    id: 'molten_scar_fishing_hole', name: 'Molten Scar Cooling Pool', zoneId: 'molten_scar',
    requiredLevel: 1, lootTable: [{ itemId: 'magma_darter', chance: 0.65, minQty: 1, maxQty: 2 }],
    xpPerCatch: 21, secondsPerAction: 14,
  },
  cinderheart_fishing_hole: {
    id: 'cinderheart_fishing_hole', name: 'Cinderheart Ember Pool', zoneId: 'cinderheart_crater',
    requiredLevel: 1, lootTable: [{ itemId: 'emberheart_koi', chance: 0.65, minQty: 1, maxQty: 2 }],
    xpPerCatch: 25, secondsPerAction: 15,
  },
};

export const GATHER_NODES: Record<string, GatherNode> = {
  // Mining/Smithing pilot the new Mastery engine (gameData/masteryEngine.ts)
  // instead of activityEngine.ts's discrete skill-up-chance model — see its
  // module doc comment. requiredLevel/colorBreakpoints keep their existing
  // meaning (minimum profession skill / orange-yellow-green-grey bands);
  // xpPerAction is read as this engine's baseProfessionXp input for these
  // two professions only. rareBonus is the zone's "10% chance of a bonus
  // stone" per the design spec.
  greenhollow_copper_vein: {
    id: 'greenhollow_copper_vein',
    name: 'Copper Vein',
    profession: 'mining',
    zoneId: 'greenhollow_fields',
    requiredLevel: 1,
    itemId: 'copper_ore',
    xpPerAction: 5,
    secondsPerAction: 8,
    colorBreakpoints: { orangeUntil: 41, yellowUntil: 56, greenUntil: 71 },
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
    xpPerAction: 5,
    secondsPerAction: 8,
    colorBreakpoints: { orangeUntil: 41, yellowUntil: 56, greenUntil: 71 },
  },
  greenhollow_hunting_grounds: {
    id: 'greenhollow_hunting_grounds',
    name: 'Hunting Grounds',
    profession: 'skinning',
    zoneId: 'greenhollow_fields',
    requiredLevel: 1,
    itemId: 'leather_scraps',
    xpPerAction: 5,
    secondsPerAction: 8,
    colorBreakpoints: { orangeUntil: 41, yellowUntil: 56, greenUntil: 71 },
    requiredToolType: 'skinning_knife',
  },

  stonecrag_tin_vein: {
    id: 'stonecrag_tin_vein',
    name: 'Tin Vein',
    profession: 'mining',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'tin_ore',
    xpPerAction: 9,
    secondsPerAction: 9,
    colorBreakpoints: { orangeUntil: 50, yellowUntil: 65, greenUntil: 80 },
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'flint', chance: 0.1 },
  },
  // Zone 2's second mineable ore per the design spec — a real selectable
  // node (not a rareBonus roll), same slot/pacing as its zone's tin vein.
  stonecrag_silver_vein: {
    id: 'stonecrag_silver_vein',
    name: 'Silver Vein',
    profession: 'mining',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'silver_ore',
    xpPerAction: 9,
    secondsPerAction: 9,
    colorBreakpoints: { orangeUntil: 50, yellowUntil: 65, greenUntil: 80 },
    requiredToolType: 'mining_pick',
  },
  stonecrag_sage_patch: {
    id: 'stonecrag_sage_patch',
    name: 'Mountain Sage Patch',
    profession: 'herbalism',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'mountain_sage',
    xpPerAction: 9,
    secondsPerAction: 9,
    colorBreakpoints: { orangeUntil: 50, yellowUntil: 65, greenUntil: 80 },
  },
  stonecrag_foothill_game: {
    id: 'stonecrag_foothill_game',
    name: 'Foothill Game',
    profession: 'skinning',
    zoneId: 'stonecrag_foothills',
    requiredLevel: 10,
    itemId: 'coarse_hide',
    xpPerAction: 9,
    secondsPerAction: 9,
    colorBreakpoints: { orangeUntil: 50, yellowUntil: 65, greenUntil: 80 },
    requiredToolType: 'skinning_knife',
  },

  emberfall_iron_vein: {
    id: 'emberfall_iron_vein',
    name: 'Iron Vein',
    profession: 'mining',
    zoneId: 'emberfall_ridge',
    requiredLevel: 25,
    itemId: 'iron_ore',
    xpPerAction: 13,
    secondsPerAction: 10,
    colorBreakpoints: { orangeUntil: 65, yellowUntil: 80, greenUntil: 95 },
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
    xpPerAction: 13,
    secondsPerAction: 10,
    colorBreakpoints: { orangeUntil: 65, yellowUntil: 80, greenUntil: 95 },
  },
  emberfall_ashfang_den: {
    id: 'emberfall_ashfang_den',
    name: 'Ashfang Den',
    profession: 'skinning',
    zoneId: 'emberfall_ridge',
    requiredLevel: 25,
    itemId: 'scaled_hide',
    xpPerAction: 13,
    secondsPerAction: 10,
    colorBreakpoints: { orangeUntil: 65, yellowUntil: 80, greenUntil: 95 },
    requiredToolType: 'skinning_knife',
  },

  cinderfall_ore_seam: {
    id: 'cinderfall_ore_seam',
    name: 'Mithril Vein',
    profession: 'mining',
    zoneId: 'cinderfall_depths',
    requiredLevel: 30,
    itemId: 'mithril_ore',
    xpPerAction: 17,
    secondsPerAction: 11,
    colorBreakpoints: { orangeUntil: 70, yellowUntil: 85, greenUntil: 100 },
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'shadowore', chance: 0.1 },
  },
  // Zone 4's second mineable ore per the design spec.
  cinderfall_gold_vein: {
    id: 'cinderfall_gold_vein',
    name: 'Gold Vein',
    profession: 'mining',
    zoneId: 'cinderfall_depths',
    requiredLevel: 30,
    itemId: 'gold_ore',
    xpPerAction: 17,
    secondsPerAction: 11,
    colorBreakpoints: { orangeUntil: 70, yellowUntil: 85, greenUntil: 100 },
    requiredToolType: 'mining_pick',
  },
  cinderfall_emberpetal_patch: {
    id: 'cinderfall_emberpetal_patch',
    name: 'Emberpetal Patch',
    profession: 'herbalism',
    zoneId: 'cinderfall_depths',
    requiredLevel: 30,
    itemId: 'emberpetal',
    xpPerAction: 17,
    secondsPerAction: 11,
    colorBreakpoints: { orangeUntil: 70, yellowUntil: 85, greenUntil: 100 },
  },
  cinderfall_ash_burrow: {
    id: 'cinderfall_ash_burrow',
    name: 'Ash Burrow',
    profession: 'skinning',
    zoneId: 'cinderfall_depths',
    requiredLevel: 30,
    itemId: 'ashhide',
    xpPerAction: 17,
    secondsPerAction: 11,
    colorBreakpoints: { orangeUntil: 70, yellowUntil: 85, greenUntil: 100 },
    requiredToolType: 'skinning_knife',
  },

  molten_scar_brimstone_vein: {
    id: 'molten_scar_brimstone_vein',
    name: 'Thorium Vein',
    profession: 'mining',
    zoneId: 'molten_scar',
    requiredLevel: 40,
    itemId: 'thorium_ore',
    xpPerAction: 21,
    secondsPerAction: 12,
    colorBreakpoints: { orangeUntil: 80, yellowUntil: 95, greenUntil: 110 },
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'obsidian_shard', chance: 0.1 },
  },
  molten_scar_cinderbloom_patch: {
    id: 'molten_scar_cinderbloom_patch',
    name: 'Cinderbloom Patch',
    profession: 'herbalism',
    zoneId: 'molten_scar',
    requiredLevel: 40,
    itemId: 'cinderbloom',
    xpPerAction: 21,
    secondsPerAction: 12,
    colorBreakpoints: { orangeUntil: 80, yellowUntil: 95, greenUntil: 110 },
  },
  molten_scar_scaleback_den: {
    id: 'molten_scar_scaleback_den',
    name: 'Scaleback Den',
    profession: 'skinning',
    zoneId: 'molten_scar',
    requiredLevel: 40,
    itemId: 'scaleback_hide',
    xpPerAction: 21,
    secondsPerAction: 12,
    colorBreakpoints: { orangeUntil: 80, yellowUntil: 95, greenUntil: 110 },
    requiredToolType: 'skinning_knife',
  },

  cinderheart_ore_vein: {
    id: 'cinderheart_ore_vein',
    name: 'Obsidian Vein',
    profession: 'mining',
    zoneId: 'cinderheart_crater',
    requiredLevel: 48,
    itemId: 'obsidian_ore',
    xpPerAction: 25,
    secondsPerAction: 13,
    colorBreakpoints: { orangeUntil: 88, yellowUntil: 103, greenUntil: 118 },
    requiredToolType: 'mining_pick',
    rareBonus: { itemId: 'starforge_ore', chance: 0.1 },
  },
  // Zone 6's second mineable ore per the design spec.
  cinderheart_platinum_vein: {
    id: 'cinderheart_platinum_vein',
    name: 'Platinum Vein',
    profession: 'mining',
    zoneId: 'cinderheart_crater',
    requiredLevel: 48,
    itemId: 'platinum_ore',
    xpPerAction: 25,
    secondsPerAction: 13,
    colorBreakpoints: { orangeUntil: 88, yellowUntil: 103, greenUntil: 118 },
    requiredToolType: 'mining_pick',
  },
  cinderheart_bloom_patch: {
    id: 'cinderheart_bloom_patch',
    name: 'Emberheart Patch',
    profession: 'herbalism',
    zoneId: 'cinderheart_crater',
    requiredLevel: 48,
    itemId: 'emberheart_bloom',
    xpPerAction: 25,
    secondsPerAction: 13,
    colorBreakpoints: { orangeUntil: 88, yellowUntil: 103, greenUntil: 118 },
  },
  cinderheart_hide_grounds: {
    id: 'cinderheart_hide_grounds',
    name: 'Emberscale Grounds',
    profession: 'skinning',
    zoneId: 'cinderheart_crater',
    requiredLevel: 48,
    itemId: 'emberscale_hide',
    xpPerAction: 25,
    secondsPerAction: 13,
    colorBreakpoints: { orangeUntil: 88, yellowUntil: 103, greenUntil: 118 },
    requiredToolType: 'skinning_knife',
  },

  // ── A 2nd node per gathering profession per zone — same requiredLevel/
  // xpPerAction/secondsPerAction/colorBreakpoints as that zone's original
  // node (so difficulty/pacing is unchanged), just a different material, so
  // each gathering profession has more than one thing to find per zone.
  greenhollow_wildroot_cluster: {
    id: 'greenhollow_wildroot_cluster', name: 'Wildroot Cluster', profession: 'herbalism', zoneId: 'greenhollow_fields',
    requiredLevel: 1, itemId: 'wildroot', xpPerAction: 5, secondsPerAction: 8,
    colorBreakpoints: { orangeUntil: 41, yellowUntil: 56, greenUntil: 71 },
  },
  greenhollow_rabbit_warren: {
    id: 'greenhollow_rabbit_warren', name: 'Rabbit Warren', profession: 'skinning', zoneId: 'greenhollow_fields',
    requiredLevel: 1, itemId: 'rabbit_pelt', xpPerAction: 5, secondsPerAction: 8,
    colorBreakpoints: { orangeUntil: 41, yellowUntil: 56, greenUntil: 71 }, requiredToolType: 'skinning_knife',
  },
  stonecrag_frostcap_patch: {
    id: 'stonecrag_frostcap_patch', name: 'Frostcap Patch', profession: 'herbalism', zoneId: 'stonecrag_foothills',
    requiredLevel: 10, itemId: 'frostcap', xpPerAction: 9, secondsPerAction: 9,
    colorBreakpoints: { orangeUntil: 50, yellowUntil: 65, greenUntil: 80 },
  },
  stonecrag_jackal_den: {
    id: 'stonecrag_jackal_den', name: 'Jackal Den', profession: 'skinning', zoneId: 'stonecrag_foothills',
    requiredLevel: 10, itemId: 'jackal_fur', xpPerAction: 9, secondsPerAction: 9,
    colorBreakpoints: { orangeUntil: 50, yellowUntil: 65, greenUntil: 80 }, requiredToolType: 'skinning_knife',
  },
  emberfall_emberleaf_patch: {
    id: 'emberfall_emberleaf_patch', name: 'Emberleaf Patch', profession: 'herbalism', zoneId: 'emberfall_ridge',
    requiredLevel: 25, itemId: 'emberleaf', xpPerAction: 13, secondsPerAction: 10,
    colorBreakpoints: { orangeUntil: 65, yellowUntil: 80, greenUntil: 95 },
  },
  emberfall_wolfrun_thicket: {
    id: 'emberfall_wolfrun_thicket', name: 'Wolfrun Thicket', profession: 'skinning', zoneId: 'emberfall_ridge',
    requiredLevel: 25, itemId: 'cinderwolf_pelt', xpPerAction: 13, secondsPerAction: 10,
    colorBreakpoints: { orangeUntil: 65, yellowUntil: 80, greenUntil: 95 }, requiredToolType: 'skinning_knife',
  },
  cinderfall_ashroot_patch: {
    id: 'cinderfall_ashroot_patch', name: 'Ashroot Patch', profession: 'herbalism', zoneId: 'cinderfall_depths',
    requiredLevel: 30, itemId: 'ashroot', xpPerAction: 17, secondsPerAction: 11,
    colorBreakpoints: { orangeUntil: 70, yellowUntil: 85, greenUntil: 100 },
  },
  cinderfall_scavenger_den: {
    id: 'cinderfall_scavenger_den', name: 'Scavenger Den', profession: 'skinning', zoneId: 'cinderfall_depths',
    requiredLevel: 30, itemId: 'scavenger_hide', xpPerAction: 17, secondsPerAction: 11,
    colorBreakpoints: { orangeUntil: 70, yellowUntil: 85, greenUntil: 100 }, requiredToolType: 'skinning_knife',
  },
  molten_scar_scorchweed_patch: {
    id: 'molten_scar_scorchweed_patch', name: 'Scorchweed Patch', profession: 'herbalism', zoneId: 'molten_scar',
    requiredLevel: 40, itemId: 'scorchweed', xpPerAction: 21, secondsPerAction: 12,
    colorBreakpoints: { orangeUntil: 80, yellowUntil: 95, greenUntil: 110 },
  },
  molten_scar_scaleback_nest: {
    id: 'molten_scar_scaleback_nest', name: 'Scaleback Nest', profession: 'skinning', zoneId: 'molten_scar',
    requiredLevel: 40, itemId: 'scaleback_scale', xpPerAction: 21, secondsPerAction: 12,
    colorBreakpoints: { orangeUntil: 80, yellowUntil: 95, greenUntil: 110 }, requiredToolType: 'skinning_knife',
  },
  cinderheart_heartbloom_patch: {
    id: 'cinderheart_heartbloom_patch', name: 'Heartbloom Patch', profession: 'herbalism', zoneId: 'cinderheart_crater',
    requiredLevel: 48, itemId: 'heartbloom', xpPerAction: 25, secondsPerAction: 13,
    colorBreakpoints: { orangeUntil: 88, yellowUntil: 103, greenUntil: 118 },
  },
  cinderheart_emberscale_nest: {
    id: 'cinderheart_emberscale_nest', name: 'Emberscale Nest', profession: 'skinning', zoneId: 'cinderheart_crater',
    requiredLevel: 48, itemId: 'emberscale_claw', xpPerAction: 25, secondsPerAction: 13,
    colorBreakpoints: { orangeUntil: 88, yellowUntil: 103, greenUntil: 118 }, requiredToolType: 'skinning_knife',
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

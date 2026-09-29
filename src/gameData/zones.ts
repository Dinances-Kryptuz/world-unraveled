import type { Zone, GatherNode } from './types';

export const DEFAULT_ZONE_ID = 'greenhollow_fields';

export const GATHER_NODES: Record<string, GatherNode> = {
  greenhollow_copper_vein: {
    id: 'greenhollow_copper_vein',
    name: 'Copper Vein',
    profession: 'mining',
    zoneId: 'greenhollow_fields',
    requiredLevel: 1,
    itemId: 'copper_ore',
    xpPerAction: 5,
    secondsPerAction: 8,
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
    gatherNodeIds: ['greenhollow_copper_vein', 'greenhollow_peacebloom_patch', 'greenhollow_hunting_grounds'],
  },

  stonecrag_foothills: {
    id: 'stonecrag_foothills',
    name: 'Stonecrag Foothills',
    description:
      'Windswept slopes and broken rock rising above Greenhollow Fields. Jackals and goats roam the lower trails; bandits and worse hold the higher ground.',
    levelRange: [8, 25],
    unlockRequirement: { type: 'characterLevel', level: 8 },
    monsterIds: ['ridge_jackal', 'craggy_goat', 'rubble_crawler', 'highland_bandit', 'crag_wolf_alpha'],
    gatherNodeIds: ['stonecrag_tin_vein', 'stonecrag_sage_patch', 'stonecrag_foothill_game'],
  },

  emberfall_ridge: {
    id: 'emberfall_ridge',
    name: 'Emberfall Ridge',
    description:
      'A volcanic highland beyond Stonecrag, scarred by old fissures that still breathe heat. Fire-hardened wolves and raiders hold the ridge, and an ancient dwarven forge lies cracked open at its heart.',
    levelRange: [25, 40],
    unlockRequirement: { type: 'characterLevel', level: 25 },
    monsterIds: ['cinder_wolf', 'ashwing_bat', 'molten_crawler', 'ridgeback_marauder', 'scorched_drake'],
    gatherNodeIds: ['emberfall_iron_vein', 'emberfall_sunpetal_patch', 'emberfall_ashfang_den'],
  },
};

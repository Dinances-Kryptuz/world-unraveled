import type { Zone, GatherNode } from './types';

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
  // Note: Skinning has no standalone "node" — it's a post-combat action performed
  // on skinnable monster corpses (see monsters.ts skinningYield). It doesn't need
  // an entry here, but the profession still shows up in the zone's activity list
  // in the UI by checking which zone monsters have skinnable: true.

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
    gatherNodeIds: ['greenhollow_copper_vein', 'greenhollow_peacebloom_patch'],
  },

  stonecrag_foothills: {
    id: 'stonecrag_foothills',
    name: 'Stonecrag Foothills',
    description:
      'Windswept slopes and broken rock rising above Greenhollow Fields. Jackals and goats roam the lower trails; bandits and worse hold the higher ground.',
    levelRange: [8, 25],
    unlockRequirement: { type: 'characterLevel', level: 8 },
    monsterIds: ['ridge_jackal', 'craggy_goat', 'rubble_crawler', 'highland_bandit', 'crag_wolf_alpha'],
    gatherNodeIds: ['stonecrag_tin_vein', 'stonecrag_sage_patch'],
  },
};

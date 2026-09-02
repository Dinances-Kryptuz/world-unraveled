import type { Monster } from './types';

export const MONSTERS: Record<string, Monster> = {
  greenhorn_boar: {
    id: 'greenhorn_boar',
    name: 'Greenhorn Boar',
    zoneIds: ['greenhollow_fields'],
    levelRange: [1, 5],
    hp: 28,
    attackPower: 3,
    defense: 1,
    attackIntervalSeconds: 2.5,
    xpReward: 8,
    goldMin: 1,
    goldMax: 3,
    lootTable: [
      { itemId: 'light_leather', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'boar_meat', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'small_tusk', chance: 0.1, minQty: 1, maxQty: 1 },
    ],
    skinnable: true,
    skinningYield: {
      requiredSkinningLevel: 1,
      itemId: 'light_leather',
      chance: 0.9,
      minQty: 1,
      maxQty: 2,
      actionSeconds: 6,
    },
    specialAbility: {
      name: 'Charge',
      description: 'Briefly increases movement speed and attack damage.',
      implemented: false,
    },
  },

  forest_wolf: {
    id: 'forest_wolf',
    name: 'Forest Wolf',
    zoneIds: ['greenhollow_fields'], // also appears in Whispering Woods later (not built yet)
    levelRange: [3, 8],
    hp: 32,
    attackPower: 5,
    defense: 2,
    attackIntervalSeconds: 2.0,
    xpReward: 14,
    goldMin: 2,
    goldMax: 5,
    lootTable: [
      { itemId: 'light_leather', chance: 0.55, minQty: 1, maxQty: 2 },
      { itemId: 'wolf_fang', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'raw_meat', chance: 0.5, minQty: 1, maxQty: 2 },
    ],
    skinnable: true,
    skinningYield: {
      requiredSkinningLevel: 1,
      itemId: 'light_leather',
      chance: 0.9,
      minQty: 1,
      maxQty: 2,
      actionSeconds: 6,
    },
    specialAbility: {
      name: 'Pack Howl',
      description: 'Nearby wolves gain increased attack speed.',
      implemented: false,
    },
  },

  wild_kobold: {
    id: 'wild_kobold',
    name: 'Wild Kobold',
    zoneIds: ['greenhollow_fields'],
    levelRange: [5, 10],
    hp: 40,
    attackPower: 6,
    defense: 3,
    attackIntervalSeconds: 2.2,
    xpReward: 20,
    goldMin: 3,
    goldMax: 7,
    lootTable: [
      { itemId: 'linen_cloth', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'copper_scrap', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'small_coin_pouch', chance: 0.1, minQty: 1, maxQty: 1 },
    ],
    skinnable: false, // humanoid — feeds Tailoring's cloth loop instead, per the profession ecosystem
    specialAbility: {
      name: 'Dirty Strike',
      description: 'Has a chance to briefly reduce player defense.',
      implemented: false,
    },
  },

  thornback_hare: {
    id: 'thornback_hare',
    name: 'Thornback Hare',
    zoneIds: ['greenhollow_fields'],
    levelRange: [2, 6],
    hp: 20,
    attackPower: 2,
    defense: 1,
    attackIntervalSeconds: 1.8, // fast attacker, low damage
    xpReward: 6,
    goldMin: 1,
    goldMax: 2,
    lootTable: [
      { itemId: 'light_leather', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'lucky_foot', chance: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'raw_meat', chance: 0.35, minQty: 1, maxQty: 1 },
    ],
    skinnable: true,
    skinningYield: {
      requiredSkinningLevel: 1,
      itemId: 'light_leather',
      chance: 0.7,
      minQty: 1,
      maxQty: 1,
      actionSeconds: 6,
    },
    specialAbility: {
      name: 'Flee',
      description: 'Occasionally attempts to escape combat.',
      implemented: false,
    },
  },
};

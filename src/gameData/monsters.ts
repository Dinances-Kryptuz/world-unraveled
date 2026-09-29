import type { Monster } from './types';

export const MONSTERS: Record<string, Monster> = {
  greenhorn_boar: {
    id: 'greenhorn_boar',
    name: 'Greenhorn Boar',
    zoneIds: ['greenhollow_fields'],
    levelRange: [1, 5],
    level: 3, // placeholder — real tuning against the new formulas happens at Step 10
    goldMin: 1,
    goldMax: 3,
    lootTable: [
      { itemId: 'leather_scraps', chance: 0.15, minQty: 1, maxQty: 2 },
      { itemId: 'boar_meat', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'small_tusk', chance: 0.1, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Charge',
      description: 'Briefly increases movement speed and attack damage.',
      implemented: false,
    },
  },

  forest_wolf: {
    id: 'forest_wolf',
    name: 'Forest Wolf',
    zoneIds: ['greenhollow_fields'],
    levelRange: [3, 8],
    level: 6, // placeholder — real tuning against the new formulas happens at Step 10
    goldMin: 2,
    goldMax: 5,
    lootTable: [
      { itemId: 'leather_scraps', chance: 0.2, minQty: 1, maxQty: 2 },
      { itemId: 'wolf_fang', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'raw_meat', chance: 0.5, minQty: 1, maxQty: 2 },
    ],
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
    level: 9, // placeholder — real tuning against the new formulas happens at Step 10
    goldMin: 3,
    goldMax: 7,
    lootTable: [
      { itemId: 'linen_cloth', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'copper_scrap', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'small_coin_pouch', chance: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'rusty_dagger', chance: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'apprentice_staff', chance: 0.08, minQty: 1, maxQty: 1 },
    ],
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
    level: 1, // placeholder — real tuning against the new formulas happens at Step 10
    goldMin: 1,
    goldMax: 2,
    lootTable: [
      { itemId: 'leather_scraps', chance: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'lucky_foot', chance: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'raw_meat', chance: 0.35, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Flee',
      description: 'Occasionally attempts to escape combat.',
      implemented: false,
    },
  },

  // ── Stonecrag Foothills ──────────────────────────────────────────────
  ridge_jackal: {
    id: 'ridge_jackal',
    name: 'Ridge Jackal',
    zoneIds: ['stonecrag_foothills'],
    levelRange: [8, 12],
    level: 10,
    goldMin: 4,
    goldMax: 9,
    lootTable: [
      { itemId: 'coarse_hide', chance: 0.55, minQty: 1, maxQty: 2 },
      { itemId: 'raw_meat', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'stone_shard', chance: 0.08, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Snarl',
      description: 'Briefly lowers player accuracy.',
      implemented: false,
    },
  },

  craggy_goat: {
    id: 'craggy_goat',
    name: 'Craggy Goat',
    zoneIds: ['stonecrag_foothills'],
    levelRange: [11, 16],
    level: 13,
    goldMin: 5,
    goldMax: 11,
    lootTable: [
      { itemId: 'thick_hide', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'raw_meat', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'goat_horn', chance: 0.15, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Headbutt',
      description: 'A hard-hitting charge attack.',
      implemented: false,
    },
  },

  rubble_crawler: {
    id: 'rubble_crawler',
    name: 'Rubble Crawler',
    zoneIds: ['stonecrag_foothills'],
    levelRange: [14, 19],
    level: 16,
    goldMin: 6,
    goldMax: 13,
    lootTable: [
      { itemId: 'stone_shard', chance: 0.6, minQty: 1, maxQty: 3 },
      { itemId: 'tin_ore', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'flawed_gem', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Rock Slide',
      description: 'Hurls debris for a burst of extra damage.',
      implemented: false,
    },
  },

  highland_bandit: {
    id: 'highland_bandit',
    name: 'Highland Bandit',
    zoneIds: ['stonecrag_foothills'],
    levelRange: [16, 22],
    level: 19,
    goldMin: 9,
    goldMax: 18,
    lootTable: [
      { itemId: 'coarse_cloth', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'worn_shiv', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'bandit_coin_pouch', chance: 0.12, minQty: 1, maxQty: 1 },
      { itemId: 'focusing_wand', chance: 0.07, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Backstab',
      description: 'A chance for a large burst of extra damage.',
      implemented: false,
    },
  },

  crag_wolf_alpha: {
    id: 'crag_wolf_alpha',
    name: 'Crag Wolf Alpha',
    zoneIds: ['stonecrag_foothills'],
    levelRange: [19, 25],
    level: 22,
    goldMin: 11,
    goldMax: 22,
    lootTable: [
      { itemId: 'sharp_fang', chance: 0.55, minQty: 1, maxQty: 2 },
      { itemId: 'coarse_hide', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'alpha_pelt', chance: 0.06, minQty: 1, maxQty: 1 },
      { itemId: 'alpha_fang_blade', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Pack Leader',
      description: 'Hits harder the longer the fight goes on.',
      implemented: false,
    },
  },

  // ── Emberfall Ridge ──────────────────────────────────────────────────
  cinder_wolf: {
    id: 'cinder_wolf',
    name: 'Cinder Wolf',
    zoneIds: ['emberfall_ridge'],
    levelRange: [25, 29],
    level: 27,
    goldMin: 11,
    goldMax: 20,
    lootTable: [
      { itemId: 'scaled_hide', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'raw_meat', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'ember_shard', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Ember Bite',
      description: 'A searing bite that leaves the wound smoldering.',
      implemented: false,
    },
  },

  ashwing_bat: {
    id: 'ashwing_bat',
    name: 'Ashwing Bat',
    zoneIds: ['emberfall_ridge'],
    levelRange: [27, 32],
    level: 30,
    goldMin: 12,
    goldMax: 22,
    lootTable: [
      { itemId: 'sunpetal', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'stone_shard', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'obsidian_shard', chance: 0.06, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Sonic Screech',
      description: 'A disorienting shriek that briefly lowers player accuracy.',
      implemented: false,
    },
  },

  molten_crawler: {
    id: 'molten_crawler',
    name: 'Molten Crawler',
    zoneIds: ['emberfall_ridge'],
    levelRange: [30, 34],
    level: 33,
    goldMin: 14,
    goldMax: 26,
    lootTable: [
      { itemId: 'iron_ore', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'stone_shard', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'obsidian_shard', chance: 0.08, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Magma Spray',
      description: 'Hurls molten rock for a burst of extra damage.',
      implemented: false,
    },
  },

  ridgeback_marauder: {
    id: 'ridgeback_marauder',
    name: 'Ridgeback Marauder',
    zoneIds: ['emberfall_ridge'],
    levelRange: [32, 37],
    level: 35,
    goldMin: 18,
    goldMax: 32,
    lootTable: [
      { itemId: 'heavy_cloth', chance: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'iron_ore', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'serrated_cleaver', chance: 0.06, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Brutal Slash',
      description: 'A chance for a large burst of extra damage.',
      implemented: false,
    },
  },

  scorched_drake: {
    id: 'scorched_drake',
    name: 'Scorched Drake',
    zoneIds: ['emberfall_ridge'],
    levelRange: [36, 40],
    level: 39,
    goldMin: 22,
    goldMax: 38,
    lootTable: [
      { itemId: 'scaled_hide', chance: 0.3, minQty: 2, maxQty: 3 },
      { itemId: 'ember_shard', chance: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'drakes_ember_eye', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Flame Breath',
      description: 'A blast of fire that hits harder the longer the fight goes on.',
      implemented: false,
    },
  },

  // ── Dungeon bosses (Phase 8) — real ability rotations via
  // combatEngine/monsterAbilities.ts instead of auto-attack only. ───────
  kobold_chieftain: {
    id: 'kobold_chieftain',
    name: 'Kobold Chieftain',
    zoneIds: ['greenhollow_fields'],
    levelRange: [10, 10],
    level: 10,
    goldMin: 8,
    goldMax: 15,
    isBoss: true,
    equippedAbilityIds: ['kobold_chieftain_warcry', 'kobold_chieftain_bash', 'kobold_chieftain_slam'],
    lootTable: [
      { itemId: 'linen_cloth', chance: 0.5, minQty: 2, maxQty: 3 },
      { itemId: 'small_coin_pouch', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'chieftains_warhammer', chance: 0.15, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Warlord’s Command',
      description: 'Buffs itself, stuns, and hits far harder than a common kobold.',
      implemented: false,
    },
  },
  alpha_warlord: {
    id: 'alpha_warlord',
    name: 'Alpha Warlord',
    zoneIds: ['stonecrag_foothills'],
    levelRange: [24, 24],
    level: 24,
    goldMin: 18,
    goldMax: 30,
    isBoss: true,
    equippedAbilityIds: ['alpha_warlord_howl', 'alpha_warlord_rend', 'alpha_warlord_pounce'],
    lootTable: [
      { itemId: 'sharp_fang', chance: 0.5, minQty: 2, maxQty: 3 },
      { itemId: 'alpha_pelt', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'warlords_signet', chance: 0.15, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Warlord of the Depths',
      description: 'A savage pack leader with a real ability rotation — rend, a leaping strike, and a self-buffing howl.',
      implemented: false,
    },
  },
  forgemaster_kaldrun: {
    id: 'forgemaster_kaldrun',
    name: 'Forgemaster Kaldrun',
    zoneIds: ['emberfall_ridge'],
    levelRange: [40, 40],
    level: 40,
    goldMin: 30,
    goldMax: 48,
    isBoss: true,
    equippedAbilityIds: ['kaldrun_warcry', 'kaldrun_hammerfall', 'kaldrun_cinderlash'],
    lootTable: [
      { itemId: 'heavy_cloth', chance: 0.5, minQty: 2, maxQty: 3 },
      { itemId: 'ember_shard', chance: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'kaldrun_warhammer', chance: 0.15, minQty: 1, maxQty: 1 },
    ],
    specialAbility: {
      name: 'Master of the Sundered Forge',
      description: 'A self-styled forgemaster with a real ability rotation — a crushing hammer strike, a smoldering cinder wound, and a self-buffing warcry.',
      implemented: false,
    },
  },
};

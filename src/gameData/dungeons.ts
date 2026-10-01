import type { Dungeon } from './types';

// Phase 8 — a dungeon is a fixed, repeatable sequence of monster stages
// ending in a boss with a real ability rotation (see
// combatEngine/monsterAbilities.ts), fought entirely solo with the same
// discrete engine as the open-world zone fights. See DungeonScreen.tsx for
// how stage progression actually works.
export const DUNGEONS: Record<string, Dungeon> = {
  kobold_warrens: {
    id: 'kobold_warrens',
    name: 'The Kobold Warrens',
    description:
      'A den dug into the hillside by Greenhollow’s kobolds, ending in the lair of their Chieftain.',
    zoneId: 'greenhollow_fields',
    levelRange: [5, 10],
    stages: ['wild_kobold', 'forest_wolf', 'wild_kobold', 'kobold_chieftain'],
  },
  stonecrag_depths: {
    id: 'stonecrag_depths',
    name: 'Stonecrag Depths',
    description: 'A network of caves beneath the foothills, home to the wolf pack’s Alpha Warlord.',
    zoneId: 'stonecrag_foothills',
    levelRange: [16, 24],
    stages: ['craggy_goat', 'rubble_crawler', 'highland_bandit', 'alpha_warlord'],
  },
  sundered_forge: {
    id: 'sundered_forge',
    name: 'The Sundered Forge',
    description:
      'An old dwarven forge cracked open by the mountain’s fire, now claimed by a self-styled Forgemaster and the brutes who serve him.',
    zoneId: 'emberfall_ridge',
    levelRange: [36, 40],
    stages: ['molten_crawler', 'ridgeback_marauder', 'scorched_drake', 'forgemaster_kaldrun'],
  },
  buried_foundry: {
    id: 'buried_foundry',
    name: 'The Buried Foundry',
    description:
      'The foundry that once powered all of Cinderfall, buried by the same cataclysm that ended it — and still, somehow, running.',
    zoneId: 'cinderfall_depths',
    levelRange: [40, 44],
    stages: ['ashforge_golem', 'ember_stalker', 'ruin_marauder', 'ashen_overseer'],
  },
  scarred_sanctum: {
    id: 'scarred_sanctum',
    name: 'The Scarred Sanctum',
    description:
      'A cultist stronghold built directly into the rift, where the faithful commune with the power stirring beneath the world.',
    zoneId: 'molten_scar',
    levelRange: [50, 54],
    stages: ['scaleback_drake', 'cultist_zealot', 'magma_hound', 'molten_herald'],
  },
  cinderheart_sanctum: {
    id: 'cinderheart_sanctum',
    name: 'The Cinderheart Sanctum',
    description:
      'The innermost sanctum of the crater, where Pyraxis stands watch over a power that has slept for ages — and shows every sign of waking.',
    zoneId: 'cinderheart_crater',
    levelRange: [56, 60],
    stages: ['charhide_behemoth', 'ashfall_harbinger', 'emberguard_sentinel', 'pyraxis'],
  },
};

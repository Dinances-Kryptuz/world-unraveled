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
};

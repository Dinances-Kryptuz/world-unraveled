// Dungeon boss abilities (Phase 8) — same Ability/AbilityEffect shape and
// the same generic engine.ts interpreter players use; a boss is just a
// Monster whose equippedAbilityIds points here instead of being empty.
// Every field engine.ts never reads for a monster combatant (class,
// unlockLevel) is set to an arbitrary placeholder, same convention as
// engine.ts's own MONSTER_BASIC_ATTACK. None of these cost a resource —
// monster combatants have no resource pools (see createMonsterCombatant),
// so a resourceType here would make the ability permanently unusable;
// cooldownSeconds alone paces them.
import type { Ability } from './types';

export const MONSTER_ABILITIES: Record<string, Ability> = {
  kobold_chieftain_warcry: {
    id: 'kobold_chieftain_warcry',
    name: 'Chieftain’s Warcry',
    class: 'warrior',
    unlockLevel: 1,
    description: 'Rallies the Chieftain, increasing its own damage dealt for a short time.',
    cooldownSeconds: 30,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageDealtPct: 25, durationSeconds: 8 }],
  },
  kobold_chieftain_bash: {
    id: 'kobold_chieftain_bash',
    name: 'Skullbash',
    class: 'warrior',
    unlockLevel: 1,
    description: 'A heavy overhead blow that stuns.',
    cooldownSeconds: 20,
    targetType: 'CURRENT_ENEMY',
    effects: [
      { type: 'damage', power: 1.1 },
      { type: 'stun', durationSeconds: 3 },
    ],
  },
  kobold_chieftain_slam: {
    id: 'kobold_chieftain_slam',
    name: 'Warlord’s Slam',
    class: 'warrior',
    unlockLevel: 1,
    description: 'A crushing two-handed slam.',
    cooldownSeconds: 10,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.4 }],
  },

  alpha_warlord_howl: {
    id: 'alpha_warlord_howl',
    name: 'Warlord’s Howl',
    class: 'warrior',
    unlockLevel: 1,
    description: 'A bone-chilling howl that increases the Warlord’s own damage dealt for a short time.',
    cooldownSeconds: 35,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageDealtPct: 20, durationSeconds: 8 }],
  },
  alpha_warlord_rend: {
    id: 'alpha_warlord_rend',
    name: 'Rend',
    class: 'warrior',
    unlockLevel: 1,
    description: 'Savage claws that leave a bleeding wound.',
    cooldownSeconds: 14,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.4, durationSeconds: 12, tickSeconds: 3 }],
  },
  alpha_warlord_pounce: {
    id: 'alpha_warlord_pounce',
    name: 'Pounce',
    class: 'warrior',
    unlockLevel: 1,
    description: 'A sudden, powerful lunge.',
    cooldownSeconds: 9,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.5 }],
  },

  kaldrun_warcry: {
    id: 'kaldrun_warcry',
    name: "Forgemaster's Warcry",
    class: 'warrior',
    unlockLevel: 1,
    description: 'Stokes the forge fire within, increasing Kaldrun’s own damage dealt for a short time.',
    cooldownSeconds: 32,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageDealtPct: 30, durationSeconds: 8 }],
  },
  kaldrun_hammerfall: {
    id: 'kaldrun_hammerfall',
    name: 'Hammerfall',
    class: 'warrior',
    unlockLevel: 1,
    description: 'A crushing overhead hammer strike that stuns.',
    cooldownSeconds: 18,
    targetType: 'CURRENT_ENEMY',
    effects: [
      { type: 'damage', power: 1.3 },
      { type: 'stun', durationSeconds: 3 },
    ],
  },
  kaldrun_cinderlash: {
    id: 'kaldrun_cinderlash',
    name: 'Cinderlash',
    class: 'warrior',
    unlockLevel: 1,
    description: 'A whip of molten cinders that leaves a smoldering wound.',
    cooldownSeconds: 12,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.4, durationSeconds: 12, tickSeconds: 3 }],
  },
};

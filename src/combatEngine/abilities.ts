import type { Ability } from './types';

// Phase 1 content: exactly the level-1 loadout for all three classes. A
// level 1-4 character has no spec yet (spec is chosen at level 5 — see
// SpecSelectionScreen), so these are class-wide "Shared" abilities per the
// design doc's ability lists; spec-specific abilities arrive in a later
// phase alongside the rest of each class's ~20-ability roster.
//
// Every ability here is data — the engine (engine.ts) has one generic
// handler per AbilityEffect.type, not a function per named ability. Adding
// ability #21 later means adding an entry here, not new engine code.
export const ABILITIES: Record<string, Ability> = {
  warrior_strike: {
    id: 'warrior_strike',
    name: 'Strike',
    class: 'warrior',
    description: 'A basic physical attack. Generates a small amount of Rage.',
    unlockLevel: 1,
    cooldownSeconds: 0,
    targetType: 'CURRENT_ENEMY',
    isBasicAttack: true,
    effects: [
      { type: 'damage', power: 1.0 },
      { type: 'resourceGain', resource: 'rage', amount: 10 },
    ],
  },
  warrior_charge: {
    id: 'warrior_charge',
    name: 'Charge',
    class: 'warrior',
    description: 'A strong opening attack that generates a burst of Rage. Short cooldown.',
    unlockLevel: 1,
    cooldownSeconds: 8,
    targetType: 'CURRENT_ENEMY',
    effects: [
      { type: 'damage', power: 1.3 },
      { type: 'resourceGain', resource: 'rage', amount: 15 },
    ],
  },

  priest_smite: {
    id: 'priest_smite',
    name: 'Smite',
    class: 'priest',
    // Free, like Strike and Judgment — the basic attack is every class's
    // always-usable filler and must never be resource-gated, or a Priest
    // that runs out of mana on Shadow Word: Pain has no fallback action at
    // all and just stands there until mana slowly regenerates.
    description: 'A basic Holy damage spell.',
    unlockLevel: 1,
    cooldownSeconds: 0,
    targetType: 'CURRENT_ENEMY',
    isBasicAttack: true,
    effects: [{ type: 'damage', power: 1.0 }],
  },
  priest_shadow_word_pain: {
    id: 'priest_shadow_word_pain',
    name: 'Shadow Word: Pain',
    class: 'priest',
    description: 'A damage-over-time effect. Cannot be reapplied while it is still ticking.',
    unlockLevel: 1,
    resourceType: 'mana',
    resourceCost: 15,
    cooldownSeconds: 12, // == its own duration, so it's only re-castable once it expires
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.45, durationSeconds: 12, tickSeconds: 4 }],
  },

  paladin_judgment: {
    id: 'paladin_judgment',
    name: 'Judgment',
    class: 'paladin',
    description: 'A basic ranged Holy attack. Generates Holy Power.',
    unlockLevel: 1,
    cooldownSeconds: 0,
    targetType: 'CURRENT_ENEMY',
    isBasicAttack: true,
    effects: [
      { type: 'damage', power: 1.0 },
      { type: 'resourceGain', resource: 'holyPower', amount: 1 },
    ],
  },
  paladin_crusader_strike: {
    id: 'paladin_crusader_strike',
    name: 'Crusader Strike',
    class: 'paladin',
    description: 'A basic melee attack. Generates Holy Power. Short cooldown.',
    unlockLevel: 1,
    cooldownSeconds: 6,
    targetType: 'CURRENT_ENEMY',
    effects: [
      { type: 'damage', power: 1.3 },
      { type: 'resourceGain', resource: 'holyPower', amount: 1 },
    ],
  },
};

export const BASIC_ATTACK_BY_CLASS: Record<string, string> = {
  warrior: 'warrior_strike',
  priest: 'priest_smite',
  paladin: 'paladin_judgment',
};

// The level-1 equipped slot — the one meaningful ability choice available
// before the priority system unlocks at level 10. Auto-equipped for now;
// becomes player-configurable once there's more than one real option.
export const LEVEL_1_LOADOUT_BY_CLASS: Record<string, string[]> = {
  warrior: ['warrior_charge'],
  priest: ['priest_shadow_word_pain'],
  paladin: ['paladin_crusader_strike'],
};

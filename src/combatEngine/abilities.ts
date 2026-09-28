import type { Ability } from './types';

// Phase 1 built the level-1 loadout; Phase 2 adds the rest of each class's
// "Shared" ability pool (5 per class total, unlocking at 1/1/5/10/10 — that
// split matches the design doc's unlock-count table exactly: 2 unlocked at
// level 1, 3 at level 5, 5 at level 10). Spec-specific abilities don't start
// until level 15, in a later phase, once there's more roster to build out.
//
// Every ability here is data — the engine (engine.ts) has one generic
// handler per AbilityEffect.type, not a function per named ability. Adding
// ability #21 later means adding an entry here, not new engine code.
//
// Two of these (Shield Bash's interrupt, Dispel) are mechanically inert
// right now — there's nothing to interrupt (no enemy casts exist yet) and
// nothing to dispel (no enemy-applied debuffs exist yet). Their damage/
// dispel-check still runs; they're just not useful yet, the same way
// monsters' specialAbility entries are flavor now and mechanical later.
// Power Word: Shield stands in for a real absorb shield with a flat damage
// reduction window instead — a true absorb-and-consume mechanic is future
// work, not urgent enough to hold up the rest of this pass.
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
  warrior_battle_cry: {
    id: 'warrior_battle_cry',
    name: 'Battle Cry',
    class: 'warrior',
    description: 'A temporary offensive buff — increases your own damage dealt for a short time.',
    unlockLevel: 5,
    cooldownSeconds: 30,
    resourceType: 'rage',
    resourceCost: 10,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageDealtPct: 20, durationSeconds: 8 }],
  },
  warrior_shield_bash: {
    id: 'warrior_shield_bash',
    name: 'Shield Bash',
    class: 'warrior',
    description: 'A shield strike meant to interrupt spellcasting. (No effect against non-casting enemies yet.)',
    unlockLevel: 10,
    cooldownSeconds: 10,
    resourceType: 'rage',
    resourceCost: 15,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.1 }],
  },
  warrior_intimidating_shout: {
    id: 'warrior_intimidating_shout',
    name: 'Intimidating Shout',
    class: 'warrior',
    description: "Rattles the enemy, reducing its damage dealt for a short time.",
    unlockLevel: 10,
    cooldownSeconds: 30,
    resourceType: 'rage',
    resourceCost: 10,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'buff', damageDealtPct: -20, durationSeconds: 8 }],
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
  priest_flash_heal: {
    id: 'priest_flash_heal',
    name: 'Flash Heal',
    class: 'priest',
    description: 'A fast direct heal. High Mana cost.',
    unlockLevel: 5,
    resourceType: 'mana',
    resourceCost: 30,
    cooldownSeconds: 6,
    targetType: 'SELF',
    effects: [{ type: 'heal', power: 1.5 }],
  },
  priest_power_word_shield: {
    id: 'priest_power_word_shield',
    name: 'Power Word: Shield',
    class: 'priest',
    description: 'Wards the caster, reducing damage taken for a short time.',
    unlockLevel: 10,
    resourceType: 'mana',
    resourceCost: 25,
    cooldownSeconds: 20,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageTakenPct: -30, durationSeconds: 10 }],
  },
  priest_dispel: {
    id: 'priest_dispel',
    name: 'Dispel',
    class: 'priest',
    description: 'Removes harmful effects from the target. (Nothing applies a dispellable effect to you yet.)',
    unlockLevel: 10,
    resourceType: 'mana',
    resourceCost: 15,
    cooldownSeconds: 8,
    targetType: 'SELF',
    effects: [{ type: 'dispel' }],
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
  paladin_hammer_of_justice: {
    id: 'paladin_hammer_of_justice',
    name: 'Hammer of Justice',
    class: 'paladin',
    description: 'Stuns the target for a few seconds.',
    unlockLevel: 5,
    cooldownSeconds: 20,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'stun', durationSeconds: 3 }],
  },
  paladin_blessing_of_protection: {
    id: 'paladin_blessing_of_protection',
    name: 'Blessing of Protection',
    class: 'paladin',
    description: 'A major defensive ward, sharply reducing damage taken for a short time.',
    unlockLevel: 10,
    resourceType: 'mana',
    resourceCost: 20,
    cooldownSeconds: 60,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageTakenPct: -50, durationSeconds: 6 }],
  },
  paladin_lay_on_hands: {
    id: 'paladin_lay_on_hands',
    name: 'Lay on Hands',
    class: 'paladin',
    description: 'A massive emergency heal. Extremely long cooldown.',
    unlockLevel: 10,
    cooldownSeconds: 300,
    targetType: 'SELF',
    effects: [{ type: 'heal', power: 4.0 }],
  },
};

export const BASIC_ATTACK_BY_CLASS: Record<string, string> = {
  warrior: 'warrior_strike',
  priest: 'priest_smite',
  paladin: 'paladin_judgment',
};

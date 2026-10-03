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
    targetType: 'LOWEST_HP_ALLY',
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
    targetType: 'LOWEST_HP_ALLY',
    effects: [{ type: 'heal', power: 4.0 }],
  },

  // ── Spec-specific abilities (Phase 4) ────────────────────────────────
  // Everything above this line is shared across both specs of its class.
  // These only show up once a character has actually chosen the matching
  // spec — see progression.ts's unlockedAbilities(). Two per spec, at 15
  // and 30, so by level 15 a character has more unlocked abilities than
  // slots and has to actually choose, instead of just equipping everything
  // the shared kit ever unlocks.
  warrior_dps_rampage: {
    id: 'warrior_dps_rampage',
    name: 'Rampage',
    class: 'warrior',
    spec: 'warrior_dps',
    description: 'A powerful strike that deals heavy damage. Costs a large amount of Rage.',
    unlockLevel: 15,
    cooldownSeconds: 10,
    resourceType: 'rage',
    resourceCost: 30,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.8 }],
  },
  warrior_dps_execute: {
    id: 'warrior_dps_execute',
    name: 'Execute',
    class: 'warrior',
    spec: 'warrior_dps',
    description:
      "A brutal finishing blow. Pair it with a Target HP condition in Combat Setup to save it for a nearly-defeated enemy.",
    unlockLevel: 30,
    cooldownSeconds: 15,
    resourceType: 'rage',
    resourceCost: 30,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 2.5 }],
  },
  warrior_tank_shield_slam: {
    id: 'warrior_tank_shield_slam',
    name: 'Shield Slam',
    class: 'warrior',
    spec: 'warrior_tank',
    description: 'A heavy shield strike.',
    unlockLevel: 15,
    cooldownSeconds: 8,
    resourceType: 'rage',
    resourceCost: 15,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.3 }],
  },
  warrior_tank_last_stand: {
    id: 'warrior_tank_last_stand',
    name: 'Last Stand',
    class: 'warrior',
    spec: 'warrior_tank',
    description: 'Bracing for the worst, sharply reducing damage taken for a short time. Very long cooldown.',
    unlockLevel: 30,
    cooldownSeconds: 90,
    resourceType: 'rage',
    resourceCost: 20,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageTakenPct: -40, durationSeconds: 10 }],
  },
  // Warrior Tank's single-target identity piece: forces one enemy onto you
  // specifically, unlike Prot Paladin's AOE Consecration below — see
  // targeting.ts's forcedTargetId check.
  warrior_tank_taunt: {
    id: 'warrior_tank_taunt',
    name: 'Taunt',
    class: 'warrior',
    spec: 'warrior_tank',
    description: 'Forces the enemy to attack you for a few seconds, no matter who else is in the fight.',
    unlockLevel: 20,
    cooldownSeconds: 15,
    resourceType: 'rage',
    resourceCost: 10,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'taunt', durationSeconds: 6 }],
  },
  // A couple of bleeds for Warrior DPS's single-target burst to lean on
  // between its big hits — low per-tick power (weaker than Shadow Word:
  // Pain) since the spec's identity is its direct damage, not its dots.
  warrior_dps_rend: {
    id: 'warrior_dps_rend',
    name: 'Rend',
    class: 'warrior',
    spec: 'warrior_dps',
    description: 'A vicious gash that bleeds the enemy over time.',
    unlockLevel: 20,
    cooldownSeconds: 12,
    resourceType: 'rage',
    resourceCost: 15,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.3, durationSeconds: 12, tickSeconds: 3 }],
  },
  warrior_dps_deep_wounds: {
    id: 'warrior_dps_deep_wounds',
    name: 'Deep Wounds',
    class: 'warrior',
    spec: 'warrior_dps',
    description: 'A deep, lingering wound that bleeds the enemy heavily over time. Long cooldown.',
    unlockLevel: 25,
    cooldownSeconds: 18,
    resourceType: 'rage',
    resourceCost: 20,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.45, durationSeconds: 18, tickSeconds: 6 }],
  },

  shadow_priest_mind_blast: {
    id: 'shadow_priest_mind_blast',
    name: 'Mind Blast',
    class: 'priest',
    spec: 'shadow_priest',
    description: 'A strong direct Shadow attack.',
    unlockLevel: 15,
    cooldownSeconds: 8,
    resourceType: 'mana',
    resourceCost: 20,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.6 }],
  },
  shadow_priest_vampiric_touch: {
    id: 'shadow_priest_vampiric_touch',
    name: 'Vampiric Touch',
    class: 'priest',
    spec: 'shadow_priest',
    description: 'A stronger draining curse than Shadow Word: Pain. Cannot be reapplied while still active.',
    unlockLevel: 30,
    cooldownSeconds: 15,
    resourceType: 'mana',
    resourceCost: 25,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.5, durationSeconds: 15, tickSeconds: 3 }],
  },
  // Shadow's "high single-target, low multi-dot" identity: this spreads a
  // dot to every enemy in the fight, but at much lower power than Shadow
  // Word: Pain/Vampiric Touch — useful for a multi_target dungeon stage, but
  // never a replacement for the spec's single-target rotation.
  shadow_priest_mind_sear: {
    id: 'shadow_priest_mind_sear',
    name: 'Mind Sear',
    class: 'priest',
    spec: 'shadow_priest',
    description: 'A weak Shadow dot that spreads to every enemy in the fight at once.',
    unlockLevel: 20,
    cooldownSeconds: 10,
    resourceType: 'mana',
    resourceCost: 25,
    targetType: 'CURRENT_ENEMY',
    aoe: true,
    effects: [{ type: 'dot', power: 0.15, durationSeconds: 9, tickSeconds: 3 }],
  },
  holy_priest_greater_heal: {
    id: 'holy_priest_greater_heal',
    name: 'Greater Heal',
    class: 'priest',
    spec: 'holy_priest',
    description: "A slow, powerful heal — the core of a Holy Priest's sustain.",
    unlockLevel: 15,
    cooldownSeconds: 10,
    resourceType: 'mana',
    resourceCost: 45,
    targetType: 'LOWEST_HP_ALLY',
    effects: [{ type: 'heal', power: 2.5 }],
  },
  holy_priest_guardian_spirit: {
    id: 'holy_priest_guardian_spirit',
    name: 'Guardian Spirit',
    class: 'priest',
    spec: 'holy_priest',
    description: 'A powerful ward that sharply reduces damage taken for a short time. Very long cooldown.',
    unlockLevel: 30,
    cooldownSeconds: 90,
    resourceType: 'mana',
    resourceCost: 30,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageTakenPct: -50, durationSeconds: 10 }],
  },
  // Holy Priest's "smaller heals, but AOE" identity — both tools are deliberately
  // weaker per-target than Flash Heal/Greater Heal, trading single-target
  // throughput (Holy Paladin's job) for whole-party coverage. Renew is the
  // efficient HOT to keep running between bigger casts; Circle of Healing is
  // the panic button when the whole party is taking damage at once (DOT-heavy
  // dungeons).
  holy_priest_renew: {
    id: 'holy_priest_renew',
    name: 'Renew',
    class: 'priest',
    spec: 'holy_priest',
    description: 'Places a heal-over-time on the target, healing them steadily for a while.',
    unlockLevel: 20,
    cooldownSeconds: 12,
    resourceType: 'mana',
    resourceCost: 20,
    targetType: 'LOWEST_HP_ALLY',
    effects: [{ type: 'hot', power: 0.35, durationSeconds: 12, tickSeconds: 3 }],
  },
  holy_priest_circle_of_healing: {
    id: 'holy_priest_circle_of_healing',
    name: 'Circle of Healing',
    class: 'priest',
    spec: 'holy_priest',
    description: 'A weaker heal that strikes everyone in the fight at once — built for fights where the whole party is taking damage.',
    unlockLevel: 25,
    cooldownSeconds: 15,
    resourceType: 'mana',
    resourceCost: 40,
    targetType: 'LOWEST_HP_ALLY',
    aoe: true,
    effects: [{ type: 'heal', power: 0.9 }],
  },

  // Avenger's Shield is a real Holy Power spender — nothing in the shared
  // Paladin kit spends it yet (Judgment/Crusader Strike only generate it),
  // so this is the first ability that gives the resource an actual purpose.
  // Gated by cost alone (no separate cooldown) — how often it's available
  // is a direct function of how much Holy Power the Paladin has generated.
  prot_paladin_avengers_shield: {
    id: 'prot_paladin_avengers_shield',
    name: "Avenger's Shield",
    class: 'paladin',
    spec: 'prot_paladin',
    description: 'A shield thrown at the enemy, dealing damage and stunning them. Costs 3 Holy Power.',
    unlockLevel: 15,
    cooldownSeconds: 0,
    resourceType: 'holyPower',
    resourceCost: 3,
    targetType: 'CURRENT_ENEMY',
    effects: [
      { type: 'damage', power: 1.2 },
      { type: 'stun', durationSeconds: 3 },
    ],
  },
  // Prot Paladin's AOE-tanking identity: low damage power (it's not meant to
  // hurt — see classStats.ts's survivabilityCoef, deliberately lower than
  // Warrior Tank's) but taunts every enemy in the fight at once, letting it
  // hold a whole multi_target wave off the party where Warrior Tank's single-
  // target Taunt can only peel one.
  prot_paladin_consecration: {
    id: 'prot_paladin_consecration',
    name: 'Consecration',
    class: 'paladin',
    spec: 'prot_paladin',
    description: 'Hallowed ground that scorches every enemy in the fight and forces them all to attack you.',
    unlockLevel: 20,
    cooldownSeconds: 12,
    resourceType: 'mana',
    resourceCost: 15,
    targetType: 'CURRENT_ENEMY',
    aoe: true,
    effects: [
      { type: 'damage', power: 0.4 },
      { type: 'taunt', durationSeconds: 6 },
    ],
  },
  prot_paladin_divine_shield: {
    id: 'prot_paladin_divine_shield',
    name: 'Divine Shield',
    class: 'paladin',
    spec: 'prot_paladin',
    description: 'A powerful blessing that makes you nearly immune to damage for a short time. Very long cooldown.',
    unlockLevel: 30,
    cooldownSeconds: 120,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageTakenPct: -80, durationSeconds: 6 }],
  },
  holy_paladin_holy_light: {
    id: 'holy_paladin_holy_light',
    name: 'Holy Light',
    class: 'paladin',
    spec: 'holy_paladin',
    description: "A slow, strong heal — the core of a Holy Paladin's sustain.",
    unlockLevel: 15,
    cooldownSeconds: 8,
    resourceType: 'mana',
    resourceCost: 35,
    targetType: 'LOWEST_HP_ALLY',
    effects: [{ type: 'heal', power: 2.2 }],
  },
  holy_paladin_divine_favor: {
    id: 'holy_paladin_divine_favor',
    name: 'Divine Favor',
    class: 'paladin',
    spec: 'holy_paladin',
    description: 'A blessing that increases your damage and healing done for a short time.',
    unlockLevel: 30,
    cooldownSeconds: 60,
    resourceType: 'mana',
    resourceCost: 20,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageDealtPct: 30, durationSeconds: 10 }],
  },

  // ── Mage (companion-only — see classStats.ts) ────────────────────────
  // Both specs are pure DPS with no heal/tank tools of their own, so the
  // shared kit leans on control/mitigation instead: a self-ward, an
  // interrupt-flavored bolt (same "no effect against non-casting enemies
  // yet" caveat as Shield Bash), and a CC. Fire and Frost differentiate
  // entirely through their spec kit below rather than a raw-number edge
  // (see classStats.ts's SpecDef comment) — Fire goes all-in on single
  // massive hits, Frost deals its damage as a lingering effect. Frost's
  // "AoE" identity is aspirational: this engine only ever has one enemy
  // combatant active at a time, so there's no real area-effect target to
  // hit yet — Blizzard reads as "would also hit everything else here" and
  // is written to slot in without changes once multi-enemy fights exist.
  mage_arcane_bolt: {
    id: 'mage_arcane_bolt',
    name: 'Arcane Bolt',
    class: 'mage',
    description: 'A basic Arcane damage spell.',
    unlockLevel: 1,
    cooldownSeconds: 0,
    targetType: 'CURRENT_ENEMY',
    isBasicAttack: true,
    effects: [{ type: 'damage', power: 1.0 }],
  },
  mage_frostbite: {
    id: 'mage_frostbite',
    name: 'Frostbite',
    class: 'mage',
    description: 'A lingering chill that damages the enemy over time.',
    unlockLevel: 1,
    resourceType: 'mana',
    resourceCost: 15,
    cooldownSeconds: 12,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.4, durationSeconds: 12, tickSeconds: 4 }],
  },
  mage_ice_barrier: {
    id: 'mage_ice_barrier',
    name: 'Ice Barrier',
    class: 'mage',
    description: 'A ward of ice, reducing damage taken for a short time.',
    unlockLevel: 5,
    resourceType: 'mana',
    resourceCost: 20,
    cooldownSeconds: 20,
    targetType: 'SELF',
    effects: [{ type: 'buff', damageTakenPct: -25, durationSeconds: 8 }],
  },
  mage_counterspell: {
    id: 'mage_counterspell',
    name: 'Counterspell',
    class: 'mage',
    description: 'A bolt of raw magic meant to interrupt spellcasting. (No effect against non-casting enemies yet.)',
    unlockLevel: 10,
    resourceType: 'mana',
    resourceCost: 15,
    cooldownSeconds: 10,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.1 }],
  },
  mage_polymorph: {
    id: 'mage_polymorph',
    name: 'Polymorph',
    class: 'mage',
    description: 'Transforms the enemy, leaving it unable to act for a few seconds.',
    unlockLevel: 10,
    resourceType: 'mana',
    resourceCost: 20,
    cooldownSeconds: 20,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'stun', durationSeconds: 4 }],
  },

  mage_fire_fireball: {
    id: 'mage_fire_fireball',
    name: 'Fireball',
    class: 'mage',
    spec: 'mage_fire',
    description: 'A powerful bolt of fire — the core of a Fire Mage’s single-target burst.',
    unlockLevel: 15,
    cooldownSeconds: 8,
    resourceType: 'mana',
    resourceCost: 30,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 1.8 }],
  },
  mage_fire_pyroblast: {
    id: 'mage_fire_pyroblast',
    name: 'Pyroblast',
    class: 'mage',
    spec: 'mage_fire',
    description: 'A devastating gout of flame — the hardest single hit a Mage has. Long cooldown.',
    unlockLevel: 30,
    cooldownSeconds: 20,
    resourceType: 'mana',
    resourceCost: 40,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'damage', power: 2.8 }],
  },
  mage_frost_blizzard: {
    id: 'mage_frost_blizzard',
    name: 'Blizzard',
    class: 'mage',
    spec: 'mage_frost',
    description: 'A storm of ice that lingers over the battlefield, continuing to damage the enemy — would hit every enemy at once in a real group fight.',
    unlockLevel: 15,
    cooldownSeconds: 15,
    resourceType: 'mana',
    resourceCost: 30,
    targetType: 'CURRENT_ENEMY',
    effects: [{ type: 'dot', power: 0.5, durationSeconds: 15, tickSeconds: 3 }],
  },
  mage_frost_deep_freeze: {
    id: 'mage_frost_deep_freeze',
    name: 'Deep Freeze',
    class: 'mage',
    spec: 'mage_frost',
    description: 'Encases the enemy in ice, dealing damage and freezing them in place for a few seconds.',
    unlockLevel: 30,
    cooldownSeconds: 25,
    resourceType: 'mana',
    resourceCost: 35,
    targetType: 'CURRENT_ENEMY',
    effects: [
      { type: 'damage', power: 1.3 },
      { type: 'stun', durationSeconds: 3 },
    ],
  },
};

export const BASIC_ATTACK_BY_CLASS: Record<string, string> = {
  warrior: 'warrior_strike',
  priest: 'priest_smite',
  paladin: 'paladin_judgment',
  mage: 'mage_arcane_bolt',
};

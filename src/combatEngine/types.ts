// The combat engine's own types. Deliberately independent of React and
// Firebase — this folder is called BY the UI and BY the Firestore-writing
// code, but never imports either. See src/combatEngine/README.md for the
// shape of the whole system.
import type { ClassId, SpecId } from '../gameData/classStats';
import type { DamageSchool } from '../gameData/types';

export type ResourceType = 'rage' | 'mana' | 'holyPower';

export interface ResourcePool {
  current: number;
  max: number;
}

// Every selector resolves against the SAME CombatState.party/enemies arrays,
// solo or not. LOWEST_HP_ALLY (added for the companion system) is the first
// of the party-aware selectors from the design doc — the rest
// (HIGHEST_THREAT_ENEMY, ALLY_MISSING_BUFF, etc.) plug into this same union
// and the same resolver function later without touching anything that calls
// it. In solo play LOWEST_HP_ALLY always resolves to the caster itself (a
// one-member party's only member), so giving every heal spell this target
// type instead of SELF is a no-op change for every character without a
// companion active, and starts healing whichever of player/companion
// actually needs it once one is.
export type TargetType = 'SELF' | 'CURRENT_ENEMY' | 'LOWEST_HP_ALLY';

// 'buff' covers both buffs and debuffs — it's a timed modifier applied to
// whoever ability.targetType resolves to, affecting THEIR OWN outgoing/
// incoming damage. A positive damageDealtPct on yourself is Battle Cry; a
// negative damageDealtPct on the enemy (still "their own outgoing damage")
// is Intimidating Shout — same mechanic, no separate debuff type needed.
// 'stun' and 'dispel' are real early CC/utility tools; 'absorb' (Power Word:
// Shield's real design) isn't built yet — see abilities.ts for what stands
// in for it until then. 'hot' is 'dot' but healing (Renew) — kept as its
// own type rather than a negative-power dot since it ticks on a parallel
// Combatant.hots list that never has to run the "can this kill you" check
// tickDots does. 'taunt' forces the target to attack the caster for a
// duration (see Combatant.forcedTargetId) — Warrior Tank's single-target
// Taunt and Prot Paladin's AOE Consecration (via ability.aoe) both use it.
export type EffectType = 'damage' | 'heal' | 'hot' | 'dot' | 'resourceGain' | 'buff' | 'stun' | 'dispel' | 'taunt';

export interface AbilityEffect {
  type: EffectType;
  // Damage/heal/dot/hot power is a multiplier of the caster's "normalized
  // hit" (see engine.ts's computeCasterProfile) — the same quantity the old
  // aggregate combat model scaled its DPS number from, so ability numbers
  // stay balanced against existing level/gear/talent math instead of using
  // a freshly invented scale.
  power?: number;
  resource?: ResourceType;
  amount?: number; // flat resource amount, for resourceGain
  durationSeconds?: number; // for dot, hot, buff, stun, taunt
  tickSeconds?: number; // for dot, hot
  damageDealtPct?: number; // for buff — added on top of the target's damageCoef
  damageTakenPct?: number; // for buff — added on top of the target's damageTakenMult
  // Overrides the caster Monster's own damageSchool (gameData/types.ts) for
  // just this one effect — absent (every current ability) means "use
  // whatever the caster Monster itself is tagged as." No boss currently
  // needs this (each boss's kit already matches its own monster's theme);
  // kept for a future boss with a mixed-school rotation.
  damageSchool?: import('../gameData/types').DamageSchool;
}

export interface Ability {
  id: string;
  name: string;
  class: ClassId;
  // Absent = shared across every spec of this class (Phase 1/2's whole
  // roster). Present = only unlocked for that one spec — see
  // progression.ts's unlockedAbilities(), which now filters on spec too.
  spec?: SpecId;
  description: string;
  unlockLevel: number;
  resourceType?: ResourceType;
  resourceCost?: number;
  cooldownSeconds: number;
  targetType: TargetType;
  effects: AbilityEffect[];
  // A basic attack doesn't occupy an equipped slot and is always available
  // as the priority list's implicit fallback (every example rotation in the
  // design doc ends in one of these).
  isBasicAttack?: boolean;
  // When true, every effect applies to ALL alive combatants on the
  // resolved target's side (every enemy for a CURRENT_ENEMY-targeted
  // ability, every party member for LOWEST_HP_ALLY) instead of just the one
  // resolveTarget() picked — targetType still decides WHICH side, this just
  // broadens "one" to "all." Shared by Paladin Tank's AOE threat, Shadow
  // Priest's weak multi-dot, Holy Priest's AOE heal, and any monster
  // ability meant to hit the whole party at once.
  aoe?: boolean;
}

export interface ActiveDot {
  abilityId: string;
  remainingSeconds: number;
  tickSeconds: number;
  timeSinceLastTick: number;
  hitPerTick: number;
}

// Mirrors ActiveDot exactly, just healing instead of damaging — see
// engine.ts's tickHots.
export interface ActiveHot {
  abilityId: string;
  remainingSeconds: number;
  tickSeconds: number;
  timeSinceLastTick: number;
  healPerTick: number;
}

export interface ActiveBuff {
  abilityId: string;
  remainingSeconds: number;
  damageDealtPct: number;
  damageTakenPct: number;
}

// Live combat state — everything that changes second to second. Static
// combat math (attack power, armor, damage taken multiplier, spec
// coefficients) lives in a separate CasterProfile computed once per
// encounter from the character/monster, not on the Combatant itself, so
// the state stays cheap to reason about and serialize for logging.
export interface Combatant {
  id: string;
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  resources: Partial<Record<ResourceType, ResourcePool>>;
  cooldowns: Record<string, number>; // abilityId -> seconds remaining
  dots: ActiveDot[];
  hots: ActiveHot[];
  buffs: ActiveBuff[];
  stunnedSeconds: number; // > 0 means this combatant cannot act (but cooldowns/dots/resources still tick)
  // Set by a 'taunt' effect — while forcedTargetSeconds > 0 and the named
  // combatant is still alive, this combatant's CURRENT_ENEMY resolution
  // (targeting.ts) returns that target directly instead of its normal
  // weighted-threat pick. Decays like stunnedSeconds, in the main tick loop.
  forcedTargetId?: string;
  forcedTargetSeconds?: number;
  actionReadyIn: number; // seconds until this combatant's next action
  equippedAbilityIds: string[]; // priority order, highest first; empty for monsters
  // Keyed by ability id, matching equippedAbilityIds. Optional — monsters
  // never have it, and a player who's never opened the conditions editor
  // simply has no entry for a given ability (treated as "always usable").
  abilityConditions?: Record<string, ConditionGroup>;
  // Equipped ability ids the player has paused from the AUTOMATIC priority
  // walk (see priority.ts's pickAbility, which skips these) — deliberately
  // NOT removed from equippedAbilityIds itself, so the ability still shows
  // its manual-use button in AbilityBar and can still be cast by hand via
  // tryManualUseAbility. "Auto-cast off" means "I'll decide," not "gone."
  disabledAbilityIds?: string[];
  basicAttackId: string;
  profile: CasterProfile;
  // Relative chance of being picked when an enemy's CURRENT_ENEMY resolves
  // among more than one alive party member (see classStats.ts's SpecDef.
  // threatWeight and targeting.ts's weighted pick) — always 1 for a monster,
  // since nothing on the party side differentiates among enemies yet.
  threatWeight: number;
}

// Raw per-side stats rather than a pre-mixed matchup number — mitigation is
// a property of an interaction (attacker's accuracy, defender's armor and
// avoidance), not a fixed attribute of either side alone, so the engine
// computes the actual hit/mitigation math from two of these at hit time.
export interface CasterProfile {
  normalizedHit: number; // one "baseDamage() per ATTACK_INTERVAL_SECONDS" unit
  damageCoef: number; // multiplies this combatant's outgoing damage
  accuracy: number; // this combatant's chance to land an attack (monsters: always 1)
  avoidance: number; // chance attacks against this combatant are avoided
  armor: number; // raw armor value; target-side mitigation via armorReduction()
  damageTakenMult: number; // extra multiplier on damage this combatant takes (talents, etc.)
  // Which school this combatant's own attacks deal, for the new consumable-
  // only fire/shadow resistance pipeline (Herbalism/Alchemy overhaul) to
  // check against the DEFENDER's active resistance. Always 'physical' for
  // the player/companions (nothing in this engine lets a player deal
  // elemental damage); set from Monster.damageSchool for a monster — see
  // engine.ts's buildMonsterProfile.
  damageSchool: DamageSchool;
  // AGI-driven (gameData/combatFormulas.ts's critChanceFromAgi/
  // dodgeChanceFromAgi, added for the Leatherworking overhaul) — 0 for
  // every monster (buildMonsterProfile) and, for the player/companions,
  // whatever their current total AGI resolves to (flat 5 baseline until
  // AGI gear is equipped — see classStats.ts's CLASS_GROWTH.AGI). critChance
  // is checked on the ATTACKER in computeEffectDamage; dodgeChance is
  // checked on the DEFENDER, alongside (not replacing) avoidance.
  critChance: number;
  dodgeChance: number;
  healFrac: number;
  passiveHealPct: number;
  // Multiplies every kind of healing this combatant produces — see
  // combatFormulas.ts's healingPowerMultiplier (SPI-driven). 1 for anyone
  // with no SPI (monsters always; most non-healing specs in practice).
  healingPowerMult: number;
  // Enchanting overhaul's Haste enchant — speeds up ONLY this combatant's
  // own action cadence (engine.ts divides ATTACK_INTERVAL_SECONDS by
  // 1 + hastePct/100 wherever it increments actionReadyIn), never anyone
  // else's. 0 for every monster/companion (buildMonsterProfile/
  // buildCompanionProfile) and, for the player, whatever EncounterSetupInput.
  // hastePct resolves to (0 with no Haste enchant active, matching the
  // engine's behavior before this field existed).
  hastePct: number;
  // Enchanting overhaul's Beastslayer/Demonslaying weapon enchants check
  // the DEFENDER's creatureType (not the attacker's) — mirrors Monster.
  // creatureType (gameData/types.ts) exactly, set only in buildMonsterProfile;
  // always absent for the player/companions (nothing in this game lets a
  // player BE a beast or demon).
  creatureType?: 'beast' | 'demon';
}

export interface CombatState {
  party: Combatant[];
  enemies: Combatant[];
  timeElapsed: number;
}

// Phase 3: conditions. A ConditionGroup gates whether an equipped ability is
// considered "usable" during the priority walk, on top of the existing
// cooldown/resource/target checks — see conditions.ts's evaluateConditionGroup.
// An empty conditions array means "always usable," matching every existing
// character's implicit behavior before this field existed (no migration
// needed — see firebase/character.ts's backfill).
export type ConditionType =
  | 'self_hp_below'
  | 'self_hp_above'
  | 'target_hp_below'
  | 'target_hp_above'
  | 'resource_below'
  | 'resource_above';

export interface Condition {
  type: ConditionType;
  value: number; // percentage, 0-100 — of max HP for hp conditions, of max pool for resource conditions
  resource?: ResourceType; // only meaningful for resource_below/resource_above
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

// Lets the UI color-code the log (WoW-style: your damage in the default
// color, damage taken in red, healing in green, misses greyed out, deaths
// bolded) without re-parsing message text — engine.ts sets this at the
// point it already knows what happened, which is the only place that does.
export type CombatEventKind = 'damage_out' | 'damage_in' | 'heal' | 'miss' | 'death' | 'status';

export interface CombatEvent {
  message: string;
  kind: CombatEventKind;
}

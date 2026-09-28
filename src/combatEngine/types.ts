// The combat engine's own types. Deliberately independent of React and
// Firebase — this folder is called BY the UI and BY the Firestore-writing
// code, but never imports either. See src/combatEngine/README.md for the
// shape of the whole system.
import type { ClassId, SpecId } from '../gameData/classStats';

export type ResourceType = 'rage' | 'mana' | 'holyPower';

export interface ResourcePool {
  current: number;
  max: number;
}

// Every selector resolves against the SAME CombatState.party/enemies arrays,
// solo or not. Only the two Phase 1 needs are implemented in targeting.ts —
// the rest of the party/threat-aware selectors from the design doc (
// LOWEST_HP_ALLY, HIGHEST_THREAT_ENEMY, ALLY_MISSING_BUFF, etc.) plug into
// this same union and the same resolver function later without touching
// anything that calls it.
export type TargetType = 'SELF' | 'CURRENT_ENEMY';

// 'buff' covers both buffs and debuffs — it's a timed modifier applied to
// whoever ability.targetType resolves to, affecting THEIR OWN outgoing/
// incoming damage. A positive damageDealtPct on yourself is Battle Cry; a
// negative damageDealtPct on the enemy (still "their own outgoing damage")
// is Intimidating Shout — same mechanic, no separate debuff type needed.
// 'stun' and 'dispel' are real early CC/utility tools; 'absorb' (Power Word:
// Shield's real design) isn't built yet — see abilities.ts for what stands
// in for it until then.
export type EffectType = 'damage' | 'heal' | 'dot' | 'resourceGain' | 'buff' | 'stun' | 'dispel';

export interface AbilityEffect {
  type: EffectType;
  // Damage/heal/dot power is a multiplier of the caster's "normalized hit"
  // (see engine.ts's computeCasterProfile) — the same quantity the old
  // aggregate combat model scaled its DPS number from, so ability numbers
  // stay balanced against existing level/gear/talent math instead of using
  // a freshly invented scale.
  power?: number;
  resource?: ResourceType;
  amount?: number; // flat resource amount, for resourceGain
  durationSeconds?: number; // for dot, buff, stun
  tickSeconds?: number; // for dot
  damageDealtPct?: number; // for buff — added on top of the target's damageCoef
  damageTakenPct?: number; // for buff — added on top of the target's damageTakenMult
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
}

export interface ActiveDot {
  abilityId: string;
  remainingSeconds: number;
  tickSeconds: number;
  timeSinceLastTick: number;
  hitPerTick: number;
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
  buffs: ActiveBuff[];
  stunnedSeconds: number; // > 0 means this combatant cannot act (but cooldowns/dots/resources still tick)
  actionReadyIn: number; // seconds until this combatant's next action
  equippedAbilityIds: string[]; // priority order, highest first; empty for monsters
  // Keyed by ability id, matching equippedAbilityIds. Optional — monsters
  // never have it, and a player who's never opened the conditions editor
  // simply has no entry for a given ability (treated as "always usable").
  abilityConditions?: Record<string, ConditionGroup>;
  basicAttackId: string;
  profile: CasterProfile;
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
  healFrac: number;
  passiveHealPct: number;
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

export interface CombatEvent {
  message: string;
}

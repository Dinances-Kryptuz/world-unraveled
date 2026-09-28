// The combat engine's own types. Deliberately independent of React and
// Firebase — this folder is called BY the UI and BY the Firestore-writing
// code, but never imports either. See src/combatEngine/README.md for the
// shape of the whole system.
import type { ClassId } from '../gameData/classStats';

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

export type EffectType = 'damage' | 'heal' | 'dot' | 'resourceGain';

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
  durationSeconds?: number; // for dot
  tickSeconds?: number; // for dot
}

export interface Ability {
  id: string;
  name: string;
  class: ClassId;
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
  actionReadyIn: number; // seconds until this combatant's next action
  equippedAbilityIds: string[]; // priority order, highest first; empty for monsters
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

export interface CombatEvent {
  message: string;
}

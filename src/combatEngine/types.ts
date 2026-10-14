// The combat engine's own types. Deliberately independent of React and
// Firebase — this folder is called BY the UI and BY the Firestore-writing
// code, but never imports either. See src/combatEngine/README.md for the
// shape of the whole system.
import type { ClassId, SpecId } from '../gameData/classStats';
import type { BossPhaseTrigger, DamageSchool } from '../gameData/types';

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
  // Rogue companion's Deadly Poison — up to 5, each stack multiplying the
  // per-tick damage. Undefined/1 for every other dot (treated as 1 stack),
  // so this is a purely additive, backward-compatible field. A new stack
  // REPLACES this dot (refreshing remainingSeconds and incrementing stacks,
  // capped at the max) rather than pushing a second independent entry — see
  // engine.ts's applyDeadlyPoisonStack — which is what makes "the poison's
  // own duration fully expiring wipes every stack at once" fall out of the
  // existing dot-expiry/removal logic for free, no separate bookkeeping.
  stacks?: number;
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
  // Rogue companion's Crippling Poison — negative means slower (e.g. -10 =
  // 10% slower action cadence). Summed the same way damageDealtPct/
  // damageTakenPct already are (buffActionSpeedMult, mirroring
  // buffDamageDealtMult/buffDamageTakenMult) and divides into the same
  // attackInterval calc hastePct already feeds — the "attack-speed debuff"
  // primitive EnchantProcKind's icy_chill doc comment flagged as
  // deliberately missing from this engine, now added for Crippling Poison.
  actionSpeedPct: number;
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
  // The Citadel of Krypt — live, in-combat state for Monster.bossPhases
  // (see that field's own doc comment), set only on a combatant spawned
  // from a monster that has bossPhases; undefined for literally everyone
  // else (every player, companion, and the ~40 monsters before Citadel).
  // `paused` freezes this combatant out of the action-readiness loop in
  // advanceCombat (same mechanism as stunnedSeconds > 0) while its adds are
  // alive; `enrageActive` ramps profile.damageCoef IN PLACE by
  // enrageRampPctPerSecond% every tick once set, which is what makes the
  // ramp compound correctly without separately tracking an elapsed-since-
  // trigger timestamp.
  bossPhaseState?: {
    // Copied straight from Monster.bossPhases at spawn time (not re-read
    // from TickContext.monster each tick) so this never depends on
    // ctx.monster still pointing at the same definition this combatant was
    // actually built from — robust even if this primitive is later reused
    // inside a dungeon that also rotates stages via ctx.nextMonster.
    phases: BossPhaseTrigger[];
    triggeredHpPcts: number[];
    paused: boolean;
    regenPctPerSecond: number;
    enrageActive: boolean;
    enrageRampPctPerSecond: number;
  };
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
  // Phase E6 catalog additions — all ATTACKER-side (checked against the
  // DEFENDER's creatureType above) except flatDamageReduction/
  // fireResistancePct/shadowResistancePct, which are DEFENDER-side (checked
  // against the ATTACKER's damageSchool). Always 0 for monsters/companions
  // (buildMonsterProfile/buildCompanionProfile); for the player, resolved
  // once at encounter setup from buildActiveEnchantTotals (gameData/
  // enchanting.ts), same static-per-encounter posture as hastePct/
  // flatDamageBonus above.
  //
  // beastDamageBonusPct/demonDamageBonusPct: Beastslayer/Demonslaying —
  // multiply final damage when defender.profile.creatureType matches.
  // Demonslaying never actually fires (no monster is tagged 'demon' yet —
  // see Monster.creatureType's doc comment) but is still modeled here, per
  // the design brief's explicit "keep the recipe defined but unavailable."
  beastDamageBonusPct: number;
  demonDamageBonusPct: number;
  // flatDamageReduction: Minor/Lesser/... Absorption — reduces incoming
  // damage by a flat amount (minimum 1 post-reduction, applied only when
  // the hit would otherwise deal damage) before any other defender-side
  // multiplier.
  flatDamageReduction: number;
  // fireResistancePct/shadowResistancePct: the enchant-sourced (always-on,
  // while the enchant is charged) counterpart to the Herbalism/Alchemy
  // overhaul's consumable-only resistance (BuffEffect.fireResistancePct/
  // shadowResistancePct) — the two are SUMMED in computeEffectDamage and
  // clamped to the same 75% cap, never a second independent pipeline.
  // frostResistancePct is deliberately NOT modeled — no frost damage school
  // exists in this combat engine (DamageSchool is 'physical' | 'fire' |
  // 'shadow'), so a Frost Resistance enchant is defined in the catalog but
  // mechanically inert, per the design brief's own "only include resistance
  // types supported by existing combat" instruction.
  fireResistancePct: number;
  shadowResistancePct: number;
  // weaponProc: Fiery Weapon/Lifestealing/Crusader (and their Ember-tier
  // upgrades) — a chance-on-hit effect carried by whatever's enchanted into
  // the WEAPON slot right now. Always undefined for monsters/companions
  // (companions have no enchantments storage at all — see Character.
  // enchantmentCharges's doc comment). "Cannot trigger additional enchant
  // procs" (every proc enchant's own description) is enforced by
  // computeEffectDamage simply never rolling source.profile.weaponProc
  // again for a proc's OWN bonus-damage sub-event.
  weaponProc?: EnchantWeaponProc;
  // The Rogue companion's innate on-hit poisons (Crippling/Deadly Poison —
  // see engine.ts's useAbility) — a SPEC-level always-on proc, independent
  // of weaponProc (which is item/enchant-sourced), set only in
  // buildCompanionProfile for specId === 'rogue_poison'. Modeled as its own
  // kind rather than reusing EnchantProcKind/weaponProc since it's never
  // item-sourced and a Rogue keeps it with no weapon/enchant requirement.
  innateCombatProc?: 'rogue_poison';
  // ── Attribute & Specialization Identity overhaul ──────────────────────
  // shieldBlockValue: a flat damage-reduction stat, SUMMED with
  // flatDamageReduction in computeEffectDamage (one pipeline, two sources —
  // same convention as fireResistancePct/shadowResistancePct above). 0 for
  // anyone without a real shield equipped (gameData/types.ts's ItemDef.
  // isShield) — see combatFormulas.ts's shieldBlockValue(). Boosted for the
  // two shield-tank specs (warrior_tank/prot_paladin) as their spec-identity
  // passive — see engine.ts's buildPlayerProfile.
  shieldBlockValue: number;
  // manaRegenMult: SPI's mana-regen-rate bonus (combatFormulas.ts's
  // manaRegenMultiplier) — multiplies MANA_REGEN_PCT_PER_SECOND in
  // resources.ts's regenResources. 1 for anyone with no SPI bonus (every
  // monster/companion with 0 SPI, and any player before this field existed).
  manaRegenMult: number;
  // manaCostReductionPct: Prot Paladin's spec-identity passive — INT
  // reduces the mana cost of this combatant's OWN abilities (useAbility
  // applies it to ability.resourceCost before spend()). 0 for every other
  // spec/monster/companion.
  manaCostReductionPct: number;
}

// EnchantProcKind values map 1:1 onto the design brief's Zone 5/6 proc
// enchants — fiery_weapon/lifestealing/crusader are real mechanics (see
// computeEffectDamage); icy_chill is defined/craftable/appliable but its
// slow effect is a deliberate no-op (per this session's earlier-approved
// "skip Icy Chill's slow proc" resolution — no attack-speed-debuff concept
// exists on the DEFENDER side of this engine, only the player's own
// hastePct lever).
export type EnchantProcKind = 'fiery_weapon' | 'lifestealing' | 'icy_chill' | 'crusader' | 'chain_lightning';

export interface EnchantWeaponProc {
  kind: EnchantProcKind;
  chancePct: number;
  // Meaning varies by kind: fiery_weapon = bonus fire damage as a % of the
  // triggering hit's amount; lifestealing = self-heal as a % of the
  // triggering hit's amount (capped by missing health); icy_chill/crusader
  // ignore this field (crusader's heal/buff magnitudes are fixed by the
  // design brief, not tunable per-tier the way fiery_weapon/lifestealing
  // are — see computeEffectDamage).
  power: number;
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
// miss_out/miss_in (split the same way damage_out/damage_in already are,
// by which side's attack failed to land) exist so the Enchanting
// overhaul's offensive-enchant charge counting — which must consume 1
// charge per ELIGIBLE OUTGOING ATTACK regardless of whether it actually
// hits, unlike a defensive enchant's charge (only a successful incoming
// hit, see Character.enchantmentCharges's doc comment) — can tell a
// player's own missed swing apart from a monster's.
export type CombatEventKind = 'damage_out' | 'damage_in' | 'heal' | 'miss_out' | 'miss_in' | 'death' | 'status';

export interface CombatEvent {
  message: string;
  kind: CombatEventKind;
}

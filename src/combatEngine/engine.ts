// The tick loop. Pure TypeScript — no React, no Firestore. CombatScreen.tsx
// calls advanceCombat() once per second and renders whatever comes back;
// it never computes damage or evaluates an ability itself.
import type { ClassId, SpecDef, SpecId, BaseStat } from '../gameData/classStats';
import { statAtLevel } from '../gameData/classStats';
import {
  ATTACK_INTERVAL_SECONDS,
  baseDamage,
  maxHp as computeMaxHp,
  monsterArmor,
  monsterBaseDamage,
  monsterHp,
  armorReduction,
  accuracy as playerAccuracy,
  playerDamageModifier,
  enemyDamageModifier,
  xpModifier,
} from '../gameData/combatFormulas';
import type { TalentBonusTotals } from '../utils/talentEvaluator';
import type { Monster } from '../gameData/types';
import { combatTypeModifier, type CombatType } from '../gameData/combatTriangle';
import { ABILITIES, BASIC_ATTACK_BY_CLASS } from './abilities';
import { MONSTER_ABILITIES } from './monsterAbilities';
import { effectiveLoadout, effectiveAbilityConditions } from './progression';
import { initialResources, regenResources, canAfford, spend, gain } from './resources';
import { resolveTarget } from './targeting';
import { pickAbility } from './priority';
import type { Ability, CasterProfile, Combatant, CombatState, CombatEvent, ConditionGroup } from './types';

export interface EncounterSetupInput {
  cls: ClassId;
  level: number;
  // Which spec is chosen (null before the level-5 spec choice) — separate
  // from specDef because specDef only carries the numeric coefficients,
  // not an id, and effectiveLoadout() needs the id to filter spec-locked
  // abilities (see progression.ts's unlockedAbilities()).
  specId: SpecId | null;
  specDef: SpecDef;
  talentTotals: TalentBonusTotals;
  extraDamageTakenPct: number;
  equipmentBonuses: Partial<Record<BaseStat, number>>;
  currentHp: number;
  monster: Monster;
  // The player's saved priority-list choice (Character.equippedAbilityIds).
  // effectiveLoadout() filters it to what's actually unlocked/slotted at
  // this level, and falls back to a sensible default when it's empty (a
  // character who's never touched the setup screen still fights well).
  savedEquippedAbilityIds: string[];
  // The player's saved per-ability condition groups (Character.abilityConditions).
  // Keyed by ability id; an ability with no entry (or an empty conditions
  // array) is always usable, same as before this field existed.
  savedAbilityConditions: Record<string, ConditionGroup>;
}

function buildPlayerProfile(input: EncounterSetupInput): CasterProfile {
  const { cls, level, specDef, talentTotals, extraDamageTakenPct, equipmentBonuses, monster } = input;
  const diff = monster.level - level;
  const survCoefFinal = specDef.survivabilityCoef * (1 + talentTotals.survCoefMultPct / 100);
  const effectiveSta = statAtLevel(cls, 'STA', level) + (equipmentBonuses.STA ?? 0);
  const armor = effectiveSta * 2 * survCoefFinal * (1 + talentTotals.armorMultPct / 100);
  const avoidance = Math.min(0.75, specDef.avoidance + talentTotals.avoidanceAddPct / 100);
  const damageTakenMult =
    Math.max(0.05, 1 - talentTotals.flatDmgTakenPct / 100) * (1 + extraDamageTakenPct / 100);

  return {
    normalizedHit: baseDamage(cls, level, input.equipmentBonuses),
    // playerDamageModifier(diff) folds the level-gap difficulty curve (the
    // same one that drives the grey/green/yellow/orange/red monster tiers)
    // into every ability's damage — a level-30 hitting a level-1 mob still
    // hits like it, same as the old aggregate model. combatTypeModifier
    // folds in the melee/ranged/magic triangle the same way.
    damageCoef:
      specDef.damageCoef *
      playerDamageModifier(diff) *
      combatTypeModifier(specDef.combatType, monster.combatType) *
      (1 + talentTotals.flatDmgPct / 100),
    accuracy: 1, // levelDiff-based accuracy is applied per-hit in useAbility, not baked in here
    avoidance,
    armor,
    damageTakenMult,
    healFrac: specDef.healFrac + talentTotals.healFracAddPct / 100,
    passiveHealPct:
      (specDef.passiveHealPct + talentTotals.passiveHealAddPct / 100) * (1 + talentTotals.healMultPct / 100),
  };
}

function buildMonsterProfile(monster: Monster, playerLevel: number, playerCombatType: CombatType): CasterProfile {
  const diff = monster.level - playerLevel;
  return {
    normalizedHit: monsterBaseDamage(monster.level),
    damageCoef: enemyDamageModifier(diff) * combatTypeModifier(monster.combatType, playerCombatType),
    accuracy: 1, // monsters always attempt to hit; only the player's avoidance can prevent it
    avoidance: 0, // monsters have no avoidance stat in the existing balance model
    armor: monsterArmor(monster.level),
    damageTakenMult: 1,
    healFrac: 0,
    passiveHealPct: 0,
  };
}

function createMonsterCombatant(monster: Monster, playerLevel: number, playerCombatType: CombatType, idSuffix: number): Combatant {
  return {
    id: `enemy-${idSuffix}`,
    name: monster.name,
    isPlayer: false,
    hp: monsterHp(monster.level),
    maxHp: monsterHp(monster.level),
    isAlive: true,
    resources: {},
    cooldowns: {},
    dots: [],
    buffs: [],
    stunnedSeconds: 0,
    actionReadyIn: ATTACK_INTERVAL_SECONDS,
    // Every existing monster has no equippedAbilityIds, so this defaults to
    // [] and behaves exactly as before — falls straight through to the free
    // basic attack via the same priority walk the player uses. A dungeon
    // boss (Phase 8) sets this on its Monster def to get a real, ordered
    // ability rotation instead of a flat auto-attack.
    equippedAbilityIds: monster.equippedAbilityIds ?? [],
    basicAttackId: 'monster_basic_attack',
    profile: buildMonsterProfile(monster, playerLevel, playerCombatType),
  };
}

const MONSTER_BASIC_ATTACK: Ability = {
  id: 'monster_basic_attack',
  name: 'Attack',
  class: 'warrior', // unused for monsters — targeting/effects don't branch on it
  description: 'A basic attack.',
  unlockLevel: 1,
  cooldownSeconds: 0,
  targetType: 'CURRENT_ENEMY', // resolveTarget treats "not in party" as the enemy side, so this reaches the player
  isBasicAttack: true,
  effects: [{ type: 'damage', power: 1.0 }],
};

export function createPlayerCombatant(input: EncounterSetupInput): Combatant {
  const loadout = effectiveLoadout(input.cls, input.specId, input.level, input.savedEquippedAbilityIds);
  const intStat = statAtLevel(input.cls, 'INT', input.level) + (input.equipmentBonuses.INT ?? 0);
  const playerMaxHp = computeMaxHp(input.cls, input.level, input.equipmentBonuses);

  return {
    id: 'player',
    name: 'You',
    isPlayer: true,
    hp: Math.min(input.currentHp, playerMaxHp),
    maxHp: playerMaxHp,
    isAlive: input.currentHp > 0,
    resources: initialResources(input.cls, input.level, intStat),
    cooldowns: {},
    dots: [],
    buffs: [],
    stunnedSeconds: 0,
    actionReadyIn: ATTACK_INTERVAL_SECONDS,
    equippedAbilityIds: loadout,
    abilityConditions: effectiveAbilityConditions(input.level, input.savedAbilityConditions),
    basicAttackId: BASIC_ATTACK_BY_CLASS[input.cls],
    profile: buildPlayerProfile(input),
  };
}

export function createEncounterState(input: EncounterSetupInput): CombatState {
  return {
    party: [createPlayerCombatant(input)],
    enemies: [createMonsterCombatant(input.monster, input.level, input.specDef.combatType, 1)],
    timeElapsed: 0,
  };
}

// Exported so the UI can resolve any ability id (player or monster) to its
// display name/description in one place — StatusBadges and AbilityBar both
// need this, and neither should have to know which registry an id came from.
export function abilitiesById(): Record<string, Ability> {
  return { ...ABILITIES, ...MONSTER_ABILITIES, monster_basic_attack: MONSTER_BASIC_ATTACK };
}

// Sum of a combatant's active buffs' percentages — Battle Cry and
// Intimidating Shout both stack onto this the same way (positive vs.
// negative damageDealtPct), so there's one summation, not a "buffs" and a
// separate "debuffs" path.
function buffDamageDealtMult(c: Combatant): number {
  return 1 + c.buffs.reduce((sum, b) => sum + b.damageDealtPct, 0) / 100;
}

function buffDamageTakenMult(c: Combatant): number {
  return 1 + c.buffs.reduce((sum, b) => sum + b.damageTakenPct, 0) / 100;
}

// One roll for a landed hit's damage: attacker's normalized hit, spec/talent
// coefficient, active buffs, the defender's armor, and a level-gap accuracy
// check when the attacker is the player (mirrors the old aggregate model's
// playerDamageModifier input exactly — see resolveHit for the level-gap piece).
function computeEffectDamage(attacker: Combatant, defender: Combatant, power: number, levelGapAccuracy: number): { hit: boolean; amount: number } {
  const accuracyRoll = attacker.isPlayer ? levelGapAccuracy : attacker.profile.accuracy;
  const avoided = Math.random() > accuracyRoll || Math.random() < defender.profile.avoidance;
  if (avoided) return { hit: false, amount: 0 };

  const armorMod = 1 - armorReduction(defender.profile.armor);
  const raw =
    attacker.profile.normalizedHit * power * attacker.profile.damageCoef * buffDamageDealtMult(attacker) * armorMod;
  const amount = Math.max(0, Math.round(raw * defender.profile.damageTakenMult * buffDamageTakenMult(defender)));
  return { hit: true, amount };
}

export interface KillReward {
  xpGained: number;
  goldGained: number;
  loot: { itemId: string; quantity: number }[];
}

export interface TickResult {
  events: CombatEvent[];
  kills: KillReward[];
  playerDied: boolean;
}

export interface TickContext {
  monster: Monster;
  playerLevel: number;
  playerCombatType: CombatType;
  // Dungeon stage progression hook (Phase 8) — called right before an
  // enemy respawn to decide what respawns next. Omitted, the enemy just
  // respawns as `monster` again forever (every non-dungeon fight). When
  // present, the engine also updates `monster` to match so the rest of
  // this same tick (and the next one) sees the new stage as current —
  // callers needing to react to a stage change (UI, session counters)
  // should compare the monster before/after a tick that produced a kill,
  // not poll this mid-tick.
  nextMonster?: (justDefeated: Monster) => Monster;
}

export function advanceCombat(state: CombatState, ctx: TickContext, deltaSeconds: number): TickResult {
  const events: CombatEvent[] = [];
  const kills: KillReward[] = [];
  let playerDied = false;
  const abilities = abilitiesById();

  const allCombatants = [...state.party, ...state.enemies];

  // 1. Advance time-based state: cooldowns, dots, buffs, stun, resource regen.
  for (const c of allCombatants) {
    if (!c.isAlive) continue;
    for (const id of Object.keys(c.cooldowns)) {
      c.cooldowns[id] = Math.max(0, c.cooldowns[id] - deltaSeconds);
    }
    regenResources(c.resources, deltaSeconds);
    tickDots(c, deltaSeconds, ctx, events, kills);
    c.buffs = c.buffs.filter((b) => (b.remainingSeconds -= deltaSeconds) > 0);
    if (c.stunnedSeconds > 0) c.stunnedSeconds = Math.max(0, c.stunnedSeconds - deltaSeconds);
    // passiveHealPct (Holy Priest/Paladin's out-of-the-box sustain, plus a
    // small amount baked into every healing spec) was computed onto every
    // profile since Phase 1 but never actually applied here — a real gap,
    // since it's the mechanic those specs' own descriptions promise. A dot
    // tick above can still kill c in this same iteration, so check isAlive
    // again rather than trusting the outer loop's guard.
    if (c.isAlive && c.profile.passiveHealPct > 0) {
      c.hp = Math.min(c.maxHp, c.hp + c.maxHp * c.profile.passiveHealPct * deltaSeconds);
    }
  }

  // 2. Let anyone whose action timer has elapsed act — a stunned combatant's
  // action timer doesn't advance at all (matches "your swing timer freezes
  // during a stun," not "swings bank up and all fire the instant it ends").
  for (const c of allCombatants) {
    if (!c.isAlive || c.stunnedSeconds > 0) continue;
    c.actionReadyIn -= deltaSeconds;
    while (c.actionReadyIn <= 0 && c.isAlive) {
      const picked = pickAbility(state, c, abilities);
      if (!picked) {
        c.actionReadyIn += ATTACK_INTERVAL_SECONDS;
        break;
      }
      useAbility(state, c, picked.ability, picked.targetId, ctx, events, kills);
      c.actionReadyIn += ATTACK_INTERVAL_SECONDS;
    }
  }

  // 3. Respawn any dead enemy so the fight continues, and note player death.
  state.enemies = state.enemies.map((e) => {
    if (e.isAlive) return e;
    if (ctx.nextMonster) ctx.monster = ctx.nextMonster(ctx.monster);
    return createMonsterCombatant(ctx.monster, ctx.playerLevel, ctx.playerCombatType, Math.random());
  });
  const player = state.party.find((p) => p.isPlayer);
  if (player && !player.isAlive) playerDied = true;

  state.timeElapsed += deltaSeconds;
  return { events, kills, playerDied };
}

function tickDots(c: Combatant, deltaSeconds: number, ctx: TickContext, events: CombatEvent[], kills: KillReward[]): void {
  for (const dot of c.dots) {
    dot.remainingSeconds -= deltaSeconds;
    dot.timeSinceLastTick += deltaSeconds;
    while (dot.timeSinceLastTick >= dot.tickSeconds && c.isAlive) {
      dot.timeSinceLastTick -= dot.tickSeconds;
      const amount = Math.round(dot.hitPerTick);
      c.hp = Math.max(0, c.hp - amount);
      events.push({
        message: `${c.name} takes ${amount} damage from a lingering effect.`,
        kind: c.isPlayer ? 'damage_in' : 'damage_out',
      });
      if (c.hp <= 0 && c.isAlive) {
        c.isAlive = false;
        events.push({ message: `${c.name} is defeated!`, kind: 'death' });
        if (!c.isPlayer) kills.push(rollKillReward(ctx.monster, ctx.monster.level - ctx.playerLevel));
      }
    }
  }
  c.dots = c.dots.filter((dot) => dot.remainingSeconds > 0);
}

// Executes one ability use: pays its cost, starts its cooldown, resolves
// every effect it declares. This is the ONLY place effects are interpreted —
// both AI-driven and manual ability use call this, so they can never diverge.
export function useAbility(
  state: CombatState,
  source: Combatant,
  ability: Ability,
  targetId: string,
  ctx: TickContext,
  events: CombatEvent[],
  kills: KillReward[]
): void {
  spend(source.resources, ability.resourceType, ability.resourceCost);
  if (ability.cooldownSeconds > 0) source.cooldowns[ability.id] = ability.cooldownSeconds;

  const target = [...state.party, ...state.enemies].find((c) => c.id === targetId);
  if (!target) return;

  const levelDiff = ctx.monster.level - ctx.playerLevel;
  const levelGapAccuracy = source.isPlayer ? playerAccuracy(levelDiff) : 1;

  for (const effect of ability.effects) {
    switch (effect.type) {
      case 'damage': {
        const { hit, amount } = computeEffectDamage(source, target, effect.power ?? 1, levelGapAccuracy);
        if (!hit) {
          events.push({ message: `${source.name} uses ${ability.name} on ${target.name}, but it misses.`, kind: 'miss' });
          break;
        }
        target.hp = Math.max(0, target.hp - amount);
        // healFrac (Shadow Priest's "sustain from the damage you deal," per
        // its own spec blurb) was computed onto the profile since Phase 1
        // but never actually paid out here — same gap as passiveHealPct
        // above. Only direct damage feeds it; a dot's damage is spread out
        // and already snapshots the source's damageCoef below, so folding
        // healFrac into every tick too would double-count the same "damage
        // dealt" against a single self-heal budget for no real benefit.
        if (source.profile.healFrac > 0 && source.isAlive) {
          source.hp = Math.min(source.maxHp, source.hp + amount * source.profile.healFrac);
        }
        events.push({
          message: `${source.name} uses ${ability.name} on ${target.name} for ${amount} damage.`,
          kind: target.isPlayer ? 'damage_in' : 'damage_out',
        });
        if (target.hp <= 0 && target.isAlive) {
          target.isAlive = false;
          events.push({ message: `${target.name} is defeated!`, kind: 'death' });
          if (!target.isPlayer) kills.push(rollKillReward(ctx.monster, levelDiff));
        }
        break;
      }
      case 'dot': {
        target.dots.push({
          abilityId: ability.id,
          remainingSeconds: effect.durationSeconds ?? 0,
          tickSeconds: effect.tickSeconds ?? 1,
          timeSinceLastTick: 0,
          // Snapshots the source's current damage buffs at cast time, same
          // as a direct hit — matches how a temporary buff like Battle Cry
          // is expected to affect a dot cast while it's active, without
          // needing to re-evaluate the source's buffs on every future tick.
          hitPerTick: source.profile.normalizedHit * (effect.power ?? 0.3) * source.profile.damageCoef * buffDamageDealtMult(source),
        });
        events.push({ message: `${source.name} afflicts ${target.name} with ${ability.name}.`, kind: 'status' });
        break;
      }
      case 'resourceGain':
        gain(source.resources, effect.resource, effect.amount);
        break;
      case 'heal': {
        // buffDamageDealtMult is deliberately reused here rather than adding
        // a separate "healing done" buff field — a buff that boosts
        // "damage dealt" (Divine Favor) reads naturally as boosting outgoing
        // effect power in general, healing included.
        const healAmount = Math.round(
          source.profile.normalizedHit * (effect.power ?? 1) * source.profile.damageCoef * buffDamageDealtMult(source)
        );
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        events.push({ message: `${source.name} uses ${ability.name} on ${target.name}, healing for ${healAmount}.`, kind: 'heal' });
        break;
      }
      case 'buff': {
        target.buffs.push({
          abilityId: ability.id,
          remainingSeconds: effect.durationSeconds ?? 0,
          damageDealtPct: effect.damageDealtPct ?? 0,
          damageTakenPct: effect.damageTakenPct ?? 0,
        });
        const verb = (effect.damageDealtPct ?? 0) < 0 || (effect.damageTakenPct ?? 0) < 0 ? 'afflicts' : 'buffs';
        events.push({ message: `${source.name} ${verb} ${target.name} with ${ability.name}.`, kind: 'status' });
        break;
      }
      case 'stun': {
        target.stunnedSeconds = Math.max(target.stunnedSeconds, effect.durationSeconds ?? 0);
        events.push({ message: `${source.name} stuns ${target.name} with ${ability.name}.`, kind: 'status' });
        break;
      }
      case 'dispel': {
        target.dots = [];
        events.push({ message: `${source.name} uses ${ability.name} on ${target.name}.`, kind: 'status' });
        break;
      }
    }
  }
}

function rollKillReward(monster: Monster, levelDiff: number): KillReward {
  const goldGained = Math.round(monster.goldMin + Math.random() * (monster.goldMax - monster.goldMin));
  const xpGained = Math.round(50 * monster.level * xpModifier(levelDiff));
  const loot: { itemId: string; quantity: number }[] = [];
  for (const drop of monster.lootTable) {
    if (Math.random() < drop.chance) {
      const qty = Math.round(drop.minQty + Math.random() * (drop.maxQty - drop.minQty));
      if (qty > 0) loot.push({ itemId: drop.itemId, quantity: qty });
    }
  }
  return { xpGained, goldGained, loot };
}

// Manual override — same function the AI uses, just triggered by a click
// instead of the priority walk. Still subject to cooldown/resource/target
// checks, so it can't bypass anything the AI itself couldn't do.
export function tryManualUseAbility(
  state: CombatState,
  sourceId: string,
  abilityId: string,
  ctx: TickContext
): { events: CombatEvent[]; kills: KillReward[] } | null {
  const source = state.party.find((c) => c.id === sourceId);
  const ability = abilitiesById()[abilityId];
  if (!source || !source.isAlive || !ability) return null;
  if ((source.cooldowns[ability.id] ?? 0) > 0) return null;
  if (!canAfford(source.resources, ability.resourceType, ability.resourceCost)) return null;
  const target = resolveTarget(state, ability.targetType, source.id);
  if (!target || !target.isAlive) return null;

  const events: CombatEvent[] = [];
  const kills: KillReward[] = [];
  useAbility(state, source, ability, target.id, ctx, events, kills);
  return { events, kills };
}

export { ABILITIES } from './abilities';

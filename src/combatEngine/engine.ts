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
  healingPowerMultiplier,
  critChanceFromAgi,
  dodgeChanceFromAgi,
  CRIT_DAMAGE_MULTIPLIER,
  critChanceFromInt,
  armorFromAgi,
  manaRegenMultiplier,
  shieldBlockValue,
  WARRIOR_DPS_STR_CRIT_PCT_PER_POINT,
  SHIELD_TANK_SPEC_BLOCK_BONUS_PCT,
  SHADOW_PRIEST_SPI_DAMAGE_PCT_PER_POINT,
  HOLY_PRIEST_SPI_HEALING_BONUS_PCT_PER_POINT,
  PROT_PALADIN_INT_MANA_COST_REDUCTION_PCT_PER_POINT,
  PROT_PALADIN_MANA_COST_REDUCTION_CAP_PCT,
  ELITE_HP_MULTIPLIER,
  ELITE_DAMAGE_MULTIPLIER,
  ELITE_ARMOR_MULTIPLIER,
  ELITE_XP_MULTIPLIER,
} from '../gameData/combatFormulas';
import { EMPTY_TALENT_TOTALS, type TalentBonusTotals } from '../utils/talentEvaluator';
import type { BuffTotals } from '../gameData/buffs';
import type { CompanionCombatSetup } from '../gameData/companions';
import type { DamageSchool, Monster } from '../gameData/types';
// The Citadel of Krypt — the one place engine.ts looks a monster up by id
// itself rather than receiving an already-resolved Monster object from its
// caller (BossPhaseTrigger.addsMonsterId is a plain string id baked into
// Krypt's own Monster def). Safe: gameData/monsters.ts has no dependency on
// combatEngine/ at all, so this doesn't create a cycle.
import { MONSTERS } from '../gameData/monsters';
import { combatTypeModifier, type CombatType } from '../gameData/combatTriangle';
import type { ConsumableAutomationRuntimeState } from '../gameData/consumableAutomation';
import { ABILITIES, BASIC_ATTACK_BY_CLASS } from './abilities';
import { MONSTER_ABILITIES } from './monsterAbilities';
import { effectiveLoadout, effectiveAbilityConditions } from './progression';
import { initialResources, regenResources, canAfford, spend, gain } from './resources';
import { resolveTarget } from './targeting';
import { pickAbility } from './priority';
import type {
  Ability,
  ActiveBuff,
  CasterProfile,
  Combatant,
  CombatState,
  CombatEvent,
  ConditionGroup,
  EnchantProcKind,
  EnchantWeaponProc,
} from './types';

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
  buffTotals: BuffTotals;
  extraDamageTakenPct: number;
  equipmentBonuses: Partial<Record<BaseStat, number>>;
  currentHp: number;
  monster: Monster;
  // The player's saved priority-list choice (Character.equippedAbilityIds).
  // effectiveLoadout() filters it to what's actually unlocked/slotted at
  // this level, and falls back to a sensible default when it's empty (a
  // character who's never touched the setup screen still fights well).
  savedEquippedAbilityIds: string[];
  // Character.trainedAbilityIds — which of the player's level-unlocked
  // abilities have actually been paid for at the Class Trainer (see
  // gameData/abilityTraining.ts). effectiveLoadout() uses this to keep an
  // untrained spell out of the fight entirely, including out of its "no
  // saved choice yet" default loadout.
  trainedAbilityIds: string[];
  // The player's saved per-ability condition groups (Character.abilityConditions).
  // Keyed by ability id; an ability with no entry (or an empty conditions
  // array) is always usable, same as before this field existed.
  savedAbilityConditions: Record<string, ConditionGroup>;
  // Equipped abilities the player has manually paused (Character.
  // disabledAbilityIds) — removed from the loadout before combat ever sees
  // it, same effect as not having equipped them, without losing their
  // saved slot/conditions in the Combat Setup screen. Undefined/empty
  // behaves exactly as before this field existed.
  disabledAbilityIds?: string[];
  // The player's currently-active recruited companions (0-4) — see
  // gameData/companions.ts's resolveActiveCompanionSetups. Empty/absent
  // means solo, same as every encounter before companions existed. A
  // dungeon requires exactly MAX_ACTIVE_COMPANIONS (see companions.ts) to
  // enter at all; open-world combat allows any number including zero.
  companions?: CompanionCombatSetup[];
  // Multiplies monster HP (not damage) — used only for dungeon group
  // content, where a fixed 5-person party would otherwise curb-stomp a
  // monster whose HP was tuned for one attacker. Undefined/1 (every
  // open-world fight) leaves monster HP exactly as before this field
  // existed. See DungeonScreen.tsx for how this is computed.
  monsterHpMultiplier?: number;
  // Combat/Rarity overhaul — multiplies monster DAMAGE (not HP), the
  // sibling lever monsterHpMultiplier never had. Open-world combat never
  // sets this (undefined/1, no change from before this field existed);
  // dungeons set a small fixed value (bigger for a boss stage than trash)
  // so a dungeon fight is a genuinely harder encounter per-hit, not just a
  // bigger HP bar — see DungeonScreen.tsx.
  monsterDamageMultiplier?: number;
  // How many enemies to start the encounter with — 1 everywhere except a
  // 'multi_target' dungeon stage (see TickContext.encounterSize, which this
  // feeds into alongside it for the respawn/wave-advance step).
  encounterSize?: number;
  // Enchanting overhaul's passive stat-enchant levers — summed from
  // whatever passive enchants are currently active on the player's
  // equipped gear (see firebase/enchanting.ts's buildPassiveEnchantTotals,
  // Phase E4/E5), baked into the profile once at encounter setup exactly
  // like talents/buffs/equipment above, not re-read live mid-fight.
  // hastePct speeds up the player's own action cadence (ATTACK_INTERVAL_
  // SECONDS below, divided by 1+hastePct/100) — the one new combat lever
  // this overhaul adds (see the AskUserQuestion resolution in this
  // session's history: "add a small hastePct field"). flatDamageBonus is
  // the Spell Power/Attack Power/Striking/Impact family — mechanically
  // identical bonuses added PRE-damageCoef (folded directly into
  // normalizedHit) since this engine has no magic/physical damage-school
  // split on the player side to tell them apart by. healingPowerFlatBonus
  // is Healing Power — a flat SPI-equivalent addend fed into the existing
  // healingPowerMultiplier formula rather than a new multiplier of its own.
  hastePct?: number;
  flatDamageBonus?: number;
  healingPowerFlatBonus?: number;
  // Phase E6 catalog additions — same "resolved once by the caller from
  // buildActiveEnchantTotals, baked in at encounter setup" posture as the
  // three fields above. See CasterProfile's matching doc comments
  // (combatEngine/types.ts) for what each one does mechanically.
  flatHpBonus?: number;
  flatManaBonus?: number;
  flatArmorBonus?: number;
  beastDamageBonusPct?: number;
  demonDamageBonusPct?: number;
  flatDamageReduction?: number;
  fireResistancePct?: number;
  shadowResistancePct?: number;
  weaponProc?: EnchantWeaponProc;
  // Attribute/Specialization overhaul's Shield Block Value — whether a
  // genuine shield (gameData/types.ts's ItemDef.isShield) currently sits in
  // the player's offhand slot. Resolved by the caller from Character.
  // equipment (see gameData/equipmentStats.ts's isShieldEquipped) once at
  // encounter setup, same posture as every other equipment-derived input
  // here. Undefined/false behaves exactly like no shield equipped.
  hasShieldEquipped?: boolean;
}

// Folds active-buff stat bonuses (Alchemy stat potions, Cooking's Well Fed)
// onto equipment bonuses before any STA/INT/baseDamage calc uses them —
// mechanically identical to wearing +stat gear, just temporary. Buffs are
// baked into the profile once at encounter setup, same as talents and
// equipment; a charge-based buff running out mid-fight is reconciled at the
// next encounter setup rather than live mid-tick, matching how this engine
// already treats equipment/talents/resources as fixed-for-the-fight.
function mergeStatBonuses(
  base: Partial<Record<BaseStat, number>>,
  extra: Partial<Record<BaseStat, number>>
): Partial<Record<BaseStat, number>> {
  const merged = { ...base };
  for (const [stat, value] of Object.entries(extra)) {
    const key = stat as BaseStat;
    merged[key] = (merged[key] ?? 0) + (value ?? 0);
  }
  return merged;
}

// Shared by buildPlayerProfile/buildCompanionProfile below — the derived-
// stat pipeline (stat totals, armor/avoidance BASE before each caller's own
// buff/enchant-only addends, shield block, crit/dodge, and the 4 spec-
// identity passives) is identical between a player and a companion; only
// buff/enchant/talent SOURCES differ (a companion has no buffTotals and,
// unless it's a recruited alt, no talentTotals — see buildCompanionProfile's
// own doc comment). Each caller adds its own buff-only avoidance addend and
// flat-armor addend on top of this core's unclamped `avoidanceBase`/
// `armorBase` before using them, rather than this function clamping/adding
// those in for only one of its two callers.
interface CasterStatsCore {
  totalAgi: number;
  totalStr: number;
  totalInt: number;
  totalSpi: number;
  armorBase: number;
  avoidanceBase: number;
  shieldBlock: number;
  critChance: number;
  dodgeChance: number;
  shadowPriestDamageBonus: number;
  holyPriestHealingBonus: number;
  manaCostReductionPct: number;
  healingPowerMult: number;
  manaRegenMult: number;
}

function buildCasterStatsCore(
  cls: ClassId,
  level: number,
  specId: SpecId | null,
  specDef: SpecDef,
  equipmentBonuses: Partial<Record<BaseStat, number>>,
  hasShieldEquipped: boolean,
  survCoefMultPct: number,
  armorMultPct: number,
  avoidanceAddPct: number,
  healingPowerFlatBonus: number
): CasterStatsCore {
  const survCoefFinal = specDef.survivabilityCoef * (1 + survCoefMultPct / 100);
  const effectiveSta = statAtLevel(cls, 'STA', level) + (equipmentBonuses.STA ?? 0);
  const totalAgi = statAtLevel(cls, 'AGI', level) + (equipmentBonuses.AGI ?? 0);
  const totalStr = statAtLevel(cls, 'STR', level) + (equipmentBonuses.STR ?? 0);
  const totalInt = statAtLevel(cls, 'INT', level) + (equipmentBonuses.INT ?? 0);
  const totalSpi = statAtLevel(cls, 'SPI', level) + (equipmentBonuses.SPI ?? 0) + healingPowerFlatBonus;
  // Shield-tank spec passive — Shield Block Value scales further for the
  // two specs actually built to stand behind a shield (see combatFormulas.
  // ts's SHIELD_TANK_SPEC_BLOCK_BONUS_PCT doc comment); every other spec
  // still gets the base STR-scaled value from equipping one, just without
  // the spec bonus.
  const isShieldTankSpec = specId === 'warrior_tank' || specId === 'prot_paladin';
  const shieldBlock =
    shieldBlockValue(totalStr, hasShieldEquipped) * (isShieldTankSpec ? 1 + SHIELD_TANK_SPEC_BLOCK_BONUS_PCT / 100 : 1);
  // armorFromAgi (AGI's third job, ATTR overhaul) is a flat addend; each
  // caller adds its own further flat addend (e.g. flatArmorBonus) on top.
  const armorBase = effectiveSta * 2 * survCoefFinal * (1 + armorMultPct / 100) + armorFromAgi(totalAgi);
  const avoidanceBase = specDef.avoidance + avoidanceAddPct / 100;
  // Shadow Priest spec passive — a sliver of SPI (its class's own healing
  // stat) converts into bonus damage instead, folded directly into
  // damageCoef since this is a static per-encounter multiplier, not a
  // resolution-time hook (see combatFormulas.ts's SHADOW_PRIEST_SPI_
  // DAMAGE_PCT_PER_POINT doc comment).
  const shadowPriestDamageBonus =
    specId === 'shadow_priest' ? 1 + (totalSpi * SHADOW_PRIEST_SPI_DAMAGE_PCT_PER_POINT) / 100 : 1;
  // Warrior DPS spec passive — STR converts into a small extra crit chance
  // on top of AGI's/INT's, folded additively into critChance below.
  const warriorDpsCritBonus =
    specId === 'warrior_dps' ? Math.max(0, (totalStr * WARRIOR_DPS_STR_CRIT_PCT_PER_POINT) / 100) : 0;
  // Holy Priest spec passive — extra healing power from SPI on top of the
  // universal SPI_HEALING_PCT_PER_POINT every class/spec already gets.
  const holyPriestHealingBonus =
    specId === 'holy_priest' ? 1 + (totalSpi * HOLY_PRIEST_SPI_HEALING_BONUS_PCT_PER_POINT) / 100 : 1;
  // Prot Paladin spec passive — INT reduces this combatant's own mana
  // costs (applied in useAbility, not here — see CasterProfile.
  // manaCostReductionPct's doc comment).
  const manaCostReductionPct =
    specId === 'prot_paladin'
      ? Math.min(
          PROT_PALADIN_MANA_COST_REDUCTION_CAP_PCT,
          totalInt * PROT_PALADIN_INT_MANA_COST_REDUCTION_PCT_PER_POINT
        )
      : 0;

  return {
    totalAgi,
    totalStr,
    totalInt,
    totalSpi,
    armorBase,
    avoidanceBase,
    shieldBlock,
    critChance: critChanceFromAgi(totalAgi) + critChanceFromInt(totalInt) + warriorDpsCritBonus,
    dodgeChance: dodgeChanceFromAgi(totalAgi),
    shadowPriestDamageBonus,
    holyPriestHealingBonus,
    manaCostReductionPct,
    // healingPowerFlatBonus (the Healing Power enchant) is a flat
    // SPI-equivalent addend fed into the SAME formula an SPI stat point
    // already uses (totalSpi, above), rather than a second multiplier
    // stacked on top.
    healingPowerMult: healingPowerMultiplier(totalSpi) * holyPriestHealingBonus,
    manaRegenMult: manaRegenMultiplier(totalSpi),
  };
}

function buildPlayerProfile(input: EncounterSetupInput): CasterProfile {
  const { cls, level, specId, specDef, talentTotals, buffTotals, extraDamageTakenPct, monster } = input;
  const equipmentBonuses = mergeStatBonuses(input.equipmentBonuses, buffTotals.statBonuses);
  const diff = monster.level - level;
  const core = buildCasterStatsCore(
    cls,
    level,
    specId,
    specDef,
    equipmentBonuses,
    input.hasShieldEquipped ?? false,
    talentTotals.survCoefMultPct,
    talentTotals.armorMultPct,
    talentTotals.avoidanceAddPct,
    input.healingPowerFlatBonus ?? 0
  );
  // flatArmorBonus (the Defense family of enchants — Minor/Lesser/.../Ember
  // Defense) is the closest existing lever to the design brief's flat
  // "Defense" stat, which this engine doesn't otherwise model — folded in
  // post-multiplier, same flat-addend posture as flatHpBonus/flatManaBonus.
  const armor = core.armorBase + (input.flatArmorBonus ?? 0);
  const avoidance = Math.min(0.75, core.avoidanceBase + buffTotals.avoidanceAddPct / 100);
  const damageTakenMult =
    Math.max(0.05, 1 - talentTotals.flatDmgTakenPct / 100) *
    (1 - buffTotals.mitigationMultiplierPct / 100) *
    (1 + extraDamageTakenPct / 100);

  return {
    // flatDamageBonus (Spell/Attack Power, Striking/Impact enchants) folds
    // in PRE-coefficient, same posture as every other term in normalizedHit
    // — see EncounterSetupInput.flatDamageBonus's doc comment for why this
    // is the correct insertion point rather than a new multiplier.
    normalizedHit: baseDamage(cls, level, equipmentBonuses) + (input.flatDamageBonus ?? 0),
    // playerDamageModifier(diff) folds the level-gap difficulty curve (the
    // same one that drives the grey/green/yellow/orange/red monster tiers)
    // into every ability's damage — a level-30 hitting a level-1 mob still
    // hits like it, same as the old aggregate model. combatTypeModifier
    // folds in the melee/ranged/magic triangle the same way.
    damageCoef:
      specDef.damageCoef *
      playerDamageModifier(diff) *
      combatTypeModifier(specDef.combatType, monster.combatType) *
      (1 + talentTotals.flatDmgPct / 100) *
      (1 + buffTotals.damageMultiplierPct / 100) *
      core.shadowPriestDamageBonus,
    // 1 + hitChanceBonusPct/100 — an Alchemy hit-chance potion's only effect.
    // See the levelGapAccuracy calc in useAbility below, the one place this
    // is actually read for the player (unused for monsters, who always
    // "attempt to hit" regardless).
    accuracy: 1 + buffTotals.hitChanceBonusPct / 100,
    avoidance,
    armor,
    damageTakenMult,
    damageSchool: 'physical',
    critChance: core.critChance,
    dodgeChance: core.dodgeChance,
    healFrac: specDef.healFrac + talentTotals.healFracAddPct / 100,
    passiveHealPct:
      (specDef.passiveHealPct + talentTotals.passiveHealAddPct / 100) * (1 + talentTotals.healMultPct / 100),
    healingPowerMult: core.healingPowerMult,
    hastePct: input.hastePct ?? 0,
    beastDamageBonusPct: input.beastDamageBonusPct ?? 0,
    demonDamageBonusPct: input.demonDamageBonusPct ?? 0,
    flatDamageReduction: input.flatDamageReduction ?? 0,
    fireResistancePct: input.fireResistancePct ?? 0,
    shadowResistancePct: input.shadowResistancePct ?? 0,
    weaponProc: input.weaponProc,
    shieldBlockValue: core.shieldBlock,
    manaRegenMult: core.manaRegenMult,
    manaCostReductionPct: core.manaCostReductionPct,
  };
}

// A companion fights at the player's level with its own fixed spec and
// whatever gear is equipped to it, but — unlike the player — has no
// buffTotals and, unless it's a recruited alt (companions.ts's
// buildAltCombatSetup), no talentTotals either (V1 scope cut; see
// gameData/companions.ts's doc comment). accuracy is set directly to the
// level-gap value here (rather than treated as a bonus added on top of it,
// the player's convention) because computeEffectDamage reads a non-player
// attacker's profile.accuracy straight through as its hit chance.
function buildCompanionProfile(companion: CompanionCombatSetup, monster: Monster): CasterProfile {
  const { cls, level, specId, specDef, equipmentBonuses } = companion;
  const totals = companion.talentTotals ?? EMPTY_TALENT_TOTALS;
  const diff = monster.level - level;
  const core = buildCasterStatsCore(
    cls,
    level,
    specId,
    specDef,
    equipmentBonuses,
    companion.hasShieldEquipped ?? false,
    totals.survCoefMultPct,
    totals.armorMultPct,
    totals.avoidanceAddPct,
    0
  );
  return {
    normalizedHit: baseDamage(cls, level, equipmentBonuses),
    damageCoef:
      specDef.damageCoef *
      playerDamageModifier(diff) *
      combatTypeModifier(specDef.combatType, monster.combatType) *
      (1 + totals.flatDmgPct / 100) *
      core.shadowPriestDamageBonus,
    accuracy: playerAccuracy(diff),
    avoidance: Math.min(0.75, core.avoidanceBase),
    armor: core.armorBase,
    damageTakenMult: Math.max(0.05, 1 - totals.flatDmgTakenPct / 100),
    damageSchool: 'physical',
    critChance: core.critChance,
    dodgeChance: core.dodgeChance,
    healFrac: specDef.healFrac + totals.healFracAddPct / 100,
    passiveHealPct: (specDef.passiveHealPct + totals.passiveHealAddPct / 100) * (1 + totals.healMultPct / 100),
    healingPowerMult: core.healingPowerMult,
    hastePct: 0, // no companion Combat Setup screen to equip a Haste enchant through in this V1
    beastDamageBonusPct: 0,
    demonDamageBonusPct: 0,
    flatDamageReduction: 0,
    // The Citadel of Krypt — companions have no enchantments storage, so this
    // is innate-item-only (see CompanionCombatSetup.fireResistancePct's doc
    // comment); 0 for every companion before Citadel's weapons existed.
    fireResistancePct: companion.fireResistancePct ?? 0,
    shadowResistancePct: 0,
    // weaponProc stays undefined — companions have no enchantments storage.
    // innateCombatProc: the Rogue's Master of Poisons kit — spec-level, not
    // item-sourced, so it's set here directly from specId rather than
    // needing any gear.
    innateCombatProc: specId === 'rogue_poison' ? 'rogue_poison' : undefined,
    shieldBlockValue: core.shieldBlock,
    manaRegenMult: core.manaRegenMult,
    manaCostReductionPct: core.manaCostReductionPct,
  };
}

function buildMonsterProfile(
  monster: Monster,
  playerLevel: number,
  playerCombatType: CombatType,
  damageMultiplier: number = 1
): CasterProfile {
  const diff = monster.level - playerLevel;
  const eliteDamageMult = monster.isElite ? ELITE_DAMAGE_MULTIPLIER : 1;
  const eliteArmorMult = monster.isElite ? ELITE_ARMOR_MULTIPLIER : 1;
  return {
    normalizedHit: monsterBaseDamage(monster.level),
    damageCoef:
      enemyDamageModifier(diff) *
      combatTypeModifier(monster.combatType, playerCombatType) *
      eliteDamageMult *
      damageMultiplier *
      // The Citadel of Krypt — a generic per-monster archetype scale,
      // independent of isElite (see Monster.damageMultiplier's doc
      // comment). 1 for every monster before this field existed.
      (monster.damageMultiplier ?? 1),
    accuracy: 1, // monsters always attempt to hit; only the player's avoidance can prevent it
    avoidance: 0, // monsters have no avoidance stat in the existing balance model
    armor: monsterArmor(monster.level) * eliteArmorMult,
    damageTakenMult: 1,
    damageSchool: monster.damageSchool ?? 'physical',
    critChance: 0, // monsters have no AGI stat in the existing balance model
    dodgeChance: 0,
    healFrac: 0,
    passiveHealPct: 0,
    healingPowerMult: 1,
    hastePct: 0, // monsters never get a Haste enchant
    creatureType: monster.creatureType,
    beastDamageBonusPct: 0,
    demonDamageBonusPct: 0,
    flatDamageReduction: 0,
    fireResistancePct: 0,
    shadowResistancePct: 0,
    shieldBlockValue: 0, // monsters have no STR/shield concept in the existing balance model
    manaRegenMult: 1,
    manaCostReductionPct: 0,
  };
}

function createMonsterCombatant(
  monster: Monster,
  playerLevel: number,
  playerCombatType: CombatType,
  idSuffix: number,
  hpMultiplier: number = 1,
  damageMultiplier: number = 1
): Combatant {
  const hp = Math.round(
    monsterHp(monster.level) * hpMultiplier * (monster.isElite ? ELITE_HP_MULTIPLIER : 1) * (monster.hpMultiplier ?? 1)
  );
  return {
    id: `enemy-${idSuffix}`,
    name: monster.name,
    isPlayer: false,
    hp,
    maxHp: hp,
    isAlive: true,
    resources: {},
    cooldowns: {},
    dots: [],
    hots: [],
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
    profile: buildMonsterProfile(monster, playerLevel, playerCombatType, damageMultiplier),
    threatWeight: 1,
    // The Citadel of Krypt — only ever set on a monster with its own
    // bossPhases; every other monster (including every other boss) gets
    // undefined, same zero-behavior-change posture as every optional field
    // above. See advanceCombat's own "Boss phase triggers" step.
    bossPhaseState: monster.bossPhases
      ? { phases: monster.bossPhases, triggeredHpPcts: [], paused: false, regenPctPerSecond: 0, enrageActive: false, enrageRampPctPerSecond: 0 }
      : undefined,
  };
}

// Spawns a whole wave of `count` enemies at once — 1 for every existing
// fight, more for a 'multi_target' dungeon stage (see TickContext.
// encounterSize). Each gets a random id suffix rather than a shared
// counter, same convention the single-enemy respawn path already used, so
// ids stay unique without the engine needing to track a running count.
function spawnEnemyWave(
  monster: Monster,
  playerLevel: number,
  playerCombatType: CombatType,
  count: number,
  hpMultiplier: number = 1,
  damageMultiplier: number = 1
): Combatant[] {
  return Array.from({ length: Math.max(1, count) }, () =>
    createMonsterCombatant(monster, playerLevel, playerCombatType, Math.random(), hpMultiplier, damageMultiplier)
  );
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
  const loadout = effectiveLoadout(input.cls, input.specId, input.level, input.savedEquippedAbilityIds, input.trainedAbilityIds);
  const mergedBonuses = mergeStatBonuses(input.equipmentBonuses, input.buffTotals.statBonuses);
  const intStat = statAtLevel(input.cls, 'INT', input.level) + (mergedBonuses.INT ?? 0);
  const playerMaxHp = computeMaxHp(input.cls, input.level, mergedBonuses, input.talentTotals.hpMultPct, input.flatHpBonus ?? 0);
  const profile = buildPlayerProfile(input);

  return {
    id: 'player',
    name: 'You',
    isPlayer: true,
    hp: Math.min(input.currentHp, playerMaxHp),
    maxHp: playerMaxHp,
    isAlive: input.currentHp > 0,
    resources: initialResources(input.cls, input.level, intStat, input.flatManaBonus ?? 0),
    cooldowns: {},
    dots: [],
    hots: [],
    buffs: [],
    stunnedSeconds: 0,
    // Haste enchant — see CasterProfile.hastePct's doc comment. Division by
    // 1 (no Haste active) leaves this exactly ATTACK_INTERVAL_SECONDS, same
    // as before this field existed.
    actionReadyIn: ATTACK_INTERVAL_SECONDS / (1 + profile.hastePct / 100),
    equippedAbilityIds: loadout,
    abilityConditions: effectiveAbilityConditions(input.level, input.savedAbilityConditions),
    disabledAbilityIds: input.disabledAbilityIds,
    basicAttackId: BASIC_ATTACK_BY_CLASS[input.cls],
    profile,
    threatWeight: input.specDef.threatWeight,
  };
}

// A companion always uses its class's default ability loadout
// (effectiveLoadout with an empty saved choice — see progression.ts's own
// "sensible default" fallback) rather than a player-editable one; there's
// no companion Combat Setup screen in this V1. Who an enemy actually
// attacks among a multi-member party is decided by targeting.ts's weighted
// pick (classStats.ts's SpecDef.threatWeight) — a tank-spec companion (or
// player) draws fire disproportionately, not just "whoever's listed first."
export function createCompanionCombatant(companion: CompanionCombatSetup, monster: Monster): Combatant {
  // An alt recruit (see companions.ts's buildAltCombatSetup) carries its own
  // saved loadout; an ordinary hired companion has none, same effective
  // "use the default base kit" behavior as before this field existed.
  const loadout = effectiveLoadout(companion.cls, companion.specId, companion.level, companion.savedEquippedAbilityIds ?? []);
  const intStat = statAtLevel(companion.cls, 'INT', companion.level) + (companion.equipmentBonuses.INT ?? 0);
  const companionMaxHp = computeMaxHp(companion.cls, companion.level, companion.equipmentBonuses, companion.talentTotals?.hpMultPct ?? 0);

  return {
    id: `companion-${companion.id}`,
    name: companion.name,
    isPlayer: false,
    hp: companionMaxHp,
    maxHp: companionMaxHp,
    isAlive: true,
    resources: initialResources(companion.cls, companion.level, intStat),
    cooldowns: {},
    dots: [],
    hots: [],
    buffs: [],
    stunnedSeconds: 0,
    actionReadyIn: ATTACK_INTERVAL_SECONDS,
    equippedAbilityIds: loadout,
    basicAttackId: BASIC_ATTACK_BY_CLASS[companion.cls],
    profile: buildCompanionProfile(companion, monster),
    threatWeight: companion.specDef.threatWeight,
  };
}

export function createEncounterState(input: EncounterSetupInput): CombatState {
  const party = [createPlayerCombatant(input)];
  for (const companion of input.companions ?? []) {
    party.push(createCompanionCombatant(companion, input.monster));
  }
  return {
    party,
    enemies: spawnEnemyWave(
      input.monster,
      input.level,
      input.specDef.combatType,
      input.encounterSize ?? 1,
      input.monsterHpMultiplier,
      input.monsterDamageMultiplier
    ),
    timeElapsed: 0,
  };
}

// Exported so the UI can resolve any ability id (player or monster) to its
// display name/description in one place — StatusBadges and AbilityBar both
// need this, and neither should have to know which registry an id came
// from. A module-level constant, not rebuilt per call — ABILITIES/
// MONSTER_ABILITIES/MONSTER_BASIC_ATTACK are all static imports that never
// change at runtime, but this used to be reconstructed from scratch on
// every advanceCombat tick and every manual ability use (both hot paths).
const ALL_ABILITIES: Record<string, Ability> = { ...ABILITIES, ...MONSTER_ABILITIES, monster_basic_attack: MONSTER_BASIC_ATTACK };
export function abilitiesById(): Record<string, Ability> {
  return ALL_ABILITIES;
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

// Crippling Poison's attack-speed debuff — same summed-buffs convention as
// buffDamageDealtMult/buffDamageTakenMult above, just feeding the
// attackInterval calc (the main tick loop, below) instead of damage.
// Clamped so stacked/overlapping slows can never reach or cross 0 (a
// combatant that never acts again), matching this file's existing
// defensive-clamp habit elsewhere (e.g. damageTakenMult's own floor).
function buffActionSpeedMult(c: Combatant): number {
  const sum = c.buffs.reduce((total, b) => total + b.actionSpeedPct, 0);
  return 1 + Math.max(-80, sum) / 100;
}

// Replaces any existing buff tagged with the same abilityId rather than
// stacking a second copy — Crusader's "+10% of unbuffed Strength... for the
// next 3 eligible attacks, refreshing rather than stacking" (per the design
// brief) is the only caller today.
function upsertBuff(c: Combatant, buff: ActiveBuff): void {
  c.buffs = c.buffs.filter((b) => b.abilityId !== buff.abilityId);
  c.buffs.push(buff);
}

// Lightningfury's chain-lightning proc — "reduces their defense by 10%,
// stacking up to 3 times" is modeled as damageTakenPct on the EXISTING
// ActiveBuff mechanism (the same field Krypt's own self-buffs and the
// Crusader proc already use, just applied to an enemy instead of an ally —
// buffDamageTakenMultiplier already reads c.buffs generically regardless of
// which side c is on), not a new armor-specific field. upsertBuff alone
// would just REPLACE the existing stack at a flat value each proc, so this
// reads the current stack count back out of the existing buff (if any)
// before re-applying, refreshing duration either way.
const CHAIN_LIGHTNING_DEBUFF_PCT_PER_STACK = 10;
const CHAIN_LIGHTNING_MAX_STACKS = 3;
const CHAIN_LIGHTNING_MAX_TARGETS = 2;
function applyChainLightningDebuff(target: Combatant): void {
  const existing = target.buffs.find((b) => b.abilityId === 'lightningfury_chain_debuff');
  const currentStacks = existing ? Math.round(existing.damageTakenPct / CHAIN_LIGHTNING_DEBUFF_PCT_PER_STACK) : 0;
  const nextStacks = Math.min(CHAIN_LIGHTNING_MAX_STACKS, currentStacks + 1);
  upsertBuff(target, {
    abilityId: 'lightningfury_chain_debuff',
    remainingSeconds: 15,
    damageDealtPct: 0,
    damageTakenPct: CHAIN_LIGHTNING_DEBUFF_PCT_PER_STACK * nextStacks,
    actionSpeedPct: 0,
  });
}

// Rogue companion's "Master of Poisons" innate procs (CasterProfile.
// innateCombatProc === 'rogue_poison') — rolled independently of each
// other and of any weapon enchant proc, on every landed 'damage' effect,
// in useAbility below.
//
// Crippling Poison: flat -10% action speed on proc, refreshed (not
// stacked) each time it lands — upsertBuff alone is correct here since
// there's only ever one "stack."
const CRIPPLING_POISON_CHANCE = 0.1;
const CRIPPLING_POISON_SLOW_PCT = 10;
const CRIPPLING_POISON_DURATION_SECONDS = 15;
function applyCripplingPoisonDebuff(target: Combatant): void {
  upsertBuff(target, {
    abilityId: 'rogue_crippling_poison',
    remainingSeconds: CRIPPLING_POISON_DURATION_SECONDS,
    damageDealtPct: 0,
    damageTakenPct: 0,
    actionSpeedPct: -CRIPPLING_POISON_SLOW_PCT,
  });
}

// Deadly Poison: a dot that stacks up to 5 times, each stack adding its own
// tick damage. A new stack REPLACES the existing dot entry (refreshing its
// full duration and incrementing stacks, capped), rather than pushing a
// second independent timer — so "stacks fall off together if the poison's
// own duration expires before a new one lands" falls out of tickDots'
// existing expiry/removal logic for free: the whole entry (all stacks)
// expires as one unit, exactly like any other single dot already does.
const DEADLY_POISON_CHANCE = 0.2;
const DEADLY_POISON_MAX_STACKS = 5;
const DEADLY_POISON_DURATION_SECONDS = 12;
const DEADLY_POISON_TICK_SECONDS = 3;
const DEADLY_POISON_POWER = 0.25;
function applyDeadlyPoisonStack(target: Combatant, source: Combatant): void {
  const existing = target.dots.find((d) => d.abilityId === 'rogue_deadly_poison');
  const nextStacks = Math.min(DEADLY_POISON_MAX_STACKS, (existing?.stacks ?? 0) + 1);
  target.dots = target.dots.filter((d) => d.abilityId !== 'rogue_deadly_poison');
  target.dots.push({
    abilityId: 'rogue_deadly_poison',
    remainingSeconds: DEADLY_POISON_DURATION_SECONDS,
    tickSeconds: DEADLY_POISON_TICK_SECONDS,
    timeSinceLastTick: 0,
    // Snapshot per-stack tick damage fresh on every (re)application, same
    // "re-snapshot on refresh" convention the existing single-dot case uses.
    hitPerTick: source.profile.normalizedHit * DEADLY_POISON_POWER * source.profile.damageCoef * buffDamageDealtMult(source),
    stacks: nextStacks,
  });
}

// Crusader's temporary Strength buff, approximated as a flat damageDealtPct
// bonus on the existing ActiveBuff mechanism (Battle Cry's own mechanism)
// rather than a live STR/normalizedHit recompute — this engine bakes
// normalizedHit once at encounter setup, so a mid-fight STR change can't
// otherwise feed back into it without a much larger rework. A deliberate,
// flagged simplification (see this phase's final summary).
const CRUSADER_PROC_DAMAGE_DEALT_PCT = 10;
const CRUSADER_PROC_HEAL_PCT_OF_MAX_HP = 5;

// Icy Chill — 10% chance on a landed hit to slow the DEFENDER's own action
// speed by 10% for a short window, same ActiveBuff/actionSpeedPct
// mechanism (and same upsertBuff "refresh, don't stack" posture) as the
// rogue companion's Crippling Poison debuff just applied to a weapon-proc
// target instead. Previously defined/craftable/appliable but mechanically
// inert — see EnchantProcKind's doc comment — this is that gap closed,
// ahead of a future ice-themed expansion rather than tied to one.
const ICY_CHILL_SLOW_PCT = 10;
const ICY_CHILL_DEBUFF_DURATION_SECONDS = 15;

// One roll for a landed hit's damage: attacker's normalized hit, spec/talent
// coefficient, active buffs, the defender's armor, and a level-gap accuracy
// check when the attacker is the player (mirrors the old aggregate model's
// playerDamageModifier input exactly — see resolveHit for the level-gap piece).
//
// Also where the Herbalism/Alchemy overhaul's automation-driven offensive/
// defensive consumables (gameData/consumableAutomation.ts) apply and consume
// their charges — one flat charge per LANDED hit (a miss consumes nothing,
// same convention the old activeBuffs offensive_action/damage_taken triggers
// already used), decremented in place on `consumableState` so online (called
// once per real-time tick) and offline (called once per simulated tick in
// the exact same loop, see offlineCombat.ts) resolve identically instead of
// two approximations that could drift.
function computeEffectDamage(
  attacker: Combatant,
  defender: Combatant,
  power: number,
  levelGapAccuracy: number,
  effectDamageSchool: DamageSchool,
  consumableState: ConsumableAutomationRuntimeState | undefined
): {
  hit: boolean;
  amount: number;
  healOnTrigger: number;
  attackerHealOnTrigger: number;
  crit: boolean;
  procTriggered?: EnchantProcKind;
} {
  const accuracyRoll = attacker.isPlayer ? levelGapAccuracy : attacker.profile.accuracy;
  // dodgeChance is a separate independent roll from avoidance (AGI's own
  // mechanic, not a replacement for the existing spec-driven avoidance
  // stat) — see classStats.ts/combatFormulas.ts's AGI module comments.
  const avoided =
    Math.random() > accuracyRoll ||
    Math.random() < defender.profile.avoidance ||
    Math.random() < defender.profile.dodgeChance;
  if (avoided) return { hit: false, amount: 0, healOnTrigger: 0, attackerHealOnTrigger: 0, crit: false };
  const isCrit = Math.random() < attacker.profile.critChance;

  let offensiveMultPct = 0;
  if (attacker.isPlayer && consumableState?.offensive && consumableState.offensive.chargesRemaining > 0) {
    offensiveMultPct = consumableState.offensive.damageMultiplierPct;
    consumableState.offensive.chargesRemaining--;
    consumableState.offensiveChargesConsumed++;
  }

  const defensive =
    defender.isPlayer && consumableState?.defensive && consumableState.defensive.chargesRemaining > 0
      ? consumableState.defensive
      : undefined;
  if (defensive && consumableState) {
    defensive.chargesRemaining--;
    consumableState.defensiveChargesConsumed++;
  }

  // armorBonusPct (Elixir of Minor/Greater Defense) scales the defender's
  // effective armor for just this one hit — never persisted onto the
  // profile itself, matching BuffEffect.armorBonusPct's doc comment.
  const effectiveArmor = defender.profile.armor * (1 + (defensive?.armorBonusPct ?? 0) / 100);
  const armorMod = 1 - armorReduction(effectiveArmor);
  // Elemental resistance — only ever reduces damage from an attack whose
  // school matches. SUMS the consumable-only defensive buff (Herbalism/
  // Alchemy overhaul) with the always-on enchant-sourced resistance
  // (Phase E6's Fire/Frost/Shadow Resistance family, CasterProfile.
  // fireResistancePct/shadowResistancePct) — one pipeline, two sources —
  // clamped to the same 75% cap the game's avoidance stat already uses.
  const resistancePct =
    effectDamageSchool === 'fire'
      ? (defensive?.fireResistancePct ?? 0) + defender.profile.fireResistancePct
      : effectDamageSchool === 'shadow'
        ? (defensive?.shadowResistancePct ?? 0) + defender.profile.shadowResistancePct
        : 0;
  const resistanceMod = 1 - Math.min(0.75, resistancePct / 100);

  const raw =
    attacker.profile.normalizedHit *
    power *
    attacker.profile.damageCoef *
    (1 + offensiveMultPct / 100) *
    buffDamageDealtMult(attacker) *
    armorMod *
    (isCrit ? CRIT_DAMAGE_MULTIPLIER : 1);
  let amount = Math.max(
    0,
    Math.round(raw * defender.profile.damageTakenMult * buffDamageTakenMult(defender) * resistanceMod)
  );

  // Beastslayer/Demonslaying — attacker-side %, applied as a final
  // multiplier on the already-mitigated hit, only when the DEFENDER's
  // creatureType matches (Demonslaying never actually fires today — no
  // monster is tagged 'demon' yet, per Monster.creatureType's doc comment).
  let creatureBonusPct = 0;
  if (defender.profile.creatureType === 'beast') creatureBonusPct += attacker.profile.beastDamageBonusPct;
  if (defender.profile.creatureType === 'demon') creatureBonusPct += attacker.profile.demonDamageBonusPct;
  if (amount > 0 && creatureBonusPct > 0) amount = Math.round(amount * (1 + creatureBonusPct / 100));

  // Minor/Lesser/Mystic/Nether/Superior/Ember Absorption — flat reduction,
  // minimum 1, applied only to an already-positive hit (a hit already
  // mitigated to 0 by armor stays 0, never floored back up to 1). SUMMED
  // with the Attribute overhaul's Shield Block Value (same pipeline, two
  // sources — see CasterProfile.shieldBlockValue's doc comment) rather than
  // a second parallel flat-reduction step.
  const totalFlatReduction = defender.profile.flatDamageReduction + defender.profile.shieldBlockValue;
  if (amount > 0 && totalFlatReduction > 0) {
    amount = Math.max(1, amount - totalFlatReduction);
  }

  // Elixir of Fortitude's maxHpBonusPct — "temporarily raises the ceiling
  // used for THIS hit's survival math only, never persisted" (see
  // BuffEffect's doc comment): softens exactly a would-be-lethal hit by the
  // buff's HP%, rather than actually inflating defender.hp/maxHp, the
  // closest honest fit for a non-duration, charge-based "more HP" effect.
  if (defensive?.maxHpBonusPct && defender.hp - amount <= 0) {
    const cushion = defender.maxHp * (defensive.maxHpBonusPct / 100);
    amount = Math.round(Math.max(0, amount - cushion));
  }

  // Weak Troll's Blood Elixir's healOnTriggerPct — a small heal bundled into
  // this same hit-taken event, returned rather than applied here so the
  // caller (useAbility) can skip it for an already-dead defender exactly
  // like every other heal in this file does.
  const healOnTrigger = defensive?.healOnTriggerPct ? Math.round(defender.maxHp * (defensive.healOnTriggerPct / 100)) : 0;

  // Enchanting overhaul's weapon procs — Fiery Weapon/Lifestealing/Crusader/
  // Icy Chill (and their Ember-tier upgrades), player-attacker only
  // (CasterProfile.weaponProc is always undefined for monsters/companions).
  // Rolled once per landed hit, AFTER every mitigation step above, off the
  // hit's final amount ("approximately 15% of the character's normal
  // attack damage," per the design brief). The bonus fire damage this adds
  // to `amount` itself never re-triggers this same roll — there is no
  // second computeEffectDamage call for it — satisfying "procs cannot
  // trigger additional enchant procs."
  let attackerHealOnTrigger = 0;
  let procTriggered: EnchantProcKind | undefined;
  const proc = attacker.profile.weaponProc;
  if (proc && amount > 0 && Math.random() * 100 < proc.chancePct) {
    procTriggered = proc.kind;
    if (proc.kind === 'fiery_weapon') {
      amount += Math.round(amount * (proc.power / 100));
    } else if (proc.kind === 'lifestealing') {
      attackerHealOnTrigger = Math.round(Math.max(0, Math.min(amount * (proc.power / 100), attacker.maxHp - attacker.hp)));
    } else if (proc.kind === 'icy_chill') {
      upsertBuff(defender, {
        abilityId: 'enchant_proc_icy_chill',
        remainingSeconds: ICY_CHILL_DEBUFF_DURATION_SECONDS,
        damageDealtPct: 0,
        damageTakenPct: 0,
        actionSpeedPct: -ICY_CHILL_SLOW_PCT,
      });
    } else if (proc.kind === 'crusader') {
      upsertBuff(attacker, {
        abilityId: 'enchant_proc_crusader',
        remainingSeconds: (3 * ATTACK_INTERVAL_SECONDS) / (1 + attacker.profile.hastePct / 100),
        damageDealtPct: CRUSADER_PROC_DAMAGE_DEALT_PCT,
        damageTakenPct: 0,
        actionSpeedPct: 0,
      });
      attackerHealOnTrigger = Math.round(
        Math.max(0, Math.min(attacker.maxHp * (CRUSADER_PROC_HEAL_PCT_OF_MAX_HP / 100), attacker.maxHp - attacker.hp))
      );
    }
  }

  // Final safety net: every adjustment above already rounds its own step,
  // but `amount` is a running value threaded through several of them (the
  // maxHpBonusPct cushion in particular used to leave it fractional, which
  // then showed up as a long-decimal number in the combat log) — rounding
  // once more here guarantees whatever reaches the log/HP math is always a
  // whole number, regardless of what gets added to this pipeline later.
  return { hit: true, amount: Math.round(amount), healOnTrigger, attackerHealOnTrigger, crit: isCrit, procTriggered };
}

export interface KillReward {
  xpGained: number;
  goldGained: number;
  voidShardsGained: number;
  loot: { itemId: string; quantity: number }[];
  // Which monster this reward came from — lets callers (the quest system)
  // attribute a kill to a specific monster id without re-deriving it from
  // display text. Always the monster actually defeated, even mid-dungeon
  // where `ctx.monster` changes stage to stage.
  monsterId: string;
}

// Player-only combat signals the quest system cares about, accumulated
// across everything that happens in one advanceCombat/tryManualUseAbility
// call — passed by reference the same way `events`/`kills` already are, so
// every place damage/healing/ability-use happens can contribute without
// engine.ts needing to know anything about quests itself.
export interface QuestSignals {
  healingDone: number;
  abilityUseCounts: Record<string, number>;
}

function emptyQuestSignals(): QuestSignals {
  return { healingDone: 0, abilityUseCounts: {} };
}

// Accumulates one tick/manual-use's signals into a running total — both
// CombatScreen and DungeonScreen collect these across many ticks between
// autosaves, the same way they already batch `kills` via a ref.
export function mergeQuestSignals(into: QuestSignals, from: QuestSignals): void {
  into.healingDone += from.healingDone;
  for (const [abilityId, count] of Object.entries(from.abilityUseCounts)) {
    into.abilityUseCounts[abilityId] = (into.abilityUseCounts[abilityId] ?? 0) + count;
  }
}

export interface TickResult {
  events: CombatEvent[];
  kills: KillReward[];
  playerDied: boolean;
  questSignals: QuestSignals;
}

export interface TickContext {
  monster: Monster;
  playerLevel: number;
  playerCombatType: CombatType;
  // Dungeon stage progression hook (Phase 8) — called once the WHOLE current
  // wave (every Combatant in state.enemies) is dead, to decide what the next
  // wave is. Omitted, a fresh wave just respawns as `monster` again forever
  // (every non-dungeon fight). When present, the engine also updates
  // `monster` to match so the rest of this same tick (and the next one)
  // sees the new stage as current — callers needing to react to a stage
  // change (UI, session counters) should compare the monster before/after a
  // tick that produced a kill, not poll this mid-tick.
  nextMonster?: (justDefeated: Monster) => Monster;
  // How many enemies make up one wave — 1 for every existing fight (open
  // world, and every dungeon stage so far). A 'multi_target' dungeon stage
  // sets this higher (see dungeons.ts's Dungeon.encounterSize) so a wave is
  // several weaker enemies fought simultaneously instead of one tankier one;
  // the wave only advances once every one of them is dead (see the
  // respawn/advance step below), not per individual kill.
  encounterSize?: number;
  // HP multiplier applied to each monster spawned in a wave (dungeon group
  // scaling — see DungeonScreen.tsx) — read at spawn/respawn time so a
  // multi-enemy wave isn't just the single-enemy HP multiplied by headcount
  // again on top of already being split across more bodies.
  monsterHpMultiplier?: number;
  // Combat/Rarity overhaul — see EncounterSetupInput.monsterDamageMultiplier's
  // doc comment. Same "read at spawn/respawn time" posture as
  // monsterHpMultiplier above.
  monsterDamageMultiplier?: number;
  // Potion-slot automation — built once per encounter setup (gameData/
  // consumableAutomation.ts's buildConsumableAutomationState, derived from
  // whatever's pinned to Character.equippedConsumables.potion) and mutated
  // in place by advanceCombat as the fight actually happens (per-hit charge
  // consumption, per-tick auto-heal/mana), exactly like ctx.monster itself
  // is mutated by the dungeon stage-advance step — this is what lets online
  // (a fresh ctx rebuilt every tick, but pointed at the SAME persistent
  // state object) and offline (one ctx reused for the whole
  // simulateOfflineCombat loop) resolve charges at identical per-hit/per-
  // tick granularity instead of two drifting approximations. Absent for
  // every encounter before this field existed, and for any character with
  // nothing pinned to the Potion slot.
  consumableState?: ConsumableAutomationRuntimeState;
  // Tailoring overhaul's Shirt of Fortune — a flat % bonus to gold gained
  // per kill, read from CurrentActivity.equippedShirtItemId (or, for a
  // dungeon run, DungeonScreen's own local-state snapshot taken at entry —
  // see its doc comment) rather than the character's LIVE equipped shirt,
  // same anti-retroactive-exploit snapshot convention as every other shirt
  // bonus (gameData/shirts.ts).
  goldFindPct?: number;
}

export function advanceCombat(state: CombatState, ctx: TickContext, deltaSeconds: number): TickResult {
  const events: CombatEvent[] = [];
  const kills: KillReward[] = [];
  const questSignals = emptyQuestSignals();
  let playerDied = false;
  const abilities = abilitiesById();

  const allCombatants = [...state.party, ...state.enemies];

  // 1. Advance time-based state: cooldowns, dots, buffs, stun, resource regen.
  for (const c of allCombatants) {
    if (!c.isAlive) continue;
    for (const id of Object.keys(c.cooldowns)) {
      c.cooldowns[id] = Math.max(0, c.cooldowns[id] - deltaSeconds);
    }
    regenResources(c.resources, deltaSeconds, c.profile.manaRegenMult);
    tickDots(c, deltaSeconds, ctx, events, kills);
    tickHots(c, deltaSeconds, events);
    c.buffs = c.buffs.filter((b) => (b.remainingSeconds -= deltaSeconds) > 0);
    if (c.stunnedSeconds > 0) c.stunnedSeconds = Math.max(0, c.stunnedSeconds - deltaSeconds);
    if (c.forcedTargetSeconds && c.forcedTargetSeconds > 0) {
      c.forcedTargetSeconds = Math.max(0, c.forcedTargetSeconds - deltaSeconds);
      if (c.forcedTargetSeconds === 0) c.forcedTargetId = undefined;
    }
    // passiveHealPct (Holy Priest/Paladin's out-of-the-box sustain, plus a
    // small amount baked into every healing spec) was computed onto every
    // profile since Phase 1 but never actually applied here — a real gap,
    // since it's the mechanic those specs' own descriptions promise. A dot
    // tick above can still kill c in this same iteration, so check isAlive
    // again rather than trusting the outer loop's guard.
    if (c.isAlive && c.profile.passiveHealPct > 0) {
      const before = c.hp;
      c.hp = Math.min(c.maxHp, c.hp + c.maxHp * c.profile.passiveHealPct * c.profile.healingPowerMult * deltaSeconds);
      if (c.isPlayer) questSignals.healingDone += c.hp - before;
    }
  }

  // 1b. Herbalism/Alchemy overhaul's Part 8 auto-heal/auto-mana — player
  // only (automation settings are per-character, not per-companion), run
  // once per tick so its cooldown/threshold checks happen at the same
  // granularity online and offline. Checked before step 2 acts, matching a
  // real player's own "drink a potion, then act" reflex.
  const automationPlayer = state.party.find((p) => p.isPlayer);
  if (ctx.consumableState && automationPlayer?.isAlive) {
    const cs = ctx.consumableState;
    if (cs.healing) {
      cs.healing.cooldownRemaining = Math.max(0, cs.healing.cooldownRemaining - deltaSeconds);
      const hpPct = (automationPlayer.hp / automationPlayer.maxHp) * 100;
      if (
        cs.healing.cooldownRemaining <= 0 &&
        cs.healing.stockRemaining > 0 &&
        hpPct <= cs.healing.thresholdPct &&
        automationPlayer.hp < automationPlayer.maxHp
      ) {
        const healAmt = cs.healing.healPctMax
          ? automationPlayer.maxHp * (cs.healing.healPctMax / 100)
          : cs.healing.healAmount ?? 0;
        const before = automationPlayer.hp;
        automationPlayer.hp = Math.min(automationPlayer.maxHp, automationPlayer.hp + healAmt);
        questSignals.healingDone += automationPlayer.hp - before;
        cs.healing.cooldownRemaining = cs.healing.cooldownSeconds;
        cs.healing.stockRemaining--;
        cs.healingUsed++;
        events.push({ message: `${automationPlayer.name} automatically drinks a healing potion.`, kind: 'heal' });
      }
    }
    if (cs.mana) {
      cs.mana.cooldownRemaining = Math.max(0, cs.mana.cooldownRemaining - deltaSeconds);
      const manaPool = automationPlayer.resources.mana;
      if (manaPool) {
        const manaPct = (manaPool.current / manaPool.max) * 100;
        if (
          cs.mana.cooldownRemaining <= 0 &&
          cs.mana.stockRemaining > 0 &&
          manaPct <= cs.mana.thresholdPct &&
          manaPool.current < manaPool.max
        ) {
          const manaAmt = cs.mana.manaPctMax ? manaPool.max * (cs.mana.manaPctMax / 100) : cs.mana.manaAmount ?? 0;
          manaPool.current = Math.min(manaPool.max, manaPool.current + manaAmt);
          cs.mana.cooldownRemaining = cs.mana.cooldownSeconds;
          cs.mana.stockRemaining--;
          cs.manaUsed++;
          events.push({ message: `${automationPlayer.name} automatically drinks a mana potion.`, kind: 'status' });
        }
      }
    }
    // Cooking overhaul Tier 1 — Auto Eat. Same cooldown/threshold/stock
    // shape as the healing automation above, but additionally gated on
    // "not a dungeon/raid" (ctx.nextMonster is only ever set for a dungeon
    // encounter — see TickContext's doc comment), per the design brief's
    // explicit "never in dungeons/raids" rule. Running after step 1's dot/
    // hot ticks and the two automations above (all still "post-damage-
    // resolution, this tick"), and gated on automationPlayer.isAlive same
    // as them, satisfies "evaluated only if the character survives, never
    // retroactively preventing lethal damage."
    if (cs.autoEat && !ctx.nextMonster) {
      cs.autoEat.cooldownRemaining = Math.max(0, cs.autoEat.cooldownRemaining - deltaSeconds);
      const hpPct = (automationPlayer.hp / automationPlayer.maxHp) * 100;
      if (
        cs.autoEat.cooldownRemaining <= 0 &&
        cs.autoEat.stockRemaining > 0 &&
        hpPct <= cs.autoEat.thresholdPct &&
        automationPlayer.hp < automationPlayer.maxHp
      ) {
        const healAmt = automationPlayer.maxHp * ((cs.autoEat.healPctMax ?? 0) / 100);
        const before = automationPlayer.hp;
        automationPlayer.hp = Math.min(automationPlayer.maxHp, automationPlayer.hp + healAmt);
        questSignals.healingDone += automationPlayer.hp - before;
        cs.autoEat.cooldownRemaining = cs.autoEat.cooldownSeconds;
        cs.autoEat.stockRemaining--;
        cs.autoEatUsed++;
        events.push({ message: `${automationPlayer.name} automatically eats some Recovery Food.`, kind: 'heal' });
      }
    }
  }

  // 2. Let anyone whose action timer has elapsed act — a stunned combatant's
  // action timer doesn't advance at all (matches "your swing timer freezes
  // during a stun," not "swings bank up and all fire the instant it ends").
  for (const c of allCombatants) {
    // The Citadel of Krypt — a paused boss (its 50% add phase) doesn't act
    // at all until its adds are dead, same "action timer doesn't advance"
    // treatment as a stun.
    if (!c.isAlive || c.stunnedSeconds > 0 || c.bossPhaseState?.paused) continue;
    // Haste enchant (static, per-encounter) combined with Crippling
    // Poison's live actionSpeedPct debuff (buffActionSpeedMult) — see
    // CasterProfile.hastePct's and ActiveBuff.actionSpeedPct's doc comments.
    // Both default to a 1x no-op for everyone except the player (haste) or
    // a poisoned target (the debuff), so this is unchanged cadence for
    // every other combatant, same as before either field existed.
    const attackInterval = ATTACK_INTERVAL_SECONDS / ((1 + c.profile.hastePct / 100) * buffActionSpeedMult(c));
    c.actionReadyIn -= deltaSeconds;
    while (c.actionReadyIn <= 0 && c.isAlive) {
      const picked = pickAbility(state, c, abilities);
      if (!picked) {
        c.actionReadyIn += attackInterval;
        break;
      }
      useAbility(state, c, picked.ability, picked.targetId, ctx, events, kills, questSignals);
      c.actionReadyIn += attackInterval;
    }
  }

  // 2.5. The Citadel of Krypt — boss phase triggers (Monster.bossPhases).
  // Runs after this tick's damage so a threshold crossed by THIS tick's
  // hits fires immediately, not one tick late. Three parts, each a plain
  // loop over state.enemies (bossPhaseState is only ever set on a monster
  // with bossPhases, so this is a zero-cost no-op for every other fight):
  for (const enemy of state.enemies) {
    if (!enemy.isAlive || !enemy.bossPhaseState) continue;
    const phases = enemy.bossPhaseState.phases;
    const hpPct = (enemy.hp / enemy.maxHp) * 100;
    for (const phase of phases) {
      if (enemy.bossPhaseState.triggeredHpPcts.includes(phase.hpPct) || hpPct > phase.hpPct) continue;
      enemy.bossPhaseState.triggeredHpPcts.push(phase.hpPct);
      if (phase.kind === 'adds_and_regen') {
        enemy.bossPhaseState.paused = true;
        enemy.bossPhaseState.regenPctPerSecond = phase.regenPctPerSecond ?? 0;
        const addsMonster = phase.addsMonsterId ? MONSTERS[phase.addsMonsterId] : undefined;
        if (addsMonster) {
          // Flat, deliberately small HP AND damage multipliers (NOT the
          // dungeon's own monsterHpMultiplier/monsterDamageMultiplier, which
          // this spawn bypasses entirely) — these are meant to read as "6
          // low-HP minions" that pressure kill SPEED (via the regen above),
          // not 6 full-strength copies of their open-world selves capable of
          // bursting the party down on their own. A live playtest of this
          // exact phase caught the first version of this spawn (HP scaled
          // down, damage left at 1x) nearly one-shotting every companion —
          // see this commit's own history.
          const adds = spawnEnemyWave(addsMonster, ctx.playerLevel, ctx.playerCombatType, phase.addsCount ?? 1, 0.15, 0.15);
          state.enemies.push(...adds);
        }
        events.push({ message: `${enemy.name} stops attacking and begins to regenerate!`, kind: 'status' });
      } else if (phase.kind === 'enrage') {
        enemy.bossPhaseState.enrageActive = true;
        enemy.bossPhaseState.enrageRampPctPerSecond = phase.rampPctPerSecond ?? 0;
        events.push({ message: `${enemy.name} enrages — its attacks grow stronger by the second!`, kind: 'status' });
      }
    }
    // Regen + resume-check for a currently-paused boss — every OTHER living
    // enemy is, by construction, one of this phase's own adds (Krypt's own
    // encounter never has more than one enemy before this fires).
    if (enemy.bossPhaseState.paused) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * (enemy.bossPhaseState.regenPctPerSecond / 100) * deltaSeconds);
      const addsStillAlive = state.enemies.some((e) => e.id !== enemy.id && e.isAlive);
      if (!addsStillAlive) {
        enemy.bossPhaseState.paused = false;
        enemy.bossPhaseState.regenPctPerSecond = 0;
        events.push({ message: `${enemy.name} resumes its attack!`, kind: 'status' });
      }
    }
    // Enrage ramp — compounds profile.damageCoef IN PLACE every tick rather
    // than computing an absolute multiplier from a stored trigger time (see
    // Combatant.bossPhaseState's own doc comment for why that's safe here).
    if (enemy.bossPhaseState.enrageActive) {
      enemy.profile.damageCoef *= 1 + (enemy.bossPhaseState.enrageRampPctPerSecond / 100) * deltaSeconds;
    }
  }

  // 3. Once the WHOLE current wave is dead, spawn a fresh one (advancing the
  // dungeon stage first if ctx.nextMonster is set) — and note player death.
  // Waiting for every enemy rather than respawning each dead slot
  // independently is what makes a multi_target dungeon's 2-3-enemy wave
  // advance exactly once when the last of them falls, instead of calling
  // nextMonster (and skipping ahead) once per simultaneous death.
  if (state.enemies.length > 0 && state.enemies.every((e) => !e.isAlive)) {
    if (ctx.nextMonster) ctx.monster = ctx.nextMonster(ctx.monster);
    state.enemies = spawnEnemyWave(
      ctx.monster,
      ctx.playerLevel,
      ctx.playerCombatType,
      ctx.encounterSize ?? 1,
      ctx.monsterHpMultiplier,
      ctx.monsterDamageMultiplier
    );
  }
  const player = state.party.find((p) => p.isPlayer);
  if (player && !player.isAlive) playerDied = true;

  state.timeElapsed += deltaSeconds;
  return { events, kills, playerDied, questSignals };
}

function tickDots(c: Combatant, deltaSeconds: number, ctx: TickContext, events: CombatEvent[], kills: KillReward[]): void {
  for (const dot of c.dots) {
    dot.remainingSeconds -= deltaSeconds;
    dot.timeSinceLastTick += deltaSeconds;
    while (dot.timeSinceLastTick >= dot.tickSeconds && c.isAlive) {
      dot.timeSinceLastTick -= dot.tickSeconds;
      // dot.stacks (Deadly Poison) multiplies the per-tick amount; absent
      // for every other dot, which ticks exactly as before this field
      // existed (× 1).
      const amount = Math.round(dot.hitPerTick * (dot.stacks ?? 1));
      c.hp = Math.max(0, c.hp - amount);
      events.push({
        message: `${c.name} takes ${amount} damage from a lingering effect.`,
        kind: c.isPlayer ? 'damage_in' : 'damage_out',
      });
      if (c.hp <= 0 && c.isAlive) {
        c.isAlive = false;
        events.push({ message: `${c.name} is defeated!`, kind: 'death' });
        if (!c.isPlayer) kills.push(rollKillReward(ctx.monster, ctx.monster.level - ctx.playerLevel, ctx.goldFindPct));
      }
    }
  }
  c.dots = c.dots.filter((dot) => dot.remainingSeconds > 0);
}

// Mirrors tickDots but healing — no death check needed since a HOT can't
// drop anyone's HP. Doesn't feed questSignals.healingDone, matching how
// tickDots' damage never fed a "damage dealt" quest signal either — both
// are scoped to direct-effect quest tracking only.
function tickHots(c: Combatant, deltaSeconds: number, events: CombatEvent[]): void {
  for (const hot of c.hots) {
    hot.remainingSeconds -= deltaSeconds;
    hot.timeSinceLastTick += deltaSeconds;
    while (hot.timeSinceLastTick >= hot.tickSeconds && c.isAlive) {
      hot.timeSinceLastTick -= hot.tickSeconds;
      const amount = Math.round(hot.healPerTick);
      if (amount > 0 && c.hp < c.maxHp) {
        c.hp = Math.min(c.maxHp, c.hp + amount);
        events.push({ message: `${c.name} is healed by a lingering effect.`, kind: 'heal' });
      }
    }
  }
  c.hots = c.hots.filter((hot) => hot.remainingSeconds > 0);
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
  kills: KillReward[],
  questSignals: QuestSignals = emptyQuestSignals()
): void {
  // Prot Paladin's spec-identity passive — INT reduces this combatant's
  // own mana costs (see CasterProfile.manaCostReductionPct's doc comment).
  // 0 for every other spec, so resourceCost is just ability.resourceCost
  // unchanged for everyone else — no behavior change for a character
  // before this field existed.
  const resourceCost =
    ability.resourceType === 'mana' && ability.resourceCost && source.profile.manaCostReductionPct > 0
      ? Math.max(0, Math.round(ability.resourceCost * (1 - source.profile.manaCostReductionPct / 100)))
      : ability.resourceCost;
  spend(source.resources, ability.resourceType, resourceCost);
  if (ability.cooldownSeconds > 0) source.cooldowns[ability.id] = ability.cooldownSeconds;
  if (source.isPlayer) {
    questSignals.abilityUseCounts[ability.id] = (questSignals.abilityUseCounts[ability.id] ?? 0) + 1;
  }

  const resolvedTarget = [...state.party, ...state.enemies].find((c) => c.id === targetId);
  if (!resolvedTarget) return;

  // aoe broadens the single resolveTarget() pick to every alive combatant on
  // that same side — targetType still decides WHICH side (enemies for
  // CURRENT_ENEMY, party for LOWEST_HP_ALLY), aoe just decides "one or all."
  const resolvedSide = state.enemies.some((c) => c.id === resolvedTarget.id) ? state.enemies : state.party;
  const targets = ability.aoe ? resolvedSide.filter((c) => c.isAlive) : [resolvedTarget];

  const levelDiff = ctx.monster.level - ctx.playerLevel;
  // source.profile.accuracy is 1 + any hit-chance buff bonus (see
  // buildPlayerProfile) — additive on top of the level-gap base chance,
  // same convention as every other buff/talent bonus in this engine.
  const levelGapAccuracy = source.isPlayer
    ? Math.min(1, playerAccuracy(levelDiff) + (source.profile.accuracy - 1))
    : 1;

  for (const effect of ability.effects) {
    for (const target of targets) {
      switch (effect.type) {
        case 'damage': {
          const effectDamageSchool = effect.damageSchool ?? source.profile.damageSchool;
          const { hit, amount, healOnTrigger, attackerHealOnTrigger, crit, procTriggered } = computeEffectDamage(
            source,
            target,
            effect.power ?? 1,
            levelGapAccuracy,
            effectDamageSchool,
            ctx.consumableState
          );
          if (!hit) {
            events.push({
              message: `${source.name} uses ${ability.name} on ${target.name}, but it misses.`,
              kind: target.isPlayer ? 'miss_in' : 'miss_out',
            });
            break;
          }
          target.hp = Math.max(0, target.hp - amount);
          // Weak Troll's Blood Elixir's healOnTriggerPct — applied right
          // after the hit it's bundled with, same "skip a dead target"
          // guard every other heal in this file already uses.
          if (healOnTrigger > 0 && target.isAlive) {
            const before = target.hp;
            target.hp = Math.min(target.maxHp, target.hp + healOnTrigger);
            if (target.isPlayer) questSignals.healingDone += target.hp - before;
          }
          // Lifestealing/Crusader's attacker-side proc heal — same
          // skip-a-dead-attacker guard as every other heal in this file.
          if (attackerHealOnTrigger > 0 && source.isAlive) {
            const before = source.hp;
            source.hp = Math.min(source.maxHp, source.hp + attackerHealOnTrigger);
            if (source.isPlayer) questSignals.healingDone += source.hp - before;
          }
          if (procTriggered === 'fiery_weapon') {
            events.push({ message: `${source.name}'s weapon enchant bursts into flame!`, kind: 'status' });
          } else if (procTriggered === 'lifestealing') {
            events.push({ message: `${source.name}'s weapon enchant drains life from ${target.name}.`, kind: 'status' });
          } else if (procTriggered === 'crusader') {
            events.push({ message: `${source.name} is empowered by a Crusader enchant.`, kind: 'status' });
          } else if (procTriggered === 'icy_chill') {
            events.push({ message: `${target.name} is chilled, slowing their actions.`, kind: 'status' });
          } else if (procTriggered === 'chain_lightning') {
            // Lightningfury — chains bonus damage (power% of this hit) to up
            // to 2 OTHER alive enemies on the same side as `target`, and
            // stacks the defense-reduction debuff (see
            // applyChainLightningDebuff below) on every enemy it touches,
            // target included. Never re-triggers computeEffectDamage (so
            // this can't itself proc again), same "procs don't chain to
            // other procs" rule fiery_weapon's bonus damage already follows.
            events.push({ message: `${source.name}'s blade arcs with lightning!`, kind: 'status' });
            if (target.isAlive) applyChainLightningDebuff(target);
            const chainPower = (source.profile.weaponProc?.power ?? 0) / 100;
            const others = resolvedSide.filter((c) => c.id !== target.id && c.isAlive);
            for (const chained of others.slice(0, CHAIN_LIGHTNING_MAX_TARGETS)) {
              const chainAmount = Math.round(amount * chainPower);
              chained.hp = Math.max(0, chained.hp - chainAmount);
              applyChainLightningDebuff(chained);
              events.push({
                message: `Lightning arcs to ${chained.name} for ${chainAmount} damage.`,
                kind: chained.isPlayer ? 'damage_in' : 'damage_out',
              });
              if (chained.hp <= 0 && chained.isAlive) {
                chained.isAlive = false;
                events.push({ message: `${chained.name} is defeated!`, kind: 'death' });
                if (!chained.isPlayer) kills.push(rollKillReward(ctx.monster, levelDiff, ctx.goldFindPct));
              }
            }
          }
          // Rogue companion's innate poisons — independent of procTriggered
          // (that's reserved for weapon-enchant procs specifically; these
          // are spec-innate, no weapon/enchant required) and independent of
          // each other, so both can land on the same hit.
          if (target.isAlive && source.profile.innateCombatProc === 'rogue_poison') {
            if (Math.random() < CRIPPLING_POISON_CHANCE) {
              applyCripplingPoisonDebuff(target);
              events.push({ message: `${source.name} poisons ${target.name} with Crippling Poison.`, kind: 'status' });
            }
            if (Math.random() < DEADLY_POISON_CHANCE) {
              applyDeadlyPoisonStack(target, source);
              events.push({ message: `${source.name} applies a stack of Deadly Poison to ${target.name}.`, kind: 'status' });
            }
          }
          // healFrac (Shadow Priest's "sustain from the damage you deal," per
          // its own spec blurb) was computed onto the profile since Phase 1
          // but never actually paid out here — same gap as passiveHealPct
          // above. Only direct damage feeds it; a dot's damage is spread out
          // and already snapshots the source's damageCoef below, so folding
          // healFrac into every tick too would double-count the same "damage
          // dealt" against a single self-heal budget for no real benefit.
          if (source.profile.healFrac > 0 && source.isAlive) {
            const before = source.hp;
            source.hp = Math.min(source.maxHp, source.hp + amount * source.profile.healFrac * source.profile.healingPowerMult);
            if (source.isPlayer) questSignals.healingDone += source.hp - before;
          }
          // Rage, fixed: Warriors previously had no way to generate it
          // besides Charge's flat resourceGain, making their resource feel
          // broken rather than "bursty." Now any damaging ability grants
          // rage to a rage-pool source for dealing it, and to a rage-pool
          // target for TAKING it — a tank parked in front of a boss builds
          // meaningfully faster than one who isn't, same as the real thing.
          if (source.resources.rage) gain(source.resources, 'rage', Math.max(1, Math.round(amount * 0.05)));
          if (target.resources.rage) gain(target.resources, 'rage', Math.max(1, Math.round(amount * 0.1)));
          events.push({
            message: crit
              ? `${source.name} critically hits ${target.name} with ${ability.name} for ${amount} damage.`
              : `${source.name} uses ${ability.name} on ${target.name} for ${amount} damage.`,
            kind: target.isPlayer ? 'damage_in' : 'damage_out',
          });
          if (target.hp <= 0 && target.isAlive) {
            target.isAlive = false;
            events.push({ message: `${target.name} is defeated!`, kind: 'death' });
            if (!target.isPlayer) kills.push(rollKillReward(ctx.monster, levelDiff, ctx.goldFindPct));
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
        case 'hot': {
          target.hots.push({
            abilityId: ability.id,
            remainingSeconds: effect.durationSeconds ?? 0,
            tickSeconds: effect.tickSeconds ?? 1,
            timeSinceLastTick: 0,
            healPerTick:
              source.profile.normalizedHit *
              (effect.power ?? 0.3) *
              source.profile.damageCoef *
              buffDamageDealtMult(source) *
              source.profile.healingPowerMult,
          });
          events.push({ message: `${source.name} places ${ability.name} on ${target.name}.`, kind: 'status' });
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
            source.profile.normalizedHit *
              (effect.power ?? 1) *
              source.profile.damageCoef *
              buffDamageDealtMult(source) *
              source.profile.healingPowerMult
          );
          const hpBefore = target.hp;
          target.hp = Math.min(target.maxHp, target.hp + healAmount);
          if (source.isPlayer) questSignals.healingDone += target.hp - hpBefore;
          events.push({ message: `${source.name} uses ${ability.name} on ${target.name}, healing for ${healAmount}.`, kind: 'heal' });
          break;
        }
        case 'buff': {
          target.buffs.push({
            abilityId: ability.id,
            remainingSeconds: effect.durationSeconds ?? 0,
            damageDealtPct: effect.damageDealtPct ?? 0,
            damageTakenPct: effect.damageTakenPct ?? 0,
            actionSpeedPct: 0,
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
        case 'taunt': {
          target.forcedTargetId = source.id;
          target.forcedTargetSeconds = Math.max(target.forcedTargetSeconds ?? 0, effect.durationSeconds ?? 0);
          events.push({ message: `${source.name} taunts ${target.name} with ${ability.name}.`, kind: 'status' });
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
}

function rollKillReward(monster: Monster, levelDiff: number, goldFindPct = 0): KillReward {
  const goldGained = Math.round(
    (monster.goldMin + Math.random() * (monster.goldMax - monster.goldMin)) * (1 + goldFindPct / 100)
  );
  const xpGained = Math.round(50 * monster.level * xpModifier(levelDiff) * (monster.isElite ? ELITE_XP_MULTIPLIER : 1));
  const voidShardsGained = monster.voidShardsMin
    ? Math.round(monster.voidShardsMin + Math.random() * ((monster.voidShardsMax ?? monster.voidShardsMin) - monster.voidShardsMin))
    : 0;
  const loot: { itemId: string; quantity: number }[] = [];
  for (const drop of monster.lootTable) {
    if (Math.random() < drop.chance) {
      const qty = Math.round(drop.minQty + Math.random() * (drop.maxQty - drop.minQty));
      if (qty > 0) loot.push({ itemId: drop.itemId, quantity: qty });
    }
  }
  return { xpGained, goldGained, voidShardsGained, loot, monsterId: monster.id };
}

// Manual override — same function the AI uses, just triggered by a click
// instead of the priority walk. Still subject to cooldown/resource/target
// checks, so it can't bypass anything the AI itself couldn't do.
export function tryManualUseAbility(
  state: CombatState,
  sourceId: string,
  abilityId: string,
  ctx: TickContext
): { events: CombatEvent[]; kills: KillReward[]; questSignals: QuestSignals } | null {
  const source = state.party.find((c) => c.id === sourceId);
  const ability = abilitiesById()[abilityId];
  if (!source || !source.isAlive || !ability) return null;
  if ((source.cooldowns[ability.id] ?? 0) > 0) return null;
  if (!canAfford(source.resources, ability.resourceType, ability.resourceCost)) return null;
  const target = resolveTarget(state, ability.targetType, source.id);
  if (!target || !target.isAlive) return null;

  const events: CombatEvent[] = [];
  const kills: KillReward[] = [];
  const questSignals = emptyQuestSignals();
  useAbility(state, source, ability, target.id, ctx, events, kills, questSignals);
  return { events, kills, questSignals };
}

export { ABILITIES } from './abilities';

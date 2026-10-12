import { PRIMARY_STAT, SPECS, statAtLevel, type BaseStat, type ClassId, type SpecId } from './classStats';

export const ATTACK_INTERVAL_SECONDS = 2.0; // universal baseline, both player and monster
export const MONSTER_DAMAGE_SCALE = 0.75; // global tuning knob found during Pass 1 calibration

export const LEVEL_CAP = 60;

// ── Level-gap interpolation tables ──────────────────────────────────────
type Anchor = [number, number];

function interpTable(anchors: Anchor[], diff: number): number {
  if (diff <= anchors[0][0]) return anchors[0][1];
  if (diff >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [d0, v0] = anchors[i];
    const [d1, v1] = anchors[i + 1];
    if (diff >= d0 && diff <= d1) {
      const t = (diff - d0) / (d1 - d0);
      return v0 + t * (v1 - v0);
    }
  }
  return anchors[anchors.length - 1][1];
}

// diff = monsterLevel - playerLevel
export const PLAYER_DMG_MOD: Anchor[] = [
  [-10, 2.0], [-5, 1.5], [-3, 1.3], [-2, 1.2], [-1, 1.1], [0, 1.0],
  [1, 0.9], [2, 0.8], [3, 0.7], [4, 0.6], [5, 0.5],
  [6, 0.4], [7, 0.3], [8, 0.2], [9, 0.1], [10, 0.05],
];

export const ENEMY_DMG_MOD: Anchor[] = [
  [-10, 0.4], [-5, 0.6], [-3, 0.75], [-1, 0.9], [0, 1.0],
  [1, 1.1], [2, 1.2], [3, 1.3], [4, 1.4], [5, 1.5],
  [6, 1.6], [7, 1.7], [8, 1.8], [9, 1.9], [10, 2.0],
];

// grey band (diff <= -4) is flat 0% — matches "grey = no meaningful XP"
export const XP_MOD: Anchor[] = [
  [-10, 0.0], [-4, 0.0], [-3, 0.7], [-2, 0.85], [-1, 0.95], [0, 1.0],
  [1, 1.1], [2, 1.2], [3, 1.3], [4, 1.4], [5, 1.5],
  [6, 1.6], [7, 1.7], [8, 1.8], [9, 1.9], [10, 2.0],
];

export type MobColorTier = 'grey' | 'green' | 'yellow' | 'orange' | 'red' | 'unknown';

export function mobColorTier(levelDiff: number): MobColorTier {
  if (levelDiff <= -4) return 'grey';
  if (levelDiff <= -1) return 'green';
  if (levelDiff <= 1) return 'yellow';
  if (levelDiff <= 3) return 'orange';
  if (levelDiff <= 5) return 'red';
  return 'unknown';
}

export function playerDamageModifier(levelDiff: number): number {
  return interpTable(PLAYER_DMG_MOD, levelDiff);
}

export function enemyDamageModifier(levelDiff: number): number {
  return interpTable(ENEMY_DMG_MOD, levelDiff);
}

export function xpModifier(levelDiff: number): number {
  return interpTable(XP_MOD, levelDiff);
}

export function accuracy(levelDiff: number): number {
  const acc = 0.95 * (1 - levelDiff * 0.03);
  return Math.max(0.5, Math.min(1.0, acc));
}

export function armorReduction(armor: number): number {
  return armor / (armor + 100);
}

export function maxHp(
  cls: ClassId,
  level: number,
  equipmentBonuses: Partial<Record<BaseStat, number>> = {},
  hpMultPct = 0,
  // Enchanting overhaul's flat Health enchants (Minor/Lesser/.../Ember
  // Health) — a literal flat bonus, not a STA-point conversion (the design
  // brief's given numbers are already scaled against this level-driven
  // baseline), added AFTER the hpMultPct multiplier so it's never itself
  // multiplied by talent/Fortitude-style % bonuses — matching how a flat
  // "+N max HP" effect reads on a real item rather than scaling with build.
  flatHpBonus = 0
): number {
  const sta = statAtLevel(cls, 'STA', level) + (equipmentBonuses.STA ?? 0);
  return (50 + sta * 12 + level * 10) * (1 + hpMultPct / 100) + flatHpBonus;
}

export function baseDamage(cls: ClassId, level: number, equipmentBonuses: Partial<Record<BaseStat, number>> = {}): number {
  const primaryStat = PRIMARY_STAT[cls];
  const primary = statAtLevel(cls, primaryStat, level) + (equipmentBonuses[primaryStat] ?? 0);
  return 10 + primary * 2 + level;
}

// SPI's one job: a flat % more effective healing (every kind — direct heals,
// HOTs, healFrac self-heal, passiveHealPct) per total point (class-baseline
// statAtLevel growth plus equipment), mirroring how STA's one job is +HP and
// STR/INT's is +damage — see maxHp/baseDamage above for the same
// statAtLevel-plus-equipment shape. Added for the Blacksmithing jewelry/
// armor overhaul's INT+SPI gear line — before this, SPI was a stat slot
// with no reader anywhere in the engine, which would have made half that
// gear line's budget inert. Each class's own SPI growth rate (classStats.ts's
// CLASS_GROWTH) already encodes how much a healing-capable spec benefits
// from leveling alone; equipment SPI is the gearing lever on top of that.
export const SPI_HEALING_PCT_PER_POINT = 0.5;

export function healingPowerMultiplier(totalSpi: number): number {
  return 1 + (totalSpi * SPI_HEALING_PCT_PER_POINT) / 100;
}

// AGI's two jobs, added for the Leatherworking overhaul (gameData/
// equipmentRolls.ts's ARMOR_STATS now includes AGI): a flat % crit chance
// and a flat % dodge chance per total point, same statAtLevel-plus-
// equipment shape as SPI's healing multiplier above. CLASS_GROWTH.AGI is 0
// for every class (classStats.ts), so totalAgi is just the universal
// level-1 baseline (5) until a character equips AGI gear — existing combat
// balance is unchanged for anyone without it. Crits apply
// CRIT_DAMAGE_MULTIPLIER bonus damage in combatEngine/engine.ts's
// computeEffectDamage; dodge is a full miss, checked alongside (not
// replacing) the existing accuracy roll.
export const AGI_CRIT_PCT_PER_POINT = 0.15;
export const AGI_DODGE_PCT_PER_POINT = 0.1;
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

export function critChanceFromAgi(totalAgi: number): number {
  return Math.max(0, (totalAgi * AGI_CRIT_PCT_PER_POINT) / 100);
}

export function dodgeChanceFromAgi(totalAgi: number): number {
  return Math.max(0, (totalAgi * AGI_DODGE_PCT_PER_POINT) / 100);
}

// ── Attribute & Specialization Identity overhaul ────────────────────────
// Every formula below is a small ADDITIVE layer on top of the already-live,
// already-calibrated math above (maxHp/baseDamage/healingPowerMultiplier/
// critChanceFromAgi/dodgeChanceFromAgi) rather than a replacement of it —
// see this phase's design notes for why: the live game's HP/mana/damage
// curves are already balanced against real playtesting data the Classic-
// exact source formulas (10 HP/STA, 15 Mana/INT, etc.) were never tuned
// against here, so swapping them out would silently re-balance every
// existing character. Each coefficient here is deliberately small relative
// to its stat's natural growth (classStats.ts's CLASS_GROWTH) so leveling
// alone can't run a derived stat away — see each constant's own comment
// for the specific reasoning.

// INT's second job: a flat % "spell crit" chance per total point, additive
// with AGI's physical crit (critChanceFromAgi) into the SAME CasterProfile.
// critChance field — this engine has no damage-school split on the player
// side (every ability resolves through one computeEffectDamage call), so
// there's no clean way to roll "physical crit" and "spell crit" separately.
// A deliberate, flagged simplification: INT boosts a warrior's physical
// crit by a trivial amount too, since INT grows barely at all for warriors
// (CLASS_GROWTH.STR 0.2/level) — never enough to matter. The rate itself is
// an order of magnitude below AGI_CRIT_PCT_PER_POINT specifically because
// INT, unlike AGI, grows every level from class training alone (CLASS_
// GROWTH), not just from gear — an equal rate would let a caster's crit
// chance run away purely from leveling.
export const INT_SPELL_CRIT_PCT_PER_POINT = 0.02;

export function critChanceFromInt(totalInt: number): number {
  return Math.max(0, (totalInt * INT_SPELL_CRIT_PCT_PER_POINT) / 100);
}

// AGI's third job: a small flat Armor bonus per total point, added on top
// of the existing STA*2*survivabilityCoef formula as a flat addend (same
// posture as flatArmorBonus/the Defense enchant family) rather than a new
// multiplier — armor's own diminishing-returns curve (armorReduction above)
// already keeps a large flat addition from translating into anywhere near
// a proportional mitigation gain.
export const AGI_ARMOR_PER_POINT = 0.5;

export function armorFromAgi(totalAgi: number): number {
  return Math.max(0, totalAgi * AGI_ARMOR_PER_POINT);
}

// SPI's second and third jobs: a flat % bonus to mana regen RATE and
// out-of-combat HP regen RATE per total point — a rate multiplier (not a
// flat amount) so the bonus scales with a character's own current pool
// instead of becoming proportionally smaller at high level, same intent as
// SPI_HEALING_PCT_PER_POINT above.
export const SPI_MANA_REGEN_BONUS_PCT_PER_POINT = 0.3;

export function manaRegenMultiplier(totalSpi: number): number {
  return 1 + (totalSpi * SPI_MANA_REGEN_BONUS_PCT_PER_POINT) / 100;
}

export const SPI_HP_REGEN_BONUS_PCT_PER_POINT = 0.5;

// Shield Block Value — a flat damage-reduction stat for a character with a
// genuine shield equipped (gameData/types.ts's ItemDef.isShield), scaled
// from STR. Deliberately a flat reduction rather than a new RNG block-
// chance roll: a second chance-based mitigation layer would stack with the
// existing dodge/avoidance rolls toward near-immunity for a well-geared
// tank, where a flat value can't (see this phase's design notes). Flows
// into the SAME CasterProfile.flatDamageReduction pipeline the Enchanting
// overhaul's Absorption family already uses (computeEffectDamage sums the
// two) rather than a second parallel reduction step.
export const SHIELD_BLOCK_BASE_VALUE = 5;
export const SHIELD_BLOCK_STR_PER_POINT = 0.2;

export function shieldBlockValue(totalStr: number, hasShield: boolean): number {
  if (!hasShield) return 0;
  return SHIELD_BLOCK_BASE_VALUE + totalStr * SHIELD_BLOCK_STR_PER_POINT;
}

// ── Specialization-identity passives ─────────────────────────────────────
// One small, additive hook per one of the game's 6 current specs (Rogue/
// Druid/Mage/Hunter are architecture-only per the design brief — nothing
// here is keyed to them), each tied to the primary attribute a player
// gearing "for" that spec would naturally stack more of. Coefficients are
// tuned to land roughly a 5-10% edge for an optimized build over a
// suboptimal one (per the design brief's own target, explicitly "not a
// hard cap") rather than a second independent power axis — see engine.ts's
// buildPlayerProfile/buildCompanionProfile for where each is actually
// wired in, and useAbility for Prot Paladin's, the one that needs a
// resolution-time hook rather than a static profile term. Holy Paladin
// deliberately has no stat-passive of its own here — its crit chance
// already comes from the existing AGI/INT crit math as-is, with no
// separate heal-crit mechanic layered on top.
export const WARRIOR_DPS_STR_CRIT_PCT_PER_POINT = 0.02;
export const SHIELD_TANK_SPEC_BLOCK_BONUS_PCT = 50; // warrior_tank / prot_paladin
export const SHADOW_PRIEST_SPI_DAMAGE_PCT_PER_POINT = 0.05;
export const HOLY_PRIEST_SPI_HEALING_BONUS_PCT_PER_POINT = 0.15;
export const PROT_PALADIN_INT_MANA_COST_REDUCTION_PCT_PER_POINT = 0.1;
export const PROT_PALADIN_MANA_COST_REDUCTION_CAP_PCT = 30;

export function monsterArmor(level: number): number {
  return 3 * level;
}

export function monsterBaseDamage(level: number): number {
  return (15 + level * 5) * MONSTER_DAMAGE_SCALE;
}

export function targetTimeToKill(level: number): number {
  return 12 + ((level - 1) * (25 - 12)) / 59;
}

function referencePlayerDps(level: number): number {
  const cls: ClassId = 'warrior';
  const dmg = baseDamage(cls, level);
  const dps = dmg / ATTACK_INTERVAL_SECONDS;
  const acc = accuracy(0);
  const armorMod = 1 - armorReduction(monsterArmor(level));
  return dps * 1.0 * 1.0 * acc * armorMod;
}

const MONSTER_HP_CACHE = new Map<number, number>();
export function monsterHp(level: number): number {
  const cached = MONSTER_HP_CACHE.get(level);
  if (cached !== undefined) return cached;
  const hp = targetTimeToKill(level) * referencePlayerDps(level);
  MONSTER_HP_CACHE.set(level, hp);
  return hp;
}

// ── HP regeneration (out of combat only — no regen during an active combat
// session, per the design decision; each kill within a session compounds
// exposure, and regen only resumes once you stop or are forced to retreat) ──

export const HP_REGEN_PCT_PER_MINUTE = 0.20; // full recovery from near-zero in ~5 minutes

/**
 * Computes current HP right now, given the last known HP/checkpoint and the
 * elapsed time since — same "resolve elapsed time" pattern used everywhere
 * else in this project (gathering, crafting, offline catch-up). Read-only;
 * doesn't write anything, callers decide when to persist the result.
 */
export function resolveCurrentHp(
  storedHp: number,
  maxHpValue: number,
  checkpointAt: Date,
  now: Date,
  // SPI's third job (Attribute/Specialization overhaul) — a flat % bonus to
  // this RATE per total SPI point, same shape as the mana-regen bonus
  // above. Defaults to 0 so every pre-existing call site that hasn't been
  // updated to pass it behaves exactly as before this param existed.
  totalSpi = 0
): number {
  const elapsedMinutes = Math.max(0, (now.getTime() - checkpointAt.getTime()) / 60000);
  const regenRate = HP_REGEN_PCT_PER_MINUTE * (1 + (totalSpi * SPI_HP_REGEN_BONUS_PCT_PER_POINT) / 100);
  const regenAmount = maxHpValue * regenRate * elapsedMinutes;
  return Math.min(maxHpValue, storedHp + regenAmount);
}


export interface CombatProfileInput {
  cls: ClassId;
  spec: SpecId;
  playerLevel: number;
  monsterLevel: number;
}

export interface CombatProfileResult {
  playerMaxHp: number;
  playerDps: number;
  timeToKill: number;
  incomingDps: number;
  healingPerSec: number;
  netHpChangePerSec: number;
  xpPerKill: number;
  levelDiff: number;
  colorTier: MobColorTier;
}

export function computeCombatProfile({
  cls,
  spec,
  playerLevel,
  monsterLevel,
}: CombatProfileInput): CombatProfileResult {
  const specDef = SPECS[spec];
  const levelDiff = monsterLevel - playerLevel;

  const hp = maxHp(cls, playerLevel);
  const dmg = baseDamage(cls, playerLevel);
  const dps = dmg / ATTACK_INTERVAL_SECONDS;

  const lvlMod = playerDamageModifier(levelDiff);
  const acc = accuracy(levelDiff);
  const mArmor = monsterArmor(monsterLevel);
  const armorMod = 1 - armorReduction(mArmor);

  const playerDps = dps * specDef.damageCoef * lvlMod * acc * armorMod;
  const mHp = monsterHp(monsterLevel);
  const timeToKill = playerDps > 0 ? mHp / playerDps : Infinity;

  const mBaseDmg = monsterBaseDamage(monsterLevel);
  const enemyLvlMod = enemyDamageModifier(levelDiff);
  const pArmor = statAtLevel(cls, 'STA', playerLevel) * 2 * specDef.survivabilityCoef;
  const pArmorMod = 1 - armorReduction(pArmor);

  const incomingDmgPerHit = mBaseDmg * enemyLvlMod * pArmorMod * (1 - specDef.avoidance);
  const incomingDps = incomingDmgPerHit / ATTACK_INTERVAL_SECONDS;

  const healingPerSec = playerDps * specDef.healFrac + hp * specDef.passiveHealPct;
  const netHpChangePerSec = incomingDps - healingPerSec;

  const xpPerKill = 50 * monsterLevel * xpModifier(levelDiff);

  return {
    playerMaxHp: hp,
    playerDps,
    timeToKill,
    incomingDps,
    healingPerSec,
    netHpChangePerSec,
    xpPerKill,
    levelDiff,
    colorTier: mobColorTier(levelDiff),
  };
}

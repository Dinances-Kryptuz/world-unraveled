import { CLASS_GROWTH, PRIMARY_STAT, SPECS, statAtLevel, type ClassId, type SpecId } from './classStats';

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

export function maxHp(cls: ClassId, level: number): number {
  const sta = statAtLevel(cls, 'STA', level);
  return 50 + sta * 12 + level * 10;
}

export function baseDamage(cls: ClassId, level: number): number {
  const primary = statAtLevel(cls, PRIMARY_STAT[cls], level);
  return 10 + primary * 2 + level;
}

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

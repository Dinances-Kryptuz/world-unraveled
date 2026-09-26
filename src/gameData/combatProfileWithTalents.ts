import type { ClassId, SpecId, SpecDef, BaseStat } from './classStats';
import { SPECS, statAtLevel } from './classStats';
import {
  ATTACK_INTERVAL_SECONDS,
  playerDamageModifier,
  enemyDamageModifier,
  xpModifier,
  accuracy,
  armorReduction,
  maxHp,
  baseDamage,
  monsterArmor,
  monsterBaseDamage,
  monsterHp,
} from './combatFormulas';
import { WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60, type TalentPicks } from './talents';
import type { TalentBonusTotals } from '../utils/talentEvaluator';

export const PRE_SPEC_DEFAULT: Omit<SpecDef, 'class'> = {
  damageCoef: 0.85,
  survivabilityCoef: 1.0,
  avoidance: 0.05,
  healFrac: 0,
  passiveHealPct: 0,
};

export function resolveSpecDef(cls: ClassId, spec: SpecId | null): SpecDef {
  if (spec) return SPECS[spec];
  return { class: cls, ...PRE_SPEC_DEFAULT };
}

export function getExtraDamageTakenPct(spec: SpecId | null, talentPicks: TalentPicks): number {
  if (spec === 'warrior_dps' && talentPicks[60] === 'damage') {
    return WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60;
  }
  return 0;
}

export interface FullCombatProfile {
  playerMaxHp: number;
  playerDps: number;
  timeToKill: number;
  incomingDps: number;
  healingPerSec: number;
  netHpChangePerSec: number;
  xpPerKill: number;
}

export function computeFullCombatProfile(
  cls: ClassId,
  specDef: SpecDef,
  playerLevel: number,
  monsterLevel: number,
  talentTotals: TalentBonusTotals,
  extraDamageTakenPct: number = 0,
  equipmentBonuses: Partial<Record<BaseStat, number>> = {}
): FullCombatProfile {
  const diff = monsterLevel - playerLevel;

  const hp = maxHp(cls, playerLevel, equipmentBonuses) * (1 + talentTotals.hpMultPct / 100);
  const dmg = baseDamage(cls, playerLevel, equipmentBonuses);
  const dps = dmg / ATTACK_INTERVAL_SECONDS;

  const lvlMod = playerDamageModifier(diff);
  const acc = accuracy(diff);
  const mArmor = monsterArmor(monsterLevel);
  const armorMod = 1 - armorReduction(mArmor);

  const talentDmgMult = 1 + talentTotals.flatDmgPct / 100;
  const playerDps = dps * specDef.damageCoef * lvlMod * acc * armorMod * talentDmgMult;

  const mHp = monsterHp(monsterLevel);
  const timeToKill = playerDps > 0 ? mHp / playerDps : Infinity;

  const mBaseDmg = monsterBaseDamage(monsterLevel);
  const enemyLvlMod = enemyDamageModifier(diff);

  const survCoefFinal = specDef.survivabilityCoef * (1 + talentTotals.survCoefMultPct / 100);
  const effectiveSta = statAtLevel(cls, 'STA', playerLevel) + (equipmentBonuses.STA ?? 0);
  const pArmor = effectiveSta * 2 * survCoefFinal * (1 + talentTotals.armorMultPct / 100);
  const pArmorMod = 1 - armorReduction(pArmor);

  const avoidanceFinal = Math.min(0.75, specDef.avoidance + talentTotals.avoidanceAddPct / 100);
  const talentDmgTakenMult =
    Math.max(0.05, 1 - talentTotals.flatDmgTakenPct / 100) * (1 + extraDamageTakenPct / 100);

  const incomingDmgPerHit = mBaseDmg * enemyLvlMod * pArmorMod * (1 - avoidanceFinal) * talentDmgTakenMult;
  const incomingDps = incomingDmgPerHit / ATTACK_INTERVAL_SECONDS;

  const healFracFinal = (specDef.healFrac + talentTotals.healFracAddPct / 100) * (1 + talentTotals.healMultPct / 100);
  const passiveFinal =
    (specDef.passiveHealPct + talentTotals.passiveHealAddPct / 100) * (1 + talentTotals.healMultPct / 100);

  // SPI scales healing as a ratio to the class's natural (naked) SPI at this
  // level — with no SPI-granting gear, effectiveSpi === baseSpi, so this is
  // always exactly 1.0 and every already-validated Pass 1/Pass 2 result is
  // untouched. Only equipment (or future talents) that actually grant SPI
  // ever move this number.
  const baseSpi = statAtLevel(cls, 'SPI', playerLevel);
  const effectiveSpi = baseSpi + (equipmentBonuses.SPI ?? 0);
  const spiHealMultiplier = baseSpi > 0 ? effectiveSpi / baseSpi : 1;

  const healingPerSec = (playerDps * healFracFinal + hp * passiveFinal) * spiHealMultiplier;

  const netHpChangePerSec = incomingDps - healingPerSec;
  const xpPerKill = 50 * monsterLevel * xpModifier(diff);

  return {
    playerMaxHp: hp,
    playerDps,
    timeToKill,
    incomingDps,
    healingPerSec,
    netHpChangePerSec,
    xpPerKill,
  };
}

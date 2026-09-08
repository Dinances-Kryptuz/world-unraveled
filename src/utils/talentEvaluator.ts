import type { SpecId } from '../gameData/classStats';
import { TALENT_TREES, type TalentColumn, type TalentPicks, type TalentEffect } from '../gameData/talents';

export interface TalentBonusTotals {
  flatDmgPct: number;
  flatDmgTakenPct: number;
  armorMultPct: number;
  hpMultPct: number;
  survCoefMultPct: number;
  avoidanceAddPct: number;
  healFracAddPct: number;
  healMultPct: number;
  passiveHealAddPct: number;
}

export interface QualitativeNote {
  level: number;
  kind: 'once_per_fight' | 'dead';
  note: string;
}

const EMPTY_TOTALS: TalentBonusTotals = {
  flatDmgPct: 0,
  flatDmgTakenPct: 0,
  armorMultPct: 0,
  hpMultPct: 0,
  survCoefMultPct: 0,
  avoidanceAddPct: 0,
  healFracAddPct: 0,
  healMultPct: 0,
  passiveHealAddPct: 0,
};

function applyEffect(totals: TalentBonusTotals, effect: TalentEffect): void {
  const p = effect.params;
  switch (effect.kind) {
    case 'flat_dmg':
      totals.flatDmgPct += p[0];
      break;
    case 'flat_dmg_taken':
      totals.flatDmgTakenPct += p[0];
      break;
    case 'every_n':
      totals.flatDmgPct += p[1] / p[0];
      break;
    case 'chance_mult':
      totals.flatDmgPct += p[0] * p[1];
      break;
    case 'ramp':
      totals.flatDmgPct += p[0] / 2;
      break;
    case 'above_hp':
      totals.flatDmgPct += (p[1] * (100 - p[0])) / 100;
      break;
    case 'below_hp':
      totals.flatDmgPct += (p[1] * p[0]) / 100;
      break;
    case 'self_below_hp_dmg':
      totals.flatDmgPct += (p[1] * p[0]) / 100;
      break;
    case 'self_below_hp_mitigation':
      totals.flatDmgTakenPct += (p[1] * p[0]) / 100;
      break;
    case 'armor_mult':
      totals.armorMultPct += p[0];
      break;
    case 'hp_mult':
      totals.hpMultPct += p[0];
      break;
    case 'surv_coef_mult':
      totals.survCoefMultPct += p[0];
      break;
    case 'avoidance_add':
      totals.avoidanceAddPct += p[0];
      break;
    case 'heal_frac_add':
      totals.healFracAddPct += p[0];
      break;
    case 'heal_mult':
      totals.healMultPct += p[0];
      break;
    case 'passive_heal_add':
      totals.passiveHealAddPct += p[0];
      break;
    case 'once_per_fight':
    case 'dead':
      break;
  }
}

export function evaluateTalents(
  spec: SpecId,
  picks: TalentPicks
): { totals: TalentBonusTotals; notes: QualitativeNote[] } {
  const tree = TALENT_TREES[spec];
  const totals: TalentBonusTotals = { ...EMPTY_TOTALS };
  const notes: QualitativeNote[] = [];

  for (const row of tree) {
    const chosenColumn: TalentColumn | undefined = picks[row.level];
    if (!chosenColumn) continue;
    const option = row[chosenColumn];
    if (option.effect.kind === 'once_per_fight' || option.effect.kind === 'dead') {
      notes.push({ level: row.level, kind: option.effect.kind, note: option.effect.note ?? option.description });
    } else {
      applyEffect(totals, option.effect);
    }
  }

  return { totals, notes };
}

export function unlockedRows(spec: SpecId, characterLevel: number) {
  return TALENT_TREES[spec].filter((row) => row.level <= characterLevel);
}

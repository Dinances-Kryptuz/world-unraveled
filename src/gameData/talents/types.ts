import type { SpecId } from '../classStats';

export type TalentEffectKind =
  | 'flat_dmg'
  | 'flat_dmg_taken'
  | 'every_n'
  | 'chance_mult'
  | 'ramp'
  | 'above_hp'
  | 'below_hp'
  | 'self_below_hp_dmg'
  | 'self_below_hp_mitigation'
  | 'armor_mult'
  | 'hp_mult'
  | 'surv_coef_mult'
  | 'avoidance_add'
  | 'heal_frac_add'
  | 'heal_mult'
  | 'passive_heal_add'
  | 'once_per_fight'
  | 'dead';

export interface TalentEffect {
  kind: TalentEffectKind;
  params: number[];
  note?: string;
}

export type TalentColumn = 'damage' | 'survival' | 'support';

export interface TalentOption {
  name: string;
  description: string;
  effect: TalentEffect;
}

export interface TalentRow {
  level: number;
  damage: TalentOption;
  survival: TalentOption;
  support: TalentOption;
}

export type TalentTree = TalentRow[];

export type TalentPicks = Partial<Record<number, TalentColumn>>;


import type { SpecId } from '../classStats';
import type { TalentTree } from './types';
import { WARRIOR_DPS_TALENTS, WARRIOR_TANK_TALENTS, WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60 } from './warrior';
import { SHADOW_PRIEST_TALENTS, HOLY_PRIEST_TALENTS } from './priest';
import { PROT_PALADIN_TALENTS, HOLY_PALADIN_TALENTS } from './paladin';

export const TALENT_TREES: Record<SpecId, TalentTree> = {
  warrior_dps: WARRIOR_DPS_TALENTS,
  warrior_tank: WARRIOR_TANK_TALENTS,
  shadow_priest: SHADOW_PRIEST_TALENTS,
  holy_priest: HOLY_PRIEST_TALENTS,
  prot_paladin: PROT_PALADIN_TALENTS,
  holy_paladin: HOLY_PALADIN_TALENTS,
  // Mage is companion-only (see classStats.ts) — no player ever picks a
  // talent for it, and companions don't use the talent system at all
  // (combatEngine/engine.ts's createCompanionCombatant has no talent
  // input). Empty rather than omitted so this map stays a true Record over
  // every SpecId.
  mage_fire: [],
  mage_frost: [],
};

export { WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60 };

export * from './types';

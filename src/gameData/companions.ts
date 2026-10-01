import type { ClassId, SpecDef, SpecId } from './classStats';
import { SPECS } from './classStats';
import type { BaseStat } from './classStats';
import type { EquipmentSlot } from './types';
import { getEquipmentStatBonuses } from './equipmentStats';
import type { Character } from '../types/character';

// A companion is a second, AI-controlled party member: its own class/fixed
// spec/level (always matches the player's level — see
// resolveActiveCompanionSetup below, no separate XP grind to keep this a
// true V1), geared from the SAME shared inventory the player equips from
// (see firebase/companions.ts's equipCompanionItem). It fights with its
// class's existing ability roster via the exact same priority-walk engine
// the player uses (combatEngine/progression.ts's effectiveLoadout with an
// empty saved choice, which already falls back to a sensible default) —
// no separate "companion AI" system needed, no companion-specific talents
// or ability customization (that's the scope this V1 deliberately cuts;
// see the PR description for the full list of assumptions).
export interface CompanionDef {
  id: string;
  name: string;
  class: ClassId;
  specId: SpecId;
  description: string;
  recruitZoneId: string;
  recruitGoldCost: number;
  requiredCharacterLevel: number;
}

export const COMPANIONS: Record<string, CompanionDef> = {
  wren_the_squire: {
    id: 'wren_the_squire',
    name: 'Wren the Squire',
    class: 'warrior',
    specId: 'warrior_dps',
    description:
      'A scrappy farmhand turned sellsword, looking for someone to swing a blade alongside. Fights for straight damage.',
    recruitZoneId: 'greenhollow_fields',
    recruitGoldCost: 25,
    requiredCharacterLevel: 3,
  },
  sister_mabel: {
    id: 'sister_mabel',
    name: 'Sister Mabel',
    class: 'priest',
    specId: 'holy_priest',
    description:
      'A wandering healer who tends the wounded along the foothill trails. Keeps you topped up instead of dealing damage herself.',
    recruitZoneId: 'stonecrag_foothills',
    recruitGoldCost: 75,
    requiredCharacterLevel: 10,
  },
  ser_aldric: {
    id: 'ser_aldric',
    name: 'Ser Aldric',
    class: 'paladin',
    specId: 'prot_paladin',
    description:
      'A disgraced knight working off an old debt on the Ridge. Soaks up punishment rather than dishing it out.',
    recruitZoneId: 'emberfall_ridge',
    recruitGoldCost: 200,
    requiredCharacterLevel: 25,
  },
};

export function companionsInZone(zoneId: string): CompanionDef[] {
  return Object.values(COMPANIONS).filter((c) => c.recruitZoneId === zoneId);
}

export interface RecruitCompanionCheck {
  ok: boolean;
  reason?: string;
  goldCost: number;
}

export function checkRecruitCompanion(
  companionId: string,
  alreadyRecruited: string[],
  characterLevel: number,
  gold: number
): RecruitCompanionCheck {
  const def = COMPANIONS[companionId];
  if (!def) return { ok: false, reason: 'Unknown companion.', goldCost: 0 };
  if (alreadyRecruited.includes(companionId)) {
    return { ok: false, reason: 'Already recruited.', goldCost: def.recruitGoldCost };
  }
  if (characterLevel < def.requiredCharacterLevel) {
    return { ok: false, reason: `Requires character level ${def.requiredCharacterLevel}.`, goldCost: def.recruitGoldCost };
  }
  if (gold < def.recruitGoldCost) {
    return { ok: false, reason: `Requires ${def.recruitGoldCost} gold.`, goldCost: def.recruitGoldCost };
  }
  return { ok: true, goldCost: def.recruitGoldCost };
}

export function emptyCompanionEquipment(): Record<EquipmentSlot, string | null> {
  return { weapon: null, chest: null, helmet: null, gloves: null, legs: null, boots: null, ring: null, tool: null };
}

// The shape combatEngine/engine.ts's EncounterSetupInput.companion expects —
// deliberately duck-typed rather than importing from combatEngine here
// (gameData has no dependency on combatEngine anywhere else in the
// codebase; combatEngine depends on gameData, never the reverse, same
// convention as gameData/buffs.ts's BuffTotals).
export interface CompanionCombatSetup {
  id: string;
  name: string;
  cls: ClassId;
  specId: SpecId;
  specDef: SpecDef;
  level: number;
  equipmentBonuses: Partial<Record<BaseStat, number>>;
}

// Builds the live combat setup for whichever companion is currently active,
// or undefined if none is recruited/active — callers (CombatScreen/
// DungeonScreen/WelcomeBackScreen/offlineCombat) just spread this straight
// into EncounterSetupInput.companion, same pattern as evaluateActiveBuffs.
export function resolveActiveCompanionSetup(character: Character): CompanionCombatSetup | undefined {
  const activeId = character.activeCompanionId;
  if (!activeId) return undefined;
  const state = character.companions[activeId];
  const def = COMPANIONS[activeId];
  if (!state || !def) return undefined;
  return {
    id: activeId,
    name: def.name,
    cls: def.class,
    specId: def.specId,
    specDef: SPECS[def.specId],
    level: character.level,
    equipmentBonuses: getEquipmentStatBonuses(state.equipment),
  };
}

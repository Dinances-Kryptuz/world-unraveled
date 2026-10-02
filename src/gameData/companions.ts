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

// Up to this many companions can fight alongside the player at once — the
// 4 "party slots" that, with the player, make a full 5-person group. A
// dungeon requires exactly this many active to enter at all (see
// REQUIRED_DUNGEON_PARTY_SIZE and DungeonScreen.tsx); open-world combat
// allows any number from 0 up to this.
export const MAX_ACTIVE_COMPANIONS = 4;

// Player + MAX_ACTIVE_COMPANIONS — the fixed group size a dungeon expects.
// Deliberately not just "4 companions" inline everywhere so the one place
// that means "the whole group" reads as that, not as an unexplained +1.
export const REQUIRED_DUNGEON_PARTY_SIZE = MAX_ACTIVE_COMPANIONS + 1;

// One companion per spec (all 6 — see classStats.ts's SpecId) so a player
// can freely build any class/spec composition for their 4 active slots
// (a second tank, three healers, whatever) rather than being steered
// toward "the optimal" 1 tank/1 healer/3 DPS mix. All six are recruitable
// within the first two zones specifically so a brand-new player can
// assemble a full dungeon group before reaching Greenhollow's own dungeon
// (Kobold Warrens) — a dungeon simply isn't enterable without one (see
// REQUIRED_DUNGEON_PARTY_SIZE), so the roster has to be available early,
// even though that means Ser Aldric (originally an Emberfall Ridge, level
// 25 recruit) moved down to Stonecrag Foothills at level 12.
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
  borin_ironhide: {
    id: 'borin_ironhide',
    name: 'Borin Ironhide',
    class: 'warrior',
    specId: 'warrior_tank',
    description:
      'A retired caravan guard who still knows how to plant his feet and take a hit. Draws attacks away from the rest of the group.',
    recruitZoneId: 'greenhollow_fields',
    recruitGoldCost: 40,
    requiredCharacterLevel: 5,
  },
  vesper_duskwhisper: {
    id: 'vesper_duskwhisper',
    name: 'Vesper Duskwhisper',
    class: 'priest',
    specId: 'shadow_priest',
    description:
      'A hedge-priest who found the shadow between the prayers more interesting than the prayers themselves. Fights for damage, not healing.',
    recruitZoneId: 'greenhollow_fields',
    recruitGoldCost: 40,
    requiredCharacterLevel: 5,
  },
  sister_mabel: {
    id: 'sister_mabel',
    name: 'Sister Mabel',
    class: 'priest',
    specId: 'holy_priest',
    description:
      'A wandering healer who tends the wounded along the foothill trails. Keeps the group topped up instead of dealing damage herself.',
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
      'A disgraced knight working off an old debt in the foothills. Soaks up punishment rather than dishing it out.',
    recruitZoneId: 'stonecrag_foothills',
    recruitGoldCost: 90,
    requiredCharacterLevel: 12,
  },
  dame_rosalind: {
    id: 'dame_rosalind',
    name: 'Dame Rosalind',
    class: 'paladin',
    specId: 'holy_paladin',
    description:
      'A traveling knight-healer who took her vows seriously enough to mean them. A second, sturdier kind of support for the group.',
    recruitZoneId: 'stonecrag_foothills',
    recruitGoldCost: 90,
    requiredCharacterLevel: 12,
  },
  // Mage is a preview of a future expansion — not a playable class yet
  // (see classStats.ts), but its two companions are real, functional party
  // members today. Placed a tier later than the core six and zone-themed
  // (frost in the cold foothills, fire on the volcanic ridge) so finding
  // them feels like stumbling onto something ahead of its time rather than
  // just more of the same roster.
  thessaly_frostbind: {
    id: 'thessaly_frostbind',
    name: 'Thessaly Frostbind',
    class: 'mage',
    specId: 'mage_frost',
    description:
      'A hedge-wizard practicing a discipline no hall has formally taught yet. Wears the enemy down with cold that lingers.',
    recruitZoneId: 'stonecrag_foothills',
    recruitGoldCost: 100,
    requiredCharacterLevel: 15,
  },
  pyra_emberwild: {
    id: 'pyra_emberwild',
    name: 'Pyra Emberwild',
    class: 'mage',
    specId: 'mage_fire',
    description:
      'A fire-touched researcher drawn to the ridge by the heat itself. Burns down a single target fast and hard.',
    recruitZoneId: 'emberfall_ridge',
    recruitGoldCost: 150,
    requiredCharacterLevel: 25,
  },
};

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

// The shape combatEngine/engine.ts's EncounterSetupInput.companions expects —
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

// Builds the live combat setup for every currently-active companion (0 to
// MAX_ACTIVE_COMPANIONS) — callers (CombatScreen/DungeonScreen/
// WelcomeBackScreen/offlineCombat) just spread this straight into
// EncounterSetupInput.companions, same pattern as evaluateActiveBuffs. An id
// in activeCompanionIds that somehow isn't recruited (shouldn't happen —
// firebase/companions.ts validates on every write) is silently skipped
// rather than thrown on, same "tolerate, don't crash" posture the rest of
// this file takes.
export function resolveActiveCompanionSetups(character: Character): CompanionCombatSetup[] {
  const setups: CompanionCombatSetup[] = [];
  for (const activeId of character.activeCompanionIds) {
    const state = character.companions[activeId];
    const def = COMPANIONS[activeId];
    if (!state || !def) continue;
    setups.push({
      id: activeId,
      name: def.name,
      cls: def.class,
      specId: def.specId,
      specDef: SPECS[def.specId],
      level: character.level,
      equipmentBonuses: getEquipmentStatBonuses(state.equipment),
    });
  }
  return setups;
}

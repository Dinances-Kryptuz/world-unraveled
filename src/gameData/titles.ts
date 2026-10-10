import { MATERIALS, LEATHER_MATERIALS } from './materials';
import { ZONES } from './zones';

// A player-selectable cosmetic title — purely display, no stat/combat/
// crafting effect (see types/character.ts's equippedTitleId doc comment).
// Every entry here has a matching AchievementDef id in achievements.ts
// (same id, reused directly — the simplest possible 1:1 correspondence),
// so a title unlocks at exactly the moment its achievement does.
export interface TitleDef {
  id: string;
  name: string;
}

// One "Master of {name}" title per registered material — fully data-driven,
// mirroring achievements.ts's generateMasteryAchievements() exactly (same
// id, same name). A future material only needs registering in
// gameData/materials.ts's MATERIALS to get its own title automatically.
function generateMaterialTitles(): TitleDef[] {
  return MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
  }));
}

// Same pattern, mirroring achievements.ts's generateLeatherMasteryAchievements
// exactly, over LEATHER_MATERIALS instead of MATERIALS.
function generateLeatherMaterialTitles(): TitleDef[] {
  return LEATHER_MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
  }));
}

// Same pattern, mirroring achievements.ts's generateForagerAchievements/
// generateAlchemistAchievements (same ids, same names) over the real ZONES
// registry — a future zone only needs registering in gameData/zones.ts to
// get its own Forager/Alchemist title automatically.
function generateForagerTitles(): TitleDef[] {
  return Object.values(ZONES).map((zone) => ({ id: `forager_${zone.id}`, name: `Master Forager of ${zone.name}` }));
}

function generateAlchemistTitles(): TitleDef[] {
  return Object.values(ZONES).map((zone) => ({ id: `alchemist_${zone.id}`, name: `Master Alchemist of ${zone.name}` }));
}

export const TITLES: TitleDef[] = [
  ...generateMaterialTitles(),
  { id: 'master_blacksmith', name: 'Master Blacksmith' },
  ...generateLeatherMaterialTitles(),
  { id: 'master_leatherworker', name: 'Master Leatherworker' },
  ...generateForagerTitles(),
  { id: 'grandmaster_forager', name: 'Grandmaster Forager' },
  ...generateAlchemistTitles(),
  { id: 'grandmaster_alchemist', name: 'Grandmaster Alchemist' },
];

const TITLES_BY_ID: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

export function getTitle(titleId: string): TitleDef | undefined {
  return TITLES_BY_ID[titleId];
}

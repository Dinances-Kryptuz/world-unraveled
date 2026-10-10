import { MATERIALS } from './materials';

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

export const TITLES: TitleDef[] = [
  ...generateMaterialTitles(),
  { id: 'master_blacksmith', name: 'Master Blacksmith' },
];

const TITLES_BY_ID: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

export function getTitle(titleId: string): TitleDef | undefined {
  return TITLES_BY_ID[titleId];
}

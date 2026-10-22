import { MATERIALS, LEATHER_MATERIALS, CLOTH_MATERIALS, WOOD_MATERIALS } from './materials';
import { ZONES, CONTENT_ZONE_IDS } from './zones';
import { TOWER_MILESTONE_FLOORS } from './towerLoot';
import { ALL_PROFESSION_IDS, PROFESSION_LABELS } from './professionTiers';

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

// Same pattern, mirroring achievements.ts's generateClothMasteryAchievements
// exactly, over CLOTH_MATERIALS instead of LEATHER_MATERIALS.
function generateClothMaterialTitles(): TitleDef[] {
  return CLOTH_MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
  }));
}

// Same pattern, mirroring achievements.ts's generateWoodMasteryAchievements
// exactly, over WOOD_MATERIALS instead of CLOTH_MATERIALS.
function generateWoodMaterialTitles(): TitleDef[] {
  return WOOD_MATERIALS.map((material) => ({
    id: `mastery_${material.id}`,
    name: `Master of ${material.name}`,
  }));
}

// Same pattern, mirroring achievements.ts's generateForagerAchievements/
// generateAlchemistAchievements (same ids, same names) over CONTENT_ZONE_IDS
// — a future content zone only needs registering there to get its own
// Forager/Alchemist title automatically. Iterates CONTENT_ZONE_IDS, not
// every zone in ZONES — Ashenfall (the capital hub) has no matching
// achievement generated for it (see achievements.ts), so a title entry for
// it here would be permanently unearnable dead data.
function generateForagerTitles(): TitleDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({ id: `forager_${zone.id}`, name: `Master Forager of ${zone.name}` }));
}

function generateAnglerTitles(): TitleDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({ id: `angler_${zone.id}`, name: `Master Angler of ${zone.name}` }));
}

function generateAlchemistTitles(): TitleDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({ id: `alchemist_${zone.id}`, name: `Master Alchemist of ${zone.name}` }));
}

// Enchanting overhaul's Phase E7 scroll-crafting zone-Mastery — mirrors
// achievements.ts's generateEnchanterAchievements exactly (same ids, same
// names), distinct from 'master_enchanter_armaments' above (the combined
// Wand/Staff/Book equipment track).
function generateEnchanterTitles(): TitleDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({ id: `enchanter_${zone.id}`, name: `Master Enchanter of ${zone.name}` }));
}

// Cooking overhaul — mirrors achievements.ts's generateChefAchievements
// exactly (same ids, same names).
function generateChefTitles(): TitleDef[] {
  return CONTENT_ZONE_IDS.map((zoneId) => ZONES[zoneId]).map((zone) => ({ id: `chef_${zone.id}`, name: `Master Chef of ${zone.name}` }));
}

// Mirrors achievements.ts's generateTowerAchievements exactly (same ids,
// same names) over TOWER_MILESTONE_FLOORS instead of ZONES.
function generateTowerTitles(): TitleDef[] {
  return TOWER_MILESTONE_FLOORS.map((floor) => ({ id: `tower_floor_${floor}`, name: `Floor ${floor} Conqueror` }));
}

// Mirrors achievements.ts's generateProfessionLevelAchievements exactly
// (same ids, same names) — one title per profession per 25/50/75/100
// milestone on the shared 1-100 level scale.
const PROFESSION_MILESTONE_LEVELS = [25, 50, 75, 100] as const;

function generateProfessionLevelTitles(): TitleDef[] {
  return ALL_PROFESSION_IDS.flatMap((professionId) =>
    PROFESSION_MILESTONE_LEVELS.map((level) => ({
      id: `level_${level}_${professionId}`,
      name: level === 100 ? `Master ${PROFESSION_LABELS[professionId]}` : `${PROFESSION_LABELS[professionId]} ${level}`,
    }))
  );
}

export const TITLES: TitleDef[] = [
  ...generateMaterialTitles(),
  { id: 'master_blacksmith', name: 'Master Blacksmith' },
  ...generateLeatherMaterialTitles(),
  { id: 'master_leatherworker', name: 'Master Leatherworker' },
  ...generateClothMaterialTitles(),
  { id: 'master_tailor', name: 'Master Tailor' },
  ...generateWoodMaterialTitles(),
  { id: 'master_enchanter_armaments', name: 'Master of Armaments' },
  ...generateForagerTitles(),
  { id: 'grandmaster_forager', name: 'Grandmaster Forager' },
  ...generateAnglerTitles(),
  { id: 'grandmaster_angler', name: 'Grandmaster Angler' },
  ...generateAlchemistTitles(),
  { id: 'grandmaster_alchemist', name: 'Grandmaster Alchemist' },
  ...generateEnchanterTitles(),
  { id: 'grandmaster_enchanter', name: 'Grandmaster Enchanter' },
  ...generateChefTitles(),
  { id: 'grandmaster_chef', name: 'Grandmaster Chef' },
  ...generateTowerTitles(),
  ...generateProfessionLevelTitles(),
  // Mirrors achievements.ts's CITADEL_LEVEL_ACHIEVEMENTS exactly (same ids).
  { id: 'citadel_level_1_cleared', name: 'Into the Citadel' },
  { id: 'citadel_level_2_cleared', name: 'Cultist Hunter' },
  { id: 'citadel_level_3_cleared', name: 'Firelord\'s Bane' },
  { id: 'citadel_full_cleared', name: 'Unbroken' },
  // Guild Restoration projects (Capital City Phase 5) — awarded to every
  // CURRENT guild member the moment their guild completes the matching
  // project (functions/src/guildHeadquarters.ts), via the exact same
  // unlockedTitleIds mechanism as every other title above. Cosmetic only.
  { id: 'patron_of_ashenfall', name: 'Patron of Ashenfall' },
  { id: 'banner_bearer', name: 'Banner Bearer' },
  { id: 'keeper_of_lore', name: 'Keeper of Lore' },
  { id: 'vanguard_of_ashenfall', name: 'Vanguard of Ashenfall' },
  { id: 'beacon_of_the_guild', name: 'Beacon of the Guild' },
];

const TITLES_BY_ID: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

export function getTitle(titleId: string): TitleDef | undefined {
  return TITLES_BY_ID[titleId];
}

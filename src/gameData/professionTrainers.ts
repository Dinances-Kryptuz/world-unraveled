import type { ProfessionId, ProfessionTierName } from './types';
import { ALL_PROFESSION_IDS, PROFESSION_CATEGORY } from './professionTiers';

// Per the design brief's zone progression: Zone 1 (Greenhollow Fields) has
// Apprentice trainers for every profession, Zone 2 (Stonecrag Foothills)
// Journeyman, Zone 3 (Emberfall Ridge) Expert, Zone 4 (Cinderfall Depths)
// Artisan, Zone 6 (Cinderheart Crater) Master — the final rank lives in the
// final zone. Zone 5 gets recipe vendors/profession quest chains instead of
// a trainer (see vendors.ts and professionQuests.ts). Master only applies to
// the 4 gathering/fishing professions (the 6 crafting professions top out at
// Artisan — see the filter below), generated from ALL_PROFESSION_IDS rather
// than listed by hand so a new profession automatically gets a trainer in
// every zone its own rank table reaches.
export interface ProfessionTrainerDef {
  zoneId: string;
  profession: ProfessionId;
  rank: ProfessionTierName;
}

const TRAINER_ZONE_BY_RANK: Record<ProfessionTierName, string> = {
  apprentice: 'greenhollow_fields',
  journeyman: 'stonecrag_foothills',
  expert: 'emberfall_ridge',
  artisan: 'cinderfall_depths',
  master: 'cinderheart_crater',
};

export const PROFESSION_TRAINERS: ProfessionTrainerDef[] = (
  Object.keys(TRAINER_ZONE_BY_RANK) as ProfessionTierName[]
).flatMap((rank) =>
  ALL_PROFESSION_IDS.filter((profession) => rank !== 'master' || PROFESSION_CATEGORY[profession] !== 'production').map(
    (profession) => ({ zoneId: TRAINER_ZONE_BY_RANK[rank], profession, rank })
  )
);

export function trainersInZone(zoneId: string): ProfessionTrainerDef[] {
  return PROFESSION_TRAINERS.filter((t) => t.zoneId === zoneId);
}

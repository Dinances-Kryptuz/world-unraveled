import type { ProfessionId, ProfessionTierName } from './types';
import { ALL_PROFESSION_IDS } from './professionTiers';

// Per the design brief's zone progression: Zone 1 (Greenhollow Fields) has
// Apprentice trainers for every profession, Zone 2 (Stonecrag Foothills)
// Journeyman, Zone 3 (Emberfall Ridge) Expert, Zone 4 (Cinderfall Depths)
// Artisan. Zones 5-6 get recipe vendors/profession quest chains instead of
// more trainers (see vendors.ts and professionQuests.ts). Generated from
// ALL_PROFESSION_IDS rather than listed by hand so a new profession
// automatically gets a trainer in all 4 zones.
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
};

export const PROFESSION_TRAINERS: ProfessionTrainerDef[] = (
  Object.keys(TRAINER_ZONE_BY_RANK) as ProfessionTierName[]
).flatMap((rank) => ALL_PROFESSION_IDS.map((profession) => ({ zoneId: TRAINER_ZONE_BY_RANK[rank], profession, rank })));

export function trainersInZone(zoneId: string): ProfessionTrainerDef[] {
  return PROFESSION_TRAINERS.filter((t) => t.zoneId === zoneId);
}

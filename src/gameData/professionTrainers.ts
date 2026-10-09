import type { ProfessionTierName } from './types';

// Per the design brief's zone progression: Zone 1 (Greenhollow Fields) has
// Apprentice trainers for every profession, Zone 2 (Stonecrag Foothills)
// Journeyman, Zone 3 (Emberfall Ridge) Expert, Zone 4 (Cinderfall Depths)
// Artisan, Zone 6 (Cinderheart Crater) Master — the final rank lives in the
// final zone. Zone 5 gets recipe vendors/profession quest chains instead of
// a trainer (see vendors.ts and professionQuests.ts). All 10 professions now
// share the same 1-100/5-rank table (professionTiers.ts's PROFESSION_TIERS)
// and so all reach Master. Used both to server-validate learnProfession/
// advanceProfessionRank (firebase/professions.ts — a player must actually be
// standing in the right zone to train) and to display it on the Professions
// Trainer screen regardless of current zone (ProfessionTrainerList.tsx,
// same "see the whole roadmap" shape as MountTrainerScreen).
export const TRAINER_ZONE_BY_RANK: Record<ProfessionTierName, string> = {
  apprentice: 'greenhollow_fields',
  journeyman: 'stonecrag_foothills',
  expert: 'emberfall_ridge',
  artisan: 'cinderfall_depths',
  master: 'cinderheart_crater',
};

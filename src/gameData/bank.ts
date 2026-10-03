// Pure bank-capacity math — no Firestore here, same split as
// professionTiers.ts (gating logic) vs firebase/professions.ts (the writer).
export const BASE_BANK_SLOTS = 4;
export const MAX_BANK_SLOTS = 124;

// Exponential growth: cheap for the first several slots, a real late-game
// gold sink by the time you're buying the last few of 124. 1.08^120 (the
// last slot) is roughly 6,700x the base cost.
const BANK_SLOT_BASE_COST = 50;
const BANK_SLOT_GROWTH = 1.08;

export function nextBankSlotCost(currentSlots: number): number {
  return Math.round(BANK_SLOT_BASE_COST * Math.pow(BANK_SLOT_GROWTH, currentSlots - BASE_BANK_SLOTS));
}

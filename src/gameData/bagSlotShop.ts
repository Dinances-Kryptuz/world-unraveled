import { ZONE_TIER, ZONES, isZoneUnlocked } from './zones';

// The Shopkeeper's bag-slot purchase — a separate gold sink from Tailoring's
// bagCapacityBonus bags (firebase/consumables.ts) and from bankSlots'
// identical-shape purchase (gameData/bank.ts's nextBankSlotCost, the pattern
// this mirrors). Capped at 8 slots per real leveling zone the character has
// unlocked (ZONE_TIER's 6 zones — not Ashenfall, which is always unlocked
// and therefore wouldn't gate anything).
export const SHOPKEEPER_SLOTS_PER_ZONE = 8;

// Exponential growth, same shape as nextBankSlotCost but steeper — there are
// only 48 of these to ever buy (vs. bank's 120), so the curve needs to ramp
// up faster to still land as a real late-game sink by the last one.
const SHOPKEEPER_SLOT_BASE_COST = 200;
const SHOPKEEPER_SLOT_GROWTH = 1.15;

// How many bag slots the Shopkeeper will ever sell this character, given
// how many of the 6 real leveling zones their level has unlocked.
export function shopkeeperMaxBagSlots(characterLevel: number): number {
  let unlockedZones = 0;
  for (const zoneId of Object.keys(ZONE_TIER)) {
    if (isZoneUnlocked(ZONES[zoneId], characterLevel)) unlockedZones++;
  }
  return unlockedZones * SHOPKEEPER_SLOTS_PER_ZONE;
}

// Cost of the NEXT slot, given how many the character has already bought
// from the Shopkeeper (not counting Tailoring-bag-granted slots, which don't
// count against this cap or curve).
export function nextShopkeeperSlotCost(purchasedCount: number): number {
  return Math.round(SHOPKEEPER_SLOT_BASE_COST * Math.pow(SHOPKEEPER_SLOT_GROWTH, purchasedCount));
}

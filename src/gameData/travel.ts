import { ZONE_TIER } from './zones';

// 2 minutes per zone-tier step apart — adjacent zones (tier 1 to tier 2) are
// a 2-minute flight, the two ends of the game (tier 1 to tier 6) are 10
// minutes. A mount (gameData/mounts.ts) discounts this via speedBonusPct
// below rather than replacing the formula.
export const FLIGHT_MINUTES_PER_TIER = 2;

// speedBonusPct comes from gameData/mounts.ts's bestMountSpeedBonusPct — 0
// for a mountless character (the default), up to a mount's own
// speedBonusPct for one who owns a mount. 50 means "flights take half as
// long."
export function travelMinutes(fromZoneId: string, toZoneId: string, speedBonusPct = 0): number {
  const fromTier = ZONE_TIER[fromZoneId] ?? 1;
  const toTier = ZONE_TIER[toZoneId] ?? 1;
  const baseMinutes = FLIGHT_MINUTES_PER_TIER * Math.abs(toTier - fromTier);
  return Math.round(baseMinutes * (1 - speedBonusPct / 100));
}

// Null means "not currently traveling" — same convention as
// Character.currentActivity.type. Unlike currentActivity, travel has no
// offline-catchup math to resolve (no xp/gold accrues in transit); arrival
// is just "has arrivesAt passed," resolved lazily wherever the character is
// read (see firebase/character.ts's getCharacter).
export interface TravelState {
  fromZoneId: string;
  toZoneId: string;
  departedAt: Date;
  arrivesAt: Date;
}

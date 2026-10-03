import { ZONE_TIER } from './zones';

// 2 minutes per zone-tier step apart — adjacent zones (tier 1 to tier 2) are
// a 2-minute flight, the two ends of the game (tier 1 to tier 6) are 10
// minutes. A future "pay gold to cut flight time" / instant-teleport
// purchase (explicitly scoped OUT of this pass) will discount this number,
// not replace the formula.
export const FLIGHT_MINUTES_PER_TIER = 2;

export function travelMinutes(fromZoneId: string, toZoneId: string): number {
  const fromTier = ZONE_TIER[fromZoneId] ?? 1;
  const toTier = ZONE_TIER[toZoneId] ?? 1;
  return FLIGHT_MINUTES_PER_TIER * Math.abs(toTier - fromTier);
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

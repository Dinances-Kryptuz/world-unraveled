// Flat 5 minutes to ANY other zone, regardless of how many tiers apart it
// is — deliberately not distance-scaled. A per-tier formula (the original
// 2min/tier) is actually exploitable once mounts are in the picture: each
// individual hop's time is rounded (see the old Math.round below), so a
// short adjacent-zone hop can round all the way down to 0 minutes at a high
// mount speed bonus while a long direct flight covering the same total
// distance still rounds up to something nonzero — making "hop through every
// zone in between" strictly faster than flying there directly, which makes
// no sense and trivializes the whole system. A flat base has no such
// exploit: every flight, direct or chained, costs the same base time, so
// chaining through intermediate zones can only ever be slower (each extra
// hop adds another full flight), never faster.
export const FLIGHT_MINUTES_FLAT = 5;

// speedBonusPct comes from gameData/mounts.ts's bestMountSpeedBonusPct — 0
// for a mountless character (the default), up to a mount's own
// speedBonusPct for one who owns a mount. 50 means "flights take half as
// long."
export function travelMinutes(speedBonusPct = 0): number {
  return Math.round(FLIGHT_MINUTES_FLAT * (1 - speedBonusPct / 100));
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

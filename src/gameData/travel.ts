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

// Ashenfall is the capital — the hub every other zone's flight routes
// through — and Greenhollow Fields is the one zone every character starts
// standing in. Treating that one pair as a free, instant hop (both
// directions, no mount needed) means a brand-new character is never stuck
// waiting out a 5-minute flight just to reach the capital for the first
// time, while every other zone-to-zone flight keeps the flat 5-minute base
// untouched.
function isFreeAshenfallHop(fromZoneId?: string, toZoneId?: string): boolean {
  if (!fromZoneId || !toZoneId) return false;
  return (
    (fromZoneId === 'ashenfall' && toZoneId === 'greenhollow_fields') ||
    (fromZoneId === 'greenhollow_fields' && toZoneId === 'ashenfall')
  );
}

// speedBonusPct comes from gameData/mounts.ts's bestMountSpeedBonusPct — 0
// for a mountless character (the default), up to a mount's own
// speedBonusPct for one who owns a mount. 50 means "flights take half as
// long."
//
// The real, authoritative flight duration — computed in whole SECONDS, not
// minutes. Rounding to the nearest whole minute at this 5-minute base
// silently erases two of the five mount ranks: Apprentice (10% cut, 4.5min)
// rounds right back to the same 5 minutes as no mount at all, and Expert
// (30% cut, 3.5min) rounds to the same 4 minutes as Journeyman (20%) — a
// real bug found by live-checking the mount trainer, not just a display
// nit, since firebase/travel.ts's arrivesAt is computed straight from this
// value. Seconds give 300 distinct values instead of 5, so none of the six
// speedBonusPct tiers (0/10/20/30/60/80) can ever land on the same number.
//
// fromZoneId/toZoneId are optional so every existing caller that only cares
// about the generic flat-5-minute case (the mount trainer's own preview,
// for instance, which has no particular destination in mind) keeps working
// unchanged — only a caller that actually knows both ends of the flight
// can get the Ashenfall<->Greenhollow Fields exception.
export function travelSeconds(speedBonusPct = 0, fromZoneId?: string, toZoneId?: string): number {
  if (isFreeAshenfallHop(fromZoneId, toZoneId)) return 0;
  return Math.round(FLIGHT_MINUTES_FLAT * 60 * (1 - speedBonusPct / 100));
}

// Display-only formatter for the zone-tab "(Xm)" label — one decimal place
// when the duration isn't a whole number of minutes, so the label itself
// visibly changes between every mount rank instead of re-rounding
// travelSeconds back into the same collision this function replaced.
export function formatTravelMinutes(speedBonusPct = 0, fromZoneId?: string, toZoneId?: string): string {
  const minutes = travelSeconds(speedBonusPct, fromZoneId, toZoneId) / 60;
  return Number.isInteger(minutes) ? `${minutes}` : minutes.toFixed(1);
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

// The single elapsed-time resolver shared by every activity — combat (still
// live here), and gatheringEngine.ts/craftingEngine.ts's own resolvers for
// every gathering and crafting profession (both import resolveElapsedProgress
// from this file rather than duplicating it). Offline progress is worth
// exactly as much as live progress,
// per real hour — no throttle, no diminishing-returns tier — up to a flat
// 24-hour cap; time away beyond that cap is simply not credited at all
// (not even at a reduced rate). This replaced an earlier two-regime model
// (live at full rate, offline compressed by a ~38-45x throttle) that made
// offline progress nearly worthless — a 24-hour absence credited only
// around half an hour of live-equivalent progress, which didn't fit this
// being an idle game players check in on rather than leave a tab open in
// 24/7. There is still no stored "online/offline" flag anywhere — this
// resolver only ever looks at the SIZE of the elapsed gap since
// activityStartedAt, it just no longer treats a long gap any differently
// from a short one except for the cap.
//
// The single autosave cadence for every live activity screen (combat,
// gathering, crafting, fishing) — used to live as four separately-declared
// copies of the same constant, one per screen, which is exactly how it
// drifted out of sync with LIVE_SESSION_THRESHOLD_SECONDS below once before
// (see that constant's comment). One shared constant now, so changing the
// save cadence can never again silently invalidate the threshold tuned
// against it. Doubled from the original 10s specifically to cut Firestore
// read/write volume roughly in half for alpha testing on the free Spark
// plan's daily quota — purely a persistence-cadence change, invisible in
// play since every screen's "this session" numbers already interpolate
// smoothly between saves via their own sinceLastSave math.
export const AUTOSAVE_INTERVAL_SECONDS = 20;

// LIVE_SESSION_THRESHOLD_SECONDS no longer affects any rate — it's kept
// only for WelcomeBackScreen's "were you away long enough to show a
// summary" check, a UI question, not a math one. For combat specifically,
// this threshold used to be load-bearing by accident: the offline-combat
// simulation only ever runs inside WelcomeBackScreen, so a gap under this
// threshold got literally zero catch-up (CombatScreen just starts a fresh
// encounter on mount) rather than a reduced one — gathering/crafting/
// fishing don't have this problem since their resolvers always recompute
// from the activity's true startedAt regardless of gap length. Kept low
// (rather than removed) now that combat stays mounted and ticking through
// in-app navigation (see App.tsx's activityNode) — CombatScreen only
// remounts on an actual "came back after being away" event (page reload,
// sign-out/in, tab closed), not routine tab-switching, so showing this
// summary for any real gap isn't spammy.
//
// Derived from AUTOSAVE_INTERVAL_SECONDS rather than a bare number, so it
// can never again quietly fall out of the safe range the way it did when
// the save cadence was 10s and this was also set to 10s: useCharacter has
// no live Firestore listener, so character.currentActivity.startedAt only
// ever advances when an autosave actually banks something — a slow fight
// can go a full AUTOSAVE_INTERVAL_SECONDS tick with no kill, during which
// startedAt sits stale. Worst case that staleness is roughly one kill's
// worth of time (combatFormulas.ts's targetTimeToKill tops out around 25s)
// plus one more full autosave tick before the next save catches it. The x3
// multiplier keeps a comfortable margin over that worst case at any
// reasonable autosave interval, while staying far below the real absences
// (sign-outs measured in minutes) this exists to catch.
export const OFFLINE_CAP_HOURS = 24;
export const LIVE_SESSION_THRESHOLD_SECONDS = AUTOSAVE_INTERVAL_SECONDS * 3;

export interface ResolvedProgress {
  effectiveHours: number; // hours of progress actually credited — raw elapsed, capped at 24h
  rawElapsedHours: number; // true wall-clock hours elapsed, uncapped (for display only)
  cappedAtMax: boolean; // true if the player exceeded the 24h cap (anything beyond it is lost, not reduced-rate)
}

/**
 * Converts raw elapsed time into "effective hours" of progress — a flat 1:1
 * credit of real time up to the 24-hour cap, same rate whether the player is
 * actively watching or was away. Time beyond 24 hours is simply not
 * credited at all (not reduced-rate, just gone) — this is the only limiter
 * on offline progress now.
 */
export function resolveElapsedProgress(startedAt: Date, now: Date): ResolvedProgress {
  const rawElapsedSeconds = Math.max(0, (now.getTime() - startedAt.getTime()) / 1000);
  const rawElapsedHours = rawElapsedSeconds / 3600;
  const effectiveHours = Math.min(rawElapsedHours, OFFLINE_CAP_HOURS);

  return {
    effectiveHours,
    rawElapsedHours,
    cappedAtMax: rawElapsedHours >= OFFLINE_CAP_HOURS,
  };
}


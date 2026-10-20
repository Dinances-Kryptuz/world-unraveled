import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, functions } from './config';
import type { GuildDetails, GuildMemberRow, GuildPublicSummary, GuildRole } from '../gameData/guilds';

interface RawRosterEntry {
  uid: string;
  name: string;
  class: string;
  spec: string | null;
  level: number;
  role: GuildRole;
  joinedAt?: { toDate?: () => Date } | null;
}

// Every MUTATION here is a thin wrapper over a Cloud Function
// (functions/src/guilds.ts) — this file never writes to guilds/
// guildMembers/guildPublicSummaries directly (firestore.rules forbids it
// anyway). Reads of those three collections ARE direct Firestore queries
// (they're public/lightweight by design — see the rules file's comment),
// which is why this module mixes httpsCallable with plain getDoc/getDocs.

function unwrapCallableError(err: unknown): Error {
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return new Error(message);
}

export async function createGuild(name: string, tag: string): Promise<string> {
  try {
    const call = httpsCallable<{ name: string; tag: string }, { guildId: string }>(functions, 'createGuild');
    const result = await call({ name, tag });
    return result.data.guildId;
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function joinGuild(guildId: string): Promise<void> {
  try {
    const call = httpsCallable<{ guildId: string }, { guildId: string }>(functions, 'joinGuild');
    await call({ guildId });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function leaveGuild(): Promise<void> {
  try {
    const call = httpsCallable(functions, 'leaveGuild');
    await call({});
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function kickGuildMember(guildId: string, targetUid: string): Promise<void> {
  try {
    const call = httpsCallable<{ guildId: string; targetUid: string }, { ok: boolean }>(functions, 'kickGuildMember');
    await call({ guildId, targetUid });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function setGuildMemberRole(guildId: string, targetUid: string, role: 'officer' | 'member'): Promise<void> {
  try {
    const call = httpsCallable<{ guildId: string; targetUid: string; role: string }, { ok: boolean }>(
      functions,
      'setGuildMemberRole',
    );
    await call({ guildId, targetUid, role });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

// Guild invites (Phase 7) — invitedName in the success case is the
// target's own on-file name (not just an echo of what was typed), so the
// caller can show "Invited <real name>" even if the search was
// case-different.
export async function inviteToGuild(guildId: string, characterName: string): Promise<{ invitedName: string }> {
  try {
    const call = httpsCallable<{ guildId: string; characterName: string }, { ok: boolean; invitedName: string }>(
      functions,
      'inviteToGuild',
    );
    const result = await call({ guildId, characterName });
    return { invitedName: result.data.invitedName };
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function acceptGuildInvite(): Promise<{ guildId: string }> {
  try {
    const call = httpsCallable<Record<string, never>, { guildId: string }>(functions, 'acceptGuildInvite');
    const result = await call({});
    return { guildId: result.data.guildId };
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function declineGuildInvite(): Promise<void> {
  try {
    const call = httpsCallable(functions, 'declineGuildInvite');
    await call({});
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

// Companion guild auto-contribution (Phase 7) — fire-and-forget, same
// best-effort posture as refreshGuildMemberProfile above: a failed claim
// just means the small gold trickle is picked up on the next successful
// call instead (lastContributionAt never advances until the write lands),
// never worth blocking the Guild Hall screen on.
export async function claimCompanionContributionsToGuild(): Promise<void> {
  try {
    const call = httpsCallable(functions, 'claimCompanionContributionsToGuild');
    await call({});
  } catch {
    // Best-effort — see doc comment above.
  }
}

// Fire-and-forget: called once whenever Guild Hall opens for a guilded
// character. No-ops server-side (zero writes) if nothing has changed since
// the last snapshot — see functions/src/guilds.ts's own comment on why
// guildMembers is a point-in-time snapshot, not a live mirror.
export async function refreshGuildMemberProfile(): Promise<void> {
  try {
    const call = httpsCallable(functions, 'refreshGuildMemberProfile');
    await call({});
  } catch {
    // Best-effort — a failed refresh just means the roster shows slightly
    // stale name/class/level until the next successful call. Never block
    // the Guild Hall screen on this.
  }
}

// One-time self-heal for a guild whose `guilds` doc predates the roster
// trigger (functions/src/guildRoster.ts) and has no `roster` field yet.
// Fire-and-forget — the caller already has a working fallback
// (listGuildMembers) for this visit; this just makes the NEXT visit cheap.
export async function backfillGuildRoster(guildId: string): Promise<void> {
  try {
    const call = httpsCallable(functions, 'backfillGuildRoster');
    await call({ guildId });
  } catch {
    // Best-effort — worst case, the next Guild Hall open falls back again.
  }
}

export async function getGuild(guildId: string): Promise<GuildDetails | null> {
  const snap = await getDoc(doc(db, 'guilds', guildId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const rawRoster = data.roster as RawRosterEntry[] | undefined;
  return {
    id: snap.id,
    name: data.name,
    tag: data.tag ?? null,
    ownerId: data.ownerId,
    officerIds: data.officerIds ?? [],
    memberIds: data.memberIds ?? [],
    level: data.level ?? 1,
    xp: data.xp ?? 0,
    headquartersTier: data.headquartersTier ?? 1,
    momentum: data.momentum ?? 0,
    gold: data.gold ?? 0,
    rooms: data.rooms ?? {},
    restorationIds: data.restorationIds ?? [],
    roster: Array.isArray(rawRoster)
      ? rawRoster.map((m) => ({
          uid: m.uid,
          name: m.name,
          class: m.class,
          spec: m.spec ?? null,
          level: m.level,
          role: m.role,
          joinedAt: m.joinedAt?.toDate?.() ?? null,
        }))
      : undefined,
  };
}

export async function listGuildMembers(guildId: string): Promise<GuildMemberRow[]> {
  const q = query(collection(db, 'guildMembers'), where('guildId', '==', guildId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: data.uid,
      name: data.name,
      class: data.class,
      spec: data.spec ?? null,
      level: data.level,
      role: data.role as GuildRole,
      joinedAt: data.joinedAt?.toDate?.() ?? null,
    };
  });
}

const DISCOVERY_PAGE_SIZE = 20;

// Reads the single cached doc a scheduled Cloud Function
// (functions/src/guildDiscoveryCache.ts) rebuilds every 10 minutes — 1
// read instead of the up-to-20-doc collection query below, which only
// runs as a fallback (the cache doc doesn't exist yet, e.g. before that
// schedule's first run, or Cloud Scheduler isn't deployed in this project).
export async function browseGuilds(): Promise<GuildPublicSummary[]> {
  const cacheSnap = await getDoc(doc(db, 'guildDiscoveryCache', 'top'));
  if (cacheSnap.exists()) {
    const guilds = cacheSnap.data().guilds as GuildPublicSummary[] | undefined;
    if (Array.isArray(guilds)) return guilds;
  }

  const q = query(collection(db, 'guildPublicSummaries'), orderBy('memberCount', 'desc'), limit(DISCOVERY_PAGE_SIZE));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      tag: data.tag ?? null,
      memberCount: data.memberCount ?? 0,
      level: data.level ?? 1,
    };
  });
}

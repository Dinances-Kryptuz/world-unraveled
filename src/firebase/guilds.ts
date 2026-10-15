import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, functions } from './config';
import type { GuildDetails, GuildMemberRow, GuildPublicSummary, GuildRole } from '../gameData/guilds';

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

export async function getGuild(guildId: string): Promise<GuildDetails | null> {
  const snap = await getDoc(doc(db, 'guilds', guildId));
  if (!snap.exists()) return null;
  const data = snap.data();
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

export async function browseGuilds(): Promise<GuildPublicSummary[]> {
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

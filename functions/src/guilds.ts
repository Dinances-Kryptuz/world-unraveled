import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Guild mutations are the one place this game trusts the SERVER over the
// client — every other system (combat, gathering, crafting) only validates
// shape/bounds via firestore.rules and trusts the client's own numbers (see
// the repo's long-standing architecture). Guilds are genuinely multiplayer
// shared state (membership, roles, a 20-person roster cap), so this is the
// first place that needed real authority instead of just a shape check.
//
// Character.guildId is a convenience POINTER only, never an authorization
// source — every function below re-derives the caller's role from the
// guild doc's own ownerId/officerIds/memberIds (or the matching
// guildMembers doc), never from the character doc's self-reported guildId.
// That's deliberate: firestore.rules still lets a client's OWN character
// write carry an unchanged guildId through ordinary autosaves (see
// isValidCharacterUpdate's `after.guildId == before.guildId`), so nothing
// here may treat that field as proof of membership.

const db = getFirestore();

export const MAX_GUILD_MEMBERS = 20;
export const MAX_OFFICERS = 3;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 24;

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
  return uid;
}

function memberDocId(guildId: string, uid: string): string {
  return `${guildId}_${uid}`;
}

interface GuildDoc {
  name: string;
  tag: string | null;
  ownerId: string;
  officerIds: string[];
  memberIds: string[];
  level: number;
  xp: number;
  headquartersTier: number;
  createdAt: FirebaseFirestore.FieldValue;
}

export const createGuild = onCall(async (request) => {
  const uid = requireUid(request);
  const name = String((request.data as { name?: unknown })?.name ?? '').trim();
  const rawTag = String((request.data as { tag?: unknown })?.tag ?? '').trim().toUpperCase();
  const tag = rawTag.length > 0 ? rawTag : null;

  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    throw new HttpsError('invalid-argument', `Guild name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters.`);
  }
  if (tag && (tag.length < 2 || tag.length > 5)) {
    throw new HttpsError('invalid-argument', 'Guild tag must be 2-5 characters.');
  }

  const charRef = db.collection('characters').doc(uid);
  const charSnap = await charRef.get();
  if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
  const char = charSnap.data()!;
  if (char.guildId) throw new HttpsError('failed-precondition', 'Already in a guild. Leave it first.');

  const nameClash = await db.collection('guilds').where('name', '==', name).limit(1).get();
  if (!nameClash.empty) throw new HttpsError('already-exists', 'A guild with that name already exists.');

  const guildRef = db.collection('guilds').doc();
  const now = FieldValue.serverTimestamp();
  const guildData: GuildDoc = {
    name,
    tag,
    ownerId: uid,
    officerIds: [],
    memberIds: [uid],
    level: 1,
    xp: 0,
    headquartersTier: 1,
    createdAt: now,
  };

  const batch = db.batch();
  batch.set(guildRef, guildData);
  batch.set(db.collection('guildMembers').doc(memberDocId(guildRef.id, uid)), {
    guildId: guildRef.id,
    uid,
    name: char.name,
    class: char.class,
    spec: char.spec ?? null,
    level: char.level,
    role: 'master',
    joinedAt: now,
  });
  batch.set(db.collection('guildPublicSummaries').doc(guildRef.id), {
    name,
    tag,
    memberCount: 1,
    level: 1,
    createdAt: now,
  });
  batch.update(charRef, { guildId: guildRef.id });
  await batch.commit();

  return { guildId: guildRef.id };
});

export const joinGuild = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  if (!guildId) throw new HttpsError('invalid-argument', 'guildId is required.');

  const charRef = db.collection('characters').doc(uid);
  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    const [charSnap, guildSnap] = await Promise.all([tx.get(charRef), tx.get(guildRef)]);
    if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
    const char = charSnap.data()!;
    if (char.guildId) throw new HttpsError('failed-precondition', 'Already in a guild. Leave it first.');
    if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
    const guild = guildSnap.data() as GuildDoc;
    const memberIds = guild.memberIds || [];
    if (memberIds.includes(uid)) throw new HttpsError('already-exists', 'Already a member of this guild.');
    if (memberIds.length >= MAX_GUILD_MEMBERS) throw new HttpsError('resource-exhausted', 'That guild is full.');

    const now = FieldValue.serverTimestamp();
    tx.update(guildRef, { memberIds: FieldValue.arrayUnion(uid) });
    tx.set(db.collection('guildMembers').doc(memberDocId(guildId, uid)), {
      guildId,
      uid,
      name: char.name,
      class: char.class,
      spec: char.spec ?? null,
      level: char.level,
      role: 'member',
      joinedAt: now,
    });
    tx.update(db.collection('guildPublicSummaries').doc(guildId), { memberCount: FieldValue.increment(1) });
    tx.update(charRef, { guildId });
  });

  return { guildId };
});

export const leaveGuild = onCall(async (request) => {
  const uid = requireUid(request);
  const charRef = db.collection('characters').doc(uid);

  await db.runTransaction(async (tx) => {
    const charSnap = await tx.get(charRef);
    if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
    const char = charSnap.data()!;
    const guildId: string | undefined = char.guildId;
    if (!guildId) throw new HttpsError('failed-precondition', 'Not currently in a guild.');

    const guildRef = db.collection('guilds').doc(guildId);
    const guildSnap = await tx.get(guildRef);
    const memberDocRef = db.collection('guildMembers').doc(memberDocId(guildId, uid));

    if (!guildSnap.exists) {
      // Guild doc is gone somehow (shouldn't happen) — just clear the stale pointer.
      tx.update(charRef, { guildId: FieldValue.delete() });
      tx.delete(memberDocRef);
      return;
    }

    const guild = guildSnap.data() as GuildDoc;
    const summaryRef = db.collection('guildPublicSummaries').doc(guildId);
    const remainingMembers = (guild.memberIds || []).filter((id) => id !== uid);
    const remainingOfficers = (guild.officerIds || []).filter((id) => id !== uid);

    if (guild.ownerId === uid) {
      if (remainingMembers.length === 0) {
        // Last person standing — disband the guild entirely.
        tx.delete(guildRef);
        tx.delete(summaryRef);
        tx.delete(memberDocRef);
        tx.update(charRef, { guildId: FieldValue.delete() });
        return;
      }
      // Hand the Guild Master role to the first Officer, else the longest-
      // standing remaining member.
      const newOwner = remainingOfficers[0] ?? remainingMembers[0];
      const newOfficerIds = remainingOfficers.filter((id) => id !== newOwner);
      tx.update(guildRef, { ownerId: newOwner, officerIds: newOfficerIds, memberIds: remainingMembers });
      tx.update(db.collection('guildMembers').doc(memberDocId(guildId, newOwner)), { role: 'master' });
      tx.delete(memberDocRef);
      tx.update(summaryRef, { memberCount: FieldValue.increment(-1) });
      tx.update(charRef, { guildId: FieldValue.delete() });
      return;
    }

    tx.update(guildRef, { memberIds: remainingMembers, officerIds: remainingOfficers });
    tx.delete(memberDocRef);
    tx.update(summaryRef, { memberCount: FieldValue.increment(-1) });
    tx.update(charRef, { guildId: FieldValue.delete() });
  });

  return { ok: true };
});

export const kickGuildMember = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const targetUid = String((request.data as { targetUid?: unknown })?.targetUid ?? '');
  if (!guildId || !targetUid) throw new HttpsError('invalid-argument', 'guildId and targetUid are required.');
  if (targetUid === uid) throw new HttpsError('invalid-argument', 'Use leaveGuild to leave your own guild.');

  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    const guildSnap = await tx.get(guildRef);
    if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
    const guild = guildSnap.data() as GuildDoc;
    const isOwner = guild.ownerId === uid;
    const isOfficer = (guild.officerIds || []).includes(uid);
    if (!isOwner && !isOfficer) {
      throw new HttpsError('permission-denied', 'Only the Guild Master or an Officer can remove a member.');
    }
    if (targetUid === guild.ownerId) throw new HttpsError('permission-denied', 'Cannot remove the Guild Master.');
    const targetIsOfficer = (guild.officerIds || []).includes(targetUid);
    if (targetIsOfficer && !isOwner) {
      throw new HttpsError('permission-denied', 'Only the Guild Master can remove an Officer.');
    }
    if (!(guild.memberIds || []).includes(targetUid)) {
      throw new HttpsError('not-found', 'That player is not a member of this guild.');
    }

    const memberIds = guild.memberIds.filter((id) => id !== targetUid);
    const officerIds = (guild.officerIds || []).filter((id) => id !== targetUid);
    tx.update(guildRef, { memberIds, officerIds });
    tx.delete(db.collection('guildMembers').doc(memberDocId(guildId, targetUid)));
    tx.update(db.collection('guildPublicSummaries').doc(guildId), { memberCount: FieldValue.increment(-1) });
    tx.update(db.collection('characters').doc(targetUid), { guildId: FieldValue.delete() });
  });

  return { ok: true };
});

export const setGuildMemberRole = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const targetUid = String((request.data as { targetUid?: unknown })?.targetUid ?? '');
  const role = (request.data as { role?: unknown })?.role;
  if (!guildId || !targetUid || (role !== 'officer' && role !== 'member')) {
    throw new HttpsError('invalid-argument', 'guildId, targetUid, and a valid role are required.');
  }

  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    const guildSnap = await tx.get(guildRef);
    if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
    const guild = guildSnap.data() as GuildDoc;
    if (guild.ownerId !== uid) throw new HttpsError('permission-denied', 'Only the Guild Master can change roles.');
    if (targetUid === guild.ownerId) throw new HttpsError('invalid-argument', 'The Guild Master already holds the top role.');
    if (!(guild.memberIds || []).includes(targetUid)) {
      throw new HttpsError('not-found', 'That player is not a member of this guild.');
    }

    let officerIds = guild.officerIds || [];
    if (role === 'officer') {
      if (!officerIds.includes(targetUid)) {
        if (officerIds.length >= MAX_OFFICERS) {
          throw new HttpsError('resource-exhausted', `A guild may have at most ${MAX_OFFICERS} Officers.`);
        }
        officerIds = [...officerIds, targetUid];
      }
    } else {
      officerIds = officerIds.filter((id) => id !== targetUid);
    }

    tx.update(guildRef, { officerIds });
    tx.update(db.collection('guildMembers').doc(memberDocId(guildId, targetUid)), { role });
  });

  return { ok: true };
});

// Cheap, client-triggered refresh of the caller's OWN denormalized
// guildMembers row (name/class/spec/level) — guildMembers is deliberately
// a point-in-time snapshot, never kept live-in-sync with the character doc
// (that would mean a write on every level-up/respec for every guild
// member, which is exactly the per-tick-write pattern Part 12 forbids).
// Call this when opening the Guild Hall; it no-ops (zero writes) if
// nothing has actually changed since the last snapshot.
export const refreshGuildMemberProfile = onCall(async (request) => {
  const uid = requireUid(request);
  const charSnap = await db.collection('characters').doc(uid).get();
  if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
  const char = charSnap.data()!;
  const guildId: string | undefined = char.guildId;
  if (!guildId) return { updated: false };

  const memberRef = db.collection('guildMembers').doc(memberDocId(guildId, uid));
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) return { updated: false };
  const m = memberSnap.data()!;
  const spec = char.spec ?? null;
  if (m.name === char.name && m.class === char.class && m.spec === spec && m.level === char.level) {
    return { updated: false };
  }
  await memberRef.update({ name: char.name, class: char.class, spec, level: char.level });
  return { updated: true };
});

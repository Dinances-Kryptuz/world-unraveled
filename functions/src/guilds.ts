import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { isoWeekId } from './weekId';

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

// Shared by joinGuild (self-service, browsing the discovery list) and
// acceptGuildInvite (invited by a member) — both land a caller in the
// exact same member state, differing only in HOW they found the guild and
// in acceptGuildInvite's case, also clearing the pending-invite fields
// right after this runs. Pulled out so that isn't two copies of the same
// five writes drifting apart.
function performJoinWrites(
  tx: FirebaseFirestore.Transaction,
  guildId: string,
  uid: string,
  char: FirebaseFirestore.DocumentData,
  charRef: FirebaseFirestore.DocumentReference
): void {
  const now = FieldValue.serverTimestamp();
  tx.update(db.collection('guilds').doc(guildId), { memberIds: FieldValue.arrayUnion(uid) });
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
}

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

    performJoinWrites(tx, guildId, uid, char, charRef);
  });

  return { guildId };
});

// Guild invites (Phase 7) — any current member can invite a character by
// name (single-field equality query, same pattern guild-name-clash
// checking already uses — no new Firestore index needed). The invited
// character gets ONE pending invite slot (pendingGuildInviteId/
// pendingGuildInviteGuildName on their own character doc); sending a new
// one simply overwrites whichever was there before, same "latest wins, no
// queue" posture as every other single-pointer field in this codebase.
// Character names are not enforced unique anywhere, so "first match wins"
// is the documented behavior for a duplicate name, same as createGuild's
// own name-clash check already assumes uniqueness it doesn't strictly
// guarantee for characters.
export const inviteToGuild = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const characterName = String((request.data as { characterName?: unknown })?.characterName ?? '').trim();
  if (!guildId || !characterName) throw new HttpsError('invalid-argument', 'guildId and characterName are required.');

  const guildSnap = await db.collection('guilds').doc(guildId).get();
  if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
  const guild = guildSnap.data() as GuildDoc;
  if (!(guild.memberIds || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'Only a member of this guild can send invites.');
  }
  if ((guild.memberIds || []).length >= MAX_GUILD_MEMBERS) {
    throw new HttpsError('resource-exhausted', 'This guild is full.');
  }

  const targetSnap = await db.collection('characters').where('name', '==', characterName).limit(1).get();
  if (targetSnap.empty) throw new HttpsError('not-found', `No character named "${characterName}" found.`);
  const targetDoc = targetSnap.docs[0];
  const target = targetDoc.data();
  if (targetDoc.id === uid) throw new HttpsError('invalid-argument', "You can't invite yourself.");
  if (target.guildId) throw new HttpsError('failed-precondition', `${characterName} is already in a guild.`);
  if ((guild.memberIds || []).includes(targetDoc.id)) {
    throw new HttpsError('already-exists', `${characterName} is already a member of this guild.`);
  }

  await targetDoc.ref.update({ pendingGuildInviteId: guildId, pendingGuildInviteGuildName: guild.name });
  return { ok: true, invitedName: target.name as string };
});

export const acceptGuildInvite = onCall(async (request) => {
  const uid = requireUid(request);
  const charRef = db.collection('characters').doc(uid);

  const guildId = await db.runTransaction(async (tx) => {
    const charSnap = await tx.get(charRef);
    if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
    const char = charSnap.data()!;
    const invitedGuildId: string | undefined = char.pendingGuildInviteId;
    if (!invitedGuildId) throw new HttpsError('failed-precondition', 'No pending guild invite.');
    if (char.guildId) throw new HttpsError('failed-precondition', 'Already in a guild. Leave it first.');

    const guildRef = db.collection('guilds').doc(invitedGuildId);
    const guildSnap = await tx.get(guildRef);
    if (!guildSnap.exists) {
      // The invited guild no longer exists (disbanded) — just clear the
      // stale invite rather than leaving the player stuck with a dead one.
      tx.update(charRef, { pendingGuildInviteId: FieldValue.delete(), pendingGuildInviteGuildName: FieldValue.delete() });
      throw new HttpsError('not-found', 'That guild no longer exists.');
    }
    const guild = guildSnap.data() as GuildDoc;
    const memberIds = guild.memberIds || [];
    if (memberIds.includes(uid)) throw new HttpsError('already-exists', 'Already a member of this guild.');
    if (memberIds.length >= MAX_GUILD_MEMBERS) throw new HttpsError('resource-exhausted', 'That guild is now full.');

    performJoinWrites(tx, invitedGuildId, uid, char, charRef);
    tx.update(charRef, { pendingGuildInviteId: FieldValue.delete(), pendingGuildInviteGuildName: FieldValue.delete() });
    return invitedGuildId;
  });

  return { guildId };
});

export const declineGuildInvite = onCall(async (request) => {
  const uid = requireUid(request);
  await db.collection('characters').doc(uid).update({
    pendingGuildInviteId: FieldValue.delete(),
    pendingGuildInviteGuildName: FieldValue.delete(),
  });
  return { ok: true };
});

// Companion guild auto-contribution (Phase 7, extended for specialization
// routing) — lazy-accrual, same "compute elapsed time since the stored
// anchor, cap it, credit it, advance the anchor to now" shape as every
// offline-resolver in this game, just driven by a client-triggered claim
// (like refreshGuildMemberProfile) instead of a tick loop, since there's no
// per-second simulation to run here.
//
// Each companion's elapsed hours route by its rolled gathering/crafting
// profession (CompanionState.gatheringProfession/craftingProfession):
// Skinning routes to the weekly gathering contract's material, Smithing to
// the weekly crafting contract's material — a FIXED lookup, not a dynamic
// material-to-profession search, because this game's weekly contracts
// (CONTRACT_TEMPLATES in contracts.ts) are a hardcoded set that never
// rotates (see that file's module comment), so "gathering contract" always
// means light_hide/Skinning and "crafting contract" always means
// copper_bar/Smithing. A companion with neither matching profession — or
// whose matching contract doesn't exist this week, is already complete, or
// has hit this path's own contribution cap — falls back to flat gold for
// those hours instead of losing them. A companion that happens to roll
// BOTH matching professions contributes to both contracts independently
// from the same elapsed hours (the same idle-game abstraction already used
// for a single companion holding two unrelated professions at once).
//
// The material contribution is capped at COMPANION_AUTO_CONTRACT_CAP_PCT of
// the contract's requirement, enforced against the SAME
// companionContributions[uid] running total the older, manual
// claimCompanionContributions (contracts.ts) already writes to — so the two
// mechanisms compose under one shared ceiling rather than stacking two
// independent ones; this path's lower 10% cap binds well before that older
// system's own 25% aggregate cap. Deliberately skips the Library room-bonus
// XP multiplier contracts.ts's claim paths apply on completion (a scoped
// simplification to avoid pulling in guildRooms here for an auto-triggered,
// best-effort path).
const CONTRACT_CATEGORY_PROFESSION_MATCH = { gathering: 'skinning', crafting: 'smithing' } as const;
const COMPANION_AUTO_CONTRACT_CAP_PCT = 0.1;
const COMPANION_MATERIAL_PER_HOUR = 2;
const COMPANION_CONTRIBUTION_GOLD_PER_HOUR = 2;
const COMPANION_CONTRIBUTION_CAP_HOURS = 24;
const COMPANION_AUTO_CONTRACT_XP_REWARD = 50;

interface AutoContractRow {
  category: 'gathering' | 'crafting' | 'hunting';
  materialId: string | null;
  requirement: number;
  progress: number;
  companionContributions: Record<string, number>;
  completedAt: FirebaseFirestore.Timestamp | null;
}

export const claimCompanionContributionsToGuild = onCall(async (request) => {
  const uid = requireUid(request);
  const charRef = db.collection('characters').doc(uid);
  const charSnap = await charRef.get();
  if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
  const char = charSnap.data()!;
  const guildId: string | undefined = char.guildId;
  if (!guildId) return { claimedGold: 0, claimedMaterials: [] };

  const guildRef = db.collection('guilds').doc(guildId);
  const guildSnap = await guildRef.get();
  if (!guildSnap.exists || !((guildSnap.data() as GuildDoc).memberIds || []).includes(uid)) {
    return { claimedGold: 0, claimedMaterials: [] };
  }

  const companions = (char.companions ?? {}) as Record<
    string,
    { lastContributionAt?: FirebaseFirestore.Timestamp; gatheringProfession?: string; craftingProfession?: string }
  >;
  const now = Date.now();
  let goldHours = 0;
  const materialHoursByCategory: Record<'gathering' | 'crafting', number> = { gathering: 0, crafting: 0 };
  const charUpdate: Record<string, unknown> = {};

  for (const [companionId, state] of Object.entries(companions)) {
    if (!state.lastContributionAt) continue;
    const elapsedHours = (now - state.lastContributionAt.toMillis()) / (1000 * 60 * 60);
    if (elapsedHours < 0.01) continue; // nothing meaningful to claim yet
    const cappedHours = Math.min(elapsedHours, COMPANION_CONTRIBUTION_CAP_HOURS);
    charUpdate[`companions.${companionId}.lastContributionAt`] = FieldValue.serverTimestamp();

    let matched = false;
    if (state.gatheringProfession === CONTRACT_CATEGORY_PROFESSION_MATCH.gathering) {
      materialHoursByCategory.gathering += cappedHours;
      matched = true;
    }
    if (state.craftingProfession === CONTRACT_CATEGORY_PROFESSION_MATCH.crafting) {
      materialHoursByCategory.crafting += cappedHours;
      matched = true;
    }
    if (!matched) goldHours += cappedHours;
  }

  if (goldHours <= 0 && materialHoursByCategory.gathering <= 0 && materialHoursByCategory.crafting <= 0) {
    return { claimedGold: 0, claimedMaterials: [] };
  }

  const claimedMaterials: { materialId: string; amount: number }[] = [];

  if (materialHoursByCategory.gathering > 0 || materialHoursByCategory.crafting > 0) {
    const weekRef = db.collection('guildWeeks').doc(`${guildId}_${isoWeekId(new Date())}`);
    const materialResult = await db.runTransaction(async (tx) => {
      const weekSnap = await tx.get(weekRef);
      if (!weekSnap.exists) return { claimedMaterials: [] as { materialId: string; amount: number }[], xpToAward: 0, overflowGoldHours: 0 };

      const week = weekSnap.data() as { contracts: AutoContractRow[] };
      const contracts = week.contracts.map((c) => ({ ...c, companionContributions: { ...c.companionContributions } }));
      const applied: { materialId: string; amount: number }[] = [];
      let xpToAward = 0;
      let overflowGoldHours = 0;

      (['gathering', 'crafting'] as const).forEach((category) => {
        const hours = materialHoursByCategory[category];
        if (hours <= 0) return;
        const contractIndex = contracts.findIndex((c) => c.category === category && !c.completedAt);
        const wantedUnits = Math.round(hours * COMPANION_MATERIAL_PER_HOUR);
        if (contractIndex < 0) {
          overflowGoldHours += hours; // no open matching contract this week — refund as gold
          return;
        }
        const c = contracts[contractIndex];
        const currentTotal = c.companionContributions[uid] ?? 0;
        const capRoom = Math.floor(c.requirement * COMPANION_AUTO_CONTRACT_CAP_PCT) - currentTotal;
        const amount = Math.max(0, Math.min(wantedUnits, capRoom, c.requirement - c.progress));
        if (wantedUnits > amount) overflowGoldHours += (wantedUnits - amount) / COMPANION_MATERIAL_PER_HOUR;
        if (amount <= 0) return;

        c.progress += amount;
        c.companionContributions[uid] = currentTotal + amount;
        if (c.progress >= c.requirement && !c.completedAt) {
          c.completedAt = Timestamp.now();
          xpToAward += COMPANION_AUTO_CONTRACT_XP_REWARD;
        }
        if (c.materialId) applied.push({ materialId: c.materialId, amount });
      });

      if (applied.length > 0 || xpToAward > 0) {
        tx.update(weekRef, { contracts });
        if (xpToAward > 0) tx.update(guildRef, { xp: FieldValue.increment(xpToAward) });
      }
      return { claimedMaterials: applied, xpToAward, overflowGoldHours };
    });

    claimedMaterials.push(...materialResult.claimedMaterials);
    goldHours += materialResult.overflowGoldHours;
  }

  const claimedGold = Math.floor(goldHours * COMPANION_CONTRIBUTION_GOLD_PER_HOUR);
  const batch = db.batch();
  batch.update(charRef, charUpdate);
  if (claimedGold > 0) batch.update(guildRef, { gold: FieldValue.increment(claimedGold) });
  await batch.commit();

  return { claimedGold, claimedMaterials };
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

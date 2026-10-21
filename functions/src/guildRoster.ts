import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

// Keeps a denormalized `roster` array directly on the `guilds/{guildId}`
// doc, incrementally updated by this trigger whenever a `guildMembers` row
// is written (join/leave/kick/role-change/refreshGuildMemberProfile).
// Before this, GuildOverview's every single Guild Hall open cost 1 read
// (getGuild) + up to MAX_GUILD_MEMBERS reads (a guildMembers collection
// query) = up to 21 reads, every visit, for every member. Reading the
// roster off the guild doc instead collapses that to the 1 read the screen
// already needed anyway — the extra cost moves here, to the (far rarer)
// membership-write path, and is O(1) per write (read the guild doc once,
// splice one entry, write it back) rather than a full requery.

const db = getFirestore();

interface RosterEntry {
  uid: string;
  name: string;
  class: string;
  spec: string | null;
  level: number;
  title: string | null;
  role: string;
  joinedAt: FirebaseFirestore.Timestamp | null;
}

export const onGuildMemberWritten = onDocumentWritten('guildMembers/{memberId}', async (event) => {
  const beforeData = event.data?.before.exists ? event.data.before.data() : undefined;
  const afterData = event.data?.after.exists ? event.data.after.data() : undefined;
  const guildId = (afterData?.guildId ?? beforeData?.guildId) as string | undefined;
  const uid = (afterData?.uid ?? beforeData?.uid) as string | undefined;
  if (!guildId || !uid) return;

  const guildRef = db.collection('guilds').doc(guildId);
  await db.runTransaction(async (tx) => {
    const guildSnap = await tx.get(guildRef);
    if (!guildSnap.exists) return;
    const existingRoster = (guildSnap.data()!.roster as RosterEntry[] | undefined) ?? [];
    const roster = existingRoster.filter((r) => r.uid !== uid);
    if (afterData) {
      roster.push({
        uid,
        name: afterData.name,
        class: afterData.class,
        spec: afterData.spec ?? null,
        level: afterData.level,
        title: afterData.title ?? null,
        role: afterData.role,
        joinedAt: afterData.joinedAt ?? null,
      });
    }
    tx.update(guildRef, { roster });
  });
});

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
  return uid;
}

// One-time self-heal for guilds that existed before the trigger above
// shipped (their `guilds` doc has no `roster` field yet, since nothing has
// re-written a guildMembers row since). Any member may call this; it's a
// no-op (zero writes) once `roster` already exists, so it only ever pays
// the full guildMembers query once per guild, total — every later call for
// that guild short-circuits on the first line below.
export const backfillGuildRoster = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  if (!guildId) throw new HttpsError('invalid-argument', 'guildId is required.');

  const guildRef = db.collection('guilds').doc(guildId);
  const guildSnap = await guildRef.get();
  if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
  const guild = guildSnap.data()!;
  if (guild.roster) return { ok: true };
  if (!(guild.memberIds || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a member of this guild.');
  }

  const membersSnap = await db.collection('guildMembers').where('guildId', '==', guildId).get();
  const roster: RosterEntry[] = membersSnap.docs.map((d) => {
    const m = d.data();
    return {
      uid: m.uid,
      name: m.name,
      class: m.class,
      spec: m.spec ?? null,
      level: m.level,
      title: m.title ?? null,
      role: m.role,
      joinedAt: m.joinedAt ?? null,
    };
  });
  await guildRef.update({ roster });
  return { ok: true };
});

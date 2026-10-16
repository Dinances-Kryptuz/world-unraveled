import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Guild Headquarters & Restoration (Phase 5) — rooms and restoration
// projects are both funded from one shared `guilds/{id}.gold` pool, donated
// by members via donateGoldToGuild and spent by the Guild Master/Officers.
// This reuses one simple mechanic for both systems instead of building two
// separate collective-turn-in flows (contracts.ts's material turn-in
// already covers that pattern for weekly contracts).

const db = getFirestore();

const ROOM_IDS = ['storehouse', 'workshop', 'barracks', 'warroom', 'library', 'trophyhall'];
const ROOM_MAX_LEVEL = 5;

function roomUpgradeCost(currentLevel: number): number {
  return 500 * Math.pow(2, currentLevel);
}

const RESTORATION_PROJECTS: Record<string, { cost: number; titleId: string }> = {
  fountain_square: { cost: 1000, titleId: 'patron_of_ashenfall' },
  banner_hall: { cost: 2000, titleId: 'banner_bearer' },
  old_archive: { cost: 3000, titleId: 'keeper_of_lore' },
  training_yard: { cost: 4000, titleId: 'vanguard_of_ashenfall' },
  beacon_tower: { cost: 6000, titleId: 'beacon_of_the_guild' },
};

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
  return uid;
}

export const donateGoldToGuild = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const amount = Math.floor(Number((request.data as { amount?: unknown })?.amount));
  if (!guildId || !(amount > 0)) throw new HttpsError('invalid-argument', 'guildId and a positive amount are required.');

  const guildRef = db.collection('guilds').doc(guildId);
  const charRef = db.collection('characters').doc(uid);

  await db.runTransaction(async (tx) => {
    const [guildSnap, charSnap] = await Promise.all([tx.get(guildRef), tx.get(charRef)]);
    if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
    if (!(guildSnap.data()?.memberIds || []).includes(uid)) {
      throw new HttpsError('permission-denied', 'Not a member of this guild.');
    }
    const held = Number(charSnap.data()?.gold ?? 0);
    if (held < amount) throw new HttpsError('failed-precondition', 'Not enough gold.');

    tx.update(charRef, { gold: FieldValue.increment(-amount) });
    tx.update(guildRef, { gold: FieldValue.increment(amount) });
  });

  return { ok: true };
});

function requireOfficerOrMaster(guildData: FirebaseFirestore.DocumentData, uid: string): void {
  const isOwner = guildData.ownerId === uid;
  const isOfficer = (guildData.officerIds || []).includes(uid);
  if (!isOwner && !isOfficer) {
    throw new HttpsError('permission-denied', 'Only the Guild Master or an Officer can spend guild gold.');
  }
}

export const upgradeGuildRoom = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const roomId = String((request.data as { roomId?: unknown })?.roomId ?? '');
  if (!guildId || !ROOM_IDS.includes(roomId)) {
    throw new HttpsError('invalid-argument', 'guildId and a valid roomId are required.');
  }

  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    const guildSnap = await tx.get(guildRef);
    if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
    const guild = guildSnap.data()!;
    requireOfficerOrMaster(guild, uid);

    const currentLevel = Math.max(0, Math.min(ROOM_MAX_LEVEL, guild.rooms?.[roomId] ?? 0));
    if (currentLevel >= ROOM_MAX_LEVEL) throw new HttpsError('failed-precondition', 'That room is already fully upgraded.');

    const cost = roomUpgradeCost(currentLevel);
    const heldGold = Number(guild.gold ?? 0);
    if (heldGold < cost) throw new HttpsError('failed-precondition', 'Not enough guild gold.');

    tx.update(guildRef, {
      gold: FieldValue.increment(-cost),
      [`rooms.${roomId}`]: currentLevel + 1,
    });
  });

  return { ok: true };
});

export const completeRestorationProject = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const projectId = String((request.data as { projectId?: unknown })?.projectId ?? '');
  const project = RESTORATION_PROJECTS[projectId];
  if (!guildId || !project) throw new HttpsError('invalid-argument', 'guildId and a valid projectId are required.');

  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    const guildSnap = await tx.get(guildRef);
    if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
    const guild = guildSnap.data()!;
    requireOfficerOrMaster(guild, uid);

    const completed: string[] = guild.restorationIds || [];
    if (completed.includes(projectId)) throw new HttpsError('already-exists', 'Already completed.');

    const heldGold = Number(guild.gold ?? 0);
    if (heldGold < project.cost) throw new HttpsError('failed-precondition', 'Not enough guild gold.');

    const memberIds: string[] = guild.memberIds || [];
    tx.update(guildRef, {
      gold: FieldValue.increment(-project.cost),
      restorationIds: FieldValue.arrayUnion(projectId),
    });
    // One-time, bounded to this guild's member cap (<=20) — a celebratory
    // title grant, not a recurring per-tick write, so this stays well
    // inside Part 12's cost budget despite touching every member's doc.
    for (const memberUid of memberIds) {
      tx.update(db.collection('characters').doc(memberUid), {
        unlockedTitleIds: FieldValue.arrayUnion(project.titleId),
      });
    }
  });

  return { ok: true };
});

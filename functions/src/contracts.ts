import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { isoWeekId } from './weekId';

// Weekly Guild Contracts (spec Part 5/6). Kept deliberately simple for this
// first pass, per Part 14's "validate each phase before moving to the
// next": a FIXED set of 3 contracts every week (one Gathering, one
// Crafting, one Hunting), not yet rotated/randomized content — that's a
// documented follow-up, not a blocker for the mechanic itself.
//
// Known, deliberate scope limit on the Hunting category: this game's
// combat is client-reported everywhere (see functions/src/guilds.ts's
// module comment on the repo's overall trust model), so "verified-event-
// only hunting credit" is approximated here as a bounded claim (at most
// HUNTING_KILLS_PER_CALL_MAX per call) rather than a cryptographically
// verified kill log — genuinely verifying combat server-side would mean
// rewriting the combat engine to be server-authoritative, which the spec's
// own Part 1 explicitly rules out ("do not rebuild the game").

const db = getFirestore();

const CONTRACT_TEMPLATES: { category: 'gathering' | 'crafting' | 'hunting'; materialId: string | null; requirement: number; label: string }[] = [
  { category: 'gathering', materialId: 'light_hide', requirement: 240, label: 'Deliver 240 Light Hide' },
  { category: 'crafting', materialId: 'copper_bar', requirement: 80, label: 'Deliver 80 Copper Bars' },
  { category: 'hunting', materialId: null, requirement: 60, label: 'Defeat 60 monsters' },
];

const CONTRACT_XP_REWARD = 50;
const CONTRACT_GOLD_POOL = 300;
const HUNTING_KILLS_PER_CALL_MAX = 20;
const COMPANION_CONTRIBUTION_CAP_PCT = 0.25;

interface ContractRow {
  category: 'gathering' | 'crafting' | 'hunting';
  materialId: string | null;
  label: string;
  requirement: number;
  progress: number;
  playerContributions: Record<string, number>;
  companionContributions: Record<string, number>;
  claims: Record<string, boolean>;
  completedAt: FirebaseFirestore.Timestamp | null;
}

interface GuildWeekDoc {
  guildId: string;
  weekId: string;
  contracts: ContractRow[];
  createdAt: FirebaseFirestore.FieldValue;
  // Which of the caller's companions have already made their one
  // contribution this week — keyed by the OWNING player's uid (companions
  // have no account of their own). See claimCompanionContributions below.
  companionClaims?: Record<string, string[]>;
}

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
  return uid;
}

function weekDocId(guildId: string, weekId: string): string {
  return `${guildId}_${weekId}`;
}

function freshContracts(): ContractRow[] {
  return CONTRACT_TEMPLATES.map((t) => ({
    category: t.category,
    materialId: t.materialId,
    label: t.label,
    requirement: t.requirement,
    progress: 0,
    playerContributions: {},
    companionContributions: {},
    claims: {},
    completedAt: null,
  }));
}

async function requireMembership(tx: Transaction, guildId: string, uid: string): Promise<void> {
  const guildSnap = await tx.get(db.collection('guilds').doc(guildId));
  if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
  const memberIds: string[] = guildSnap.data()?.memberIds || [];
  if (!memberIds.includes(uid)) throw new HttpsError('permission-denied', 'Not a member of this guild.');
}

// Idempotent get-or-create for "this week's" contracts. The FIRST call from
// ANY member after a new ISO week starts both creates that week's contract
// row and settles Guild Momentum for the week that just ended (pause, not
// reset, if nothing was completed) — see the guild doc's momentum/
// lastWeekId fields. Every later call this same week is a single cheap
// read (the transaction's write branch never runs again).
export const getOrCreateGuildWeek = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  if (!guildId) throw new HttpsError('invalid-argument', 'guildId is required.');
  const weekId = isoWeekId(new Date());

  const weekRef = db.collection('guildWeeks').doc(weekDocId(guildId, weekId));
  const guildRef = db.collection('guilds').doc(guildId);

  const result = await db.runTransaction(async (tx) => {
    await requireMembership(tx, guildId, uid);
    const weekSnap = await tx.get(weekRef);
    if (weekSnap.exists) return weekSnap.data() as GuildWeekDoc;

    const guildSnap = await tx.get(guildRef);
    const guild = guildSnap.data()!;
    const lastWeekId: string | undefined = guild.lastWeekId;
    let momentum: number = guild.momentum ?? 0;

    if (lastWeekId && lastWeekId !== weekId) {
      const lastWeekSnap = await tx.get(db.collection('guildWeeks').doc(weekDocId(guildId, lastWeekId)));
      const lastWeekData = lastWeekSnap.data() as GuildWeekDoc | undefined;
      const anyCompleted = (lastWeekData?.contracts || []).some((c) => c.completedAt !== null);
      if (anyCompleted) momentum = Math.min(5, momentum + 1);
      // Missed week with nothing completed: momentum is left exactly as-is
      // (paused), never reset to 0 — per the spec's explicit requirement.
    }

    const newWeek: GuildWeekDoc = {
      guildId,
      weekId,
      contracts: freshContracts(),
      createdAt: FieldValue.serverTimestamp(),
    };
    tx.set(weekRef, newWeek);
    tx.update(guildRef, { lastWeekId: weekId, momentum });
    return newWeek;
  });

  return result;
});

// Gathering/Crafting contracts only — deducts the matching material
// straight from the caller's own inventory (characters/{uid}/inventory/
// main) and increments shared progress in the same transaction, so a
// failed or partial deduction can never silently "lose" turned-in materials.
export const contributeMaterial = onCall(async (request) => {
  const uid = requireUid(request);
  const data = request.data as { guildId?: unknown; weekId?: unknown; contractIndex?: unknown; amount?: unknown };
  const guildId = String(data?.guildId ?? '');
  const weekId = String(data?.weekId ?? '');
  const contractIndex = Number(data?.contractIndex);
  const amount = Math.floor(Number(data?.amount));
  if (!guildId || !weekId || !Number.isInteger(contractIndex) || !(amount > 0)) {
    throw new HttpsError('invalid-argument', 'guildId, weekId, contractIndex, and a positive amount are required.');
  }

  const weekRef = db.collection('guildWeeks').doc(weekDocId(guildId, weekId));
  const inventoryRef = db.collection('characters').doc(uid).collection('inventory').doc('main');
  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    await requireMembership(tx, guildId, uid);
    const weekSnap = await tx.get(weekRef);
    if (!weekSnap.exists) throw new HttpsError('not-found', 'That contract week does not exist.');
    const week = weekSnap.data() as GuildWeekDoc;
    const contract = week.contracts[contractIndex];
    if (!contract) throw new HttpsError('invalid-argument', 'No such contract.');
    if (contract.category !== 'gathering' && contract.category !== 'crafting') {
      throw new HttpsError('invalid-argument', 'That contract does not accept material turn-ins.');
    }
    if (contract.completedAt) throw new HttpsError('failed-precondition', 'That contract is already complete.');

    const invSnap = await tx.get(inventoryRef);
    const held = Number(invSnap.data()?.items?.[contract.materialId!] ?? 0);
    const remaining = contract.requirement - contract.progress;
    const accepted = Math.min(amount, remaining, held);
    if (accepted <= 0) {
      throw new HttpsError('failed-precondition', 'You do not have any of that material to contribute.');
    }

    tx.update(inventoryRef, { [`items.${contract.materialId}`]: FieldValue.increment(-accepted) });

    // Firestore does NOT support indexing into an array via a dotted field
    // path (`contracts.0.progress`) — that silently turns the whole
    // `contracts` field into a map keyed "0","1","2" instead of updating
    // one element of the array, corrupting every other reader of this doc.
    // The only safe way to mutate one entry is to clone the WHOLE array in
    // JS and write it back as one plain array value.
    const contracts = week.contracts.slice();
    const updatedContract: ContractRow = {
      ...contract,
      progress: contract.progress + accepted,
      playerContributions: { ...contract.playerContributions, [uid]: (contract.playerContributions[uid] ?? 0) + accepted },
    };
    if (updatedContract.progress >= updatedContract.requirement) {
      // Firestore field-value transforms (serverTimestamp()/increment()/
      // arrayUnion()) are only valid as a top-level or dotted-map-path
      // field value — NOT inside an array element, which is exactly where
      // this lives. Timestamp.now() is the Cloud Function's own clock,
      // which is fine here since this code only ever runs server-side.
      updatedContract.completedAt = Timestamp.now();
      tx.update(guildRef, { xp: FieldValue.increment(CONTRACT_XP_REWARD) });
    }
    contracts[contractIndex] = updatedContract;
    tx.update(weekRef, { contracts });
  });

  return { ok: true };
});

// Hunting contracts only — see this file's module comment on why this is a
// bounded CLAIM rather than a verified kill log.
export const reportHuntingKills = onCall(async (request) => {
  const uid = requireUid(request);
  const data = request.data as { guildId?: unknown; weekId?: unknown; contractIndex?: unknown; killCount?: unknown };
  const guildId = String(data?.guildId ?? '');
  const weekId = String(data?.weekId ?? '');
  const contractIndex = Number(data?.contractIndex);
  const killCount = Math.floor(Number(data?.killCount));
  if (!guildId || !weekId || !Number.isInteger(contractIndex) || !(killCount > 0)) {
    throw new HttpsError('invalid-argument', 'guildId, weekId, contractIndex, and a positive killCount are required.');
  }
  if (killCount > HUNTING_KILLS_PER_CALL_MAX) {
    throw new HttpsError('invalid-argument', `At most ${HUNTING_KILLS_PER_CALL_MAX} kills may be reported per call.`);
  }

  const weekRef = db.collection('guildWeeks').doc(weekDocId(guildId, weekId));
  const guildRef = db.collection('guilds').doc(guildId);

  await db.runTransaction(async (tx) => {
    await requireMembership(tx, guildId, uid);
    const weekSnap = await tx.get(weekRef);
    if (!weekSnap.exists) throw new HttpsError('not-found', 'That contract week does not exist.');
    const week = weekSnap.data() as GuildWeekDoc;
    const contract = week.contracts[contractIndex];
    if (!contract) throw new HttpsError('invalid-argument', 'No such contract.');
    if (contract.category !== 'hunting') throw new HttpsError('invalid-argument', 'That contract is not a Hunting contract.');
    if (contract.completedAt) throw new HttpsError('failed-precondition', 'That contract is already complete.');

    const remaining = contract.requirement - contract.progress;
    const accepted = Math.min(killCount, remaining);
    if (accepted <= 0) return;

    const contracts = week.contracts.slice();
    const updatedContract: ContractRow = {
      ...contract,
      progress: contract.progress + accepted,
      playerContributions: { ...contract.playerContributions, [uid]: (contract.playerContributions[uid] ?? 0) + accepted },
    };
    if (updatedContract.progress >= updatedContract.requirement) {
      updatedContract.completedAt = Timestamp.now();
      tx.update(guildRef, { xp: FieldValue.increment(CONTRACT_XP_REWARD) });
    }
    contracts[contractIndex] = updatedContract;
    tx.update(weekRef, { contracts });
  });

  return { ok: true };
});

// Gold payout, claimable once per member per completed contract —
// proportional to that member's OWN share (player + their companions
// combined) of the contract's total progress.
export const claimContractReward = onCall(async (request) => {
  const uid = requireUid(request);
  const data = request.data as { guildId?: unknown; weekId?: unknown; contractIndex?: unknown };
  const guildId = String(data?.guildId ?? '');
  const weekId = String(data?.weekId ?? '');
  const contractIndex = Number(data?.contractIndex);
  if (!guildId || !weekId || !Number.isInteger(contractIndex)) {
    throw new HttpsError('invalid-argument', 'guildId, weekId, and contractIndex are required.');
  }

  const weekRef = db.collection('guildWeeks').doc(weekDocId(guildId, weekId));
  const charRef = db.collection('characters').doc(uid);

  const goldAwarded = await db.runTransaction(async (tx) => {
    await requireMembership(tx, guildId, uid);
    const weekSnap = await tx.get(weekRef);
    if (!weekSnap.exists) throw new HttpsError('not-found', 'That contract week does not exist.');
    const week = weekSnap.data() as GuildWeekDoc;
    const contract = week.contracts[contractIndex];
    if (!contract) throw new HttpsError('invalid-argument', 'No such contract.');
    if (!contract.completedAt) throw new HttpsError('failed-precondition', 'That contract is not complete yet.');
    if (contract.claims?.[uid]) throw new HttpsError('already-exists', 'Already claimed.');

    const own = (contract.playerContributions?.[uid] ?? 0) + (contract.companionContributions?.[uid] ?? 0);
    if (own <= 0) throw new HttpsError('failed-precondition', 'You did not contribute to this contract.');

    const share = Math.min(1, own / contract.requirement);
    const gold = Math.max(1, Math.round(CONTRACT_GOLD_POOL * share));

    const contracts = week.contracts.slice();
    contracts[contractIndex] = { ...contract, claims: { ...contract.claims, [uid]: true } };
    tx.update(weekRef, { contracts });
    tx.update(charRef, { gold: FieldValue.increment(gold) });
    return gold;
  });

  return { gold: goldAwarded };
});

// Companion auto-contribution (spec Part 6, simplified — see this file's
// module comment). Once per guild per week per caller: every one of the
// caller's own active companions nudges whichever contract currently needs
// the most progress, by a small deterministic amount (so refreshing the
// screen can never reroll it), never pushing the COMBINED companion share
// of any one contract above COMPANION_CONTRIBUTION_CAP_PCT of its
// requirement.
function deterministicAmount(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const normalized = (hash >>> 0) / 0xffffffff;
  return min + Math.floor(normalized * (max - min + 1));
}

export const claimCompanionContributions = onCall(async (request) => {
  const uid = requireUid(request);
  const data = request.data as { guildId?: unknown; weekId?: unknown };
  const guildId = String(data?.guildId ?? '');
  const weekId = String(data?.weekId ?? '');
  if (!guildId || !weekId) throw new HttpsError('invalid-argument', 'guildId and weekId are required.');

  const weekRef = db.collection('guildWeeks').doc(weekDocId(guildId, weekId));
  const charRef = db.collection('characters').doc(uid);
  const guildRef = db.collection('guilds').doc(guildId);

  const applied = await db.runTransaction(async (tx) => {
    await requireMembership(tx, guildId, uid);
    const [weekSnap, charSnap] = await Promise.all([tx.get(weekRef), tx.get(charRef)]);
    if (!weekSnap.exists) throw new HttpsError('not-found', 'That contract week does not exist.');
    const week = weekSnap.data() as GuildWeekDoc;
    const companionIds = Object.keys(charSnap.data()?.companions || {});
    if (companionIds.length === 0) return [];

    const alreadyClaimedKey = `companionClaims.${uid}`;
    const claimedCompanionIds: string[] = week.companionClaims?.[uid] ?? [];
    const unclaimed = companionIds.filter((id) => !claimedCompanionIds.includes(id));
    if (unclaimed.length === 0) return [];

    const contracts = week.contracts.map((c) => ({ ...c, companionContributions: { ...c.companionContributions } }));
    const results: { contractIndex: number; amount: number }[] = [];

    for (const companionId of unclaimed) {
      // Pick the open (incomplete) contract with the most remaining need.
      let bestIndex = -1;
      let bestRemaining = 0;
      contracts.forEach((c, i) => {
        if (c.completedAt) return;
        const companionCapRemaining =
          Math.floor(c.requirement * COMPANION_CONTRIBUTION_CAP_PCT) -
          Object.values(c.companionContributions || {}).reduce((a, b) => a + b, 0);
        const remaining = Math.min(c.requirement - c.progress, companionCapRemaining);
        if (remaining > bestRemaining) {
          bestRemaining = remaining;
          bestIndex = i;
        }
      });
      if (bestIndex < 0) continue;

      const seed = `${guildId}:${weekId}:${companionId}`;
      const requirement = contracts[bestIndex].requirement;
      const wanted = deterministicAmount(seed, Math.ceil(requirement * 0.02), Math.ceil(requirement * 0.06));
      const amount = Math.min(wanted, bestRemaining);
      if (amount <= 0) continue;

      contracts[bestIndex].progress += amount;
      contracts[bestIndex].companionContributions[uid] = (contracts[bestIndex].companionContributions[uid] ?? 0) + amount;
      results.push({ contractIndex: bestIndex, amount });
    }

    if (results.length === 0) return [];

    let xpToAward = 0;
    for (const { contractIndex } of results) {
      const c = contracts[contractIndex];
      if (c.progress >= c.requirement && !c.completedAt) {
        c.completedAt = Timestamp.now();
        xpToAward += CONTRACT_XP_REWARD;
      }
    }
    // Same array-write rule as contributeMaterial/reportHuntingKills above —
    // the whole `contracts` array is replaced in one write, never indexed
    // into with a dotted field path.
    tx.update(weekRef, { contracts, [alreadyClaimedKey]: [...claimedCompanionIds, ...unclaimed] });
    if (xpToAward > 0) tx.update(guildRef, { xp: FieldValue.increment(xpToAward) });
    return results;
  });

  return { applied };
});

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { roomBonusMultiplier } from './guildRooms';

// Guild Expeditions (spec Part 8, simplified — see gameData/expeditions.ts's
// module comment for the party-composition scope decision: self + the
// caller's own recruited companions, not a live multi-human-player party).
//
// "One active expedition per character" is enforced by QUERYING this
// collection for an unresolved expedition owned by the caller — never by
// trusting character.activeExpeditionId, which (like guildId) is a
// non-authoritative client UI pointer. Trusting that field here would let
// a client clear it locally and start a second expedition while the first
// still runs, double-dipping on rewards.

const db = getFirestore();

type ExpeditionTier = 'common' | 'uncommon' | 'rare' | 'epic';
type CombatRole = 'tank' | 'healer' | 'dps';

const VALID_TIERS: ExpeditionTier[] = ['common', 'uncommon', 'rare', 'epic'];

const DURATION_SECONDS: Record<ExpeditionTier, number> = {
  common: 4 * 3600,
  uncommon: 8 * 3600,
  rare: 12 * 3600,
  epic: 24 * 3600,
};
const SEALS_REWARD: Record<ExpeditionTier, number> = { common: 5, uncommon: 10, rare: 20, epic: 40 };
const XP_REWARD: Record<ExpeditionTier, number> = { common: 100, uncommon: 200, rare: 400, epic: 800 };
// Rebalanced (was 0.85/0.75/0.65/0.55) — those were tuned for the OLD
// formula's small flat +5%/+5%/+8% tank/healer/companion-count bonuses.
// Carried over unchanged when that formula was replaced with +10% per
// party member, they made the base rate alone dominate: even a modest
// party (party.length ~6 of the 10-person max) already saturated the 98%
// clamp on every tier, so party size barely mattered and solo vs. full-
// group outcomes looked nearly identical — the exact "90% solo" complaint
// the per-person formula was meant to fix. These lower bases make the
// +10%/person term the real driver across the whole 1-10 person range
// (mirrors gameData/expeditions.ts's EXPEDITION_BASE_SUCCESS — keep both
// in sync).
const BASE_SUCCESS: Record<ExpeditionTier, number> = { common: 0.3, uncommon: 0.2, rare: 0.1, epic: 0.05 };
const DROP_CHANCE: Record<ExpeditionTier, number> = { common: 0.08, uncommon: 0.12, rare: 0.15, epic: 0.2 };

// Mirrors gameData/classStats.ts's FALLBACK_SPEC_BY_CLASS (a character with
// no spec chosen yet) and a simplified tank/healer/dps grouping of
// gameData/classStats.ts's SPECS — duplicated here in full since Cloud
// Functions can't import the client's TS bundle (same precedent as
// guilds.ts/contracts.ts's small duplicated constants).
const FALLBACK_SPEC_BY_CLASS: Record<string, string> = {
  warrior: 'warrior_dps',
  priest: 'shadow_priest',
  paladin: 'prot_paladin',
  mage: 'mage_fire',
  rogue: 'rogue_poison',
};

const ROLE_BY_SPEC: Record<string, CombatRole> = {
  warrior_tank: 'tank',
  prot_paladin: 'tank',
  holy_paladin: 'healer',
  holy_priest: 'healer',
  warrior_dps: 'dps',
  rogue_poison: 'dps',
  shadow_priest: 'dps',
  mage_fire: 'dps',
  mage_frost: 'dps',
};

// Mirrors gameData/companions.ts's COMPANIONS registry (id -> name/class/
// specId only — nothing else here needs the rest of that def).
const COMPANIONS: Record<string, { name: string; class: string; specId: string }> = {
  wren_the_squire: { name: 'Wren the Squire', class: 'warrior', specId: 'warrior_dps' },
  borin_ironhide: { name: 'Borin Ironhide', class: 'warrior', specId: 'warrior_tank' },
  vesper_duskwhisper: { name: 'Vesper Duskwhisper', class: 'priest', specId: 'shadow_priest' },
  sister_mabel: { name: 'Sister Mabel', class: 'priest', specId: 'holy_priest' },
  ser_aldric: { name: 'Ser Aldric', class: 'paladin', specId: 'prot_paladin' },
  dame_rosalind: { name: 'Dame Rosalind', class: 'paladin', specId: 'holy_paladin' },
  rook_hollowfang: { name: 'Rook Hollowfang', class: 'rogue', specId: 'rogue_poison' },
  thessaly_frostbind: { name: 'Thessaly Frostbind', class: 'mage', specId: 'mage_frost' },
  pyra_emberwild: { name: 'Pyra Emberwild', class: 'mage', specId: 'mage_fire' },
};

interface PartyMember {
  label: string;
  class: string;
  spec: string;
  role: CombatRole;
}

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
  return uid;
}

// Deterministic, non-rerollable — the SAME seed always produces the SAME
// fraction, so resolving an expedition's outcome lazily (whenever it's
// first claimed, not eagerly on a timer) can never be gamed by re-rolling.
function deterministicFraction(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) / 0xffffffff;
}

// Every person in the party (yourself + however many companions you send)
// adds a flat 10% to the tier's base success chance — see
// gameData/expeditions.ts's EXPEDITION_SUCCESS_PCT_PER_PERSON doc comment
// for why this replaced the old tank/healer-presence bonuses rather than
// stacking alongside them.
const SUCCESS_PCT_PER_PERSON = 0.1;

export const startExpedition = onCall(async (request) => {
  const uid = requireUid(request);
  const guildId = String((request.data as { guildId?: unknown })?.guildId ?? '');
  const tier = String((request.data as { tier?: unknown })?.tier ?? '') as ExpeditionTier;
  // Which recruited companions to send — client-chosen (see
  // ExpeditionScreen.tsx's companion checklist), but never trusted blindly:
  // filtered below to only ids the character actually has recruited.
  const requestedCompanionIds = Array.isArray((request.data as { companionIds?: unknown })?.companionIds)
    ? ((request.data as { companionIds?: unknown }).companionIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];
  if (!guildId || !VALID_TIERS.includes(tier)) {
    throw new HttpsError('invalid-argument', 'guildId and a valid tier are required.');
  }

  const guildSnap = await db.collection('guilds').doc(guildId).get();
  if (!guildSnap.exists) throw new HttpsError('not-found', 'Guild not found.');
  if (!(guildSnap.data()?.memberIds || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a member of this guild.');
  }

  const existing = await db.collection('expeditions').where('ownerUid', '==', uid).where('resolved', '==', false).limit(1).get();
  if (!existing.empty) throw new HttpsError('failed-precondition', 'You already have an expedition in progress.');

  const charSnap = await db.collection('characters').doc(uid).get();
  if (!charSnap.exists) throw new HttpsError('failed-precondition', 'No character found.');
  const char = charSnap.data()!;
  const spec: string = char.spec ?? FALLBACK_SPEC_BY_CLASS[char.class] ?? 'warrior_dps';

  const party: PartyMember[] = [
    { label: 'You', class: char.class, spec, role: ROLE_BY_SPEC[spec] ?? 'dps' },
  ];
  // Only ids the character has actually recruited — a requested id that
  // isn't recruited (or isn't a real companion) is silently dropped rather
  // than erroring, same "harmless subset, never trust the client for more
  // than that" posture as every other client-supplied list in this app.
  const ownedCompanionIds = new Set(Object.keys(char.companions || {}));
  const companionIds: string[] = requestedCompanionIds.filter((id) => ownedCompanionIds.has(id) && COMPANIONS[id]);
  for (const id of companionIds) {
    const def = COMPANIONS[id];
    party.push({ label: def.name, class: def.class, spec: def.specId, role: ROLE_BY_SPEC[def.specId] ?? 'dps' });
  }

  let successChance = BASE_SUCCESS[tier] + party.length * SUCCESS_PCT_PER_PERSON;
  successChance = Math.max(0.05, Math.min(0.98, successChance));

  const expeditionRef = db.collection('expeditions').doc();
  const now = Date.now();
  const completesAt = Timestamp.fromMillis(now + DURATION_SECONDS[tier] * 1000);

  await db.runTransaction(async (tx) => {
    tx.set(expeditionRef, {
      guildId,
      ownerUid: uid,
      tier,
      startedAt: FieldValue.serverTimestamp(),
      completesAt,
      successChance,
      party,
      companionIds,
      resolved: false,
      success: null,
      claimed: false,
      lootItemId: null,
    });
    // Companions sent on the expedition can't also be standing in a
    // dungeon party — pull them out of the active dungeon roster for the
    // expedition's duration (see CompanionScreen.tsx's lock/timer display).
    const charUpdate: Record<string, unknown> = { activeExpeditionId: expeditionRef.id };
    if (companionIds.length > 0) {
      charUpdate.activeCompanionIds = FieldValue.arrayRemove(...companionIds);
    }
    tx.update(db.collection('characters').doc(uid), charUpdate);
  });

  return { expeditionId: expeditionRef.id };
});

export const claimExpedition = onCall(async (request) => {
  const uid = requireUid(request);
  const expeditionId = String((request.data as { expeditionId?: unknown })?.expeditionId ?? '');
  if (!expeditionId) throw new HttpsError('invalid-argument', 'expeditionId is required.');

  const expeditionRef = db.collection('expeditions').doc(expeditionId);
  const charRef = db.collection('characters').doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const expSnap = await tx.get(expeditionRef);
    if (!expSnap.exists) throw new HttpsError('not-found', 'Expedition not found.');
    const exp = expSnap.data()!;
    if (exp.ownerUid !== uid) throw new HttpsError('permission-denied', 'This is not your expedition.');
    if (exp.claimed) throw new HttpsError('already-exists', 'Already claimed.');

    const completesAtMillis = (exp.completesAt as FirebaseFirestore.Timestamp).toMillis();
    if (Date.now() < completesAtMillis) {
      throw new HttpsError('failed-precondition', 'This expedition has not finished yet.');
    }

    const guildRef = db.collection('guilds').doc(exp.guildId);
    const guildSnap = await tx.get(guildRef);
    const guildData = guildSnap.data();

    const tier = exp.tier as ExpeditionTier;
    const success = deterministicFraction(`${expeditionId}:outcome`) < exp.successChance;

    let lootItemId: string | null = null;
    if (success) {
      const dropRoll = deterministicFraction(`${expeditionId}:loot`);
      if (dropRoll < DROP_CHANCE[tier]) {
        const slotRoll = deterministicFraction(`${expeditionId}:lootslot`);
        const slots = ['necklace', 'ring', 'cape', 'tabard'];
        const slot = slots[Math.floor(slotRoll * slots.length)];
        lootItemId = `expedition_${slot}_${tier}`;
      }
    }

    // War Room scales Seals/XP payout; Library scales the guild XP award
    // specifically (both bonuses can apply to the same award).
    const seals = success ? Math.round(SEALS_REWARD[tier] * roomBonusMultiplier(guildData?.rooms, 'warroom')) : 0;
    const xp = success
      ? Math.round(XP_REWARD[tier] * roomBonusMultiplier(guildData?.rooms, 'warroom') * roomBonusMultiplier(guildData?.rooms, 'library'))
      : 0;

    tx.update(expeditionRef, { resolved: true, success, claimed: true, lootItemId });
    const charUpdate: Record<string, unknown> = { activeExpeditionId: FieldValue.delete() };
    if (success) {
      charUpdate.expeditionSeals = FieldValue.increment(seals);
      tx.update(guildRef, { xp: FieldValue.increment(xp) });
    }
    tx.update(charRef, charUpdate);
    if (lootItemId) {
      tx.update(db.collection('characters').doc(uid).collection('inventory').doc('main'), {
        [`items.${lootItemId}`]: FieldValue.increment(1),
      });
    }

    return { success, seals, xp, lootItemId };
  });

  return result;
});

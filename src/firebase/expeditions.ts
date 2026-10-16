import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db, functions } from './config';
import type { ExpeditionDoc, ExpeditionTier } from '../gameData/expeditions';

function unwrapCallableError(err: unknown): Error {
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return new Error(message);
}

function parseTimestamp(raw: unknown): Date {
  const asTimestamp = raw as { toDate?: () => Date; _seconds?: number };
  if (typeof asTimestamp?.toDate === 'function') return asTimestamp.toDate();
  if (typeof asTimestamp?._seconds === 'number') return new Date(asTimestamp._seconds * 1000);
  return new Date(0);
}

function parseExpedition(id: string, data: Record<string, unknown>): ExpeditionDoc {
  return {
    id,
    guildId: data.guildId as string,
    ownerUid: data.ownerUid as string,
    tier: data.tier as ExpeditionTier,
    startedAt: parseTimestamp(data.startedAt),
    completesAt: parseTimestamp(data.completesAt),
    successChance: data.successChance as number,
    party: (data.party as ExpeditionDoc['party']) ?? [],
    resolved: !!data.resolved,
    success: (data.success as boolean | null) ?? null,
    claimed: !!data.claimed,
    lootItemId: (data.lootItemId as string | null) ?? null,
  };
}

export async function startExpedition(guildId: string, tier: ExpeditionTier): Promise<string> {
  try {
    const call = httpsCallable<{ guildId: string; tier: ExpeditionTier }, { expeditionId: string }>(functions, 'startExpedition');
    const result = await call({ guildId, tier });
    return result.data.expeditionId;
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export interface ClaimExpeditionResult {
  success: boolean;
  seals: number;
  xp: number;
  lootItemId: string | null;
}

export async function claimExpedition(expeditionId: string): Promise<ClaimExpeditionResult> {
  try {
    const call = httpsCallable<{ expeditionId: string }, ClaimExpeditionResult>(functions, 'claimExpedition');
    const result = await call({ expeditionId });
    return result.data;
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function getExpedition(expeditionId: string): Promise<ExpeditionDoc | null> {
  const snap = await getDoc(doc(db, 'expeditions', expeditionId));
  if (!snap.exists()) return null;
  return parseExpedition(snap.id, snap.data());
}

// The character's own active (unresolved) expedition, if any — used to
// recover from a stale/missing activeExpeditionId pointer (that field is
// just a UI convenience, never authoritative — see functions/src/
// expeditions.ts's module comment).
export async function getMyActiveExpedition(uid: string): Promise<ExpeditionDoc | null> {
  const q = query(collection(db, 'expeditions'), where('ownerUid', '==', uid), where('resolved', '==', false), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return parseExpedition(snap.docs[0].id, snap.docs[0].data());
}

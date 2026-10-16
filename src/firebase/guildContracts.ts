import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from './config';
import type { ContractRow, GuildWeek } from '../gameData/guildContracts';

function unwrapCallableError(err: unknown): Error {
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return new Error(message);
}

// A Firestore Timestamp arrives in two different shapes depending on HOW it
// was read: a genuine Timestamp object (with .toDate()) via getDoc/
// onSnapshot, but a plain {_seconds, _nanoseconds} JSON object via an
// onCall() callable's response (the callable SDK does not rehydrate
// Firestore types) — getOrCreateGuildWeek below is a callable, getGuildWeek
// is a direct getDoc, so this needs to handle both.
function parseTimestamp(raw: unknown): Date | null {
  if (!raw || typeof raw !== 'object') return null;
  const asTimestamp = raw as { toDate?: () => Date; _seconds?: number };
  if (typeof asTimestamp.toDate === 'function') return asTimestamp.toDate();
  if (typeof asTimestamp._seconds === 'number') return new Date(asTimestamp._seconds * 1000);
  return null;
}

function parseContractRow(raw: Record<string, unknown>): ContractRow {
  return {
    category: raw.category as ContractRow['category'],
    materialId: (raw.materialId as string | null) ?? null,
    label: raw.label as string,
    requirement: raw.requirement as number,
    progress: raw.progress as number,
    playerContributions: (raw.playerContributions as Record<string, number>) ?? {},
    companionContributions: (raw.companionContributions as Record<string, number>) ?? {},
    claims: (raw.claims as Record<string, boolean>) ?? {},
    completedAt: parseTimestamp(raw.completedAt),
  };
}

// Ensures/fetches the current ISO week's contracts for a guild — call this
// every time the Contracts tab opens. It's a cheap read on every call after
// the first one this week (see functions/src/contracts.ts's own comment).
export async function getOrCreateGuildWeek(guildId: string): Promise<GuildWeek> {
  try {
    const call = httpsCallable<{ guildId: string }, { guildId: string; weekId: string; contracts: Record<string, unknown>[] }>(
      functions,
      'getOrCreateGuildWeek',
    );
    const result = await call({ guildId });
    return {
      guildId: result.data.guildId,
      weekId: result.data.weekId,
      contracts: result.data.contracts.map(parseContractRow),
    };
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function getGuildWeek(guildId: string, weekId: string): Promise<GuildWeek | null> {
  const snap = await getDoc(doc(db, 'guildWeeks', `${guildId}_${weekId}`));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    guildId: data.guildId,
    weekId: data.weekId,
    contracts: (data.contracts as Record<string, unknown>[]).map(parseContractRow),
  };
}

export async function contributeMaterial(guildId: string, weekId: string, contractIndex: number, amount: number): Promise<void> {
  try {
    const call = httpsCallable(functions, 'contributeMaterial');
    await call({ guildId, weekId, contractIndex, amount });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function reportHuntingKills(guildId: string, weekId: string, contractIndex: number, killCount: number): Promise<void> {
  try {
    const call = httpsCallable(functions, 'reportHuntingKills');
    await call({ guildId, weekId, contractIndex, killCount });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function claimContractReward(guildId: string, weekId: string, contractIndex: number): Promise<number> {
  try {
    const call = httpsCallable<{ guildId: string; weekId: string; contractIndex: number }, { gold: number }>(
      functions,
      'claimContractReward',
    );
    const result = await call({ guildId, weekId, contractIndex });
    return result.data.gold;
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function claimCompanionContributions(guildId: string, weekId: string): Promise<void> {
  try {
    const call = httpsCallable(functions, 'claimCompanionContributions');
    await call({ guildId, weekId });
  } catch {
    // Best-effort, same posture as refreshGuildMemberProfile — never block
    // the Contracts tab on this.
  }
}

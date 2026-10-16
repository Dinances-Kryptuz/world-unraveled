import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import type { RoomId } from '../gameData/guildHeadquarters';

function unwrapCallableError(err: unknown): Error {
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return new Error(message);
}

export async function donateGoldToGuild(guildId: string, amount: number): Promise<void> {
  try {
    const call = httpsCallable(functions, 'donateGoldToGuild');
    await call({ guildId, amount });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function upgradeGuildRoom(guildId: string, roomId: RoomId): Promise<void> {
  try {
    const call = httpsCallable(functions, 'upgradeGuildRoom');
    await call({ guildId, roomId });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

export async function completeRestorationProject(guildId: string, projectId: string): Promise<void> {
  try {
    const call = httpsCallable(functions, 'completeRestorationProject');
    await call({ guildId, projectId });
  } catch (err) {
    throw unwrapCallableError(err);
  }
}

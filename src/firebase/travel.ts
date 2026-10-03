import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Character } from '../types/character';
import { travelMinutes } from '../gameData/travel';

// Both departedAt and arrivesAt come from the same client clock rather than
// serverTimestamp() — a flight's countdown is a purely local-clock concept
// (the UI's own ticking display), and serverTimestamp()'s "resolved only
// after commit" sentinel can't be used to compute arrivesAt = departedAt +
// duration before the write even happens. Internal consistency between the
// two fields is what matters here, not server authority over wall-clock time.
export async function startTravel(
  uid: string,
  character: Character,
  toZoneId: string
): Promise<{ success: boolean; reason?: string }> {
  if (character.travel) return { success: false, reason: 'Already in the air.' };
  if (toZoneId === character.currentZoneId) return { success: false, reason: 'Already there.' };
  if (character.currentActivity.type !== null) {
    return { success: false, reason: 'Finish your current activity before traveling.' };
  }

  const minutes = travelMinutes(character.currentZoneId, toZoneId);
  const departedAt = new Date();
  const arrivesAt = new Date(departedAt.getTime() + minutes * 60_000);

  await updateDoc(doc(db, 'characters', uid), {
    travel: {
      fromZoneId: character.currentZoneId,
      toZoneId,
      departedAt: Timestamp.fromDate(departedAt),
      arrivesAt: Timestamp.fromDate(arrivesAt),
    },
  });
  return { success: true };
}

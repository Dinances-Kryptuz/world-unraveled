import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Character } from '../types/character';
import type { ProfessionId } from '../gameData/types';

const STARTING_GATHERING_PROFESSIONS: ProfessionId[] = ['skinning', 'mining', 'herbalism'];
const STARTING_PRODUCTION_PROFESSIONS: ProfessionId[] = ['leatherworking'];
const ALL_V1_PROFESSIONS = [...STARTING_GATHERING_PROFESSIONS, ...STARTING_PRODUCTION_PROFESSIONS];

/**
 * Loads the player's character doc, converting Firestore Timestamps to JS
 * Dates so the rest of the app (and the activity engine, which takes Date
 * objects) never has to think about Firestore-specific types.
 */
export async function getCharacter(uid: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, 'characters', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    currentActivity: {
      ...data.currentActivity,
      startedAt: data.currentActivity?.startedAt
        ? (data.currentActivity.startedAt as Timestamp).toDate()
        : null,
    },
  } as Character;
}

/**
 * Creates a brand-new character for this uid, plus its inventory doc.
 * One character per account in V1 — this should only ever be called when
 * getCharacter() has already confirmed none exists yet.
 */
export async function createCharacter(uid: string, name: string): Promise<void> {
  const professions = Object.fromEntries(
    ALL_V1_PROFESSIONS.map((id) => [id, { level: 1, xp: 0, unlockedTier: 'apprentice' as const }])
  );

  const character = {
    name,
    createdAt: serverTimestamp(),
    level: 1,
    xp: 0,
    gold: 0,
    voidShards: 0,
    equipment: {
      weapon: null,
      chest: null,
      helmet: null,
      gloves: null,
      legs: null,
      boots: null,
      ring: null,
    },
    professions,
    currentActivity: { type: null, targetId: null, zoneId: null, startedAt: null },
  };

  await setDoc(doc(db, 'characters', uid), character);
  await setDoc(doc(db, 'characters', uid, 'inventory', 'main'), { items: {} });
}

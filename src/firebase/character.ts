import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { db } from './config';
import type { Character } from '../types/character';
import type { ProfessionId } from '../gameData/types';
import { professionXpForLevel } from '../gameData/xpTables';

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

export async function startActivity(
  uid: string,
  activity: { type: 'combat' | 'gathering' | 'crafting'; targetId: string; zoneId: string }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    currentActivity: {
      type: activity.type,
      targetId: activity.targetId,
      zoneId: activity.zoneId,
      startedAt: serverTimestamp(),
    },
  });
}

export async function stopActivity(uid: string): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    currentActivity: { type: null, targetId: null, zoneId: null, startedAt: null },
  });
}

export async function applyCombatResult(
  uid: string,
  result: { xpGained: number; goldGained: number; loot: { itemId: string; quantity: number }[] }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    xp: increment(result.xpGained),
    gold: increment(result.goldGained),
    'currentActivity.startedAt': serverTimestamp(), // reset the clock now that this chunk is saved
  });

  if (result.loot.length > 0) {
    const inventoryUpdates: Record<string, unknown> = {};
    for (const drop of result.loot) {
      inventoryUpdates[`items.${drop.itemId}`] = increment(drop.quantity);
    }
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
  }
}

export async function setCharacterLevel(uid: string, level: number): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), { level });
}

export async function applyGatheringResult(
  uid: string,
  profession: ProfessionId,
  result: { xpGained: number; itemId: string; quantity: number }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}.xp`]: increment(result.xpGained),
  });

  if (result.quantity > 0) {
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
      [`items.${result.itemId}`]: increment(result.quantity),
    });
  }
}

export async function checkAndApplyProfessionLevelUp(uid: string, profession: ProfessionId): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const state = character.professions[profession];
  let newLevel = state.level;
  while (state.xp >= professionXpForLevel(newLevel + 1)) {
    newLevel++;
  }
  if (newLevel !== state.level) {
    await updateDoc(doc(db, 'characters', uid), {
      [`professions.${profession}.level`]: newLevel,
    });
  }
}

export async function applyCraftingResult(
  uid: string,
  profession: ProfessionId,
  result: {
    xpGained: number;
    resultItemId: string;
    resultQuantity: number;
    materialsConsumed: { itemId: string; quantity: number }[];
  }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}.xp`]: increment(result.xpGained),
  });

  const inventoryUpdates: Record<string, unknown> = {
    [`items.${result.resultItemId}`]: increment(result.resultQuantity),
  };
  for (const m of result.materialsConsumed) {
    inventoryUpdates[`items.${m.itemId}`] = increment(-m.quantity);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
}

export async function equipItem(uid: string, slot: EquipmentSlot, itemId: string): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const previouslyEquipped = character.equipment[slot];

  const inventoryUpdates: Record<string, unknown> = {
    [`items.${itemId}`]: increment(-1),
  };
  if (previouslyEquipped) {
    inventoryUpdates[`items.${previouslyEquipped}`] = increment(1);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);

  await updateDoc(doc(db, 'characters', uid), {
    [`equipment.${slot}`]: itemId,
  });
}

export async function unequipItem(uid: string, slot: EquipmentSlot): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const currentlyEquipped = character.equipment[slot];
  if (!currentlyEquipped) return;

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${currentlyEquipped}`]: increment(1),
  });
  await updateDoc(doc(db, 'characters', uid), {
    [`equipment.${slot}`]: null,
  });
}

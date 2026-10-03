import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { COMPANIONS, checkRecruitCompanion, emptyCompanionEquipment, MAX_ACTIVE_COMPANIONS, dungeonCompanionFee } from '../gameData/companions';
import { canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import { DUNGEONS } from '../gameData/dungeons';
import { ZONE_TIER } from '../gameData/zones';
import type { EquipmentSlot } from '../gameData/types';

export interface CompanionActionResult {
  success: boolean;
  reason?: string;
}

export async function recruitCompanion(uid: string, companionId: string): Promise<CompanionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const alreadyRecruited = Object.keys(character.companions);
  const check = checkRecruitCompanion(companionId, alreadyRecruited, character.level, character.gold);
  if (!check.ok) return { success: false, reason: check.reason };

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-check.goldCost),
    [`companions.${companionId}`]: { equipment: emptyCompanionEquipment() },
  });
  return { success: true };
}

// Adds one recruited companion to the active party (up to
// MAX_ACTIVE_COMPANIONS at once) — never affects recruitment or gear.
export async function addCompanionToParty(uid: string, companionId: string): Promise<CompanionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (!character.companions[companionId]) return { success: false, reason: 'Not recruited.' };
  if (character.activeCompanionIds.includes(companionId)) {
    return { success: false, reason: 'Already in your party.' };
  }
  if (character.activeCompanionIds.length >= MAX_ACTIVE_COMPANIONS) {
    return { success: false, reason: `Only ${MAX_ACTIVE_COMPANIONS} companions can join you at once.` };
  }

  await updateDoc(doc(db, 'characters', uid), {
    activeCompanionIds: [...character.activeCompanionIds, companionId],
  });
  return { success: true };
}

// Removing a companion that isn't currently active is a harmless no-op,
// same "tolerate, don't throw" posture as unequipItem on an empty slot.
export async function removeCompanionFromParty(uid: string, companionId: string): Promise<CompanionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  await updateDoc(doc(db, 'characters', uid), {
    activeCompanionIds: character.activeCompanionIds.filter((id) => id !== companionId),
  });
  return { success: true };
}

// Mirrors firebase/character.ts's equipItem exactly, just scoped to a
// companion's own equipment map instead of the player's — gear moves out
// of the SAME shared inventory either way, so there's one pool of loot the
// player chooses to wear themselves or hand to their companion.
export async function equipCompanionItem(
  uid: string,
  companionId: string,
  slot: EquipmentSlot,
  itemId: string
): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const companionState = character.companions[companionId];
  const def = COMPANIONS[companionId];
  if (!companionState || !def) return;

  const item = ITEMS[itemId];
  if (!item || !canClassEquip(def.class, item)) {
    throw new Error(`${def.name} cannot equip ${item?.name ?? itemId} (${item?.armorType} armor)`);
  }

  const previouslyEquipped = companionState.equipment[slot];
  const inventoryUpdates: Record<string, unknown> = {
    [`items.${itemId}`]: increment(-1),
  };
  if (previouslyEquipped) {
    inventoryUpdates[`items.${previouslyEquipped}`] = increment(1);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);

  await updateDoc(doc(db, 'characters', uid), {
    [`companions.${companionId}.equipment.${slot}`]: itemId,
  });
}

export interface DungeonFeeResult {
  success: boolean;
  reason?: string;
  costPaid?: number;
}

// Charges the companion wage for one dungeon run, computed server-side from
// the dungeon's own zone tier and the character's OWN active-party size
// (never trusted from the caller) — same "don't trust the client's math"
// posture as checkRecruitCompanion/checkLearnProfession elsewhere in this
// file/professions.ts. Called right before a dungeon run starts; failing it
// (not enough gold) should block entry entirely.
export async function payDungeonCompanionFee(uid: string, dungeonId: string): Promise<DungeonFeeResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  const dungeon = DUNGEONS[dungeonId];
  if (!dungeon) return { success: false, reason: 'Unknown dungeon.' };

  const fee = dungeonCompanionFee(ZONE_TIER[dungeon.zoneId] ?? 1, character.activeCompanionIds.length);
  if (fee === 0) return { success: true, costPaid: 0 };
  if (character.gold < fee) {
    return { success: false, reason: `Your party needs ${fee} gold up front for this run (you have ${Math.floor(character.gold)}).` };
  }

  await updateDoc(doc(db, 'characters', uid), { gold: increment(-fee) });
  return { success: true, costPaid: fee };
}

export async function unequipCompanionItem(uid: string, companionId: string, slot: EquipmentSlot): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const companionState = character.companions[companionId];
  if (!companionState) return;
  const currentlyEquipped = companionState.equipment[slot];
  if (!currentlyEquipped) return;

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${currentlyEquipped}`]: increment(1),
  });
  await updateDoc(doc(db, 'characters', uid), {
    [`companions.${companionId}.equipment.${slot}`]: null,
  });
}

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { COMPANIONS, checkRecruitCompanion, emptyCompanionEquipment } from '../gameData/companions';
import { canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
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

// null dismisses the active companion (solo again) — otherwise the id must
// already be recruited. Swapping which companion is active never affects
// recruitment or either companion's gear.
export async function setActiveCompanion(uid: string, companionId: string | null): Promise<CompanionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (companionId !== null && !character.companions[companionId]) {
    return { success: false, reason: 'Not recruited.' };
  }

  await updateDoc(doc(db, 'characters', uid), { activeCompanionId: companionId });
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

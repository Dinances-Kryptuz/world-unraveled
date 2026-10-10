import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { getInventory } from './inventory';
import { getBank } from './bank';
import { getAccount } from './characterSlots';
import { checkNewlyUnlocked } from '../gameData/achievements';
import { ITEMS } from '../gameData/items';
import { equippedItemId } from '../gameData/equipmentStats';
import type { Character } from '../types/character';

// Reconciles both Phase 5 lists against current state — called when the
// Collection screen opens (see components/CollectionScreen.tsx), not
// eagerly at every loot/craft/purchase/quest-complete call site. Both lists
// only ever grow (new ids appended, nothing ever removed), so running this
// late just delays when a newly-met condition shows up as "collected" or
// "unlocked," never loses one. Returns the merged lists so the caller can
// update its own view without a second read.
export async function reconcileCollectionAndAchievements(
  uid: string,
  character: Character
): Promise<{ collectedItemIds: string[]; unlockedAchievementIds: string[] }> {
  const [inventory, bank, account] = await Promise.all([getInventory(uid), getBank(uid), getAccount(uid)]);

  const alreadyCollected = new Set(character.collectedItemIds);
  const heldItemIds = new Set([...Object.keys(inventory.items), ...Object.keys(bank.items)]);
  for (const instance of Object.values(inventory.equipmentInstances ?? {})) {
    heldItemIds.add(instance.itemId);
  }
  for (const slot of Object.values(character.equipment)) {
    const itemId = equippedItemId(slot);
    if (itemId) heldItemIds.add(itemId);
  }
  const newlyCollected: string[] = [];
  for (const itemId of heldItemIds) {
    if (alreadyCollected.has(itemId)) continue;
    if (ITEMS[itemId]?.type !== 'equipment') continue;
    newlyCollected.push(itemId);
  }

  const newlyUnlocked = checkNewlyUnlocked(character, account);

  const update: Record<string, unknown> = {};
  if (newlyCollected.length > 0) update.collectedItemIds = [...character.collectedItemIds, ...newlyCollected];
  if (newlyUnlocked.length > 0) update.unlockedAchievementIds = [...character.unlockedAchievementIds, ...newlyUnlocked];
  if (Object.keys(update).length > 0) {
    await updateDoc(doc(db, 'characters', uid), update);
  }

  return {
    collectedItemIds: (update.collectedItemIds as string[] | undefined) ?? character.collectedItemIds,
    unlockedAchievementIds: (update.unlockedAchievementIds as string[] | undefined) ?? character.unlockedAchievementIds,
  };
}

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getInventory } from './inventory';
import { ITEMS } from '../gameData/items';
import { ENCHANTS } from '../gameData/enchanting';
import type { EquipmentSlot } from '../gameData/types';

export interface EnchantActionResult {
  success: boolean;
  reason?: string;
}

// Consuming a crafted scroll is free and instant — the skill/material/gold
// cost was already paid once when the scroll itself was crafted (see
// recipes.ts's "Enchanting scrolls" section, resolved through the normal
// resolveCraftingOffline pipeline like any other profession's goods, same as
// CraftingScreen.tsx). This replaces the old applyEnchant, which paid
// materials/gold and rolled profession XP at APPLY time — see
// gameData/enchanting.ts's module doc comment for the full reasoning.
export async function useEnchantScroll(uid: string, scrollItemId: string): Promise<EnchantActionResult> {
  const scrollItem = ITEMS[scrollItemId];
  const enchant = scrollItem?.scrollEnchantId ? ENCHANTS[scrollItem.scrollEnchantId] : undefined;
  if (!scrollItem || !enchant) return { success: false, reason: 'Unknown scroll.' };

  const inventory = await getInventory(uid);
  if ((inventory.items[scrollItemId] ?? 0) < 1) return { success: false, reason: "You don't have that scroll." };

  await updateDoc(doc(db, 'characters', uid), {
    [`enchantments.${enchant.slot}`]: enchant.id,
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${scrollItemId}`]: increment(-1),
  });
  return { success: true };
}

export async function removeEnchant(uid: string, slot: EquipmentSlot): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`enchantments.${slot}`]: null,
  });
}

// One autosave cycle's worth of a 'disenchanting' activity (see
// gameData/craftingEngine.ts's resolveDisenchantOffline and
// components/DisenchantingScreen.tsx, which computes `result` and calls
// this the same way CraftingScreen calls applyCraftingProfessionResult) —
// writes consumed stock, yielded materials, and profession XP/level.
export async function applyDisenchantResult(
  uid: string,
  itemId: string,
  result: {
    itemsDisenchanted: number;
    yieldItemId: string;
    yieldQuantity: number;
    newSkillLevel: number;
    newSkillXp: number;
  }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    'professions.enchanting.level': result.newSkillLevel,
    'professions.enchanting.xp': result.newSkillXp,
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-result.itemsDisenchanted),
    [`items.${result.yieldItemId}`]: increment(result.yieldQuantity),
  });
}

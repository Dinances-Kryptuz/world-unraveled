import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getInventory, grantInventoryItems } from './inventory';
import { ITEMS } from '../gameData/items';
import { ENCHANTS, ENCHANT_SCROLL_CHARGES } from '../gameData/enchanting';
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
    // Enchanting overhaul's charge model — ALWAYS exactly 100, a flat
    // overwrite never an increment, so replacing a slot's enchant (even
    // with the same one) discards whatever charges were left rather than
    // refunding or combining them — see Character.enchantmentCharges's
    // doc comment and ENCHANT_SCROLL_CHARGES below.
    [`enchantmentCharges.${enchant.slot}`]: ENCHANT_SCROLL_CHARGES,
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${scrollItemId}`]: increment(-1),
  });
  return { success: true };
}

export async function removeEnchant(uid: string, slot: EquipmentSlot): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`enchantments.${slot}`]: null,
    [`enchantmentCharges.${slot}`]: null,
  });
}

// One autosave cycle's worth of a 'disenchanting' activity (see
// gameData/craftingEngine.ts's resolveDisenchantOffline and
// components/DisenchantingScreen.tsx, which computes `result` and calls
// this the same way CraftingScreen calls applyCraftingProfessionResult) —
// writes consumed stock, yielded materials, and profession XP/level.
//
// `instanceId` disenchants a specific randomized-stat roll (gameData/
// equipmentRolls.ts) from Inventory.equipmentInstances rather than a plain
// `items` stack — required so disenchanting targets the exact variant the
// player picked (two different rolls of the same base item are otherwise
// indistinguishable stacks). Since equipping an instance already removes it
// from its available (unequipped) quantity — see firebase/
// equipmentInstances.ts's doc comment — a currently-equipped instance is
// never part of this count, closing the "disenchant what you're wearing"
// exploit with no extra guard needed here.
export async function applyDisenchantResult(
  uid: string,
  itemId: string,
  result: {
    itemsDisenchanted: number;
    yieldItemId: string;
    yieldQuantity: number;
    newSkillLevel: number;
    newSkillXp: number;
  },
  instanceId?: string
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    'professions.enchanting.level': result.newSkillLevel,
    'professions.enchanting.xp': result.newSkillXp,
  });
  // The disenchanted item is consumed regardless of whether the yield fits
  // — write that FIRST so a stack dropping to 0 (freeing a bag slot) is
  // already reflected before the capped grant below reads occupancy.
  const consumeUpdate = instanceId
    ? { [`equipmentInstances.${instanceId}.quantity`]: increment(-result.itemsDisenchanted) }
    : { [`items.${itemId}`]: increment(-result.itemsDisenchanted) };
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), consumeUpdate);
  if (result.yieldQuantity > 0) {
    await grantInventoryItems(uid, [{ itemId: result.yieldItemId, quantity: result.yieldQuantity }]);
  }
}

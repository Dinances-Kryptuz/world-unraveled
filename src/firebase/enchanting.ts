import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getInventory, grantInventoryItems, isLocked } from './inventory';
import { ITEMS } from '../gameData/items';
import { ENCHANTS, ENCHANT_SCROLL_CHARGES, splitDisenchantUpgradeYield } from '../gameData/enchanting';
import type { EquipmentSlot } from '../gameData/types';
import type { Character } from '../types/character';

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

// Decrements active enchants' charges by how many matching combat events
// occurred since the last call — same "count events from the tick batch,
// write once" shape as firebase/consumables.ts's consumeBuffCharges, with
// a THIRD trigger (completedEncounters, driven by kill count) for passive
// stat enchants rather than a per-attack event. Charges never go below 0
// and an exhausted enchant stays equipped (unlike a depleted buff, which
// is removed outright) — getEquipmentStatBonuses already stops crediting
// its stat bonus the moment charges hit 0, so no further gating is needed
// here. offensive_action counts BOTH landed and missed player attacks
// (CombatScreen/DungeonScreen's own damage_out + miss_out tally) since an
// offensive enchant's charge is spent per eligible outgoing attack
// regardless of whether it lands or its own proc fires; damage_taken
// counts only landed incoming hits (damage_in), so an avoided attack
// never costs a defensive enchant a charge.
export async function consumeEnchantCharges(
  uid: string,
  character: Character,
  triggerCounts: { offensive_action: number; damage_taken: number; completedEncounters: number }
): Promise<void> {
  const update: Record<string, unknown> = {};
  for (const [slot, enchantId] of Object.entries(character.enchantments) as [EquipmentSlot, string | undefined][]) {
    if (!enchantId) continue;
    const enchant = ENCHANTS[enchantId];
    if (!enchant) continue;
    const currentCharges = character.enchantmentCharges?.[slot];
    // Not yet migrated to the charge model (see Character.enchantmentCharges's
    // doc comment) — nothing to decrement until it's next (re-)applied.
    if (currentCharges === undefined) continue;
    const count =
      enchant.category === 'offensive'
        ? triggerCounts.offensive_action
        : enchant.category === 'defensive'
          ? triggerCounts.damage_taken
          : triggerCounts.completedEncounters;
    if (count <= 0) continue;
    const remaining = Math.max(0, currentCharges - count);
    if (remaining !== currentCharges) update[`enchantmentCharges.${slot}`] = remaining;
  }
  if (Object.keys(update).length > 0) {
    await updateDoc(doc(db, 'characters', uid), update);
  }
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
  // Equipment Locking overhaul — revalidated here (not just when the
  // activity was started) since a player can lock an item mid-disenchant;
  // a locked item is never actually consumed/destroyed, full stop, even if
  // the activity's own offline-elapsed-time math already decided time has
  // passed. Profession XP for the (now-void) attempt is intentionally not
  // awarded either, matching "locked equipment cannot be disenchanted" as
  // an absolute rule rather than a soft preference.
  const inventory = await getInventory(uid);
  if (isLocked(inventory, instanceId ?? itemId)) return;

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
    const item = ITEMS[itemId];
    // Small rare chance of the next-tier material instead of the normal
    // one (e.g. Lesser Magic Essence instead of Strange Dust) — see
    // splitDisenchantUpgradeYield's doc comment. Falls back to granting
    // the whole yield as the normal material if this item has no tier
    // above it to roll into.
    const split = item
      ? splitDisenchantUpgradeYield(item, result.yieldQuantity)
      : { upgradedItemId: null, upgradedQuantity: 0, baseQuantity: result.yieldQuantity };
    const grants = [{ itemId: result.yieldItemId, quantity: split.baseQuantity }];
    if (split.upgradedItemId && split.upgradedQuantity > 0) {
      grants.push({ itemId: split.upgradedItemId, quantity: split.upgradedQuantity });
    }
    await grantInventoryItems(uid, grants.filter((g) => g.quantity > 0));
  }
}

// Continuous Disenchanting Queue overhaul — the multi-item counterpart to
// applyDisenchantResult above, for a single resolveDisenchantQueueOffline
// call that may have touched several distinct items in one autosave/claim
// cycle. Every item consumption and every yield grant lands in as FEW
// Firestore writes as possible (one updateDoc per doc, not one per item —
// see this function's two updateDoc calls below), per the design brief's
// explicit "do not create a Firestore write for every item completion."
// Lock revalidation already happened one layer up, in
// DisenchantingScreen's autosave — by the time `perItem` exists, every
// entry in it was built from an item the resolver was never even handed if
// it was locked at that moment (see DisenchantingScreen.tsx's doc comment
// for why that's the right place to revalidate, not here).
export async function applyDisenchantQueueResult(
  uid: string,
  perItem: { itemId: string; instanceId?: string; itemsDisenchanted: number; yieldItemId: string; yieldQuantity: number }[],
  newSkillLevel: number,
  newSkillXp: number
): Promise<void> {
  if (perItem.length === 0) return;

  await updateDoc(doc(db, 'characters', uid), {
    'professions.enchanting.level': newSkillLevel,
    'professions.enchanting.xp': newSkillXp,
  });

  // Consume every disenchanted item/instance in ONE write — write this
  // FIRST so a stack dropping to 0 (freeing a bag slot) is already
  // reflected before the capped yield grant below reads occupancy, same
  // ordering as applyDisenchantResult above.
  const consumeUpdate: Record<string, unknown> = {};
  for (const entry of perItem) {
    const path = entry.instanceId ? `equipmentInstances.${entry.instanceId}.quantity` : `items.${entry.itemId}`;
    consumeUpdate[path] = increment(-entry.itemsDisenchanted);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), consumeUpdate);

  // Combine same-material yields (several queued items commonly disenchant
  // into the same dust/essence) into one grantInventoryItems call — now
  // also splitting off each entry's small rare upgraded-material chance
  // (see splitDisenchantUpgradeYield's doc comment) before combining, so
  // e.g. two different items both rolling a bit of Lesser Magic Essence
  // still land in the same grant line.
  const yieldsByItemId = new Map<string, number>();
  for (const entry of perItem) {
    if (entry.yieldQuantity <= 0) continue;
    const item = ITEMS[entry.itemId];
    const split = item
      ? splitDisenchantUpgradeYield(item, entry.yieldQuantity)
      : { upgradedItemId: null, upgradedQuantity: 0, baseQuantity: Math.floor(entry.yieldQuantity) };
    yieldsByItemId.set(entry.yieldItemId, (yieldsByItemId.get(entry.yieldItemId) ?? 0) + split.baseQuantity);
    if (split.upgradedItemId && split.upgradedQuantity > 0) {
      yieldsByItemId.set(split.upgradedItemId, (yieldsByItemId.get(split.upgradedItemId) ?? 0) + split.upgradedQuantity);
    }
  }
  if (yieldsByItemId.size > 0) {
    await grantInventoryItems(
      uid,
      Array.from(yieldsByItemId, ([itemId, quantity]) => ({ itemId, quantity })).filter((g) => g.quantity > 0)
    );
  }
}

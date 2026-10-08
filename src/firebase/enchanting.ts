import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory } from './inventory';
import { ITEMS } from '../gameData/items';
import { ENCHANTS, isDisenchantable, disenchantRequiredSkill, disenchantXpAward, disenchantYield } from '../gameData/enchanting';
import { resolveEnchantApply, resolveDisenchant } from '../gameData/craftingEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import type { EquipmentSlot } from '../gameData/types';

export interface EnchantActionResult {
  success: boolean;
  reason?: string;
}

// Applies (or overwrites) the enchantment on a slot — see
// Character.enchantments's doc comment for why this binds to the slot
// rather than a specific item. Requires Enchanting skill, consumes
// materials and gold, same validate-then-spend pattern as every other
// profession action in this project. Grants profession XP (via
// craftingEngine.ts's resolveEnchantApply, keyed to this one enchant's
// Recipe Mastery) for the FIRST time — this used to only ever gate on
// skill, never raise it.
export async function applyEnchant(uid: string, enchantId: string): Promise<EnchantActionResult> {
  const enchant = ENCHANTS[enchantId];
  if (!enchant) return { success: false, reason: 'Unknown enchant.' };

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const prof = getProfessionState(character.professions, 'enchanting');
  if (prof.level < enchant.requiredSkill) {
    return { success: false, reason: `Requires Enchanting skill ${enchant.requiredSkill} (have ${prof.level}).` };
  }
  if (character.gold < enchant.goldCost) {
    return { success: false, reason: `Requires ${enchant.goldCost} gold.` };
  }

  const inventory = await getInventory(uid);
  for (const m of enchant.materials) {
    if ((inventory.items[m.itemId] ?? 0) < m.quantity) {
      return { success: false, reason: `Missing materials: ${ITEMS[m.itemId]?.name ?? m.itemId}.` };
    }
  }

  const masteryState = prof.mastery?.[enchantId] ?? { level: 0, xp: 0 };
  const cap = maxSkillForUnlockedTier('enchanting', prof.unlockedTier);
  const xp = resolveEnchantApply(enchant.xpAward, enchant.requiredSkill, prof.level, prof.xp, masteryState.level, masteryState.xp, cap);

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-enchant.goldCost),
    [`enchantments.${enchant.slot}`]: enchantId,
    [`professions.enchanting.level`]: xp.finalSkill,
    [`professions.enchanting.xp`]: xp.finalSkillXp,
    [`professions.enchanting.mastery.${enchantId}`]: { level: xp.finalMasteryLevel, xp: xp.finalMasteryXp },
  });
  const inventoryUpdates: Record<string, unknown> = {};
  for (const m of enchant.materials) {
    inventoryUpdates[`items.${m.itemId}`] = increment(-m.quantity);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
  return { success: true };
}

export async function removeEnchant(uid: string, slot: EquipmentSlot): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`enchantments.${slot}`]: null,
  });
}

// Disenchants ONE unit of an equipment item from inventory into Enchanting
// materials (dust/essence/crystal, per gameData/enchanting.ts's formula) —
// not a Recipe, since any sufficiently-leveled equipment item qualifies,
// not just a fixed, handwritten list. Grants profession XP (via
// craftingEngine.ts's resolveDisenchant) but no Recipe Mastery — there's no
// fixed recipe id to key it by.
export async function disenchantItem(uid: string, itemId: string): Promise<EnchantActionResult> {
  const item = ITEMS[itemId];
  if (!item || !isDisenchantable(item)) return { success: false, reason: 'That can’t be disenchanted.' };

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const prof = getProfessionState(character.professions, 'enchanting');
  const required = disenchantRequiredSkill(item);
  if (prof.level < required) {
    return { success: false, reason: `Requires Enchanting skill ${required} (have ${prof.level}).` };
  }

  const inventory = await getInventory(uid);
  if ((inventory.items[itemId] ?? 0) <= 0) return { success: false, reason: 'You don’t have one.' };

  const yielded = disenchantYield(item);
  const cap = maxSkillForUnlockedTier('enchanting', prof.unlockedTier);
  const xp = resolveDisenchant(disenchantXpAward(item), required, prof.level, prof.xp, cap);

  await updateDoc(doc(db, 'characters', uid), {
    [`professions.enchanting.level`]: xp.finalSkill,
    [`professions.enchanting.xp`]: xp.finalSkillXp,
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-1),
    [`items.${yielded.itemId}`]: increment(yielded.quantity),
  });
  return { success: true };
}

import { doc, updateDoc, serverTimestamp, increment, deleteField } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory } from './inventory';
import { ITEMS } from '../gameData/items';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import type { Character } from '../types/character';
import type { ItemDef, BuffCategory } from '../gameData/types';
import { BUFF_CATEGORY_TRIGGER } from '../gameData/buffs';

// Builds the activeBuffs.<category> write for a consumable with a buff
// effect — charge-based (offensive/defensive potions) stores `charges`,
// duration-based (stat potions, Well Fed food) stores `expiresAt`. Writing
// this key always REPLACES whatever was there, which is exactly the "only
// one buff of a category at a time" rule the design brief asks for — no
// extra stacking check needed.
function buffUpdateForItem(item: ItemDef, itemId: string, now: Date): Record<string, unknown> {
  const buff = item.consumableEffect?.buff;
  if (!buff) return {};
  const value =
    buff.charges !== undefined
      ? { itemId, charges: buff.charges }
      : { itemId, expiresAt: new Date(now.getTime() + (buff.durationSeconds ?? 0) * 1000) };
  return { [`activeBuffs.${buff.category}`]: value };
}

// Seconds left before an item can be used again — 0 if it's never been used
// or its cooldown has already elapsed. Shared by the out-of-combat
// (Inventory) and in-combat (CombatScreen/DungeonScreen) consumable UIs so
// both agree on the same cooldown state.
export function remainingCooldownSeconds(character: Character, itemId: string, cooldownSeconds: number, now: Date): number {
  const lastUsed = character.itemCooldowns[itemId];
  if (!lastUsed) return 0;
  const elapsed = (now.getTime() - lastUsed.getTime()) / 1000;
  return Math.max(0, cooldownSeconds - elapsed);
}

// Out-of-combat use (Inventory screen) — heals through the same
// currentHp/hpCheckpointAt fields combat itself reads and writes. Only
// meaningful for a healAmount consumable: mana has no persisted value
// outside a live encounter (see ConsumableEffect's doc comment), so a
// mana-only item is rejected here rather than silently doing nothing.
export async function useConsumableOutOfCombat(uid: string, itemId: string): Promise<{ success: boolean; reason?: string }> {
  const item = ITEMS[itemId];
  if (!item?.consumableEffect) return { success: false, reason: 'That can’t be used.' };
  if (item.consumableEffect.healAmount === undefined && !item.consumableEffect.buff && item.consumableEffect.bagCapacityBonus === undefined) {
    return { success: false, reason: 'Only usable in combat.' };
  }

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const inventory = await getInventory(uid);
  if ((inventory.items[itemId] ?? 0) <= 0) return { success: false, reason: 'You don’t have any.' };

  const now = new Date();
  const remaining = remainingCooldownSeconds(character, itemId, item.consumableEffect.cooldownSeconds, now);
  if (remaining > 0) return { success: false, reason: `On cooldown for ${Math.ceil(remaining)}s.` };

  const characterUpdate: Record<string, unknown> = {
    [`itemCooldowns.${itemId}`]: serverTimestamp(),
    ...buffUpdateForItem(item, itemId, now),
  };
  if (item.consumableEffect.healAmount !== undefined) {
    const equipBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments);
    const talentTotals = character.spec ? evaluateTalents(character.spec, character.talentPicks).totals : EMPTY_TALENT_TOTALS;
    const charMaxHp = maxHp(character.class, character.level, equipBonuses, talentTotals.hpMultPct);
    const currentHp = resolveCurrentHp(character.currentHp, charMaxHp, character.hpCheckpointAt, now);
    characterUpdate.currentHp = Math.min(charMaxHp, currentHp + item.consumableEffect.healAmount);
    characterUpdate.hpCheckpointAt = serverTimestamp();
  }
  if (item.consumableEffect.bagCapacityBonus !== undefined) {
    characterUpdate.bagSlots = increment(item.consumableEffect.bagCapacityBonus);
  }

  await updateDoc(doc(db, 'characters', uid), characterUpdate);
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-1),
  });
  return { success: true };
}

// Decrements charge-based active buffs by how many matching combat events
// (offensive hits dealt / hits taken) occurred since the last call — see
// CombatScreen/DungeonScreen's autosave, which counts 'damage_out'/
// 'damage_in' events from the tick batch. A buff that hits 0 charges is
// removed outright rather than left at 0 (an absent key is already the
// "no buff" state everywhere else reads activeBuffs).
export async function consumeBuffCharges(
  uid: string,
  character: Character,
  triggerCounts: Partial<Record<'offensive_action' | 'damage_taken', number>>
): Promise<void> {
  const update: Record<string, unknown> = {};
  for (const [category, buff] of Object.entries(character.activeBuffs) as [BuffCategory, { itemId: string; charges?: number }][]) {
    if (!buff || buff.charges === undefined) continue;
    const trigger = BUFF_CATEGORY_TRIGGER[category];
    const count = trigger ? triggerCounts[trigger] ?? 0 : 0;
    if (count <= 0) continue;
    const remaining = Math.max(0, buff.charges - count);
    update[`activeBuffs.${category}`] = remaining > 0 ? { ...buff, charges: remaining } : deleteField();
  }
  if (Object.keys(update).length > 0) {
    await updateDoc(doc(db, 'characters', uid), update);
  }
}

// Records an in-combat consumable use — the heal/mana effect itself is
// applied directly to the live Combatant by the caller (same instant
// feedback as a manual ability use), so this just persists the cooldown
// timestamp and decrements inventory. The HP that results reaches Firestore
// the same way any other in-combat HP change does: the next periodic
// autosave, not this call.
export async function recordConsumableUse(uid: string, itemId: string): Promise<void> {
  const item = ITEMS[itemId];
  const characterUpdate: Record<string, unknown> = { [`itemCooldowns.${itemId}`]: serverTimestamp() };
  if (item) Object.assign(characterUpdate, buffUpdateForItem(item, itemId, new Date()));
  if (item?.consumableEffect?.bagCapacityBonus !== undefined) {
    characterUpdate.bagSlots = increment(item.consumableEffect.bagCapacityBonus);
  }

  await updateDoc(doc(db, 'characters', uid), characterUpdate);
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-1),
  });
}

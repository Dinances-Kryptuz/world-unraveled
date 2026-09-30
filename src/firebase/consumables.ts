import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory } from './inventory';
import { ITEMS } from '../gameData/items';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import type { Character } from '../types/character';

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
  if (item.consumableEffect.healAmount === undefined) {
    return { success: false, reason: 'Only usable in combat.' };
  }

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const inventory = await getInventory(uid);
  if ((inventory.items[itemId] ?? 0) <= 0) return { success: false, reason: 'You don’t have any.' };

  const now = new Date();
  const remaining = remainingCooldownSeconds(character, itemId, item.consumableEffect.cooldownSeconds, now);
  if (remaining > 0) return { success: false, reason: `On cooldown for ${Math.ceil(remaining)}s.` };

  const equipBonuses = getEquipmentStatBonuses(character.equipment);
  const talentTotals = character.spec ? evaluateTalents(character.spec, character.talentPicks).totals : EMPTY_TALENT_TOTALS;
  const charMaxHp = maxHp(character.class, character.level, equipBonuses, talentTotals.hpMultPct);
  const currentHp = resolveCurrentHp(character.currentHp, charMaxHp, character.hpCheckpointAt, now);
  const newHp = Math.min(charMaxHp, currentHp + item.consumableEffect.healAmount);

  await updateDoc(doc(db, 'characters', uid), {
    currentHp: newHp,
    hpCheckpointAt: serverTimestamp(),
    [`itemCooldowns.${itemId}`]: serverTimestamp(),
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-1),
  });
  return { success: true };
}

// Records an in-combat consumable use — the heal/mana effect itself is
// applied directly to the live Combatant by the caller (same instant
// feedback as a manual ability use), so this just persists the cooldown
// timestamp and decrements inventory. The HP that results reaches Firestore
// the same way any other in-combat HP change does: the next periodic
// autosave, not this call.
export async function recordConsumableUse(uid: string, itemId: string): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`itemCooldowns.${itemId}`]: serverTimestamp(),
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${itemId}`]: increment(-1),
  });
}

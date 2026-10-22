import { doc, updateDoc, serverTimestamp, increment, deleteField } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory } from './inventory';
import { ITEMS } from '../gameData/items';
import { resolveCombatProfile } from '../gameData/resolveCombatProfile';
import { isFoodItem, isPotionItem } from '../gameData/consumableClassification';
import type { Character } from '../types/character';
import type { ItemDef, BuffCategory } from '../gameData/types';
import { BUFF_CATEGORY_TRIGGER } from '../gameData/buffs';
import { chargedInstanceId } from '../gameData/consumableCharges';

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

// Pins a consumable to the Food or Potion quick-use slot (or clears it with
// itemId === null) — see Character.equippedConsumables's doc comment. Purely
// a UI pointer: using the pinned item still just decrements inventory by 1
// like any other consumable use, so there's nothing to validate beyond
// "this is actually a food/potion-shaped consumable," no ownership check
// needed (pinning something you don't currently hold yet, e.g. you're about
// to buy more, is harmless).
export async function setEquippedConsumable(
  uid: string,
  slot: 'food' | 'potion',
  itemId: string | null
): Promise<{ success: boolean; reason?: string }> {
  if (itemId !== null) {
    const item = ITEMS[itemId];
    if (!item || item.type !== 'consumable' || !item.consumableEffect) {
      return { success: false, reason: 'That isn’t a consumable.' };
    }
    if (slot === 'food' && !isFoodItem(item)) return { success: false, reason: 'Not a food item.' };
    if (slot === 'potion' && !isPotionItem(item)) return { success: false, reason: 'Not a potion.' };
  }
  await updateDoc(doc(db, 'characters', uid), { [`equippedConsumables.${slot}`]: itemId });
  return { success: true };
}

// Cooking overhaul Tier 2 — Stat Food. Unlike the fixed-charges-on-item
// potions buffUpdateForItem above handles, a Stat Food serving's charge
// count was rolled at CRAFT time (1-4, from that zone's Cooking Mastery —
// see craftingEngine.ts/chargedConsumables), so "using" one means
// consuming exactly ONE unit from inventory right now and copying THAT
// specific bucket's remainingCharges into activeBuffs.stat_food — never
// item.consumableEffect.buff.charges, which stays undefined for every
// Stat Food item definition. Spends the weakest (fewest-remaining-charges)
// owned bucket first, same "finish nearly-spent servings before touching
// fresher ones" convention as gameData/consumableCharges.ts's
// applyChargeConsumption. Replaces whatever Stat Food buff was already
// active — its leftover charges are simply discarded, per the design
// brief's explicit "replacing (not stacking) a previous Stat Food buff."
export async function equipStatFood(uid: string, itemId: string): Promise<{ success: boolean; reason?: string }> {
  const item = ITEMS[itemId];
  if (!item?.consumableEffect?.buff || item.consumableEffect.buff.category !== 'stat_food') {
    return { success: false, reason: 'That isn’t a Stat Food.' };
  }

  const inventory = await getInventory(uid);
  const buckets = Object.values(inventory.chargedConsumables ?? {}).filter(
    (b) => b.itemId === itemId && b.remainingCharges > 0 && b.quantity > 0
  );
  if (buckets.length === 0) return { success: false, reason: 'You don’t have any.' };
  buckets.sort((a, b) => a.remainingCharges - b.remainingCharges);
  const chosen = buckets[0];

  const instanceId = chargedInstanceId(itemId, chosen.remainingCharges);
  const inventoryUpdate: Record<string, unknown> =
    chosen.quantity > 1
      ? { [`chargedConsumables.${instanceId}.quantity`]: increment(-1) }
      : { [`chargedConsumables.${instanceId}`]: deleteField() };

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdate);
  await updateDoc(doc(db, 'characters', uid), {
    'activeBuffs.stat_food': { itemId, charges: chosen.remainingCharges },
  });
  return { success: true };
}

// Cooking overhaul Tier 3 — Feasts. Consumed once at a dungeon/raid run's
// start (see DungeonScreen.tsx's pre-run picker) — just an inventory
// decrement; the caller already knows the item's feastStatBonuses (read
// straight from ITEMS, same as Tier 1/2's catalog-driven display) and
// keeps them in a local ref for the run's whole lifetime, since a dungeon
// run has no persisted CurrentActivity to snapshot them onto (see
// DungeonScreen.tsx's own module doc comment on why dungeon state is
// client-session-only).
export async function consumeFeast(uid: string, itemId: string): Promise<{ success: boolean; reason?: string }> {
  const item = ITEMS[itemId];
  if (!item?.consumableEffect?.feastStatBonuses) return { success: false, reason: 'That isn’t a Feast.' };
  const inventory = await getInventory(uid);
  if ((inventory.items[itemId] ?? 0) <= 0) return { success: false, reason: 'You don’t have any.' };
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), { [`items.${itemId}`]: increment(-1) });
  return { success: true };
}

// Out-of-combat use (Inventory screen) — heals through the same
// currentHp/hpCheckpointAt fields combat itself reads and writes. Only
// meaningful for a healAmount consumable: mana has no persisted value
// outside a live encounter (see ConsumableEffect's doc comment), so a
// mana-only item is rejected here rather than silently doing nothing.
export async function useConsumableOutOfCombat(uid: string, itemId: string): Promise<{ success: boolean; reason?: string }> {
  const item = ITEMS[itemId];
  if (!item?.consumableEffect) return { success: false, reason: 'That can’t be used.' };
  const buffCategory = item.consumableEffect.buff?.category;
  // Offensive/defensive potions no longer have a standalone "use" — one
  // potion fires itself automatically per attack/hit taken for whatever's
  // pinned to the Potion slot (gameData/consumableAutomation.ts), so a
  // manual click here (in or out of combat) has nothing coherent to do.
  if (buffCategory === 'offensive_potion' || buffCategory === 'defensive_potion') {
    return { success: false, reason: 'Pin this to your Potion slot — it fires automatically.' };
  }
  if (
    item.consumableEffect.healAmount === undefined &&
    !item.consumableEffect.buff &&
    item.consumableEffect.bagCapacityBonus === undefined &&
    !item.consumableEffect.recoveryFood
  ) {
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
  if (item.consumableEffect.healAmount !== undefined || item.consumableEffect.recoveryFood) {
    const { maxHp: charMaxHp, currentHp } = resolveCombatProfile(character, now);
    // Recovery Food's manual use heals to FULL, overriding healAmount —
    // there's no live Combatant.actionReadyIn to reset out of combat (see
    // CombatScreen's handleUseConsumable for the in-combat path, which
    // resets it), so this is just the heal half of the effect.
    characterUpdate.currentHp = item.consumableEffect.recoveryFood
      ? charMaxHp
      : Math.min(charMaxHp, currentHp + item.consumableEffect.healAmount!);
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
  triggerCounts: Partial<Record<'offensive_action' | 'damage_taken' | 'stat_food_use', number>>
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

// Persists one batch's worth of potion-slot automation usage — the engine
// (combatEngine/engine.ts, both online and offline) only ever mutates an
// in-memory ConsumableAutomationRuntimeState; this is the single place that
// turns its accumulated tallies into real inventory/cooldown writes, called
// once per autosave cycle (CombatScreen/DungeonScreen) or once per offline
// claim (WelcomeBackScreen) — never per tick/hit.
export async function applyConsumableAutomationUsage(
  uid: string,
  // Whatever's pinned to equippedConsumables.potion when this batch's
  // ConsumableAutomationRuntimeState was built — only one of offensive/
  // defensive/healing/mana ever has nonzero usage in a batch now, since a
  // single slot can only ever be one of those shapes at a time (see
  // gameData/consumableAutomation.ts's buildConsumableAutomationState).
  potionItemId: string | null | undefined,
  usage: { offensiveChargesConsumed: number; defensiveChargesConsumed: number; healingUsed: number; manaUsed: number },
  // Cooking overhaul Tier 1 — Auto Eat's own usage tally + the item it
  // actually ate (whatever was pinned to equippedConsumables.food when the
  // engine built this batch's ConsumableAutomationRuntimeState — see
  // buildAutoEatState), separate from the potion slot since food and
  // potion are independent slots.
  autoEat?: { used: number; itemId: string }
): Promise<void> {
  const characterUpdate: Record<string, unknown> = {};
  const inventoryUpdate: Record<string, unknown> = {};
  // No-more-charges redesign — offensive/defensive potions are now plain
  // `items` stacks, one unit consumed per attack/hit taken (see
  // combatEngine/engine.ts's stockRemaining decrement), so this is the
  // same flat items decrement healing/mana/autoEat already use below.
  if (usage.offensiveChargesConsumed > 0 && potionItemId) {
    inventoryUpdate[`items.${potionItemId}`] = increment(-usage.offensiveChargesConsumed);
  }
  if (usage.defensiveChargesConsumed > 0 && potionItemId) {
    inventoryUpdate[`items.${potionItemId}`] = increment(-usage.defensiveChargesConsumed);
  }
  if (usage.healingUsed > 0 && potionItemId) {
    inventoryUpdate[`items.${potionItemId}`] = increment(-usage.healingUsed);
    characterUpdate[`itemCooldowns.${potionItemId}`] = serverTimestamp();
  }
  if (usage.manaUsed > 0 && potionItemId) {
    inventoryUpdate[`items.${potionItemId}`] = increment(-usage.manaUsed);
    characterUpdate[`itemCooldowns.${potionItemId}`] = serverTimestamp();
  }
  if (autoEat && autoEat.used > 0) {
    inventoryUpdate[`items.${autoEat.itemId}`] = increment(-autoEat.used);
    characterUpdate[`itemCooldowns.${autoEat.itemId}`] = serverTimestamp();
  }
  if (Object.keys(characterUpdate).length > 0) {
    await updateDoc(doc(db, 'characters', uid), characterUpdate);
  }
  if (Object.keys(inventoryUpdate).length > 0) {
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdate);
  }
}

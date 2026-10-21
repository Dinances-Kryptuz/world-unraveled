import { doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { isLocked, grantInventoryItems } from './inventory';
import { ITEMS } from '../gameData/items';
import { shopkeeperMaxBagSlots, nextShopkeeperSlotCost } from '../gameData/bagSlotShop';
import type { Inventory } from '../types/character';

export interface BuyBagSlotResult {
  success: boolean;
  reason?: string;
}

// The Shopkeeper's "buy a bag slot" action — same server-side-validated
// posture as every other gold-spend writer in this file (sellItem/buyItem
// above). Capped by shopkeeperMaxBagSlots (8 per real zone unlocked) and
// priced by nextShopkeeperSlotCost's exponential curve; both keyed off
// character.shopkeeperBagSlotsPurchased, not bagSlots itself, so
// Tailoring-bag-granted slots (firebase/consumables.ts) never count against
// this cap or shift the cost curve.
export async function buyBagSlot(uid: string): Promise<BuyBagSlotResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const purchased = character.shopkeeperBagSlotsPurchased ?? 0;
  const maxSlots = shopkeeperMaxBagSlots(character.level);
  if (purchased >= maxSlots) {
    return { success: false, reason: 'Unlock another zone to buy more bag slots here.' };
  }

  const cost = nextShopkeeperSlotCost(purchased);
  if (character.gold < cost) {
    return { success: false, reason: `Requires ${cost.toLocaleString()} gold (have ${Math.floor(character.gold).toLocaleString()}).` };
  }

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-cost),
    bagSlots: increment(1),
    shopkeeperBagSlotsPurchased: increment(1),
  });
  return { success: true };
}

// All three sell functions below used to read the inventory once (getInventory),
// decide locked/quantity from that snapshot, then fire two unconditional
// increment() writes with no re-check at write time and no quantity-held
// validation at all. Two rapid sell clicks (or a stale client retry) could
// each pass the same stale "not locked, presumably enough" read and both
// proceed — overselling the same stack past zero into the negative while
// being paid gold for each call, a real duplication/gold-dupe exploit, not
// just a cosmetic gap. Wrapped in a transaction that re-reads the inventory
// and clamps to whatever is ACTUALLY held at write time (mirroring
// firebase/bank.ts's depositItem/withdrawItem, which already validate this,
// and firebase/inventory.ts's grant functions, which already use a
// transaction for the same "atomic relative to a concurrent write" reason)
// closes both the oversell and the lock-TOCTOU gap in one fix.
export async function sellItem(uid: string, itemId: string, quantity: number): Promise<void> {
  const item = ITEMS[itemId];
  if (!item || quantity <= 0) return;
  const invRef = doc(db, 'characters', uid, 'inventory', 'main');
  const charRef = doc(db, 'characters', uid);

  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invRef);
    const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
    if (isLocked(inventory, itemId)) return;
    const sellQty = Math.min(quantity, inventory.items?.[itemId] ?? 0);
    if (sellQty <= 0) return;

    tx.update(invRef, { [`items.${itemId}`]: increment(-sellQty) });
    tx.update(charRef, { gold: increment(item.sellValue * sellQty) });
  });
}

// The equipmentInstances counterpart to sellItem above — randomized-stat
// gear (gameData/equipmentRolls.ts) never lands in `items` at all, so it
// was previously impossible to sell any piece of equipment from this
// screen (every piece a player actually wears/holds comes through this
// bucket, not `items`, since the Equipment Rarity overhaul). Sell value is
// still the base item's flat sellValue — rolled stats don't change what a
// vendor pays, same as they don't change a disenchant's material yield.
// Same transaction/clamp fix as sellItem above, same reason.
export async function sellEquipmentInstance(uid: string, instanceId: string, quantity: number): Promise<void> {
  if (quantity <= 0) return;
  const invRef = doc(db, 'characters', uid, 'inventory', 'main');
  const charRef = doc(db, 'characters', uid);

  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invRef);
    const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
    if (isLocked(inventory, instanceId)) return;
    const instance = inventory.equipmentInstances?.[instanceId];
    const item = instance ? ITEMS[instance.itemId] : null;
    if (!instance || !item) return;
    const sellQty = Math.min(quantity, instance.quantity);
    if (sellQty <= 0) return;

    tx.update(invRef, { [`equipmentInstances.${instanceId}.quantity`]: increment(-sellQty) });
    tx.update(charRef, { gold: increment(item.sellValue * sellQty) });
  });
}

// The chargedConsumables counterpart — same gap as equipmentInstances
// above: a charge-count-distinguished potion stack (gameData/
// consumableCharges.ts) never lands in `items` either, so it was also
// unsellable. Sell value is the base item's flat sellValue regardless of
// how many charges remain, matching sellEquipmentInstance's own posture.
// Same transaction/clamp fix as sellItem above, same reason.
export async function sellChargedConsumable(uid: string, instanceId: string, quantity: number): Promise<void> {
  if (quantity <= 0) return;
  const invRef = doc(db, 'characters', uid, 'inventory', 'main');
  const charRef = doc(db, 'characters', uid);

  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invRef);
    const inventory = (invSnap.exists() ? (invSnap.data() as Inventory) : { items: {} }) as Inventory;
    if (isLocked(inventory, instanceId)) return;
    const bucket = inventory.chargedConsumables?.[instanceId];
    const item = bucket ? ITEMS[bucket.itemId] : null;
    if (!bucket || !item) return;
    const sellQty = Math.min(quantity, bucket.quantity);
    if (sellQty <= 0) return;

    tx.update(invRef, { [`chargedConsumables.${instanceId}.quantity`]: increment(-sellQty) });
    tx.update(charRef, { gold: increment(item.sellValue * sellQty) });
  });
}

// Routes through grantInventoryItems (the single bagSlots choke point every
// other loot-granting write already uses — see its own doc comment) instead
// of an unconditional increment(), which previously let a brand-new item id
// be bought straight past a full bag (the direct cause of inventories
// observed sitting over their cap, e.g. 25/24). Unlike passive loot, buying
// is a paid transaction the player chose and paid gold/void shards for, so
// if the bag genuinely has no room for a NEW item id, the purchase is
// refused and refunded rather than silently eating the cost for nothing.
export async function buyItem(
  uid: string,
  itemId: string,
  quantity: number,
  unitPrice: number,
  currency: 'gold' | 'voidShards' = 'gold'
): Promise<{ success: boolean; reason?: string }> {
  if (quantity <= 0) return { success: false };
  const cost = unitPrice * quantity;

  const character = await getCharacter(uid);
  if (!character || character[currency] < cost) return { success: false, reason: 'Not enough gold.' };

  await updateDoc(doc(db, 'characters', uid), {
    [currency]: increment(-cost),
  });
  const granted = await grantInventoryItems(uid, [{ itemId, quantity }]);
  if (granted.length === 0) {
    await updateDoc(doc(db, 'characters', uid), {
      [currency]: increment(cost),
    });
    return { success: false, reason: 'Your bag is full — purchase refunded.' };
  }
  return { success: true };
}

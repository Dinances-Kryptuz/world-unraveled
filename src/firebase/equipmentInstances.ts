import { increment } from 'firebase/firestore';
import type { Inventory } from '../types/character';
import type { EquippedItemRef } from '../gameData/types';

// Firestore field-path update to move one unit of `ref` between "equipped"
// and "available in inventory" — handles a randomized instance
// (equipmentInstances.{instanceId}.quantity) and a plain stackable/legacy
// item (items.{itemId}) uniformly, so firebase/character.ts's equipItem/
// unequipItem and firebase/companions.ts's equipCompanionItem/
// unequipCompanionItem (which draw from and return to this same shared
// inventory doc) don't each need their own branch for it.
export function equipmentRefInventoryDelta(ref: EquippedItemRef, delta: 1 | -1): Record<string, unknown> {
  if (ref.instanceId) {
    return { [`equipmentInstances.${ref.instanceId}.quantity`]: increment(delta) };
  }
  return { [`items.${ref.itemId}`]: increment(delta) };
}

// Looks up a specific equipment instance's rolled stats from an
// already-loaded Inventory and builds the EquippedItemRef to write onto a
// slot — denormalizing `rolls` here (not left as a live inventory lookup)
// is why getEquipmentStatBonuses needs no inventory access later; see
// gameData/types.ts's EquippedItemRef doc comment.
export function resolveEquippedRef(itemId: string, instanceId: string | undefined, inventory: Inventory): EquippedItemRef {
  if (!instanceId) return { itemId };
  const instance = inventory.equipmentInstances?.[instanceId];
  return { itemId, instanceId, rolls: instance?.rolls ?? {} };
}

export function instanceQuantityAvailable(inventory: Inventory, instanceId: string): number {
  return inventory.equipmentInstances?.[instanceId]?.quantity ?? 0;
}

import type { ItemDef } from './types';
import type { Inventory } from '../types/character';

// A consumable is "food" if it's explicitly flagged as such, is a Well Fed
// buff, or is Recovery Food — see ConsumableEffect's isFood doc comment.
// Shared between the Food/Potion quick-use pin UI (ConsumablesBar.tsx) and
// its server-side validator (firebase/consumables.ts's
// setEquippedConsumable) so the two can never drift out of sync again —
// the Bread-landing-in-Potion-slot fix added `isFood` here but missed a
// second, separate inline copy of this same check in setEquippedConsumable,
// which kept rejecting Bread with "Not a food item." when actually pinning
// it (as opposed to just looking at the Food dropdown, which read the
// fixed copy).
export function isFoodItem(item: ItemDef): boolean {
  return (
    item.consumableEffect?.buff?.category === 'well_fed' ||
    !!item.consumableEffect?.recoveryFood ||
    !!item.consumableEffect?.isFood
  );
}

// A "potion" for quick-use-pin purposes: a buff, or a direct heal/mana
// effect — i.e. actually usable in or out of combat for an effect, not
// just a passive utility item like a Tailoring bag (consumableEffect.
// bagCapacityBonus), which is neither food nor potion and shouldn't be
// pinnable to either quick-use slot.
export function isPotionItem(item: ItemDef): boolean {
  const effect = item.consumableEffect;
  if (!effect || isFoodItem(item)) return false;
  return !!effect.buff || effect.healAmount !== undefined || effect.manaAmount !== undefined;
}

// Offensive/defensive potions (charge-based — see Inventory.chargedConsumables'
// doc comment) never land in `items`, only in their own charge-bucketed
// bucket, keyed by instanceId rather than itemId. ConsumablesBar's "do I own
// this?" checks need a plain itemId->quantity map that covers BOTH stores —
// without this, a charge-based potion can never appear as ownable there at
// all (not pinnable to a quick-use slot, not listed under "All consumables"),
// even while craftable/owned, matching this exact "potions aren't showing up"
// bug report.
export function consumableOwnedQuantities(inventory: Inventory): Record<string, number> {
  const counts: Record<string, number> = { ...inventory.items };
  for (const bucket of Object.values(inventory.chargedConsumables ?? {})) {
    counts[bucket.itemId] = (counts[bucket.itemId] ?? 0) + bucket.quantity;
  }
  return counts;
}

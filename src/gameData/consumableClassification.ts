import type { ItemDef } from './types';

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

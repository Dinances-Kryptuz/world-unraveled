// Charge-count-distinguished stacking — the inventory-side sibling of
// equipmentRolls.ts's canonicalInstanceId pattern. Only Cooking's Stat Food
// still uses this (a serving's charge count is rolled once at CRAFT time
// from the crafter's then-current Cooking zone Mastery and never changes
// again for that specific stack — see firebase/consumables.ts's
// equipStatFood). Alchemy's own potions dropped the charge-bucket model
// entirely (see alchemyMastery.ts's AlchemyMasteryMilestone.potionsPerCraft)
// — a crafted potion is just a plain `items` stack now, one potion per use.
export function chargedInstanceId(itemId: string, remainingCharges: number): string {
  return `${itemId}:c${remainingCharges}`;
}

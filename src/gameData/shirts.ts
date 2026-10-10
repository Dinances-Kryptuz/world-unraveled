// Tailoring overhaul's profession shirts — a fixed, predictable %-bonus
// slot (equipSlot 'shirt'), distinct from every other equipment slot's
// randomized combat-stat roll (see items.ts's ItemDef.shirtBonus). Exactly
// one shirt can be equipped at a time, so bonuses never stack — the
// existing single-item-per-slot equip rule already guarantees that.
//
// Each type's bonus scales 1/2/4/6/8/10% across the 6 cloth tiers
// (zones 1-6) — see items.ts's generated shirt items. A shirt contributes
// to its own tier's cloth material Mastery when crafted (same materialId
// as that tier's armor/capes) and has no mastery bar of its own.
export type ShirtBonusType =
  | 'mastery_xp'
  | 'gathering_speed'
  | 'crafting_speed'
  | 'profession_xp'
  | 'gold_find'
  | 'salvage_bonus'
  | 'material_preserve';

export interface ShirtBonus {
  type: ShirtBonusType;
  pct: number;
}

// Reads whichever shirt is equipped (if any) and returns its bonus pct
// ONLY when it matches the requested type — 0 otherwise, so every call
// site can do `bonusMult = 1 + shirtBonusPct(equippedShirt, 'gathering_speed') / 100`
// unconditionally rather than null-checking at every use. See
// types/character.ts's doc comment on why offline activities must snapshot
// this at activity-START rather than reading the character's CURRENT
// equipped shirt (equippedShirtItemId param on the snapshot-consuming
// callers is what makes that possible).
export function shirtBonusPct(
  shirtBonus: ShirtBonus | undefined,
  type: ShirtBonusType
): number {
  if (!shirtBonus || shirtBonus.type !== type) return 0;
  return shirtBonus.pct;
}

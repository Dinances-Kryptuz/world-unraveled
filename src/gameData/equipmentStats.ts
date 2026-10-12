import { PRIMARY_STAT, type BaseStat, type ClassId, type SpecId } from './classStats';
import type { EquipmentSlot, EquippedItemRef, ItemDef } from './types';
import { ITEMS } from './items';
import { ENCHANTS } from './enchanting';

// The bare item id out of an equipped slot's value — nearly every caller
// that just needs "what item is in this slot" (class/offhand rules, tool-
// slot checks, enchant-target lookups) wants this, not the roll data. See
// gameData/types.ts's EquippedItemRef doc comment for why slots carry an
// object instead of a bare string.
export function equippedItemId(ref: EquippedItemRef | null | undefined): string | null {
  return ref?.itemId ?? null;
}

// Two-handed weapons — a small, deliberately short list rather than a
// keyword guess across the whole weapon catalog: most of this game's
// weapons (the paired sword/battleaxe lines every Blacksmithing tier
// crafts, daggers, wands, scepters) are a one-handed progression line by
// design, matched 1:1 across tiers, and reclassifying an entire line as
// two-handed would silently cut its offhand pairing without any
// compensating stat budget. These 4 are each already flavored as
// unusually heavy/bulky in their own description ("too heavy for most",
// "heavier...than anything else") or are the classic caster 2H
// implement (a staff) — real candidates, not a guess. See the equip-rule
// doc comment on canEquipInOffhand below for what this gates.
const TWO_HANDED_WEAPON_IDS = new Set(['apprentice_staff', 'chieftains_warhammer', 'kaldrun_warhammer', 'overseers_greatmace']);

export function isTwoHandedWeapon(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  return item.equipSlot === 'weapon' && TWO_HANDED_WEAPON_IDS.has(item.id);
}

// Whether `item` is allowed in the offhand slot at all — either a genuine
// offhand item (a shield, or a cloth-flavored tome/orb for non-plate
// casters) or a one-handed WEAPON (dual wielding two one-handers). A
// two-handed weapon never fits here; see equipItem in firebase/character.ts
// for the matching "equipping a 2H weapon auto-unequips the offhand, and
// the offhand can't be equipped while a 2H weapon is already there" rules.
export function canEquipInOffhand(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  if (item.equipSlot === 'offhand') return true;
  return item.equipSlot === 'weapon' && !isTwoHandedWeapon(item);
}

// Attribute/Specialization overhaul's Shield Block Value only applies when
// a genuine shield (ItemDef.isShield) sits in the offhand slot — not the
// cloth-caster tome/orb offhands, which are itemized as INT/SPI gear
// instead. Takes the bare equipment record (not a full Character) so every
// caller — the player, a recruited alt, a hired companion — can share it.
export function isShieldEquipped(equipment: Record<EquipmentSlot, EquippedItemRef | null>): boolean {
  const id = equippedItemId(equipment.offhand);
  return !!id && !!ITEMS[id]?.isShield;
}

// Attribute/Specialization overhaul (the Equipment screen's "hover a stat
// for a description" ask) — explains what a stat ACTUALLY does for THIS
// character's class/spec right now, quoting the real formulas/passives
// (gameData/combatFormulas.ts) rather than generic flavor text, and
// changing when the mechanical effect genuinely differs by class/spec
// (STR does nothing for a Priest's own damage; INT is a Priest/Mage's
// primary damage stat but just a Mana pool for everyone else; the 6
// current specs' passives from the ATTR overhaul each add one more
// sentence only when they actually apply).
export function baseStatTooltip(stat: BaseStat, cls: ClassId, specId: SpecId | null): string {
  switch (stat) {
    case 'STR': {
      const isPrimary = PRIMARY_STAT[cls] === 'STR';
      const base = isPrimary
        ? 'Each point adds 2 Attack Power, increasing your physical damage.'
        : 'Your damage comes from Intellect, not Strength, so this mostly sits idle for you.';
      const shield =
        ' If you have a shield equipped, Strength also raises your Shield Block Value (flat damage blocked per hit).';
      const tankBonus =
        specId === 'warrior_tank' || specId === 'prot_paladin'
          ? ' As a shield-tank spec, your Shield Block Value from Strength is boosted further.'
          : '';
      const dpsBonus =
        specId === 'warrior_dps' ? ' As Warrior DPS, Strength also grants a small bonus to critical strike chance.' : '';
      return base + shield + tankBonus + dpsBonus;
    }
    case 'STA':
      return "Each point adds 12 maximum HP, plus a smaller amount of Armor scaled by your spec's survivability.";
    case 'INT': {
      const isPrimary = PRIMARY_STAT[cls] === 'INT';
      const base = isPrimary
        ? 'Each point adds 2 spell power, increasing your ability damage, plus a small amount of critical strike chance.'
        : 'Each point adds 2 maximum Mana, plus a small amount of critical strike chance.';
      const protBonus =
        specId === 'prot_paladin' ? ' As Protection, Intellect also reduces the Mana cost of your own abilities.' : '';
      return base + protBonus;
    }
    case 'SPI': {
      const base =
        'Each point adds 0.5% to all healing you do, and speeds up Mana regeneration and out-of-combat HP regeneration.';
      const shadowBonus =
        specId === 'shadow_priest' ? ' As Shadow, a portion of your Spirit converts into bonus damage instead.' : '';
      const holyPriestBonus =
        specId === 'holy_priest' ? ' As Holy, Spirit grants extra healing power on top of the usual bonus.' : '';
      return base + shadowBonus + holyPriestBonus;
    }
    case 'AGI':
      return 'Each point adds a small amount of critical strike chance, dodge chance, and Armor. Only gear raises this — it never grows from leveling alone.';
  }
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  offhand: 'Off Hand',
  chest: 'Chest',
  helmet: 'Helmet',
  gloves: 'Gloves',
  legs: 'Legs',
  boots: 'Boots',
  ring: 'Ring',
  ring2: 'Ring',
  necklace: 'Necklace',
  tool: 'Tool',
  shoulders: 'Shoulders',
  cape: 'Cape',
  shirt: 'Shirt',
  tabard: 'Tabard',
  bracers: 'Bracers',
  belt: 'Belt',
  ammo: 'Ammo',
};

// A one-line summary of what a piece of equipment actually does — slot,
// armor type, and its stat bonuses — for a hover tooltip on a crafting
// recipe (or anywhere else that shows an item by name without its stats).
export function describeItemStats(item: ItemDef): string {
  if (item.type !== 'equipment' || !item.equipSlot) return item.description;
  const parts: string[] = [SLOT_LABELS[item.equipSlot]];
  if (item.armorType) parts.push(item.armorType);
  const bonuses = Object.entries(item.statBonuses ?? {})
    .filter(([, value]) => value)
    .map(([stat, value]) => `+${value} ${stat}`);
  if (bonuses.length > 0) parts.push(bonuses.join(', '));
  return parts.join(' — ');
}

// `enchantments` is optional and defaults to none — most callers that
// don't care about enchantments (e.g. a vendor tooltip) can omit it
// entirely. Bonuses are additive on top of the item's own statBonuses,
// applied regardless of which specific item currently sits in that slot
// (enchantments bind to the SLOT — see gameData/enchanting.ts's doc
// comment for why).
//
// A randomized-roll item's stats come from `ref.rolls` (denormalized onto
// the equipped ref itself — see EquippedItemRef's doc comment in
// gameData/types.ts for why this function doesn't need inventory access to
// resolve them); everything else falls back to its static
// ITEMS[itemId].statBonuses exactly as before this field existed.
// enchantmentCharges (Enchanting overhaul's charge model) is read here too
// so an enchant that's run out (0 remaining) stops contributing its stat
// bonus — exactly as if it were removed — without the caller needing its
// own charge-gating logic. Absence of an entry for a slot that DOES have
// an active enchant means "not yet migrated to the charge model" and is
// treated as still active (same "absence is the old/default state"
// convention as every other optional field in this codebase), so this is
// purely additive: a character record with no enchantmentCharges at all
// behaves exactly as before this field existed.
export function getEquipmentStatBonuses(
  equipment: Record<EquipmentSlot, EquippedItemRef | null>,
  enchantments: Partial<Record<EquipmentSlot, string>> = {},
  enchantmentCharges: Partial<Record<EquipmentSlot, number>> = {}
): Partial<Record<BaseStat, number>> {
  const totals: Partial<Record<BaseStat, number>> = {};
  const addBonuses = (bonuses: Partial<Record<BaseStat, number>> | undefined) => {
    if (!bonuses) return;
    for (const [stat, value] of Object.entries(bonuses)) {
      const key = stat as BaseStat;
      totals[key] = (totals[key] ?? 0) + (value ?? 0);
    }
  };
  for (const ref of Object.values(equipment)) {
    if (!ref) continue;
    addBonuses(ref.rolls ?? ITEMS[ref.itemId]?.statBonuses);
  }
  for (const [slot, enchantId] of Object.entries(enchantments) as [EquipmentSlot, string | undefined][]) {
    if (!enchantId) continue;
    if (enchantmentCharges[slot] === 0) continue;
    addBonuses(ENCHANTS[enchantId]?.statBonuses);
  }
  return totals;
}

// The Citadel of Krypt — sums each equipped item's OWN innate
// fireResistancePct (ItemDef.fireResistancePct, e.g. Citadel Level 3's BiS
// weapons), separate from getEquipmentStatBonuses above (raw stats) and from
// the enchant-sourced resistance gameData/enchanting.ts's
// buildActiveEnchantTotals already sums. Every item before Citadel leaves
// this undefined, so every existing equipment set sums to 0 here — zero
// behavior change. Used for both the player (gameData/resolveCombatProfile.ts)
// and companions/alts (gameData/companions.ts), the only two equipment
// shapes in this game.
export function getInnateItemFireResistance(equipment: Record<EquipmentSlot, EquippedItemRef | null>): number {
  let total = 0;
  for (const ref of Object.values(equipment)) {
    if (!ref) continue;
    total += ITEMS[ref.itemId]?.fireResistancePct ?? 0;
  }
  return total;
}

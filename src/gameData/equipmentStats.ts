import { PRIMARY_STAT, type BaseStat, type ClassId, type EquipRole, type SpecId } from './classStats';
import type { EquipmentSlot, EquippedItemRef, ItemDef, ToolType } from './types';
import { ITEMS } from './items';
import { ENCHANTS } from './enchanting';
import { ARMOR_STAT_RANGES } from './equipmentRolls';

// The bare item id out of an equipped slot's value — nearly every caller
// that just needs "what item is in this slot" (class/offhand rules, tool-
// slot checks, enchant-target lookups) wants this, not the roll data. See
// gameData/types.ts's EquippedItemRef doc comment for why slots carry an
// object instead of a bare string.
export function equippedItemId(ref: EquippedItemRef | null | undefined): string | null {
  return ref?.itemId ?? null;
}

// Mining picks/skinning knives/fishing rods each live in their own
// type-locked slot (see EquipmentSlot's doc comment) — gathering screens
// that only know a node's/profession's `ToolType` use this to find which
// slot to read instead of hardcoding the mapping themselves.
const TOOL_TYPE_TO_EQUIP_SLOT: Record<ToolType, EquipmentSlot> = {
  mining_pick: 'tool_mining',
  skinning_knife: 'tool_skinning',
  fishing_rod: 'tool_fishing',
};

export function toolTypeToEquipSlot(toolType: ToolType): EquipmentSlot {
  return TOOL_TYPE_TO_EQUIP_SLOT[toolType];
}

// Every staff in the game — Enchanting's 6-tier Wand/Staff/Book line plus
// the early apprentice_staff kobold drop. All of these are two-handed (see
// TWO_HANDED_WEAPON_IDS below) AND, per the equip-role system's Priest/Mage
// caster rule (canEquipWeaponLoadout below), the ONE two-handed weapon a
// caster is allowed to equip — a non-staff two-hander (a warhammer/greatmace)
// is still physically equippable by anyone (weapons carry no armorType
// restriction) but isn't a legal caster loadout.
const STAFF_WEAPON_IDS = new Set([
  'apprentice_staff',
  'rough_staff',
  'aged_staff',
  'heartwood_staff',
  'ironwood_staff',
  'charwood_staff',
  'emberwood_staff',
]);

export function isStaffWeapon(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  return item.equipSlot === 'weapon' && STAFF_WEAPON_IDS.has(item.id);
}

// Every wand in the game — Enchanting's 6-tier Wand/Staff/Book line plus the
// early focusing_wand bandit drop. Wands are one-handed (never in
// TWO_HANDED_WEAPON_IDS), so without this check they'd otherwise pass as an
// ordinary one-handed weapon — this exists purely so canEquipWeaponLoadout's
// 'rogue_blades' role (below) can exclude them specifically ("no staffs,
// wands... only blades" per the user's own wording).
const WAND_WEAPON_IDS = new Set([
  'focusing_wand',
  'rough_wand',
  'aged_wand',
  'heartwood_wand',
  'ironwood_wand',
  'charwood_wand',
  'emberwood_wand',
]);

export function isWandWeapon(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  return item.equipSlot === 'weapon' && WAND_WEAPON_IDS.has(item.id);
}

// Either caster implement a Rogue is barred from — a staff (2H) or a wand
// (1H). Not the same thing as "not a physical weapon" (canEquipInOffhand's
// own caster-offhand check uses equipSlot === 'offhand' for that); a wand
// IS a weapon-slot item, so it needs its own explicit exclusion.
export function isCasterWeapon(item: Pick<ItemDef, 'id' | 'equipSlot'>): boolean {
  return isStaffWeapon(item) || isWandWeapon(item);
}

// Two-handed weapons — every staff above, plus a small, deliberately short
// list of non-staff two-handers rather than a keyword guess across the
// whole weapon catalog: most of this game's weapons (the paired sword/
// battleaxe lines every Blacksmithing tier crafts, daggers, wands,
// scepters) are a one-handed progression line by design, matched 1:1
// across tiers, and reclassifying an entire line as two-handed would
// silently cut its offhand pairing without any compensating stat budget.
// These 3 are each already flavored as unusually heavy/bulky in their own
// description ("too heavy for most", "heavier...than anything else") —
// real candidates, not a guess. See the equip-rule doc comment on
// canEquipInOffhand below for what this gates.
const TWO_HANDED_WEAPON_IDS = new Set([...STAFF_WEAPON_IDS, 'chieftains_warhammer', 'kaldrun_warhammer', 'overseers_greatmace']);

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

// Equip-role restrictions (classStats.ts's EQUIP_ROLE_BY_SPEC) — whether a
// prospective weapon+offhand PAIR (the state equipment would be in AFTER an
// equip resolves, not just the one slot being changed) is legal for a given
// role. Both items may be null (nothing equipped there). Doesn't re-check
// the baseline rules (canEquipInOffhand/isTwoHandedWeapon's own invariants,
// e.g. a 2H weapon never truly coexists with a filled offhand) — those are
// already enforced independently at the equip call site; this only adds the
// role-specific shape on top.
export function canEquipWeaponLoadout(
  role: EquipRole,
  weaponItem: Pick<ItemDef, 'id' | 'equipSlot' | 'isShield'> | null,
  offhandItem: Pick<ItemDef, 'id' | 'equipSlot' | 'isShield'> | null
): boolean {
  const weaponIsTwoHanded = weaponItem ? isTwoHandedWeapon(weaponItem) : false;
  const offhandIsShield = !!offhandItem?.isShield;
  const offhandIsWeapon = offhandItem?.equipSlot === 'weapon';
  const offhandIsCasterItem = !!offhandItem && offhandItem.equipSlot === 'offhand' && !offhandIsShield;

  switch (role) {
    // Tank: one-hander and shields only — never a two-hander, never a
    // dual-wielded second weapon, never a caster orb/book.
    case 'tank':
      if (weaponIsTwoHanded) return false;
      return !offhandItem || offhandIsShield;
    // Melee DPS: a weapon in both slots, just never a shield (and, since
    // the offhand has to be a WEAPON here, never a caster orb/book either).
    case 'melee_dps':
      return !offhandItem || offhandIsWeapon;
    // Paladin healer: one-hander + shield, OR a two-hander alone — never
    // both slots holding separate weapons, never a caster orb/book.
    case 'paladin_healer':
      if (weaponIsTwoHanded) return !offhandItem;
      return !offhandItem || offhandIsShield;
    // Caster (Priest/Mage): a weapon/wand + an empty or non-physical
    // offhand (orb/book), OR a two-handed STAFF specifically (not just any
    // two-hander) alone — never a shield, never a second weapon.
    case 'caster':
      if (weaponIsTwoHanded) return isStaffWeapon(weaponItem!) && !offhandItem;
      return !offhandItem || offhandIsCasterItem;
    // Rogue: blades only — never a staff or wand (weaponItem OR a dual-
    // wielded offhand one), never a shield, never a caster orb/book. A
    // blade is simply "every weapon-slot item that isn't a staff/wand",
    // same posture as the game's existing weapon itemization (no separate
    // sword/axe/dagger tagging exists, or is needed, to express this).
    case 'rogue_blades':
      if (weaponItem && isCasterWeapon(weaponItem)) return false;
      if (offhandIsWeapon && offhandItem && isCasterWeapon(offhandItem)) return false;
      return !offhandItem || offhandIsWeapon;
  }
}

// Retroactive enforcement (user's explicit "auto-unequip violations now"
// call) — a character/companion whose spec/role existed before this system
// did, or who somehow ended up in an illegal state, needs the minimal fix
// decided here rather than being blocked from reading their own character.
// Prefers clearing the offhand alone (the common, strictly cheaper fix);
// only also clears the weapon when the weapon itself is the problem even
// with an empty offhand (a tank's two-hander, or a caster's non-staff
// two-hander) — i.e. when clearing the offhand alone still isn't legal.
export function equipRoleViolationSlots(
  role: EquipRole,
  weaponItem: Pick<ItemDef, 'id' | 'equipSlot' | 'isShield'> | null,
  offhandItem: Pick<ItemDef, 'id' | 'equipSlot' | 'isShield'> | null
): EquipmentSlot[] {
  if (canEquipWeaponLoadout(role, weaponItem, offhandItem)) return [];
  const slots: EquipmentSlot[] = [];
  if (offhandItem) slots.push('offhand');
  if (weaponItem && !canEquipWeaponLoadout(role, weaponItem, null)) slots.push('weapon');
  return slots;
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
  tool_mining: 'Mining Pick',
  tool_skinning: 'Skinning Knife',
  tool_fishing: 'Fishing Rod',
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
// A recipe whose result actually rolls 2 random stats at craft time
// (equipmentRolls.ts's ARMOR_STAT_RANGES) never guarantees item.statBonuses
// — same stale-pre-Mastery-overhaul-data trap ItemSlot.tsx's own tooltip
// already guards against (see its isRandomRollPreview) — so this shows the
// same "Random Stat 1, Random Stat 2" placeholder instead of real numbers.
export function describeItemStats(item: ItemDef): string {
  if (item.type !== 'equipment' || !item.equipSlot) return item.description;
  const parts: string[] = [SLOT_LABELS[item.equipSlot]];
  if (item.armorType) parts.push(item.armorType);
  if (ARMOR_STAT_RANGES[item.id]) {
    parts.push('Random Stat 1, Random Stat 2');
  } else {
    const bonuses = Object.entries(item.statBonuses ?? {})
      .filter(([, value]) => value)
      .map(([stat, value]) => `+${value} ${stat}`);
    if (bonuses.length > 0) parts.push(bonuses.join(', '));
  }
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

// Gear Score — the total of every stat bonus currently added by equipped
// gear (and its enchants), e.g. leggings with +2 Stamina/+3 Strength plus a
// helm with +5 Stamina/+1 Strength is a gear score of 11 (2+3+5+1). A flat
// sum rather than a weighted one on purpose: this is a first-pass, display-
// only number (see gameData/expeditions.ts's module comment on where it's
// headed) — a per-stat weighting scheme is a real future refinement, not
// something to invent speculatively before anything actually consumes it.
// Reuses getEquipmentStatBonuses exactly as EquipmentScreen's own stat
// sheet does, so this always agrees with what a player already sees there.
export function computeGearScore(
  equipment: Record<EquipmentSlot, EquippedItemRef | null>,
  enchantments: Partial<Record<EquipmentSlot, string>> = {},
  enchantmentCharges: Partial<Record<EquipmentSlot, number>> = {}
): number {
  const totals = getEquipmentStatBonuses(equipment, enchantments, enchantmentCharges);
  return Object.values(totals).reduce((sum, value) => sum + (value ?? 0), 0);
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

// The Citadel of Krypt's Full Citadel legendary (Lightningfury) — reads the
// equipped WEAPON's own innate proc (ItemDef.innateProc), entirely separate
// from the weapon-SLOT enchant's own proc (gameData/enchanting.ts's
// buildActiveEnchantTotals). Only a weapon can carry one, and only one
// weapon is ever equipped, so this is a simple lookup, not a sum like the
// two helpers above. Undefined for every weapon before Lightningfury existed.
export function getInnateWeaponProc(equipment: Record<EquipmentSlot, EquippedItemRef | null>): ItemDef['innateProc'] {
  const weaponId = equipment.weapon?.itemId;
  return weaponId ? ITEMS[weaponId]?.innateProc : undefined;
}

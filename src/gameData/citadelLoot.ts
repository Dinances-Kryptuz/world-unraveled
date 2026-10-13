// The Citadel of Krypt — Level 3's BiS purple weapons, generated the same
// way dungeonLoot.ts/towerLoot.ts generate their own fixed-stat drops (one
// variant per SPEC_VARIANTS entry, reused directly rather than re-authored).
// The one thing these add that no prior fixed-stat drop has: an INNATE,
// always-on fireResistancePct (ItemDef.fireResistancePct — see that field's
// own doc comment) rather than a stat the player has to separately enchant
// on. 50% each, per the locked design: this alone doesn't clear Citadel
// Level 3's 70% soft-gate on its own, but combined with even a couple of
// Ember Orb/Eye enchants it comfortably does — consistent with these being
// the REWARD for clearing Level 3, not a prerequisite to attempt it.
import type { ItemDef, ItemRarity } from './types';
import { SPEC_VARIANTS, SLOT_NOUN, type SpecVariant } from './dungeonLoot';

// Above PURPLE_BUDGET[6]=34 (dungeonLoot.ts's own zone-6 purple budget,
// pyraxis's own drop) — Krypt sits past the existing 6-zone curve, so its
// weapon should read as a genuine upgrade over the current BiS, not a
// lateral reskin.
const KRYPT_WEAPON_BUDGET = 40;
const KRYPT_WEAPON_FIRE_RESIST = 50;

function krypWeaponId(variant: SpecVariant): string {
  return `krypt_weapon_${variant.key}`;
}

function buildKryptWeapon(variant: SpecVariant): ItemDef {
  const primaryVal = Math.round(KRYPT_WEAPON_BUDGET * 0.65);
  const secondaryVal = Math.max(1, KRYPT_WEAPON_BUDGET - primaryVal);
  const slotNoun = SLOT_NOUN.weapon ?? 'weapon';
  return {
    id: krypWeaponId(variant),
    name: `Cinderforged ${slotNoun} of ${variant.label}`,
    type: 'equipment',
    description: `A weapon reforged in Krypt the Firelord's own flame, favoring ${variant.label}. Innately resists fire.`,
    stackable: true,
    equipSlot: 'weapon',
    armorType: variant.armorType,
    statBonuses: { [variant.primary]: primaryVal, [variant.secondary]: secondaryVal },
    fireResistancePct: KRYPT_WEAPON_FIRE_RESIST,
    rarity: 'purple' as ItemRarity,
    sellValue: KRYPT_WEAPON_BUDGET * 3,
  };
}

export const CITADEL_LOOT_ITEMS: Record<string, ItemDef> = {};
export const CITADEL_WEAPON_ITEM_IDS: string[] = [];
// Independent per-variant roll, same convention as DUNGEON_BOSS_LOOT_DROPS —
// spread directly into krypt_the_firelord's own lootTable in monsters.ts.
export const CITADEL_WEAPON_LOOT_DROPS: { itemId: string; chance: number; minQty: number; maxQty: number }[] = [];
for (const variant of SPEC_VARIANTS) {
  const item = buildKryptWeapon(variant);
  CITADEL_LOOT_ITEMS[item.id] = item;
  CITADEL_WEAPON_ITEM_IDS.push(item.id);
  CITADEL_WEAPON_LOOT_DROPS.push({ itemId: item.id, chance: 0.04, minQty: 1, maxQty: 1 });
}

// ── Lightningfury — the Full Citadel's 0.01%-drop legendary ────────────────
// A single, universal item (no armorType — see classStats.ts's
// canClassEquip: an undefined armorType is never restricted), not a 9-
// variant set like every other drop in this file, matching the "one true
// legendary" chase-item convention this whole feature was scoped around
// (Orange/Legendary was deliberately held back from both Tower and Citadel's
// regular loot specifically for this). Every base stat at a flat, moderate
// value (12 each — roughly 40% of a single Krypt weapon's primary-stat
// value, spread across 5 stats instead of 2, so it reads as a genuine
// universal upgrade without being an outright 2.5x power spike for whichever
// 2 stats a given spec actually uses) — flagged for its own dedicated
// stat-budget review once real players are actually seeing this drop, same
// as this whole feature's final report already notes.
export const LIGHTNINGFURY_ITEM_ID = 'lightningfury';
const LIGHTNINGFURY_STAT_VALUE = 12;
export const LIGHTNINGFURY_ITEM: ItemDef = {
  id: LIGHTNINGFURY_ITEM_ID,
  name: 'Lightningfury, Unblessed Blade of the Windavoider',
  type: 'equipment',
  description:
    'A legendary blade pulled from the Citadel of Krypt itself. On hit, it has a chance to arc lightning between nearby enemies, scarring their defenses.',
  stackable: true,
  equipSlot: 'weapon',
  statBonuses: {
    STR: LIGHTNINGFURY_STAT_VALUE,
    STA: LIGHTNINGFURY_STAT_VALUE,
    AGI: LIGHTNINGFURY_STAT_VALUE,
    INT: LIGHTNINGFURY_STAT_VALUE,
    SPI: LIGHTNINGFURY_STAT_VALUE,
  },
  // 'chain_lightning' — see combatEngine/engine.ts's useAbility: on a landed
  // hit, bonus damage (power% of that hit) chains to up to 2 OTHER alive
  // enemies, and every enemy it touches (the primary target included) stacks
  // a -defense debuff (see engine.ts's CHAIN_LIGHTNING_DEBUFF_PCT_PER_STACK/
  // _MAX_STACKS) up to 3 times.
  innateProc: { kind: 'chain_lightning', chancePct: 20, power: 50 },
  rarity: 'orange',
  sellValue: 500,
};
CITADEL_LOOT_ITEMS[LIGHTNINGFURY_ITEM.id] = LIGHTNINGFURY_ITEM;

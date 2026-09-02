import type { ItemDef } from './types';

// V1 has zero stat variance: every unit of a given item is identical.
// This is what lets inventory be a simple { itemId: quantity } map instead
// of tracking per-item instances.

export const ITEMS: Record<string, ItemDef> = {
  // ── Skinning materials ──────────────────────────────────────────────
  light_leather: {
    id: 'light_leather',
    name: 'Light Leather',
    type: 'material',
    description: 'Supple hide taken from small beasts. The backbone of early Leatherworking.',
    stackable: true,
    sellValue: 1,
  },

  // ── Combat drops (non-leather) ──────────────────────────────────────
  boar_meat: {
    id: 'boar_meat',
    name: 'Boar Meat',
    type: 'material',
    description: 'Raw meat from a Greenhorn Boar.',
    stackable: true,
    sellValue: 1,
  },
  small_tusk: {
    id: 'small_tusk',
    name: 'Small Tusk',
    type: 'material',
    description: 'A curved tusk, prized by trinket-makers.',
    stackable: true,
    sellValue: 3,
  },
  wolf_fang: {
    id: 'wolf_fang',
    name: 'Wolf Fang',
    type: 'material',
    description: 'A sharp fang from a Forest Wolf.',
    stackable: true,
    sellValue: 2,
  },
  raw_meat: {
    id: 'raw_meat',
    name: 'Raw Meat',
    type: 'material',
    description: 'Common meat from a slain beast.',
    stackable: true,
    sellValue: 1,
  },
  linen_cloth: {
    id: 'linen_cloth',
    name: 'Linen Cloth',
    type: 'material',
    description: 'Coarse woven cloth, stripped from a humanoid enemy.',
    stackable: true,
    sellValue: 2,
  },
  copper_scrap: {
    id: 'copper_scrap',
    name: 'Copper Scrap',
    type: 'material',
    description: 'Bits of scavenged copper.',
    stackable: true,
    sellValue: 2,
  },
  small_coin_pouch: {
    id: 'small_coin_pouch',
    name: 'Small Coin Pouch',
    type: 'material',
    description: 'A pouch that can be sold for a handful of Gold.',
    stackable: true,
    sellValue: 5,
  },
  lucky_foot: {
    id: 'lucky_foot',
    name: "Lucky Foot",
    type: 'material',
    description: 'Said to bring good fortune. Mostly just a curiosity.',
    stackable: true,
    sellValue: 4,
  },

  // ── Gathering node materials ────────────────────────────────────────
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper Ore',
    type: 'material',
    description: 'Raw ore mined from a Copper Vein.',
    stackable: true,
    sellValue: 1,
  },
  peacebloom: {
    id: 'peacebloom',
    name: 'Peacebloom',
    type: 'material',
    description: 'A common but useful herb.',
    stackable: true,
    sellValue: 1,
  },

  // ── Leatherworking equipment (V1 recipes) ───────────────────────────
  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    type: 'equipment',
    description: 'Simple boots stitched from Light Leather.',
    stackable: true,
    equipSlot: 'boots',
    statBonuses: { defense: 2 },
    sellValue: 6,
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'Leather Gloves',
    type: 'equipment',
    description: 'Flexible gloves that improve your grip in combat.',
    stackable: true,
    equipSlot: 'gloves',
    statBonuses: { attack: 2 },
    sellValue: 8,
  },
  leather_cap: {
    id: 'leather_cap',
    name: 'Leather Cap',
    type: 'equipment',
    description: 'A hardened leather cap offering solid protection.',
    stackable: true,
    equipSlot: 'helmet',
    statBonuses: { defense: 3, maxHp: 5 },
    sellValue: 10,
  },
};

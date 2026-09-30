import type { ItemDef } from './types';

// V1 has zero stat variance: every unit of a given item is identical.
// This is what lets inventory be a simple { itemId: quantity } map instead
// of tracking per-item instances.

export const ITEMS: Record<string, ItemDef> = {
  // ── Starter gear — granted directly at character creation (see
  // firebase/character.ts's createCharacter), not sold, gathered, or
  // crafted. A level-1 character fighting bare-handed dies to the first
  // same-level enemy within a couple of hits; this closes most of that gap
  // with "single digit" stat bumps per the design doc, without touching
  // the calibrated per-level/per-spec combat formulas. novice_tunic and
  // novice_boots are cloth so they're legal for every class (cloth is
  // always allowed, even for Warrior/Paladin) — one shared pair of armor
  // items instead of one per class. ──────────────────────────────────────
  novice_blade: {
    id: 'novice_blade', name: 'Novice Blade', type: 'equipment',
    description: 'A plain but serviceable blade issued to every new recruit.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 5 }, sellValue: 1,
  },
  novice_focus: {
    id: 'novice_focus', name: 'Novice Focus', type: 'equipment',
    description: 'A simple focus for channeling the first sparks of spellcraft.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 5 }, sellValue: 1,
  },
  novice_tunic: {
    id: 'novice_tunic', name: 'Novice Tunic', type: 'equipment',
    description: 'A sturdy traveling tunic, plain but well-made.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { STA: 5 }, sellValue: 1,
  },
  novice_boots: {
    id: 'novice_boots', name: 'Novice Boots', type: 'equipment',
    description: 'Well-worn boots, broken in for the road ahead.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { STA: 3 }, sellValue: 1,
  },

  // ── Skinning materials ──────────────────────────────────────────────
  leather_scraps: {
    id: 'leather_scraps',
    name: 'Leather Scraps',
    type: 'material',
    description: 'Small offcuts of hide. Not much use on their own, but Leatherworking can piece several together into Light Leather.',
    stackable: true,
    sellValue: 1,
  },
  light_leather: {
    id: 'light_leather',
    name: 'Light Leather',
    type: 'material',
    description: 'Supple hide pieced together from Leather Scraps. The backbone of early Leatherworking.',
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
    armorType: 'leather',
    statBonuses: { STA: 2 },
    sellValue: 6,
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'Leather Gloves',
    type: 'equipment',
    description: 'Flexible gloves that improve your grip in combat.',
    stackable: true,
    equipSlot: 'gloves',
    armorType: 'leather',
    statBonuses: { STR: 2 },
    sellValue: 8,
  },
  leather_cap: {
    id: 'leather_cap',
    name: 'Leather Cap',
    type: 'equipment',
    description: 'A hardened leather cap offering solid protection.',
    stackable: true,
    equipSlot: 'helmet',
    armorType: 'leather',
    statBonuses: { STA: 3 },
    sellValue: 10,
  },
    rusty_dagger: {
    id: 'rusty_dagger', name: 'Rusty Dagger', type: 'equipment',
    description: 'A crude blade, scavenged from a fallen kobold. Better than fists.', stackable: true,
    equipSlot: 'weapon', statBonuses: { STR: 3 }, sellValue: 12,
  },
  apprentice_staff: {
    id: 'apprentice_staff', name: 'Apprentice Staff', type: 'equipment',
    description: 'A gnarled staff taken from a kobold shaman, still humming with residual magic.', stackable: true,
    equipSlot: 'weapon', statBonuses: { INT: 3 }, sellValue: 12,
  },

  // ── Stonecrag Foothills materials ────────────────────────────────────
  coarse_hide: {
    id: 'coarse_hide',
    name: 'Coarse Hide',
    type: 'material',
    description: 'A tough hide, roughened by life on the rocky slopes.',
    stackable: true,
    sellValue: 2,
  },
  thick_hide: {
    id: 'thick_hide',
    name: 'Thick Hide',
    type: 'material',
    description: 'A dense hide from a foothill goat, good for heavier leatherwork.',
    stackable: true,
    sellValue: 3,
  },
  goat_horn: {
    id: 'goat_horn',
    name: 'Goat Horn',
    type: 'material',
    description: 'A curved horn, sturdy enough to interest a craftsman.',
    stackable: true,
    sellValue: 6,
  },
  stone_shard: {
    id: 'stone_shard',
    name: 'Stone Shard',
    type: 'material',
    description: 'A jagged fragment chipped from living rock.',
    stackable: true,
    sellValue: 2,
  },
  tin_ore: {
    id: 'tin_ore',
    name: 'Tin Ore',
    type: 'material',
    description: 'Raw ore mined from a Tin Vein, softer than copper.',
    stackable: true,
    sellValue: 2,
  },
  flawed_gem: {
    id: 'flawed_gem',
    name: 'Flawed Gem',
    type: 'material',
    description: 'A dull, cloudy gemstone. Worth something, but not much.',
    stackable: true,
    sellValue: 15,
  },
  coarse_cloth: {
    id: 'coarse_cloth',
    name: 'Coarse Cloth',
    type: 'material',
    description: 'Rough-spun cloth stripped from a highland bandit.',
    stackable: true,
    sellValue: 3,
  },
  bandit_coin_pouch: {
    id: 'bandit_coin_pouch',
    name: 'Bandit Coin Pouch',
    type: 'material',
    description: 'A heavier pouch than most — this bandit was doing well.',
    stackable: true,
    sellValue: 10,
  },
  worn_shiv: {
    id: 'worn_shiv',
    name: 'Worn Shiv',
    type: 'material',
    description: 'A crude blade, too worn to be worth equipping. Someone might still buy it.',
    stackable: true,
    sellValue: 5,
  },
  sharp_fang: {
    id: 'sharp_fang',
    name: 'Sharp Fang',
    type: 'material',
    description: 'A large fang from a foothill wolf.',
    stackable: true,
    sellValue: 4,
  },
  alpha_pelt: {
    id: 'alpha_pelt',
    name: 'Alpha Pelt',
    type: 'material',
    description: 'A pristine pelt from a pack alpha — rare, and prized by leatherworkers for a reason.',
    stackable: true,
    sellValue: 20,
  },
  mountain_sage: {
    id: 'mountain_sage',
    name: 'Mountain Sage',
    type: 'material',
    description: 'A hardy herb that grows in thin, rocky soil.',
    stackable: true,
    sellValue: 2,
  },
  coarse_leather: {
    id: 'coarse_leather',
    name: 'Coarse Leather',
    type: 'material',
    description: 'Several coarse hides worked together into a tougher leather than the Greenhollow kind.',
    stackable: true,
    sellValue: 3,
  },

  // ── Stonecrag Foothills equipment ────────────────────────────────────
  reinforced_leather_vest: {
    id: 'reinforced_leather_vest', name: 'Reinforced Leather Vest', type: 'equipment',
    description: 'A sturdy leather vest built for the rocky foothills — a real step up from apprentice work.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 5, STR: 2 }, sellValue: 18,
  },
  alphahide_gloves: {
    id: 'alphahide_gloves', name: 'Alphahide Gloves', type: 'equipment',
    description: "Gloves cut from a pack alpha's pelt. Only the strongest wolf in the foothills carries hide like this.",
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 4, STR: 4 }, sellValue: 25,
  },
  alpha_fang_blade: {
    id: 'alpha_fang_blade', name: 'Alpha Fang Blade', type: 'equipment',
    description: "A blade hafted from a pack alpha's own fang — a rare trophy from the toughest thing in the foothills.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 6 }, sellValue: 30,
  },
  focusing_wand: {
    id: 'focusing_wand', name: 'Focusing Wand', type: 'equipment',
    description: "A bandit's stolen spellcasting focus, still humming with someone else's magic.",
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 5 }, sellValue: 26,
  },

  // ── Smithing materials ───────────────────────────────────────────────
  copper_bar: {
    id: 'copper_bar',
    name: 'Copper Bar',
    type: 'material',
    description: 'Copper ore smelted down into a workable bar.',
    stackable: true,
    sellValue: 3,
  },
  bronze_bar: {
    id: 'bronze_bar',
    name: 'Bronze Bar',
    type: 'material',
    description: 'Copper alloyed with tin — sturdier than copper alone.',
    stackable: true,
    sellValue: 6,
  },

  // ── Smithing equipment ───────────────────────────────────────────────
  copper_chestguard: {
    id: 'copper_chestguard',
    name: 'Copper Chestguard',
    type: 'equipment',
    description: 'A simple chestpiece hammered from copper bars.',
    stackable: true,
    equipSlot: 'chest',
    armorType: 'plate',
    statBonuses: { STA: 3 },
    sellValue: 10,
  },
  copper_legguards: {
    id: 'copper_legguards',
    name: 'Copper Legguards',
    type: 'equipment',
    description: 'Banded copper plating that protects the legs without slowing you down.',
    stackable: true,
    equipSlot: 'legs',
    armorType: 'plate',
    statBonuses: { STR: 2, STA: 2 },
    sellValue: 12,
  },
  bronze_sword: {
    id: 'bronze_sword',
    name: 'Bronze Sword',
    type: 'equipment',
    description: 'A proper forged blade — a clear step up from a scavenged dagger.',
    stackable: true,
    equipSlot: 'weapon',
    statBonuses: { STR: 5 },
    sellValue: 20,
  },

  // ── Tailoring materials ──────────────────────────────────────────────
  simple_thread: {
    id: 'simple_thread',
    name: 'Simple Thread',
    type: 'material',
    description: 'Plain thread for stitching cloth together. Sold by vendors, not gathered.',
    stackable: true,
    sellValue: 1,
  },

  // ── Tailoring equipment ──────────────────────────────────────────────
  linen_robe: {
    id: 'linen_robe',
    name: 'Linen Robe',
    type: 'equipment',
    description: 'A simple robe stitched together from linen cloth.',
    stackable: true,
    equipSlot: 'chest',
    armorType: 'cloth',
    statBonuses: { INT: 2, SPI: 1 },
    sellValue: 8,
  },
  linen_gloves: {
    id: 'linen_gloves',
    name: 'Linen Gloves',
    type: 'equipment',
    description: 'Light gloves that keep the fingers free for spellwork.',
    stackable: true,
    equipSlot: 'gloves',
    armorType: 'cloth',
    statBonuses: { INT: 2 },
    sellValue: 7,
  },
  linen_cap: {
    id: 'linen_cap',
    name: 'Linen Cap',
    type: 'equipment',
    description: 'A soft cap sewn from stitched linen.',
    stackable: true,
    equipSlot: 'helmet',
    armorType: 'cloth',
    statBonuses: { SPI: 2, INT: 1 },
    sellValue: 9,
  },
  sage_leggings: {
    id: 'sage_leggings',
    name: 'Sage-Woven Leggings',
    type: 'equipment',
    description: 'Coarse cloth leggings treated with mountain sage.',
    stackable: true,
    equipSlot: 'legs',
    armorType: 'cloth',
    statBonuses: { INT: 2, SPI: 2 },
    sellValue: 14,
  },

  // ── Dungeon boss drops (Phase 8) ──────────────────────────────────────
  chieftains_warhammer: {
    id: 'chieftains_warhammer', name: "Chieftain's Warhammer", type: 'equipment',
    description: 'The warhammer of the Kobold Warrens’ chieftain — heavier and better balanced than anything else this side of the Warrens.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8 }, sellValue: 45,
  },
  warlords_signet: {
    id: 'warlords_signet', name: "Warlord's Signet", type: 'equipment',
    description: 'A heavy signet ring taken from the Alpha Warlord of the Stonecrag Depths.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 4, STR: 4 }, sellValue: 50,
  },

  // ── Consumables — vendor-bought basics; see Alchemy below for the
  // craftable, stronger line that gives Herbalism's herbs an actual use ──
  health_potion: {
    id: 'health_potion', name: 'Health Potion', type: 'consumable',
    description: 'Restores 20 health. Usable anywhere, once every 30 seconds.',
    stackable: true, sellValue: 3,
    consumableEffect: { healAmount: 20, cooldownSeconds: 30 },
  },
  bread: {
    id: 'bread', name: 'Bread', type: 'consumable',
    description: 'A dense travel loaf. Restores 40 health. Usable anywhere, once every 10 seconds.',
    stackable: true, sellValue: 1,
    consumableEffect: { healAmount: 40, cooldownSeconds: 10 },
  },
  orange_juice: {
    id: 'orange_juice', name: 'Orange Juice', type: 'consumable',
    description: 'Freshly squeezed. Restores 50 mana. Only usable in combat (there’s no mana to restore outside a fight), once every 10 seconds.',
    stackable: true, sellValue: 1,
    consumableEffect: { manaAmount: 50, cooldownSeconds: 10 },
  },

  // ── Alchemy — crafted from Herbalism's herbs, stronger than the vendor line above ──
  minor_healing_draught: {
    id: 'minor_healing_draught', name: 'Minor Healing Draught', type: 'consumable',
    description: 'A simple alchemical brew. Restores 35 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 2,
    consumableEffect: { healAmount: 35, cooldownSeconds: 25 },
  },
  minor_mana_draught: {
    id: 'minor_mana_draught', name: 'Minor Mana Draught', type: 'consumable',
    description: 'Restores 70 mana. Only usable in combat, once every 10 seconds.',
    stackable: true, sellValue: 2,
    consumableEffect: { manaAmount: 70, cooldownSeconds: 10 },
  },
  sage_healing_potion: {
    id: 'sage_healing_potion', name: 'Sage Healing Potion', type: 'consumable',
    description: 'A stronger brew made with mountain sage. Restores 70 health. Usable anywhere, once every 20 seconds.',
    stackable: true, sellValue: 4,
    consumableEffect: { healAmount: 70, cooldownSeconds: 20 },
  },
  sunpetal_elixir: {
    id: 'sunpetal_elixir', name: 'Sunpetal Elixir', type: 'consumable',
    description: 'A potent brew of Emberfall sunpetal. Restores 110 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 6,
    consumableEffect: { healAmount: 110, cooldownSeconds: 25 },
  },

  // ── Emberfall Ridge materials ─────────────────────────────────────────
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    type: 'material',
    description: 'Raw ore mined from an Iron Vein, heavier and harder than tin.',
    stackable: true,
    sellValue: 3,
  },
  sunpetal: {
    id: 'sunpetal',
    name: 'Sunpetal',
    type: 'material',
    description: 'A bright, heat-loving flower that only grows near open flame.',
    stackable: true,
    sellValue: 2,
  },
  scaled_hide: {
    id: 'scaled_hide',
    name: 'Scaled Hide',
    type: 'material',
    description: "Tough, fire-hardened hide shed by the ridge's wolves.",
    stackable: true,
    sellValue: 3,
  },
  iron_bar: {
    id: 'iron_bar',
    name: 'Iron Bar',
    type: 'material',
    description: 'Iron ore smelted into a dense, workable bar.',
    stackable: true,
    sellValue: 7,
  },
  scaled_leather: {
    id: 'scaled_leather',
    name: 'Scaled Leather',
    type: 'material',
    description: 'Several scaled hides worked into leather tough enough to shrug off embers.',
    stackable: true,
    sellValue: 4,
  },
  heavy_cloth: {
    id: 'heavy_cloth',
    name: 'Heavy Cloth',
    type: 'material',
    description: 'Densely woven cloth, thick enough to blunt a blade.',
    stackable: true,
    sellValue: 4,
  },
  ember_shard: {
    id: 'ember_shard',
    name: 'Ember Shard',
    type: 'material',
    description: 'A shard of stone still warm to the touch, prized by craftsmen.',
    stackable: true,
    sellValue: 15,
  },
  obsidian_shard: {
    id: 'obsidian_shard',
    name: 'Obsidian Shard',
    type: 'material',
    description: 'A jagged black glass fragment, cooled from molten rock.',
    stackable: true,
    sellValue: 18,
  },

  // ── Emberfall Ridge equipment ─────────────────────────────────────────
  iron_chestguard: {
    id: 'iron_chestguard', name: 'Iron Chestguard', type: 'equipment',
    description: 'A heavy plate chestpiece hammered from iron bars.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 8 }, sellValue: 32,
  },
  iron_greatsword: {
    id: 'iron_greatsword', name: 'Iron Greatsword', type: 'equipment',
    description: 'A hefty forged blade, a clear step up from bronze.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 10 }, sellValue: 40,
  },
  scaled_leggings: {
    id: 'scaled_leggings', name: 'Scaled Leggings', type: 'equipment',
    description: 'Leggings worked from fire-hardened scaled leather.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 7, STR: 4 }, sellValue: 34,
  },
  drakescale_boots: {
    id: 'drakescale_boots', name: 'Drakescale Boots', type: 'equipment',
    description: 'Boots reinforced with an ember shard — warm to the touch, and nearly as tough as a drake.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 6, STR: 6 }, sellValue: 42,
  },
  heavy_robe: {
    id: 'heavy_robe', name: 'Heavy Robe', type: 'equipment',
    description: 'A dense robe woven from heavy cloth, built to survive the ridge as much as the fight.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 6, SPI: 4 }, sellValue: 30,
  },
  serrated_cleaver: {
    id: 'serrated_cleaver', name: 'Serrated Cleaver', type: 'equipment',
    description: "A brutal, notch-edged blade favored by the ridge's marauders.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8 }, sellValue: 35,
  },
  drakes_ember_eye: {
    id: 'drakes_ember_eye', name: "Drake's Ember Eye", type: 'equipment',
    description: 'A polished ring set with a still-smoldering ember, taken from a scorched drake.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 7 }, sellValue: 44,
  },

  // ── Sundered Forge dungeon boss drop ─────────────────────────────────
  kaldrun_warhammer: {
    id: 'kaldrun_warhammer', name: "Kaldrun's Warhammer", type: 'equipment',
    description: "The Forgemaster's own warhammer — heavier and better balanced than anything else on the ridge.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12, STA: 3 }, sellValue: 70,
  },
};

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
  silver_ore: {
    id: 'silver_ore',
    name: 'Silver Ore',
    type: 'material',
    description: 'A bright, lustrous ore mined from a Silver Vein.',
    stackable: true,
    sellValue: 3,
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
  thick_hide_cap: {
    id: 'thick_hide_cap', name: 'Thick Hide Cap', type: 'equipment',
    description: 'A heavy cap worked from thick hide, built to take a hit on the rocky trails.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 5 }, sellValue: 20,
  },
  ridgehide_boots: {
    id: 'ridgehide_boots', name: 'Ridgehide Boots', type: 'equipment',
    description: 'Sturdy boots cut from coarse leather and thick hide, soled for broken rock.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 4, STR: 3 }, sellValue: 20,
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
  stolen_spellband: {
    id: 'stolen_spellband', name: 'Stolen Spellband', type: 'equipment',
    description: "Another piece of a bandit's stolen spellcasting kit — a ring that still carries a trace of someone else's magic.",
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 4, STA: 4 }, sellValue: 50,
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
  tin_bar: {
    id: 'tin_bar',
    name: 'Tin Bar',
    type: 'material',
    description: 'Tin ore smelted down into a workable bar.',
    stackable: true,
    sellValue: 4,
  },
  silver_bar: {
    id: 'silver_bar',
    name: 'Silver Bar',
    type: 'material',
    description: 'Silver ore smelted down into a workable bar.',
    stackable: true,
    sellValue: 5,
  },
  bronze_bar: {
    id: 'bronze_bar',
    name: 'Bronze Bar',
    type: 'material',
    description: 'Copper alloyed with tin — sturdier than copper alone.',
    stackable: true,
    sellValue: 6,
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
  linen_boots: {
    id: 'linen_boots',
    name: 'Linen Boots',
    type: 'equipment',
    description: 'Soft-soled boots stitched from linen, quiet enough for spellwork on the move.',
    stackable: true,
    equipSlot: 'boots',
    armorType: 'cloth',
    statBonuses: { INT: 1, SPI: 2 },
    sellValue: 8,
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
  chieftains_seal: {
    id: 'chieftains_seal', name: "Chieftain's Seal", type: 'equipment',
    description: 'A plain band the Kobold Chieftain wore into every fight — worn smooth, but still solid.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 3 }, sellValue: 15,
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
  steel_bar: {
    id: 'steel_bar',
    name: 'Steel Bar',
    type: 'material',
    description: 'Iron ore smelted twice over into a harder, refined bar.',
    stackable: true,
    sellValue: 10,
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
    name: 'Dense Stone',
    type: 'material',
    description: 'An unusually dense stone found alongside thorium ore.',
    stackable: true,
    sellValue: 18,
  },

  // ── Emberfall Ridge equipment ─────────────────────────────────────────
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
  scaled_gloves: {
    id: 'scaled_gloves', name: 'Scaled Gloves', type: 'equipment',
    description: 'Gloves worked from fire-hardened scaled leather — the grip holds even when the hilt gets hot.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 5, STR: 3 }, sellValue: 32,
  },
  scaled_cap: {
    id: 'scaled_cap', name: 'Scaled Cap', type: 'equipment',
    description: 'A cap of overlapping scaled leather plates, tough enough to turn a glancing blow.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 7 }, sellValue: 30,
  },
  heavy_robe: {
    id: 'heavy_robe', name: 'Heavy Robe', type: 'equipment',
    description: 'A dense robe woven from heavy cloth, built to survive the ridge as much as the fight.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 6, SPI: 4 }, sellValue: 30,
  },
  heavy_leggings: {
    id: 'heavy_leggings', name: 'Heavy Leggings', type: 'equipment',
    description: 'Leggings woven from heavy cloth, thick enough to blunt a blade.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 8, SPI: 5 }, sellValue: 32,
  },
  heavy_gloves: {
    id: 'heavy_gloves', name: 'Heavy Gloves', type: 'equipment',
    description: 'Gloves cut from heavy cloth, thick but never clumsy.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 6, SPI: 3 }, sellValue: 28,
  },
  heavy_cap: {
    id: 'heavy_cap', name: 'Heavy Cap', type: 'equipment',
    description: 'A dense cloth cap, warm against the ridge’s wind.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 8, SPI: 2 }, sellValue: 30,
  },
  heavy_boots: {
    id: 'heavy_boots', name: 'Heavy Boots', type: 'equipment',
    description: 'Boots cut from heavy cloth and lined for the ridge’s scorched ground.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 31,
  },
  serrated_cleaver: {
    id: 'serrated_cleaver', name: 'Serrated Cleaver', type: 'equipment',
    description: "A brutal, notch-edged blade favored by the ridge's marauders.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8 }, sellValue: 35,
  },
  embertwined_rod: {
    id: 'embertwined_rod', name: 'Ember-Twined Rod', type: 'equipment',
    description: 'A rod wound with heat-cured vine, dropped by the same marauders who prize the Serrated Cleaver.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 8 }, sellValue: 35,
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
  kaldrun_tempered_band: {
    id: 'kaldrun_tempered_band', name: "Kaldrun's Tempered Band", type: 'equipment',
    description: "A heavy ring quenched in the Forgemaster's own fire, matching the ember-set rings the ridge's drakes carry.",
    stackable: true, equipSlot: 'ring', statBonuses: { STR: 7 }, sellValue: 44,
  },

  // ── Cinderfall Depths materials ───────────────────────────────────────
  mithril_ore: {
    id: 'mithril_ore', name: 'Mithril Ore', type: 'material',
    description: 'A light but immensely strong ore, found deep in collapsed dwarven tunnels.',
    stackable: true, sellValue: 4,
  },
  gold_ore: {
    id: 'gold_ore', name: 'Gold Ore', type: 'material',
    description: 'A soft, gleaming ore mined from a Gold Vein.',
    stackable: true, sellValue: 5,
  },
  emberpetal: {
    id: 'emberpetal', name: 'Emberpetal', type: 'material',
    description: 'A hardy bloom that thrives on residual heat, found nowhere else.',
    stackable: true, sellValue: 3,
  },
  ashhide: {
    id: 'ashhide', name: 'Ashhide', type: 'material',
    description: 'Tough, ash-grey hide from a beast long adapted to the ruins.',
    stackable: true, sellValue: 4,
  },
  mithril_bar: {
    id: 'mithril_bar', name: 'Mithril Bar', type: 'material',
    description: 'Mithril ore smelted into a light, immensely strong bar.',
    stackable: true, sellValue: 9,
  },
  gold_bar: {
    id: 'gold_bar', name: 'Gold Bar', type: 'material',
    description: 'Gold ore smelted into a soft, gleaming bar.',
    stackable: true, sellValue: 10,
  },
  ashhide_leather: {
    id: 'ashhide_leather', name: 'Ashhide Leather', type: 'material',
    description: 'Ashhide worked into leather tough enough to survive the ruins.',
    stackable: true, sellValue: 5,
  },
  ashwoven_cloth: {
    id: 'ashwoven_cloth', name: 'Ashwoven Cloth', type: 'material',
    description: 'Cloth salvaged from a cinder scavenger, woven through with fine ash fibers.',
    stackable: true, sellValue: 5,
  },
  cindercore_shard: {
    id: 'cindercore_shard', name: 'Cindercore Shard', type: 'material',
    description: 'A shard still glowing faintly from within, prized by craftsmen.',
    stackable: true, sellValue: 18,
  },
  smoky_quartz: {
    id: 'smoky_quartz', name: 'Smoky Quartz', type: 'material',
    description: 'A dark, smoke-clouded crystal formed under ash and pressure.',
    stackable: true, sellValue: 20,
  },

  // ── Cinderfall Depths equipment ───────────────────────────────────────
  ashhide_leggings: {
    id: 'ashhide_leggings', name: 'Ashhide Leggings', type: 'equipment',
    description: 'Leggings worked from tough ashhide leather.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 8, STR: 5 }, sellValue: 40,
  },
  ashhide_boots: {
    id: 'ashhide_boots', name: 'Ashhide Boots', type: 'equipment',
    description: 'Boots reinforced with a cindercore shard, warm underfoot even in the deep ruins.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 7, STR: 7 }, sellValue: 50,
  },
  ashhide_gloves: {
    id: 'ashhide_gloves', name: 'Ashhide Gloves', type: 'equipment',
    description: 'Gloves cut from tough ashhide, stitched to survive the ruins.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 6, STR: 4 }, sellValue: 38,
  },
  ashhide_cap: {
    id: 'ashhide_cap', name: 'Ashhide Cap', type: 'equipment',
    description: 'A sturdy cap of ashhide leather, worn by scavengers who plan on coming back out.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 9 }, sellValue: 35,
  },
  ashwoven_robe: {
    id: 'ashwoven_robe', name: 'Ashwoven Robe', type: 'equipment',
    description: 'A robe woven from salvaged ashwoven cloth, still faintly warm.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 36,
  },
  ashwoven_leggings: {
    id: 'ashwoven_leggings', name: 'Ashwoven Leggings', type: 'equipment',
    description: 'Leggings woven from salvaged ashwoven cloth.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 9, SPI: 6 }, sellValue: 38,
  },
  ashwoven_gloves: {
    id: 'ashwoven_gloves', name: 'Ashwoven Gloves', type: 'equipment',
    description: 'Gloves cut from ashwoven cloth, still faintly warm.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 7, SPI: 4 }, sellValue: 34,
  },
  ashwoven_cap: {
    id: 'ashwoven_cap', name: 'Ashwoven Cap', type: 'equipment',
    description: 'A cap of ashwoven cloth, worn by those who work the ruins.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 9, SPI: 3 }, sellValue: 35,
  },
  ashwoven_boots: {
    id: 'ashwoven_boots', name: 'Ashwoven Boots', type: 'equipment',
    description: 'Boots woven from salvaged ashwoven cloth, soft-footed in the ruins.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 37,
  },
  scavenged_hatchet: {
    id: 'scavenged_hatchet', name: 'Scavenged Hatchet', type: 'equipment',
    description: "A cinder scavenger's own hatchet, still sharp despite its owner's fate.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 9 }, sellValue: 40,
  },
  scavenged_focus: {
    id: 'scavenged_focus', name: 'Scavenged Focus', type: 'equipment',
    description: "A cracked focusing crystal pried from the same scavenger's hoard as the Scavenged Hatchet.",
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 9 }, sellValue: 40,
  },
  overseers_greatmace: {
    id: 'overseers_greatmace', name: "Overseer's Greatmace", type: 'equipment',
    description: 'The ceremonial mace of the Ashen Overseer — too heavy for most, and twice as deadly.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 14, STA: 4 }, sellValue: 80,
  },
  overseers_band: {
    id: 'overseers_band', name: "Overseer's Band", type: 'equipment',
    description: 'A plain ash-blackened ring the Overseer wore under its gauntlet — solid, and built to outlast whoever wears it.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 8 }, sellValue: 60,
  },
  emberpetal_tonic: {
    id: 'emberpetal_tonic', name: 'Emberpetal Tonic', type: 'consumable',
    description: 'A potent brew of emberpetal. Restores 150 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 8,
    consumableEffect: { healAmount: 150, cooldownSeconds: 25 },
  },

  // ── The Molten Scar materials ─────────────────────────────────────────
  thorium_ore: {
    id: 'thorium_ore', name: 'Thorium Ore', type: 'material',
    description: 'A dense, faintly warm ore that never fully cools, mined from the rift itself.',
    stackable: true, sellValue: 5,
  },
  cinderbloom: {
    id: 'cinderbloom', name: 'Cinderbloom', type: 'material',
    description: 'A rare flower that only grows in the heat radiating from the rift.',
    stackable: true, sellValue: 4,
  },
  scaleback_hide: {
    id: 'scaleback_hide', name: 'Scaleback Hide', type: 'material',
    description: 'Thick, overlapping scaled hide from a beast that calls the rift home.',
    stackable: true, sellValue: 5,
  },
  thorium_bar: {
    id: 'thorium_bar', name: 'Thorium Bar', type: 'material',
    description: 'Thorium ore smelted into a bar that radiates heat long after cooling.',
    stackable: true, sellValue: 11,
  },
  scaleback_leather: {
    id: 'scaleback_leather', name: 'Scaleback Leather', type: 'material',
    description: 'Scaleback hide worked into leather that shrugs off both blade and flame.',
    stackable: true, sellValue: 6,
  },
  charred_cloth: {
    id: 'charred_cloth', name: 'Charred Cloth', type: 'material',
    description: 'Cultist robes, scorched but salvageable.',
    stackable: true, sellValue: 6,
  },
  magma_heart: {
    id: 'magma_heart', name: 'Magma Heart', type: 'material',
    description: 'A core of solidified magma that still pulses with faint heat, prized by craftsmen.',
    stackable: true, sellValue: 22,
  },
  fire_opal: {
    id: 'fire_opal', name: 'Fire Opal', type: 'material',
    description: 'A gemstone that seems to hold a flame within it.',
    stackable: true, sellValue: 25,
  },

  // ── The Molten Scar equipment ─────────────────────────────────────────
  scaleback_leggings: {
    id: 'scaleback_leggings', name: 'Scaleback Leggings', type: 'equipment',
    description: 'Leggings worked from scaleback leather.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 10, STR: 6 }, sellValue: 48,
  },
  scaleback_boots: {
    id: 'scaleback_boots', name: 'Scaleback Boots', type: 'equipment',
    description: 'Boots set with a magma heart, warm and unyielding.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 9, STR: 9 }, sellValue: 62,
  },
  scaleback_gloves: {
    id: 'scaleback_gloves', name: 'Scaleback Gloves', type: 'equipment',
    description: 'Gloves worked from scaleback leather, tough enough to grip a blade fresh from the forge.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 8, STR: 6 }, sellValue: 46,
  },
  scaleback_cap: {
    id: 'scaleback_cap', name: 'Scaleback Cap', type: 'equipment',
    description: 'A heavy cap of scaleback leather, molded to shrug off both blade and flame.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 12 }, sellValue: 42,
  },
  charred_robe: {
    id: 'charred_robe', name: 'Charred Robe', type: 'equipment',
    description: 'A cultist robe, reclaimed and re-stitched from salvaged charred cloth.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 9, SPI: 6 }, sellValue: 44,
  },
  charred_leggings: {
    id: 'charred_leggings', name: 'Charred Leggings', type: 'equipment',
    description: 'Cultist leggings, reclaimed and re-stitched from salvaged charred cloth.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 11, SPI: 7 }, sellValue: 46,
  },
  charred_gloves: {
    id: 'charred_gloves', name: 'Charred Gloves', type: 'equipment',
    description: 'Cultist gloves, still smelling faintly of brimstone.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 9, SPI: 5 }, sellValue: 42,
  },
  charred_cap: {
    id: 'charred_cap', name: 'Charred Cap', type: 'equipment',
    description: "A cultist's hood, reclaimed from the rift's edge.",
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 11, SPI: 4 }, sellValue: 43,
  },
  charred_boots: {
    id: 'charred_boots', name: 'Charred Boots', type: 'equipment',
    description: 'Cultist boots, re-stitched from salvaged charred cloth.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 10, SPI: 7 }, sellValue: 45,
  },
  zealots_blade: {
    id: 'zealots_blade', name: "Zealot's Blade", type: 'equipment',
    description: 'A ritual blade carried by a cultist zealot, its edge blessed by something best left unnamed.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 11 }, sellValue: 50,
  },
  zealots_icon: {
    id: 'zealots_icon', name: "Zealot's Icon", type: 'equipment',
    description: 'A cult icon carried by the same zealot who wields the Zealot’s Blade, warm to the touch.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 11 }, sellValue: 50,
  },
  heralds_ember_band: {
    id: 'heralds_ember_band', name: "Herald's Ember Band", type: 'equipment',
    description: 'A ring taken from the Molten Herald, still warm as a living coal.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 12, STA: 3 }, sellValue: 95,
  },
  magma_forged_band: {
    id: 'magma_forged_band', name: 'Magma-Forged Band', type: 'equipment',
    description: "A heavy band melted and reset around a magma hound's collar — the metal never fully cooled.",
    stackable: true, equipSlot: 'ring', statBonuses: { STR: 12, STA: 3 }, sellValue: 95,
  },
  cinderbloom_elixir: {
    id: 'cinderbloom_elixir', name: 'Cinderbloom Elixir', type: 'consumable',
    description: 'A powerful brew of cinderbloom. Restores 200 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 10,
    consumableEffect: { healAmount: 200, cooldownSeconds: 25 },
  },

  // ── Cinderheart Crater materials ──────────────────────────────────────
  obsidian_ore: {
    id: 'obsidian_ore', name: 'Obsidian Ore', type: 'material',
    description: 'A jagged, glassy-black ore, mined at the very edge of the crater.',
    stackable: true, sellValue: 6,
  },
  platinum_ore: {
    id: 'platinum_ore', name: 'Platinum Ore', type: 'material',
    description: 'A rare, silvery-white ore mined from a Platinum Vein.',
    stackable: true, sellValue: 8,
  },
  emberheart_bloom: {
    id: 'emberheart_bloom', name: 'Emberheart Bloom', type: 'material',
    description: 'A flower that blooms only at the crater’s rim, pulsing faintly like a heartbeat.',
    stackable: true, sellValue: 5,
  },
  emberscale_hide: {
    id: 'emberscale_hide', name: 'Emberscale Hide', type: 'material',
    description: 'Hide from a beast that has lived its whole life at the crater’s edge.',
    stackable: true, sellValue: 6,
  },
  obsidian_bar: {
    id: 'obsidian_bar', name: 'Obsidian Bar', type: 'material',
    description: 'Obsidian ore smelted at incredible heat into a dense, glassy-black bar.',
    stackable: true, sellValue: 13,
  },
  platinum_bar: {
    id: 'platinum_bar', name: 'Platinum Bar', type: 'material',
    description: 'Rare platinum ore smelted into a dense, silvery-white bar.',
    stackable: true, sellValue: 14,
  },
  emberscale_leather: {
    id: 'emberscale_leather', name: 'Emberscale Leather', type: 'material',
    description: 'Emberscale hide worked into the toughest leather yet crafted.',
    stackable: true, sellValue: 7,
  },
  ashenweave_cloth: {
    id: 'ashenweave_cloth', name: 'Ashenweave Cloth', type: 'material',
    description: 'Cloth woven with fine ash, taken from the crater’s most fervent cultists.',
    stackable: true, sellValue: 7,
  },
  emberlords_ash: {
    id: 'emberlords_ash', name: "Emberlord's Ash", type: 'material',
    description: 'Ash gathered at the very edge of the crater, said to still carry a fraction of the sleeping power below.',
    stackable: true, sellValue: 26,
  },
  heartflame_crystal: {
    id: 'heartflame_crystal', name: 'Heartflame Crystal', type: 'material',
    description: 'A crystal that burns with an inner flame, never dimming and never spreading.',
    stackable: true, sellValue: 30,
  },

  // ── Cinderheart Crater equipment ──────────────────────────────────────
  emberscale_leggings: {
    id: 'emberscale_leggings', name: 'Emberscale Leggings', type: 'equipment',
    description: 'Leggings worked from emberscale leather, the toughest hide known.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 12, STR: 7 }, sellValue: 58,
  },
  emberscale_boots: {
    id: 'emberscale_boots', name: 'Emberscale Boots', type: 'equipment',
    description: "Boots set with a fragment of the Emberlord's own ash.",
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 11, STR: 11 }, sellValue: 75,
  },
  emberscale_gloves: {
    id: 'emberscale_gloves', name: 'Emberscale Gloves', type: 'equipment',
    description: 'Gloves worked from the toughest leather known, fit for the crater’s edge.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 10, STR: 8 }, sellValue: 55,
  },
  emberscale_cap: {
    id: 'emberscale_cap', name: 'Emberscale Cap', type: 'equipment',
    description: 'A crown of emberscale leather, worn by those who’ve stared into the crater and lived.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 15 }, sellValue: 50,
  },
  ashenweave_robe: {
    id: 'ashenweave_robe', name: 'Ashenweave Robe', type: 'equipment',
    description: 'A robe woven from the finest ashenweave cloth, taken from the crater’s most devout.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 11, SPI: 7 }, sellValue: 52,
  },
  ashenweave_leggings: {
    id: 'ashenweave_leggings', name: 'Ashenweave Leggings', type: 'equipment',
    description: 'Leggings woven from the finest ashenweave cloth, taken from the crater’s most devout.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 13, SPI: 8 }, sellValue: 55,
  },
  ashenweave_gloves: {
    id: 'ashenweave_gloves', name: 'Ashenweave Gloves', type: 'equipment',
    description: 'Gloves of the finest ashenweave cloth, still warm from the crater’s edge.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 11, SPI: 6 }, sellValue: 50,
  },
  ashenweave_cap: {
    id: 'ashenweave_cap', name: 'Ashenweave Cap', type: 'equipment',
    description: 'A hood of ashenweave cloth, worn by the crater’s most devoted.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 13, SPI: 5 }, sellValue: 51,
  },
  ashenweave_boots: {
    id: 'ashenweave_boots', name: 'Ashenweave Boots', type: 'equipment',
    description: 'Boots of the finest ashenweave cloth, taken from the crater’s most devout.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 12, SPI: 8 }, sellValue: 53,
  },
  harbingers_talon: {
    id: 'harbingers_talon', name: "Harbinger's Talon", type: 'equipment',
    description: "A curved blade shaped like the claw of the Ashfall Harbinger it was taken from.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 13 }, sellValue: 80,
  },
  harbingers_omen: {
    id: 'harbingers_omen', name: "Harbinger's Omen", type: 'equipment',
    description: 'A cracked oracle-bone carried by the Ashfall Harbinger, still whispering warnings of what’s waking below.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 13 }, sellValue: 80,
  },
  sentinels_signet: {
    id: 'sentinels_signet', name: "Sentinel's Signet", type: 'equipment',
    description: 'A heavy signet ring pried from a fallen Emberguard Sentinel.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 10 }, sellValue: 85,
  },
  emberheart_potion: {
    id: 'emberheart_potion', name: 'Emberheart Potion', type: 'consumable',
    description: 'The strongest healing brew yet devised. Restores 260 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 14,
    consumableEffect: { healAmount: 260, cooldownSeconds: 25 },
  },

  // ── Cinderheart Sanctum dungeon boss drop ─────────────────────────────
  pyraxis_warblade: {
    id: 'pyraxis_warblade', name: "Pyraxis's Warblade", type: 'equipment',
    description: 'The warblade of Pyraxis, Warden of the Cinderheart — forged in fire older than the world above.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 18, STA: 5 }, sellValue: 140,
  },

  // ── Damaged dungeon boss drops — unequippable (no equipSlot) until a
  // Blacksmith repairs them into the real item above. See recipes.ts's
  // "Repairs" section and monsters.ts's ashen_overseer/pyraxis lootTables,
  // which drop these instead of the finished item directly.
  overseers_greatmace_damaged: {
    id: 'overseers_greatmace_damaged', name: "Overseer's Greatmace (Damaged)", type: 'material',
    description: 'The Overseer’s greatmace, cracked and ash-choked from the fight that won it. A skilled Blacksmith could restore it.',
    stackable: true, repairsIntoItemId: 'overseers_greatmace', sellValue: 20,
  },
  pyraxis_warblade_damaged: {
    id: 'pyraxis_warblade_damaged', name: "Pyraxis's Warblade (Damaged)", type: 'material',
    description: 'Pyraxis’s warblade, its edge shattered and its fire gone cold. Only an Artisan Blacksmith could reforge it.',
    stackable: true, repairsIntoItemId: 'pyraxis_warblade', sellValue: 35,
  },

  // ── Profession tools — equipSlot 'tool', one tier per zone, sold by each
  // zone's vendor. gatherBonusPct is deliberately modest (see the design
  // brief: "do not allow tools to become an enormous source of power").
  rusty_mining_pick: {
    id: 'rusty_mining_pick', name: 'Rusty Mining Pick', type: 'equipment',
    description: 'A basic mining pick, nicked and pitted but serviceable.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 0, sellValue: 2,
  },
  sturdy_mining_pick: {
    id: 'sturdy_mining_pick', name: 'Sturdy Mining Pick', type: 'equipment',
    description: 'A well-balanced pick that bites deeper with less effort.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 2, sellValue: 8,
  },
  embertempered_pick: {
    id: 'embertempered_pick', name: 'Ember-Tempered Pick', type: 'equipment',
    description: 'Quenched in Emberfall’s heat, its head barely dulls.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 4, sellValue: 18,
  },
  dwarven_mining_pick: {
    id: 'dwarven_mining_pick', name: 'Dwarven Mining Pick', type: 'equipment',
    description: 'Dwarven-forged and perfectly weighted, recovered from Cinderfall’s ruined forges.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 6, sellValue: 35,
  },
  brimstone_pick: {
    id: 'brimstone_pick', name: 'Brimstone Pick', type: 'equipment',
    description: 'Its head is cast from cooled brimstone, hard enough to crack any seam in the Scar.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 8, sellValue: 60,
  },
  emberforged_pick: {
    id: 'emberforged_pick', name: 'Emberforged Pick', type: 'equipment',
    description: 'Forged at the world’s molten heart — the finest mining pick there is.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 10, sellValue: 95,
  },

  worn_skinning_knife: {
    id: 'worn_skinning_knife', name: 'Worn Skinning Knife', type: 'equipment',
    description: 'A basic skinning knife with a dull but functional edge.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 0, sellValue: 2,
  },
  honed_skinning_knife: {
    id: 'honed_skinning_knife', name: 'Honed Skinning Knife', type: 'equipment',
    description: 'Freshly honed, it parts hide cleanly from flesh.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 2, sellValue: 8,
  },
  embertempered_skinning_knife: {
    id: 'embertempered_skinning_knife', name: 'Ember-Tempered Skinning Knife', type: 'equipment',
    description: 'Tempered in Emberfall’s forges, it holds an edge far longer.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 4, sellValue: 18,
  },
  dwarven_skinning_knife: {
    id: 'dwarven_skinning_knife', name: 'Dwarven Skinning Knife', type: 'equipment',
    description: 'A dwarven blade recovered from Cinderfall, still razor-true.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 6, sellValue: 35,
  },
  brimstone_skinning_knife: {
    id: 'brimstone_skinning_knife', name: 'Brimstone Skinning Knife', type: 'equipment',
    description: 'Its blade is quenched brimstone-black and never seems to dull.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 8, sellValue: 60,
  },
  emberforged_skinning_knife: {
    id: 'emberforged_skinning_knife', name: 'Emberforged Skinning Knife', type: 'equipment',
    description: 'Forged at the world’s molten heart — the finest skinning knife there is.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 10, sellValue: 95,
  },

  simple_fishing_rod: {
    id: 'simple_fishing_rod', name: 'Simple Fishing Rod', type: 'equipment',
    description: 'A plain rod cut from a sapling branch — good enough to start.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 0, sellValue: 2,
  },
  reinforced_fishing_rod: {
    id: 'reinforced_fishing_rod', name: 'Reinforced Fishing Rod', type: 'equipment',
    description: 'Reinforced with wire-wrapped joints for a sturdier cast.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 2, sellValue: 8,
  },
  embercured_fishing_rod: {
    id: 'embercured_fishing_rod', name: 'Ember-Cured Fishing Rod', type: 'equipment',
    description: 'Cured over Emberfall’s fissures until the wood turned iron-hard.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 4, sellValue: 18,
  },
  dwarven_fishing_rod: {
    id: 'dwarven_fishing_rod', name: 'Dwarven Fishing Rod', type: 'equipment',
    description: 'A dwarven angler’s rod, recovered intact from Cinderfall’s flooded lower halls.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 6, sellValue: 35,
  },
  brimstone_fishing_rod: {
    id: 'brimstone_fishing_rod', name: 'Brimstone Fishing Rod', type: 'equipment',
    description: 'Its line is woven from heat-cured brimstone fiber, strong enough for anything the Scar’s pools hold.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 8, sellValue: 60,
  },
  emberforged_fishing_rod: {
    id: 'emberforged_fishing_rod', name: 'Emberforged Fishing Rod', type: 'equipment',
    description: 'Forged at the world’s molten heart — the finest fishing rod there is.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 10, sellValue: 95,
  },

  // ── Fish — Fishing's primary yield, feeding Cooking. One common fish per
  // zone, scaling in value and in the Cooking recipes that use them.
  brook_trout: {
    id: 'brook_trout', name: 'Brook Trout', type: 'material',
    description: 'A common trout pulled from Greenhollow’s streams.',
    stackable: true, sellValue: 2,
  },
  mountain_char: {
    id: 'mountain_char', name: 'Mountain Char', type: 'material',
    description: 'A cold-water fish from Stonecrag’s highland pools.',
    stackable: true, sellValue: 4,
  },
  ember_eel: {
    id: 'ember_eel', name: 'Ember Eel', type: 'material',
    description: 'An eel that thrives in Emberfall’s heat-warmed waters.',
    stackable: true, sellValue: 7,
  },
  ashfin_carp: {
    id: 'ashfin_carp', name: 'Ashfin Carp', type: 'material',
    description: 'A pale carp found in Cinderfall’s flooded depths.',
    stackable: true, sellValue: 10,
  },
  magma_darter: {
    id: 'magma_darter', name: 'Magma Darter', type: 'material',
    description: 'A quick, heat-blooded fish that darts through the Scar’s cooler pools.',
    stackable: true, sellValue: 14,
  },
  emberheart_koi: {
    id: 'emberheart_koi', name: 'Emberheart Koi', type: 'material',
    description: 'A striking, ember-scaled koi found only at the world’s molten heart.',
    stackable: true, sellValue: 20,
  },

  // ── Cooking's non-fish ingredients — monster drops (boar_meat/raw_meat
  // above already cover Greenhollow/Stonecrag/Emberfall; these fill in the
  // three upper zones, which previously dropped nothing food-related at
  // all) and two Seasoning tiers, so Cooking draws from combat across the
  // whole level range, not just Fishing. See monsters.ts for which creature
  // drops which.
  scavenger_meat: {
    id: 'scavenger_meat', name: 'Scavenger Meat', type: 'material',
    description: 'Tough meat scavenged by Cinderfall’s ash-scavengers.',
    stackable: true, sellValue: 2,
  },
  hound_meat: {
    id: 'hound_meat', name: 'Magma Hound Meat', type: 'material',
    description: 'Fire-toughened meat from a magma hound.',
    stackable: true, sellValue: 3,
  },
  drake_meat: {
    id: 'drake_meat', name: 'Scaleback Drake Meat', type: 'material',
    description: 'Rich, marbled meat from a scaleback drake.',
    stackable: true, sellValue: 4,
  },
  behemoth_flank: {
    id: 'behemoth_flank', name: 'Charhide Behemoth Flank', type: 'material',
    description: 'A heavy cut of flank from a charhide behemoth — enough to feed a crowd.',
    stackable: true, sellValue: 6,
  },
  pyraxis_flank: {
    id: 'pyraxis_flank', name: 'Pyraxis Flank', type: 'material',
    description: 'A rare cut of drake meat, still warm with Pyraxis’s inner fire.',
    stackable: true, sellValue: 15,
  },
  common_seasoning: {
    id: 'common_seasoning', name: 'Common Seasoning', type: 'material',
    description: 'A basic blend of salt and dried herbs, carried by Emberfall’s marauders.',
    stackable: true, sellValue: 2,
  },
  rare_seasoning: {
    id: 'rare_seasoning', name: 'Rare Seasoning', type: 'material',
    description: 'A potent blend of exotic spices, found only on Cinderheart’s most dangerous foes.',
    stackable: true, sellValue: 8,
  },

  // ── Enchanting materials — produced by Disenchanting (see
  // gameData/enchanting.ts), consumed by enchant recipes. Three tiers
  // scale with the disenchanted item's own level, same convention as
  // every other material tier in this game.
  arcane_dust: {
    id: 'arcane_dust', name: 'Arcane Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser equipment.',
    stackable: true, sellValue: 3,
  },
  arcane_essence: {
    id: 'arcane_essence', name: 'Arcane Essence', type: 'material',
    description: 'A condensed mote of magical residue, disenchanted from mid-tier equipment.',
    stackable: true, sellValue: 9,
  },
  arcane_crystal: {
    id: 'arcane_crystal', name: 'Arcane Crystal', type: 'material',
    description: 'A hardened crystal of pure enchanting power, disenchanted only from the finest equipment.',
    stackable: true, sellValue: 25,
  },

  // ── Enchanting scrolls — Enchanting's actual crafted output (see
  // gameData/enchanting.ts's module doc comment and recipes.ts's matching
  // section). Craft one through the normal timed/offline recipe pipeline,
  // then use it on an equipped item for a free, instant apply — one per
  // ENCHANTS entry, named to match.
  scroll_weapon_minor_might: {
    id: 'scroll_weapon_minor_might', name: 'Scroll: Minor Might', type: 'enchant_scroll',
    description: 'Use on an equipped weapon to grant +4 Strength.', stackable: true,
    scrollEnchantId: 'enchant_weapon_minor_might', sellValue: 3,
  },
  scroll_weapon_greater_might: {
    id: 'scroll_weapon_greater_might', name: 'Scroll: Greater Might', type: 'enchant_scroll',
    description: 'Use on an equipped weapon to grant +10 Strength.', stackable: true,
    scrollEnchantId: 'enchant_weapon_greater_might', sellValue: 12,
  },
  scroll_weapon_superior_might: {
    id: 'scroll_weapon_superior_might', name: 'Scroll: Superior Might', type: 'enchant_scroll',
    description: 'Use on an equipped weapon to grant +18 Strength.', stackable: true,
    scrollEnchantId: 'enchant_weapon_superior_might', sellValue: 40,
  },
  scroll_chest_minor_stats: {
    id: 'scroll_chest_minor_stats', name: 'Scroll: Minor Vigor', type: 'enchant_scroll',
    description: 'Use on an equipped chest piece to grant +5 Stamina.', stackable: true,
    scrollEnchantId: 'enchant_chest_minor_stats', sellValue: 3,
  },
  scroll_chest_greater_stats: {
    id: 'scroll_chest_greater_stats', name: 'Scroll: Greater Vigor', type: 'enchant_scroll',
    description: 'Use on an equipped chest piece to grant +12 Stamina.', stackable: true,
    scrollEnchantId: 'enchant_chest_greater_stats', sellValue: 12,
  },
  scroll_chest_superior_stats: {
    id: 'scroll_chest_superior_stats', name: 'Scroll: Superior Vigor', type: 'enchant_scroll',
    description: 'Use on an equipped chest piece to grant +20 Stamina.', stackable: true,
    scrollEnchantId: 'enchant_chest_superior_stats', sellValue: 40,
  },
  scroll_gloves_minor_focus: {
    id: 'scroll_gloves_minor_focus', name: 'Scroll: Minor Focus', type: 'enchant_scroll',
    description: 'Use on equipped gloves to grant +4 Intellect.', stackable: true,
    scrollEnchantId: 'enchant_gloves_minor_focus', sellValue: 4,
  },
  scroll_gloves_greater_focus: {
    id: 'scroll_gloves_greater_focus', name: 'Scroll: Greater Focus', type: 'enchant_scroll',
    description: 'Use on equipped gloves to grant +9 Intellect.', stackable: true,
    scrollEnchantId: 'enchant_gloves_greater_focus', sellValue: 13,
  },
  scroll_legs_minor_vitality: {
    id: 'scroll_legs_minor_vitality', name: 'Scroll: Minor Vitality', type: 'enchant_scroll',
    description: 'Use on equipped legs to grant +6 Stamina.', stackable: true,
    scrollEnchantId: 'enchant_legs_minor_vitality', sellValue: 4,
  },
  scroll_legs_greater_vitality: {
    id: 'scroll_legs_greater_vitality', name: 'Scroll: Greater Vitality', type: 'enchant_scroll',
    description: 'Use on equipped legs to grant +14 Stamina.', stackable: true,
    scrollEnchantId: 'enchant_legs_greater_vitality', sellValue: 15,
  },
  scroll_boots_minor_spirit: {
    id: 'scroll_boots_minor_spirit', name: 'Scroll: Minor Spirit', type: 'enchant_scroll',
    description: 'Use on equipped boots to grant +4 Spirit.', stackable: true,
    scrollEnchantId: 'enchant_boots_minor_spirit', sellValue: 2,
  },
  scroll_boots_greater_spirit: {
    id: 'scroll_boots_greater_spirit', name: 'Scroll: Greater Spirit', type: 'enchant_scroll',
    description: 'Use on equipped boots to grant +9 Spirit.', stackable: true,
    scrollEnchantId: 'enchant_boots_greater_spirit', sellValue: 11,
  },
  scroll_ring_minor_power: {
    id: 'scroll_ring_minor_power', name: 'Scroll: Minor Power', type: 'enchant_scroll',
    description: 'Use on an equipped ring to grant +3 Strength, +3 Intellect.', stackable: true,
    scrollEnchantId: 'enchant_ring_minor_power', sellValue: 8,
  },
  scroll_ring_greater_power: {
    id: 'scroll_ring_greater_power', name: 'Scroll: Greater Power', type: 'enchant_scroll',
    description: 'Use on an equipped ring to grant +7 Strength, +7 Intellect.', stackable: true,
    scrollEnchantId: 'enchant_ring_greater_power', sellValue: 30,
  },

  // ── Alchemy potions — healAmount/manaAmount potions stay simple instant
  // active-use items (health_potion/emberpetal_tonic/etc. above); these are
  // the buff-category potions the profession overhaul adds. Only one buff
  // per category can be active at a time (see gameData/buffs.ts).
  mana_potion: {
    id: 'mana_potion', name: 'Mana Potion', type: 'consumable',
    description: 'Restores 25 mana. Usable anywhere, once every 30 seconds.',
    stackable: true, sellValue: 4,
    consumableEffect: { manaAmount: 25, cooldownSeconds: 30 },
  },
  minor_battle_draught: {
    id: 'minor_battle_draught', name: 'Minor Battle Draught', type: 'consumable',
    description: 'An offensive draught: +10% damage dealt for 20 offensive actions.',
    stackable: true, sellValue: 8,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'offensive_potion', damageMultiplierPct: 10, charges: 20 } },
  },
  minor_stoneskin_draught: {
    id: 'minor_stoneskin_draught', name: 'Minor Stoneskin Draught', type: 'consumable',
    description: 'A defensive draught: -10% damage taken for 20 hits.',
    stackable: true, sellValue: 8,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'defensive_potion', mitigationMultiplierPct: 10, charges: 20 } },
  },
  tonic_of_might: {
    id: 'tonic_of_might', name: 'Tonic of Might', type: 'consumable',
    description: 'Grants +8 Strength for 5 minutes.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'stat_potion', statBonuses: { STR: 8 }, durationSeconds: 300 } },
  },
  elixir_of_the_mind: {
    id: 'elixir_of_the_mind', name: 'Elixir of the Mind', type: 'consumable',
    description: 'Grants +8 Intellect for 5 minutes.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'stat_potion', statBonuses: { INT: 8 }, durationSeconds: 300 } },
  },
  draught_of_resistance: {
    id: 'draught_of_resistance', name: 'Draught of Resistance', type: 'consumable',
    description: 'Hardens the skin against harm: -15% damage taken for 5 minutes.',
    stackable: true, sellValue: 18,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'resistance_potion', mitigationMultiplierPct: 15, durationSeconds: 300 } },
  },
  potion_of_precision: {
    id: 'potion_of_precision', name: 'Potion of Precision', type: 'consumable',
    description: 'Sharpens the senses: +8% chance to hit for 5 minutes.',
    stackable: true, sellValue: 18,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'precision_potion', hitChanceBonusPct: 8, durationSeconds: 300 } },
  },
  potion_of_evasion: {
    id: 'potion_of_evasion', name: 'Potion of Evasion', type: 'consumable',
    description: 'Lightens the step: +8% chance to dodge for 5 minutes.',
    stackable: true, sellValue: 18,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'evasion_potion', dodgeBonusPct: 8, durationSeconds: 300 } },
  },
  greater_battle_draught: {
    id: 'greater_battle_draught', name: 'Greater Battle Draught', type: 'consumable',
    description: 'An offensive draught: +18% damage dealt for 25 offensive actions.',
    stackable: true, sellValue: 30,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'offensive_potion', damageMultiplierPct: 18, charges: 25 } },
  },
  greater_stoneskin_draught: {
    id: 'greater_stoneskin_draught', name: 'Greater Stoneskin Draught', type: 'consumable',
    description: 'A defensive draught: -18% damage taken for 25 hits.',
    stackable: true, sellValue: 30,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'defensive_potion', mitigationMultiplierPct: 18, charges: 25 } },
  },

  // ── Cooking food — one "Well Fed" style dish per zone, scaling in both
  // heal amount and stat bonus. Only one Well Fed buff active at a time
  // (same exclusivity rule as potions), and food is a separate buff
  // category entirely so eating doesn't compete with potions for a slot.
  farmhouse_stew: {
    id: 'farmhouse_stew', name: 'Farmhouse Stew', type: 'consumable',
    description: 'A hearty stew. Restores 30 health and grants +3 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 6,
    consumableEffect: { healAmount: 30, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 3 }, durationSeconds: 600 } },
  },
  highland_roast: {
    id: 'highland_roast', name: 'Highland Roast', type: 'consumable',
    description: 'Roasted mountain game. Restores 50 health and grants +5 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 10,
    consumableEffect: { healAmount: 50, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 5 }, durationSeconds: 600 } },
  },
  embercured_fillet: {
    id: 'embercured_fillet', name: 'Embercured Fillet', type: 'consumable',
    description: 'Fire-cured eel. Restores 75 health and grants +4 Strength and +4 Intellect (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 16,
    consumableEffect: {
      healAmount: 75, cooldownSeconds: 30,
      buff: { category: 'well_fed', statBonuses: { STR: 4, INT: 4 }, durationSeconds: 600 },
    },
  },
  ashfin_chowder: {
    id: 'ashfin_chowder', name: 'Ashfin Chowder', type: 'consumable',
    description: 'A thick carp chowder. Restores 100 health and grants +7 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 22,
    consumableEffect: { healAmount: 100, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 7 }, durationSeconds: 600 } },
  },
  magma_darter_skewers: {
    id: 'magma_darter_skewers', name: 'Magma Darter Skewers', type: 'consumable',
    description: 'Skewered and seared. Restores 130 health and grants +6 Strength and +6 Intellect (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 30,
    consumableEffect: {
      healAmount: 130, cooldownSeconds: 30,
      buff: { category: 'well_fed', statBonuses: { STR: 6, INT: 6 }, durationSeconds: 600 },
    },
  },
  emberheart_feast: {
    id: 'emberheart_feast', name: 'Emberheart Feast', type: 'consumable',
    description: 'A banquet fit for the world’s molten heart. Restores 180 health and grants +10 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 40,
    consumableEffect: { healAmount: 180, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 10 }, durationSeconds: 600 } },
  },

  // ── More Cooking food — fills in Basic Food (cheap, pure heal, no buff —
  // an alternative to the single-fish Stat Food dishes above for players
  // who'd rather hunt than fish), Combination Meals (fish + monster drops +
  // herbs/seasoning together, per the design brief's explicit "Wolf & Trout
  // Stew"/"Hunter's Seafood Feast" examples — stronger buffs than any
  // single-source dish at the same level), and Feasts (high-level,
  // high-quantity, multi-source material sinks). Each recipe exists for a
  // distinct reason rather than being a near-duplicate of its neighbors.
  roasted_boar_meat: {
    id: 'roasted_boar_meat', name: 'Roasted Boar Meat', type: 'consumable',
    description: 'Simple roasted meat. Restores 20 health. No frills, no buff — just food.',
    stackable: true, sellValue: 2,
    consumableEffect: { healAmount: 20, cooldownSeconds: 30 },
  },
  hunters_jerky: {
    id: 'hunters_jerky', name: 'Hunter’s Jerky', type: 'consumable',
    description: 'Dried trail rations. Restores 35 health. No frills, no buff — just food.',
    stackable: true, sellValue: 4,
    consumableEffect: { healAmount: 35, cooldownSeconds: 30 },
  },
  wolf_trout_stew: {
    id: 'wolf_trout_stew', name: 'Wolf & Trout Stew', type: 'consumable',
    description: 'Trout, wolf meat, and wild herbs simmered together. Restores 40 health and grants +3 Strength and +3 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 9,
    consumableEffect: { healAmount: 40, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 3, STA: 3 }, durationSeconds: 600 } },
  },
  spiced_trail_soup: {
    id: 'spiced_trail_soup', name: 'Spiced Trail Soup', type: 'consumable',
    description: 'Mountain char and trail meat in a seasoned broth. Restores 65 health and grants +5 Intellect and +3 Spirit (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 14,
    consumableEffect: { healAmount: 65, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { INT: 5, SPI: 3 }, durationSeconds: 600 } },
  },
  scavengers_broth: {
    id: 'scavengers_broth', name: 'Scavenger’s Broth', type: 'consumable',
    description: 'Ember eel and scavenged meat in a hearty broth. Restores 85 health and grants +6 Strength and +4 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 19,
    consumableEffect: { healAmount: 85, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 6, STA: 4 }, durationSeconds: 600 } },
  },
  charred_skewer: {
    id: 'charred_skewer', name: 'Charred Skewer', type: 'consumable',
    description: 'Skewered ashfin carp and charred meat. Restores 95 health and grants +6 Intellect and +5 Spirit (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 23,
    consumableEffect: { healAmount: 95, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { INT: 6, SPI: 5 }, durationSeconds: 600 } },
  },
  hunters_seafood_feast: {
    id: 'hunters_seafood_feast', name: 'Hunter’s Seafood Feast', type: 'consumable',
    description: 'Magma darter and magma hound meat with rare seasoning. A true combination dish: restores 115 health and grants +7 Strength and +7 Intellect (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 28,
    consumableEffect: { healAmount: 115, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 7, INT: 7 }, durationSeconds: 600 } },
  },
  drake_meat_platter: {
    id: 'drake_meat_platter', name: 'Drake Meat Platter', type: 'consumable',
    description: 'Scaleback drake meat seared with magma darter. Restores 125 health and grants +8 Strength and +8 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 32,
    consumableEffect: { healAmount: 125, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 8, STA: 8 }, durationSeconds: 600 } },
  },
  behemoth_feast: {
    id: 'behemoth_feast', name: 'Behemoth Feast', type: 'consumable',
    description: 'A feast of charhide behemoth flank, magma darter, and rare seasoning — enough for a whole party. Restores 160 health and grants +6 Strength and +14 Stamina (Well Fed) for 15 minutes.',
    stackable: true, sellValue: 55,
    consumableEffect: { healAmount: 160, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 6, STA: 14 }, durationSeconds: 900 } },
  },
  // Deliberately requires old low-level fish alongside high-level ones —
  // per the design brief's "Master Fisherman's Feast" example, keeping
  // demand for beginner materials alive even at the endgame.
  master_fishermans_feast: {
    id: 'master_fishermans_feast', name: 'Master Fisherman’s Feast', type: 'consumable',
    description: 'A grand feast of emberheart koi, brook trout, and drake meat — a whole party could eat from this. Restores 170 health and grants +12 Stamina, +8 Intellect, and +8 Spirit (Well Fed) for 15 minutes.',
    stackable: true, sellValue: 70,
    consumableEffect: { healAmount: 170, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 12, INT: 8, SPI: 8 }, durationSeconds: 900 } },
  },
  pyraxis_flame_seared_flank: {
    id: 'pyraxis_flame_seared_flank', name: 'Pyraxis Flame-Seared Flank', type: 'consumable',
    description: 'Pyraxis’s own flank, seared over its still-smoldering embers with emberheart koi and rare seasoning. The finest meal in Cinderheart Crater: restores 200 health and grants +15 Strength, +15 Intellect, and +10 Stamina (Well Fed) for 15 minutes.',
    stackable: true, sellValue: 120,
    consumableEffect: {
      healAmount: 200, cooldownSeconds: 30,
      buff: { category: 'well_fed', statBonuses: { STR: 15, INT: 15, STA: 10 }, durationSeconds: 900 },
    },
  },
  // The recipe itself is a rare boss drop, not trainer-taught — see
  // recipes.ts's pyraxis_flame_seared_flank entry (learnedAutomatically:
  // false) and monsters.ts's pyraxis lootTable, matching the design brief's
  // "obtaining the recipe is only one part of the process" example.
  recipe_pyraxis_flame_seared_flank: {
    id: 'recipe_pyraxis_flame_seared_flank', name: 'Recipe: Pyraxis Flame-Seared Flank', type: 'recipe',
    description: 'A scorched recipe card, pried from Pyraxis’s hoard. Use to learn the recipe.',
    stackable: true, teachesRecipeId: 'pyraxis_flame_seared_flank', sellValue: 0,
  },

  // ── Tailoring bags — permanent inventory capacity, consumed on use (see
  // firebase/consumables.ts's bagCapacityBonus handling). Each is strictly
  // additive, so order of purchase/use never matters.
  small_pack: {
    id: 'small_pack', name: 'Small Pack', type: 'consumable',
    description: 'A simple cloth pack. Permanently increases inventory capacity by 8.',
    stackable: true, sellValue: 5,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 8 },
  },
  travelers_pack: {
    id: 'travelers_pack', name: "Traveler's Pack", type: 'consumable',
    description: 'A reinforced traveling pack. Permanently increases inventory capacity by 12.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 12 },
  },
  explorers_pack: {
    id: 'explorers_pack', name: "Explorer's Pack", type: 'consumable',
    description: 'A rugged multi-pocket pack. Permanently increases inventory capacity by 16.',
    stackable: true, sellValue: 25,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 16 },
  },
  dwarven_rucksack: {
    id: 'dwarven_rucksack', name: 'Dwarven Rucksack', type: 'consumable',
    description: 'A dwarven-made rucksack recovered from Cinderfall. Permanently increases inventory capacity by 20.',
    stackable: true, sellValue: 45,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 20 },
  },

  // ── Blacksmithing profession quest chain reward (see quests.ts's
  // "The Lost Forge" chain) — a recipe that must be taught by this item
  // rather than just hitting a skill threshold (Recipe.learnedAutomatically
  // === false), per the design brief's "profession quest chains can teach
  // unique recipes" requirement.
  formula_emberforged_gauntlets: {
    id: 'formula_emberforged_gauntlets', name: 'Formula: Emberforged Gauntlets', type: 'recipe',
    description: 'A scorched forge-formula recovered from the Molten Scar. Use to learn the recipe.',
    stackable: true, teachesRecipeId: 'emberforged_gauntlets_recipe', sellValue: 0,
  },
  emberforged_gauntlets: {
    id: 'emberforged_gauntlets', name: 'Emberforged Gauntlets', type: 'equipment',
    description: 'Gauntlets forged from a formula passed down since Cinderfall’s dwarves — among the finest a Blacksmith can make.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STR: 14, STA: 8 }, sellValue: 90,
  },

  // ── Voidforged gear — the endgame capstone set, bought from the Void
  // Vendor (Cinderheart Crater) for Void Shards rather than gold. A
  // deliberate step above the best craftable/dungeon-drop gear in each
  // slot, since it's gated behind farming the same endgame zone rather
  // than being a shortcut around it.
  voidforged_warblade: {
    id: 'voidforged_warblade', name: 'Voidforged Warblade', type: 'equipment',
    description: 'A blade quenched in the crater’s waking power. It hums faintly, even at rest.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 22, STA: 8 }, sellValue: 160,
  },
  voidforged_scepter: {
    id: 'voidforged_scepter', name: 'Voidforged Scepter', type: 'equipment',
    description: 'A scepter that channels the crater’s stirring power into focused will.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 14, SPI: 6 }, sellValue: 160,
  },
  voidforged_chestguard: {
    id: 'voidforged_chestguard', name: 'Voidforged Chestguard', type: 'equipment',
    description: 'Plate forged at the world’s molten heart, tempered in something older than fire.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 18, STR: 4 }, sellValue: 120,
  },
  voidforged_vestments: {
    id: 'voidforged_vestments', name: 'Voidforged Vestments', type: 'equipment',
    description: 'Robes woven through with threads of the crater’s own stirring power.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 15, SPI: 9 }, sellValue: 120,
  },
  voidforged_signet: {
    id: 'voidforged_signet', name: 'Voidforged Signet', type: 'equipment',
    description: 'A ring cut from crystallized Void Shard — equally at home on any hand.',
    stackable: true, equipSlot: 'ring', statBonuses: { STR: 5, STA: 8, INT: 5, SPI: 5 }, sellValue: 110,
  },

  // ── Second gather-node materials — a 2nd Mining/Herbalism/Skinning node
  // per zone (see zones.ts's GATHER_NODES) so each gathering profession has
  // more than one thing to gather per zone. Same requiredLevel/sellValue
  // tier as that zone's original node; a few are also woven into existing
  // recipes as an added ingredient for more varied material lists (see
  // recipes.ts).
  // Mining/Smithing's Mastery-pilot rareBonus stones (see zones.ts's
  // GATHER_NODES) — ids predate the overhaul (each was its own standalone
  // node once) but now drop as a 10% bonus alongside that zone's primary
  // ore, renamed to match the new design's naming.
  granite_chunk: {
    id: 'granite_chunk', name: 'Rough Stone', type: 'material',
    description: 'A rough, unworked stone found alongside copper ore.', stackable: true, sellValue: 1,
  },
  wildroot: {
    id: 'wildroot', name: 'Wildroot', type: 'material',
    description: 'A gnarled root with a sharp, earthy smell.', stackable: true, sellValue: 1,
  },
  rabbit_pelt: {
    id: 'rabbit_pelt', name: 'Rabbit Pelt', type: 'material',
    description: 'A small, soft pelt from the warrens.', stackable: true, sellValue: 1,
  },
  flint: {
    id: 'flint', name: 'Coarse Stone', type: 'material',
    description: 'A hard, flaking stone found alongside tin ore.', stackable: true, sellValue: 2,
  },
  frostcap: {
    id: 'frostcap', name: 'Frostcap', type: 'material',
    description: 'A pale mushroom that stays cold to the touch.', stackable: true, sellValue: 2,
  },
  jackal_fur: {
    id: 'jackal_fur', name: 'Jackal Fur', type: 'material',
    description: 'Coarse fur, still carrying the jackal’s musk.', stackable: true, sellValue: 2,
  },
  sulfur_chunk: {
    id: 'sulfur_chunk', name: 'Heavy Stone', type: 'material',
    description: 'A dense, unusually heavy stone found alongside iron ore.', stackable: true, sellValue: 3,
  },
  emberleaf: {
    id: 'emberleaf', name: 'Emberleaf', type: 'material',
    description: 'A leaf that stays warm long after picking.', stackable: true, sellValue: 3,
  },
  cinderwolf_pelt: {
    id: 'cinderwolf_pelt', name: 'Cinderwolf Pelt', type: 'material',
    description: 'A singed pelt, still faintly warm.', stackable: true, sellValue: 3,
  },
  shadowore: {
    id: 'shadowore', name: 'Solid Stone', type: 'material',
    description: 'An unusually solid, dense stone found alongside mithril ore.', stackable: true, sellValue: 4,
  },
  ashroot: {
    id: 'ashroot', name: 'Ashroot', type: 'material',
    description: 'A root grown entirely through packed ash.', stackable: true, sellValue: 4,
  },
  scavenger_hide: {
    id: 'scavenger_hide', name: 'Scavenger Hide', type: 'material',
    description: 'Mangy hide from a ruin-dwelling scavenger.', stackable: true, sellValue: 4,
  },
  scorchweed: {
    id: 'scorchweed', name: 'Scorchweed', type: 'material',
    description: 'A wiry weed that thrives in scorched ground.', stackable: true, sellValue: 5,
  },
  scaleback_scale: {
    id: 'scaleback_scale', name: 'Scaleback Scale', type: 'material',
    description: 'A single overlapping scale, still warm.', stackable: true, sellValue: 5,
  },
  starforge_ore: {
    id: 'starforge_ore', name: 'Fire Stone', type: 'material',
    description: 'A stone that stays warm to the touch, found alongside obsidian ore.', stackable: true, sellValue: 6,
  },
  heartbloom: {
    id: 'heartbloom', name: 'Heartbloom', type: 'material',
    description: 'A flower that pulses faintly, warm as a heartbeat.', stackable: true, sellValue: 6,
  },
  emberscale_claw: {
    id: 'emberscale_claw', name: 'Emberscale Claw', type: 'material',
    description: 'A curved claw, still sharp enough to work.', stackable: true, sellValue: 6,
  },

  // ── Blacksmithing full armor sets (Mining/Smithing Mastery-pilot overhaul) ──
  // Plate (STR+STA) and Sacred-prefixed cloth (INT+SPI) variants per tier —
  // see masteryEngine.ts's module doc comment and gameData/recipes.ts's
  // matching section for the design. Generated programmatically given the
  // volume (7 tiers x 8 slots x 2 variants + 3 jewelry tiers x 2 slots x 2
  // variants = 124 items); each entry is still plain static data like every
  // other item here, not computed at runtime.
  copper_helm: {
    id: 'copper_helm', name: 'Copper Helm', type: 'equipment',
    description: 'An orange helm forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 3, STR: 3 }, sellValue: 18,
  },
  sacred_copper_helm: {
    id: 'sacred_copper_helm', name: 'Sacred Copper Helm', type: 'equipment',
    description: 'An orange, light-touched helm forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 3, SPI: 3 }, sellValue: 18,
  },
  copper_chestplate: {
    id: 'copper_chestplate', name: 'Copper Chestplate', type: 'equipment',
    description: 'An orange chestplate forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 4, STR: 4 }, sellValue: 24,
  },
  sacred_copper_chestplate: {
    id: 'sacred_copper_chestplate', name: 'Sacred Copper Chestplate', type: 'equipment',
    description: 'An orange, light-touched chestplate forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 4, SPI: 4 }, sellValue: 24,
  },
  copper_gauntlets: {
    id: 'copper_gauntlets', name: 'Copper Gauntlets', type: 'equipment',
    description: 'An orange gauntlets forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 2, STR: 2 }, sellValue: 12,
  },
  sacred_copper_gauntlets: {
    id: 'sacred_copper_gauntlets', name: 'Sacred Copper Gauntlets', type: 'equipment',
    description: 'An orange, light-touched gauntlets forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 2, SPI: 2 }, sellValue: 12,
  },
  copper_legplates: {
    id: 'copper_legplates', name: 'Copper Legplates', type: 'equipment',
    description: 'An orange legplates forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 4, STR: 3 }, sellValue: 21,
  },
  sacred_copper_legplates: {
    id: 'sacred_copper_legplates', name: 'Sacred Copper Legplates', type: 'equipment',
    description: 'An orange, light-touched legplates forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 4, SPI: 3 }, sellValue: 21,
  },
  copper_greaves: {
    id: 'copper_greaves', name: 'Copper Greaves', type: 'equipment',
    description: 'An orange greaves forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 3, STR: 2 }, sellValue: 15,
  },
  sacred_copper_greaves: {
    id: 'sacred_copper_greaves', name: 'Sacred Copper Greaves', type: 'equipment',
    description: 'An orange, light-touched greaves forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 3, SPI: 2 }, sellValue: 15,
  },
  copper_shield: {
    id: 'copper_shield', name: 'Copper Shield', type: 'equipment',
    description: 'An orange shield forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 3, STR: 3 }, sellValue: 18,
  },
  sacred_copper_shield: {
    id: 'sacred_copper_shield', name: 'Copper-Bound Tome', type: 'equipment',
    description: 'A spellbook bound in orange Copper plating by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 3, SPI: 3 }, sellValue: 18,
  },
  copper_sword: {
    id: 'copper_sword', name: 'Copper Sword', type: 'equipment',
    description: 'An orange sword forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 6, STA: 3 }, sellValue: 27,
  },
  sacred_copper_sword: {
    id: 'sacred_copper_sword', name: 'Sacred Copper Sword', type: 'equipment',
    description: 'An orange, light-touched sword forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 6, SPI: 3 }, sellValue: 27,
  },
  copper_battleaxe: {
    id: 'copper_battleaxe', name: 'Copper Battleaxe', type: 'equipment',
    description: 'An orange battleaxe forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8, STA: 5 }, sellValue: 39,
  },
  sacred_copper_battleaxe: {
    id: 'sacred_copper_battleaxe', name: 'Sacred Copper Battleaxe', type: 'equipment',
    description: 'An orange, light-touched battleaxe forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 8, SPI: 5 }, sellValue: 39,
  },
  bronze_helm: {
    id: 'bronze_helm', name: 'Bronze Helm', type: 'equipment',
    description: 'A brown helm forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 4, STR: 4 }, sellValue: 26,
  },
  sacred_bronze_helm: {
    id: 'sacred_bronze_helm', name: 'Sacred Bronze Helm', type: 'equipment',
    description: 'A brown, light-touched helm forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 4, SPI: 4 }, sellValue: 26,
  },
  bronze_chestplate: {
    id: 'bronze_chestplate', name: 'Bronze Chestplate', type: 'equipment',
    description: 'A brown chestplate forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 7, STR: 5 }, sellValue: 38,
  },
  sacred_bronze_chestplate: {
    id: 'sacred_bronze_chestplate', name: 'Sacred Bronze Chestplate', type: 'equipment',
    description: 'A brown, light-touched chestplate forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 38,
  },
  bronze_gauntlets: {
    id: 'bronze_gauntlets', name: 'Bronze Gauntlets', type: 'equipment',
    description: 'A brown gauntlets forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  sacred_bronze_gauntlets: {
    id: 'sacred_bronze_gauntlets', name: 'Sacred Bronze Gauntlets', type: 'equipment',
    description: 'A brown, light-touched gauntlets forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 4, SPI: 3 }, sellValue: 22,
  },
  bronze_legplates: {
    id: 'bronze_legplates', name: 'Bronze Legplates', type: 'equipment',
    description: 'A brown legplates forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 6, STR: 5 }, sellValue: 35,
  },
  sacred_bronze_legplates: {
    id: 'sacred_bronze_legplates', name: 'Sacred Bronze Legplates', type: 'equipment',
    description: 'A brown, light-touched legplates forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 35,
  },
  bronze_greaves: {
    id: 'bronze_greaves', name: 'Bronze Greaves', type: 'equipment',
    description: 'A brown greaves forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  sacred_bronze_greaves: {
    id: 'sacred_bronze_greaves', name: 'Sacred Bronze Greaves', type: 'equipment',
    description: 'A brown, light-touched greaves forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 4, SPI: 3 }, sellValue: 22,
  },
  bronze_shield: {
    id: 'bronze_shield', name: 'Bronze Shield', type: 'equipment',
    description: 'A brown shield forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 6, STR: 5 }, sellValue: 32,
  },
  sacred_bronze_shield: {
    id: 'sacred_bronze_shield', name: 'Bronze-Rimmed Orb', type: 'equipment',
    description: 'A focusing orb banded in brown Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 32,
  },
  bronze_sword: {
    id: 'bronze_sword', name: 'Bronze Sword', type: 'equipment',
    description: 'A brown sword forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8, STA: 5 }, sellValue: 42,
  },
  sacred_bronze_sword: {
    id: 'sacred_bronze_sword', name: 'Sacred Bronze Sword', type: 'equipment',
    description: 'A brown, light-touched sword forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 8, SPI: 5 }, sellValue: 42,
  },
  bronze_battleaxe: {
    id: 'bronze_battleaxe', name: 'Bronze Battleaxe', type: 'equipment',
    description: 'A brown battleaxe forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12, STA: 7 }, sellValue: 61,
  },
  sacred_bronze_battleaxe: {
    id: 'sacred_bronze_battleaxe', name: 'Sacred Bronze Battleaxe', type: 'equipment',
    description: 'A brown, light-touched battleaxe forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 12, SPI: 7 }, sellValue: 61,
  },
  iron_helm: {
    id: 'iron_helm', name: 'Iron Helm', type: 'equipment',
    description: 'A dark gray helm forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 6, STR: 5 }, sellValue: 37,
  },
  sacred_iron_helm: {
    id: 'sacred_iron_helm', name: 'Sacred Iron Helm', type: 'equipment',
    description: 'A dark gray, light-touched helm forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 37,
  },
  iron_chestplate: {
    id: 'iron_chestplate', name: 'Iron Chestplate', type: 'equipment',
    description: 'A dark gray chestplate forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 9, STR: 7 }, sellValue: 54,
  },
  sacred_iron_chestplate: {
    id: 'sacred_iron_chestplate', name: 'Sacred Iron Chestplate', type: 'equipment',
    description: 'A dark gray, light-touched chestplate forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 9, SPI: 7 }, sellValue: 54,
  },
  iron_gauntlets: {
    id: 'iron_gauntlets', name: 'Iron Gauntlets', type: 'equipment',
    description: 'A dark gray gauntlets forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 5, STR: 4 }, sellValue: 31,
  },
  sacred_iron_gauntlets: {
    id: 'sacred_iron_gauntlets', name: 'Sacred Iron Gauntlets', type: 'equipment',
    description: 'A dark gray, light-touched gauntlets forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 5, SPI: 4 }, sellValue: 31,
  },
  iron_legplates: {
    id: 'iron_legplates', name: 'Iron Legplates', type: 'equipment',
    description: 'A dark gray legplates forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 8, STR: 6 }, sellValue: 48,
  },
  sacred_iron_legplates: {
    id: 'sacred_iron_legplates', name: 'Sacred Iron Legplates', type: 'equipment',
    description: 'A dark gray, light-touched legplates forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 48,
  },
  iron_greaves: {
    id: 'iron_greaves', name: 'Iron Greaves', type: 'equipment',
    description: 'A dark gray greaves forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 6, STR: 5 }, sellValue: 34,
  },
  sacred_iron_greaves: {
    id: 'sacred_iron_greaves', name: 'Sacred Iron Greaves', type: 'equipment',
    description: 'A dark gray, light-touched greaves forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 34,
  },
  iron_shield: {
    id: 'iron_shield', name: 'Iron Shield', type: 'equipment',
    description: 'A dark gray shield forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 7, STR: 6 }, sellValue: 44,
  },
  sacred_iron_shield: {
    id: 'sacred_iron_shield', name: 'Iron-Clasped Tome', type: 'equipment',
    description: 'A spellbook clasped in dark gray Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 7, SPI: 6 }, sellValue: 44,
  },
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', type: 'equipment',
    description: 'A dark gray sword forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12, STA: 6 }, sellValue: 61,
  },
  sacred_iron_sword: {
    id: 'sacred_iron_sword', name: 'Sacred Iron Sword', type: 'equipment',
    description: 'A dark gray, light-touched sword forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 12, SPI: 6 }, sellValue: 61,
  },
  iron_battleaxe: {
    id: 'iron_battleaxe', name: 'Iron Battleaxe', type: 'equipment',
    description: 'A dark gray battleaxe forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 17, STA: 9 }, sellValue: 88,
  },
  sacred_iron_battleaxe: {
    id: 'sacred_iron_battleaxe', name: 'Sacred Iron Battleaxe', type: 'equipment',
    description: 'A dark gray, light-touched battleaxe forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 17, SPI: 9 }, sellValue: 88,
  },
  steel_helm: {
    id: 'steel_helm', name: 'Steel Helm', type: 'equipment',
    description: 'A light gray helm forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 8, STR: 6 }, sellValue: 49,
  },
  sacred_steel_helm: {
    id: 'sacred_steel_helm', name: 'Sacred Steel Helm', type: 'equipment',
    description: 'A light gray, light-touched helm forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 49,
  },
  steel_chestplate: {
    id: 'steel_chestplate', name: 'Steel Chestplate', type: 'equipment',
    description: 'A light gray chestplate forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 11, STR: 9 }, sellValue: 70,
  },
  sacred_steel_chestplate: {
    id: 'sacred_steel_chestplate', name: 'Sacred Steel Chestplate', type: 'equipment',
    description: 'A light gray, light-touched chestplate forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 11, SPI: 9 }, sellValue: 70,
  },
  steel_gauntlets: {
    id: 'steel_gauntlets', name: 'Steel Gauntlets', type: 'equipment',
    description: 'A light gray gauntlets forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 6, STR: 5 }, sellValue: 39,
  },
  sacred_steel_gauntlets: {
    id: 'sacred_steel_gauntlets', name: 'Sacred Steel Gauntlets', type: 'equipment',
    description: 'A light gray, light-touched gauntlets forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 39,
  },
  steel_legplates: {
    id: 'steel_legplates', name: 'Steel Legplates', type: 'equipment',
    description: 'A light gray legplates forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 10, STR: 8 }, sellValue: 63,
  },
  sacred_steel_legplates: {
    id: 'sacred_steel_legplates', name: 'Sacred Steel Legplates', type: 'equipment',
    description: 'A light gray, light-touched legplates forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 10, SPI: 8 }, sellValue: 63,
  },
  steel_greaves: {
    id: 'steel_greaves', name: 'Steel Greaves', type: 'equipment',
    description: 'A light gray greaves forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 7, STR: 5 }, sellValue: 42,
  },
  sacred_steel_greaves: {
    id: 'sacred_steel_greaves', name: 'Sacred Steel Greaves', type: 'equipment',
    description: 'A light gray, light-touched greaves forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 42,
  },
  steel_shield: {
    id: 'steel_shield', name: 'Steel Shield', type: 'equipment',
    description: 'A light gray shield forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 9, STR: 7 }, sellValue: 56,
  },
  sacred_steel_shield: {
    id: 'sacred_steel_shield', name: 'Steel-Banded Orb', type: 'equipment',
    description: 'A focusing orb caged in light gray Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 9, SPI: 7 }, sellValue: 56,
  },
  steel_sword: {
    id: 'steel_sword', name: 'Steel Sword', type: 'equipment',
    description: 'A light gray sword forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 14, STA: 8 }, sellValue: 77,
  },
  sacred_steel_sword: {
    id: 'sacred_steel_sword', name: 'Sacred Steel Sword', type: 'equipment',
    description: 'A light gray, light-touched sword forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 14, SPI: 8 }, sellValue: 77,
  },
  steel_battleaxe: {
    id: 'steel_battleaxe', name: 'Steel Battleaxe', type: 'equipment',
    description: 'A light gray battleaxe forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 21, STA: 11 }, sellValue: 112,
  },
  sacred_steel_battleaxe: {
    id: 'sacred_steel_battleaxe', name: 'Sacred Steel Battleaxe', type: 'equipment',
    description: 'A light gray, light-touched battleaxe forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 21, SPI: 11 }, sellValue: 112,
  },
  mithril_helm: {
    id: 'mithril_helm', name: 'Mithril Helm', type: 'equipment',
    description: 'A dark blue helm forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 9, STR: 8 }, sellValue: 61,
  },
  sacred_mithril_helm: {
    id: 'sacred_mithril_helm', name: 'Sacred Mithril Helm', type: 'equipment',
    description: 'A dark blue, light-touched helm forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 9, SPI: 8 }, sellValue: 61,
  },
  mithril_chestplate: {
    id: 'mithril_chestplate', name: 'Mithril Chestplate', type: 'equipment',
    description: 'A dark blue chestplate forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 13, STR: 11 }, sellValue: 86,
  },
  sacred_mithril_chestplate: {
    id: 'sacred_mithril_chestplate', name: 'Sacred Mithril Chestplate', type: 'equipment',
    description: 'A dark blue, light-touched chestplate forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 13, SPI: 11 }, sellValue: 86,
  },
  mithril_gauntlets: {
    id: 'mithril_gauntlets', name: 'Mithril Gauntlets', type: 'equipment',
    description: 'A dark blue gauntlets forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 7, STR: 6 }, sellValue: 47,
  },
  sacred_mithril_gauntlets: {
    id: 'sacred_mithril_gauntlets', name: 'Sacred Mithril Gauntlets', type: 'equipment',
    description: 'A dark blue, light-touched gauntlets forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 7, SPI: 6 }, sellValue: 47,
  },
  mithril_legplates: {
    id: 'mithril_legplates', name: 'Mithril Legplates', type: 'equipment',
    description: 'A dark blue legplates forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 12, STR: 10 }, sellValue: 79,
  },
  sacred_mithril_legplates: {
    id: 'sacred_mithril_legplates', name: 'Sacred Mithril Legplates', type: 'equipment',
    description: 'A dark blue, light-touched legplates forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 12, SPI: 10 }, sellValue: 79,
  },
  mithril_greaves: {
    id: 'mithril_greaves', name: 'Mithril Greaves', type: 'equipment',
    description: 'A dark blue greaves forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 8, STR: 6 }, sellValue: 50,
  },
  sacred_mithril_greaves: {
    id: 'sacred_mithril_greaves', name: 'Sacred Mithril Greaves', type: 'equipment',
    description: 'A dark blue, light-touched greaves forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 50,
  },
  mithril_shield: {
    id: 'mithril_shield', name: 'Mithril Shield', type: 'equipment',
    description: 'A dark blue shield forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 10, STR: 9 }, sellValue: 68,
  },
  sacred_mithril_shield: {
    id: 'sacred_mithril_shield', name: 'Mithril-Bound Tome', type: 'equipment',
    description: 'A spellbook bound in dark blue Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 10, SPI: 9 }, sellValue: 68,
  },
  mithril_sword: {
    id: 'mithril_sword', name: 'Mithril Sword', type: 'equipment',
    description: 'A dark blue sword forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 17, STA: 9 }, sellValue: 94,
  },
  sacred_mithril_sword: {
    id: 'sacred_mithril_sword', name: 'Sacred Mithril Sword', type: 'equipment',
    description: 'A dark blue, light-touched sword forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 17, SPI: 9 }, sellValue: 94,
  },
  mithril_battleaxe: {
    id: 'mithril_battleaxe', name: 'Mithril Battleaxe', type: 'equipment',
    description: 'A dark blue battleaxe forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 25, STA: 13 }, sellValue: 137,
  },
  sacred_mithril_battleaxe: {
    id: 'sacred_mithril_battleaxe', name: 'Sacred Mithril Battleaxe', type: 'equipment',
    description: 'A dark blue, light-touched battleaxe forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 25, SPI: 13 }, sellValue: 137,
  },
  thorium_helm: {
    id: 'thorium_helm', name: 'Thorium Helm', type: 'equipment',
    description: 'A light teal helm forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 11, STR: 9 }, sellValue: 76,
  },
  sacred_thorium_helm: {
    id: 'sacred_thorium_helm', name: 'Sacred Thorium Helm', type: 'equipment',
    description: 'A light teal, light-touched helm forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 11, SPI: 9 }, sellValue: 76,
  },
  thorium_chestplate: {
    id: 'thorium_chestplate', name: 'Thorium Chestplate', type: 'equipment',
    description: 'A light teal chestplate forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 15, STR: 13 }, sellValue: 106,
  },
  sacred_thorium_chestplate: {
    id: 'sacred_thorium_chestplate', name: 'Sacred Thorium Chestplate', type: 'equipment',
    description: 'A light teal, light-touched chestplate forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 15, SPI: 13 }, sellValue: 106,
  },
  thorium_gauntlets: {
    id: 'thorium_gauntlets', name: 'Thorium Gauntlets', type: 'equipment',
    description: 'A light teal gauntlets forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 8, STR: 7 }, sellValue: 57,
  },
  sacred_thorium_gauntlets: {
    id: 'sacred_thorium_gauntlets', name: 'Sacred Thorium Gauntlets', type: 'equipment',
    description: 'A light teal, light-touched gauntlets forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 8, SPI: 7 }, sellValue: 57,
  },
  thorium_legplates: {
    id: 'thorium_legplates', name: 'Thorium Legplates', type: 'equipment',
    description: 'A light teal legplates forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 14, STR: 11 }, sellValue: 95,
  },
  sacred_thorium_legplates: {
    id: 'sacred_thorium_legplates', name: 'Sacred Thorium Legplates', type: 'equipment',
    description: 'A light teal, light-touched legplates forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 14, SPI: 11 }, sellValue: 95,
  },
  thorium_greaves: {
    id: 'thorium_greaves', name: 'Thorium Greaves', type: 'equipment',
    description: 'A light teal greaves forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 9, STR: 8 }, sellValue: 65,
  },
  sacred_thorium_greaves: {
    id: 'sacred_thorium_greaves', name: 'Sacred Thorium Greaves', type: 'equipment',
    description: 'A light teal, light-touched greaves forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 9, SPI: 8 }, sellValue: 65,
  },
  thorium_shield: {
    id: 'thorium_shield', name: 'Thorium Shield', type: 'equipment',
    description: 'A light teal shield forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 12, STR: 10 }, sellValue: 84,
  },
  sacred_thorium_shield: {
    id: 'sacred_thorium_shield', name: 'Thorium-Rimmed Orb', type: 'equipment',
    description: 'A focusing orb banded in light teal Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 12, SPI: 10 }, sellValue: 84,
  },
  thorium_sword: {
    id: 'thorium_sword', name: 'Thorium Sword', type: 'equipment',
    description: 'A light teal sword forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 20, STA: 11 }, sellValue: 118,
  },
  sacred_thorium_sword: {
    id: 'sacred_thorium_sword', name: 'Sacred Thorium Sword', type: 'equipment',
    description: 'A light teal, light-touched sword forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 20, SPI: 11 }, sellValue: 118,
  },
  thorium_battleaxe: {
    id: 'thorium_battleaxe', name: 'Thorium Battleaxe', type: 'equipment',
    description: 'A light teal battleaxe forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 29, STA: 16 }, sellValue: 171,
  },
  sacred_thorium_battleaxe: {
    id: 'sacred_thorium_battleaxe', name: 'Sacred Thorium Battleaxe', type: 'equipment',
    description: 'A light teal, light-touched battleaxe forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 29, SPI: 16 }, sellValue: 171,
  },
  obsidian_helm: {
    id: 'obsidian_helm', name: 'Obsidian Helm', type: 'equipment',
    description: 'A black helm forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'plate', statBonuses: { STA: 12, STR: 10 }, sellValue: 88,
  },
  sacred_obsidian_helm: {
    id: 'sacred_obsidian_helm', name: 'Sacred Obsidian Helm', type: 'equipment',
    description: 'A black, light-touched helm forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 12, SPI: 10 }, sellValue: 88,
  },
  obsidian_chestplate: {
    id: 'obsidian_chestplate', name: 'Obsidian Chestplate', type: 'equipment',
    description: 'A black chestplate forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 18, STR: 14 }, sellValue: 128,
  },
  sacred_obsidian_chestplate: {
    id: 'sacred_obsidian_chestplate', name: 'Sacred Obsidian Chestplate', type: 'equipment',
    description: 'A black, light-touched chestplate forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 18, SPI: 14 }, sellValue: 128,
  },
  obsidian_gauntlets: {
    id: 'obsidian_gauntlets', name: 'Obsidian Gauntlets', type: 'equipment',
    description: 'A black gauntlets forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STA: 10, STR: 8 }, sellValue: 72,
  },
  sacred_obsidian_gauntlets: {
    id: 'sacred_obsidian_gauntlets', name: 'Sacred Obsidian Gauntlets', type: 'equipment',
    description: 'A black, light-touched gauntlets forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 10, SPI: 8 }, sellValue: 72,
  },
  obsidian_legplates: {
    id: 'obsidian_legplates', name: 'Obsidian Legplates', type: 'equipment',
    description: 'A black legplates forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'plate', statBonuses: { STA: 16, STR: 13 }, sellValue: 116,
  },
  sacred_obsidian_legplates: {
    id: 'sacred_obsidian_legplates', name: 'Sacred Obsidian Legplates', type: 'equipment',
    description: 'A black, light-touched legplates forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 16, SPI: 13 }, sellValue: 116,
  },
  obsidian_greaves: {
    id: 'obsidian_greaves', name: 'Obsidian Greaves', type: 'equipment',
    description: 'A black greaves forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'plate', statBonuses: { STA: 10, STR: 9 }, sellValue: 76,
  },
  sacred_obsidian_greaves: {
    id: 'sacred_obsidian_greaves', name: 'Sacred Obsidian Greaves', type: 'equipment',
    description: 'A black, light-touched greaves forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 10, SPI: 9 }, sellValue: 76,
  },
  obsidian_shield: {
    id: 'obsidian_shield', name: 'Obsidian Shield', type: 'equipment',
    description: 'A black shield forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'plate', statBonuses: { STA: 14, STR: 12 }, sellValue: 104,
  },
  sacred_obsidian_shield: {
    id: 'sacred_obsidian_shield', name: 'Obsidian-Clasped Tome', type: 'equipment',
    description: 'A spellbook clasped in black Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 14, SPI: 12 }, sellValue: 104,
  },
  obsidian_sword: {
    id: 'obsidian_sword', name: 'Obsidian Sword', type: 'equipment',
    description: 'A black sword forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 23, STA: 12 }, sellValue: 140,
  },
  sacred_obsidian_sword: {
    id: 'sacred_obsidian_sword', name: 'Sacred Obsidian Sword', type: 'equipment',
    description: 'A black, light-touched sword forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 23, SPI: 12 }, sellValue: 140,
  },
  obsidian_battleaxe: {
    id: 'obsidian_battleaxe', name: 'Obsidian Battleaxe', type: 'equipment',
    description: 'A black battleaxe forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 33, STA: 18 }, sellValue: 204,
  },
  sacred_obsidian_battleaxe: {
    id: 'sacred_obsidian_battleaxe', name: 'Sacred Obsidian Battleaxe', type: 'equipment',
    description: 'A black, light-touched battleaxe forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 33, SPI: 18 }, sellValue: 204,
  },
  silver_necklace: {
    id: 'silver_necklace', name: 'Silver Necklace', type: 'equipment',
    description: 'A silver necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { STA: 3, STR: 3 }, sellValue: 25,
  },
  sacred_silver_necklace: {
    id: 'sacred_silver_necklace', name: 'Sacred Silver Necklace', type: 'equipment',
    description: 'A silver necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { INT: 3, SPI: 3 }, sellValue: 25,
  },
  silver_ring: {
    id: 'silver_ring', name: 'Silver Ring', type: 'equipment',
    description: 'A silver ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 3, STR: 2 }, sellValue: 21,
  },
  sacred_silver_ring: {
    id: 'sacred_silver_ring', name: 'Sacred Silver Ring', type: 'equipment',
    description: 'A silver ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 3, SPI: 2 }, sellValue: 21,
  },
  gold_necklace: {
    id: 'gold_necklace', name: 'Gold Necklace', type: 'equipment',
    description: 'A gold necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { STA: 7, STR: 5 }, sellValue: 56,
  },
  sacred_gold_necklace: {
    id: 'sacred_gold_necklace', name: 'Sacred Gold Necklace', type: 'equipment',
    description: 'A gold necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { INT: 7, SPI: 5 }, sellValue: 56,
  },
  gold_ring: {
    id: 'gold_ring', name: 'Gold Ring', type: 'equipment',
    description: 'A gold ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 6, STR: 5 }, sellValue: 47,
  },
  sacred_gold_ring: {
    id: 'sacred_gold_ring', name: 'Sacred Gold Ring', type: 'equipment',
    description: 'A gold ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 6, SPI: 5 }, sellValue: 47,
  },
  platinum_necklace: {
    id: 'platinum_necklace', name: 'Platinum Necklace', type: 'equipment',
    description: 'A platinum necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { STA: 9, STR: 7 }, sellValue: 83,
  },
  sacred_platinum_necklace: {
    id: 'sacred_platinum_necklace', name: 'Sacred Platinum Necklace', type: 'equipment',
    description: 'A platinum necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { INT: 9, SPI: 7 }, sellValue: 83,
  },
  platinum_ring: {
    id: 'platinum_ring', name: 'Platinum Ring', type: 'equipment',
    description: 'A platinum ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 7, STR: 6 }, sellValue: 68,
  },
  sacred_platinum_ring: {
    id: 'sacred_platinum_ring', name: 'Sacred Platinum Ring', type: 'equipment',
    description: 'A platinum ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 7, SPI: 6 }, sellValue: 68,
  },

};

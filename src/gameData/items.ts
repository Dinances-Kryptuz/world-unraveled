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

  // ── Cinderfall Depths materials ───────────────────────────────────────
  cinderore: {
    id: 'cinderore', name: 'Cinderore', type: 'material',
    description: 'A heavy ore veined with cooled ash, found deep in collapsed dwarven tunnels.',
    stackable: true, sellValue: 4,
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
  cinder_steel_bar: {
    id: 'cinder_steel_bar', name: 'Cinder Steel Bar', type: 'material',
    description: 'Cinderore smelted into a dense, ash-tempered bar.',
    stackable: true, sellValue: 9,
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
  cinderplate_chestguard: {
    id: 'cinderplate_chestguard', name: 'Cinderplate Chestguard', type: 'equipment',
    description: 'A heavy plate chestpiece forged from cinder steel.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 10 }, sellValue: 38,
  },
  cinderforged_hammer: {
    id: 'cinderforged_hammer', name: 'Cinderforged Hammer', type: 'equipment',
    description: 'A brutal warhammer, its head still warm from the forge.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12 }, sellValue: 48,
  },
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
  scavenged_hatchet: {
    id: 'scavenged_hatchet', name: 'Scavenged Hatchet', type: 'equipment',
    description: "A cinder scavenger's own hatchet, still sharp despite its owner's fate.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 9 }, sellValue: 40,
  },
  overseers_greatmace: {
    id: 'overseers_greatmace', name: "Overseer's Greatmace", type: 'equipment',
    description: 'The ceremonial mace of the Ashen Overseer — too heavy for most, and twice as deadly.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 14, STA: 4 }, sellValue: 80,
  },
  emberpetal_tonic: {
    id: 'emberpetal_tonic', name: 'Emberpetal Tonic', type: 'consumable',
    description: 'A potent brew of emberpetal. Restores 150 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 8,
    consumableEffect: { healAmount: 150, cooldownSeconds: 25 },
  },

  // ── The Molten Scar materials ─────────────────────────────────────────
  brimstone_ore: {
    id: 'brimstone_ore', name: 'Brimstone Ore', type: 'material',
    description: 'A sulfurous ore that never fully cools, mined from the rift itself.',
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
  brimstone_bar: {
    id: 'brimstone_bar', name: 'Brimstone Bar', type: 'material',
    description: 'Brimstone ore smelted into a bar that radiates heat long after cooling.',
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
  brimstone_plate: {
    id: 'brimstone_plate', name: 'Brimstone Plate', type: 'equipment',
    description: 'A plate chestpiece forged from brimstone — heavy, and always faintly warm.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 12 }, sellValue: 46,
  },
  brimstone_greatsword: {
    id: 'brimstone_greatsword', name: 'Brimstone Greatsword', type: 'equipment',
    description: 'A massive blade forged from brimstone, its edge never quite cool to the touch.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 15 }, sellValue: 58,
  },
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
  zealots_blade: {
    id: 'zealots_blade', name: "Zealot's Blade", type: 'equipment',
    description: 'A ritual blade carried by a cultist zealot, its edge blessed by something best left unnamed.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 11 }, sellValue: 50,
  },
  heralds_ember_band: {
    id: 'heralds_ember_band', name: "Herald's Ember Band", type: 'equipment',
    description: 'A ring taken from the Molten Herald, still warm as a living coal.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 12, STA: 3 }, sellValue: 95,
  },
  cinderbloom_elixir: {
    id: 'cinderbloom_elixir', name: 'Cinderbloom Elixir', type: 'consumable',
    description: 'A powerful brew of cinderbloom. Restores 200 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 10,
    consumableEffect: { healAmount: 200, cooldownSeconds: 25 },
  },

  // ── Cinderheart Crater materials ──────────────────────────────────────
  emberforge_ore: {
    id: 'emberforge_ore', name: 'Emberforge Ore', type: 'material',
    description: 'The finest ore in the known world, mined at the very edge of the crater.',
    stackable: true, sellValue: 6,
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
  emberforged_bar: {
    id: 'emberforged_bar', name: 'Emberforged Bar', type: 'material',
    description: 'Emberforge ore smelted at incredible heat into the strongest bar yet forged.',
    stackable: true, sellValue: 13,
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
  emberforged_chestguard: {
    id: 'emberforged_chestguard', name: 'Emberforged Chestguard', type: 'equipment',
    description: 'The finest plate armor forged in the known world.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 14 }, sellValue: 54,
  },
  emberforged_greatsword: {
    id: 'emberforged_greatsword', name: 'Emberforged Greatsword', type: 'equipment',
    description: 'A greatsword forged at the edge of the crater itself.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 18 }, sellValue: 68,
  },
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
  harbingers_talon: {
    id: 'harbingers_talon', name: "Harbinger's Talon", type: 'equipment',
    description: "A curved blade shaped like the claw of the Ashfall Harbinger it was taken from.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 13 }, sellValue: 80,
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
};

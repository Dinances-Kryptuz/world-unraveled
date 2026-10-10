// Shared types for all static game data (zones, monsters, items, recipes, etc.)
// This file has no dependencies — everything else imports from here.

// 'smithing' is the long-standing internal id for Blacksmithing (predates
// this profession overhaul) — kept as-is to avoid touching every existing
// recipe/item/save that already references it; PROFESSION_LABELS (see
// professions.ts) displays it as "Blacksmithing" everywhere user-facing.
export type ProfessionId =
  | 'skinning'
  | 'mining'
  | 'herbalism'
  | 'fishing'
  | 'leatherworking'
  | 'smithing'
  | 'tailoring'
  | 'alchemy'
  | 'enchanting'
  | 'cooking';

export type ActivityType = 'combat' | 'gathering' | 'crafting' | 'fishing' | 'disenchanting';

// 'tool' is a 7th-slot-adjacent equip slot for profession tools (mining
// pick, skinning knife, fishing rod) — reuses the exact same equip/unequip
// flow as armor rather than inventing a separate "tool belt" system.
// 'ring'/'ring2' are two independent slots (same jewelry pool fits either
// one) rather than a single slot holding two items — added alongside
// 'necklace' for the Blacksmithing jewelry overhaul (gameData/recipes.ts's
// zone-2/4/6 jewelry sets). 'offhand' holds a shield independently of
// 'weapon' — added for Blacksmithing's shield recipes. There's no
// one-handed/two-handed enforcement (equipping a 2h axe alongside a shield
// is allowed, same permissive posture as every other slot combination this
// engine already allows) — purely a stat-bonus slot, like every other one.
export type EquipmentSlot =
  | 'weapon'
  | 'offhand'
  | 'chest'
  | 'helmet'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'ring'
  | 'ring2'
  | 'necklace'
  | 'tool';

// 'recipe' items are reagent-like: using one permanently teaches the recipe
// it names (Character.learnedRecipeIds) rather than being equipped or
// consumed for an effect. Only recipes with learnedAutomatically === false
// need one — see Recipe below.
//
// 'enchant_scroll' items are Enchanting's crafted output (see
// gameData/enchanting.ts's module doc comment) — crafted through the normal
// timed/offline recipe pipeline like any other crafting profession's goods
// (ItemDef.scrollEnchantId below says which enchant it applies), then
// consumed instantly on an equipped item via firebase/enchanting.ts's
// useEnchantScroll. This replaces the old instant "pay materials, apply
// enchant" single action with "craft scrolls while AFK, then use them" —
// decoupling the time/material cost (paid once, at craft time) from
// applying the effect (free and instant once you hold the scroll).
export type ItemType = 'material' | 'equipment' | 'consumable' | 'recipe' | 'enchant_scroll';

// Only one buff of a given category can be active at once (applying another
// of the same category replaces it) — see combatEngine/buffs.ts. Open-ended
// so a future category can be added without touching the apply/replace logic.
export type BuffCategory =
  | 'offensive_potion'
  | 'defensive_potion'
  | 'stat_potion'
  | 'resistance_potion'
  | 'precision_potion'
  | 'evasion_potion'
  | 'well_fed';

export interface BuffEffect {
  category: BuffCategory;
  statBonuses?: Partial<Record<import('./classStats').BaseStat, number>>;
  hitChanceBonusPct?: number;
  dodgeBonusPct?: number;
  damageMultiplierPct?: number; // e.g. 15 = +15% damage dealt
  mitigationMultiplierPct?: number; // e.g. 15 = -15% damage taken
  healthRegenPerSecond?: number;
  manaRegenPerSecond?: number;
  // Charge-based buffs (offensive/defensive potions, some foods) consume one
  // charge per matching combat trigger instead of expiring on a timer —
  // exactly one of charges/durationSeconds is set.
  charges?: number;
  trigger?: 'offensive_action' | 'damage_taken';
  durationSeconds?: number;
}

// A temporary stand-in for real Alchemy (per the user's own plan) — every
// instant effect (healAmount/manaAmount) applies immediately rather than as
// a true heal/restore-over-time, and cooldownSeconds is tracked per item id
// (Character.itemCooldowns), not shared across items the way classic WoW's
// potion cooldown works. manaAmount only does anything mid-combat (see
// ConsumablesBar/DungeonScreen/CombatScreen) — there's no persisted mana
// value outside a live encounter to restore into, since resource pools are
// recomputed fresh at the start of every fight. `buff` (added for the
// profession overhaul) is independent of the instant healAmount/manaAmount
// fields — a consumable can be a pure buff (most potions/food), a pure
// instant effect (Health/Mana Potion), or (rare) both.
export interface ConsumableEffect {
  healAmount?: number;
  manaAmount?: number;
  cooldownSeconds: number;
  buff?: BuffEffect;
  // One-time permanent inventory capacity increase, consumed on use — how
  // Tailoring's bags work (see firebase/consumables.ts). Mutually exclusive
  // with every other field above in practice (a bag is just a capacity
  // token) but not enforced structurally.
  bagCapacityBonus?: number;
}

// Which classes can equip a given piece of armor — see classStats.ts's
// ALLOWED_ARMOR_TYPES. Only relevant for armor (chest/helmet/gloves/legs/
// boots); weapons and rings have no armorType and are unrestricted.
export type ArmorType = 'cloth' | 'leather' | 'mail' | 'plate';

// All 10 professions now share one 5-rank/1-100 table
// (professionTiers.ts's PROFESSION_TIERS) and so all reach 'master'.
export type ProfessionTierName = 'apprentice' | 'journeyman' | 'expert' | 'artisan' | 'master';

export interface LootDrop {
  itemId: string;
  chance: number; // 0–1
  minQty: number;
  maxQty: number;
}

export interface SpecialAbility {
  name: string;
  description: string;
  // V1 combat is a simple auto-attack loop. Abilities are stored now so
  // flavor/tooltips can show them, but none are mechanically active yet.
  implemented: false;
}

export interface Monster {
  id: string;
  name: string;
  zoneIds: string[];
  levelRange: [number, number];
  level: number; // canonical single level used by the new formula-driven combat system
  // The combat-triangle type this monster fights as (see combatTriangle.ts).
  // Zones should generally skew their monster composition toward one type
  // (a forest mostly melee, a bandit camp mostly ranged, an arcane ruin
  // mostly magic) so type matters for zone choice, not just per-monster.
  combatType: import('./combatTriangle').CombatType;
  goldMin: number;
  goldMax: number;
  lootTable: LootDrop[];
  // Void Shards — the endgame currency spent at Cinderheart Crater's Void
  // Vendor (see gameData/vendors.ts) on its Voidforged gear. Absent (every
  // monster outside Cinderheart Crater) means 0, same convention as
  // equippedAbilityIds below.
  voidShardsMin?: number;
  voidShardsMax?: number;
  specialAbility?: SpecialAbility;
  // Ability ids from combatEngine/monsterAbilities.ts, priority-ordered
  // (highest first) — the same priority walk player combatants use. Absent
  // (every non-boss monster) means auto-attack only, unchanged from before
  // this field existed. Only dungeon bosses (Phase 8) set this.
  equippedAbilityIds?: string[];
  isBoss?: boolean;
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  levelRange: [number, number];
  // Ordered monster ids the player fights in sequence; the last one is the
  // boss. Clearing it loops back to the first stage — same "repeatable
  // content" convention as an open-world monster, just as a fixed gauntlet
  // instead of one monster respawning as itself.
  stages: string[];
  // The combat shape of this dungeon's non-boss stages — 'single_target'
  // (the default: one tankier, harder-hitting enemy per stage, exactly how
  // every dungeon behaved before this field existed), 'multi_target'
  // (several weaker enemies per stage at once — see encounterSize), or
  // 'dot_heavy' (single enemy per stage, but its kit applies DOTs to the
  // whole party — see an aoe dot ability in monsterAbilities.ts, no separate
  // engine support needed). The final boss stage is always fought as
  // single_target regardless of this field (see DungeonScreen.tsx) — a
  // dungeon's last fight is its capstone encounter, not another wave.
  combatType?: 'single_target' | 'multi_target' | 'dot_heavy';
  // How many enemies spawn per non-boss stage for a 'multi_target' dungeon.
  // Ignored (treated as 1) for every other combatType.
  encounterSize?: number;
}

export interface GatherNode {
  id: string;
  name: string;
  profession: ProfessionId;
  zoneId: string;
  // Both the minimum profession SKILL to attempt this node at all AND "the
  // level this resource is appropriate for" — gatheringEngine.ts's
  // gatheringColorTier computes Orange/Yellow/Green/Grey from the player's
  // level MINUS this number, so there's no separate per-node breakpoints
  // table to keep in sync anymore (see that file's module doc comment for
  // the full 1-100 XP+Mastery design).
  requiredLevel: number;
  itemId: string;
  // Profession XP awarded per gather at Orange (100%) — gatheringEngine.ts
  // scales this by the current color tier's percentage, floored at 1 XP so
  // even a thoroughly outdated (Grey) resource still teaches something.
  baseXp: number;
  secondsPerAction: number;
  rareBonus?: {
    itemId: string;
    chance: number; // 0–1, checked per action in addition to the guaranteed yield
  };
  // Mining/Skinning/Herbalism nodes require the matching tool equipped in
  // the 'tool' slot; absent means no tool is needed (not currently used,
  // but kept generic rather than assuming every node needs one).
  requiredToolType?: ToolType;
}

export type ToolType = 'mining_pick' | 'skinning_knife' | 'fishing_rod';

// Same shape as GatherNode (requiredLevel/baseXp/secondsPerAction/rareBonus
// all mean the same thing, run through the exact same gatheringEngine.ts
// resolver) plus catchChance — the one way Fishing still differs: a cast
// can come back with nothing ("your fish got away"), earning no XP, no
// Mastery, and no fish, before the color-tier math ever applies. One fish
// species per hole (no more lootTable/minQty/maxQty variance) keeps Fishing
// on the identical Profession XP + Mastery architecture as the other three,
// per the design brief's explicit ask.
export interface FishingHole {
  id: string;
  name: string;
  zoneId: string;
  requiredLevel: number;
  itemId: string;
  baseXp: number;
  secondsPerAction: number;
  // 0–1, checked once per cast before any XP/Mastery/color-tier math runs.
  catchChance: number;
}

export type UnlockRequirement =
  | { type: 'none' }
  | { type: 'characterLevel'; level: number };

export interface Zone {
  id: string;
  name: string;
  description: string;
  levelRange: [number, number];
  unlockRequirement: UnlockRequirement;
  monsterIds: string[];
  gatherNodeIds: string[];
  fishingHoleIds: string[];
}

// What occupies one equipment slot — on Character.equipment AND
// CompanionState.equipment (same shape, same equip/unequip rules for both;
// see firebase/character.ts's equipItem/firebase/companions.ts's
// equipCompanionItem). `instanceId` is present only for a randomized-roll
// item (see gameData/equipmentRolls.ts) and names which bucket in
// Inventory.equipmentInstances this came from — purely for inventory
// bookkeeping (which stack to return on unequip, which to block from
// disenchanting while equipped). `rolls` is a denormalized copy of that
// same instance's rolled stats, carried on the equipped ref itself rather
// than looked up live from inventory at stat-calc time, because
// getEquipmentStatBonuses (equipmentStats.ts) is called from a dozen sites
// that have the equipment map in scope but not the inventory doc — see that
// file's module comment. A ref with no `instanceId`/`rolls` is a
// static/legacy item (a weapon, a monster-drop ring, or a pre-overhaul
// "Sacred"-variant item kept around for old saves) and resolves its stats
// from ITEMS[itemId].statBonuses exactly as before this type existed.
export interface EquippedItemRef {
  itemId: string;
  instanceId?: string;
  rolls?: Partial<Record<import('./classStats').BaseStat, number>>;
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  stackable: boolean;
  equipSlot?: EquipmentSlot; // only present when type === 'equipment'
  armorType?: ArmorType; // only present on armor (not weapons/rings/tools) — gates which classes can equip it
  // Equipment stat bonuses are raw STR/STA/INT/SPI points — the same
  // currency the class-growth system already uses (see classStats.ts).
  statBonuses?: Partial<Record<import('./classStats').BaseStat, number>>;
  consumableEffect?: ConsumableEffect; // only present when type === 'consumable'
  // Only present on equipSlot === 'tool' items. gatherBonusPct is a small,
  // flat bonus to that tool's gathering success chance (see
  // activityEngine.ts) — deliberately modest ("meaningful but controlled
  // progression... do not allow tools to become an enormous source of
  // player power" per the design brief).
  toolType?: ToolType;
  gatherBonusPct?: number;
  // Only present when type === 'recipe' — using the item teaches this
  // recipe id (see firebase/professions.ts's learnRecipe). Items of this
  // type are never equipped or stacked into a numeric effect.
  teachesRecipeId?: string;
  // Only present when type === 'enchant_scroll' — which gameData/
  // enchanting.ts ENCHANTS entry this scroll applies when used (see
  // firebase/enchanting.ts's useEnchantScroll).
  scrollEnchantId?: string;
  // Set on a boss/dungeon drop's "_damaged" variant — purely descriptive
  // (an item is actually unequippable because it has no equipSlot at all;
  // see items.ts's damaged-item convention). Points at the real item a
  // Blacksmith/Leatherworking/Tailoring repair recipe turns it into.
  repairsIntoItemId?: string;
  sellValue: number;
}

export type RecipeSource =
  | 'trainer'
  | 'vendor'
  | 'monster_drop'
  | 'dungeon_drop'
  | 'quest'
  | 'rare_world_drop'
  | 'profession_quest';

export type RecipeRarity = 'common' | 'uncommon' | 'rare';

export interface Recipe {
  id: string;
  name: string;
  profession: ProfessionId;
  // Both the unlock gate AND the color-tier reference point on the shared
  // 1-100 profession scale — see craftingEngine.ts's module doc comment.
  // "Skill" rather than "Level" purely for naming continuity with this
  // field's pre-overhaul meaning; semantically identical to GatherNode's
  // requiredLevel.
  requiredSkill: number;
  requiredCharacterLevel?: number;
  resultItemId: string;
  resultQuantity: number;
  materials: { itemId: string; quantity: number }[];
  // Which gameData/materials.ts MaterialDef this recipe's crafts count
  // toward for material Mastery (Character.materialMastery) — set only on
  // the Blacksmithing armor/jewelry recipes that consolidate a metal/gem
  // tier's gear (see craftingEngine.ts's resolveCraftingOffline). Absent
  // means this recipe doesn't feed any material Mastery track (every other
  // profession's recipes, plus Blacksmith repairs). Explicit rather than
  // inferred from `materials[0]` so a recipe needing more than one material
  // type is never ambiguous about which one counts.
  materialId?: string;
  // Gold consumed per item crafted, in addition to materials — undefined/0
  // for the overwhelming majority of recipes (materials alone). Currently
  // only set on the Blacksmith repair recipes (see the "Blacksmith
  // repairs" section below), which need gold on top of zone-tier-matched
  // materials to turn a damaged dungeon drop back into its real form.
  goldCost?: number;
  craftSeconds: number;
  // The Orange (100%) base profession-XP award per craft on craftingEngine.ts's
  // 1-100 curve — live again (not dead) now that every crafting profession
  // resolves through that engine instead of the old discrete skill-up-chance
  // model. colorBreakpoints was removed entirely once color became a
  // universal level-delta formula (craftingColorTier) instead of a
  // per-recipe breakpoint set.
  xpAward: number;
  // Where this recipe is obtained, and whether just meeting requiredSkill
  // is enough to use it (true, the common case) or it also needs the
  // matching 'recipe' item consumed first (false — see
  // Character.learnedRecipeIds and firebase/professions.ts's learnRecipe).
  source: RecipeSource;
  rarity: RecipeRarity;
  learnedAutomatically: boolean;
}

export interface ProfessionTierDef {
  tier: ProfessionTierName;
  minSkill: number;
  maxSkill: number;
  // Gold cost to train this rank at the profession trainer. 0 for
  // apprentice — the GOLD_COST_TO_LEARN_PROFESSION constant (professions.ts)
  // covers the one-time cost of learning the profession itself.
  goldCost: number;
}

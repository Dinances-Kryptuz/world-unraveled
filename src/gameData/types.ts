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

export type ActivityType = 'combat' | 'gathering' | 'crafting' | 'fishing';

// 'tool' is a 7th-slot-adjacent equip slot for profession tools (mining
// pick, skinning knife, fishing rod) — reuses the exact same equip/unequip
// flow as armor rather than inventing a separate "tool belt" system.
export type EquipmentSlot =
  | 'weapon'
  | 'chest'
  | 'helmet'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'ring'
  | 'tool';

// 'recipe' items are reagent-like: using one permanently teaches the recipe
// it names (Character.learnedRecipeIds) rather than being equipped or
// consumed for an effect. Only recipes with learnedAutomatically === false
// need one — see Recipe below.
export type ItemType = 'material' | 'equipment' | 'consumable' | 'recipe';

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

export type ProfessionTierName = 'apprentice' | 'journeyman' | 'expert' | 'artisan';

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
  // Minimum profession SKILL to attempt this node at all (despite the name,
  // predating this overhaul — gatheringSuccessChance in activityEngine.ts
  // has always compared it against profession skill, never character
  // level; the zone's own unlockRequirement is what actually gates by
  // character level). Kept as-is rather than renamed, to avoid touching
  // every existing call site for a cosmetic rename.
  requiredLevel: number;
  itemId: string;
  // No longer read by resolveGathering (gathering grants discrete skill-up
  // chances now, see colorBreakpoints below, not XP) — kept rather than
  // removed from every node's data to avoid an otherwise-pointless mechanical
  // edit across dozens of entries in zones.ts.
  xpPerAction: number;
  secondsPerAction: number;
  rareBonus?: {
    itemId: string;
    chance: number; // 0–1, checked per action in addition to the guaranteed yield
  };
  // Same orange/yellow/green/grey semantics as Recipe.colorBreakpoints,
  // applied by activityEngine's craftingColorTier/PROFESSION_SKILLUP_CHANCE_BY_TIER —
  // a node far below your skill still succeeds on every gather (that's
  // requiredLevel's job) but stops teaching you anything once it's grey,
  // same as Fishing never running out of fish, just skill-ups.
  colorBreakpoints: {
    orangeUntil: number;
    yellowUntil: number;
    greenUntil: number;
  };
  // Mining/Skinning/Herbalism nodes require the matching tool equipped in
  // the 'tool' slot; absent means no tool is needed (not currently used,
  // but kept generic rather than assuming every node needs one).
  requiredToolType?: ToolType;
}

export type ToolType = 'mining_pick' | 'skinning_knife' | 'fishing_rod';

// Fishing is deliberately modeled apart from GatherNode: one cast can land
// any of several fish (or nothing at all, per LootDrop's implied remainder
// chance) rather than a single guaranteed-on-success item, and its skill-up
// curve (fishingSkillupChance in activityEngine.ts) gets harder as skill
// rises instead of following the orange/yellow/green/grey bands — see the
// module doc comment there for why.
export interface FishingHole {
  id: string;
  name: string;
  zoneId: string;
  requiredLevel: number;
  lootTable: LootDrop[]; // chances need not sum to 1 — the remainder is "nothing" (fish got away)
  xpPerCatch: number;
  secondsPerAction: number;
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
  requiredSkill: number;
  requiredCharacterLevel?: number;
  resultItemId: string;
  resultQuantity: number;
  materials: { itemId: string; quantity: number }[];
  // Gold consumed per item crafted, in addition to materials — undefined/0
  // for the overwhelming majority of recipes (materials alone). Currently
  // only set on the Blacksmith repair recipes (see the "Blacksmith
  // repairs" section below), which need gold on top of zone-tier-matched
  // materials to turn a damaged dungeon drop back into its real form.
  goldCost?: number;
  craftSeconds: number;
  // No longer read by resolveCrafting (crafting grants a discrete skill-up
  // chance per craft now, see colorBreakpoints below, not XP) — kept rather
  // than removed from every recipe's data to avoid an otherwise-pointless
  // mechanical edit across the ~100 entries in recipes.ts.
  xpAward: number;
  // Skill at/below orangeUntil = 100% skill-up chance per craft, up to
  // yellowUntil = 80%, up to greenUntil = 30%, above that = 0% (grey — never
  // provides a skillup, same as a trivial fish). See activityEngine.ts's
  // craftingColorTier/PROFESSION_SKILLUP_CHANCE_BY_TIER.
  colorBreakpoints: {
    orangeUntil: number;
    yellowUntil: number;
    greenUntil: number;
  };
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

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

// 'dungeon' (Equipment Rarity overhaul's Part 8) — leaving a dungeon party
// to farm offline/overnight. targetId holds the dungeonId (gameData/
// dungeons.ts), same role 'combat' gives it for a monster id. See
// CurrentActivity.dungeonFeastStatBonuses and DungeonScreen.tsx's
// handleFarmOffline.
export type ActivityType = 'combat' | 'gathering' | 'crafting' | 'fishing' | 'disenchanting' | 'dungeon';

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
//
// 'shoulders'/'bracers' are ordinary armorType-gated stat slots, same as
// chest/gloves/legs/boots — see items.ts's Blacksmithing bracer sets.
// 'belt' and 'shirt' are deliberately never given an armorType, so
// canClassEquip (classStats.ts) treats them as wearable by every class
// regardless of plate/leather/cloth — a plain, universal stat slot, per
// the paper-doll rework's explicit "belt/shirt have no armor type" call.
// 'cape', 'tabard', and 'ammo' exist as real equip slots now but have no
// itemization yet (cape/tabard/shirt are deferred to a future content
// pass; ammo is reserved for a future Hunter-style class) — every
// character's equipment record carries them as null until something
// actually fills them, same "absence is the zero state" posture as every
// other not-yet-itemized slot before it.
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
  | 'tool'
  | 'shoulders'
  | 'cape'
  | 'shirt'
  | 'tabard'
  | 'bracers'
  | 'belt'
  | 'ammo';

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
  | 'well_fed'
  // Cooking overhaul Tier 2 — Stat Food. Charge-based (one charge per solo
  // kill or per completed dungeon/raid encounter, see BUFF_CATEGORY_TRIGGER
  // in gameData/buffs.ts), replacing the old duration-based 'well_fed'
  // mechanic for the new recipe catalog ('well_fed' items are frozen, not
  // deleted, same retire-in-place convention as every prior overhaul).
  | 'stat_food';

export interface BuffEffect {
  category: BuffCategory;
  statBonuses?: Partial<Record<import('./classStats').BaseStat, number>>;
  hitChanceBonusPct?: number;
  dodgeBonusPct?: number;
  damageMultiplierPct?: number; // e.g. 15 = +15% damage dealt
  mitigationMultiplierPct?: number; // e.g. 15 = -15% damage taken
  healthRegenPerSecond?: number;
  manaRegenPerSecond?: number;
  // Herbalism/Alchemy overhaul additions — all four are transient, applied
  // only to the single hit/action that consumes the charge (never a
  // persistent stat change), per the charge-based defensive-potion design.
  // armorBonusPct/maxHpBonusPct scale the DEFENDER's effective armor/max-HP
  // for that one hit's calculation only (combatEngine/engine.ts); fire/
  // shadowResistancePct feed a new, consumable-only resistance pipeline
  // (clamped to a combined 75% cap, matching the game's existing avoidance
  // cap) applied only against a matching Monster.damageSchool attacker.
  armorBonusPct?: number;
  maxHpBonusPct?: number;
  fireResistancePct?: number;
  shadowResistancePct?: number;
  // Weak Troll's Blood Elixir's "+3% HP regen, classified defensive" — the
  // closest honest fit for a charge-based (not duration-based) regen is a
  // small heal bundled into the same hit-taken event that consumes the
  // charge, sized as a % of max HP.
  healOnTriggerPct?: number;
  // Charge-based buffs (offensive/defensive potions, some foods) consume one
  // charge per matching combat trigger instead of expiring on a timer —
  // exactly one of charges/durationSeconds is set.
  charges?: number;
  // Cooking overhaul Tier 2 — 'stat_food_use' consumes a charge once per
  // solo monster kill OR once per completed dungeon/raid encounter (never
  // per enemy in multi-target group content) — the caller (CombatScreen
  // feeding kill count, DungeonScreen feeding completed-encounter count)
  // decides which, so this one trigger key covers both contexts. A
  // coarser granularity than the per-hit offensive/defensive-potion
  // triggers above.
  trigger?: 'offensive_action' | 'damage_taken' | 'stat_food_use';
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
  // Herbalism/Alchemy overhaul resource potions restore a PERCENTAGE of max
  // HP/mana (per the design's "Restore 55% max HP" style) rather than a flat
  // amount — new, separate fields so the old flat-amount potions keep
  // working byte-for-byte; a consumer checks these first, falling back to
  // the flat healAmount/manaAmount only when absent.
  healPctMax?: number;
  manaPctMax?: number;
  cooldownSeconds: number;
  buff?: BuffEffect;
  // One-time permanent inventory capacity increase, consumed on use — how
  // Tailoring's bags work (see firebase/consumables.ts). Mutually exclusive
  // with every other field above in practice (a bag is just a capacity
  // token) but not enforced structurally.
  bagCapacityBonus?: number;
  // Cooking overhaul Tier 3 — Feasts. Consumed ONCE at a dungeon/raid run's
  // start (never mid-run, never in open-world combat — see
  // DungeonScreen.tsx's pre-run picker), lasting the WHOLE run even on
  // failure/wipe. Party-wide (including companions), no charges, no HP
  // restore, no automatic quantity multipliers from Cooking Mastery (only
  // XP weight — see cookingMastery.ts). Stacks additively with a
  // personally-equipped Stat Food buff (both just add into the same
  // stat-bonus pool); presence of this field IS the "this item is a Feast"
  // flag, same convention as recoveryFood's boolean below.
  feastStatBonuses?: Partial<Record<import('./classStats').BaseStat, number>>;
  // Cooking overhaul Tier 1 — Recovery Food. A MANUAL use (never Auto Eat)
  // heals to FULL, overriding healAmount/healPctMax entirely, and resets
  // the player's live Combatant.actionReadyIn to 0 (a free action — see
  // CombatScreen's handleUseConsumable), the one consumable use with any
  // effect on the attack timer. No stat bonuses, no buff — pure sustain.
  // Completely unusable in a dungeon/raid, manually or through Auto Eat
  // (see ConsumablesBar's allowRecoveryFood prop and engine.ts's
  // ctx.nextMonster dungeon check).
  recoveryFood?: boolean;
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
  // Herbalism/Alchemy overhaul's minimal elemental-resistance mechanic —
  // absent (every monster not explicitly tagged) means 'physical', which
  // nothing resists specially (zero behavior change for the ~20 untagged
  // monsters). Tagged only on monsters whose name/kit are already
  // thematically fire- or shadow-coded (see combatEngine/engine.ts's
  // resistance pipeline) — not retrofitted onto the whole roster.
  damageSchool?: DamageSchool;
  // Enchanting overhaul's Beastslayer/Demonslaying-family weapon enchants —
  // absent (every monster not explicitly tagged) means "no creature family"
  // and never triggers either bonus, same zero-behavior-change-by-default
  // posture as damageSchool above. Tagged now only on monsters already
  // thematically beast-coded (wolves, boars, etc. — see monsters.ts);
  // 'demon' exists in the type for the matching Demonslaying enchant but is
  // deliberately left untagged for now — this roster has no demon-themed
  // monster yet, so authoring Demonslaying's data now without any real
  // target would be guesswork, not a tagging decision (see the
  // AskUserQuestion resolution in this session's history: "add
  // Monster.creatureType, tag beasts now [only]").
  creatureType?: 'beast' | 'demon';
  // Combat/Rarity overhaul — a tougher open-world variant of a normal zone
  // monster. Absent/false behaves exactly like every monster before this
  // field existed. See combatFormulas.ts's ELITE_* multipliers for the
  // actual HP/damage/armor/XP scaling (applied in combatEngine/engine.ts's
  // buildMonsterProfile/createMonsterCombatant/rollKillReward) — elites
  // reuse the same level-based formulas as everything else, just scaled up,
  // rather than a separate stat system.
  isElite?: boolean;
  // The Citadel of Krypt — a generic per-monster HP/damage scale, independent
  // of isElite (which is a fixed, single open-world "tougher variant" tier).
  // This is what lets Citadel Level 2's three cultist archetypes share the
  // same level/dungeon config but still read as distinct glass-cannon
  // (Rogue: high damageMultiplier, low hpMultiplier), stone-wall (Warrior:
  // the reverse), or support (Summoner: low hpMultiplier, relies on its DOT
  // kit rather than raw hit damage) threats. Absent/1 for every monster
  // before this field existed — zero behavior change. Applied in
  // combatEngine/engine.ts's buildMonsterProfile/createMonsterCombatant
  // multiplicatively alongside the existing dungeon-level/elite multipliers,
  // never replacing them.
  hpMultiplier?: number;
  damageMultiplier?: number;
  // The Citadel of Krypt's boss-only HP-threshold phase mechanic — see
  // BossPhaseTrigger's own doc comment. Absent for every monster before this
  // field existed (including every other dungeon boss, which keep their
  // flat ability-rotation-only kit).
  bossPhases?: BossPhaseTrigger[];
}

// One-shot, HP-threshold-triggered boss mechanics — evaluated in
// combatEngine/engine.ts's advanceCombat right after damage resolution, the
// same tick that crosses the threshold, shared verbatim by the online tick
// loop and simulateOfflineDungeonCombat (same function, same rules both
// paths, per this project's long-standing convention). Each trigger fires
// AT MOST ONCE per encounter (tracked on the boss's own Combatant, not
// persisted) — crossing the same threshold again later (e.g. via the
// 'adds_and_regen' kind's own regen ticking the boss back up past hpPct)
// never re-fires it.
export interface BossPhaseTrigger {
  // Fires the first tick the boss's HP, expressed as a percent of its max,
  // drops to or below this value.
  hpPct: number;
  // 'adds_and_regen': the boss stops acting (no attacks, no abilities) and
  // regenerates regenPctPerSecond% of its max HP every second until every
  // spawned add is dead, at which point it resumes attacking normally —
  // same "don't stall" pressure a real enrage timer gives, just phrased as
  // "adds you're slow to kill undo your own progress" instead of a flat
  // damage ramp. 'enrage': the boss's own outgoing damage is multiplied by
  // 1 + rampPctPerSecond/100 * secondsSinceTriggered, growing every second
  // this phase has been active, uncapped (it's meant to end the fight).
  kind: 'adds_and_regen' | 'enrage';
  addsMonsterId?: string;
  addsCount?: number;
  regenPctPerSecond?: number;
  rampPctPerSecond?: number;
}

export type DamageSchool = 'physical' | 'fire' | 'shadow';

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
  // Fishing overhaul's rare pearl — mirrors GatherNode.rareBonus exactly
  // (a flat chance checked per action, in addition to the guaranteed
  // yield), except here it's additionally gated behind catchChance in
  // gatheringEngine.ts's resolver: the pearl only ever rolls on a
  // SUCCESSFUL catch, never on a cast that lands nothing. One pearl per
  // zone, shared by every fishing hole in that zone (see zones.ts).
  rareBonus?: { itemId: string; chance: number };
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

// Equipment Rarity overhaul — WoW-Classic-style item quality tiers, a
// DIFFERENT axis from RecipeRarity below (which describes how hard a
// *recipe* is to obtain, not the *item's* own power tier). Gray/white are
// new, minor normal-monster-drop content; green is the existing crafted
// randomized-stat system; blue/purple are dungeon-sourced fixed-stat gear
// (plus an advanced "masterwork" crafted recipe tier for blue); orange is
// reserved, zero content yet (future raid/legendary).
export type ItemRarity = 'gray' | 'white' | 'green' | 'blue' | 'purple' | 'orange';

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
  // The Citadel of Krypt — an INNATE, always-on resistance the item itself
  // carries while equipped, entirely separate from gameData/enchanting.ts's
  // enchant-sourced fireResistancePct (which lives on an EnchantDef/slot and
  // needs periodic re-application as its charges deplete). Summed with the
  // enchant-sourced total in getEquipmentStatBonuses before it reaches
  // CasterProfile.fireResistancePct, same "one pipeline, multiple sources"
  // convention the resistance system already uses. Only ever set on Citadel
  // Level 3's BiS purple weapons (50%) for now — architecture-only
  // elsewhere, zero behavior change for every other item.
  fireResistancePct?: number;
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
  // Only present on equipSlot === 'shirt' items — a fixed, predictable
  // profession-utility bonus (NOT a randomized combat stat roll, unlike
  // every other equipment slot). Exactly one shirt can be equipped at a
  // time, so this never stacks with anything — see equipmentStats.ts for
  // where it's read. Tailoring overhaul; see gameData/shirts.ts's
  // ShirtBonusType doc comment for what each type actually does.
  shirtBonus?: { type: import('./shirts').ShirtBonusType; pct: number };
  // Set on a boss/dungeon drop's "_damaged" variant — purely descriptive
  // (an item is actually unequippable because it has no equipSlot at all;
  // see items.ts's damaged-item convention). Points at the real item a
  // Blacksmith/Leatherworking/Tailoring repair recipe turns it into.
  repairsIntoItemId?: string;
  // Only present on the plain (non-"sacred") *_shield offhand items —
  // Attribute/Specialization overhaul's Shield Block Value (see
  // combatFormulas.ts's shieldBlockValue). Deliberately NOT inferred from
  // id/name pattern-matching at combat time (that would silently re-tag any
  // future reskin); this is the one explicit source of truth.
  isShield?: boolean;
  // Equipment Rarity overhaul — explicit override for this item's rarity
  // tier. Absent means "infer it" (see gameData/itemRarity.ts's
  // inferItemRarity) rather than "no rarity" — every equippable item has
  // SOME rarity for display purposes, but only items where inference would
  // guess wrong (fixed-stat dungeon drops, the two repaired boss weapons,
  // the small new gray/white monster-drop set) need to say so explicitly.
  rarity?: ItemRarity;
  // Reserved for future Legendary (orange) raid content — a short machine
  // key naming a unique on-equip/on-proc effect this specific item grants,
  // outside the normal statBonuses system. No current item sets this; kept
  // here now (architecture-only, per the design brief) so a future
  // legendary doesn't need a schema change to exist.
  uniqueEffect?: string;
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
  // Which zone (gameData/zones.ts ZONE id) this Alchemy recipe's charge-
  // count/craft-time Mastery milestones are looked up against — set only on
  // the 30 Herbalism-overhaul Alchemy recipes. For a recipe whose herbs span
  // two zones (one recipe does: Fire Protection Potion), this is the zone of
  // its MAJORITY ingredient by unit count; Mastery XP itself is still
  // credited per-ingredient's own herb zone (see herbs.ts's herbZoneOf),
  // not funneled entirely through this field — this field only answers
  // "whose 25/60/90% milestone table governs this recipe's own charges and
  // speed." Absent for every other profession's recipes.
  alchemyZoneId?: string;
  // Which zone (gameData/zones.ts ZONE id) this Enchanting scroll recipe's
  // crafting-speed/material-preservation Mastery milestones are looked up
  // against — set on every Phase E6 scroll recipe (gameData/recipes.ts),
  // always that recipe's own zone (no scroll recipe spans two zones, unlike
  // Alchemy's one cross-zone recipe) — see gameData/enchantingMastery.ts.
  // Absent for the Wand/Staff/Book equipment recipes (materialId-tagged
  // instead) and every other profession's recipes.
  enchantingZoneId?: string;
  // Cooking overhaul — which zone (gameData/zones.ts ZONE id) this recipe's
  // charge-count (Stat Food)/milestone-reward Mastery is looked up against,
  // and which of the 6 independent cookingZoneMastery pools its XP credits
  // (always that zone's own pool — Cooking recipes don't split XP across
  // zones the way Alchemy's one cross-zone potion does). Set on every
  // Recovery Food/Stat Food/Feast recipe below; absent for every other
  // profession's recipes, including the frozen legacy Cooking block above.
  cookingZoneId?: string;
  // Cooking overhaul — which of the 3 design-brief tiers this recipe is,
  // driving its Mastery XP WEIGHT (gameData/cookingMastery.ts:
  // Tier1=1x/Tier2=5x/Tier3=25x) and gating tier-specific mechanics (Auto
  // Eat never touches Tier 2/3, charges only apply to Tier 2, Feasts are
  // Tier 3's dungeon-only/party-wide shape). Set alongside cookingZoneId.
  cookingTier?: 1 | 2 | 3;
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

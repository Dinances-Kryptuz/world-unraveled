import type { EquipmentSlot, EquippedItemRef, ProfessionId, ActivityType, ProfessionTierName } from '../gameData/types';
import type { BaseStat } from '../gameData/classStats';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentPicks } from '../gameData/talents';
import type { ConditionGroup } from '../combatEngine/types';
import type { TravelState } from '../gameData/travel';

// ONE shared shape across all 10 professions, all on the same 1-100 `level`
// with `xp` toward the next level on gameData/gatheringEngine.ts's shared
// curve (also reused by gameData/craftingEngine.ts for the 6 crafting
// professions). A profession the character hasn't learned yet has no entry
// in Character.professions at all (see firebase/professions.ts's
// learnProfession) rather than a default row.
export interface ProfessionState {
  level: number;
  xp: number;
  unlockedTier: ProfessionTierName;
  // Per-recipe/resource Mastery (0-50, keyed by Recipe.id for crafting or
  // GatherNode.id/FishingHole.id for gathering, gameData/gatheringEngine.ts
  // /craftingEngine.ts) — a shallower, recipe-scoped progression track,
  // distinct from the per-MATERIAL Mastery below. A Smithing recipe tagged
  // with Recipe.materialId (the consolidated armor/jewelry recipes) stops
  // populating this and contributes only to Character.materialMastery
  // instead; every other recipe/node still uses this bucket exactly as
  // before. A node/recipe with no entry here is simply un-practiced
  // (Mastery level 0), not an error — same "absence is the zero state"
  // convention as the rest of this interface.
  mastery?: Record<string, { level: number; xp: number }>;
}

// Per-MATERIAL Mastery (gameData/materials.ts's MaterialDef registry) — a
// single shared 0-100% progress bar per metal/jewelry tier, fed by every
// consolidated armor/jewelry recipe that crafts from that material
// (Recipe.materialId), independent of which specific piece was crafted.
// Separate from ProfessionState.mastery above (which is per-recipe, not
// per-material) and from profession level/xp (which is the 1-100
// Blacksmithing skill itself) — see gameData/materials.ts's module comment
// for why these are three independent axes. `xp` accumulates without a cap;
// the 0-100% figure is always derived as
// `min(100, xp / MATERIAL_MASTERY_XP_THRESHOLDS[materialId] * 100)`
// (gameData/equipmentRolls.ts), never stored directly, so a future
// rebalance of the threshold doesn't require migrating stored percentages.
// A material with no entry here is simply un-practiced (0%), same
// "absence is the zero state" convention as everywhere else in this file.
export type MaterialMasteryState = Record<string, { xp: number }>;

// Same shape, keyed by gameData/zones.ts ZONE id instead of materialId —
// used by both of the Herbalism/Alchemy overhaul's zone-Mastery axes
// (Character.herbalismZoneMastery/alchemyZoneMastery below).
export type ZoneMasteryState = Record<string, { xp: number }>;

export interface CurrentActivity {
  type: ActivityType | null;
  targetId: string | null;
  zoneId: string | null;
  startedAt: Date | null;
  recipeQueue?: { recipeId: string; quantity: number }[];
  // Only set when type === 'disenchanting' — the stack size the player
  // chose on the Enchanting tab's quantity slider (see DisenchantingScreen
  // and firebase/enchanting.ts's startDisenchanting). The activity
  // auto-stops once this many have been processed (or the stack runs out,
  // whichever comes first) rather than running until manually stopped like
  // every other activity.
  disenchantQuantity?: number;
  // Only set when disenchanting targets a specific randomized-stat roll
  // (gameData/equipmentRolls.ts) rather than a plain stackable/legacy item —
  // names which Inventory.equipmentInstances bucket to draw from and
  // decrement, so two different rolls of the same base item are never
  // conflated (see firebase/enchanting.ts's applyDisenchantResult).
  disenchantInstanceId?: string;
  // Tailoring overhaul's profession shirts — a SNAPSHOT of whichever shirt
  // (if any) was equipped the moment this activity started (see
  // firebase/character.ts's startActivity), read by every resolver
  // instead of the character's current equipment.shirt. This is what makes
  // "finish 8 offline hours, then swap shirts" not retroactively change
  // the bonus already earned: the activity's own bonus is fixed for its
  // entire duration, same posture as talents/buffs/equipment being
  // snapshotted once at encounter/batch setup everywhere else in this
  // codebase. Absent/null means no shirt was equipped when it started.
  equippedShirtItemId?: string | null;
}

// A named snapshot of an equipped-ability loadout + its conditions (Phase 7)
// — lets a player save more than one build ("Grinding", "Boss") and switch
// the active one with a click instead of re-picking abilities/conditions
// every time. Always a full, already-valid snapshot of what
// equippedAbilityIds/abilityConditions looked like when saved — see
// firebase/character.ts's saveCombatPreset/activateCombatPreset.
export interface CombatPreset {
  id: string;
  name: string;
  equippedAbilityIds: string[];
  abilityConditions: Record<string, ConditionGroup>;
  // Equipped-but-paused ability ids, same meaning as Character.disabledAbilityIds
  // below — captured per-preset so switching presets also restores which of
  // its abilities were toggled off.
  disabledAbilityIds: string[];
}

// Quest state — see gameData/questEngine.ts for how this is read/written.
// `active` is questId -> per-objective progress counters (parallel to that
// quest's QuestDef.objectives). `completedIds` is every quest ever finished
// at least once (permanent, drives prerequisite chains). `dailyCompletedAt`
// is only for repeatable quests, tracking when they can next be re-offered
// — a repeatable quest stays in completedIds forever once first finished,
// but that alone doesn't mean it's on cooldown.
export interface QuestState {
  active: Record<string, number[]>;
  completedIds: string[];
  dailyCompletedAt: Record<string, Date>;
}

// A recruited companion's own gear — same shape/rules as Character.equipment
// (gameData/companions.ts's emptyCompanionEquipment), drawn from and
// returned to the player's own shared inventory on equip/unequip (see
// firebase/companions.ts). A companion id present here means recruited;
// there is no separate "known companions" list. Companions have no
// separate level/XP — they always fight at the player's current level (see
// gameData/companions.ts's resolveActiveCompanionSetup) and no talents, so
// there's nothing else to persist per companion.
export interface CompanionState {
  equipment: Record<EquipmentSlot, EquippedItemRef | null>;
}

export interface Character {
  name: string;
  createdAt: Date;
  level: number;
  xp: number;
  gold: number;
  voidShards: number;
  class: ClassId;
  spec: SpecId | null;
  talentPicks: TalentPicks;
  currentHp: number;
  hpCheckpointAt: Date;
  respecCount: number;
  equipment: Record<EquipmentSlot, EquippedItemRef | null>;
  // Only professions actually learned (see firebase/professions.ts's
  // learnProfession) have a key here — Partial, not a full Record, since an
  // unlearned profession has no state at all, not a level-0 default.
  professions: Partial<Record<ProfessionId, ProfessionState>>;
  // Per-material Mastery (see MaterialMasteryState above) — absent entirely
  // for a character who's never crafted a material-linked recipe, same
  // "absence is the zero state" convention as `professions`.
  materialMastery?: MaterialMasteryState;
  // Herbalism/Alchemy overhaul's two zone-Mastery axes — SHARED per zone
  // (not per-node/per-recipe like materialMastery above), keyed by
  // gameData/zones.ts ZONE id. herbalismZoneMastery is cosmetic-only
  // (titles); alchemyZoneMastery drives charge-count/craft-time milestones
  // (gameData/alchemyMastery.ts). Same "absence is the zero state"
  // convention as materialMastery.
  herbalismZoneMastery?: ZoneMasteryState;
  alchemyZoneMastery?: ZoneMasteryState;
  // Enchantment id per equipment slot — bound to the SLOT, not a unique item
  // instance (this engine doesn't instance equipment; see gameData/
  // enchanting.ts's doc comment for why). Re-enchanting a slot overwrites
  // whatever was there; unequipping does not clear it, matching "enchants
  // persist on the item" as closely as a non-instanced item model allows.
  enchantments: Partial<Record<EquipmentSlot, string>>;
  // Enchanting overhaul's charge model — remaining charges for whichever
  // enchant currently occupies that slot (enchantments[slot] above).
  // Crafting/using an enchant scroll (firebase/enchanting.ts's
  // useEnchantScroll) always SETS this to exactly 100, never increments or
  // combines it with whatever was left on the enchant it replaces — "never
  // refunding/combining" per the design brief. An offensive enchant loses 1
  // charge per eligible outgoing attack regardless of whether its chance-
  // based proc actually fires; a defensive enchant loses 1 only on a
  // successful (non-avoided) incoming hit; a passive stat enchant loses 1
  // per completed combat encounter (see combatEngine's kill-count-driven
  // consumption, not per attack) — see gameData/enchanting.ts's
  // EnchantDef.category. A slot present in `enchantments` but ABSENT here
  // means "not yet migrated to the charge model" and is treated as still
  // fully active (getEquipmentStatBonuses's "absence is the old/default
  // state" convention) rather than silently losing its bonus; reaching 0
  // (present, but zero) is what actually turns an enchant off.
  enchantmentCharges: Partial<Record<EquipmentSlot, number>>;
  // Recipe ids learned via a 'recipe' item (Recipe.learnedAutomatically ===
  // false) — see firebase/professions.ts's learnRecipe. A recipe with
  // learnedAutomatically === true never appears here; meeting its
  // requiredSkill/requiredCharacterLevel is enough on its own.
  learnedRecipeIds: string[];
  // Max distinct item ids the inventory can hold at once (see
  // firebase/inventory.ts) — grows permanently when a Tailoring-crafted bag
  // is used (ConsumableEffect.bagCapacityBonus).
  bagSlots: number;
  // Max distinct item ids the bank (characters/{uid}/bank/main, see
  // firebase/bank.ts) can hold at once — a separate, larger storage pool
  // bought slot-by-slot with gold (gameData/bank.ts's nextBankSlotCost),
  // unlike bagSlots which only ever grows from a crafted item.
  bankSlots: number;
  // Active potion/food buffs, keyed by BuffCategory so applying a second
  // buff of the same category replaces rather than stacks (see
  // combatEngine/buffs.ts). Charge-based buffs count down `charges`;
  // duration-based ones are pruned by `expiresAt`.
  activeBuffs: Partial<Record<import('../gameData/types').BuffCategory, { itemId: string; charges?: number; expiresAt?: Date }>>;
  // The player's pinned quick-use consumable per slot — a chosen item id
  // the ConsumablesBar surfaces first (with its current inventory quantity
  // as a "stack" count) instead of making the player hunt through every
  // owned consumable each time. Purely a UI pointer: it doesn't reserve or
  // move the item, using it still just decrements inventory by 1 like any
  // other consumable use (see firebase/consumables.ts's
  // setEquippedConsumable). null means no pin for that slot.
  equippedConsumables: { food: string | null; potion: string | null };
  currentActivity: CurrentActivity;
  // The player's saved priority list (highest priority first). See
  // combatEngine/progression.ts's effectiveLoadout() — an empty array is a
  // valid, expected state (no choice made yet) and falls back to a
  // recommended default rather than an empty combat bar.
  equippedAbilityIds: string[];
  // Per-ability condition groups, keyed by ability id — see
  // combatEngine/conditions.ts. An ability with no entry here has no
  // conditions and is always usable, same as before this field existed.
  abilityConditions: Record<string, ConditionGroup>;
  // Equipped ability ids the player has manually paused — a toggle,
  // independent of conditions, to mute a spell from the auto-cast priority
  // walk entirely without unequipping it (which would also drop its saved
  // conditions). An id here is skipped by combatEngine/priority.ts's
  // pickAbility the same as if it weren't equipped at all; the basic attack
  // fallback is never affected. Absence (the common case) means "enabled."
  disabledAbilityIds: string[];
  // Saved combat loadout/condition snapshots — see CombatPreset above.
  combatPresets: CombatPreset[];
  // Last-used timestamp per consumable item id (Timestamp on write, always
  // read back as a Date — see getCharacter()). An item with no entry has
  // never been used and is always off cooldown. See
  // firebase/consumables.ts's remainingCooldownSeconds().
  itemCooldowns: Record<string, Date>;
  // Herbalism/Alchemy overhaul's Part 8 automation settings — one selected
  // item id + enable flag per category, plus a %-of-max threshold for the
  // two resource categories. Absent entirely (every character before this
  // field existed, or one who's never opened the automation settings)
  // means every category is off — same "absence is the zero state"
  // convention as everywhere else, and matches today's fully-manual
  // behavior exactly, so nothing changes for a character who never touches
  // this.
  consumableAutomation?: ConsumableAutomationSettings;
  // Quest progress — see QuestState above.
  quests: QuestState;
  // Recruited companions, keyed by CompanionDef.id (gameData/companions.ts)
  // — present means recruited, same "no entry at all" convention as
  // professions above. Up to MAX_ACTIVE_COMPANIONS of them can join combat
  // at once (activeCompanionIds below); the rest just sit recruited.
  companions: Partial<Record<string, CompanionState>>;
  // Which recruited companions (0 to MAX_ACTIVE_COMPANIONS, see
  // gameData/companions.ts) currently fight alongside the player — empty
  // means solo. Every id here must already be a key in `companions` (see
  // firebase/companions.ts's addCompanionToParty/removeCompanionFromParty).
  // A dungeon requires exactly MAX_ACTIVE_COMPANIONS active (a full 5-person
  // group with the player) to enter at all; open-world combat has no
  // minimum.
  activeCompanionIds: string[];
  // Which of the account's OTHER character slots (gameData/characterSlots.ts)
  // are currently recruited into this character's dungeon party, alongside
  // activeCompanionIds — combined, the two lists are capped at
  // MAX_ACTIVE_COMPANIONS (see ZoneScreen.tsx's dungeon-entry gate). Unlike a
  // hired companion, a recruited alt fights with its OWN real gear, spec,
  // and talents (see gameData/companions.ts's buildAltCombatSetup) and asks
  // no wage — it's your own character, not an NPC. Cleared whenever that
  // slot stops existing in the roster (switching INTO it, or creating a new
  // character over it) — see firebase/characterSlots.ts.
  activeAltSlots: number[];
  // The zone the character is physically standing in — gates which zone's
  // Adventure/Shop/Professions/trainers a player can actually use (see
  // gameData/travel.ts). Switching this requires a flight (below), unlike
  // the old purely client-side "selected zone" this replaced.
  currentZoneId: string;
  // An in-progress flight, or null when not traveling — see
  // gameData/travel.ts's TravelState and firebase/travel.ts's startTravel.
  // Resolved lazily (see firebase/character.ts's getCharacter): once
  // arrivesAt has passed, the next read reports currentZoneId as already
  // having arrived and travel as already null, with no separate "complete
  // the flight" write needed.
  travel: TravelState | null;
  // Lifetime full-clear count per dungeon id — distinct from DungeonScreen's
  // own session-only fullClears display state, which resets on reload. The
  // only thing in Character that isn't otherwise derivable from existing
  // fields, so it's the one new counter Phase 5's achievements
  // (gameData/achievements.ts) needed; everything else they check is a
  // plain snapshot of already-persisted state.
  dungeonClears: Record<string, number>;
  // Every equipment item id ever seen in this character's inventory or
  // bank — permanent, never shrinks even if the item is later sold,
  // disenchanted, or deposited/withdrawn. Reconciled lazily whenever the
  // Collection Log screen is open (see components/CollectionScreen.tsx),
  // not eagerly at every loot/craft/purchase call site — an item that's
  // insta-sold before the log is ever opened while held is the one gap this
  // accepts, a reasonable tradeoff for a completionist side feature.
  collectedItemIds: string[];
  // Permanent, monotonic — once an id is added here (see
  // gameData/achievements.ts's checkNewlyUnlocked, reconciled the same lazy
  // way as collectedItemIds above) it never comes out, even if the
  // underlying condition (e.g. a gold total) later stops being true.
  unlockedAchievementIds: string[];
  // Permanent, monotonic — same convention as unlockedAchievementIds, and
  // populated in lockstep with it: a material-Mastery or Master Blacksmith
  // achievement unlocking (gameData/achievements.ts) always awards its
  // paired title (gameData/titles.ts) in the same write. An id here is
  // never removed, even if a later achievement-definition change makes it
  // harder to re-earn — see achievements.ts's module comment on why that's
  // already safe by construction.
  unlockedTitleIds: string[];
  // The player's one active cosmetic title (gameData/titles.ts), or null
  // for none — a pure UI pointer into unlockedTitleIds, same
  // "doesn't reserve or move anything" posture as equippedConsumables above
  // (see firebase/titles.ts's setEquippedTitle). Titles carry no stat
  // effect; this only changes what TopBar.tsx displays next to the
  // character's name.
  equippedTitleId: string | null;
  // Player preference, toggled from SettingsScreen — gates the toast
  // notifications in components/Notifications.tsx (loot/XP on a kill, an
  // item finishing in a profession). Defaults to true; an old character
  // read before this field existed backfills to true (see getCharacter),
  // same "opt-out, not opt-in" posture as every other preference toggle.
  notificationsEnabled: boolean;
  // Two granular opt-IN sub-preferences (unlike notificationsEnabled above,
  // these default to false — see getCharacter/createCharacter) for players
  // who want a pop-up every time a profession skill levels up its XP bar,
  // or every time a Mastery track (the old per-recipe one or the new
  // per-material one, gameData/materials.ts) gains XP, during an active
  // timed activity. Fired from the same 4 activity screens
  // (Crafting/Gathering/Fishing/DisenchantingScreen) that already gate the
  // loot/item notify() calls on notificationsEnabled above — these two are
  // independent of that toggle and of each other.
  skillXpNotificationsEnabled: boolean;
  masteryXpNotificationsEnabled: boolean;
  // Owned mount ids (gameData/mounts.ts) — a permanent gold-sink purchase
  // from the Mount Trainer that discounts zone-travel flight time
  // (gameData/travel.ts's travelMinutes). Mounts don't stack; see
  // bestMountSpeedBonusPct for how an owned mount's bonus is applied.
  mounts: string[];
  // Abilities actually paid for at the Class Trainer's Spells & Abilities
  // page (gameData/abilityTraining.ts) — an ability whose unlockLevel the
  // character has reached is only usable once its id is ALSO here (see
  // combatEngine/progression.ts's effectiveLoadout, which an id missing
  // from this list can never enter). A character that existed before this
  // field did is grandfathered in with everything it had already
  // level-unlocked (see firebase/character.ts's getCharacter) rather than
  // losing its whole kit; every character created after is empty until its
  // first trainAbility() call.
  trainedAbilityIds: string[];
}

export interface Inventory {
  items: Record<string, number>;
  // Randomized-stat equipment (gameData/equipmentRolls.ts) stacked by a
  // deterministic instanceId derived from itemId + its canonicalized rolls,
  // so two identically-rolled items collapse into one bucket's `quantity`
  // instead of each needing their own Firestore document — this stays a
  // field on the same characters/{uid}/inventory/main doc, not a
  // subcollection. Plain stackable items (materials, consumables,
  // non-randomized equipment) are untouched and keep using `items` exactly
  // as before this field existed. A base item id can hold at most
  // MAX_VARIANTS_PER_BASE_ITEM (gameData/equipmentRolls.ts) distinct
  // instanceIds at once — see firebase/inventory.ts's
  // grantEquipmentInstances for what happens to a roll beyond that cap.
  equipmentInstances?: Record<string, {
    itemId: string;
    rolls: Partial<Record<BaseStat, number>>;
    quantity: number;
  }>;
  // Charge-count-distinguished offensive/defensive potions (Herbalism/
  // Alchemy overhaul) — same bucketing pattern as equipmentInstances
  // above, keyed by gameData/consumableCharges.ts's chargedInstanceId
  // (`${itemId}:c${remainingCharges}`) instead of a stat roll, so e.g. 10
  // Fire Protection Potions at 4 charges and 5 at 3 charges (from charges
  // already spent) stay in separate, distinguishable stacks. See
  // firebase/inventory.ts's grantChargedConsumables.
  chargedConsumables?: Record<string, {
    itemId: string;
    remainingCharges: number;
    quantity: number;
  }>;
}

// Herbalism/Alchemy overhaul's Part 8 "potion automation" settings — one
// selected item id (or null) + enable flag per consumable category, plus a
// %-of-max activation threshold for the two resource categories. Offline
// combat (combatEngine/offlineCombat.ts) and online combat
// (combatEngine/engine.ts) both read the exact same object, so there is
// only ever one set of automation rules, never two that could drift apart.
export interface ConsumableAutomationSettings {
  offensiveItemId: string | null;
  defensiveItemId: string | null;
  healingItemId: string | null;
  manaItemId: string | null;
  healingThresholdPct: number;
  manaThresholdPct: number;
  autoOffensiveEnabled: boolean;
  autoDefensiveEnabled: boolean;
  autoHealingEnabled: boolean;
  autoManaEnabled: boolean;
}

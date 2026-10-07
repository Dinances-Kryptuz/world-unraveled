import type { EquipmentSlot, ProfessionId, ActivityType, ProfessionTierName } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentPicks } from '../gameData/talents';
import type { ConditionGroup } from '../combatEngine/types';
import type { TravelState } from '../gameData/travel';

// ONE shared shape across all 10 professions, on two different scales
// depending on category (gameData/professionTiers.ts's PROFESSION_CATEGORY):
// the 6 crafting professions (including Smithing) use a 1-300 `level` with
// `xp` meaningful only for Smithing (gameData/masteryEngine.ts) — the other
// 5 level via a discrete skill-up chance with `xp` always 0; the 4 gathering
// professions (Mining/Herbalism/Skinning/Fishing) use a 1-100 `level` with
// `xp` toward the next level on gameData/gatheringEngine.ts's shared curve.
// A profession the character hasn't learned yet has no entry in
// Character.professions at all (see firebase/professions.ts's
// learnProfession) rather than a default row.
export interface ProfessionState {
  level: number;
  xp: number;
  unlockedTier: ProfessionTierName;
  // Per-resource/recipe Mastery — populated for Smithing (0-10, keyed by
  // Recipe.id, gameData/masteryEngine.ts) and for all 4 gathering
  // professions (0-50, keyed by GatherNode.id/FishingHole.id,
  // gameData/gatheringEngine.ts). The other 5 crafting professions never
  // populate this. A node/recipe with no entry here is simply un-practiced
  // (Mastery level 0), not an error — same "absence is the zero state"
  // convention as the rest of this interface.
  mastery?: Record<string, { level: number; xp: number }>;
}

export interface CurrentActivity {
  type: ActivityType | null;
  targetId: string | null;
  zoneId: string | null;
  startedAt: Date | null;
  recipeQueue?: { recipeId: string; quantity: number }[];
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
  equipment: Record<EquipmentSlot, string | null>;
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
  equipment: Record<EquipmentSlot, string | null>;
  // Only professions actually learned (see firebase/professions.ts's
  // learnProfession) have a key here — Partial, not a full Record, since an
  // unlearned profession has no state at all, not a level-0 default.
  professions: Partial<Record<ProfessionId, ProfessionState>>;
  // Enchantment id per equipment slot — bound to the SLOT, not a unique item
  // instance (this engine doesn't instance equipment; see gameData/
  // enchanting.ts's doc comment for why). Re-enchanting a slot overwrites
  // whatever was there; unequipping does not clear it, matching "enchants
  // persist on the item" as closely as a non-instanced item model allows.
  enchantments: Partial<Record<EquipmentSlot, string>>;
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
  // Player preference, toggled from SettingsScreen — gates the toast
  // notifications in components/Notifications.tsx (loot/XP on a kill, an
  // item finishing in a profession). Defaults to true; an old character
  // read before this field existed backfills to true (see getCharacter),
  // same "opt-out, not opt-in" posture as every other preference toggle.
  notificationsEnabled: boolean;
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
}

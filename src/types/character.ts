import type { EquipmentSlot, ProfessionId, ActivityType, ProfessionTierName } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentPicks } from '../gameData/talents';
import type { ConditionGroup } from '../combatEngine/types';

// `level` IS the profession's 1-300 skill value (naming predates this
// overhaul — see xpTables.ts's professionXpForLevel, unchanged). `xp` is
// progress toward the next skill point. A profession the character hasn't
// learned yet has no entry in Character.professions at all (see
// firebase/professions.ts's learnProfession) rather than a default row —
// knowing a profession is itself meaningful state now (primary-slot limit),
// not just a given.
export interface ProfessionState {
  level: number;
  xp: number;
  unlockedTier: ProfessionTierName;
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
  // professions above. At most one can fight alongside the player at a
  // time (activeCompanionId below); the rest just sit recruited.
  companions: Partial<Record<string, CompanionState>>;
  // Which recruited companion (if any) joins combat — null means solo.
  // Must be a key already present in `companions` (see
  // firebase/companions.ts's setActiveCompanion).
  activeCompanionId: string | null;
}

export interface Inventory {
  items: Record<string, number>;
}

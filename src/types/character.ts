import type { EquipmentSlot, ProfessionId, ActivityType, ProfessionTierName } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentPicks } from '../gameData/talents';
import type { ConditionGroup } from '../combatEngine/types';

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
  professions: Record<ProfessionId, ProfessionState>;
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
}

export interface Inventory {
  items: Record<string, number>;
}

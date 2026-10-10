import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, increment, arrayUnion } from 'firebase/firestore';
import { db } from './config';
import type { Character, CombatPreset, MaterialMasteryState } from '../types/character';
import type { ProfessionId, EquipmentSlot, EquippedItemRef } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentColumn } from '../gameData/talents';
import { PROFESSION_CATEGORY, tierForLevel } from '../gameData/professionTiers';
import { migrateLegacyGatheringLevel, migrateLegacyMasteryLevel } from '../gameData/gatheringEngine';
import type { ProfessionState } from '../types/character';
import { BASE_BANK_SLOTS } from '../gameData/bank';
import { DEFAULT_ZONE_ID, ZONES } from '../gameData/zones';
import { abilityTrainingCost, abilityTrainingZoneId } from '../gameData/abilityTraining';
import type { TravelState } from '../gameData/travel';
import { maxHp } from '../gameData/combatFormulas';
import { canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import { getEquipmentStatBonuses, isTwoHandedWeapon, canEquipInOffhand, equippedItemId } from '../gameData/equipmentStats';
import { maxEquippedSlots, unlockedAbilities, effectiveLoadout, MAX_COMBAT_PRESETS } from '../combatEngine/progression';
import { ABILITIES } from '../combatEngine/abilities';
import type { Condition, ConditionGroup, ConditionType, ResourceType } from '../combatEngine/types';
import {
  refillActiveQuests,
  applyQuestEvents,
  completeQuestInState,
  acceptQuestInState,
  type QuestEvent,
} from '../gameData/questEngine';
import { grantInventoryItems, grantEquipmentInstances, getInventory } from './inventory';
import { equipmentRefInventoryDelta, resolveEquippedRef } from './equipmentInstances';
import { MATERIALS } from '../gameData/materials';
import { MATERIAL_MASTERY_XP_THRESHOLDS, rollArmorStats, canonicalInstanceId } from '../gameData/equipmentRolls';

export const BASE_BAG_SLOTS = 24;

// All 10 professions moved from a 1-300 skill scale (0-10 Mastery where any
// existed — Mining and Smithing's respective Mastery pilots) to the shared
// 1-100 scale (0-50 Mastery) gatheringEngine.ts/craftingEngine.ts now use —
// see migrateLegacyGatheringLevel/migrateLegacyMasteryLevel's doc comments
// for the rescale itself (the same /3 and x5 formulas apply regardless of
// category, since the OLD scale was identical for gathering and crafting
// before each got its own redesign). Unlike every other backfill in
// getCharacter below, this one is NOT idempotent (re-running a proportional
// rescale on already-migrated data would silently shrink it again), so each
// category runs at most once per character, gated by — and persisting — its
// own one-time flag, rather than being patched in memory and left for "the
// next real write" to catch up. Two separate flags (not one) because
// gathering shipped and may already be migrated on real characters before
// crafting's redesign landed — a single shared flag would either skip
// crafting's migration entirely (if set) or re-run gathering's (if not),
// silently re-shrinking already-correct 1-100 data.
async function migrateLegacyProfessions(
  uid: string,
  data: Record<string, any>
): Promise<Partial<Record<ProfessionId, ProfessionState>>> {
  const professions: Partial<Record<ProfessionId, ProfessionState>> = data.professions ?? {};
  const gatheringDone = !!data.gatheringProfessionsMigratedV2;
  const craftingDone = !!data.craftingProfessionsMigratedV2;
  if (gatheringDone && craftingDone) return professions;

  const migrated: Partial<Record<ProfessionId, ProfessionState>> = { ...professions };
  for (const id of Object.keys(migrated) as ProfessionId[]) {
    const alreadyDone = PROFESSION_CATEGORY[id] === 'production' ? craftingDone : gatheringDone;
    if (alreadyDone) continue;
    const state = migrated[id]!;
    const level = migrateLegacyGatheringLevel(state.level);
    const mastery = state.mastery
      ? Object.fromEntries(
          Object.entries(state.mastery).map(([resourceId, m]) => [resourceId, { level: migrateLegacyMasteryLevel(m.level), xp: 0 }])
        )
      : undefined;
    migrated[id] = { level, xp: 0, unlockedTier: tierForLevel(level), ...(mastery ? { mastery } : {}) };
  }

  try {
    await updateDoc(doc(db, 'characters', uid), {
      professions: migrated,
      gatheringProfessionsMigratedV2: true,
      craftingProfessionsMigratedV2: true,
    });
  } catch (err) {
    // Safe to retry on the next read — the flags are only set once this
    // write actually succeeds, so a failure here just means the migration
    // (and this same log) runs again next time.
    console.error('Profession migration failed, will retry next read:', err);
    return professions;
  }
  return migrated;
}

export async function getCharacter(uid: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, 'characters', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  const professions = await migrateLegacyProfessions(uid, data);

  // Resolved lazily rather than written back — the same "patch the in-memory
  // return value, let the next real write catch Firestore up" approach every
  // other backfill in this function already uses. Once arrivesAt has
  // passed, the character has arrived: report the destination as
  // currentZoneId and travel as null, with no separate "complete the
  // flight" round-trip required. See gameData/travel.ts.
  let currentZoneId: string = data.currentZoneId ?? DEFAULT_ZONE_ID;
  let travel: TravelState | null = null;
  if (data.travel) {
    const arrivesAt = (data.travel.arrivesAt as Timestamp).toDate();
    if (arrivesAt.getTime() <= Date.now()) {
      currentZoneId = data.travel.toZoneId;
    } else {
      travel = {
        fromZoneId: data.travel.fromZoneId,
        toZoneId: data.travel.toZoneId,
        departedAt: (data.travel.departedAt as Timestamp).toDate(),
        arrivesAt,
      };
    }
  }

  return {
    ...data,
    currentZoneId,
    travel,
    // A character with no professions key yet (pre-overhaul save) starts
    // knowing nothing — same "no choice made yet" convention as
    // equippedAbilityIds below, not a default grant. Already migrated (if
    // needed) by migrateLegacyProfessions above.
    professions,
    // Lazily normalized in memory (never written back) so a slot still
    // holding the old bare-string shape keeps working — see
    // normalizeEquipment's doc comment above.
    equipment: normalizeEquipment(data.equipment),
    enchantments: data.enchantments ?? {},
    learnedRecipeIds: data.learnedRecipeIds ?? [],
    bagSlots: data.bagSlots ?? BASE_BAG_SLOTS,
    bankSlots: data.bankSlots ?? BASE_BANK_SLOTS,
    // A charge-based buff has no expiresAt in Firestore at all — omitting
    // the key entirely (rather than setting it to `undefined`) matters
    // because this object gets spread again later (consumeBuffCharges),
    // and Firestore's updateDoc rejects an explicit `undefined` value even
    // though it accepts a genuinely absent key.
    activeBuffs: Object.fromEntries(
      Object.entries(data.activeBuffs ?? {}).map(([category, buff]: [string, any]) => {
        const { expiresAt, ...rest } = buff;
        return [category, expiresAt ? { ...rest, expiresAt: (expiresAt as Timestamp).toDate() } : rest];
      })
    ),
    // Same backfill idea, for the quick-use food/potion slots — a character
    // that existed before these did just has no pin yet, same as a fresh one.
    equippedConsumables: data.equippedConsumables ?? { food: null, potion: null },
    // Same backfill idea for equippedAbilityIds, added after some characters
    // already existed — an empty list is itself a valid "no choice made
    // yet" state, so this only matters for a genuinely missing field.
    equippedAbilityIds: data.equippedAbilityIds ?? [],
    // Same backfill idea again, for the Phase 3 conditions system.
    abilityConditions: data.abilityConditions ?? {},
    // Same backfill idea again, for the per-ability auto-cast toggle.
    disabledAbilityIds: data.disabledAbilityIds ?? [],
    // Same backfill idea again, for the Phase 7 presets system.
    combatPresets: (data.combatPresets ?? []).map((preset: CombatPreset) => ({
      ...preset,
      disabledAbilityIds: preset.disabledAbilityIds ?? [],
    })),
    // Same backfill idea again, for consumable item cooldowns — each value
    // is a Firestore Timestamp on disk, converted to a Date here same as
    // every other timestamp field this function returns.
    itemCooldowns: Object.fromEntries(
      Object.entries(data.itemCooldowns ?? {}).map(([itemId, ts]) => [itemId, (ts as Timestamp).toDate()])
    ),
    // Same backfill idea again, for companions — an old character has
    // recruited none yet and fights solo, same "no entry at all" convention
    // as professions above. A character saved before multi-companion
    // parties existed may still have the old singular activeCompanionId —
    // carry it over as a one-member array rather than dropping it.
    companions: Object.fromEntries(
      Object.entries(data.companions ?? {}).map(([id, state]: [string, any]) => [
        id,
        { ...state, equipment: normalizeEquipment(state.equipment) },
      ])
    ),
    activeCompanionIds: data.activeCompanionIds ?? (data.activeCompanionId ? [data.activeCompanionId] : []),
    // Same backfill idea again, for Phase 4's alt recruiting.
    activeAltSlots: data.activeAltSlots ?? [],
    // Same backfill idea again, for Phase 5's achievements/collection log.
    dungeonClears: data.dungeonClears ?? {},
    collectedItemIds: data.collectedItemIds ?? [],
    unlockedAchievementIds: data.unlockedAchievementIds ?? [],
    // Same backfill idea again, for the material-Mastery titles system — an
    // old character has unlocked none yet and has no active one, same "no
    // choice made yet" convention as equippedConsumables above.
    unlockedTitleIds: data.unlockedTitleIds ?? [],
    equippedTitleId: data.equippedTitleId ?? null,
    // Same backfill idea again, for the notification toggle — an old
    // character read before this field existed defaults to on.
    notificationsEnabled: data.notificationsEnabled ?? true,
    // Same backfill idea, but opt-IN (defaults to off, not on) — see
    // Character.skillXpNotificationsEnabled's doc comment for why these two
    // are deliberately a different default than notificationsEnabled above.
    skillXpNotificationsEnabled: data.skillXpNotificationsEnabled ?? false,
    masteryXpNotificationsEnabled: data.masteryXpNotificationsEnabled ?? false,
    // Same backfill idea again, for mounts — an old character read before
    // this field existed owns none yet and flies at the un-discounted rate.
    mounts: data.mounts ?? [],
    // Same "may not exist yet" backfill, but NOT to an empty default — a
    // character read before Class Trainer training existed already fought
    // with everything its level unlocked under the old free-unlock rules,
    // and losing that whole kit the moment this field shipped would be a
    // real regression for an already-played character. Grandfather it in as
    // already-trained; only a character created AFTER this field existed
    // (see createCharacter below) starts at [] and must visit the trainer.
    trainedAbilityIds:
      data.trainedAbilityIds ?? unlockedAbilities(data.class, data.spec ?? null, data.level).map((a) => a.id),
    // Same backfill idea again, for the quest system — an old character
    // without this field just starts with an empty board and picks up its
    // first quests the next time it completes a trackable action (or via
    // the Quest Log's manual refresh), same non-eager pattern as every
    // other backfill here.
    quests: {
      active: data.quests?.active ?? {},
      completedIds: data.quests?.completedIds ?? [],
      dailyCompletedAt: Object.fromEntries(
        Object.entries(data.quests?.dailyCompletedAt ?? {}).map(([id, ts]) => [id, (ts as Timestamp).toDate()])
      ),
    },
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    hpCheckpointAt: (data.hpCheckpointAt as Timestamp)?.toDate() ?? new Date(),
    currentActivity: {
      ...data.currentActivity,
      startedAt: data.currentActivity?.startedAt
        ? (data.currentActivity.startedAt as Timestamp).toDate()
        : null,
    },
  } as Character;
}

// A level-1 character fighting bare-handed dies to the first same-level
// enemy within a couple of hits (see the balance pass that added this) — a
// small starter kit closes most of that gap. novice_tunic/novice_boots are
// cloth, which every class can equip, so only the weapon differs by class
// (primary-stat weapon: STR for the physical classes, INT for Priest).
function starterEquipment(cls: ClassId): Record<EquipmentSlot, EquippedItemRef | null> {
  return {
    weapon: { itemId: cls === 'priest' ? 'novice_focus' : 'novice_blade' },
    chest: { itemId: 'novice_tunic' },
    helmet: null,
    gloves: null,
    legs: null,
    boots: { itemId: 'novice_boots' },
    ring: null,
    ring2: null,
    necklace: null,
    offhand: null,
    tool: null,
  };
}

// Wraps every still-bare-string equipment slot value (the shape every save
// used before per-instance rolls existed) into { itemId } in memory, never
// written back — fully idempotent, same "patch the return value, let the
// next real write catch up" posture as every other backfill in getCharacter.
// A slot already in the new object shape, or already null, passes through
// unchanged. See gameData/types.ts's EquippedItemRef doc comment.
export function normalizeEquipment(raw: Record<string, unknown> | undefined): Record<EquipmentSlot, EquippedItemRef | null> {
  const result = {} as Record<EquipmentSlot, EquippedItemRef | null>;
  for (const [slot, value] of Object.entries(raw ?? {})) {
    result[slot as EquipmentSlot] = typeof value === 'string' ? { itemId: value } : (value as EquippedItemRef | null) ?? null;
  }
  return result;
}

export async function createCharacter(uid: string, name: string, characterClass: ClassId): Promise<void> {
  const equipment = starterEquipment(characterClass);
  const startingHpBonuses = getEquipmentStatBonuses(equipment);

  // A brand-new character immediately sees a starter quest board (its
  // level-1 zone/class/profession quests) rather than an empty one that
  // only fills in after their first kill/gather/craft.
  const initialActiveQuests = refillActiveQuests(
    {
      class: characterClass, spec: null, level: 1, professions: {},
      quests: { active: {}, completedIds: [], dailyCompletedAt: {} },
    },
    new Date()
  );

  const character = {
    name,
    createdAt: serverTimestamp(),
    level: 1,
    xp: 0,
    gold: 0,
    voidShards: 0,
    class: characterClass,
    spec: null,
    talentPicks: {},
    currentHp: maxHp(characterClass, 1, startingHpBonuses),
    hpCheckpointAt: serverTimestamp(),
    respecCount: 0,
    equipment,
    // Starts knowing no professions at all — see learnProfession in
    // firebase/professions.ts. Zone 1 has an apprentice trainer for all 10.
    professions: {},
    enchantments: {},
    learnedRecipeIds: [],
    bagSlots: BASE_BAG_SLOTS,
    bankSlots: BASE_BANK_SLOTS,
    activeBuffs: {},
    equippedConsumables: { food: null, potion: null },
    currentActivity: { type: null, targetId: null, zoneId: null, startedAt: null },
    equippedAbilityIds: [],
    abilityConditions: {},
    disabledAbilityIds: [],
    combatPresets: [],
    itemCooldowns: {},
    quests: { active: initialActiveQuests, completedIds: [], dailyCompletedAt: {} },
    companions: {},
    activeCompanionIds: [],
    activeAltSlots: [],
    dungeonClears: {},
    collectedItemIds: [],
    unlockedAchievementIds: [],
    unlockedTitleIds: [],
    equippedTitleId: null,
    notificationsEnabled: true,
    skillXpNotificationsEnabled: false,
    masteryXpNotificationsEnabled: false,
    mounts: [],
    trainedAbilityIds: [],
    currentZoneId: DEFAULT_ZONE_ID,
    travel: null,
  };

  await setDoc(doc(db, 'characters', uid), character);
  await setDoc(doc(db, 'characters', uid, 'inventory', 'main'), { items: {} });
  await setDoc(doc(db, 'characters', uid, 'bank', 'main'), { items: {} });
}

export async function startActivity(
  uid: string,
  activity: {
    type: 'combat' | 'gathering' | 'crafting' | 'fishing' | 'disenchanting';
    targetId: string;
    zoneId: string;
    // Only meaningful for 'disenchanting' — the stack size chosen on the
    // Enchanting tab's quantity slider (see DisenchantingScreen and
    // firebase/enchanting.ts's module doc comment). Ignored for every other
    // activity type, which runs until manually stopped like before.
    quantity?: number;
    // Only meaningful for 'disenchanting' — present when targeting a
    // specific randomized-stat roll rather than a plain stack (see
    // CurrentActivity.disenchantInstanceId's doc comment).
    instanceId?: string;
  }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    currentActivity: {
      type: activity.type,
      targetId: activity.targetId,
      zoneId: activity.zoneId,
      startedAt: serverTimestamp(),
      ...(activity.quantity !== undefined ? { disenchantQuantity: activity.quantity } : {}),
      ...(activity.instanceId !== undefined ? { disenchantInstanceId: activity.instanceId } : {}),
    },
  });
}

export async function stopActivity(uid: string): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    currentActivity: { type: null, targetId: null, zoneId: null, startedAt: null },
  });
}

export async function applyCombatResult(
  uid: string,
  result: {
    xpGained: number;
    goldGained: number;
    voidShardsGained?: number;
    loot: { itemId: string; quantity: number }[];
    hpAfter?: number;
    // Set only by DungeonScreen's autosave, only on a tick that cleared at
    // least one full dungeon run — the lifetime total Phase 5's achievements
    // (gameData/achievements.ts) check against, distinct from DungeonScreen's
    // own session-only fullClears display state.
    dungeonCleared?: { dungeonId: string; count: number };
  }
): Promise<void> {
  const characterUpdate: Record<string, unknown> = {
    xp: increment(result.xpGained),
    gold: increment(result.goldGained),
    'currentActivity.startedAt': serverTimestamp(),
  };
  if (result.voidShardsGained) {
    characterUpdate.voidShards = increment(result.voidShardsGained);
  }
  if (result.hpAfter !== undefined) {
    characterUpdate.currentHp = result.hpAfter;
    characterUpdate.hpCheckpointAt = serverTimestamp();
  }
  if (result.dungeonCleared) {
    characterUpdate[`dungeonClears.${result.dungeonCleared.dungeonId}`] = increment(result.dungeonCleared.count);
  }
  await updateDoc(doc(db, 'characters', uid), characterUpdate);

  if (result.loot.length > 0) {
    await grantInventoryItems(uid, result.loot);
  }
}

export async function setCharacterLevel(uid: string, level: number, restoredHp: number): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    level,
    currentHp: restoredHp,
    hpCheckpointAt: serverTimestamp(),
  });
}

// Applies a batch of quest-progress events (kills, gathers, crafts, ability
// uses, healing) to the character's active quests, persists the result, and
// pays out any rewards from newly-completed quests. Called from the same
// autosave paths that already report kills/gathers/crafts to Firestore —
// see CombatScreen/DungeonScreen/GatheringScreen/CraftingScreen. Takes the
// caller's already-loaded `character` rather than re-fetching, since every
// call site already has a fresh one in hand.
export async function advanceQuests(uid: string, character: Character, events: QuestEvent[]): Promise<void> {
  if (events.length === 0) return;
  const active = applyQuestEvents(character, events);
  await updateDoc(doc(db, 'characters', uid), { 'quests.active': active });
}

// The player's explicit "Complete Quest" click — see questEngine.ts's
// completeQuestInState for the validation (quest is active and every
// objective is actually met; never trust the client alone).
export async function completeQuest(uid: string, questId: string): Promise<{ success: boolean; reason?: string }> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const result = completeQuestInState(character, questId, new Date());
  if (!result) return { success: false, reason: 'That quest isn’t ready to complete.' };

  const characterUpdate: Record<string, unknown> = { quests: result.quests };
  if (result.rewards.xp) characterUpdate.xp = increment(result.rewards.xp);
  if (result.rewards.gold) characterUpdate.gold = increment(result.rewards.gold);
  await updateDoc(doc(db, 'characters', uid), characterUpdate);

  if (result.rewards.items.length > 0) {
    await grantInventoryItems(uid, result.rewards.items);
  }

  return { success: true };
}

// The player's explicit "Accept Quest" click — see questEngine.ts's
// acceptQuestInState for the validation (a free active slot, and the quest
// is actually available to this character right now).
export async function acceptQuest(uid: string, questId: string): Promise<{ success: boolean; reason?: string }> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const quests = acceptQuestInState(character, questId, new Date());
  if (!quests) return { success: false, reason: 'That quest can’t be accepted right now.' };

  await updateDoc(doc(db, 'characters', uid), { quests });
  return { success: true };
}

// Mining/Herbalism/Skinning's shared 1-100 XP+Mastery engine
// (gameData/gatheringEngine.ts) writes a continuous profession level+xp and
// a per-resource Mastery level+xp. The caller (GatheringScreen) has already
// run resolveGatheringOffline and is just persisting its final numbers.
export async function applyGatheringProfessionResult(
  uid: string,
  profession: ProfessionId,
  nodeId: string,
  result: {
    itemId: string;
    quantity: number;
    rareBonusItemId?: string;
    rareBonusQuantity: number;
    newSkillLevel: number;
    newSkillXp: number;
    newMasteryLevel: number;
    newMasteryXp: number;
  }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}.level`]: result.newSkillLevel,
    [`professions.${profession}.xp`]: result.newSkillXp,
    [`professions.${profession}.mastery.${nodeId}`]: { level: result.newMasteryLevel, xp: result.newMasteryXp },
  });

  const grants: { itemId: string; quantity: number }[] = [];
  if (result.quantity > 0) grants.push({ itemId: result.itemId, quantity: result.quantity });
  if (result.rareBonusItemId && result.rareBonusQuantity > 0) {
    grants.push({ itemId: result.rareBonusItemId, quantity: result.rareBonusQuantity });
  }
  if (grants.length > 0) {
    await grantInventoryItems(uid, grants);
  }
}

// Checks whether every CURRENTLY REGISTERED material is already mastered
// as of `mastery` (a hypothetical/updated materialMastery map, not
// necessarily yet persisted) — shared by the eager in-crafting check below
// and gameData/achievements.ts's MASTER_BLACKSMITH_ACHIEVEMENT so the two
// can never disagree.
function allMaterialsMastered(mastery: MaterialMasteryState | undefined): boolean {
  return MATERIALS.every((m) => (mastery?.[m.id]?.xp ?? 0) >= (MATERIAL_MASTERY_XP_THRESHOLDS[m.id] ?? Infinity));
}

// All 6 crafting professions' shared 1-100 XP+Mastery engine
// (gameData/craftingEngine.ts) writes a continuous profession level+xp and
// a per-recipe Mastery level+xp — generalizes the old Smithing-only
// applyMasteryCraftingResult to every crafting profession. `earnsProfessionXp`
// is false only for Mining's Smelting recipes (tagged to a gathering-
// category profession whose level/XP/Mastery is owned entirely by
// gatheringEngine.ts — see CraftingScreen's matching comment), in which case
// this writes only the inventory/gold side, never the profession fields.
//
// `character` is the SAME fresh snapshot the caller already fetched to
// compute `result` in the first place (see CraftingScreen.tsx's autosave) —
// never re-read here — used only to (a) read its CURRENT materialMastery/
// unlockedAchievementIds so the eager achievement/title check below needs
// no second read, and (b) roll fresh item instances for a materialId recipe.
export async function applyCraftingProfessionResult(
  uid: string,
  profession: ProfessionId,
  recipeId: string,
  character: Character,
  result: {
    resultItemId: string;
    resultQuantity: number;
    materialsConsumed: { itemId: string; quantity: number }[];
    goldSpent: number;
    newSkillLevel: number;
    newSkillXp: number;
    newMasteryLevel: number;
    newMasteryXp: number;
    earnsProfessionXp: boolean;
    // Only set for a Recipe.materialId-tagged recipe — see
    // craftingEngine.ts's resolveCraftingOffline/MaterialMasteryInput.
    materialMastery?: {
      materialId: string;
      newMaterialMasteryXp: number;
      batches: { quantity: number; masteryPercentAtCraft: number }[];
    };
  }
): Promise<void> {
  const characterUpdate: Record<string, unknown> = {};
  if (result.earnsProfessionXp) {
    characterUpdate[`professions.${profession}.level`] = result.newSkillLevel;
    characterUpdate[`professions.${profession}.xp`] = result.newSkillXp;
    if (result.materialMastery) {
      // A materialId-tagged recipe no longer populates the old per-recipe
      // Mastery bucket at all — see ProfessionState.mastery's doc comment.
      characterUpdate[`materialMastery.${result.materialMastery.materialId}`] = {
        xp: result.materialMastery.newMaterialMasteryXp,
      };

      // Eager unlock check, scoped to just mastery/Master-Blacksmith (not
      // the full ACHIEVEMENTS list, and no getAccount() read) so an
      // entirely-offline crafting session unlocks its title immediately
      // rather than waiting for a Collection Log visit — folded into this
      // SAME updateDoc, no extra write or read.
      const hypotheticalMastery: MaterialMasteryState = {
        ...character.materialMastery,
        [result.materialMastery.materialId]: { xp: result.materialMastery.newMaterialMasteryXp },
      };
      const newlyUnlockedIds: string[] = [];
      for (const m of MATERIALS) {
        const id = `mastery_${m.id}`;
        if (character.unlockedAchievementIds.includes(id)) continue;
        if ((hypotheticalMastery[m.id]?.xp ?? 0) >= (MATERIAL_MASTERY_XP_THRESHOLDS[m.id] ?? Infinity)) {
          newlyUnlockedIds.push(id);
        }
      }
      if (!character.unlockedAchievementIds.includes('master_blacksmith') && allMaterialsMastered(hypotheticalMastery)) {
        newlyUnlockedIds.push('master_blacksmith');
      }
      if (newlyUnlockedIds.length > 0) {
        characterUpdate.unlockedAchievementIds = arrayUnion(...newlyUnlockedIds);
        characterUpdate.unlockedTitleIds = arrayUnion(...newlyUnlockedIds); // same ids reused 1:1 as titles
      }
    } else {
      characterUpdate[`professions.${profession}.mastery.${recipeId}`] = {
        level: result.newMasteryLevel,
        xp: result.newMasteryXp,
      };
    }
  }
  if (result.goldSpent) characterUpdate.gold = increment(-result.goldSpent);
  if (Object.keys(characterUpdate).length > 0) {
    await updateDoc(doc(db, 'characters', uid), characterUpdate);
  }

  // Materials are spent regardless of whether the result fits in the bag —
  // consume them FIRST so a material dropping to 0 (freeing a bag slot) is
  // already reflected before the result grant reads current occupancy, then
  // let the capped grant decide whether the crafted item itself fits.
  if (result.materialsConsumed.length > 0) {
    const materialUpdates: Record<string, unknown> = {};
    for (const m of result.materialsConsumed) {
      materialUpdates[`items.${m.itemId}`] = increment(-m.quantity);
    }
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), materialUpdates);
  }

  if (result.materialMastery) {
    // Roll one instance per batch entry at THAT batch's own mastery%, not
    // the final mastery% — see CraftingOfflineResult.materialMasteryBatches'
    // doc comment for why. Fractional quantity (the Mastery bonus-output
    // share) carries across batches the same way itemsCrafted already
    // accumulates as a float elsewhere, floored only once instances are
    // actually rolled.
    const grantsByInstance = new Map<string, { rolls: ReturnType<typeof rollArmorStats>['rolls']; quantity: number }>();
    let carry = 0;
    for (const batch of result.materialMastery.batches) {
      carry += batch.quantity;
      const whole = Math.floor(carry);
      carry -= whole;
      for (let i = 0; i < whole; i++) {
        const { rolls } = rollArmorStats(result.resultItemId, batch.masteryPercentAtCraft);
        const instanceId = canonicalInstanceId(result.resultItemId, rolls);
        const existing = grantsByInstance.get(instanceId);
        if (existing) existing.quantity++;
        else grantsByInstance.set(instanceId, { rolls, quantity: 1 });
      }
    }
    if (grantsByInstance.size > 0) {
      await grantEquipmentInstances(
        uid,
        result.resultItemId,
        Array.from(grantsByInstance, ([instanceId, g]) => ({ instanceId, rolls: g.rolls, quantity: g.quantity }))
      );
    }
  } else if (result.resultQuantity > 0) {
    await grantInventoryItems(uid, [{ itemId: result.resultItemId, quantity: result.resultQuantity }]);
  }
}

// Shared by equipItem/equipCompanionItem (firebase/companions.ts) — both
// validate class/item eligibility differently (a companion's own class vs
// the player's), so only the actually-identical "resolve the ref, move it
// between inventory and the equipment slot" core lives here. See
// firebase/equipmentInstances.ts.
async function resolveAndEquip(
  uid: string,
  itemId: string,
  instanceId: string | undefined
): Promise<{ ref: EquippedItemRef; inventoryDelta: Record<string, unknown> }> {
  let ref: EquippedItemRef = { itemId };
  if (instanceId) {
    const inventory = await getInventory(uid);
    ref = resolveEquippedRef(itemId, instanceId, inventory);
  }
  return { ref, inventoryDelta: equipmentRefInventoryDelta(ref, -1) };
}

// `instanceId` is present only when equipping a specific randomized-stat
// roll (gameData/equipmentRolls.ts) rather than a static/legacy item — see
// gameData/types.ts's EquippedItemRef doc comment. Omitting it keeps every
// existing non-randomized equip (weapons, jewelry, a pre-overhaul legacy
// stack) exactly as fast as before this field existed: no extra inventory
// read, just the original items.{itemId} increment/decrement.
export async function equipItem(uid: string, slot: EquipmentSlot, itemId: string, instanceId?: string): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;

  const item = ITEMS[itemId];
  if (!item || !canClassEquip(character.class, item)) {
    throw new Error(`${character.class} cannot equip ${item?.name ?? itemId} (${item?.armorType} armor)`);
  }

  // Offhand accepts a genuine offhand item (shield/tome/orb) OR a one-
  // handed weapon (dual wielding two one-handers) — never a two-handed
  // one, and never while a two-handed weapon already occupies 'weapon'.
  // See equipmentStats.ts's canEquipInOffhand/isTwoHandedWeapon doc comments.
  if (slot === 'offhand') {
    if (!canEquipInOffhand(item)) {
      throw new Error(`${item.name} can’t be equipped in the off-hand.`);
    }
    const mainHandId = equippedItemId(character.equipment.weapon);
    const mainHand = mainHandId ? ITEMS[mainHandId] : null;
    if (mainHand && isTwoHandedWeapon(mainHand)) {
      throw new Error('Unequip your two-handed weapon first.');
    }
  }

  const { ref: newRef, inventoryDelta } = await resolveAndEquip(uid, itemId, instanceId);
  const previouslyEquipped = character.equipment[slot];

  const inventoryUpdates: Record<string, unknown> = { ...inventoryDelta };
  if (previouslyEquipped) {
    Object.assign(inventoryUpdates, equipmentRefInventoryDelta(previouslyEquipped, 1));
  }

  const characterUpdates: Record<string, unknown> = {
    [`equipment.${slot}`]: newRef,
  };

  // Equipping a two-handed weapon can't coexist with an offhand — auto-
  // unequip whatever's there back to inventory rather than blocking the
  // equip outright, same "the game resolves it for you" posture a ring
  // swap already has.
  if (slot === 'weapon' && isTwoHandedWeapon(item) && character.equipment.offhand) {
    Object.assign(inventoryUpdates, equipmentRefInventoryDelta(character.equipment.offhand, 1));
    characterUpdates['equipment.offhand'] = null;
  }

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
  await updateDoc(doc(db, 'characters', uid), characterUpdates);
}

export async function unequipItem(uid: string, slot: EquipmentSlot): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const currentlyEquipped = character.equipment[slot];
  if (!currentlyEquipped) return;

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), equipmentRefInventoryDelta(currentlyEquipped, 1));
  await updateDoc(doc(db, 'characters', uid), {
    [`equipment.${slot}`]: null,
  });
}

export async function chooseSpec(uid: string, spec: SpecId): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), { spec });
}

const ALLOWED_CONDITION_TYPES: ConditionType[] = [
  'self_hp_below', 'self_hp_above', 'target_hp_below', 'target_hp_above', 'resource_below', 'resource_above',
];
const ALLOWED_RESOURCE_TYPES: ResourceType[] = ['rage', 'mana', 'holyPower'];
const MAX_CONDITIONS_PER_ABILITY = 3;

// Best-effort sanitization, not a source of truth — a group that comes back
// malformed (bad shape, out-of-range value, wrong resource) is dropped
// entirely rather than partially trusted, which just means that ability
// falls back to "always usable," never a crash or an unintended lockout.
function sanitizeConditionGroup(group: unknown): ConditionGroup | null {
  if (!group || typeof group !== 'object') return null;
  const g = group as { logic?: unknown; conditions?: unknown };
  if (g.logic !== 'AND' && g.logic !== 'OR') return null;
  if (!Array.isArray(g.conditions)) return null;

  const conditions: Condition[] = [];
  for (const raw of g.conditions.slice(0, MAX_CONDITIONS_PER_ABILITY)) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as { type?: unknown; value?: unknown; resource?: unknown };
    if (typeof c.type !== 'string' || !ALLOWED_CONDITION_TYPES.includes(c.type as ConditionType)) continue;
    const value = Math.max(0, Math.min(100, Number(c.value)));
    if (!Number.isFinite(value)) continue;

    const condition: Condition = { type: c.type as ConditionType, value };
    if (condition.type === 'resource_below' || condition.type === 'resource_above') {
      if (typeof c.resource !== 'string' || !ALLOWED_RESOURCE_TYPES.includes(c.resource as ResourceType)) continue;
      condition.resource = c.resource as ResourceType;
    }
    conditions.push(condition);
  }
  if (conditions.length === 0) return null;
  return { logic: g.logic, conditions };
}

// Saves the player's priority list (highest priority first) and the
// per-ability condition groups from the Combat Setup screen, in one write.
// Both are validated against their CURRENT level/loadout here (not just
// trusted from the caller) so a stale UI state or a direct client call
// can't save more slots, an ability the character hasn't unlocked, or a
// condition group attached to an ability that isn't even equipped — the
// real gameplay gate is still client-trusted overall (matches this
// project's existing security posture), but this keeps an honest client
// from saving nonsense.
export async function saveCombatSetup(
  uid: string,
  abilityIds: string[],
  abilityConditionsInput: Record<string, unknown>,
  disabledAbilityIdsInput: string[] = []
): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;

  const trainedSet = new Set(character.trainedAbilityIds);
  const unlockedIds = new Set(
    unlockedAbilities(character.class, character.spec, character.level)
      .filter((a) => trainedSet.has(a.id))
      .map((a) => a.id)
  );
  const slots = maxEquippedSlots(character.level);
  const validatedIds = abilityIds.filter((id) => unlockedIds.has(id)).slice(0, slots);
  const equippedSet = new Set(validatedIds);

  const abilityConditions: Record<string, ConditionGroup> = {};
  for (const [abilityId, group] of Object.entries(abilityConditionsInput)) {
    if (!equippedSet.has(abilityId)) continue;
    const sanitized = sanitizeConditionGroup(group);
    if (sanitized) abilityConditions[abilityId] = sanitized;
  }

  // Only an actually-equipped ability can be toggled off — same ownership
  // check as abilityConditions above.
  const disabledAbilityIds = disabledAbilityIdsInput.filter((id) => equippedSet.has(id));

  await updateDoc(doc(db, 'characters', uid), { equippedAbilityIds: validatedIds, abilityConditions, disabledAbilityIds });
}

function generatePresetId(): string {
  return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Snapshots the character's CURRENTLY ACTIVE loadout/conditions (i.e.
// whatever the last successful saveCombatSetup() call wrote) into a new
// named preset. Deliberately doesn't accept a loadout from the caller —
// the active config already passed saveCombatSetup's validation, so
// there's nothing left to sanitize, and a preset can never end up holding
// an ability the character never actually had equipped.
export async function saveCombatPreset(uid: string, name: string): Promise<{ success: boolean; reason?: string }> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const trimmedName = name.trim().slice(0, 24);
  if (trimmedName.length === 0) return { success: false, reason: 'Give the preset a name.' };
  if (character.combatPresets.length >= MAX_COMBAT_PRESETS) {
    return { success: false, reason: `You can only save ${MAX_COMBAT_PRESETS} presets — delete one first.` };
  }

  // A character who's never opened Combat Setup can have an empty
  // equippedAbilityIds in storage while still fighting with
  // effectiveLoadout()'s recommended default (see progression.ts) — that
  // default, not the possibly-empty raw field, is what's actually "active"
  // from the player's point of view, so it's what a preset should capture.
  const activeAbilityIds = effectiveLoadout(
    character.class,
    character.spec,
    character.level,
    character.equippedAbilityIds,
    character.trainedAbilityIds
  );
  const activeConditions: Record<string, ConditionGroup> = {};
  for (const id of activeAbilityIds) {
    if (character.abilityConditions[id]) activeConditions[id] = character.abilityConditions[id];
  }
  const activeDisabled = character.disabledAbilityIds.filter((id) => activeAbilityIds.includes(id));

  const preset: CombatPreset = {
    id: generatePresetId(),
    name: trimmedName,
    equippedAbilityIds: activeAbilityIds,
    abilityConditions: activeConditions,
    disabledAbilityIds: activeDisabled,
  };

  await updateDoc(doc(db, 'characters', uid), {
    combatPresets: [...character.combatPresets, preset],
  });
  return { success: true };
}

export async function deleteCombatPreset(uid: string, presetId: string): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  await updateDoc(doc(db, 'characters', uid), {
    combatPresets: character.combatPresets.filter((p) => p.id !== presetId),
  });
}

// Makes a saved preset the active loadout. Routed through saveCombatSetup
// rather than writing equippedAbilityIds/abilityConditions directly — a
// preset saved at a lower level or a different spec might reference
// abilities the character can no longer (or couldn't yet) use, and
// saveCombatSetup already knows how to filter that down safely.
export async function activateCombatPreset(uid: string, presetId: string): Promise<{ success: boolean; reason?: string }> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  const preset = character.combatPresets.find((p) => p.id === presetId);
  if (!preset) return { success: false, reason: 'Preset not found.' };
  await saveCombatSetup(uid, preset.equippedAbilityIds, preset.abilityConditions, preset.disabledAbilityIds);
  return { success: true };
}

export async function pickTalent(uid: string, rowLevel: number, column: TalentColumn): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    [`talentPicks.${rowLevel}`]: column,
  });
}

export function getRespecCost(respecCount: number): number {
  return Math.min(5000, 100 * Math.pow(2, respecCount));
}

export async function respecTalents(uid: string): Promise<{ success: boolean; reason?: string }> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  const cost = getRespecCost(character.respecCount);
  if (character.gold < cost) {
    return { success: false, reason: `Not enough gold (need ${cost}).` };
  }
  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-cost),
    talentPicks: {},
    respecCount: increment(1),
  });
  return { success: true };
}

export async function setNotificationsEnabled(uid: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), { notificationsEnabled: enabled });
}

export async function setSkillXpNotificationsEnabled(uid: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), { skillXpNotificationsEnabled: enabled });
}

export async function setMasteryXpNotificationsEnabled(uid: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), { masteryXpNotificationsEnabled: enabled });
}

// Pays gold to add one ability to Character.trainedAbilityIds — the Class
// Trainer's "Spells & Abilities" page, the only path that ever writes this
// field for a post-training-system character. Requires the character to
// already be standing in the ability's training zone (gameData/
// abilityTraining.ts's abilityTrainingZoneId) — same "ownership-scoped,
// zone-checked server-side" posture as firebase/professions.ts's
// learnProfession/advanceProfessionRank.
export async function trainAbility(uid: string, abilityId: string): Promise<{ success: boolean; reason?: string }> {
  const ability = ABILITIES[abilityId];
  if (!ability || ability.isBasicAttack) return { success: false, reason: 'Unknown ability.' };

  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (ability.class !== character.class || (ability.spec && ability.spec !== character.spec)) {
    return { success: false, reason: 'Not available to your class/spec.' };
  }
  if (character.trainedAbilityIds.includes(abilityId)) return { success: false, reason: 'Already trained.' };
  if (character.level < ability.unlockLevel) {
    return { success: false, reason: `Requires character level ${ability.unlockLevel}.` };
  }

  const requiredZoneId = abilityTrainingZoneId(ability.unlockLevel);
  if (character.currentZoneId !== requiredZoneId) {
    return { success: false, reason: `Train this at ${ZONES[requiredZoneId]?.name ?? requiredZoneId}.` };
  }

  const cost = abilityTrainingCost(ability.unlockLevel);
  if (character.gold < cost) return { success: false, reason: `Requires ${cost} gold (have ${Math.floor(character.gold)}).` };

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-cost),
    trainedAbilityIds: arrayUnion(abilityId),
  });
  return { success: true };
}

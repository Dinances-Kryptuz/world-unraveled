import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { db } from './config';
import type { Character, CombatPreset } from '../types/character';
import type { ProfessionId, EquipmentSlot } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentColumn } from '../gameData/talents';
import { professionXpForLevel } from '../gameData/xpTables';
import { maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { maxHp } from '../gameData/combatFormulas';
import { canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { maxEquippedSlots, unlockedAbilities, effectiveLoadout, MAX_COMBAT_PRESETS } from '../combatEngine/progression';
import type { Condition, ConditionGroup, ConditionType, ResourceType } from '../combatEngine/types';
import { refillActiveQuests, applyQuestEvents, type QuestEvent } from '../gameData/questEngine';

export const BASE_BAG_SLOTS = 24;

export async function getCharacter(uid: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, 'characters', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    ...data,
    // A character with no professions key yet (pre-overhaul save) starts
    // knowing nothing — same "no choice made yet" convention as
    // equippedAbilityIds below, not a default grant.
    professions: data.professions ?? {},
    enchantments: data.enchantments ?? {},
    learnedRecipeIds: data.learnedRecipeIds ?? [],
    bagSlots: data.bagSlots ?? BASE_BAG_SLOTS,
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
    companions: data.companions ?? {},
    activeCompanionIds: data.activeCompanionIds ?? (data.activeCompanionId ? [data.activeCompanionId] : []),
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
function starterEquipment(cls: ClassId): Record<EquipmentSlot, string | null> {
  return {
    weapon: cls === 'priest' ? 'novice_focus' : 'novice_blade',
    chest: 'novice_tunic',
    helmet: null,
    gloves: null,
    legs: null,
    boots: 'novice_boots',
    ring: null,
    tool: null,
  };
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
    activeBuffs: {},
    currentActivity: { type: null, targetId: null, zoneId: null, startedAt: null },
    equippedAbilityIds: [],
    abilityConditions: {},
    disabledAbilityIds: [],
    combatPresets: [],
    itemCooldowns: {},
    quests: { active: initialActiveQuests, completedIds: [], dailyCompletedAt: {} },
    companions: {},
    activeCompanionIds: [],
  };

  await setDoc(doc(db, 'characters', uid), character);
  await setDoc(doc(db, 'characters', uid, 'inventory', 'main'), { items: {} });
}

export async function startActivity(
  uid: string,
  activity: { type: 'combat' | 'gathering' | 'crafting' | 'fishing'; targetId: string; zoneId: string }
): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    currentActivity: {
      type: activity.type,
      targetId: activity.targetId,
      zoneId: activity.zoneId,
      startedAt: serverTimestamp(),
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
  await updateDoc(doc(db, 'characters', uid), characterUpdate);

  if (result.loot.length > 0) {
    const inventoryUpdates: Record<string, unknown> = {};
    for (const drop of result.loot) {
      inventoryUpdates[`items.${drop.itemId}`] = increment(drop.quantity);
    }
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
  }
}

export async function setCharacterLevel(uid: string, level: number, restoredHp: number): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    level,
    currentHp: restoredHp,
    hpCheckpointAt: serverTimestamp(),
  });
}

export async function applyGatheringResult(
  uid: string,
  profession: ProfessionId,
  result: { xpGained: number; itemId: string; quantity: number }
): Promise<void> {
  // Written as a full { level, xp, unlockedTier } replace rather than an
  // increment() on the .xp sub-path, for the same read-modify-write safety
  // every other professions.<id> writer here uses.
  const character = await getCharacter(uid);
  if (!character) return;
  const current = character.professions[profession];
  if (!current) return; // profession not learned — a stale/malicious client call, not a real state

  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}`]: { ...current, xp: current.xp + result.xpGained },
  });

  if (result.quantity > 0) {
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
      [`items.${result.itemId}`]: increment(result.quantity),
    });
  }
}

// Applies a batch of quest-progress events (kills, gathers, crafts, ability
// uses, healing) to the character's active quests, persists the result, and
// pays out any rewards from newly-completed quests. Called from the same
// autosave paths that already report kills/gathers/crafts to Firestore —
// see CombatScreen/DungeonScreen/GatheringScreen/CraftingScreen. Takes the
// caller's already-loaded `character` rather than re-fetching, since every
// call site already has a fresh one in hand.
export async function advanceQuests(
  uid: string,
  character: Character,
  events: QuestEvent[]
): Promise<{ rewards: { xp: number; gold: number; items: { itemId: string; quantity: number }[] }; completedQuestNames: string[] }> {
  if (events.length === 0) return { rewards: { xp: 0, gold: 0, items: [] }, completedQuestNames: [] };
  const result = applyQuestEvents(character, events, new Date());

  const characterUpdate: Record<string, unknown> = { quests: result.quests };
  if (result.rewards.xp) characterUpdate.xp = increment(result.rewards.xp);
  if (result.rewards.gold) characterUpdate.gold = increment(result.rewards.gold);
  await updateDoc(doc(db, 'characters', uid), characterUpdate);

  if (result.rewards.items.length > 0) {
    const inventoryUpdates: Record<string, unknown> = {};
    for (const item of result.rewards.items) {
      inventoryUpdates[`items.${item.itemId}`] = increment(item.quantity);
    }
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
  }

  return { rewards: result.rewards, completedQuestNames: result.completedQuestNames };
}

// Manual "check for new quests" — lets a player pull in a just-expired
// daily or a chain successor without needing to complete some unrelated
// action first. Only ever adds to `active`; never touches completedIds or
// dailyCompletedAt, so it can't affect cooldowns or chain state.
export async function refreshQuestBoard(uid: string): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const active = refillActiveQuests(character, new Date());
  await updateDoc(doc(db, 'characters', uid), { 'quests.active': active });
}

export async function checkAndApplyProfessionLevelUp(uid: string, profession: ProfessionId): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const state = character.professions[profession];
  if (!state) return;
  // Skill can never climb past the ceiling of the CURRENTLY unlocked rank —
  // the whole point of "visit a trainer to unlock the next rank." A
  // character sitting exactly at that ceiling just banks xp with no visible
  // effect until they train up (see professionTiers.ts's checkRankUp).
  const cap = maxSkillForUnlockedTier(state.unlockedTier);
  let newLevel = state.level;
  while (newLevel < cap && state.xp >= professionXpForLevel(newLevel + 1)) {
    newLevel++;
  }
  if (newLevel !== state.level) {
    await updateDoc(doc(db, 'characters', uid), {
      [`professions.${profession}.level`]: newLevel,
    });
  }
}

export async function applyCraftingResult(
  uid: string,
  profession: ProfessionId,
  result: {
    xpGained: number;
    resultItemId: string;
    resultQuantity: number;
    materialsConsumed: { itemId: string; quantity: number }[];
  }
): Promise<void> {
  // See the matching comment in applyGatheringResult — same fix, same reason.
  const character = await getCharacter(uid);
  if (!character) return;
  const current = character.professions[profession];
  if (!current) return;

  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}`]: { ...current, xp: current.xp + result.xpGained },
  });

  const inventoryUpdates: Record<string, unknown> = {
    [`items.${result.resultItemId}`]: increment(result.resultQuantity),
  };
  for (const m of result.materialsConsumed) {
    inventoryUpdates[`items.${m.itemId}`] = increment(-m.quantity);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
}

export async function equipItem(uid: string, slot: EquipmentSlot, itemId: string): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;

  const item = ITEMS[itemId];
  if (!item || !canClassEquip(character.class, item)) {
    throw new Error(`${character.class} cannot equip ${item?.name ?? itemId} (${item?.armorType} armor)`);
  }

  const previouslyEquipped = character.equipment[slot];

  const inventoryUpdates: Record<string, unknown> = {
    [`items.${itemId}`]: increment(-1),
  };
  if (previouslyEquipped) {
    inventoryUpdates[`items.${previouslyEquipped}`] = increment(1);
  }
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);

  await updateDoc(doc(db, 'characters', uid), {
    [`equipment.${slot}`]: itemId,
  });
}

export async function unequipItem(uid: string, slot: EquipmentSlot): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const currentlyEquipped = character.equipment[slot];
  if (!currentlyEquipped) return;

  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${currentlyEquipped}`]: increment(1),
  });
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

  const unlockedIds = new Set(unlockedAbilities(character.class, character.spec, character.level).map((a) => a.id));
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
  const activeAbilityIds = effectiveLoadout(character.class, character.spec, character.level, character.equippedAbilityIds);
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

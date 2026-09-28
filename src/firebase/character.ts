import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { db } from './config';
import type { Character, CombatPreset } from '../types/character';
import type { ProfessionId, EquipmentSlot } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';
import type { TalentColumn } from '../gameData/talents';
import { professionXpForLevel } from '../gameData/xpTables';
import { maxHp } from '../gameData/combatFormulas';
import { canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import { maxEquippedSlots, unlockedAbilities, effectiveLoadout, MAX_COMBAT_PRESETS } from '../combatEngine/progression';
import type { Condition, ConditionGroup, ConditionType, ResourceType } from '../combatEngine/types';

const STARTING_GATHERING_PROFESSIONS: ProfessionId[] = ['skinning', 'mining', 'herbalism'];
const STARTING_PRODUCTION_PROFESSIONS: ProfessionId[] = ['leatherworking', 'smithing', 'tailoring'];
const ALL_V1_PROFESSIONS = [...STARTING_GATHERING_PROFESSIONS, ...STARTING_PRODUCTION_PROFESSIONS];

function defaultProfessions(): Record<ProfessionId, { level: number; xp: number; unlockedTier: 'apprentice' }> {
  return Object.fromEntries(
    ALL_V1_PROFESSIONS.map((id) => [id, { level: 1, xp: 0, unlockedTier: 'apprentice' as const }])
  ) as Record<ProfessionId, { level: number; xp: number; unlockedTier: 'apprentice' }>;
}

export async function getCharacter(uid: string): Promise<Character | null> {
  const snap = await getDoc(doc(db, 'characters', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    ...data,
    // Backfills professions added after this character was created (e.g.
    // Smithing) so existing characters don't crash on a missing key —
    // real saved progress always wins over the level-1 default.
    professions: { ...defaultProfessions(), ...data.professions },
    // Same backfill idea for equippedAbilityIds, added after some characters
    // already existed — an empty list is itself a valid "no choice made
    // yet" state, so this only matters for a genuinely missing field.
    equippedAbilityIds: data.equippedAbilityIds ?? [],
    // Same backfill idea again, for the Phase 3 conditions system.
    abilityConditions: data.abilityConditions ?? {},
    // Same backfill idea again, for the Phase 7 presets system.
    combatPresets: data.combatPresets ?? [],
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

export async function createCharacter(uid: string, name: string, characterClass: ClassId): Promise<void> {
  const professions = defaultProfessions();

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
    currentHp: maxHp(characterClass, 1),
    hpCheckpointAt: serverTimestamp(),
    respecCount: 0,
    equipment: {
      weapon: null,
      chest: null,
      helmet: null,
      gloves: null,
      legs: null,
      boots: null,
      ring: null,
    },
    professions,
    currentActivity: { type: null, targetId: null, zoneId: null, startedAt: null },
    equippedAbilityIds: [],
    abilityConditions: {},
    combatPresets: [],
  };

  await setDoc(doc(db, 'characters', uid), character);
  await setDoc(doc(db, 'characters', uid, 'inventory', 'main'), { items: {} });
}

export async function startActivity(
  uid: string,
  activity: { type: 'combat' | 'gathering' | 'crafting'; targetId: string; zoneId: string }
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
    loot: { itemId: string; quantity: number }[];
    hpAfter?: number;
  }
): Promise<void> {
  const characterUpdate: Record<string, unknown> = {
    xp: increment(result.xpGained),
    gold: increment(result.goldGained),
    'currentActivity.startedAt': serverTimestamp(),
  };
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
  // increment() on the .xp sub-path — a profession added after a character
  // was created (Smithing, Tailoring) may have no professions.<id> key at
  // all yet in Firestore, and increment() on a missing sub-path creates
  // only that one field, leaving level/unlockedTier missing and failing
  // firestore.rules' isValidProfessionState on every write from then on.
  // getCharacter() always returns a complete default shape for a profession
  // that isn't in the document yet, so reading through it first guarantees
  // this write is always a valid, complete profession state.
  const character = await getCharacter(uid);
  if (!character) return;
  const current = character.professions[profession];

  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}`]: { ...current, xp: current.xp + result.xpGained },
  });

  if (result.quantity > 0) {
    await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
      [`items.${result.itemId}`]: increment(result.quantity),
    });
  }
}

export async function checkAndApplyProfessionLevelUp(uid: string, profession: ProfessionId): Promise<void> {
  const character = await getCharacter(uid);
  if (!character) return;
  const state = character.professions[profession];
  let newLevel = state.level;
  while (state.xp >= professionXpForLevel(newLevel + 1)) {
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
  abilityConditionsInput: Record<string, unknown>
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

  await updateDoc(doc(db, 'characters', uid), { equippedAbilityIds: validatedIds, abilityConditions });
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

  const preset: CombatPreset = {
    id: generatePresetId(),
    name: trimmedName,
    equippedAbilityIds: activeAbilityIds,
    abilityConditions: activeConditions,
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
  await saveCombatSetup(uid, preset.equippedAbilityIds, preset.abilityConditions);
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

import { doc, updateDoc, increment, deleteField } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory } from './inventory';
import { ITEMS } from '../gameData/items';
import { RECIPES } from '../gameData/recipes';
import { checkLearnProfession, checkRankUp, nextTier, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import type { ProfessionId, ProfessionTierName } from '../gameData/types';
import type { Character } from '../types/character';

export interface ProfessionActionResult {
  success: boolean;
  reason?: string;
}

// Visiting an Apprentice trainer for the very first time in a profession —
// see checkLearnProfession for the primary-slot-cap/level/gold gating this
// re-validates server side (never trust the client's "can I afford this"
// check alone, same posture as respecTalents/activateCombatPreset).
export async function learnProfession(uid: string, profession: ProfessionId): Promise<ProfessionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const known = Object.keys(character.professions) as ProfessionId[];
  const check = checkLearnProfession(profession, known, character.level, character.gold);
  if (!check.ok) return { success: false, reason: check.reason };

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-check.goldCost),
    [`professions.${profession}`]: { level: 1, xp: 0, unlockedTier: 'apprentice' },
  });
  return { success: true };
}

// Abandoning a profession resets it completely (classic WoW's own
// behavior) — the freed slot can only matter for a PRIMARY profession, but
// works uniformly for secondaries too (a player who wants to drop Cooking
// for a different secondary can). No gold refund for skill already banked;
// no gold cost either, matching the real game.
export async function abandonProfession(uid: string, profession: ProfessionId): Promise<ProfessionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  if (!character.professions[profession]) return { success: false, reason: 'Not known.' };

  await updateDoc(doc(db, 'characters', uid), {
    [`professions.${profession}`]: deleteField(),
  });
  return { success: true };
}

// Training the next rank up (Journeyman/Expert/Artisan) at a trainer —
// requires being at the current rank's skill ceiling, the character-level
// gate for the category, and enough gold (see professionTiers.ts's
// checkRankUp, which this just re-validates and then applies).
export async function advanceProfessionRank(uid: string, profession: ProfessionId): Promise<ProfessionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };
  const state = character.professions[profession];
  if (!state) return { success: false, reason: 'Profession not known.' };

  const check = checkRankUp(profession, state.level, state.unlockedTier, character.level, character.gold);
  if (!check.ok) return { success: false, reason: check.reason };
  const next = nextTier(state.unlockedTier)!;

  await updateDoc(doc(db, 'characters', uid), {
    gold: increment(-check.goldCost),
    [`professions.${profession}.unlockedTier`]: next.tier,
  });
  return { success: true };
}

// A recipe with learnedAutomatically === false (taught by a 'recipe' item —
// a quest reward, a rare drop, a vendor-sold formula) also needs its id in
// Character.learnedRecipeIds before it can be crafted — see canUseRecipe
// below, used by ZoneScreen to decide what's actually craftable.
export async function learnRecipe(uid: string, recipeItemId: string): Promise<ProfessionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const item = ITEMS[recipeItemId];
  if (!item || item.type !== 'recipe' || !item.teachesRecipeId) {
    return { success: false, reason: 'That isn’t a recipe.' };
  }
  const recipe = RECIPES[item.teachesRecipeId];
  if (!recipe) return { success: false, reason: 'Unknown recipe.' };
  if (character.learnedRecipeIds.includes(item.teachesRecipeId)) {
    return { success: false, reason: 'Already known.' };
  }
  if (!character.professions[recipe.profession]) {
    return { success: false, reason: `Requires knowing ${recipe.profession}.` };
  }

  const inventory = await getInventory(uid);
  if ((inventory.items[recipeItemId] ?? 0) <= 0) {
    return { success: false, reason: 'You don’t have this recipe.' };
  }

  await updateDoc(doc(db, 'characters', uid), {
    learnedRecipeIds: [...character.learnedRecipeIds, item.teachesRecipeId],
  });
  await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), {
    [`items.${recipeItemId}`]: increment(-1),
  });
  return { success: true };
}

// Every profession now resolves catches/gathers/crafts directly into whole
// skill points (not XP) — see activityEngine.ts's resolveFishing/
// resolveGathering/resolveCrafting and PROFESSION_SKILLUP_CHANCE_BY_TIER —
// so this applies the skill gain and the rank-ceiling cap in one step, same
// as firebase/character.ts's applyGatheringResult/applyCraftingResult.
//
// Takes the current level/unlockedTier from the caller rather than reading
// the character itself — FishingScreen's autosave already has both (it just
// read them to compute this very result), so re-reading here would be a
// second Firestore read of the exact same document on every single autosave
// cycle purely to re-derive numbers the caller already has in hand. Safe
// because this is the only code path that ever writes professions.fishing's
// level, and only one activity screen is ever live at a time — the one
// realistic staleness window is two tabs open on the same account
// simultaneously, which nothing else in this app guards against either.
export async function applyFishingResult(
  uid: string,
  result: {
    skillupsGained: number;
    catches: { itemId: string; quantity: number }[];
    currentLevel: number;
    unlockedTier: ProfessionTierName;
  }
): Promise<void> {
  const cap = maxSkillForUnlockedTier(result.unlockedTier);
  const newLevel = Math.min(cap, result.currentLevel + result.skillupsGained);
  if (newLevel !== result.currentLevel) {
    await updateDoc(doc(db, 'characters', uid), { 'professions.fishing.level': newLevel });
  }

  if (result.catches.length > 0) {
    const inventoryUpdates: Record<string, unknown> = {};
    for (const c of result.catches) {
      if (c.quantity > 0) inventoryUpdates[`items.${c.itemId}`] = increment(c.quantity);
    }
    if (Object.keys(inventoryUpdates).length > 0) {
      await updateDoc(doc(db, 'characters', uid, 'inventory', 'main'), inventoryUpdates);
    }
  }
}

// Whether `recipe` can actually be crafted right now — meeting
// requiredSkill/requiredCharacterLevel is enough for an auto-learned
// recipe; a recipe taught by an item also needs its id in
// learnedRecipeIds. Shared by ZoneScreen (what to list) and anywhere else
// that needs the same check.
export function canUseRecipe(character: Character, recipe: { id: string; learnedAutomatically: boolean }): boolean {
  return recipe.learnedAutomatically || character.learnedRecipeIds.includes(recipe.id);
}

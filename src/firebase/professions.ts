import { doc, updateDoc, increment, deleteField, arrayUnion } from 'firebase/firestore';
import { db } from './config';
import { getCharacter } from './character';
import { getInventory, grantInventoryItems } from './inventory';
import { ITEMS } from '../gameData/items';
import { RECIPES } from '../gameData/recipes';
import { checkLearnProfession, checkRankUp, nextTier } from '../gameData/professionTiers';
import { TRAINER_ZONE_BY_RANK } from '../gameData/professionTrainers';
import { ZONES, CONTENT_ZONE_IDS, isZoneUnlocked } from '../gameData/zones';
import { FISHING_ZONE_MASTERY_THRESHOLD } from '../gameData/gatheringEngine';
import type { ProfessionId } from '../gameData/types';
import type { Character, ZoneMasteryState } from '../types/character';

export interface ProfessionActionResult {
  success: boolean;
  reason?: string;
}

// Visiting an Apprentice trainer for the very first time in a profession —
// see checkLearnProfession for the primary-slot-cap/level/gold gating this
// re-validates server side (never trust the client's "can I afford this"
// check alone, same posture as respecTalents/activateCombatPreset). The
// zone check only requires the trainer's zone to be UNLOCKED, not that the
// character is currently standing in it — professions are now trained from
// the Artisan Quarter in Ashenfall (CapitalScreen), reachable regardless of
// currentZoneId, so a physical-presence check would make every rank
// untrainable from there.
export async function learnProfession(uid: string, profession: ProfessionId): Promise<ProfessionActionResult> {
  const character = await getCharacter(uid);
  if (!character) return { success: false, reason: 'Character not found.' };

  const known = Object.keys(character.professions) as ProfessionId[];
  const check = checkLearnProfession(profession, known, character.level, character.gold);
  if (!check.ok) return { success: false, reason: check.reason };

  const requiredZoneId = TRAINER_ZONE_BY_RANK.apprentice;
  if (!isZoneUnlocked(ZONES[requiredZoneId], character.level)) {
    return { success: false, reason: `Requires ${ZONES[requiredZoneId]?.name ?? requiredZoneId} to be unlocked.` };
  }

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
  const next = nextTier(profession, state.unlockedTier)!;

  const requiredZoneId = TRAINER_ZONE_BY_RANK[next.tier];
  if (!isZoneUnlocked(ZONES[requiredZoneId], character.level)) {
    return { success: false, reason: `Requires ${ZONES[requiredZoneId]?.name ?? requiredZoneId} to be unlocked.` };
  }

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

// Fishing runs on the same 1-100 XP+Mastery engine as Mining/Herbalism/
// Skinning (gameData/gatheringEngine.ts) — see firebase/character.ts's
// applyGatheringProfessionResult for the shared design notes. Kept as its
// own function (rather than folded into that one) since Fishing's holes are
// keyed by fishing-hole id, not a shared "nodeId" concept, and its writer
// has always lived here alongside the rest of the profession actions.
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
//
// Fishing overhaul: every FishingHole now resolves through the shared
// zone-Mastery axis (fishingZoneMastery) instead of the old per-hole 0-50
// Mastery bucket — holeId's old `professions.fishing.mastery.${holeId}`
// entry is frozen (never written again), exactly like materialMastery
// freezes a recipe's old per-recipe axis. `character` is a fresh snapshot
// the caller already fetched (FishingScreen's autosave), reused here only
// to read fishingZoneMastery/unlockedAchievementIds for the eager Master
// Angler unlock check, mirroring applyGatheringProfessionResult's
// herbalismZoneMastery branch exactly — including the rare pearl grant,
// which (like Mining/Herbalism's rareBonus) is rolled independently of and
// in addition to the guaranteed fish, at a fixed chance Mastery never
// touches (see gatheringEngine.ts's resolveGatheringOffline).
export async function applyFishingResult(
  uid: string,
  character: Character,
  result: {
    itemId: string;
    quantity: number;
    rareBonusItemId?: string;
    rareBonusQuantity: number;
    newSkillLevel: number;
    newSkillXp: number;
    fishingZoneMastery: { zoneId: string; xpGained: number };
  }
): Promise<void> {
  const characterUpdate: Record<string, unknown> = {
    'professions.fishing.level': result.newSkillLevel,
    'professions.fishing.xp': result.newSkillXp,
  };

  const { zoneId, xpGained } = result.fishingZoneMastery;
  if (xpGained > 0) {
    characterUpdate[`fishingZoneMastery.${zoneId}.xp`] = increment(xpGained);

    const hypotheticalZoneMastery: ZoneMasteryState = {
      ...character.fishingZoneMastery,
      [zoneId]: { xp: (character.fishingZoneMastery?.[zoneId]?.xp ?? 0) + xpGained },
    };
    const newlyUnlockedIds: string[] = [];
    const anglerId = `angler_${zoneId}`;
    if (!character.unlockedAchievementIds.includes(anglerId) && (hypotheticalZoneMastery[zoneId]?.xp ?? 0) >= FISHING_ZONE_MASTERY_THRESHOLD) {
      newlyUnlockedIds.push(anglerId);
    }
    if (
      // CONTENT_ZONE_IDS, not every zone in ZONES — Ashenfall has no
      // fishing holes of its own, so it can never reach this threshold;
      // see that constant's doc comment in gameData/zones.ts.
      !character.unlockedAchievementIds.includes('grandmaster_angler') &&
      CONTENT_ZONE_IDS.every((z) => (hypotheticalZoneMastery[z]?.xp ?? 0) >= FISHING_ZONE_MASTERY_THRESHOLD)
    ) {
      newlyUnlockedIds.push('grandmaster_angler');
    }
    if (newlyUnlockedIds.length > 0) {
      characterUpdate.unlockedAchievementIds = arrayUnion(...newlyUnlockedIds);
      characterUpdate.unlockedTitleIds = arrayUnion(...newlyUnlockedIds);
    }
  }

  await updateDoc(doc(db, 'characters', uid), characterUpdate);

  const grants: { itemId: string; quantity: number }[] = [];
  if (result.quantity > 0) grants.push({ itemId: result.itemId, quantity: result.quantity });
  if (result.rareBonusItemId && result.rareBonusQuantity > 0) {
    grants.push({ itemId: result.rareBonusItemId, quantity: result.rareBonusQuantity });
  }
  if (grants.length > 0) {
    await grantInventoryItems(uid, grants);
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

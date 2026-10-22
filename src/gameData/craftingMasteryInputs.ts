// Bridges Character state + a Recipe into resolveCraftingOffline's 4
// mutually-exclusive mastery-input shapes (material/alchemy-zone/
// enchanting-zone/cooking-zone), and back into applyCraftingProfessionResult's
// options object once a result comes back — the exact "which axis does this
// recipe feed" branching CraftingScreen.tsx's autosave() originally computed
// inline. Pulled out here so WelcomeBackScreen's offline-claim path can
// persist a finished crafting window using IDENTICAL mastery-axis logic
// instead of re-deriving (and risking drifting from) a second copy of it —
// same "glue layer between Character and a pure engine" role
// resolveCombatProfile.ts already plays for combat.
import type { Character } from '../types/character';
import type { Recipe } from './types';
import { getMaterial, type MaterialDef } from './materials';
import { herbZoneOf } from './herbs';
import type {
  MaterialMasteryInput,
  AlchemyZoneMasteryInput,
  EnchantingZoneMasteryInput,
  CookingZoneMasteryInput,
  CraftingOfflineResult,
} from './craftingEngine';

export interface CraftingMasteryInputs {
  material?: MaterialDef;
  materialMasteryInput?: MaterialMasteryInput;
  alchemyZoneMasteryInput?: AlchemyZoneMasteryInput;
  enchantingZoneMasteryInput?: EnchantingZoneMasteryInput;
  cookingZoneMasteryInput?: CookingZoneMasteryInput;
  // True when this recipe feeds ANY of the 4 axes above (mutually
  // exclusive by construction — a recipe is only ever tagged with one of
  // materialId/alchemyZoneId/enchantingZoneId/cookingZoneId) — callers use
  // this to decide whether to pass 0/0 instead of the shared per-recipe
  // Mastery bucket into resolveCraftingOffline (see CraftingScreen.tsx's
  // own comment on why those are mutually exclusive with the 4 axes).
  anyZoneOrMaterialMastery: boolean;
}

export function buildCraftingMasteryInputs(character: Character, recipe: Recipe): CraftingMasteryInputs {
  const material = recipe.materialId ? getMaterial(recipe.materialId) : undefined;
  const materialMasteryInput: MaterialMasteryInput | undefined = material
    ? {
        materialId: material.id,
        startingXp: character.materialMastery?.[material.id]?.xp ?? 0,
        barsPerCraft: recipe.materials.find((m) => m.itemId === material.barItemId)?.quantity ?? 0,
      }
    : undefined;
  const alchemyZoneMasteryInput: AlchemyZoneMasteryInput | undefined = recipe.alchemyZoneId
    ? {
        startingXp: character.alchemyZoneMastery?.[recipe.alchemyZoneId]?.xp ?? 0,
        unitsInOwnZonePerCraft: recipe.materials
          .filter((m) => herbZoneOf(m.itemId) === recipe.alchemyZoneId)
          .reduce((sum, m) => sum + m.quantity, 0),
      }
    : undefined;
  const enchantingZoneMasteryInput: EnchantingZoneMasteryInput | undefined = recipe.enchantingZoneId
    ? { startingXp: character.enchantingZoneMastery?.[recipe.enchantingZoneId]?.xp ?? 0 }
    : undefined;
  const cookingZoneMasteryInput: CookingZoneMasteryInput | undefined = recipe.cookingZoneId
    ? { startingXp: character.cookingZoneMastery?.[recipe.cookingZoneId]?.xp ?? 0, cookingTier: recipe.cookingTier ?? 1 }
    : undefined;
  const anyZoneOrMaterialMastery = !!(
    materialMasteryInput ||
    alchemyZoneMasteryInput ||
    enchantingZoneMasteryInput ||
    cookingZoneMasteryInput
  );
  return { material, materialMasteryInput, alchemyZoneMasteryInput, enchantingZoneMasteryInput, cookingZoneMasteryInput, anyZoneOrMaterialMastery };
}

// Builds applyCraftingProfessionResult's options object from a resolved
// CraftingOfflineResult — the inverse of buildCraftingMasteryInputs' axis
// selection, so a caller never has to hand-match which of the 4 optional
// result fields goes with which axis.
export function buildCraftingProfessionResultOptions(
  recipe: Recipe,
  result: CraftingOfflineResult,
  inputs: CraftingMasteryInputs,
  wholeCrafted: number,
  earnsProfessionXp: boolean
) {
  return {
    resultItemId: recipe.resultItemId,
    resultQuantity: recipe.resultQuantity * wholeCrafted,
    materialsConsumed: result.materialsConsumed,
    goldSpent: result.goldSpent,
    newSkillLevel: result.finalSkill,
    newSkillXp: result.finalSkillXp,
    newMasteryLevel: result.finalMasteryLevel,
    newMasteryXp: result.finalMasteryXp,
    earnsProfessionXp,
    ...(inputs.material
      ? {
          materialMastery: {
            materialId: inputs.material.id,
            newMaterialMasteryXp: result.finalMaterialMasteryXp ?? 0,
            batches: result.materialMasteryBatches ?? [],
          },
        }
      : {}),
    ...(recipe.alchemyZoneId ? { alchemyZoneMastery: { batches: result.alchemyZoneMasteryBatches ?? [] } } : {}),
    ...(recipe.enchantingZoneId
      ? {
          enchantingZoneMastery: {
            zoneId: recipe.enchantingZoneId,
            newEnchantingZoneMasteryXp: result.finalEnchantingZoneMasteryXp ?? 0,
          },
        }
      : {}),
    ...(recipe.cookingZoneId
      ? {
          cookingZoneMastery: {
            zoneId: recipe.cookingZoneId,
            newCookingZoneMasteryXp: result.finalCookingZoneMasteryXp ?? 0,
            batches: result.cookingZoneMasteryBatches,
          },
        }
      : {}),
  };
}

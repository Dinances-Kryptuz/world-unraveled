import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCraftingProfessionResult, getCharacter, stopActivity, advanceQuests } from '../firebase/character';
import { getInventory } from '../firebase/inventory';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import {
  resolveCraftingOffline,
  craftingColorTier,
  craftingMasterySpeedMultiplier,
  craftingMasteryBonusChance,
  craftingXpForNextLevel,
  recipeMasteryXpForNextLevel,
  RECIPE_MASTERY_MAX_LEVEL,
  CRAFTING_COLOR_XP_PCT,
  type CraftingRecipeLike,
  type CraftingOfflineResult,
  type MaterialMasteryInput,
  type AlchemyZoneMasteryInput,
  type EnchantingZoneMasteryInput,
  type CookingZoneMasteryInput,
  type CraftingShirtBonuses,
} from '../gameData/craftingEngine';
import { getProfessionState, maxSkillForUnlockedTier, PROFESSION_CATEGORY, PROFESSION_LABELS } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { getMaterial } from '../gameData/materials';
import { buildCraftingMasteryInputs, buildCraftingProfessionResultOptions } from '../gameData/craftingMasteryInputs';
import { materialMasteryPercent, materialMasterySpeedMultiplier, materialMasteryBonusChance } from '../gameData/equipmentRolls';
import { herbZoneOf } from '../gameData/herbs';
import { alchemyZoneMasteryPercent, alchemyMasteryMilestone } from '../gameData/alchemyMastery';
import { enchantingZoneMasteryPercent, enchantingMasteryMilestone } from '../gameData/enchantingMastery';
import { cookingZoneMasteryPercent, cookingMasteryMilestone } from '../gameData/cookingMastery';
import { ZONES } from '../gameData/zones';
import { shirtBonusForItemId, shirtBonusPct } from '../gameData/shirts';
import { ItemSlot } from './ItemSlot';
import { TickBar } from './TickBar';
import { notify } from '../utils/notifications';
import { useGuildMilestoneBonuses } from '../hooks/useGuildMilestones';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { Recipe } from '../gameData/types';

// Shared by all 6 crafting professions (Blacksmithing/Tailoring/
// Leatherworking/Alchemy/Enchanting-free-recipes/Cooking) — all now run on
// craftingEngine.ts's 1-100 XP+Mastery system, so this one screen replaces
// what used to be two (the discrete skill-up CraftingScreen and Smithing's
// own Mastery-pilot MasteryCraftingScreen). Always uses the OFFLINE/batched
// resolver, even for a single ~20s autosave chunk — same convention as every
// other activity screen in this game.
//
// Mining's Smelting recipes are the one case of a "crafting" recipe tagged
// to a gathering-category profession (PROFESSION_CATEGORY !== 'production')
// — Mining's level/XP/Mastery is owned entirely by gatheringEngine.ts (only
// gathering ore earns it), so Smelting still runs through this screen's
// materials/gold/time batching but never writes a profession-XP/Mastery
// update of its own; it's purely a level-gated material conversion.
export function CraftingScreen({ recipe }: { recipe: Recipe }) {
  const { user } = useAuth();
  // ZoneScreen never renders CraftingScreen until it has confirmed a loaded
  // character, so this is always non-null in practice — but useCharacter()'s
  // type is nullable (it also serves the loading/logged-out states), and
  // this component's hooks (below) can't have an early return before them.
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedCrafted, setBankedCrafted] = useState(0);
  const [outOfMaterials, setOutOfMaterials] = useState(false);
  // Updated only from TickBar's onIteration below (the bar's own compositor
  // clock), never from the 1s setInterval poll — see TickBar.tsx's doc
  // comment for why mixing an independent JS timer into this would drift.
  const [livePreview, setLivePreview] = useState<CraftingOfflineResult | null>(null);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  // How many whole items (relative to the current anchor) have already had
  // their "crafted" notification fire — compared against the live preview's
  // floor(itemsCrafted) on every TickBar loop so the toast appears in the
  // same instant the bar visually completes, instead of waiting for the
  // ~20s autosave to batch however many finished in the meantime. Reset
  // whenever the anchor itself resets (a new recipe, or a successful
  // autosave moving it to `now`) since the count then starts over from 0.
  const notifiedWholeRef = useRef(0);
  const materialsRef = useRef<Record<string, number>>({});
  const goldRef = useRef(character.gold);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  // Guild Milestones (level 15/25) — read through a ref for the same
  // reason characterRef exists: autosave() runs from a setInterval
  // callback whose effect only depends on [recipe.id], so closing over the
  // hook's value directly would freeze it at mount time.
  const guildBonuses = useGuildMilestoneBonuses();
  const guildBonusesRef = useRef(guildBonuses);
  useEffect(() => {
    guildBonusesRef.current = guildBonuses;
  }, [guildBonuses]);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const earnsProfessionXp = PROFESSION_CATEGORY[recipe.profession] === 'production';
  const label = recipe.profession === 'mining' ? 'Smelting' : PROFESSION_LABELS[recipe.profession];

  useEffect(() => {
    setBankedCrafted(0);
    setOutOfMaterials(false);
    setLivePreview(null);
    anchorRef.current = character.currentActivity.startedAt;
    notifiedWholeRef.current = 0;
    goldRef.current = character.gold;
    if (user) {
      getInventory(user.uid).then((inv) => {
        materialsRef.current = { ...inv.items };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      secondsSinceSaveRef.current += 1;
      if (secondsSinceSaveRef.current >= AUTOSAVE_INTERVAL_SECONDS) {
        secondsSinceSaveRef.current = 0;
        void autosave();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  // Built from CurrentActivity.equippedShirtItemId — the snapshot taken
  // when this activity started, never the character's live equipped
  // shirt — see GatheringScreen's matching gatheringShirtBonuses helper
  // and types/character.ts's doc comment on that field.
  function craftingShirtBonuses(shirtItemId: string | null | undefined): CraftingShirtBonuses {
    const shirtBonus = shirtBonusForItemId(shirtItemId);
    return {
      // Guild Milestone (level 15) stacks onto the same channel Shirt of
      // the Artisan already uses.
      craftingSpeedPct: shirtBonusPct(shirtBonus, 'crafting_speed') + guildBonusesRef.current.craftingTimePct,
      professionXpPct: shirtBonusPct(shirtBonus, 'profession_xp'),
      // Guild Milestone (level 25) stacks onto the same channel Shirt of
      // Mastery already uses — see gameData/guildMilestones.ts.
      masteryXpPct: shirtBonusPct(shirtBonus, 'mastery_xp') + guildBonusesRef.current.craftingMasteryPct,
      // Guild Headquarters' Workshop room stacks onto this same channel —
      // see gameData/guildMilestones.ts's comment on materialPreservePct.
      materialPreservePct: shirtBonusPct(shirtBonus, 'material_preserve') + guildBonusesRef.current.materialPreservePct,
    };
  }

  function recipeLike(): CraftingRecipeLike {
    return {
      resultItemId: recipe.resultItemId,
      resultQuantity: recipe.resultQuantity,
      baseXp: recipe.xpAward,
      craftSeconds: recipe.craftSeconds,
      requiredSkill: recipe.requiredSkill,
      materials: recipe.materials,
      goldCost: recipe.goldCost,
    };
  }

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const prof = getProfessionState(currentCharacter.professions, recipe.profession);
    const masteryState = prof.mastery?.[recipe.id] ?? { level: 0, xp: 0 };
    const cap = maxSkillForUnlockedTier(recipe.profession, prof.unlockedTier);

    const {
      material,
      materialMasteryInput,
      alchemyZoneMasteryInput,
      enchantingZoneMasteryInput,
      cookingZoneMasteryInput,
      anyZoneOrMaterialMastery,
    } = buildCraftingMasteryInputs(currentCharacter, recipe);

    const result = resolveCraftingOffline(
      anchor,
      now,
      recipeLike(),
      prof.level,
      prof.xp,
      anyZoneOrMaterialMastery ? 0 : masteryState.level,
      anyZoneOrMaterialMastery ? 0 : masteryState.xp,
      cap,
      materialsRef.current,
      goldRef.current,
      materialMasteryInput,
      alchemyZoneMasteryInput,
      craftingShirtBonuses(currentCharacter.currentActivity.equippedShirtItemId),
      enchantingZoneMasteryInput,
      cookingZoneMasteryInput
    );

    if (result.itemsCrafted === 0) {
      if (result.stoppedForMaterials) setOutOfMaterials(true);
      return;
    }

    const previousAnchor = anchor;
    const previousMaterials = { ...materialsRef.current };
    const previousGold = goldRef.current;

    anchorRef.current = now;
    for (const consumed of result.materialsConsumed) {
      materialsRef.current[consumed.itemId] = (materialsRef.current[consumed.itemId] ?? 0) - consumed.quantity;
    }
    goldRef.current -= result.goldSpent;
    const wholeCrafted = Math.floor(result.itemsCrafted);
    setBankedCrafted((prev) => prev + wholeCrafted);
    // The anchor just moved to `now` — any prior preview was relative to the
    // OLD anchor and is stale the instant this commits; clear it so display
    // falls back to the just-updated bankedCrafted/materialsRef until the
    // next TickBar loop completion computes a fresh one from the new anchor.
    setLivePreview(null);

    // The normal case: every whole item in this window already got its own
    // "crafted" toast the instant its TickBar loop completed (see
    // handleTickIteration below), so there's nothing left to report here.
    // This only fires for whatever a tick DIDN'T already cover — e.g. the
    // tab was backgrounded and animationiteration stopped firing, or the
    // last item of the window finished in the gap between the final tick
    // and this autosave running.
    const notYetNotified = wholeCrafted - notifiedWholeRef.current;
    if (currentCharacter.notificationsEnabled && notYetNotified > 0) {
      const resultQty = recipe.resultQuantity * notYetNotified;
      notify(`${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId} crafted`, [
        `${resultQty}x ${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId}`,
      ]);
    }
    // Relative to the OLD anchor (still what `anchorRef.current` rolls back
    // to if the write below fails), every whole item up through wholeCrafted
    // is now accounted for — only reset to 0 (a fresh window) once the write
    // actually succeeds and the anchor durably moves to `now`, in the try
    // block below; a failed write must leave this matching the restored
    // anchor so a retry can't re-fire the same toast.
    notifiedWholeRef.current = wholeCrafted;
    // Floored before display/gating — see FishingScreen's matching comment:
    // the batch-resolver's fractional partial-action math can leave float
    // noise (e.g. a near-zero leftover like 0.0000001) on these deltas that
    // shouldn't be shown, or gated on, as-is.
    const craftXpGained = Math.floor(result.professionXpGained);
    if (currentCharacter.skillXpNotificationsEnabled && earnsProfessionXp && craftXpGained > 0) {
      notify(`${label} XP gained`, [`+${craftXpGained} XP`]);
    }
    if (currentCharacter.masteryXpNotificationsEnabled && earnsProfessionXp) {
      const masteryXpGained = Math.floor(
        materialMasteryInput
          ? result.materialMasteryXpGained ?? 0
          : alchemyZoneMasteryInput
            ? result.alchemyZoneMasteryXpGained ?? 0
            : enchantingZoneMasteryInput
              ? result.enchantingZoneMasteryXpGained ?? 0
              : cookingZoneMasteryInput
                ? result.cookingZoneMasteryXpGained ?? 0
                : result.masteryXpGained
      );
      if (masteryXpGained > 0) {
        const masteryLabel =
          material?.name ??
          (recipe.alchemyZoneId ? ZONES[recipe.alchemyZoneId]?.name : undefined) ??
          (recipe.enchantingZoneId ? ZONES[recipe.enchantingZoneId]?.name : undefined) ??
          (recipe.cookingZoneId ? ZONES[recipe.cookingZoneId]?.name : undefined) ??
          ITEMS[recipe.resultItemId]?.name ??
          recipe.resultItemId;
        notify('Mastery XP gained', [`+${masteryXpGained} ${masteryLabel} Mastery XP`]);
      }
    }

    // A rough speculative estimate, superseded moments later by the
    // authoritative reconciliation below once the write succeeds.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: earnsProfessionXp
        ? {
            ...c.professions,
            [recipe.profession]: {
              ...getProfessionState(c.professions, recipe.profession),
              level: result.finalSkill,
              xp: result.finalSkillXp,
              ...(anyZoneOrMaterialMastery
                ? {}
                : {
                    mastery: {
                      ...getProfessionState(c.professions, recipe.profession).mastery,
                      [recipe.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
                    },
                  }),
            },
          }
        : c.professions,
      ...(material && earnsProfessionXp
        ? { materialMastery: { ...c.materialMastery, [material.id]: { xp: result.finalMaterialMasteryXp ?? 0 } } }
        : {}),
      ...(recipe.alchemyZoneId && earnsProfessionXp
        ? { alchemyZoneMastery: { ...c.alchemyZoneMastery, [recipe.alchemyZoneId]: { xp: result.finalAlchemyZoneMasteryXp ?? 0 } } }
        : {}),
      ...(recipe.enchantingZoneId && earnsProfessionXp
        ? {
            enchantingZoneMastery: {
              ...c.enchantingZoneMastery,
              [recipe.enchantingZoneId]: { xp: result.finalEnchantingZoneMasteryXp ?? 0 },
            },
          }
        : {}),
      ...(recipe.cookingZoneId && earnsProfessionXp
        ? {
            cookingZoneMastery: {
              ...c.cookingZoneMastery,
              [recipe.cookingZoneId]: { xp: result.finalCookingZoneMasteryXp ?? 0 },
            },
          }
        : {}),
      gold: c.gold - result.goldSpent,
    }));

    try {
      // One read per cycle, done up front — see GatheringScreen's matching
      // comment for why this replaces three separate reads of the same
      // document with exactly one.
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyCraftingProfessionResult(
        currentUser.uid,
        recipe.profession,
        recipe.id,
        fresh,
        buildCraftingProfessionResultOptions(
          recipe,
          result,
          { material, materialMasteryInput, alchemyZoneMasteryInput, enchantingZoneMasteryInput, cookingZoneMasteryInput, anyZoneOrMaterialMastery },
          wholeCrafted,
          earnsProfessionXp
        )
      );

      await advanceQuests(currentUser.uid, fresh, [{ type: 'craft', itemId: recipe.resultItemId, count: wholeCrafted }]);

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: earnsProfessionXp
          ? {
              ...fresh.professions,
              [recipe.profession]: {
                ...getProfessionState(fresh.professions, recipe.profession),
                level: result.finalSkill,
                xp: result.finalSkillXp,
                ...(anyZoneOrMaterialMastery
                  ? {}
                  : {
                      mastery: {
                        ...getProfessionState(fresh.professions, recipe.profession).mastery,
                        [recipe.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
                      },
                    }),
              },
            }
          : fresh.professions,
        ...(material && earnsProfessionXp
          ? { materialMastery: { ...fresh.materialMastery, [material.id]: { xp: result.finalMaterialMasteryXp ?? 0 } } }
          : {}),
        // alchemyZoneMastery is intentionally left to the next natural
        // character refetch here — it may touch more than one zone (a
        // cross-zone recipe) and the authoritative per-zone split is
        // computed server-side by applyCraftingProfessionResult from the
        // real materialsConsumed, not worth re-deriving client-side twice.
        gold: fresh.gold - result.goldSpent,
        // Crafting never touches currentActivity.startedAt server-side, so
        // without refreshing it locally too it sits stale from whenever the
        // activity started, risking an isLongAbsence flicker.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
      // The anchor durably moved to `now` — the next window's whole-item
      // count (and the next tick's notification check) starts fresh from 0.
      notifiedWholeRef.current = 0;
    } catch (err) {
      console.error('Crafting autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      materialsRef.current = previousMaterials;
      goldRef.current = previousGold;
      setBankedCrafted((prev) => prev - wholeCrafted);
      setLivePreview(null);
      // notifiedWholeRef is deliberately left at wholeCrafted (set above,
      // before this write was attempted) — anchorRef just rolled back to
      // previousAnchor too, so the next tick/retry is relative to the same
      // anchor these whole items were already notified against; resetting
      // to 0 here would re-fire the same "crafted" toast on a retry.
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [recipe.profession]: getProfessionState(currentCharacter.professions, recipe.profession),
        },
        ...(material ? { materialMastery: currentCharacter.materialMastery } : {}),
      }));
    }
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character.currentActivity.startedAt) return null;

  const prof = getProfessionState(character.professions, recipe.profession);
  const masteryState = prof.mastery?.[recipe.id] ?? { level: 0, xp: 0 };
  const tier = craftingColorTier(prof.level, recipe.requiredSkill);
  const xpPct = CRAFTING_COLOR_XP_PCT[tier];
  // A materialId-tagged recipe's speed/bonus-output bonuses (and the Mastery
  // progress line below) come from the shared per-material track instead of
  // this recipe's own — see ProfessionState.mastery's doc comment.
  const displayMaterial = recipe.materialId ? getMaterial(recipe.materialId) : undefined;
  const materialMasteryXp = displayMaterial ? character.materialMastery?.[displayMaterial.id]?.xp ?? 0 : 0;
  const materialPercent = displayMaterial ? materialMasteryPercent(materialMasteryXp, displayMaterial.id) : 0;
  const speedMult = displayMaterial
    ? materialMasterySpeedMultiplier(materialPercent)
    : craftingMasterySpeedMultiplier(masteryState.level);
  const bonusChance = displayMaterial
    ? materialMasteryBonusChance(materialPercent)
    : craftingMasteryBonusChance(masteryState.level);
  // An alchemyZoneId-tagged recipe's charge-count/craft-speed (and the
  // Mastery progress line below) come from that zone's shared track instead
  // of this recipe's own per-recipe Mastery — same displayMaterial pattern
  // as Blacksmithing, just keyed by zone instead of material.
  const displayAlchemyZone = recipe.alchemyZoneId ? ZONES[recipe.alchemyZoneId] : undefined;
  const alchemyZoneXp = displayAlchemyZone ? character.alchemyZoneMastery?.[displayAlchemyZone.id]?.xp ?? 0 : 0;
  const alchemyZonePercent = displayAlchemyZone ? alchemyZoneMasteryPercent(alchemyZoneXp) : 0;
  const alchemyMilestoneInfo = displayAlchemyZone ? alchemyMasteryMilestone(alchemyZonePercent) : undefined;
  // An enchantingZoneId-tagged recipe's craft-speed/material-preservation
  // (and the Mastery progress line below) come from that zone's shared
  // scroll-crafting track instead of this recipe's own per-recipe Mastery —
  // same displayAlchemyZone pattern, just Enchanting's own separate axis.
  const displayEnchantingZone = recipe.enchantingZoneId ? ZONES[recipe.enchantingZoneId] : undefined;
  const enchantingZoneXp = displayEnchantingZone ? character.enchantingZoneMastery?.[displayEnchantingZone.id]?.xp ?? 0 : 0;
  const enchantingZonePercent = displayEnchantingZone ? enchantingZoneMasteryPercent(enchantingZoneXp) : 0;
  const enchantingMilestoneInfo = displayEnchantingZone ? enchantingMasteryMilestone(enchantingZonePercent) : undefined;
  // A cookingZoneId-tagged recipe's charge-count/craft-speed/preservation
  // (and the Mastery progress line below) come from that zone's shared
  // Cooking track instead of this recipe's own per-recipe Mastery — same
  // displayAlchemyZone/displayEnchantingZone pattern.
  const displayCookingZone = recipe.cookingZoneId ? ZONES[recipe.cookingZoneId] : undefined;
  const cookingZoneXp = displayCookingZone ? character.cookingZoneMastery?.[displayCookingZone.id]?.xp ?? 0 : 0;
  const cookingZonePercent = displayCookingZone ? cookingZoneMasteryPercent(cookingZoneXp) : 0;
  const cookingMilestoneInfo = displayCookingZone ? cookingMasteryMilestone(cookingZonePercent) : undefined;
  const xpForNextSkillLevel = craftingXpForNextLevel(prof.level);
  const xpForNextMasteryLevel =
    masteryState.level < RECIPE_MASTERY_MAX_LEVEL ? recipeMasteryXpForNextLevel(masteryState.level) : null;
  const resultItem = ITEMS[recipe.resultItemId];

  // Recomputed from TickBar's onIteration below — fired by the bar's own
  // CSS animation completing a loop (the compositor clock), NOT by the
  // separate 1s setInterval that drives the real 20s autosave cadence.
  // Driving this from an independent JS timer instead would have its own
  // callback-delay jitter drift against the bar's visual completion,
  // producing a lag that grows then resyncs — see TickBar.tsx's doc comment.
  const cap = maxSkillForUnlockedTier(recipe.profession, prof.unlockedTier);
  const previewMaterialMasteryInput: MaterialMasteryInput | undefined = displayMaterial
    ? {
        materialId: displayMaterial.id,
        startingXp: materialMasteryXp,
        barsPerCraft: recipe.materials.find((m) => m.itemId === displayMaterial.barItemId)?.quantity ?? 0,
      }
    : undefined;
  const previewAlchemyZoneMasteryInput: AlchemyZoneMasteryInput | undefined = displayAlchemyZone
    ? {
        startingXp: alchemyZoneXp,
        unitsInOwnZonePerCraft: recipe.materials
          .filter((m) => herbZoneOf(m.itemId) === displayAlchemyZone.id)
          .reduce((sum, m) => sum + m.quantity, 0),
      }
    : undefined;
  const previewEnchantingZoneMasteryInput: EnchantingZoneMasteryInput | undefined = displayEnchantingZone
    ? { startingXp: enchantingZoneXp }
    : undefined;
  const previewCookingZoneMasteryInput: CookingZoneMasteryInput | undefined = displayCookingZone
    ? { startingXp: cookingZoneXp, cookingTier: recipe.cookingTier ?? 1 }
    : undefined;
  const previewAnyZoneOrMaterialMastery =
    previewMaterialMasteryInput ||
    previewAlchemyZoneMasteryInput ||
    previewEnchantingZoneMasteryInput ||
    previewCookingZoneMasteryInput;
  function handleTickIteration() {
    if (!anchorRef.current) return;
    const preview = resolveCraftingOffline(
      anchorRef.current,
      new Date(),
      recipeLike(),
      prof.level,
      prof.xp,
      previewAnyZoneOrMaterialMastery ? 0 : masteryState.level,
      previewAnyZoneOrMaterialMastery ? 0 : masteryState.xp,
      cap,
      materialsRef.current,
      goldRef.current,
      previewMaterialMasteryInput,
      previewAlchemyZoneMasteryInput,
      craftingShirtBonuses(character.currentActivity.equippedShirtItemId),
      previewEnchantingZoneMasteryInput,
      previewCookingZoneMasteryInput
    );
    setLivePreview(preview);
    // Stop the bar the instant a loop detects there's nothing left to make,
    // rather than waiting for the next ~20s autosave to notice — without
    // this the bar kept visibly looping (and the player kept thinking
    // something was happening) for up to a full autosave cycle after
    // materials actually ran out.
    if (preview.stoppedForMaterials) setOutOfMaterials(true);
    // Fires the "crafted" toast the instant the bar's own loop completes a
    // whole item, rather than waiting for the next ~20s autosave to batch
    // however many finished in the meantime (see notifiedWholeRef's doc
    // comment above) — this is what keeps the bar, the "This session: N
    // crafted" count, and the notification all visibly in sync.
    const wholeNow = Math.floor(preview.itemsCrafted);
    const newly = wholeNow - notifiedWholeRef.current;
    if (newly > 0) {
      notifiedWholeRef.current = wholeNow;
      if (character.notificationsEnabled) {
        const resultQty = recipe.resultQuantity * newly;
        notify(`${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId} crafted`, [
          `${resultQty}x ${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId}`,
        ]);
      }
    }
  }
  const previewShirtSpeedPct =
    shirtBonusPct(shirtBonusForItemId(character.currentActivity.equippedShirtItemId), 'crafting_speed') +
    guildBonuses.craftingTimePct;
  const displayCrafted = bankedCrafted + Math.floor(livePreview?.itemsCrafted ?? 0);
  const previewConsumedByItem: Record<string, number> = {};
  for (const c of livePreview?.materialsConsumed ?? []) previewConsumedByItem[c.itemId] = c.quantity;

  return (
    <div className="crafting-screen">
      <h2>
        {label}: {recipe.name}
      </h2>
      <div className="item-row-main" style={{ marginBottom: 12 }}>
        {resultItem && <ItemSlot item={resultItem} />}
        <div className="item-grid" style={{ flex: 1 }}>
          {recipe.materials.map((m) => {
            const material = ITEMS[m.itemId];
            if (!material) return null;
            const liveQuantity = Math.max(0, (materialsRef.current[m.itemId] ?? 0) - (previewConsumedByItem[m.itemId] ?? 0));
            return (
              <div key={m.itemId} className="loot-entry">
                <ItemSlot item={material} quantity={liveQuantity} />
                <small style={liveQuantity < m.quantity ? { color: '#c0392b' } : undefined}>
                  {liveQuantity}/{m.quantity}
                </small>
              </div>
            );
          })}
        </div>
      </div>
      {!outOfMaterials && (
        <TickBar
          seconds={
            (displayAlchemyZone
              ? recipe.craftSeconds * (1 - alchemyMilestoneInfo!.craftTimeReductionPct / 100)
              : displayEnchantingZone
                ? recipe.craftSeconds * (1 - enchantingMilestoneInfo!.craftTimeReductionPct / 100)
                : displayCookingZone
                  ? recipe.craftSeconds * (1 - cookingMilestoneInfo!.craftTimeReductionPct / 100)
                  : recipe.craftSeconds / (earnsProfessionXp ? speedMult : 1)) /
            (1 + previewShirtSpeedPct / 100)
          }
          color="var(--class-accent)"
          label="Crafting"
          onIteration={handleTickIteration}
        />
      )}
      <p>This session: {displayCrafted} crafted</p>
      <p>
        {label} skill: {prof.level}
        {earnsProfessionXp ? ` (${Math.floor(prof.xp)} / ${xpForNextSkillLevel} XP)` : ''}
      </p>
      {earnsProfessionXp && (
        <>
          <p>
            {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP
          </p>
          <div className="profession-xp-bar-track">
            <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (prof.xp / xpForNextSkillLevel) * 100)}%` }} />
          </div>
          {displayAlchemyZone ? (
            <>
              <p>
                {displayAlchemyZone.name} Mastery: {alchemyZonePercent.toFixed(1)}% — Creates {alchemyMilestoneInfo!.charges}-charge
                potions and crafts {alchemyMilestoneInfo!.craftTimeReductionPct}% faster.
              </p>
              <div className="profession-xp-bar-track">
                <div className="profession-xp-bar-fill" style={{ width: `${alchemyZonePercent}%` }} />
              </div>
            </>
          ) : displayEnchantingZone ? (
            <>
              <p>
                {displayEnchantingZone.name} Enchantments Mastery: {enchantingZonePercent.toFixed(1)}% — crafts{' '}
                {enchantingMilestoneInfo!.craftTimeReductionPct}% faster, {enchantingMilestoneInfo!.materialPreserveChancePct}%
                chance to preserve materials.
              </p>
              <div className="profession-xp-bar-track">
                <div className="profession-xp-bar-fill" style={{ width: `${enchantingZonePercent}%` }} />
              </div>
            </>
          ) : displayCookingZone ? (
            <>
              <p>
                {displayCookingZone.name} Cooking Mastery: {cookingZonePercent.toFixed(1)}%
                {recipe.cookingTier === 2
                  ? ` — Creates ${cookingMilestoneInfo!.tier2Charges}-charge servings`
                  : recipe.cookingTier === 1 && cookingMilestoneInfo!.tier1BonusServings > 0
                    ? ` — +${cookingMilestoneInfo!.tier1BonusServings} bonus serving per craft`
                    : ''}
                , crafts {cookingMilestoneInfo!.craftTimeReductionPct}% faster, {cookingMilestoneInfo!.materialPreserveChancePct}%
                chance to preserve ingredients.
              </p>
              <div className="profession-xp-bar-track">
                <div className="profession-xp-bar-fill" style={{ width: `${cookingZonePercent}%` }} />
              </div>
            </>
          ) : displayMaterial ? (
            <>
              <p>
                {displayMaterial.name} Mastery: {materialPercent.toFixed(1)}%
                {' — '}+{((speedMult - 1) * 100).toFixed(0)}% speed, {(bonusChance * 100).toFixed(0)}% bonus output
              </p>
              <div className="profession-xp-bar-track">
                <div className="profession-xp-bar-fill" style={{ width: `${materialPercent}%` }} />
              </div>
            </>
          ) : (
            <>
              <p>
                {resultItem?.name ?? recipe.resultItemId} Mastery: {masteryState.level}%
                {xpForNextMasteryLevel !== null ? ` (${Math.floor(masteryState.xp)} / ${xpForNextMasteryLevel} XP)` : ' (max)'}
                {' — '}+{((speedMult - 1) * 100).toFixed(0)}% speed, {(bonusChance * 100).toFixed(0)}% bonus output
              </p>
              {xpForNextMasteryLevel !== null && (
                <div className="profession-xp-bar-track">
                  <div
                    className="profession-xp-bar-fill"
                    style={{ width: `${Math.min(100, (masteryState.xp / xpForNextMasteryLevel) * 100)}%` }}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
      {outOfMaterials && <p>Out of materials{recipe.goldCost ? ' or gold' : ''} — stopped.</p>}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

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
} from '../gameData/craftingEngine';
import { getProfessionState, maxSkillForUnlockedTier, PROFESSION_CATEGORY, PROFESSION_LABELS } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { getMaterial } from '../gameData/materials';
import { materialMasteryPercent, materialMasterySpeedMultiplier, materialMasteryBonusChance } from '../gameData/equipmentRolls';
import { ItemSlot } from './ItemSlot';
import { TickBar } from './TickBar';
import { notify } from '../utils/notifications';
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
  const materialsRef = useRef<Record<string, number>>({});
  const goldRef = useRef(character.gold);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
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

    const material = recipe.materialId ? getMaterial(recipe.materialId) : undefined;
    const materialMasteryInput: MaterialMasteryInput | undefined = material
      ? {
          materialId: material.id,
          startingXp: currentCharacter.materialMastery?.[material.id]?.xp ?? 0,
          barsPerCraft: recipe.materials.find((m) => m.itemId === material.barItemId)?.quantity ?? 0,
        }
      : undefined;

    const result = resolveCraftingOffline(
      anchor,
      now,
      recipeLike(),
      prof.level,
      prof.xp,
      materialMasteryInput ? 0 : masteryState.level,
      materialMasteryInput ? 0 : masteryState.xp,
      cap,
      materialsRef.current,
      goldRef.current,
      materialMasteryInput
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

    if (currentCharacter.notificationsEnabled) {
      const resultQty = recipe.resultQuantity * wholeCrafted;
      notify(`${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId} crafted`, [
        `${resultQty}x ${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId}`,
      ]);
    }
    if (currentCharacter.skillXpNotificationsEnabled && earnsProfessionXp && result.professionXpGained > 0) {
      notify(`${label} XP gained`, [`+${result.professionXpGained} XP`]);
    }
    if (currentCharacter.masteryXpNotificationsEnabled && earnsProfessionXp) {
      const masteryXpGained = materialMasteryInput ? result.materialMasteryXpGained ?? 0 : result.masteryXpGained;
      if (masteryXpGained > 0) {
        const masteryLabel = material?.name ?? ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId;
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
              ...(materialMasteryInput
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
      gold: c.gold - result.goldSpent,
    }));

    try {
      // One read per cycle, done up front — see GatheringScreen's matching
      // comment for why this replaces three separate reads of the same
      // document with exactly one.
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyCraftingProfessionResult(currentUser.uid, recipe.profession, recipe.id, fresh, {
        resultItemId: recipe.resultItemId,
        resultQuantity: recipe.resultQuantity * wholeCrafted,
        materialsConsumed: result.materialsConsumed,
        goldSpent: result.goldSpent,
        newSkillLevel: result.finalSkill,
        newSkillXp: result.finalSkillXp,
        newMasteryLevel: result.finalMasteryLevel,
        newMasteryXp: result.finalMasteryXp,
        earnsProfessionXp,
        ...(material
          ? {
              materialMastery: {
                materialId: material.id,
                newMaterialMasteryXp: result.finalMaterialMasteryXp ?? 0,
                batches: result.materialMasteryBatches ?? [],
              },
            }
          : {}),
      });

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
                ...(materialMasteryInput
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
        gold: fresh.gold - result.goldSpent,
        // Crafting never touches currentActivity.startedAt server-side, so
        // without refreshing it locally too it sits stale from whenever the
        // activity started, risking an isLongAbsence flicker.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
    } catch (err) {
      console.error('Crafting autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      materialsRef.current = previousMaterials;
      goldRef.current = previousGold;
      setBankedCrafted((prev) => prev - wholeCrafted);
      setLivePreview(null);
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
  function handleTickIteration() {
    if (!anchorRef.current) return;
    setLivePreview(
      resolveCraftingOffline(
        anchorRef.current,
        new Date(),
        recipeLike(),
        prof.level,
        prof.xp,
        previewMaterialMasteryInput ? 0 : masteryState.level,
        previewMaterialMasteryInput ? 0 : masteryState.xp,
        cap,
        materialsRef.current,
        goldRef.current,
        previewMaterialMasteryInput
      )
    );
  }
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
            const liveQuantity = (materialsRef.current[m.itemId] ?? 0) - (previewConsumedByItem[m.itemId] ?? 0);
            return (
              <div key={m.itemId} className="loot-entry">
                <ItemSlot item={material} quantity={Math.max(0, liveQuantity)} />
                <small>need {m.quantity}</small>
              </div>
            );
          })}
        </div>
      </div>
      {!outOfMaterials && (
        <TickBar
          seconds={recipe.craftSeconds / (earnsProfessionXp ? speedMult : 1)}
          color="#6b4f2a"
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
          {displayMaterial ? (
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
                {resultItem?.name ?? recipe.resultItemId} Mastery: {masteryState.level}/{RECIPE_MASTERY_MAX_LEVEL}
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

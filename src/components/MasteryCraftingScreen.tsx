import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyMasteryCraftingResult, getCharacter, stopActivity, advanceQuests } from '../firebase/character';
import { getInventory } from '../firebase/inventory';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import {
  resolveMasteryCraftingOffline,
  masteryColorTier,
  masterySpeedMultiplier,
  masteryBonusChance,
  masteryProfessionXpForNextLevel,
  masteryXpForNextLevel,
  MASTERY_MAX_LEVEL,
  MASTERY_COLOR_XP_PCT,
  type MasteryCraftRecipeLike,
} from '../gameData/masteryEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { ItemSlot } from './ItemSlot';
import { TickBar } from './TickBar';
import { notify } from '../utils/notifications';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { Recipe } from '../gameData/types';

// Smithing's (and Mining's smelting) pilot of the new XP+Mastery system —
// structurally parallel to CraftingScreen, but resolves through
// masteryEngine.ts instead of activityEngine's discrete skill-up-chance
// model. See MasteryGatheringScreen's matching comment for why this always
// uses the OFFLINE/batched resolver, even for a single autosave chunk.
// recipe.xpAward (dead for every other crafting profession, see types.ts)
// is repurposed here as the engine's baseProfessionXp input.
export function MasteryCraftingScreen({ recipe }: { recipe: Recipe }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedCrafted, setBankedCrafted] = useState(0);
  const [outOfMaterials, setOutOfMaterials] = useState(false);
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

  useEffect(() => {
    setBankedCrafted(0);
    setOutOfMaterials(false);
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

  function recipeLike(): MasteryCraftRecipeLike {
    return {
      resultItemId: recipe.resultItemId,
      resultQuantity: recipe.resultQuantity,
      baseProfessionXp: recipe.xpAward,
      craftSeconds: recipe.craftSeconds,
      requiredSkill: recipe.requiredSkill,
      colorBreakpoints: recipe.colorBreakpoints,
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
    const cap = maxSkillForUnlockedTier(prof.unlockedTier);

    const result = resolveMasteryCraftingOffline(
      anchor,
      now,
      recipeLike(),
      prof.level,
      prof.xp,
      masteryState.level,
      masteryState.xp,
      cap,
      materialsRef.current,
      goldRef.current
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

    if (currentCharacter.notificationsEnabled) {
      const resultQty = recipe.resultQuantity * wholeCrafted;
      notify(`${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId} crafted`, [
        `${resultQty}x ${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId}`,
      ]);
    }

    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        [recipe.profession]: {
          ...getProfessionState(c.professions, recipe.profession),
          level: result.finalSkill,
          xp: result.finalSkillXp,
          mastery: {
            ...getProfessionState(c.professions, recipe.profession).mastery,
            [recipe.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
          },
        },
      },
      gold: c.gold - result.goldSpent,
    }));

    try {
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyMasteryCraftingResult(currentUser.uid, recipe.profession, recipe.id, {
        resultItemId: recipe.resultItemId,
        resultQuantity: recipe.resultQuantity * wholeCrafted,
        materialsConsumed: result.materialsConsumed,
        goldSpent: result.goldSpent,
        newSkillLevel: result.finalSkill,
        newSkillXp: result.finalSkillXp,
        newMasteryLevel: result.finalMasteryLevel,
        newMasteryXp: result.finalMasteryXp,
      });

      await advanceQuests(currentUser.uid, fresh, [{ type: 'craft', itemId: recipe.resultItemId, count: wholeCrafted }]);

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: {
          ...fresh.professions,
          [recipe.profession]: {
            ...getProfessionState(fresh.professions, recipe.profession),
            level: result.finalSkill,
            xp: result.finalSkillXp,
            mastery: {
              ...getProfessionState(fresh.professions, recipe.profession).mastery,
              [recipe.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
            },
          },
        },
        gold: fresh.gold - result.goldSpent,
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
    } catch (err) {
      console.error('Mastery crafting autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      materialsRef.current = previousMaterials;
      goldRef.current = previousGold;
      setBankedCrafted((prev) => prev - wholeCrafted);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [recipe.profession]: getProfessionState(currentCharacter.professions, recipe.profession),
        },
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
  const tier = masteryColorTier(prof.level, recipe.colorBreakpoints);
  const xpPct = MASTERY_COLOR_XP_PCT[tier];
  const speedMult = masterySpeedMultiplier(masteryState.level);
  const bonusChance = masteryBonusChance(masteryState.level);
  const xpForNextSkillLevel = masteryProfessionXpForNextLevel(prof.level);
  const xpForNextMasteryLevel =
    masteryState.level < MASTERY_MAX_LEVEL ? masteryXpForNextLevel(masteryState.level) : null;
  const resultItem = ITEMS[recipe.resultItemId];

  return (
    <div className="crafting-screen">
      <h2>{recipe.profession === 'mining' ? 'Smelting' : 'Smithing'}: {recipe.name}</h2>
      <div className="item-row-main" style={{ marginBottom: 12 }}>
        {resultItem && <ItemSlot item={resultItem} />}
        <div className="item-grid" style={{ flex: 1 }}>
          {recipe.materials.map((m) => {
            const material = ITEMS[m.itemId];
            if (!material) return null;
            return (
              <div key={m.itemId} className="loot-entry">
                <ItemSlot item={material} quantity={materialsRef.current[m.itemId] ?? 0} />
                <small>need {m.quantity}</small>
              </div>
            );
          })}
        </div>
      </div>
      {!outOfMaterials && <TickBar seconds={recipe.craftSeconds / speedMult} color="#6b4f2a" label="Crafting" />}
      <p>
        {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP
      </p>
      <p>This session: {bankedCrafted} crafted</p>
      <p>
        {recipe.profession.charAt(0).toUpperCase() + recipe.profession.slice(1)} skill: {prof.level} ({Math.floor(prof.xp)} / {xpForNextSkillLevel} XP)
      </p>
      <div className="profession-xp-bar-track">
        <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (prof.xp / xpForNextSkillLevel) * 100)}%` }} />
      </div>
      <p>
        Mastery: {masteryState.level}/{MASTERY_MAX_LEVEL}
        {xpForNextMasteryLevel !== null ? ` (${Math.floor(masteryState.xp)} / ${xpForNextMasteryLevel} XP)` : ' (max)'}
        {' — '}+{((speedMult - 1) * 100).toFixed(0)}% speed, {(bonusChance * 100).toFixed(0)}% chance to double output
      </p>
      {xpForNextMasteryLevel !== null && (
        <div className="profession-xp-bar-track">
          <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (masteryState.xp / xpForNextMasteryLevel) * 100)}%` }} />
        </div>
      )}
      {outOfMaterials && <p>Out of materials{recipe.goldCost ? ' or gold' : ''} — stopped.</p>}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

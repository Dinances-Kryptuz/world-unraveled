import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCraftingResult, checkAndApplyProfessionLevelUp, stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { getInventory } from '../firebase/inventory';
import { resolveCrafting } from '../gameData/activityEngine';
import { professionXpForLevel } from '../gameData/xpTables';
import { getProfessionState } from '../gameData/professionTiers';
import { XpBar } from './XpBar';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { Recipe } from '../gameData/types';

const AUTOSAVE_INTERVAL_SECONDS = 10;

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
  const [bankedXp, setBankedXp] = useState(0);
  const [outOfMaterials, setOutOfMaterials] = useState(false);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const materialsRef = useRef<Record<string, number>>({});

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
    setBankedXp(0);
    setOutOfMaterials(false);
    anchorRef.current = character.currentActivity.startedAt;
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

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const currentSkill = getProfessionState(currentCharacter.professions, recipe.profession).level;
    const result = resolveCrafting(
      anchor,
      now,
      recipe,
      currentSkill,
      materialsRef.current,
      recipe.colorBreakpoints
    );

    if (result.itemsCrafted === 0) {
      const hasEnoughMaterials = recipe.materials.every(
        (m) => (materialsRef.current[m.itemId] ?? 0) >= m.quantity
      );
      if (!hasEnoughMaterials) {
        // Just show the message and stop trying — don't end the activity
        // automatically, or the screen unmounts before it can be read.
        // The player stops manually with the Stop button whenever they want.
        setOutOfMaterials(true);
      }
      return;
    }

    const previousAnchor = anchor;
    const previousMaterials = { ...materialsRef.current };

    anchorRef.current = now;
    for (const consumed of result.materialsConsumed) {
      materialsRef.current[consumed.itemId] =
        (materialsRef.current[consumed.itemId] ?? 0) - consumed.quantity;
    }
    setBankedCrafted((prev) => prev + result.itemsCrafted);
    setBankedXp((prev) => prev + result.xpGained);
    // Bump the shared profession xp now, in the same tick as the banked
    // session totals above, so the XpBar right below doesn't visibly lag
    // behind the "This session" line on this same screen.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        [recipe.profession]: {
          ...getProfessionState(c.professions, recipe.profession),
          xp: getProfessionState(c.professions, recipe.profession).xp + result.xpGained,
        },
      },
    }));

    try {
      await applyCraftingResult(currentUser.uid, recipe.profession, {
        xpGained: result.xpGained,
        resultItemId: recipe.resultItemId,
        resultQuantity: recipe.resultQuantity * result.itemsCrafted,
        materialsConsumed: result.materialsConsumed,
      });
      await checkAndApplyProfessionLevelUp(currentUser.uid, recipe.profession);

      // Fetched fresh for the same lost-update reason as GatheringScreen.
      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        await advanceQuests(currentUser.uid, fresh, [
          { type: 'craft', itemId: recipe.resultItemId, count: result.itemsCrafted },
        ]);
      }

      await refetch();
    } catch (err) {
      console.error('Crafting autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      materialsRef.current = previousMaterials;
      setBankedCrafted((prev) => prev - result.itemsCrafted);
      setBankedXp((prev) => prev - result.xpGained);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [recipe.profession]: {
            ...getProfessionState(c.professions, recipe.profession),
            xp: getProfessionState(c.professions, recipe.profession).xp - result.xpGained,
          },
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

  const profession = getProfessionState(character.professions, recipe.profession);

  return (
    <div className="crafting-screen">
      <h2>Crafting: {recipe.name}</h2>
      {!outOfMaterials && <TickBar seconds={recipe.craftSeconds} color="#6b4f2a" label="Crafting" />}
      <p>
        This session: {bankedCrafted} crafted, +{bankedXp} XP
      </p>
      <XpBar
        level={profession.level}
        xp={profession.xp}
        curve={professionXpForLevel}
        label={recipe.profession.charAt(0).toUpperCase() + recipe.profession.slice(1)}
      />
      {outOfMaterials && <p>Out of materials — stopped.</p>}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

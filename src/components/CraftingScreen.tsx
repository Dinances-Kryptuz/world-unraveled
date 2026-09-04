import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCraftingResult, checkAndApplyProfessionLevelUp, stopActivity } from '../firebase/character';
import { getInventory } from '../firebase/inventory';
import { resolveCrafting } from '../gameData/activityEngine';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { Recipe } from '../gameData/types';

const AUTOSAVE_INTERVAL_SECONDS = 10;

export function CraftingScreen({ recipe }: { recipe: Recipe }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
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
    const currentSkill = currentCharacter.professions[recipe.profession].level;
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

    try {
      await applyCraftingResult(currentUser.uid, recipe.profession, {
        xpGained: result.xpGained,
        resultItemId: recipe.resultItemId,
        resultQuantity: recipe.resultQuantity * result.itemsCrafted,
        materialsConsumed: result.materialsConsumed,
      });
      await checkAndApplyProfessionLevelUp(currentUser.uid, recipe.profession);
      await refetch();
    } catch (err) {
      console.error('Crafting autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      materialsRef.current = previousMaterials;
      setBankedCrafted((prev) => prev - result.itemsCrafted);
      setBankedXp((prev) => prev - result.xpGained);
    }
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character || !character.currentActivity.startedAt) return null;

  return (
    <div className="crafting-screen">
      <h2>Crafting: {recipe.name}</h2>
      <p>
        This session: {bankedCrafted} crafted, +{bankedXp} XP
      </p>
      {outOfMaterials && <p>Out of materials — stopped.</p>}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

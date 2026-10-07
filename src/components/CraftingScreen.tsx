import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCraftingResult, stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { getInventory } from '../firebase/inventory';
import { resolveCrafting, AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import { getProfessionState, maxSkillForUnlockedTier, PROFESSION_CATEGORY } from '../gameData/professionTiers';
import { TickBar } from './TickBar';
import { ItemSlot } from './ItemSlot';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { Recipe } from '../gameData/types';

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
  const [bankedSkillups, setBankedSkillups] = useState(0);
  const [outOfMaterials, setOutOfMaterials] = useState(false);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const materialsRef = useRef<Record<string, number>>({});
  const goldRef = useRef(character.gold);
  const skillupCarryRef = useRef(0); // fractional skill-ups carried across chunks

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
    setBankedSkillups(0);
    setOutOfMaterials(false);
    anchorRef.current = character.currentActivity.startedAt;
    goldRef.current = character.gold;
    skillupCarryRef.current = 0;
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
      recipe.colorBreakpoints,
      goldRef.current
    );

    // Mining's Smelting recipes are the one case of a "crafting" recipe
    // tagged to a gathering-category profession — Mining's level/xp is now
    // owned entirely by gatheringEngine.ts's 1-100 curve (gathering ore is
    // the only thing that earns Mining XP, per the design brief), so
    // Smelting never contributes a skill-up of its own; it's purely a
    // level-gated material conversion. Every real crafting profession
    // (category 'production') keeps the original discrete skill-up-chance
    // behavior below unchanged.
    const earnsSkillup = PROFESSION_CATEGORY[recipe.profession] === 'production';

    if (result.itemsCrafted === 0) {
      const hasEnoughMaterials = recipe.materials.every(
        (m) => (materialsRef.current[m.itemId] ?? 0) >= m.quantity
      );
      const hasEnoughGold = !recipe.goldCost || goldRef.current >= recipe.goldCost;
      if (!hasEnoughMaterials || !hasEnoughGold) {
        // Just show the message and stop trying — don't end the activity
        // automatically, or the screen unmounts before it can be read.
        // The player stops manually with the Stop button whenever they want.
        setOutOfMaterials(true);
      }
      return;
    }

    const previousAnchor = anchor;
    const previousMaterials = { ...materialsRef.current };
    const previousGold = goldRef.current;
    const previousSkillupCarry = skillupCarryRef.current;

    anchorRef.current = now;
    for (const consumed of result.materialsConsumed) {
      materialsRef.current[consumed.itemId] =
        (materialsRef.current[consumed.itemId] ?? 0) - consumed.quantity;
    }
    goldRef.current -= result.goldSpent;
    setBankedCrafted((prev) => prev + result.itemsCrafted);

    // skillupsGained is fractional (itemsCrafted * a <1.0 chance for yellow/
    // green tiers) — carry the remainder forward, same pattern as Fishing/
    // GatheringScreen, so it behaves probabilistically over many chunks
    // instead of resolving identically every single time.
    const skillupTotal = skillupCarryRef.current + (earnsSkillup ? result.skillupsGained : 0);
    const wholeSkillups = Math.floor(skillupTotal);
    skillupCarryRef.current = skillupTotal - wholeSkillups;
    setBankedSkillups((prev) => prev + wholeSkillups);

    if (currentCharacter.notificationsEnabled) {
      const resultQty = recipe.resultQuantity * result.itemsCrafted;
      notify(`${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId} crafted`, [
        `${resultQty}x ${ITEMS[recipe.resultItemId]?.name ?? recipe.resultItemId}`,
      ]);
    }
    // Bump the shared profession skill now, in the same tick as the banked
    // session totals above, so the skill display right below doesn't
    // visibly lag behind the "This session" line on this same screen. A
    // rough speculative estimate, superseded moments later by the
    // authoritative reconciliation below once the write succeeds.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        [recipe.profession]: {
          ...getProfessionState(c.professions, recipe.profession),
          level: getProfessionState(c.professions, recipe.profession).level + wholeSkillups,
        },
      },
    }));

    try {
      // One read per cycle, done up front — see GatheringScreen's matching
      // comment for why this replaces three separate reads of the same
      // document (one inside applyCraftingResult, one for quests, one in
      // refetch()) with exactly one.
      const fresh = await getCharacter(currentUser.uid);
      // Routes through the catch block below (rolling back the speculative
      // optimistic update and re-queuing this cycle's gains for retry)
      // rather than silently dropping them — see CombatScreen's matching
      // comment.
      if (!fresh) throw new Error('Character not found during autosave');
      const freshProf = getProfessionState(fresh.professions, recipe.profession);

      await applyCraftingResult(currentUser.uid, recipe.profession, {
        skillupsGained: wholeSkillups,
        resultItemId: recipe.resultItemId,
        resultQuantity: recipe.resultQuantity * result.itemsCrafted,
        materialsConsumed: result.materialsConsumed,
        goldSpent: result.goldSpent,
        currentLevel: freshProf.level,
        unlockedTier: freshProf.unlockedTier,
      });

      await advanceQuests(currentUser.uid, fresh, [
        { type: 'craft', itemId: recipe.resultItemId, count: result.itemsCrafted },
      ]);

      const cap = maxSkillForUnlockedTier(recipe.profession, freshProf.unlockedTier);
      const newLevel = Math.min(cap, freshProf.level + wholeSkillups);
      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: { ...fresh.professions, [recipe.profession]: { ...freshProf, level: newLevel } },
        gold: fresh.gold - result.goldSpent,
        // See GatheringScreen's matching comment — crafting never touches
        // currentActivity.startedAt server-side either, same latent
        // isLongAbsence flicker risk without this.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
    } catch (err) {
      console.error('Crafting autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      materialsRef.current = previousMaterials;
      goldRef.current = previousGold;
      skillupCarryRef.current = previousSkillupCarry;
      setBankedCrafted((prev) => prev - result.itemsCrafted);
      setBankedSkillups((prev) => prev - wholeSkillups);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [recipe.profession]: {
            ...getProfessionState(c.professions, recipe.profession),
            level: getProfessionState(c.professions, recipe.profession).level - wholeSkillups,
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

  // Live preview of progress since the last autosave, recomputed every
  // render tick (same pattern as GatheringScreen's sinceLastSave) — without
  // this, "This session" only updated once per 10-second autosave, jumping
  // by however many items completed in that window all at once (visibly
  // "crafted 2 leather" in one lump) instead of counting up smoothly as
  // each one actually finishes. Crafting and gathering now share this same
  // per-second live-preview cadence.
  const currentSkill = getProfessionState(character.professions, recipe.profession).level;
  const sinceLastSave = anchorRef.current
    ? resolveCrafting(anchorRef.current, new Date(), recipe, currentSkill, materialsRef.current, recipe.colorBreakpoints, goldRef.current)
    : { itemsCrafted: 0, skillupsGained: 0, skillupChance: 0, materialsConsumed: [], goldSpent: 0 };

  const earnsSkillup = PROFESSION_CATEGORY[recipe.profession] === 'production';
  const displayCrafted = bankedCrafted + sinceLastSave.itemsCrafted;
  const displaySkillups = bankedSkillups + skillupCarryRef.current + (earnsSkillup ? sinceLastSave.skillupsGained : 0);

  const resultItem = ITEMS[recipe.resultItemId];

  return (
    <div className="crafting-screen">
      <h2>Crafting: {recipe.name}</h2>
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
      {!outOfMaterials && <TickBar seconds={recipe.craftSeconds} color="#6b4f2a" label="Crafting" />}
      {earnsSkillup && <p>Skill-up chance per craft at your skill: {(sinceLastSave.skillupChance * 100).toFixed(0)}%</p>}
      <p>
        This session: {displayCrafted} crafted{earnsSkillup ? `, +${Math.floor(displaySkillups)} skill` : ''}
      </p>
      <p>{recipe.profession.charAt(0).toUpperCase() + recipe.profession.slice(1)} skill: {currentSkill}</p>
      {outOfMaterials && <p>Out of materials{recipe.goldCost ? ' or gold' : ''} — stopped.</p>}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

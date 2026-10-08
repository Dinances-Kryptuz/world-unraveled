import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyFishingResult } from '../firebase/professions';
import { stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import {
  resolveGatheringOffline,
  gatheringColorTier,
  gatheringMasterySpeedMultiplier,
  gatheringMasteryBonusChance,
  gatheringXpForNextLevel,
  masteryXpForNextLevel,
  MASTERY_MAX_LEVEL,
  GATHERING_COLOR_XP_PCT,
  type GatheringResourceLike,
} from '../gameData/gatheringEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { FishingHole } from '../gameData/types';

// Fishing now shares gatheringEngine.ts's 1-100 XP+Mastery engine with
// Mining/Herbalism/Skinning — structurally parallel to GatheringScreen, with
// catchChance baked into the resolver as the one thing that still makes
// Fishing different ("your fish got away": no fish, no XP, no Mastery).
// Always uses the OFFLINE/batched resolver, even for a single ~20s autosave
// chunk — same convention as GatheringScreen.
export function FishingScreen({ hole }: { hole: FishingHole }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedQuantity, setBankedQuantity] = useState(0);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setBankedQuantity(0);
    anchorRef.current = character.currentActivity.startedAt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole.id]);

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
  }, [hole.id]);

  function resourceLike(): GatheringResourceLike {
    return {
      itemId: hole.itemId,
      baseXp: hole.baseXp,
      secondsPerAction: hole.secondsPerAction,
      requiredLevel: hole.requiredLevel,
      catchChance: hole.catchChance,
    };
  }

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const prof = getProfessionState(currentCharacter.professions, 'fishing');
    const masteryState = prof.mastery?.[hole.id] ?? { level: 0, xp: 0 };
    const cap = maxSkillForUnlockedTier('fishing', prof.unlockedTier);
    const equippedTool = currentCharacter.equipment.tool ? ITEMS[currentCharacter.equipment.tool] : null;
    const toolBonusPct = equippedTool?.toolType === 'fishing_rod' ? equippedTool.gatherBonusPct ?? 0 : 0;

    const result = resolveGatheringOffline(
      anchor,
      now,
      resourceLike(),
      prof.level,
      prof.xp,
      masteryState.level,
      masteryState.xp,
      cap,
      toolBonusPct
    );

    if (result.quantityGained === 0 && result.professionXpGained === 0) return;

    const previousAnchor = anchor;
    const wholeQuantity = Math.floor(result.quantityGained);

    anchorRef.current = now;
    setBankedQuantity((prev) => prev + wholeQuantity);

    if (currentCharacter.notificationsEnabled && wholeQuantity > 0) {
      notify(`${ITEMS[hole.itemId]?.name ?? hole.itemId} caught`, [`${wholeQuantity}x ${ITEMS[hole.itemId]?.name ?? hole.itemId}`]);
    }

    // A rough speculative estimate, superseded moments later by the
    // authoritative reconciliation below once the write succeeds.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        fishing: {
          ...getProfessionState(c.professions, 'fishing'),
          level: result.finalSkill,
          xp: result.finalSkillXp,
          mastery: {
            ...getProfessionState(c.professions, 'fishing').mastery,
            [hole.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
          },
        },
      },
    }));

    try {
      // One read per cycle, done up front — quests ARE reachable while this
      // runs in the background, so a stale local copy here risks silently
      // reverting a concurrent Accept/Complete Quest click.
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyFishingResult(currentUser.uid, hole.id, {
        itemId: hole.itemId,
        quantity: wholeQuantity,
        newSkillLevel: result.finalSkill,
        newSkillXp: result.finalSkillXp,
        newMasteryLevel: result.finalMasteryLevel,
        newMasteryXp: result.finalMasteryXp,
      });

      if (wholeQuantity > 0) {
        await advanceQuests(currentUser.uid, fresh, [{ type: 'gather', itemId: hole.itemId, count: wholeQuantity }]);
      }

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: {
          ...fresh.professions,
          fishing: {
            ...getProfessionState(fresh.professions, 'fishing'),
            level: result.finalSkill,
            xp: result.finalSkillXp,
            mastery: {
              ...getProfessionState(fresh.professions, 'fishing').mastery,
              [hole.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
            },
          },
        },
        // Fishing never touches currentActivity.startedAt server-side, so
        // without refreshing it locally too it sits stale from whenever the
        // activity started, risking a isLongAbsence flicker.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
    } catch (err) {
      console.error('Fishing autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      setBankedQuantity((prev) => prev - wholeQuantity);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          fishing: getProfessionState(currentCharacter.professions, 'fishing'),
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

  const prof = getProfessionState(character.professions, 'fishing');
  const masteryState = prof.mastery?.[hole.id] ?? { level: 0, xp: 0 };
  const tier = gatheringColorTier(prof.level, hole.requiredLevel);
  const xpPct = GATHERING_COLOR_XP_PCT[tier];
  const speedMult = gatheringMasterySpeedMultiplier(masteryState.level);
  const bonusChance = gatheringMasteryBonusChance(masteryState.level);
  const xpForNextSkillLevel = gatheringXpForNextLevel(prof.level);
  const xpForNextMasteryLevel = masteryState.level < MASTERY_MAX_LEVEL ? masteryXpForNextLevel(masteryState.level) : null;

  return (
    <div className="fishing-screen">
      <h2>Fishing: {hole.name}</h2>
      <TickBar seconds={hole.secondsPerAction / speedMult} color="#2a5a6b" label="Casting" />
      <p>
        {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP, {(hole.catchChance * 100).toFixed(0)}% catch
        chance
      </p>
      <p>
        This session: {bankedQuantity}x {ITEMS[hole.itemId]?.name ?? hole.itemId}
      </p>
      <p>
        Fishing level: {prof.level} ({Math.floor(prof.xp)} / {xpForNextSkillLevel} XP)
      </p>
      <div className="profession-xp-bar-track">
        <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (prof.xp / xpForNextSkillLevel) * 100)}%` }} />
      </div>
      <p>
        {ITEMS[hole.itemId]?.name ?? hole.itemId} Mastery: {masteryState.level}/{MASTERY_MAX_LEVEL}
        {xpForNextMasteryLevel !== null ? ` (${Math.floor(masteryState.xp)} / ${xpForNextMasteryLevel} XP)` : ' (max)'}
        {' — '}+{((speedMult - 1) * 100).toFixed(0)}% speed, {(bonusChance * 100).toFixed(0)}% bonus yield
      </p>
      {xpForNextMasteryLevel !== null && (
        <div className="profession-xp-bar-track">
          <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (masteryState.xp / xpForNextMasteryLevel) * 100)}%` }} />
        </div>
      )}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

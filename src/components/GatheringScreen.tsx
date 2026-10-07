import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyGatheringProfessionResult, getCharacter, stopActivity, advanceQuests } from '../firebase/character';
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
import { getProfessionState, maxSkillForUnlockedTier, PROFESSION_LABELS } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { GatherNode } from '../gameData/types';

// Shared by Mining, Herbalism, and Skinning — all three now run on the same
// 1-100 XP+Mastery engine (gameData/gatheringEngine.ts), so this one screen
// replaces what used to be two (the discrete skill-up GatheringScreen for
// Herbalism/Skinning and Mining's own Mastery-pilot MasteryGatheringScreen).
// Always uses the OFFLINE/batched resolver, even for a single ~20s autosave
// chunk — it's the one that correctly handles crossing a profession-level or
// Mastery-level mid-window, and a small chunk just means its batch loop runs
// once or twice.
export function GatheringScreen({ node }: { node: GatherNode }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedQuantity, setBankedQuantity] = useState(0);
  const [bankedBonusQuantity, setBankedBonusQuantity] = useState(0);
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
    setBankedBonusQuantity(0);
    anchorRef.current = character.currentActivity.startedAt;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

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
  }, [node.id]);

  function resourceLike(): GatheringResourceLike {
    return {
      itemId: node.itemId,
      baseXp: node.baseXp,
      secondsPerAction: node.secondsPerAction,
      requiredLevel: node.requiredLevel,
      rareBonus: node.rareBonus,
    };
  }

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const prof = getProfessionState(currentCharacter.professions, node.profession);
    const masteryState = prof.mastery?.[node.id] ?? { level: 0, xp: 0 };
    const cap = maxSkillForUnlockedTier(node.profession, prof.unlockedTier);
    const equippedTool = currentCharacter.equipment.tool ? ITEMS[currentCharacter.equipment.tool] : null;
    const toolBonusPct =
      equippedTool && node.requiredToolType && equippedTool.toolType === node.requiredToolType
        ? equippedTool.gatherBonusPct ?? 0
        : 0;

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

    if (result.quantityGained === 0 && result.rareBonusQuantity === 0 && result.professionXpGained === 0) return;

    const previousAnchor = anchor;
    const wholeQuantity = Math.floor(result.quantityGained);
    const wholeBonus = Math.floor(result.rareBonusQuantity);

    anchorRef.current = now;
    setBankedQuantity((prev) => prev + wholeQuantity);
    setBankedBonusQuantity((prev) => prev + wholeBonus);

    if (currentCharacter.notificationsEnabled && wholeQuantity > 0) {
      notify(`${ITEMS[node.itemId]?.name ?? node.itemId} gathered`, [`${wholeQuantity}x ${ITEMS[node.itemId]?.name ?? node.itemId}`]);
    }

    // A rough speculative estimate, superseded moments later by the
    // authoritative reconciliation below once the write succeeds.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        [node.profession]: {
          ...getProfessionState(c.professions, node.profession),
          level: result.finalSkill,
          xp: result.finalSkillXp,
          mastery: {
            ...getProfessionState(c.professions, node.profession).mastery,
            [node.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
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

      await applyGatheringProfessionResult(currentUser.uid, node.profession, node.id, {
        itemId: node.itemId,
        quantity: wholeQuantity,
        rareBonusItemId: node.rareBonus?.itemId,
        rareBonusQuantity: wholeBonus,
        newSkillLevel: result.finalSkill,
        newSkillXp: result.finalSkillXp,
        newMasteryLevel: result.finalMasteryLevel,
        newMasteryXp: result.finalMasteryXp,
      });

      const events = [{ type: 'gather' as const, itemId: node.itemId, count: wholeQuantity }];
      if (node.rareBonus && wholeBonus > 0) events.push({ type: 'gather' as const, itemId: node.rareBonus.itemId, count: wholeBonus });
      await advanceQuests(currentUser.uid, fresh, events);

      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: {
          ...fresh.professions,
          [node.profession]: {
            ...getProfessionState(fresh.professions, node.profession),
            level: result.finalSkill,
            xp: result.finalSkillXp,
            mastery: {
              ...getProfessionState(fresh.professions, node.profession).mastery,
              [node.id]: { level: result.finalMasteryLevel, xp: result.finalMasteryXp },
            },
          },
        },
        // Gathering never touches currentActivity.startedAt server-side, so
        // without refreshing it locally too it sits stale from whenever the
        // activity started, risking a isLongAbsence flicker.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
    } catch (err) {
      console.error('Gathering autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      setBankedQuantity((prev) => prev - wholeQuantity);
      setBankedBonusQuantity((prev) => prev - wholeBonus);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [node.profession]: getProfessionState(currentCharacter.professions, node.profession),
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

  const prof = getProfessionState(character.professions, node.profession);
  const masteryState = prof.mastery?.[node.id] ?? { level: 0, xp: 0 };
  const tier = gatheringColorTier(prof.level, node.requiredLevel);
  const xpPct = GATHERING_COLOR_XP_PCT[tier];
  const speedMult = gatheringMasterySpeedMultiplier(masteryState.level);
  const bonusChance = gatheringMasteryBonusChance(masteryState.level);
  const xpForNextSkillLevel = gatheringXpForNextLevel(prof.level);
  const xpForNextMasteryLevel = masteryState.level < MASTERY_MAX_LEVEL ? masteryXpForNextLevel(masteryState.level) : null;
  const label = PROFESSION_LABELS[node.profession];

  return (
    <div className="gathering-screen">
      <h2>
        {label}: {node.name}
      </h2>
      <TickBar seconds={node.secondsPerAction / speedMult} color="#6b4f2a" label={label} />
      <p>
        {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP
      </p>
      <p>
        This session: {bankedQuantity}x {ITEMS[node.itemId]?.name ?? node.itemId}
        {node.rareBonus && bankedBonusQuantity > 0 ? `, ${bankedBonusQuantity}x ${ITEMS[node.rareBonus.itemId]?.name ?? node.rareBonus.itemId}` : ''}
      </p>
      <p>
        {label} level: {prof.level} ({Math.floor(prof.xp)} / {xpForNextSkillLevel} XP)
      </p>
      <div className="profession-xp-bar-track">
        <div className="profession-xp-bar-fill" style={{ width: `${Math.min(100, (prof.xp / xpForNextSkillLevel) * 100)}%` }} />
      </div>
      <p>
        {ITEMS[node.itemId]?.name ?? node.itemId} Mastery: {masteryState.level}/{MASTERY_MAX_LEVEL}
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

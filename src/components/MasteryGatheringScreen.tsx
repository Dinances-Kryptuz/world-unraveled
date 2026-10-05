import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyMasteryGatheringResult, getCharacter, stopActivity, advanceQuests } from '../firebase/character';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import {
  resolveMasteryGatheringOffline,
  masteryColorTier,
  masterySpeedMultiplier,
  masteryBonusChance,
  masteryProfessionXpForNextLevel,
  masteryXpForNextLevel,
  MASTERY_MAX_LEVEL,
  MASTERY_COLOR_XP_PCT,
  type MasteryGatherNodeLike,
} from '../gameData/masteryEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { GatherNode } from '../gameData/types';

// Mining's pilot of the new XP+Mastery profession system — structurally
// parallel to GatheringScreen, but resolves through masteryEngine.ts
// instead of activityEngine's discrete skill-up-chance model. Always uses
// the OFFLINE/batched resolver, even for a single ~20s autosave chunk —
// it's the one that correctly handles crossing a skill or Mastery level-up
// mid-window, and a small chunk just means its batch loop runs once or
// twice. node.xpPerAction (dead for every other gathering profession, see
// types.ts) is repurposed here as the engine's baseProfessionXp input.
export function MasteryGatheringScreen({ node }: { node: GatherNode }) {
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

  function nodeLike(): MasteryGatherNodeLike {
    return {
      itemId: node.itemId,
      baseProfessionXp: node.xpPerAction,
      secondsPerAction: node.secondsPerAction,
      requiredLevel: node.requiredLevel,
      colorBreakpoints: node.colorBreakpoints,
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
    const cap = maxSkillForUnlockedTier(prof.unlockedTier);
    const equippedTool = currentCharacter.equipment.tool ? ITEMS[currentCharacter.equipment.tool] : null;
    const toolBonusPct =
      equippedTool && node.requiredToolType && equippedTool.toolType === node.requiredToolType
        ? equippedTool.gatherBonusPct ?? 0
        : 0;

    const result = resolveMasteryGatheringOffline(
      anchor,
      now,
      nodeLike(),
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
    // authoritative reconciliation below once the write succeeds — same
    // pattern as GatheringScreen's own optimistic update.
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
      // One read per cycle, done up front — see GatheringScreen's matching
      // comment for why this replaces separate reads of the same document
      // with exactly one (quests ARE reachable while this runs in the
      // background, so a stale local copy here risks silently reverting a
      // concurrent Accept/Complete Quest click).
      const fresh = await getCharacter(currentUser.uid);
      if (!fresh) throw new Error('Character not found during autosave');

      await applyMasteryGatheringResult(currentUser.uid, node.profession, node.id, {
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
        // See GatheringScreen's matching comment — gathering never touches
        // currentActivity.startedAt server-side, same latent isLongAbsence
        // flicker risk without refreshing it locally too.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
    } catch (err) {
      console.error('Mastery gathering autosave failed, will retry next cycle:', err);
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
  const tier = masteryColorTier(prof.level, node.colorBreakpoints);
  const xpPct = MASTERY_COLOR_XP_PCT[tier];
  const speedMult = masterySpeedMultiplier(masteryState.level);
  const bonusChance = masteryBonusChance(masteryState.level);
  const xpForNextSkillLevel = masteryProfessionXpForNextLevel(prof.level);
  const xpForNextMasteryLevel =
    masteryState.level < MASTERY_MAX_LEVEL ? masteryXpForNextLevel(masteryState.level) : null;

  return (
    <div className="gathering-screen">
      <h2>Mining: {node.name}</h2>
      <TickBar seconds={node.secondsPerAction / speedMult} color="#6b4f2a" label="Mining" />
      <p>
        {tier[0].toUpperCase() + tier.slice(1)} — {(xpPct * 100).toFixed(0)}% profession XP
      </p>
      <p>
        This session: {bankedQuantity}x {ITEMS[node.itemId]?.name ?? node.itemId}
        {node.rareBonus && bankedBonusQuantity > 0 ? `, ${bankedBonusQuantity}x ${ITEMS[node.rareBonus.itemId]?.name ?? node.rareBonus.itemId}` : ''}
      </p>
      <p>
        Mining skill: {prof.level} ({Math.floor(prof.xp)} / {xpForNextSkillLevel} XP)
      </p>
      <p>
        Mastery: {masteryState.level}/{MASTERY_MAX_LEVEL}
        {xpForNextMasteryLevel !== null ? ` (${Math.floor(masteryState.xp)} / ${xpForNextMasteryLevel} XP)` : ' (max)'}
        {' — '}+{((speedMult - 1) * 100).toFixed(0)}% speed, {(bonusChance * 100).toFixed(0)}% bonus yield
      </p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyGatheringResult, checkAndApplyProfessionLevelUp, stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { resolveGathering } from '../gameData/activityEngine';
import { professionXpForLevel } from '../gameData/xpTables';
import { getProfessionState } from '../gameData/professionTiers';
import { XpBar } from './XpBar';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { GatherNode } from '../gameData/types';

const AUTOSAVE_INTERVAL_SECONDS = 10;

export function GatheringScreen({ node }: { node: GatherNode }) {
  const { user } = useAuth();
  // ZoneScreen never renders GatheringScreen until it has confirmed a loaded
  // character, so this is always non-null in practice — but useCharacter()'s
  // type is nullable (it also serves the loading/logged-out states), and
  // this component's hooks (below) can't have an early return before them.
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedQuantity, setBankedQuantity] = useState(0);
  const [bankedXp, setBankedXp] = useState(0);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const carryRef = useRef(0); // fractional successful actions carried across chunks

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
    setBankedXp(0);
    anchorRef.current = character.currentActivity.startedAt;
    carryRef.current = 0;
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

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const currentSkill = getProfessionState(currentCharacter.professions, node.profession).level;
    const result = resolveGathering(anchor, now, node, currentSkill);

    if (result.actionsAttempted === 0) return;

    const previousAnchor = anchor;
    const previousCarry = carryRef.current;

    // quantityGained is fractional successful actions — carry the remainder
    // forward so a 60-95% success chance behaves probabilistically over
    // many chunks instead of resolving identically every single time.
    const total = carryRef.current + result.quantityGained;
    const wholeItems = Math.floor(total);
    carryRef.current = total - wholeItems;
    // Scaled by the node's current color-tier multiplier (see
    // GatherNodeResult.xpMultiplier's doc comment) — a grey node still
    // yields the material on every whole item, but 0 skill-up XP.
    const xpGained = wholeItems * node.xpPerAction * result.xpMultiplier;

    anchorRef.current = now;
    setBankedQuantity((prev) => prev + wholeItems);
    setBankedXp((prev) => prev + xpGained);

    if (wholeItems === 0) return; // nothing crossed a whole item yet, nothing to save

    // Bump the shared profession xp now, in the same tick as the banked
    // session totals above, so the Professions bar doesn't lag behind the
    // Firestore round-trip below.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        [node.profession]: {
          ...getProfessionState(c.professions, node.profession),
          xp: getProfessionState(c.professions, node.profession).xp + xpGained,
        },
      },
    }));

    try {
      await applyGatheringResult(currentUser.uid, node.profession, {
        xpGained,
        itemId: node.itemId,
        quantity: wholeItems,
      });
      await checkAndApplyProfessionLevelUp(currentUser.uid, node.profession);

      // Fetched fresh (not the possibly-stale characterRef) for the same
      // reason CombatScreen does before its own level-up check: applying
      // quest progress against stale quest state and writing it back would
      // silently lose any progress that landed in between.
      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        await advanceQuests(currentUser.uid, fresh, [{ type: 'gather', itemId: node.itemId, count: wholeItems }]);
      }

      await refetch();
    } catch (err) {
      console.error('Gathering autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      carryRef.current = previousCarry;
      setBankedQuantity((prev) => prev - wholeItems);
      setBankedXp((prev) => prev - xpGained);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [node.profession]: {
            ...getProfessionState(c.professions, node.profession),
            xp: getProfessionState(c.professions, node.profession).xp - xpGained,
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

  const currentSkill = getProfessionState(character.professions, node.profession).level;
  const sinceLastSave = anchorRef.current
    ? resolveGathering(anchorRef.current, new Date(), node, currentSkill)
    : { quantityGained: 0, xpGained: 0, actionsAttempted: 0, successfulActions: 0, successChance: 0, xpMultiplier: 0 };

  const previewWhole = Math.floor(carryRef.current + sinceLastSave.quantityGained);
  const displayQuantity = bankedQuantity + previewWhole;
  const displayXp = bankedXp + previewWhole * node.xpPerAction * sinceLastSave.xpMultiplier;
  const profession = getProfessionState(character.professions, node.profession);
  const liveXp = profession.xp + previewWhole * node.xpPerAction * sinceLastSave.xpMultiplier;

  return (
    <div className="gathering-screen">
      <h2>Gathering: {node.name}</h2>
      <TickBar seconds={node.secondsPerAction} color="#6b4f2a" label="Gathering" />
      <p>Success chance at your skill: {(sinceLastSave.successChance * 100).toFixed(0)}%</p>
      <p>
        This session: {displayQuantity} gathered, +{displayXp} XP
      </p>
      <XpBar
        level={profession.level}
        xp={liveXp}
        curve={professionXpForLevel}
        label={node.profession.charAt(0).toUpperCase() + node.profession.slice(1)}
      />
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

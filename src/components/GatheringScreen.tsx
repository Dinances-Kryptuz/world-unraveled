import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyGatheringResult, checkAndApplyProfessionLevelUp, stopActivity } from '../firebase/character';
import { resolveGathering } from '../gameData/activityEngine';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { GatherNode } from '../gameData/types';

const AUTOSAVE_INTERVAL_SECONDS = 10;

export function GatheringScreen({ node }: { node: GatherNode }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
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
    const currentSkill = currentCharacter.professions[node.profession].level;
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
    const xpGained = wholeItems * node.xpPerAction;

    anchorRef.current = now;
    setBankedQuantity((prev) => prev + wholeItems);
    setBankedXp((prev) => prev + xpGained);

    if (wholeItems === 0) return; // nothing crossed a whole item yet, nothing to save

    try {
      await applyGatheringResult(currentUser.uid, node.profession, {
        xpGained,
        itemId: node.itemId,
        quantity: wholeItems,
      });
      await checkAndApplyProfessionLevelUp(currentUser.uid, node.profession);
      await refetch();
    } catch (err) {
      console.error('Gathering autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      carryRef.current = previousCarry;
      setBankedQuantity((prev) => prev - wholeItems);
      setBankedXp((prev) => prev - xpGained);
    }
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character || !character.currentActivity.startedAt) return null;

  const currentSkill = character.professions[node.profession].level;
  const sinceLastSave = anchorRef.current
    ? resolveGathering(anchorRef.current, new Date(), node, currentSkill)
    : { quantityGained: 0, xpGained: 0, actionsAttempted: 0, successfulActions: 0, successChance: 0 };

  const previewWhole = Math.floor(carryRef.current + sinceLastSave.quantityGained);
  const displayQuantity = bankedQuantity + previewWhole;
  const displayXp = bankedXp + previewWhole * node.xpPerAction;

  return (
    <div className="gathering-screen">
      <h2>Gathering: {node.name}</h2>
      <p>Success chance at your skill: {(sinceLastSave.successChance * 100).toFixed(0)}%</p>
      <p>
        This session: {displayQuantity} gathered, +{displayXp} XP
      </p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

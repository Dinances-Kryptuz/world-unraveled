import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyGatheringResult, stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { resolveGathering } from '../gameData/activityEngine';
import { getProfessionState } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';
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
  const [bankedSkillups, setBankedSkillups] = useState(0);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const carryRef = useRef(0); // fractional successful actions carried across chunks
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
    setBankedQuantity(0);
    setBankedSkillups(0);
    anchorRef.current = character.currentActivity.startedAt;
    carryRef.current = 0;
    skillupCarryRef.current = 0;
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
    const previousSkillupCarry = skillupCarryRef.current;

    // quantityGained is fractional successful actions — carry the remainder
    // forward so a 60-95% success chance behaves probabilistically over
    // many chunks instead of resolving identically every single time.
    const total = carryRef.current + result.quantityGained;
    const wholeItems = Math.floor(total);
    carryRef.current = total - wholeItems;
    // Scaled by the node's current color-tier chance (see
    // GatherNodeResult.skillupChance's doc comment) — a grey node still
    // yields the material on every whole item, but 0% skill-up chance.
    const skillupTotal = skillupCarryRef.current + result.skillupsGained;
    const wholeSkillups = Math.floor(skillupTotal);
    skillupCarryRef.current = skillupTotal - wholeSkillups;

    anchorRef.current = now;
    setBankedQuantity((prev) => prev + wholeItems);
    setBankedSkillups((prev) => prev + wholeSkillups);

    if (wholeItems === 0) return; // nothing crossed a whole item yet, nothing to save

    if (currentCharacter.notificationsEnabled) {
      notify(`${ITEMS[node.itemId]?.name ?? node.itemId} gathered`, [`${wholeItems}x ${ITEMS[node.itemId]?.name ?? node.itemId}`]);
    }

    // Bump the shared profession skill now, in the same tick as the banked
    // session totals above, so the Professions bar doesn't lag behind the
    // Firestore round-trip below.
    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        [node.profession]: {
          ...getProfessionState(c.professions, node.profession),
          level: getProfessionState(c.professions, node.profession).level + wholeSkillups,
        },
      },
    }));

    try {
      await applyGatheringResult(currentUser.uid, node.profession, {
        skillupsGained: wholeSkillups,
        itemId: node.itemId,
        quantity: wholeItems,
      });

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
      skillupCarryRef.current = previousSkillupCarry;
      setBankedQuantity((prev) => prev - wholeItems);
      setBankedSkillups((prev) => prev - wholeSkillups);
      applyOptimisticUpdate((c) => ({
        ...c,
        professions: {
          ...c.professions,
          [node.profession]: {
            ...getProfessionState(c.professions, node.profession),
            level: getProfessionState(c.professions, node.profession).level - wholeSkillups,
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
    : { quantityGained: 0, skillupsGained: 0, actionsAttempted: 0, successfulActions: 0, successChance: 0, skillupChance: 0 };

  const previewWhole = Math.floor(carryRef.current + sinceLastSave.quantityGained);
  const displayQuantity = bankedQuantity + previewWhole;
  const displaySkillups = bankedSkillups + skillupCarryRef.current + sinceLastSave.skillupsGained;

  return (
    <div className="gathering-screen">
      <h2>Gathering: {node.name}</h2>
      <TickBar seconds={node.secondsPerAction} color="#6b4f2a" label="Gathering" />
      <p>Success chance at your skill: {(sinceLastSave.successChance * 100).toFixed(0)}%</p>
      <p>Skill-up chance per gather at your skill: {(sinceLastSave.skillupChance * 100).toFixed(0)}%</p>
      <p>
        This session: {displayQuantity} gathered, +{Math.floor(displaySkillups)} skill
      </p>
      <p>{node.profession.charAt(0).toUpperCase() + node.profession.slice(1)} skill: {currentSkill}</p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

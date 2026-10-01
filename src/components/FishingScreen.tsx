import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyFishingResult } from '../firebase/professions';
import { stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { resolveFishing, fishingSkillupChance } from '../gameData/activityEngine';
import { getProfessionState } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { FishingHole } from '../gameData/types';

const AUTOSAVE_INTERVAL_SECONDS = 10;

// Deliberately not reusing GatheringScreen — Fishing resolves a whole loot
// table per cast (not one guaranteed item) and banks whole SKILL POINTS
// directly rather than XP toward professionXpForLevel, so the progress
// display and the autosave payload are both shaped differently. See
// activityEngine.ts's resolveFishing doc comment for why.
export function FishingScreen({ hole }: { hole: FishingHole }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedCatches, setBankedCatches] = useState<Record<string, number>>({});
  const [bankedSkillups, setBankedSkillups] = useState(0);
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const catchCarryRef = useRef<Record<string, number>>({});
  const skillupCarryRef = useRef(0);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setBankedCatches({});
    setBankedSkillups(0);
    anchorRef.current = character.currentActivity.startedAt;
    catchCarryRef.current = {};
    skillupCarryRef.current = 0;
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

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const currentSkill = getProfessionState(currentCharacter.professions, 'fishing').level;
    const equippedTool = currentCharacter.equipment.tool ? ITEMS[currentCharacter.equipment.tool] : null;
    const toolBonusPct = equippedTool?.toolType === 'fishing_rod' ? equippedTool.gatherBonusPct ?? 0 : 0;
    const result = resolveFishing(anchor, now, hole, currentSkill, toolBonusPct);

    if (result.actionsAttempted === 0) return;

    const previousAnchor = anchor;
    const previousCatchCarry = { ...catchCarryRef.current };
    const previousSkillupCarry = skillupCarryRef.current;

    const wholeCatches: Record<string, number> = {};
    for (const c of result.catches) {
      const total = (catchCarryRef.current[c.itemId] ?? 0) + c.quantity;
      const whole = Math.floor(total);
      catchCarryRef.current[c.itemId] = total - whole;
      if (whole > 0) wholeCatches[c.itemId] = whole;
    }
    const skillupTotal = skillupCarryRef.current + result.skillupsGained;
    const wholeSkillups = Math.floor(skillupTotal);
    skillupCarryRef.current = skillupTotal - wholeSkillups;

    anchorRef.current = now;
    setBankedCatches((prev) => {
      const next = { ...prev };
      for (const [itemId, qty] of Object.entries(wholeCatches)) next[itemId] = (next[itemId] ?? 0) + qty;
      return next;
    });
    setBankedSkillups((prev) => prev + wholeSkillups);

    if (Object.keys(wholeCatches).length === 0 && wholeSkillups === 0) return;

    applyOptimisticUpdate((c) => ({
      ...c,
      professions: {
        ...c.professions,
        fishing: {
          ...getProfessionState(c.professions, 'fishing'),
          level: getProfessionState(c.professions, 'fishing').level + wholeSkillups,
        },
      },
    }));

    try {
      await applyFishingResult(currentUser.uid, {
        skillupsGained: wholeSkillups,
        catches: Object.entries(wholeCatches).map(([itemId, quantity]) => ({ itemId, quantity })),
      });

      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        const events = Object.entries(wholeCatches).map(([itemId, count]) => ({ type: 'gather' as const, itemId, count }));
        if (events.length > 0) await advanceQuests(currentUser.uid, fresh, events);
      }
      await refetch();
    } catch (err) {
      console.error('Fishing autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      catchCarryRef.current = previousCatchCarry;
      skillupCarryRef.current = previousSkillupCarry;
      setBankedCatches((prev) => {
        const next = { ...prev };
        for (const [itemId, qty] of Object.entries(wholeCatches)) next[itemId] = (next[itemId] ?? 0) - qty;
        return next;
      });
      setBankedSkillups((prev) => prev - wholeSkillups);
    }
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character.currentActivity.startedAt) return null;

  const currentSkill = getProfessionState(character.professions, 'fishing').level;
  const skillupChance = fishingSkillupChance(currentSkill);

  return (
    <div className="fishing-screen">
      <h2>Fishing: {hole.name}</h2>
      <TickBar seconds={hole.secondsPerAction} color="#2a5a6b" label="Casting" />
      <p>Skill-up chance per catch at your skill: {(skillupChance * 100).toFixed(0)}%</p>
      <p>
        This session: {Object.entries(bankedCatches).map(([id, qty]) => `${qty}x ${ITEMS[id]?.name ?? id}`).join(', ') || 'nothing yet'},{' '}
        +{bankedSkillups} skill
      </p>
      <p>Fishing skill: {currentSkill}</p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

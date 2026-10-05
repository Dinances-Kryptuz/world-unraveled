import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyFishingResult } from '../firebase/professions';
import { stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { resolveFishing, fishingSkillupChance, AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { ITEMS } from '../gameData/items';
import { notify } from '../utils/notifications';
import { TickBar } from './TickBar';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import type { FishingHole } from '../gameData/types';

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

    if (currentCharacter.notificationsEnabled) {
      for (const [itemId, quantity] of Object.entries(wholeCatches)) {
        notify(`${ITEMS[itemId]?.name ?? itemId} caught`, [`${quantity}x ${ITEMS[itemId]?.name ?? itemId}`]);
      }
    }

    // A rough speculative estimate, superseded moments later by the
    // authoritative reconciliation below once the write succeeds.
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
      // One read per cycle, done up front — see GatheringScreen's matching
      // comment for why this replaces three separate reads of the same
      // document (one inside applyFishingResult, one for quests, one in
      // refetch()) with exactly one.
      const fresh = await getCharacter(currentUser.uid);
      // Routes through the catch block below (rolling back the speculative
      // optimistic update and re-queuing this cycle's gains for retry)
      // rather than silently dropping them — see CombatScreen's matching
      // comment.
      if (!fresh) throw new Error('Character not found during autosave');
      const freshProf = getProfessionState(fresh.professions, 'fishing');

      await applyFishingResult(currentUser.uid, {
        skillupsGained: wholeSkillups,
        catches: Object.entries(wholeCatches).map(([itemId, quantity]) => ({ itemId, quantity })),
        currentLevel: freshProf.level,
        unlockedTier: freshProf.unlockedTier,
      });

      const events = Object.entries(wholeCatches).map(([itemId, count]) => ({ type: 'gather' as const, itemId, count }));
      if (events.length > 0) await advanceQuests(currentUser.uid, fresh, events);

      const cap = maxSkillForUnlockedTier(freshProf.unlockedTier);
      const newLevel = Math.min(cap, freshProf.level + wholeSkillups);
      applyOptimisticUpdate(() => ({
        ...fresh,
        professions: { ...fresh.professions, fishing: { ...freshProf, level: newLevel } },
        // See GatheringScreen's matching comment — fishing never touches
        // currentActivity.startedAt server-side either, same latent
        // isLongAbsence flicker risk without this.
        currentActivity: { ...fresh.currentActivity, startedAt: now },
      }));
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

  // Live preview since the last autosave, recomputed every render tick —
  // same pattern as GatheringScreen/CraftingScreen, so "This session" counts
  // up smoothly instead of jumping in a lump every autosave interval.
  const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
  const toolBonusPct = equippedTool?.toolType === 'fishing_rod' ? equippedTool.gatherBonusPct ?? 0 : 0;
  const sinceLastSave = anchorRef.current
    ? resolveFishing(anchorRef.current, new Date(), hole, currentSkill, toolBonusPct)
    : { catches: [], skillupsGained: 0, actionsAttempted: 0, catchChance: 0 };

  const displayCatches: Record<string, number> = { ...bankedCatches };
  for (const c of sinceLastSave.catches) {
    const previewQty = (catchCarryRef.current[c.itemId] ?? 0) + c.quantity;
    if (previewQty > 0) displayCatches[c.itemId] = (displayCatches[c.itemId] ?? 0) + previewQty;
  }
  const displaySkillups = bankedSkillups + skillupCarryRef.current + sinceLastSave.skillupsGained;

  return (
    <div className="fishing-screen">
      <h2>Fishing: {hole.name}</h2>
      <TickBar seconds={hole.secondsPerAction} color="#2a5a6b" label="Casting" />
      <p>Skill-up chance per catch at your skill: {(skillupChance * 100).toFixed(0)}%</p>
      <p>
        This session: {Object.entries(displayCatches).map(([id, qty]) => `${Math.floor(qty)}x ${ITEMS[id]?.name ?? id}`).join(', ') || 'nothing yet'},{' '}
        +{Math.floor(displaySkillups)} skill
      </p>
      <p>Fishing skill: {currentSkill}</p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

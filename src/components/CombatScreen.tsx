import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, stopActivity, getCharacter } from '../firebase/character';
import { MONSTERS } from '../gameData/monsters';
import { resolveSpecDef, computeFullCombatProfile, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { resolveCombatEncounter } from '../gameData/combatResolver';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
import { characterXpForLevelV2 } from '../gameData/xpTables';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';

const AUTOSAVE_INTERVAL_SECONDS = 10;

interface SessionTotals {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
}

const EMPTY_TOTALS: SessionTotals = { monstersDefeated: 0, xpGained: 0, goldGained: 0 };

export function CombatScreen({ monsterId }: { monsterId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedTotals, setBankedTotals] = useState<SessionTotals>(EMPTY_TOTALS);
  const [retreated, setRetreated] = useState(false);

  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const lootCarryRef = useRef<Record<string, number>>({});
  const hpRef = useRef<number | null>(null);
  const retreatedRef = useRef(false);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const monster = MONSTERS[monsterId];

  useEffect(() => {
    setBankedTotals(EMPTY_TOTALS);
    setRetreated(false);
    retreatedRef.current = false;
    anchorRef.current = character.currentActivity.startedAt;
    lootCarryRef.current = {};
    if (character.currentActivity.startedAt) {
      const charMaxHp = maxHp(character.class, character.level);
      hpRef.current = resolveCurrentHp(
        character.currentHp,
        charMaxHp,
        character.hpCheckpointAt,
        character.currentActivity.startedAt
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monsterId]);

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
  }, [monsterId]);

  function buildProfile(c: Character) {
    const specDef = resolveSpecDef(c.class, c.spec);
    const talentTotals = c.spec ? evaluateTalents(c.spec, c.talentPicks).totals : EMPTY_TALENT_TOTALS;
    const extraDmgTaken = getExtraDamageTakenPct(c.spec, c.talentPicks);
    return computeFullCombatProfile(c.class, specDef, c.level, monster.level, talentTotals, extraDmgTaken);
  }

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor || retreatedRef.current || hpRef.current === null) return;

    const now = new Date();
    const profile = buildProfile(currentCharacter);
    const result = resolveCombatEncounter(anchor, now, hpRef.current, profile, monster);

    if (result.monstersDefeated === 0 && !result.forcedRetreat) return;

    const previousCarry = { ...lootCarryRef.current };
    const lootToSave: { itemId: string; quantity: number }[] = [];
    for (const drop of result.loot) {
      const carry = lootCarryRef.current[drop.itemId] ?? 0;
      const total = carry + drop.quantity;
      const whole = Math.floor(total);
      lootCarryRef.current[drop.itemId] = total - whole;
      if (whole > 0) lootToSave.push({ itemId: drop.itemId, quantity: whole });
    }

    const previousAnchor = anchor;
    const previousHp = hpRef.current;
    anchorRef.current = now;
    hpRef.current = result.hpAfter;
    setBankedTotals((prev) => ({
      monstersDefeated: prev.monstersDefeated + result.monstersDefeated,
      xpGained: prev.xpGained + Math.round(result.xpGained),
      goldGained: prev.goldGained + Math.round(result.goldGained),
    }));

    try {
      await applyCombatResult(currentUser.uid, {
        xpGained: Math.round(result.xpGained),
        goldGained: Math.round(result.goldGained),
        loot: lootToSave,
        hpAfter: result.hpAfter,
      });

      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        let newLevel = fresh.level;
        while (fresh.xp >= characterXpForLevelV2(newLevel + 1)) {
          newLevel++;
        }
        if (newLevel !== fresh.level) {
          const restoredHp = maxHp(fresh.class, newLevel);
          await setCharacterLevel(currentUser.uid, newLevel, restoredHp);
          hpRef.current = restoredHp;
        }
      }

      await refetch();

      if (result.forcedRetreat) {
        retreatedRef.current = true;
        setRetreated(true);
      }
    } catch (err) {
      console.error('Combat autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      hpRef.current = previousHp;
      lootCarryRef.current = previousCarry;
      setBankedTotals((prev) => ({
        monstersDefeated: prev.monstersDefeated - result.monstersDefeated,
        xpGained: prev.xpGained - Math.round(result.xpGained),
        goldGained: prev.goldGained - Math.round(result.goldGained),
      }));
    }
  }

  async function handleStop() {
    if (!retreatedRef.current) await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character || !character.currentActivity.startedAt || hpRef.current === null) return null;

  const profile = buildProfile(character);
  const sinceLastSave =
    anchorRef.current && !retreated
      ? resolveCombatEncounter(anchorRef.current, new Date(), hpRef.current, profile, monster)
      : { monstersDefeated: 0, xpGained: 0, goldGained: 0 };

  const displayTotals: SessionTotals = {
    monstersDefeated: bankedTotals.monstersDefeated + sinceLastSave.monstersDefeated,
    xpGained: bankedTotals.xpGained + Math.round(sinceLastSave.xpGained),
    goldGained: bankedTotals.goldGained + Math.round(sinceLastSave.goldGained),
  };

  return (
    <div className="combat-screen">
      <h2>Fighting {monster.name}</h2>
      {retreated ? (
        <p>
          You were forced to retreat! This session: {displayTotals.monstersDefeated} defeated, +
          {displayTotals.xpGained} XP, +{displayTotals.goldGained} gold. Your HP will recover over time.
        </p>
      ) : (
        <p>
          This session: {displayTotals.monstersDefeated} defeated, +{displayTotals.xpGained} XP, +
          {displayTotals.goldGained} gold — HP: {Math.round(hpRef.current)} / {Math.round(profile.playerMaxHp)}
        </p>
      )}
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

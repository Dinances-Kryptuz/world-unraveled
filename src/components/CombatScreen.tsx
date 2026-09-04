import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, stopActivity, getCharacter } from '../firebase/character';
import { resolveCombat } from '../gameData/activityEngine';
import { characterXpForLevel } from '../gameData/xpTables';
import { MONSTERS } from '../gameData/monsters';
import { derivePlayerCombatStats } from '../utils/playerStats';
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
  const anchorRef = useRef<Date | null>(character.currentActivity.startedAt);
  const lootCarryRef = useRef<Record<string, number>>({});

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
    anchorRef.current = character.currentActivity.startedAt;
    lootCarryRef.current = {};
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

  async function autosave() {
    const currentUser = userRef.current;
    const currentCharacter = characterRef.current;
    const anchor = anchorRef.current;
    if (!currentUser || !currentCharacter || !anchor) return;

    const now = new Date();
    const { attackPower, attackIntervalSeconds } = derivePlayerCombatStats(currentCharacter);
    const result = resolveCombat(anchor, now, monster, attackPower, attackIntervalSeconds);

    if (result.monstersDefeated === 0) return;

    // Turn this chunk's fractional expected loot into whole items to save,
    // carrying leftover fractions forward so low-probability drops still
    // add up correctly over many chunks instead of rounding to zero every time.
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
    anchorRef.current = now;
    setBankedTotals((prev) => ({
      monstersDefeated: prev.monstersDefeated + result.monstersDefeated,
      xpGained: prev.xpGained + result.xpGained,
      goldGained: prev.goldGained + result.goldGained,
    }));

    try {
      await applyCombatResult(currentUser.uid, {
        xpGained: result.xpGained,
        goldGained: result.goldGained,
        loot: lootToSave,
      });

      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        let newLevel = fresh.level;
        while (fresh.xp >= characterXpForLevel(newLevel + 1)) {
          newLevel++;
        }
        if (newLevel !== fresh.level) {
          await setCharacterLevel(currentUser.uid, newLevel);
        }
      }

      await refetch();
    } catch (err) {
      console.error('Autosave failed, will retry next cycle:', err);
      anchorRef.current = previousAnchor;
      lootCarryRef.current = previousCarry;
      setBankedTotals((prev) => ({
        monstersDefeated: prev.monstersDefeated - result.monstersDefeated,
        xpGained: prev.xpGained - result.xpGained,
        goldGained: prev.goldGained - result.goldGained,
      }));
    }
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character || !character.currentActivity.startedAt) return null;

  const { attackPower, attackIntervalSeconds } = derivePlayerCombatStats(character);
  const sinceLastSave = anchorRef.current
    ? resolveCombat(anchorRef.current, new Date(), monster, attackPower, attackIntervalSeconds)
    : { monstersDefeated: 0, xpGained: 0, goldGained: 0 };

  const displayTotals: SessionTotals = {
    monstersDefeated: bankedTotals.monstersDefeated + sinceLastSave.monstersDefeated,
    xpGained: bankedTotals.xpGained + Math.round(sinceLastSave.xpGained),
    goldGained: bankedTotals.goldGained + Math.round(sinceLastSave.goldGained),
  };

  return (
    <div className="combat-screen">
      <h2>Fighting {monster.name}</h2>
      <p>
        This session: {displayTotals.monstersDefeated} defeated, +{displayTotals.xpGained} XP, +
        {displayTotals.goldGained} gold
      </p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

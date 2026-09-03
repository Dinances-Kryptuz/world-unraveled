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

export function CombatScreen({ monsterId }: { monsterId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  // These refs always hold the latest character/user so the autosave timer
  // (set up once below) reads fresh data every time it fires, instead of
  // recalculating from an increasingly-stale starting point.
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
    if (!currentUser || !currentCharacter || !currentCharacter.currentActivity.startedAt) return;

    const { attackPower, attackIntervalSeconds } = derivePlayerCombatStats(currentCharacter);
    const result = resolveCombat(
      currentCharacter.currentActivity.startedAt,
      new Date(),
      monster,
      attackPower,
      attackIntervalSeconds
    );

    if (result.monstersDefeated === 0) return;

    await applyCombatResult(currentUser.uid, {
      xpGained: result.xpGained,
      goldGained: result.goldGained,
      loot: result.loot,
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
  }

  async function handleStop() {
    await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  if (!character || !character.currentActivity.startedAt) return null;

  const { attackPower, attackIntervalSeconds } = derivePlayerCombatStats(character);
  const liveResult = resolveCombat(
    character.currentActivity.startedAt,
    new Date(),
    monster,
    attackPower,
    attackIntervalSeconds
  );

  return (
    <div className="combat-screen">
      <h2>Fighting {monster.name}</h2>
      <p>
        This session: {liveResult.monstersDefeated} defeated, +{liveResult.xpGained} XP, +
        {liveResult.goldGained} gold
      </p>
      <button onClick={handleStop}>Stop</button>
    </div>
  );
}

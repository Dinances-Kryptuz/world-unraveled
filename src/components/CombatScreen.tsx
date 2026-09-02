import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, stopActivity, getCharacter } from '../firebase/character';
import { resolveCombat } from '../gameData/activityEngine';
import { characterXpForLevel } from '../gameData/xpTables';
import { MONSTERS } from '../gameData/monsters';
import { derivePlayerCombatStats } from '../utils/playerStats';

const AUTOSAVE_INTERVAL_SECONDS = 10;

export function CombatScreen({ monsterId }: { monsterId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [, setTick] = useState(0); // forces a re-render every second for the live display
  const secondsSinceSaveRef = useRef(0);

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
    if (!user || !character || !character.currentActivity.startedAt) return;

    const { attackPower, attackIntervalSeconds } = derivePlayerCombatStats(character);
    const result = resolveCombat(
      character.currentActivity.startedAt,
      new Date(),
      monster,
      attackPower,
      attackIntervalSeconds
    );

    if (result.monstersDefeated === 0) return; // nothing to save yet

    await applyCombatResult(user.uid, {
      xpGained: result.xpGained,
      goldGained: result.goldGained,
      loot: result.loot,
    });

    const fresh = await getCharacter(user.uid);
    if (fresh) {
      let newLevel = fresh.level;
      while (fresh.xp >= characterXpForLevel(newLevel + 1)) {
        newLevel++;
      }
      if (newLevel !== fresh.level) {
        await setCharacterLevel(user.uid, newLevel);
      }
    }

    await refetch();
  }

  async function handleStop() {
    await autosave(); // flush any unsaved progress first
    if (user) await stopActivity(user.uid);
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

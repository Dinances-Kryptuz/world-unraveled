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

  // Running total across autosaves — each autosave "banks" its chunk in
  // here rather than the display resetting to zero when startedAt resets.
  const [bankedTotals, setBankedTotals] = useState<SessionTotals>(EMPTY_TOTALS);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const monster = MONSTERS[monsterId];

  // Reset the running total whenever you start fighting a different monster.
  useEffect(() => {
    setBankedTotals(EMPTY_TOTALS);
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
    if (!currentUser || !currentCharacter || !currentCharacter.currentActivity.startedAt) return;

    const { attackPower, attackIntervalSeconds } =

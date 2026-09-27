import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { getCharacter } from '../firebase/character';
import type { Character } from '../types/character';

interface CharacterContextValue {
  character: Character | null;
  loading: boolean;
  refetch: () => Promise<void>;
  // Bumps the shared character state immediately, in the same tick as a
  // screen's own local "session" counters, instead of waiting on the
  // autosave's Firestore round-trip. The subsequent refetch() after that
  // write still reconciles with the real saved value (picking up level-ups,
  // correcting for any drift), but the header no longer visibly lags a
  // beat behind the screen that just earned the XP/gold.
  applyOptimisticUpdate: (updater: (character: Character) => Character) => void;
}

const CharacterContext = createContext<CharacterContextValue>({
  character: null,
  loading: true,
  refetch: async () => {},
  applyOptimisticUpdate: () => {},
});

export function CharacterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  // showLoading=true only for the very first load (so the user sees a
  // loading screen once). Background refetches (autosave, etc.) update the
  // data silently without hiding the UI in between.
  async function load(showLoading: boolean) {
    if (!user) {
      setCharacter(null);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const loaded = await getCharacter(user.uid);
    setCharacter(loaded);
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function applyOptimisticUpdate(updater: (character: Character) => Character) {
    setCharacter((prev) => (prev ? updater(prev) : prev));
  }

  return (
    <CharacterContext.Provider value={{ character, loading, refetch: () => load(false), applyOptimisticUpdate }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter(): CharacterContextValue {
  return useContext(CharacterContext);
}

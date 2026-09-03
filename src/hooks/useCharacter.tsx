import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { getCharacter } from '../firebase/character';
import type { Character } from '../types/character';

interface CharacterContextValue {
  character: Character | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CharacterContext = createContext<CharacterContextValue>({
  character: null,
  loading: true,
  refetch: async () => {},
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

  return (
    <CharacterContext.Provider value={{ character, loading, refetch: () => load(false) }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter(): CharacterContextValue {
  return useContext(CharacterContext);
}

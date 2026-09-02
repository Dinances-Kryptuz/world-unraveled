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

  async function load() {
    if (!user) {
      setCharacter(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loaded = await getCharacter(user.uid);
    setCharacter(loaded);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Deliberately only re-runs when the signed-in user changes — refetch()
    // is exposed separately for the moment right after character creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <CharacterContext.Provider value={{ character, loading, refetch: load }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter(): CharacterContextValue {
  return useContext(CharacterContext);
}

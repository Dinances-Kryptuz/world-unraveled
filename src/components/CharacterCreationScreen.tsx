import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { createCharacter } from '../firebase/character';

export function CharacterCreationScreen() {
  const { user } = useAuth();
  const { refetch } = useCharacter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Name must be 2-20 characters.');
      return;
    }
    if (!user) return;

    setCreating(true);
    setError(null);
    try {
      await createCharacter(user.uid, trimmed);
      await refetch(); // pulls the new character doc so App.tsx routes onward
    } catch (err) {
      console.error('Character creation failed:', err);
      setError('Something went wrong creating your character. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="character-creation">
      <h1>Create Your Adventurer</h1>
      <p>Your journey into Greenhollow Fields begins here.</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Character name"
        maxLength={20}
        disabled={creating}
      />
      <button onClick={handleCreate} disabled={creating || name.trim().length === 0}>
        {creating ? 'Creating…' : 'Begin Adventure'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

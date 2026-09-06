import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { createCharacter } from '../firebase/character';
import type { ClassId } from '../gameData/classStats';

const CLASS_OPTIONS: { id: ClassId; name: string; blurb: string }[] = [
  { id: 'warrior', name: 'Warrior', blurb: 'Melee damage or tank. High strength and stamina.' },
  { id: 'priest', name: 'Priest', blurb: 'Shadow damage or holy healer. High intellect and spirit.' },
  { id: 'paladin', name: 'Paladin', blurb: 'Tank or holy healer. Balanced across all stats.' },
];

export function CharacterCreationScreen() {
  const { user } = useAuth();
  const { refetch } = useCharacter();
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Name must be 2-20 characters.');
      return;
    }
    if (!selectedClass) {
      setError('Choose a class first.');
      return;
    }
    if (!user) return;

    setCreating(true);
    setError(null);
    try {
      await createCharacter(user.uid, trimmed, selectedClass);
      await refetch();
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

      <h3>Choose a class</h3>
      <ul>
        {CLASS_OPTIONS.map((opt) => (
          <li key={opt.id}>
            <div>
              <strong>{opt.name}</strong> — {opt.blurb}
            </div>
            <button
              onClick={() => setSelectedClass(opt.id)}
              disabled={creating}
              style={{ opacity: selectedClass === opt.id ? 1 : 0.6 }}
            >
              {selectedClass === opt.id ? 'Selected' : 'Choose'}
            </button>
          </li>
        ))}
      </ul>

      <button onClick={handleCreate} disabled={creating || name.trim().length === 0 || !selectedClass}>
        {creating ? 'Creating…' : 'Begin Adventure'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

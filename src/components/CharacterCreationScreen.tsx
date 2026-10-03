import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { createCharacter } from '../firebase/character';
import type { ClassId } from '../gameData/classStats';
import { CLASS_SHOWCASE, CLASS_ICONS, SPEC_ICONS, SPEC_INFO } from '../gameData/classInfo';
import { PreGameShell } from './PreGameShell';

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
    <PreGameShell>
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
        <div className="class-showcase-grid">
          {CLASS_SHOWCASE.map((cls) => {
            const selected = selectedClass === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                className={`class-card class-card-selectable${selected ? ' class-card-selected' : ''}`}
                onClick={() => setSelectedClass(cls.id)}
                disabled={creating}
              >
                <div className="class-card-header">
                  <span className="class-card-icon">{CLASS_ICONS[cls.id]}</span>
                  <strong>{cls.name}</strong>
                  {selected && <span className="class-card-selected-badge">Selected</span>}
                </div>
                <p className="class-card-blurb">{cls.blurb}</p>
                <div className="class-card-specs">
                  {cls.specs.map((specId) => (
                    <div key={specId} className="spec-chip" title={SPEC_INFO[specId].blurb}>
                      <span className="spec-chip-icon">{SPEC_ICONS[specId]}</span>
                      <span>
                        <strong>{SPEC_INFO[specId].label}</strong>
                        <small>{SPEC_INFO[specId].blurb}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={handleCreate} disabled={creating || name.trim().length === 0 || !selectedClass}>
          {creating ? 'Creating…' : 'Begin Adventure'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </PreGameShell>
  );
}

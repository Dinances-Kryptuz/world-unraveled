import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { createCharacter } from '../firebase/character';
import type { ClassId, SpecId } from '../gameData/classStats';
import { CLASS_SHOWCASE, CLASS_ICONS, SPEC_ICONS, SPEC_INFO } from '../gameData/classInfo';
import { PreGameShell } from './PreGameShell';

// Resolves to /class-art/{classId}.<ext> by convention — same approach as
// MonsterPortrait.tsx's art (tries .webp then .png, falls back to the emoji
// glyph + blurb). See public/class-art/README.md for the art spec.
const ART_EXTENSIONS = ['webp', 'png'];

function ClassStorybookArt({ classId }: { classId: ClassId }) {
  const [extIndex, setExtIndex] = useState(0);
  if (extIndex >= ART_EXTENSIONS.length) {
    return (
      <div className="storybook-art-fallback">
        <span className="storybook-art-fallback-icon">{CLASS_ICONS[classId]}</span>
      </div>
    );
  }
  return (
    <img
      className="storybook-art-img"
      key={classId}
      src={`/class-art/${classId}.${ART_EXTENSIONS[extIndex]}`}
      alt=""
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}

// First login and any time a player somehow lands back on character
// creation (see App.tsx's `!character` gate) — a paged "storybook" flow,
// one class per page (Warrior -> Priest -> Paladin, CLASS_SHOWCASE's own
// order), arrow-navigable, each page showing that class's artwork and
// exactly 2 buttons: one per spec. Picking a spec button selects class AND
// spec together immediately — there's no separate later spec-choice screen
// anymore (SpecSelectionScreen was removed; see App.tsx and the user's
// answered design question on this).
export function CharacterCreationScreen() {
  const { user } = useAuth();
  const { refetch } = useCharacter();
  const [name, setName] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSpec, setSelectedSpec] = useState<SpecId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const entry = CLASS_SHOWCASE[page];
  const selectedClass: ClassId | null = selectedSpec
    ? CLASS_SHOWCASE.find((c) => c.specs.includes(selectedSpec))!.id
    : null;

  function goTo(nextPage: number) {
    if (nextPage < 0 || nextPage >= CLASS_SHOWCASE.length) return;
    setPage(nextPage);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Name must be 2-20 characters.');
      return;
    }
    if (!selectedClass || !selectedSpec) {
      setError('Choose a specialization first.');
      return;
    }
    if (!user) return;

    setCreating(true);
    setError(null);
    try {
      await createCharacter(user.uid, trimmed, selectedClass, selectedSpec);
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
      <div className="character-creation storybook-creation">
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

        <div className="storybook-page">
          <button
            type="button"
            className="storybook-arrow storybook-arrow-prev"
            onClick={() => goTo(page - 1)}
            disabled={page === 0 || creating}
            aria-label="Previous class"
          >
            ‹
          </button>

          <div className="storybook-card">
            <ClassStorybookArt classId={entry.id} />
            <h2 className="storybook-class-name">
              <span className="storybook-class-icon">{CLASS_ICONS[entry.id]}</span> {entry.name}
            </h2>
            <p className="storybook-class-blurb">{entry.blurb}</p>
            <div className="storybook-spec-buttons">
              {entry.specs.map((specId) => {
                const info = SPEC_INFO[specId];
                const selected = selectedSpec === specId;
                return (
                  <button
                    key={specId}
                    type="button"
                    className={`storybook-spec-button${selected ? ' storybook-spec-button-selected' : ''}`}
                    onClick={() => setSelectedSpec(specId)}
                    disabled={creating}
                  >
                    <span className="storybook-spec-icon">{SPEC_ICONS[specId]}</span>
                    <strong>{info.label}</strong>
                    <small>{info.blurb}</small>
                    {selected && <span className="storybook-spec-selected-badge">Selected</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="storybook-arrow storybook-arrow-next"
            onClick={() => goTo(page + 1)}
            disabled={page === CLASS_SHOWCASE.length - 1 || creating}
            aria-label="Next class"
          >
            ›
          </button>
        </div>

        <div className="storybook-page-dots">
          {CLASS_SHOWCASE.map((c, i) => (
            <span key={c.id} className={`storybook-page-dot${i === page ? ' storybook-page-dot-active' : ''}`} />
          ))}
        </div>

        <button onClick={handleCreate} disabled={creating || name.trim().length === 0 || !selectedSpec}>
          {creating ? 'Creating…' : 'Begin Adventure'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </PreGameShell>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { createCharacter } from '../firebase/character';
import type { ClassId, SpecId } from '../gameData/classStats';
import { CLASS_SHOWCASE, CLASS_ICONS, SPEC_ICONS, SPEC_INFO, SPEC_THEME } from '../gameData/classInfo';
import { PreGameShell } from './PreGameShell';

// Resolves to /class-art/{classId}.<ext> by convention — same approach as
// MonsterPortrait.tsx's art (tries .webp then .png, falls back to the emoji
// glyph + blurb). See public/class-art/README.md for the art spec.
const ART_EXTENSIONS = ['webp', 'png'];

// `onArtAvailability` lets the parent know whether real artwork is showing
// (so it can overlay the two Select buttons directly on the art, matching
// its own dual-spec layout and colors) or only the emoji fallback (so it
// falls back to the old full text+button layout instead, since there'd be
// nothing to overlay onto). Reports true as soon as the image loads, false
// only once every extension has failed.
function ClassStorybookArt({
  classId,
  onArtAvailability,
}: {
  classId: ClassId;
  onArtAvailability: (ok: boolean) => void;
}) {
  const [extIndex, setExtIndex] = useState(0);
  useEffect(() => {
    if (extIndex >= ART_EXTENSIONS.length) onArtAvailability(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extIndex]);
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
      src={`/class-art/${classId}.${ART_EXTENSIONS[extIndex]}`}
      alt=""
      onLoad={() => onArtAvailability(true)}
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
  // Optimistic per-page guess, confirmed/corrected by ClassStorybookArt's
  // onArtAvailability once its image actually loads or every extension has
  // failed — see that component's own doc comment. Reset on every page
  // change so a prior class's confirmed state never leaks into the next.
  const [hasArt, setHasArt] = useState(true);

  useEffect(() => {
    setHasArt(true);
  }, [page]);

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
            <div className="storybook-art-wrap">
              <ClassStorybookArt key={entry.id} classId={entry.id} onArtAvailability={setHasArt} />
              {hasArt && (
                <div className="storybook-art-select-overlay">
                  {entry.specs.map((specId) => {
                    const theme = SPEC_THEME[specId];
                    const selected = selectedSpec === specId;
                    return (
                      <button
                        key={specId}
                        type="button"
                        className={`storybook-select-overlay-btn${selected ? ' storybook-select-overlay-btn-selected' : ''}`}
                        style={{
                          left: theme?.side === 'right' ? '75%' : '25%',
                          background: theme?.bg,
                          borderColor: theme?.border,
                          color: theme?.text,
                        }}
                        onClick={() => setSelectedSpec(specId)}
                        disabled={creating}
                        title={`${SPEC_INFO[specId].label} — ${SPEC_INFO[specId].blurb}`}
                      >
                        {selected ? '✓ Selected' : 'Select'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real art already carries the class name, spec names, and
                blurbs baked into the image itself — this text block is only
                needed as a readable fallback when no art loaded. */}
            {!hasArt && (
              <>
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
              </>
            )}
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

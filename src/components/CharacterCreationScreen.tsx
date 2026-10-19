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

// Purely decorative corner brackets for the panel frame — a single
// top-left bracket+diamond, mirrored via CSS transform into the other 3
// corners (see .cc-corner-* in index.css) rather than drawing 4 separate
// paths. aria-hidden since it carries no information of its own.
function CornerOrnament({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  return (
    <svg className={`cc-corner cc-corner-${position}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M2 14 V2 H14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="0.2" y="0.2" width="3.6" height="3.6" transform="rotate(45 2 2)" fill="currentColor" />
    </svg>
  );
}

// One of the two buttons flanking Begin Adventure (only rendered when real
// art is showing — see CharacterCreationScreen's own render). Colored via
// that spec's SPEC_THEME entry so it still reads as belonging to the
// matching half of the artwork, even though it no longer sits on top of it.
function SpecSelectButton({
  specId,
  selected,
  disabled,
  onSelect,
}: {
  specId: SpecId;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const theme = SPEC_THEME[specId];
  return (
    <button
      type="button"
      className={`cc-spec-select-btn${selected ? ' cc-spec-select-btn-selected' : ''}`}
      style={{ background: theme?.bg, borderColor: theme?.border, color: theme?.text }}
      onClick={onSelect}
      disabled={disabled}
      title={SPEC_INFO[specId].blurb}
    >
      {selected ? '✓ ' : ''}
      {SPEC_INFO[specId].label}
    </button>
  );
}

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
  const canBegin = !creating && name.trim().length > 0 && !!selectedSpec;

  // The two Begin-Adventure-flanking spec buttons use each spec's own
  // SPEC_THEME `side` (not CLASS_SHOWCASE.specs' array order — see
  // classInfo.ts's own comment on why those can differ) so a button's color
  // still matches the half of the artwork it picks, even though it no
  // longer sits on top of that half.
  const leftSpec = entry.specs.find((s) => SPEC_THEME[s]?.side === 'left') ?? entry.specs[0];
  const rightSpec = entry.specs.find((s) => SPEC_THEME[s]?.side === 'right') ?? entry.specs[1];

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
        <CornerOrnament position="top-left" />
        <CornerOrnament position="top-right" />
        <CornerOrnament position="bottom-left" />
        <CornerOrnament position="bottom-right" />

        <h1>Create Your Adventurer</h1>
        <div className="cc-title-divider" aria-hidden="true" />
        <p className="cc-subtitle">Your journey into Greenhollow Fields begins here.</p>

        <label htmlFor="character-name" className="cc-label">
          Character Name
        </label>
        <input
          id="character-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
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

          <div className={`storybook-card${hasArt ? ' storybook-card-flush' : ''}`}>
            <div className="storybook-art-wrap">
              <ClassStorybookArt key={entry.id} classId={entry.id} onArtAvailability={setHasArt} />
            </div>

            {/* The art's own baked-in role name/blurb text becomes too
                small to read once the image shrinks down on a phone screen
                — this duplicates it as real, readable HTML text, hidden
                above the mobile breakpoint (see .cc-mobile-spec-descriptions
                in index.css) where the full-size art already covers it. */}
            {hasArt && (
              <div className="cc-mobile-spec-descriptions">
                {entry.specs.map((specId) => (
                  <div key={specId} className="cc-mobile-spec-desc">
                    <strong>{SPEC_INFO[specId].label}</strong>
                    <span>{SPEC_INFO[specId].blurb}</span>
                  </div>
                ))}
              </div>
            )}

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

        {/* Spec choice now lives here, flanking Begin Adventure, instead of
            overlaid on the art — each button keeps that spec's SPEC_THEME
            colors (so it still reads as "the red-bordered one is the DPS
            half") but is labeled with its actual role instead of a generic
            "Select". Only shown with real art loaded; the no-art fallback
            above already has its own full spec buttons. */}
        <div className="cc-action-row">
          {hasArt && (
            <SpecSelectButton
              specId={leftSpec}
              selected={selectedSpec === leftSpec}
              disabled={creating}
              onSelect={() => setSelectedSpec(leftSpec)}
            />
          )}

          <button type="button" className="cc-begin-button" onClick={handleCreate} disabled={!canBegin}>
            {creating ? 'Creating…' : 'Begin Adventure'}
          </button>

          {hasArt && (
            <SpecSelectButton
              specId={rightSpec}
              selected={selectedSpec === rightSpec}
              disabled={creating}
              onSelect={() => setSelectedSpec(rightSpec)}
            />
          )}
        </div>
        {error ? (
          <p className="error">{error}</p>
        ) : (
          !canBegin && <p className="cc-begin-hint">Enter a name and select a specialization.</p>
        )}
      </div>
    </PreGameShell>
  );
}

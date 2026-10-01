import { signOut } from '../firebase/auth';
import { CLASS_LABELS, SPEC_LABELS } from '../gameData/classStats';
import type { Character } from '../types/character';

// The one thing visible no matter which sidebar section is open — who you
// are, your HP, and your XP progress. Extracted as-is from the old
// always-at-the-top header so sign-out and the XP bar keep working exactly
// as before; only the surrounding layout changed.
export function TopBar({
  character,
  currentHp,
  characterMaxHp,
  xpIntoLevel,
  xpNeededForLevel,
  xpProgressPct,
}: {
  character: Character;
  currentHp: number;
  characterMaxHp: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  xpProgressPct: number;
}) {
  return (
    <div className="top-bar">
      <div className="top-bar-identity">
        <strong>{character.name}</strong> — {CLASS_LABELS[character.class]}
        {character.spec ? ` (${SPEC_LABELS[character.spec]})` : ''} — Level {character.level}
      </div>
      <div className="top-bar-stats">
        <span>{Math.round(character.gold)} gold</span>
        {character.voidShards > 0 && <span>{character.voidShards} Void Shards</span>}
        <span>
          HP {Math.round(currentHp)} / {Math.round(characterMaxHp)}
        </span>
      </div>
      <div className="top-bar-xp">
        <div className="top-bar-xp-track">
          <div
            className="top-bar-xp-fill"
            style={{ width: `${xpProgressPct}%`, background: 'var(--zone-primary)' }}
          />
        </div>
        <small>
          {Math.round(xpIntoLevel).toLocaleString()} / {Math.round(xpNeededForLevel).toLocaleString()} XP to level{' '}
          {character.level + 1} ({xpProgressPct.toFixed(1)}%)
        </small>
      </div>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}

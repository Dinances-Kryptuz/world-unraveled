import { signOut } from '../firebase/auth';
import { CLASS_LABELS, SPEC_LABELS } from '../gameData/classStats';
import { ZONES, isZoneUnlocked } from '../gameData/zones';
import type { Character } from '../types/character';

// The one thing visible no matter which sidebar section is open — who you
// are, your HP, your XP progress, and which zone you're currently "in."
// The zone selector lives here (not just on the Adventure page) because
// Professions and Shop are both zone-scoped too (gathering nodes, the
// fishing hole, trainers, and vendor stock are all per-zone) — without a
// zone switcher reachable from those pages, there'd be no way to check a
// different zone's shop without detouring back through Adventure first.
export function TopBar({
  character,
  currentHp,
  characterMaxHp,
  xpIntoLevel,
  xpNeededForLevel,
  xpProgressPct,
  selectedZoneId,
  onSelectZone,
}: {
  character: Character;
  currentHp: number;
  characterMaxHp: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  xpProgressPct: number;
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
}) {
  return (
    <div className="top-bar">
      <div className="top-bar-main">
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
      <div className="zone-tabs top-bar-zone-tabs">
        {Object.values(ZONES).map((z) => {
          const unlocked = isZoneUnlocked(z, character.level);
          const isCurrent = z.id === selectedZoneId;
          return (
            <button
              key={z.id}
              className="zone-tab"
              onClick={() => unlocked && onSelectZone(z.id)}
              disabled={!unlocked}
              title={unlocked ? undefined : `Unlocks at level ${z.unlockRequirement.type === 'characterLevel' ? z.unlockRequirement.level : '?'}`}
              style={isCurrent ? { background: 'var(--zone-primary)', color: '#fff' } : undefined}
            >
              {z.name}
              {!unlocked && z.unlockRequirement.type === 'characterLevel' ? ` (Lv ${z.unlockRequirement.level})` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { signOut } from '../firebase/auth';
import { CLASS_LABELS, SPEC_LABELS } from '../gameData/classStats';
import { ZONES, isZoneUnlocked } from '../gameData/zones';
import { travelMinutes } from '../gameData/travel';
import { bestMountSpeedBonusPct } from '../gameData/mounts';
import type { Character } from '../types/character';

// The one thing visible no matter which sidebar section is open — who you
// are, your HP, your XP progress, and which zone you're currently "in."
// The zone selector lives here (not just on the Adventure page) because
// Professions and Shop are both zone-scoped too (gathering nodes, the
// fishing hole, trainers, and vendor stock are all per-zone). Clicking a
// different zone no longer switches instantly — it requests a flight (see
// gameData/travel.ts); App.tsx takes over the content area with
// TravelScreen for the duration, same as any other live activity.
export function TopBar({
  character,
  currentHp,
  characterMaxHp,
  xpIntoLevel,
  xpNeededForLevel,
  xpProgressPct,
  onSelectZone,
}: {
  character: Character;
  currentHp: number;
  characterMaxHp: number;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  xpProgressPct: number;
  onSelectZone: (zoneId: string) => void;
}) {
  const traveling = !!character.travel;
  const speedBonusPct = bestMountSpeedBonusPct(character.mounts);
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
          const isCurrent = z.id === character.currentZoneId;
          const minutes = isCurrent ? 0 : travelMinutes(speedBonusPct);
          const clickable = unlocked && !isCurrent && !traveling;
          let title: string | undefined;
          if (!unlocked) {
            title = `Unlocks at level ${z.unlockRequirement.type === 'characterLevel' ? z.unlockRequirement.level : '?'}`;
          } else if (traveling) {
            title = 'Already in the air';
          } else if (!isCurrent) {
            title = `${minutes} minute flight`;
          }
          return (
            <button
              key={z.id}
              className="zone-tab"
              onClick={() => clickable && onSelectZone(z.id)}
              disabled={!clickable}
              title={title}
              style={isCurrent ? { background: 'var(--zone-primary)', color: '#fff' } : undefined}
            >
              {z.name}
              {!unlocked && z.unlockRequirement.type === 'characterLevel' ? ` (Lv ${z.unlockRequirement.level})` : ''}
              {unlocked && !isCurrent ? ` (${minutes}m)` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

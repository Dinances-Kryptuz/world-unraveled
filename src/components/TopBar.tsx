import { useState } from 'react';
import { signOut } from '../firebase/auth';
import { CLASS_LABELS, SPEC_LABELS } from '../gameData/classStats';
import { getTitle } from '../gameData/titles';
import { ZONES, isZoneUnlocked, orderedZonesForDisplay } from '../gameData/zones';
import { formatTravelMinutes, travelSeconds } from '../gameData/travel';
import { bestMountSpeedBonusPct } from '../gameData/mounts';
import { useGuildMilestoneBonuses } from '../hooks/useGuildMilestones';
import { ActiveBuffsBar } from './ActiveBuffsBar';
import { ClassColoredName } from './ClassColoredName';
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
  // Clicking a zone tab no longer starts the flight immediately — a
  // misclick here used to lock you into a travel timer with no way back
  // out. First click swaps that one tab into a Confirm/Cancel pair instead;
  // only the Confirm click actually calls onSelectZone. Clicking a
  // different zone tab while one is pending just moves the prompt there.
  const [confirmingZoneId, setConfirmingZoneId] = useState<string | null>(null);
  const guildBonuses = useGuildMilestoneBonuses();
  // Guild Milestone (level 5) stacks additively with the character's own
  // mount bonus — Master Mount (80%) + this (20%) reaches the 100% that
  // makes travelSeconds resolve to 0, genuinely instant rather than merely
  // fast. Capped at 100 so no future stacking source can go negative.
  const speedBonusPct = Math.min(100, bestMountSpeedBonusPct(character.mounts) + guildBonuses.mountSpeedPct);
  return (
    <div className="top-bar">
      <div className="top-bar-main">
        <div className="top-bar-identity">
          <strong><ClassColoredName name={character.name} cls={character.class} /></strong>
          {character.equippedTitleId && getTitle(character.equippedTitleId) && (
            <span className="top-bar-title"> «{getTitle(character.equippedTitleId)!.name}»</span>
          )}
          {' — '}
          {CLASS_LABELS[character.class]}
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
              style={{ width: `${xpProgressPct}%`, background: 'var(--class-accent)' }}
            />
          </div>
          <small>
            {Math.round(xpIntoLevel).toLocaleString()} / {Math.round(xpNeededForLevel).toLocaleString()} XP to level{' '}
            {character.level + 1} ({xpProgressPct.toFixed(1)}%)
          </small>
        </div>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
      <ActiveBuffsBar character={character} />
      <div className="zone-tabs top-bar-zone-tabs">
        {/* Ashenfall first — it's the capital, the hub everything else
            routes through, so it leads the list rather than trailing at
            the end (where ZONES itself deliberately keeps it, for
            zoneForLevel's own tie-break — see zones.ts). Display order
            only; ZONES' own iteration order is untouched. */}
        {orderedZonesForDisplay(ZONES).map((z) => {
          const unlocked = isZoneUnlocked(z, character.level);
          const isCurrent = z.id === character.currentZoneId;
          const seconds = isCurrent ? 0 : travelSeconds(speedBonusPct, character.currentZoneId, z.id);
          const isInstant = !isCurrent && seconds === 0;
          const minutes = isCurrent ? '0' : formatTravelMinutes(speedBonusPct, character.currentZoneId, z.id);
          const clickable = unlocked && !isCurrent && !traveling;
          let title: string | undefined;
          if (!unlocked) {
            title = `Unlocks at level ${z.unlockRequirement.type === 'characterLevel' ? z.unlockRequirement.level : '?'}`;
          } else if (traveling) {
            title = 'Already in the air';
          } else if (isInstant) {
            title = 'Instant travel';
          } else if (!isCurrent) {
            title = `${minutes} minute flight`;
          }
          if (clickable && confirmingZoneId === z.id) {
            return (
              <span key={z.id} className="zone-tab-confirm">
                <button
                  className="zone-tab"
                  onClick={() => {
                    setConfirmingZoneId(null);
                    onSelectZone(z.id);
                  }}
                  title={`Confirm travel to ${z.name}`}
                >
                  Confirm {z.name}?
                </button>
                <button className="zone-tab" onClick={() => setConfirmingZoneId(null)}>
                  Cancel
                </button>
              </span>
            );
          }
          return (
            <button
              key={z.id}
              className="zone-tab"
              onClick={() => clickable && setConfirmingZoneId(z.id)}
              disabled={!clickable}
              title={title}
              style={isCurrent ? { background: 'var(--class-accent)', color: 'var(--class-accent-text)' } : undefined}
            >
              {z.name}
              {!unlocked && z.unlockRequirement.type === 'characterLevel' ? ` (Lv ${z.unlockRequirement.level})` : ''}
              {unlocked && isInstant ? ' (Instant)' : ''}
              {unlocked && !isCurrent && !isInstant ? ` (${minutes}m)` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

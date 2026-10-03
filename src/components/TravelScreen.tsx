import { useEffect, useRef, useState } from 'react';
import { useCharacter } from '../hooks/useCharacter';
import { ZONES } from '../gameData/zones';
import type { TravelState } from '../gameData/travel';

// A full-screen takeover while a flight is in progress — same "live activity
// owns the content area" convention as CombatScreen/GatheringScreen (see
// App.tsx), just with no server round-trip of its own: once the client
// clock crosses travel.arrivesAt, the next refetch() naturally reports the
// trip as already resolved (see firebase/character.ts's getCharacter) with
// no separate "complete the flight" write needed.
export function TravelScreen({ travel }: { travel: TravelState }) {
  const { refetch } = useCharacter();
  const [, setTick] = useState(0);
  const arrivedRef = useRef(false);

  useEffect(() => {
    arrivedRef.current = false;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      if (!arrivedRef.current && Date.now() >= travel.arrivesAt.getTime()) {
        arrivedRef.current = true;
        void refetch();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travel.arrivesAt.getTime()]);

  const fromZone = ZONES[travel.fromZoneId];
  const toZone = ZONES[travel.toZoneId];
  const totalMs = travel.arrivesAt.getTime() - travel.departedAt.getTime();
  const remainingMs = Math.max(0, travel.arrivesAt.getTime() - Date.now());
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100)) : 100;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="combat-screen">
      <h2>In Flight</h2>
      <p>
        Traveling from <strong>{fromZone?.name ?? travel.fromZoneId}</strong> to{' '}
        <strong>{toZone?.name ?? travel.toZoneId}</strong>
      </p>
      <div style={{ background: '#e2d9c8', borderRadius: 4, height: 14, width: '100%', overflow: 'hidden', marginBottom: 8 }}>
        <div
          style={{
            background: 'var(--zone-primary)',
            height: '100%',
            width: `${pct}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <p>
        {remainingSeconds > 0
          ? `Arriving in ${minutes}:${seconds.toString().padStart(2, '0')}`
          : 'Touching down…'}
      </p>
    </div>
  );
}

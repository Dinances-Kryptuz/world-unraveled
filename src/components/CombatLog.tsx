import type { CombatEvent, CombatEventKind } from '../combatEngine/types';

const LOG_COLORS: Record<CombatEventKind, string> = {
  damage_out: '#2a2420',
  damage_in: '#c0392b',
  heal: '#2e9e4f',
  miss: '#8c8c8c',
  death: '#b8960c',
  status: '#5c4a8a',
};

// Shared by CombatScreen and DungeonScreen — color-codes by CombatEvent.kind
// (set in engine.ts at the point it already knows what happened) rather
// than re-parsing message text.
export function CombatLog({ events }: { events: CombatEvent[] }) {
  return (
    <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto', fontSize: '0.85rem' }}>
      {events.map((entry, i) => (
        <div
          key={i}
          style={{
            color: LOG_COLORS[entry.kind],
            fontStyle: entry.kind === 'miss' ? 'italic' : 'normal',
            fontWeight: entry.kind === 'death' ? 700 : 400,
          }}
        >
          {entry.message}
        </div>
      ))}
    </div>
  );
}

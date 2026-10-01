import { ZONES } from '../gameData/zones';

// Shown at the top of the Adventure page — the clearest, most direct place
// a player sees "I'm somewhere new": zone name, description, and level
// range, over a gradient built from that zone's theme (see
// gameData/zoneThemes.ts and App.tsx, which sets the --zone-* custom
// properties this reads).
export function ZoneBanner({ zoneId }: { zoneId: string }) {
  const zone = ZONES[zoneId];
  if (!zone) return null;

  return (
    <div
      className="zone-banner"
      style={{
        background: 'linear-gradient(135deg, var(--zone-bg-from), var(--zone-bg-to))',
        borderColor: 'var(--zone-primary)',
      }}
    >
      <div className="zone-banner-bar" style={{ background: 'var(--zone-primary)' }} />
      <div className="zone-banner-body">
        <h1 style={{ color: 'var(--zone-primary-dark)' }}>{zone.name}</h1>
        <p className="zone-banner-level">Levels {zone.levelRange[0]}–{zone.levelRange[1]}</p>
        <p>{zone.description}</p>
      </div>
    </div>
  );
}

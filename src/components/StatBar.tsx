// A static (non-looping) filled bar for a current/max quantity — HP,
// Mana/Rage/Holy Power, or anything else with a current and a max. Same
// visual language as XpBar's progress bar, just reusable and colorable.
export function StatBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 4 }}>
      <small>
        {label}: {Math.round(current)} / {Math.round(max)}
      </small>
      <div style={{ background: '#e2d9c8', borderRadius: 4, height: 10, width: '100%', overflow: 'hidden' }}>
        <div
          style={{
            background: color,
            height: '100%',
            width: `${pct}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

// HP bar color follows the same "getting dangerous" convention as a WoW-
// style health bar: green while healthy, yellow at moderate, red once low.
export function hpBarColor(pct: number): string {
  if (pct > 50) return '#2e9e4f';
  if (pct > 20) return '#b8960c';
  return '#c0392b';
}

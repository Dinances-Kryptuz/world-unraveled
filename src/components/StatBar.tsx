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
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 10, width: '100%', overflow: 'hidden' }}>
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

// Flat HP-bar colors per the dark-fantasy reskin spec — replaces the prior
// green/gold/red "getting dangerous" threshold convention with one fixed
// color each for an ally's bar and an enemy's bar, regardless of %.
export const HEALTH_BAR_COLOR = '#55956D';
export const ENEMY_HEALTH_BAR_COLOR = '#AD625C';

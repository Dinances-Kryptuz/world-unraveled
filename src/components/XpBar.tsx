export function XpBar({
  level,
  xp,
  curve,
  label,
}: {
  level: number;
  xp: number;
  curve: (level: number) => number;
  label: string;
}) {
  const currentLevelXp = curve(level);
  const nextLevelXp = curve(level + 1);
  const xpIntoLevel = Math.max(0, xp - currentLevelXp);
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const progressPct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));

  return (
    <div>
      <small>
        {label} Lv {level}: {Math.round(xpIntoLevel).toLocaleString()} / {Math.round(xpNeededForLevel).toLocaleString()} XP to level{' '}
        {level + 1} ({progressPct.toFixed(1)}%)
      </small>
      <div style={{ background: '#e2d9c8', borderRadius: 4, height: 10, width: '100%', overflow: 'hidden' }}>
        <div
          style={{
            background: '#6b4f2a',
            height: '100%',
            width: `${progressPct}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

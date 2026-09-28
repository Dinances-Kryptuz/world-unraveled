import { mobColorTier, type MobColorTier } from '../gameData/combatFormulas';

// Shared by the zone monster list, the crafting recipe color-tier text, and
// the combat screen — all use the same classic-WoW grey/green/yellow/
// orange/red palette.
export const TIER_COLORS: Record<MobColorTier, string> = {
  grey: '#8c8c8c',
  green: '#2e9e4f',
  yellow: '#b8960c',
  orange: '#d2691e',
  red: '#c0392b',
  unknown: '#7d2ae8',
};

export function MonsterLevelBadge({ monsterLevel, playerLevel }: { monsterLevel: number; playerLevel: number }) {
  const diff = monsterLevel - playerLevel;
  const tier = mobColorTier(diff);
  const label = tier === 'unknown' ? '??' : `Lv ${monsterLevel}`;
  return (
    <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }} title={`${tier} — ${diff >= 0 ? '+' : ''}${diff} levels vs you`}>
      {label}
    </span>
  );
}

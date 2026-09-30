import { mobColorTier, type MobColorTier } from '../gameData/combatFormulas';
import {
  combatTypeMatchup,
  COMBAT_TYPE_ADVANTAGE_PCT,
  COMBAT_TYPE_DISADVANTAGE_PCT,
  COMBAT_TYPE_ICONS,
  COMBAT_TYPE_LABELS,
  type CombatType,
  type CombatTypeMatchup,
} from '../gameData/combatTriangle';

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

// Melee/Ranged/Magic triangle colors — deliberately distinct from the
// level-tier palette above so the two systems never look like the same
// signal. Green/red carry the same "good/bad for you" meaning as elsewhere.
const MATCHUP_COLORS: Record<CombatTypeMatchup, string> = {
  advantage: '#2e9e4f',
  disadvantage: '#c0392b',
  neutral: '#6b6156',
};

export function CombatTypeBadge({ monsterType, playerType }: { monsterType: CombatType; playerType: CombatType }) {
  const matchup = combatTypeMatchup(playerType, monsterType);
  const pct = matchup === 'advantage' ? `+${COMBAT_TYPE_ADVANTAGE_PCT}%` : matchup === 'disadvantage' ? `-${COMBAT_TYPE_DISADVANTAGE_PCT}%` : '';
  return (
    <span
      style={{ color: MATCHUP_COLORS[matchup], fontWeight: 700 }}
      title={`${COMBAT_TYPE_LABELS[monsterType]} — your ${COMBAT_TYPE_LABELS[playerType]} is ${matchup} vs it${pct ? ` (${pct} damage/survivability)` : ''}`}
    >
      {COMBAT_TYPE_ICONS[monsterType]} {pct}
    </span>
  );
}

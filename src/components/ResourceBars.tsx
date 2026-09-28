import { StatBar } from './StatBar';
import type { Combatant } from '../combatEngine/types';

const RESOURCE_LABELS: Record<string, string> = { rage: 'Rage', mana: 'Mana', holyPower: 'Holy Power' };
const RESOURCE_COLORS: Record<string, string> = { rage: '#a3312a', mana: '#2d6ca3', holyPower: '#b8960c' };

// One StatBar per resource pool a combatant currently has. Shared by
// CombatScreen and DungeonScreen.
export function ResourceBars({ combatant }: { combatant: Combatant }) {
  return (
    <>
      {Object.entries(combatant.resources).map(([type, pool]) =>
        pool ? (
          <StatBar
            key={type}
            label={RESOURCE_LABELS[type] ?? type}
            current={pool.current}
            max={pool.max}
            color={RESOURCE_COLORS[type] ?? '#6b4f2a'}
          />
        ) : null
      )}
    </>
  );
}

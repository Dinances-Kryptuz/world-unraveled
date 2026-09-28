import { abilitiesById } from '../combatEngine/engine';
import type { Combatant } from '../combatEngine/types';

const RESOURCE_LABELS: Record<string, string> = { rage: 'Rage', mana: 'Mana', holyPower: 'Holy Power' };

// The player's manual-use ability buttons, each with a real cooldown
// progress bar and disabled (with a tooltip) when the resource cost can't
// be paid, not just when on cooldown. Shared by CombatScreen and
// DungeonScreen — both drive the same player Combatant through the same
// tryManualUseAbility().
export function AbilityBar({ player, onUse }: { player: Combatant; onUse: (abilityId: string) => void }) {
  const abilities = abilitiesById();
  return (
    <div style={{ marginTop: 8 }}>
      {player.equippedAbilityIds.map((abilityId) => {
        const ability = abilities[abilityId];
        if (!ability) return null;
        const cooldown = player.cooldowns[abilityId] ?? 0;
        const pool = ability.resourceType ? player.resources[ability.resourceType] : undefined;
        const affordable = !ability.resourceType || (pool !== undefined && pool.current >= (ability.resourceCost ?? 0));
        const disabled = cooldown > 0 || !affordable;
        const cdPct =
          ability.cooldownSeconds > 0
            ? Math.max(0, Math.min(100, ((ability.cooldownSeconds - cooldown) / ability.cooldownSeconds) * 100))
            : 100;
        return (
          <div key={abilityId} style={{ display: 'inline-block', marginRight: 8, marginBottom: 8, width: 140 }}>
            <button
              onClick={() => onUse(abilityId)}
              disabled={disabled}
              title={cooldown <= 0 && !affordable ? `Not enough ${RESOURCE_LABELS[ability.resourceType!] ?? ability.resourceType}` : undefined}
              style={{ width: '100%' }}
            >
              {cooldown > 0 ? `${ability.name} (${Math.ceil(cooldown)}s)` : ability.name}
            </button>
            {ability.cooldownSeconds > 0 && (
              <div style={{ background: '#e2d9c8', borderRadius: 3, height: 4, width: '100%', marginTop: 3, overflow: 'hidden' }}>
                <div style={{ background: '#6b4f2a', height: '100%', width: `${cdPct}%`, transition: 'width 1s linear' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

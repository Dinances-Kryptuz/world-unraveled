import { abilitiesById } from '../combatEngine/engine';
import type { Combatant } from '../combatEngine/types';

// Buffs/dots/stuns as small badges under a combatant's HP bar, so their
// status is visible at a glance instead of only inferable from the log.
// Shared by CombatScreen and DungeonScreen — a dungeon boss's own buffs
// (e.g. Chieftain's Warcry) resolve through the same abilitiesById() lookup
// player abilities do.
export function StatusBadges({ combatant }: { combatant: Combatant }) {
  const abilities = abilitiesById();
  const badges: { key: string; label: string; harmful: boolean }[] = [];
  for (const buff of combatant.buffs) {
    const harmful = buff.damageDealtPct < 0 || buff.damageTakenPct > 0;
    const name = abilities[buff.abilityId]?.name ?? buff.abilityId;
    badges.push({ key: `buff-${buff.abilityId}`, label: `${name} (${Math.ceil(buff.remainingSeconds)}s)`, harmful });
  }
  for (const dot of combatant.dots) {
    const name = abilities[dot.abilityId]?.name ?? dot.abilityId;
    badges.push({ key: `dot-${dot.abilityId}`, label: `${name} (${Math.ceil(dot.remainingSeconds)}s)`, harmful: true });
  }
  if (combatant.stunnedSeconds > 0) {
    badges.push({ key: 'stun', label: `Stunned (${Math.ceil(combatant.stunnedSeconds)}s)`, harmful: true });
  }
  if (badges.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
      {badges.map((b) => (
        <span
          key={b.key}
          style={{
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: 4,
            background: b.harmful ? '#f4d9d6' : '#d9f0df',
            color: b.harmful ? '#a3312a' : '#1f7a3d',
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

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
  // Keyed with the array index too, not just the ability id — now that a
  // dungeon can field more than one of the same class, two different party
  // members can land the same-named buff/dot on one target at once (e.g.
  // two Warriors both landing Intimidating Shout on the boss), which would
  // otherwise collide on a bare `buff-${abilityId}` key.
  combatant.buffs.forEach((buff, i) => {
    const harmful = buff.damageDealtPct < 0 || buff.damageTakenPct > 0;
    const name = abilities[buff.abilityId]?.name ?? buff.abilityId;
    badges.push({ key: `buff-${i}-${buff.abilityId}`, label: `${name} (${Math.ceil(buff.remainingSeconds)}s)`, harmful });
  });
  combatant.dots.forEach((dot, i) => {
    const name = abilities[dot.abilityId]?.name ?? dot.abilityId;
    badges.push({ key: `dot-${i}-${dot.abilityId}`, label: `${name} (${Math.ceil(dot.remainingSeconds)}s)`, harmful: true });
  });
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

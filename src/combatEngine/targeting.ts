import type { CombatState, Combatant, TargetType } from './types';

// Weighted-random pick among a pool by threatWeight — the stand-in for a
// real threat table (see classStats.ts's SpecDef.threatWeight). A 1-member
// pool (solo play, or everyone else dead) always returns that one member
// regardless of weight, so this is a no-op for every fight without more
// than one alive party member.
function pickWeighted(pool: Combatant[]): Combatant | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const totalWeight = pool.reduce((sum, c) => sum + c.threatWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const c of pool) {
    roll -= c.threatWeight;
    if (roll <= 0) return c;
  }
  return pool[pool.length - 1];
}

// One resolver for every TargetType. Adding HIGHEST_THREAT_ENEMY,
// ALLY_MISSING_BUFF, etc. later means adding a case here — nothing that calls
// resolveTarget needs to change, solo or in a future party.
export function resolveTarget(state: CombatState, type: TargetType, sourceId: string): Combatant | null {
  switch (type) {
    case 'SELF':
      return findById(state.party, sourceId) ?? findById(state.enemies, sourceId) ?? null;
    case 'CURRENT_ENEMY': {
      const sourceIsPlayer = state.party.some((c) => c.id === sourceId);
      // An enemy choosing among the party weighs by threat (a dungeon tank
      // should draw fire); the party side choosing among enemies doesn't —
      // nothing differentiates monsters by threat yet, and most fights only
      // have one anyway.
      if (sourceIsPlayer) return state.enemies.find((c) => c.isAlive) ?? null;
      // A taunt in effect overrides the normal threat pick entirely, as long
      // as its target is still alive — see Combatant.forcedTargetId.
      const source = findById(state.enemies, sourceId);
      if (source?.forcedTargetId && (source.forcedTargetSeconds ?? 0) > 0) {
        const forced = state.party.find((c) => c.id === source.forcedTargetId && c.isAlive);
        if (forced) return forced;
      }
      return pickWeighted(state.party.filter((c) => c.isAlive));
    }
    case 'LOWEST_HP_ALLY': {
      const sourceIsPlayer = state.party.some((c) => c.id === sourceId);
      const pool = (sourceIsPlayer ? state.party : state.enemies).filter((c) => c.isAlive);
      if (pool.length === 0) return null;
      return pool.reduce((lowest, c) => (c.hp / c.maxHp < lowest.hp / lowest.maxHp ? c : lowest));
    }
    default:
      return null;
  }
}

function findById(combatants: Combatant[], id: string): Combatant | undefined {
  return combatants.find((c) => c.id === id);
}

import type { CombatState, Combatant, TargetType } from './types';

// One resolver for every TargetType. Adding LOWEST_HP_ALLY, HIGHEST_THREAT_ENEMY,
// ALLY_MISSING_BUFF, etc. later means adding a case here — nothing that calls
// resolveTarget needs to change, solo or in a future party.
export function resolveTarget(state: CombatState, type: TargetType, sourceId: string): Combatant | null {
  switch (type) {
    case 'SELF':
      return findById(state.party, sourceId) ?? findById(state.enemies, sourceId) ?? null;
    case 'CURRENT_ENEMY': {
      const sourceIsPlayer = state.party.some((c) => c.id === sourceId);
      const pool = sourceIsPlayer ? state.enemies : state.party;
      return pool.find((c) => c.isAlive) ?? null;
    }
    default:
      return null;
  }
}

function findById(combatants: Combatant[], id: string): Combatant | undefined {
  return combatants.find((c) => c.id === id);
}

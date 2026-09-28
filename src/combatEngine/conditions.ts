import type { Combatant, Condition, ConditionGroup } from './types';

// The one place conditions are interpreted, mirroring engine.ts's "one
// generic handler per effect type" discipline — priority.ts calls this once
// per equipped ability, never evaluating a condition inline itself.
export function evaluateConditionGroup(
  group: ConditionGroup | undefined,
  self: Combatant,
  target: Combatant | null
): boolean {
  if (!group || group.conditions.length === 0) return true;
  const results = group.conditions.map((c) => evaluateCondition(c, self, target));
  return group.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

function evaluateCondition(condition: Condition, self: Combatant, target: Combatant | null): boolean {
  switch (condition.type) {
    case 'self_hp_below':
      return hpPct(self) < condition.value;
    case 'self_hp_above':
      return hpPct(self) > condition.value;
    case 'target_hp_below':
      return target ? hpPct(target) < condition.value : false;
    case 'target_hp_above':
      return target ? hpPct(target) > condition.value : false;
    case 'resource_below': {
      const pct = resourcePct(self, condition.resource);
      return pct !== null && pct < condition.value;
    }
    case 'resource_above': {
      const pct = resourcePct(self, condition.resource);
      return pct !== null && pct > condition.value;
    }
  }
}

function hpPct(c: Combatant): number {
  return c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;
}

function resourcePct(c: Combatant, resource: Condition['resource']): number | null {
  if (!resource) return null;
  const pool = c.resources[resource];
  if (!pool || pool.max <= 0) return null;
  return (pool.current / pool.max) * 100;
}

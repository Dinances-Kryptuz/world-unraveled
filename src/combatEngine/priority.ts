import type { Ability, CombatState, Combatant, ConditionGroup } from './types';
import { canAfford } from './resources';
import { resolveTarget } from './targeting';
import { evaluateConditionGroup } from './conditions';

// Highest-priority usable ability wins; the equipped list is already in
// priority order (index 0 = Priority 1). Falls back to the class's basic
// attack, which is always available and doesn't occupy a slot. "Usable"
// means cooldown + resource + a valid target + (for an equipped ability
// only) its player-authored condition group. The basic attack fallback
// never checks conditions — it's the guaranteed-usable action every class
// falls back to, and gating it would risk the same OOM-style soft lock the
// Priest's Smite fix exists to prevent.
export function pickAbility(
  state: CombatState,
  combatant: Combatant,
  abilitiesById: Record<string, Ability>
): { ability: Ability; targetId: string } | null {
  for (const id of combatant.equippedAbilityIds) {
    if (combatant.disabledAbilityIds?.includes(id)) continue;
    const ability = abilitiesById[id];
    if (!ability) continue;
    const result = tryResolve(state, combatant, ability, combatant.abilityConditions?.[id]);
    if (result) return result;
  }

  const basicAttack = abilitiesById[combatant.basicAttackId];
  if (basicAttack) {
    const result = tryResolve(state, combatant, basicAttack, undefined);
    if (result) return result;
  }

  return null;
}

function tryResolve(
  state: CombatState,
  combatant: Combatant,
  ability: Ability,
  conditions: ConditionGroup | undefined
): { ability: Ability; targetId: string } | null {
  if ((combatant.cooldowns[ability.id] ?? 0) > 0) return null;
  if (!canAfford(combatant.resources, ability.resourceType, ability.resourceCost)) return null;
  const target = resolveTarget(state, ability.targetType, combatant.id);
  if (!target || !target.isAlive) return null;
  if (!evaluateConditionGroup(conditions, combatant, target)) return null;
  return { ability, targetId: target.id };
}

import type { Ability, CombatState, Combatant } from './types';
import { canAfford } from './resources';
import { resolveTarget } from './targeting';

// Highest-priority usable ability wins; the equipped list is already in
// priority order (index 0 = Priority 1). Falls back to the class's basic
// attack, which is always available and doesn't occupy a slot. Phase 1 has
// no player-authored conditions yet — "usable" here means only cooldown +
// resource + a valid target exist. The condition system (Phase 3) plugs in
// as one more check per ability without changing this walk.
export function pickAbility(
  state: CombatState,
  combatant: Combatant,
  abilitiesById: Record<string, Ability>
): { ability: Ability; targetId: string } | null {
  for (const id of combatant.equippedAbilityIds) {
    const ability = abilitiesById[id];
    if (!ability) continue;
    const result = tryResolve(state, combatant, ability);
    if (result) return result;
  }

  const basicAttack = abilitiesById[combatant.basicAttackId];
  if (basicAttack) {
    const result = tryResolve(state, combatant, basicAttack);
    if (result) return result;
  }

  return null;
}

function tryResolve(
  state: CombatState,
  combatant: Combatant,
  ability: Ability
): { ability: Ability; targetId: string } | null {
  if ((combatant.cooldowns[ability.id] ?? 0) > 0) return null;
  if (!canAfford(combatant.resources, ability.resourceType, ability.resourceCost)) return null;
  const target = resolveTarget(state, ability.targetType, combatant.id);
  if (!target || !target.isAlive) return null;
  return { ability, targetId: target.id };
}

// Level-gating for the priority system. Matches the design doc's slot/
// unlock tables exactly: slots increase at 1/4/8/12/20 and cap at 5;
// ability count comes straight from each Ability's own unlockLevel field,
// so this file has no separate count table to keep in sync with abilities.ts.
import type { ClassId, SpecId } from '../gameData/classStats';
import { ABILITIES, BASIC_ATTACK_BY_CLASS } from './abilities';
import type { Ability, ConditionGroup } from './types';

// A saved-preset slot count, not an ability-roster limit — with only 5
// abilities per class right now, 3 named presets ("Grinding", "Boss",
// whatever the player calls them) is plenty of room to matter without
// needing a scrolling list. Raise this later if the roster grows enough to
// justify more.
export const MAX_COMBAT_PRESETS = 3;

// Design-doc level gates for the two more advanced pieces of combat setup.
// Below CONDITIONS_UNLOCK_LEVEL, abilities just fire whenever off cooldown
// (no per-ability conditions). Below PRIORITY_UNLOCK_LEVEL, the *set* of
// equipped abilities is still the player's choice (as slots unlock), but
// their relative order isn't — see effectiveLoadout()'s sort below — so an
// early equip/unequip click can't accidentally create a bad priority order
// before the player has any tools to reason about one.
export const CONDITIONS_UNLOCK_LEVEL = 30;
export const PRIORITY_UNLOCK_LEVEL = 40;

export function maxEquippedSlots(level: number): number {
  if (level < 4) return 1;
  if (level < 8) return 2;
  if (level < 12) return 3;
  if (level < 20) return 4;
  return 5;
}

// All abilities this class/spec has unlocked at this level, excluding the
// basic attack (it's always available and never occupies a slot). An
// ability with no `spec` is shared across every spec of its class; one with
// a `spec` only shows up once the character has actually chosen it — a
// character who hasn't specced yet (spec === null) only sees shared
// abilities, which is correct since spec content unlocks well after the
// level-5 spec choice anyway.
export function unlockedAbilities(cls: ClassId, spec: SpecId | null, level: number): Ability[] {
  return Object.values(ABILITIES)
    .filter((a) => a.class === cls && !a.isBasicAttack && a.unlockLevel <= level && (!a.spec || a.spec === spec))
    .sort((a, b) => a.unlockLevel - b.unlockLevel);
}

// The equipped list actually used in combat: the player's own saved choice
// when they have one, filtered down to abilities still unlocked and to the
// slot count their level allows (in case they leveled/respecced talents
// down, or the ability list changed under them) — otherwise a sensible
// default so a character who's never touched the setup screen still fights
// effectively. This is what "casual player can just press a recommended
// setup" (from the design doc) means in practice for now.
//
// trainedAbilityIds, when passed, further restricts `unlocked` to only
// abilities the character has actually paid to train at the Class Trainer
// (gameData/abilityTraining.ts) — an ability that's level-unlocked but
// never trained can't be equipped OR fall into the "sensible default"
// fallback below. Left undefined (every companion/alt call site — see
// combatEngine/engine.ts's createCompanionCombatant), this behaves exactly
// as before training existed: a hired companion has no trainer of its own
// and always fights with its full level-unlocked kit.
export function effectiveLoadout(
  cls: ClassId,
  spec: SpecId | null,
  level: number,
  savedChoice: string[],
  trainedAbilityIds?: string[]
): string[] {
  let unlocked = unlockedAbilities(cls, spec, level);
  if (trainedAbilityIds) {
    const trainedSet = new Set(trainedAbilityIds);
    unlocked = unlocked.filter((a) => trainedSet.has(a.id));
  }
  const unlockedIds = new Set(unlocked.map((a) => a.id));
  const slots = maxEquippedSlots(level);

  let filtered = savedChoice.filter((id) => unlockedIds.has(id)).slice(0, slots);
  if (filtered.length === 0) {
    filtered = unlocked.slice(0, slots).map((a) => a.id);
  }

  if (level < PRIORITY_UNLOCK_LEVEL) {
    // Before the full priority system unlocks, order isn't player-configurable
    // yet — always evaluate in unlockLevel order regardless of equip order.
    const unlockLevelById = new Map(unlocked.map((a) => [a.id, a.unlockLevel]));
    filtered = [...filtered].sort((a, b) => (unlockLevelById.get(a) ?? 0) - (unlockLevelById.get(b) ?? 0));
  }

  return filtered;
}

// Conditions aren't usable until CONDITIONS_UNLOCK_LEVEL — a below-level
// character's saved conditions (e.g. from before a respec, or a level that
// somehow regressed) are simply ignored rather than validated/stripped
// anywhere else, same "tolerate, don't enforce elsewhere" approach the rest
// of this file takes for slots/order.
export function effectiveAbilityConditions(
  level: number,
  savedConditions: Record<string, ConditionGroup>
): Record<string, ConditionGroup> {
  return level < CONDITIONS_UNLOCK_LEVEL ? {} : savedConditions;
}

export function basicAttackFor(cls: ClassId): Ability {
  return ABILITIES[BASIC_ATTACK_BY_CLASS[cls]];
}

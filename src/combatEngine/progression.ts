// Level-gating for the priority system. Matches the design doc's slot/
// unlock tables exactly: slots increase at 1/10/20/30/40 and cap at 5;
// ability count comes straight from each Ability's own unlockLevel field,
// so this file has no separate count table to keep in sync with abilities.ts.
import type { ClassId } from '../gameData/classStats';
import { ABILITIES, BASIC_ATTACK_BY_CLASS } from './abilities';
import type { Ability } from './types';

export function maxEquippedSlots(level: number): number {
  if (level < 10) return 1;
  if (level < 20) return 2;
  if (level < 30) return 3;
  if (level < 40) return 4;
  return 5;
}

// All abilities this class has unlocked at this level, excluding the basic
// attack (it's always available and never occupies a slot).
export function unlockedAbilities(cls: ClassId, level: number): Ability[] {
  return Object.values(ABILITIES)
    .filter((a) => a.class === cls && !a.isBasicAttack && a.unlockLevel <= level)
    .sort((a, b) => a.unlockLevel - b.unlockLevel);
}

// The equipped list actually used in combat: the player's own saved choice
// when they have one, filtered down to abilities still unlocked and to the
// slot count their level allows (in case they leveled/respecced talents
// down, or the ability list changed under them) — otherwise a sensible
// default so a character who's never touched the setup screen still fights
// effectively. This is what "casual player can just press a recommended
// setup" (from the design doc) means in practice for now.
export function effectiveLoadout(cls: ClassId, level: number, savedChoice: string[]): string[] {
  const unlockedIds = new Set(unlockedAbilities(cls, level).map((a) => a.id));
  const slots = maxEquippedSlots(level);

  const filtered = savedChoice.filter((id) => unlockedIds.has(id)).slice(0, slots);
  if (filtered.length > 0) return filtered;

  return unlockedAbilities(cls, level)
    .slice(0, slots)
    .map((a) => a.id);
}

export function basicAttackFor(cls: ClassId): Ability {
  return ABILITIES[BASIC_ATTACK_BY_CLASS[cls]];
}

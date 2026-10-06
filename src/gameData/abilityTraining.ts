import { zoneForLevel } from './zones';

// Pure data/math for the Class Trainer's "Spells & Abilities" gold sink —
// no Firestore here, same split as professionTiers.ts (gating math) vs
// firebase/professions.ts (the writer). An ability's own unlockLevel
// (combatEngine/abilities.ts) now means "earliest level this can be
// TRAINED," not "free at this level" — see firebase/character.ts's
// trainAbility, the only path that ever adds to Character.trainedAbilityIds.

// Quadratic in unlockLevel so the handful of late (level 30) abilities cost
// meaningfully more than the early (level 1) ones, without a separate cost
// table to keep in sync with abilities.ts's unlockLevel values.
export function abilityTrainingCost(unlockLevel: number): number {
  return Math.round(unlockLevel * unlockLevel * 2.5);
}

// Which zone a character must currently be standing in to train an ability
// that unlocks at this level — same "zone 1 = low levels, zone 2 = next
// band, …" idea as professionTrainers.ts's rank-by-zone table, generalized
// via zoneForLevel so it stays in sync automatically if zone level ranges
// ever change.
export function abilityTrainingZoneId(unlockLevel: number): string {
  return zoneForLevel(unlockLevel);
}

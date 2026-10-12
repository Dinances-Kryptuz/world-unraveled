// The Tower of Infinity — the end-game "how high can you climb" mini-game.
// 100 floors, one scripted boss-tier encounter per floor, costing
// escalating gold per attempt (the dedicated late-game gold sink the
// playthrough report flagged as missing). Difficulty is driven entirely by
// the multiplier layer in combatFormulas.ts (towerHpMultiplier/
// towerDamageMultiplier) plus the affixes below — never by inventing new
// monster levels or new combat-engine mechanics, so every number here is
// resolved through formulas already tested by the rest of this game.
import type { DamageSchool, Monster } from './types';
import type { CombatType } from './combatTriangle';

export const TOWER_BASE_COST = 50;
export const TOWER_COST_GROWTH = 1.07;

// Same exponential-cost pattern as bank.ts's bank-slot pricing (identical
// base/growth-style formula, just its own constants) — a deliberate, well-
// established convention in this codebase for "a repeatable cost that
// should scale aggressively," not a new pricing model.
export function towerAttemptCost(floor: number): number {
  return Math.round(TOWER_BASE_COST * Math.pow(TOWER_COST_GROWTH, floor - 1));
}

// ── Affixes ──────────────────────────────────────────────────────────────
// Each maps onto an EXISTING combat-engine lever (damage school + its
// already-built consumable/enchant resistance pipeline, or a flat % added
// to the same monsterDamageMultiplier/monsterHpMultiplier every dungeon
// boss already reads) — deliberately scoped to what's already wired today
// rather than inventing new engine mechanics (a mana-drain or healing-
// reduction debuff would need new CasterProfile/AbilityEffect plumbing;
// left for a future pass once the core climb loop is live). This still
// delivers real "mix your comp" pressure: elemental floors reward packing
// fire/shadow resistance consumables or enchants, Crushing floors reward
// extra healing/mitigation investment, Reinforced floors reward sustained
// DPS and mana-efficient rotations over burst.
export type TowerAffixId = 'scorched' | 'shrouded' | 'crushing' | 'reinforced';

export const TOWER_AFFIXES: Record<TowerAffixId, { name: string; description: string }> = {
  scorched: { name: 'Scorched', description: 'The Guardian burns with fire — pack fire resistance.' },
  shrouded: { name: 'Shrouded', description: 'The Guardian is wreathed in shadow — pack shadow resistance.' },
  crushing: { name: 'Crushing', description: 'The Guardian hits noticeably harder — bring more healing or mitigation.' },
  reinforced: { name: 'Reinforced', description: 'The Guardian is noticeably tougher — bring sustained damage and mana efficiency.' },
};

const AFFIX_ORDER: TowerAffixId[] = ['scorched', 'shrouded', 'crushing', 'reinforced'];

// 0 affixes floors 1-20, climbing by 1 every 20 floors to the full 4 by
// floor 81+ (every affix active at once) — a Mythic+-style escalation, not
// a flat difficulty the whole climb.
function affixCountForFloor(floor: number): number {
  if (floor <= 20) return 0;
  if (floor <= 40) return 1;
  if (floor <= 60) return 2;
  if (floor <= 80) return 3;
  return 4;
}

// Deterministic by floor number (never re-rolled per attempt) so a floor
// can be scouted once and built toward, rather than fighting fresh RNG on
// every retry — rotates the starting point through AFFIX_ORDER so floors
// within the same bracket (e.g. 21-40, all 1-affix) still see different
// single affixes rather than the same one every time.
export function affixesForFloor(floor: number): TowerAffixId[] {
  const count = affixCountForFloor(floor);
  if (count === 0) return [];
  const start = floor % AFFIX_ORDER.length;
  const result: TowerAffixId[] = [];
  for (let i = 0; i < count; i++) result.push(AFFIX_ORDER[(start + i) % AFFIX_ORDER.length]);
  return result;
}

// 'crushing'/'reinforced' fold into the SAME monsterDamageMultiplier/
// monsterHpMultiplier terms combatFormulas.ts's towerDamageMultiplier/
// towerHpMultiplier already compute — these are the EXTRA factor on top.
export function towerAffixDamageMultiplier(affixes: TowerAffixId[]): number {
  return affixes.includes('crushing') ? 1.25 : 1;
}
export function towerAffixHpMultiplier(affixes: TowerAffixId[]): number {
  return affixes.includes('reinforced') ? 1.4 : 1;
}
export function towerDamageSchoolForAffixes(affixes: TowerAffixId[]): DamageSchool {
  if (affixes.includes('scorched')) return 'fire';
  if (affixes.includes('shrouded')) return 'shadow';
  return 'physical';
}

// ── Guardian archetypes ─────────────────────────────────────────────────
// Flavor only (name/creatureType/combat-triangle type) — reusing the real
// 6 zones' own creature themes for the first 6, plus 2 "beyond the known
// world" archetypes for floors deep enough that no real zone theme fits,
// cycling by floor for visual variety. Every Guardian is a single boss-
// tier monster (never a wave) at level 60 (MAX_CHARACTER_LEVEL) — ALL
// difficulty comes from the multiplier layer above, never from inflating
// Monster.level past the range every other formula in this game was
// actually tested against.
interface TowerGuardianArchetype {
  name: string;
  creatureType?: 'beast' | 'demon';
  combatType: CombatType;
  abilityName: string;
  abilityDescription: string;
}

const TOWER_GUARDIAN_ARCHETYPES: TowerGuardianArchetype[] = [
  { name: 'Warden of Greenhollow', creatureType: 'beast', combatType: 'melee', abilityName: 'Verdant Ruin', abilityDescription: 'A crushing blow wrapped in choking, living thorns.' },
  { name: 'Warden of the Foothills', combatType: 'ranged', abilityName: 'Stone Avalanche', abilityDescription: 'A rockslide summoned from the crags above.' },
  { name: 'Warden of Emberfall', combatType: 'magic', abilityName: 'Ridgefire Surge', abilityDescription: 'A wave of superheated air sweeping the chamber.' },
  { name: 'Warden of Cinderfall', combatType: 'melee', abilityName: "Ashen Executioner's Blow", abilityDescription: 'A two-handed strike meant to end a fight in one hit.' },
  { name: 'Warden of the Molten Scar', combatType: 'ranged', abilityName: 'Scarfire Barrage', abilityDescription: 'Molten shrapnel hurled in every direction.' },
  { name: 'Warden of Cinderheart', creatureType: 'demon', combatType: 'magic', abilityName: "Cinderheart's Judgment", abilityDescription: "A blast of the crater's own buried power." },
  { name: 'Voidtouched Warden', creatureType: 'demon', combatType: 'magic', abilityName: 'Hollow Reckoning', abilityDescription: 'An attack that seems to come from everywhere at once.' },
  { name: 'Infinity-Bound Warden', combatType: 'melee', abilityName: "Endless Tower's Weight", abilityDescription: 'The sheer, crushing weight of every floor below this one.' },
];

// Synthesized fresh per floor (never stored in the static MONSTERS
// registry — there is no "monster document" for a Tower Guardian, just
// this pure function) — the TowerScreen calls this once per attempt to
// build the single-enemy encounter.
export function guardianForFloor(floor: number): Monster {
  const archetype = TOWER_GUARDIAN_ARCHETYPES[(floor - 1) % TOWER_GUARDIAN_ARCHETYPES.length];
  const affixes = affixesForFloor(floor);
  return {
    id: `tower_guardian_floor_${floor}`,
    name: `${archetype.name} (Floor ${floor})`,
    zoneIds: [],
    levelRange: [60, 60],
    level: 60,
    combatType: archetype.combatType,
    // No gold/loot from the kill itself — the Tower is a deliberate gold
    // SINK (towerAttemptCost above), and its real rewards are the
    // milestone gear/titles (towerLoot.ts), not a per-attempt payout that
    // would undercut the sink.
    goldMin: 0,
    goldMax: 0,
    isBoss: true,
    damageSchool: towerDamageSchoolForAffixes(affixes),
    creatureType: archetype.creatureType,
    lootTable: [],
    specialAbility: { name: archetype.abilityName, description: archetype.abilityDescription, implemented: false },
  };
}

// Hoists the "equipmentBonuses -> talentTotals -> buffTotals ->
// enchantTotals -> maxHp -> currentHp" derivation that was previously
// duplicated near-verbatim at 8 call sites (App.tsx, CombatScreen.tsx x2,
// DungeonScreen.tsx x2, WelcomeBackScreen.tsx x2, firebase/consumables.ts)
// into one place — code-audit finding, Equipment/Rarity-overhaul-adjacent
// cleanup pass. Two of those 8 sites (App.tsx's top-bar HP preview,
// consumables.ts's Recovery Food heal) had drifted to omit the SPI-regen
// bonus from their own inline resolveCurrentHp call; this version always
// includes it, which is simply the already-majority correct behavior, not
// a new feature — a tiny, deliberate side effect of removing the
// duplication, not a hidden behavior change.
import { statAtLevel, type BaseStat } from './classStats';
import { maxHp, resolveCurrentHp } from './combatFormulas';
import { getEquipmentStatBonuses } from './equipmentStats';
import { buildActiveEnchantTotals, type EnchantTotals } from './enchanting';
import { evaluateTalents, EMPTY_TALENT_TOTALS, type TalentBonusTotals } from '../utils/talentEvaluator';
import { evaluateActiveBuffs, type BuffTotals } from './buffs';
import type { Character } from '../types/character';

export interface CombatProfile {
  equipmentBonuses: Partial<Record<BaseStat, number>>;
  talentTotals: TalentBonusTotals;
  buffTotals: BuffTotals;
  enchantTotals: EnchantTotals;
  maxHp: number;
  currentHp: number;
}

// `level` overrides character.level — used by the "just leveled up, resolve
// the fresh max HP to restore to" call sites, which only ever read
// `.maxHp` off the result. `buffsAt`/`hpAt` both default to `now` and only
// need overriding by a caller resolving a PAST activity window (combat's
// live-resume path, the offline-catch-up preview) where buffs should be
// evaluated as of the real current moment but stored HP should only regen
// up to the activity's own startedAt (the point a tick-by-tick simulation/
// live session takes over regen from there) — see CombatScreen.tsx/
// WelcomeBackScreen.tsx's call sites.
export function resolveCombatProfile(
  character: Character,
  now: Date,
  options: { level?: number; buffsAt?: Date; hpAt?: Date } = {}
): CombatProfile {
  const level = options.level ?? character.level;
  const equipmentBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments, character.enchantmentCharges);
  const talentTotals = character.spec ? evaluateTalents(character.spec, character.talentPicks).totals : EMPTY_TALENT_TOTALS;
  const buffTotals = evaluateActiveBuffs(character.activeBuffs, options.buffsAt ?? now);
  const enchantTotals = buildActiveEnchantTotals(character.enchantments, character.enchantmentCharges);
  const maxHpValue = maxHp(character.class, level, equipmentBonuses, talentTotals.hpMultPct, enchantTotals.flatHpBonus);
  const totalSpi = statAtLevel(character.class, 'SPI', level) + (equipmentBonuses.SPI ?? 0);
  const currentHp = resolveCurrentHp(character.currentHp, maxHpValue, character.hpCheckpointAt, options.hpAt ?? now, totalSpi);
  return { equipmentBonuses, talentTotals, buffTotals, enchantTotals, maxHp: maxHpValue, currentHp };
}

import type { ArmorType, ItemDef } from './types';
import type { CombatType } from './combatTriangle';

// 'mage' is companion-only for now — not one of CharacterCreationScreen's
// CLASS_OPTIONS, so no player character ever has class === 'mage' and
// SpecSelectionScreen (which filters SPECS by character.class) never
// surfaces mage_fire/mage_frost to a player either. A future expansion may
// make it player-playable; until then it only exists to give the
// companion roster a 4th class (see gameData/companions.ts).
export type ClassId = 'warrior' | 'priest' | 'paladin' | 'mage';
export type SpecId =
  | 'warrior_dps'
  | 'warrior_tank'
  | 'shadow_priest'
  | 'holy_priest'
  | 'prot_paladin'
  | 'holy_paladin'
  | 'mage_fire'
  | 'mage_frost';

export type BaseStat = 'STR' | 'STA' | 'INT' | 'SPI';

// Per-level growth rate for each base stat, by class. Every character starts
// at 5 in each stat at level 1; stat(level) = 5 + (level - 1) * growth.
// Paladin STA deliberately matches Warrior's — plate-wearer parity, fixed
// during Pass 1 calibration (Prot Paladin was underwater at Warrior-equal STA).
export const CLASS_GROWTH: Record<ClassId, Record<BaseStat, number>> = {
  warrior: { STR: 1.2, STA: 1.0, INT: 0.2, SPI: 0.2 },
  priest: { STR: 0.2, STA: 0.5, INT: 1.2, SPI: 1.0 },
  paladin: { STR: 0.8, STA: 1.0, INT: 0.6, SPI: 0.6 },
  // A pure caster DPS class with no healing spec — all the INT a Priest
  // gets, none of the SPI (nothing of Mage's ever reads SPI), and the
  // thinnest STA of any class (a Priest at least has healing to offset
  // being squishy; a Mage companion leans on the group's tank instead).
  mage: { STR: 0.2, STA: 0.4, INT: 1.4, SPI: 0.1 },
};

export const PRIMARY_STAT: Record<ClassId, BaseStat> = {
  warrior: 'STR',
  priest: 'INT',
  paladin: 'STR',
  mage: 'INT',
};

export interface SpecDef {
  class: ClassId;
  damageCoef: number;
  survivabilityCoef: number;
  avoidance: number; // 0-1
  healFrac: number; // fraction of own damage dealt converted to self-heal, 0-1
  passiveHealPct: number; // fraction of max HP healed per second, 0-1
  // The combat-triangle type this spec fights as (see combatTriangle.ts) —
  // deliberately its own field rather than derived from class, so a future
  // spec of an existing class can fight as a different type without any
  // triangle-side change.
  combatType: CombatType;
  // Relative chance of being the one a monster attacks when there's more
  // than one party member to choose from (combatEngine/targeting.ts's
  // LOWEST_HP_ALLY-adjacent weighted pick for CURRENT_ENEMY) — a simple
  // stand-in for a real threat/taunt system. 1 for everyone except the two
  // tank specs, which are deliberately high enough that a dungeon group
  // without one visibly spreads damage (and risk) across its squishier
  // members instead — the whole point of "a tank" mattering once dungeon
  // groups exist. Solo play (a one-member party) never reads this at all.
  threatWeight: number;
}

// Final Pass 1 calibrated values — every spec verified solvent (margin >= ~1.0x)
// at every level 1-59 in the naked-kit (no talent, no gear) baseline sim.
// warrior_dps/warrior_tank/prot_paladin all carry a small passiveHealPct
// (0.016 — "battle hardiness," a natural second-wind regen, not a spell)
// added to narrow the solo-leveling gap against the self-healing specs. A
// live-sim sweep found survivabilityCoef/avoidance buffs hit diminishing
// returns fast (the safe-monster-selection logic just climbs to a
// proportionally more dangerous target, eating most of the gain) and a
// damageCoef buff was weak and sometimes counterproductive for the same
// reason — neither lever reliably closes the gap. A small direct
// passiveHealPct does, because — like the self-healing specs already get —
// it offsets incoming damage continuously instead of bumping a ceiling the
// monster-selection logic re-normalizes against. Tuned to land these three
// specs in the same ~95-120h-to-60 band as Shadow Priest/Holy Paladin
// (down from ~126-143h), while deliberately leaving them a bit slower than
// those specs and far slower than Holy Priest (~62h) — the "safer, tankier
// playstyle costs some time, the high-risk self-healing build is rewarded
// with pace" asymmetry stays, just compressed to a reasonable range instead
// of a 2-3x gap. Does not touch damageCoef (dungeon DPS checks) or healFrac
// (group healing throughput) — both stay exactly as calibrated.
export const SPECS: Record<SpecId, SpecDef> = {
  warrior_dps: { class: 'warrior', damageCoef: 1.0, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.016, combatType: 'melee', threatWeight: 1 },
  warrior_tank: { class: 'warrior', damageCoef: 0.75, survivabilityCoef: 1.5, avoidance: 0.1, healFrac: 0.0, passiveHealPct: 0.016, combatType: 'melee', threatWeight: 4 },
  shadow_priest: { class: 'priest', damageCoef: 1.0, survivabilityCoef: 0.8, avoidance: 0.05, healFrac: 0.35, passiveHealPct: 0.018, combatType: 'magic', threatWeight: 1 },
  // Raised from the original Pass 1 values (0.4 / 0.5) — a live-simulation
  // sweep across all 6 specs found Holy Priest/Holy Paladin took 2-2.5x
  // longer than every other spec to solo-level (near-zero personal damage
  // is fine once a group covers it, but punishing before a player can even
  // afford/recruit a group). Raised enough to land within the same ~450-550
  // real-hour band as the other 4 specs' solo leveling pace — group healing
  // throughput is governed by healFrac/passiveHealPct and each spec's own
  // heal-ability power, not this coefficient, so this doesn't meaningfully
  // change how either spec heals once grouped.
  holy_priest: { class: 'priest', damageCoef: 1.05, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.35, passiveHealPct: 0.044, combatType: 'magic', threatWeight: 1 },
  // survivabilityCoef deliberately lower than Warrior Tank's 1.5 — Prot
  // Paladin is the AOE-threat tank (see Consecration in abilities.ts), not
  // the one you want soaking a boss's biggest single hits.
  prot_paladin: { class: 'paladin', damageCoef: 0.75, survivabilityCoef: 1.3, avoidance: 0.1, healFrac: 0.0, passiveHealPct: 0.016, combatType: 'melee', threatWeight: 4 },
  holy_paladin: { class: 'paladin', damageCoef: 0.85, survivabilityCoef: 1.0, avoidance: 0.05, healFrac: 0.3, passiveHealPct: 0.022, combatType: 'magic', threatWeight: 1 },
  // Both Mage specs are matched to the other pure-DPS casters (Shadow
  // Priest's own 1.0/0.8) rather than given a raw-number edge — they
  // differentiate through their ability kits (combatEngine/abilities.ts),
  // not a bigger coefficient. Mage has no survivability or threat tools of
  // its own, so it leans on a tank companion more than Shadow Priest does.
  mage_fire: { class: 'mage', damageCoef: 1.0, survivabilityCoef: 0.75, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.0, combatType: 'magic', threatWeight: 1 },
  mage_frost: { class: 'mage', damageCoef: 1.0, survivabilityCoef: 0.75, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.0, combatType: 'magic', threatWeight: 1 },
};

export function statAtLevel(cls: ClassId, stat: BaseStat, level: number): number {
  return 5 + (level - 1) * CLASS_GROWTH[cls][stat];
}

export const CLASS_LABELS: Record<ClassId, string> = {
  warrior: 'Warrior',
  priest: 'Priest',
  paladin: 'Paladin',
  mage: 'Mage',
};

// Which armor types each class can equip. Priest is cloth-only; the two
// physical classes can wear anything (cloth included, just off-stat for
// them) — matches the classic "plate/mail wearer can always drop down to
// lighter armor" convention. Weapons and rings have no armorType and are
// unrestricted for everyone.
export const ALLOWED_ARMOR_TYPES: Record<ClassId, ArmorType[]> = {
  warrior: ['cloth', 'leather', 'mail', 'plate'],
  paladin: ['cloth', 'leather', 'mail', 'plate'],
  priest: ['cloth'],
  mage: ['cloth'],
};

export function canClassEquip(cls: ClassId, item: Pick<ItemDef, 'armorType'>): boolean {
  return !item.armorType || ALLOWED_ARMOR_TYPES[cls].includes(item.armorType);
}

export const SPEC_LABELS: Record<SpecId, string> = {
  warrior_dps: 'Melee DPS',
  warrior_tank: 'Tank',
  shadow_priest: 'Shadow',
  holy_priest: 'Holy',
  prot_paladin: 'Protection',
  holy_paladin: 'Holy',
  mage_fire: 'Fire',
  mage_frost: 'Frost',
};

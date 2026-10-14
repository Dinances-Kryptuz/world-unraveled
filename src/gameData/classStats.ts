import type { ArmorType, ItemDef } from './types';
import type { CombatType } from './combatTriangle';

// 'mage' is companion-only for now — not one of classInfo.ts's
// CLASS_SHOWCASE, so no player character ever has class === 'mage' and
// mage_fire/mage_frost are never offered on the character-creation
// storybook either. A future expansion may make it player-playable; until
// then it only exists to give the companion roster a 4th class (see
// gameData/companions.ts).
// 'rogue' is companion-only, same posture as 'mage' above — not one of
// classInfo.ts's CLASS_SHOWCASE, so no player character is ever created
// with it. Added for the "Master of Poisons" companion (see
// companions.ts) — a single spec for now, not the usual two.
export type ClassId = 'warrior' | 'priest' | 'paladin' | 'mage' | 'rogue';
export type SpecId =
  | 'warrior_dps'
  | 'warrior_tank'
  | 'shadow_priest'
  | 'holy_priest'
  | 'prot_paladin'
  | 'holy_paladin'
  | 'mage_fire'
  | 'mage_frost'
  | 'rogue_poison';

export type BaseStat = 'STR' | 'STA' | 'INT' | 'SPI' | 'AGI';

// Per-level growth rate for each base stat, by class. Every character starts
// at 5 in each stat at level 1; stat(level) = 5 + (level - 1) * growth.
// Paladin STA deliberately matches Warrior's — plate-wearer parity, fixed
// during Pass 1 calibration (Prot Paladin was underwater at Warrior-equal STA).
// AGI was 0 growth for every class until Rogue — no OTHER class grants AGI
// from leveling, so every non-Rogue character still sits at the flat
// level-1 baseline (5) until they equip AGI gear (Leatherworking's
// rollable stat — see equipmentRolls.ts's ARMOR_STATS). Rogue is the one
// deliberate exception: AGI-driven crit/dodge (combatFormulas.ts) IS its
// whole identity, so it gets real AGI growth from leveling, same as every
// other class gets real growth in its own primary stat.
export const CLASS_GROWTH: Record<ClassId, Record<BaseStat, number>> = {
  warrior: { STR: 1.2, STA: 1.0, INT: 0.2, SPI: 0.2, AGI: 0 },
  priest: { STR: 0.2, STA: 0.5, INT: 1.2, SPI: 1.0, AGI: 0 },
  paladin: { STR: 0.8, STA: 1.0, INT: 0.6, SPI: 0.6, AGI: 0 },
  // A pure caster DPS class with no healing spec — all the INT a Priest
  // gets, none of the SPI (nothing of Mage's ever reads SPI), and the
  // thinnest STA of any class (a Priest at least has healing to offset
  // being squishy; a Mage companion leans on the group's tank instead).
  mage: { STR: 0.2, STA: 0.4, INT: 1.4, SPI: 0.1, AGI: 0 },
  // "Master of Poisons" — AGI-primary (crit/dodge), moderate STA (not a
  // tank, but not paper either — it's meant to stand and fight through a
  // long single-target poison ramp), the thinnest STR/INT/SPI of any class
  // (nothing of its kit reads any of the three).
  rogue: { STR: 0.3, STA: 0.8, INT: 0.2, SPI: 0.2, AGI: 1.2 },
};

export const PRIMARY_STAT: Record<ClassId, BaseStat> = {
  warrior: 'STR',
  priest: 'INT',
  paladin: 'STR',
  rogue: 'AGI',
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
  // not a bigger coefficient. Mage has no healFrac/threat tools of its own,
  // so it leans on a tank companion more than Shadow Priest does.
  //
  // survivabilityCoef raised 0.75 -> 0.8 (matching Shadow Priest's own
  // floor — no longer the single squishiest spec on top of everything
  // else) and passiveHealPct raised 0.0 -> 0.014 (every OTHER spec in this
  // table has some non-zero baseline trickle, from 0.016 up to 0.044 —
  // Mage was the only one with literally none) — a companion-reliability
  // fix (Mage is currently only usable as a hired companion/AI ally, with
  // a player class planned for the future). A live-simulation sweep found
  // the ORIGINAL numbers meant even the game's own intended pairing — Mage
  // + a dedicated, fully-geared tank companion — still eventually wiped
  // over a multi-hour window (1021 kills then death vs. a weak zone-1
  // mob; 19 kills then death vs. a mid-tier mob); this fix makes that same
  // pairing sustain indefinitely (5062/1812 kills, no forced retreat) with
  // zero change to scenarios that were already safe. Solo Mage (no tank)
  // remains deliberately the weakest spec in the roster, unchanged — it's
  // still meant to lean on a tank, just no longer unable to survive WITH
  // one.
  mage_fire: { class: 'mage', damageCoef: 1.0, survivabilityCoef: 0.8, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.014, combatType: 'magic', threatWeight: 1 },
  mage_frost: { class: 'mage', damageCoef: 1.0, survivabilityCoef: 0.8, avoidance: 0.05, healFrac: 0.0, passiveHealPct: 0.014, combatType: 'magic', threatWeight: 1 },
  // "Master of Poisons" — single-spec class (see ClassId's doc comment),
  // companion-only V1. Its identity is entirely in its innate poison procs
  // (engine.ts's applyCripplingPoisonDebuff/applyDeadlyPoisonStack), not a
  // raw-number edge, so damageCoef matches the other melee DPS baseline
  // (Warrior DPS's own 1.0). AGI-driven avoidance (dodge, on top of this
  // flat avoidance — see combatFormulas.ts) reflects the classic
  // lightly-armored, evasive rogue archetype.
  rogue_poison: { class: 'rogue', damageCoef: 1.0, survivabilityCoef: 0.85, avoidance: 0.08, healFrac: 0.0, passiveHealPct: 0.016, combatType: 'melee', threatWeight: 1 },
};

export function statAtLevel(cls: ClassId, stat: BaseStat, level: number): number {
  return 5 + (level - 1) * CLASS_GROWTH[cls][stat];
}

export const CLASS_LABELS: Record<ClassId, string> = {
  warrior: 'Warrior',
  priest: 'Priest',
  paladin: 'Paladin',
  mage: 'Mage',
  rogue: 'Rogue',
};

// Name color-coding (player characters and companions alike) — same
// "recognizable color per category" convention as itemRarity.ts's
// RARITY_COLORS, just keyed by class instead of rarity. White/pink/cyan/
// yellow all measure well under WCAG AA contrast against this game's light
// parchment backgrounds on their own (~1.1-1.9:1 vs. the 4.5:1 minimum) —
// components/ClassColoredName.tsx fixes this with a dark text outline at
// the display site rather than by picking different, less-true-to-the-
// name hexes here.
export const CLASS_NAME_COLORS: Record<ClassId, string> = {
  warrior: '#8b5a2b',
  priest: '#ffffff',
  paladin: '#f58cba',
  mage: '#19c3d6',
  rogue: '#fff569',
};

// Which armor types each class can equip. Priest is cloth-only; the two
// physical classes can wear anything (cloth included, just off-stat for
// them) — matches the classic "plate/mail wearer can always drop down to
// lighter armor" convention. Rogue is leather-only (explicitly NOT cloth —
// unlike every other class's armor floor, Rogue doesn't get a "drop down a
// tier" exception; see the user's explicit "leatherwearer only" ask), never
// mail/plate. Weapons and rings have no armorType and are unrestricted for
// everyone by THIS table — Rogue's further weapon restriction (blades only,
// no staff/wand/orb/book/shield) lives in equipmentStats.ts's
// canEquipWeaponLoadout under the 'rogue_blades' role instead.
export const ALLOWED_ARMOR_TYPES: Record<ClassId, ArmorType[]> = {
  warrior: ['cloth', 'leather', 'mail', 'plate'],
  paladin: ['cloth', 'leather', 'mail', 'plate'],
  priest: ['cloth'],
  mage: ['cloth'],
  rogue: ['leather'],
};

export function canClassEquip(cls: ClassId, item: Pick<ItemDef, 'armorType'>): boolean {
  return !item.armorType || ALLOWED_ARMOR_TYPES[cls].includes(item.armorType);
}

// Equip-role restrictions — which weapon/offhand SHAPES each spec may wear,
// independent of ALLOWED_ARMOR_TYPES above (that gates armor by class; this
// gates weapon+offhand combination by spec — keyed by spec, not class,
// because Paladin splits into two different shapes: Protection is a
// shield-tank like Warrior Tank, while Holy is the one spec allowed a
// two-hander as an alternative to 1H+shield). See equipmentStats.ts's
// canEquipWeaponLoadout for what each role actually allows. 'rogue_blades'
// is its own role rather than sharing 'melee_dps' with Warrior DPS — Rogue
// additionally can't equip a staff/wand (those stay fine for Warrior DPS,
// which has no such restriction).
export type EquipRole = 'tank' | 'melee_dps' | 'paladin_healer' | 'caster' | 'rogue_blades';

export const EQUIP_ROLE_BY_SPEC: Record<SpecId, EquipRole> = {
  warrior_tank: 'tank',
  prot_paladin: 'tank',
  warrior_dps: 'melee_dps',
  rogue_poison: 'rogue_blades',
  holy_paladin: 'paladin_healer',
  shadow_priest: 'caster',
  holy_priest: 'caster',
  mage_fire: 'caster',
  mage_frost: 'caster',
};

// A character/companion/alt that somehow still has no spec chosen (a
// companion/alt recruited before level 5 under the old system, or a legacy
// player character read after the combined class+spec storybook creation
// flow replaced the separate level-5 SpecSelectionScreen — see
// firebase/character.ts's getCharacter) needs SOME spec to fight with.
// Picks each class's first (damage-leaning) spec rather than leaving combat
// math undefined.
export const FALLBACK_SPEC_BY_CLASS: Record<ClassId, SpecId> = {
  warrior: 'warrior_dps',
  priest: 'shadow_priest',
  paladin: 'prot_paladin',
  mage: 'mage_fire',
  rogue: 'rogue_poison',
};

export const SPEC_LABELS: Record<SpecId, string> = {
  warrior_dps: 'Melee DPS',
  warrior_tank: 'Tank',
  shadow_priest: 'Shadow',
  holy_priest: 'Holy',
  prot_paladin: 'Protection',
  holy_paladin: 'Holy',
  mage_fire: 'Fire',
  mage_frost: 'Frost',
  rogue_poison: 'Poisons',
};

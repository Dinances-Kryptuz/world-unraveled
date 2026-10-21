import type { BaseStat } from './classStats';
import type { EquipmentSlot, ItemDef } from './types';
import { RECIPES } from './recipes';
import { MONSTERS } from './monsters';
import { ZONE_TIER, DEFAULT_ZONE_ID } from './zones';
import { tierForLevel } from './professionTiers';
import { TRAINER_ZONE_BY_RANK } from './professionTrainers';

// Enchantments bind to the equipment SLOT, not a specific item instance —
// this engine has no concept of a unique item instance (every item of the
// same id is identical; see Character.enchantments's doc comment in
// types/character.ts). An enchant applies its bonus to whatever is
// currently in that slot and persists across re-equips, which is the
// closest honest equivalent to "enchantments are persistent on the item"
// without a much larger item-instancing rewrite. Re-enchanting a slot
// (useEnchantScroll in firebase/enchanting.ts) simply overwrites the old one.
//
// Scrolls, not instant application: an ENCHANTS entry is purely the EFFECT
// (what it does, and which scroll item applies it) — the requiredSkill/
// xpAward/materials/goldCost that used to live here moved onto the matching
// scroll_* Recipe (recipes.ts's "Enchanting scrolls" section), so crafting a
// scroll now runs through the exact same timed/offline/AFK-capable
// craftingEngine.ts pipeline every other crafting profession uses instead of
// a single instant click. Using the finished scroll (useEnchantScroll) is
// then a free, instant, no-skill-gated action — the time/material/skill
// cost was already paid once, at craft time, matching a classic MMO's
// enchanting-vellum workflow and the "far less daunting, more AFK" goal
// this redesign was built for.
//
// Which of 3 charge-consumption rules this enchant follows (Enchanting
// overhaul's charge model — see Character.enchantmentCharges's doc
// comment) — 'passive' for every enchant below right now (plain always-on
// stat bonuses, consuming 1 charge per completed combat encounter); the
// full 6-zone catalog (Phase E6) adds real 'offensive' (1 charge per
// eligible outgoing attack, proc or not) and 'defensive' (1 charge only on
// a successful incoming hit) enchants alongside more 'passive' ones.
export type EnchantCategory = 'offensive' | 'defensive' | 'passive';

// Every enchant scroll always grants exactly this many charges when used —
// never more, never fewer, regardless of Mastery (gameData/enchanting.ts's
// scroll-crafting Mastery track, Phase E7, only ever affects crafting
// speed/ingredient-preservation, NEVER this number) — per the design
// brief's explicit, repeated "always exactly 100 charges" rule.
export const ENCHANT_SCROLL_CHARGES = 100;

// Mirrors combatEngine/types.ts's EnchantProcKind/EnchantWeaponProc exactly
// — re-declared here (rather than imported) so gameData/ stays independent
// of combatEngine/ the same way every other gameData module already is;
// firebase/enchanting.ts's buildActiveEnchantTotals (Phase E6-4) maps an
// EnchantProcDef 1:1 onto an EnchantWeaponProc when it builds the combat
// engine's input.
export type EnchantProcKind = 'fiery_weapon' | 'lifestealing' | 'icy_chill' | 'crusader' | 'chain_lightning';

export interface EnchantProcDef {
  kind: EnchantProcKind;
  chancePct: number;
  power: number; // % of the triggering hit's damage — see EnchantWeaponProc.power's doc comment. Unused by crusader/icy_chill.
}

export interface EnchantDef {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  category: EnchantCategory;
  statBonuses: Partial<Record<BaseStat, number>>;
  // The enchant_scroll item (items.ts) that applies this enchant when used.
  scrollItemId: string;
  // ── Phase E6 catalog fields — all optional; absent behaves exactly like
  // statBonuses: {} already does (zero effect), so every pre-catalog
  // enchant (now none — see ENCHANTS's doc comment) would have needed no
  // changes. Each maps 1:1 onto a CasterProfile/EncounterSetupInput field
  // of the same name (combatEngine/engine.ts, combatEngine/types.ts),
  // summed across every charged slot by buildActiveEnchantTotals.
  flatHpBonus?: number;
  flatManaBonus?: number;
  flatArmorBonus?: number; // the "Defense" family — this engine's closest existing lever to a flat Defense stat
  hastePct?: number;
  flatDamageBonus?: number; // Spell Power / Striking / Impact family
  healingPowerFlatBonus?: number;
  flatDamageReduction?: number; // Absorption family — flat incoming-damage reduction, minimum 1
  fireResistancePct?: number;
  shadowResistancePct?: number;
  // frostResistancePct is deliberately NOT modeled — defined in the
  // catalog's data (name/description/materials) but mechanically inert, no
  // frost damage school exists in this combat engine. See
  // CasterProfile.fireResistancePct's doc comment.
  beastDamageBonusPct?: number;
  demonDamageBonusPct?: number; // defined but never fires — no monster is tagged 'demon' yet
  // Weapon-slot proc enchants (Fiery Weapon/Lifestealing/Crusader and their
  // Ember-tier upgrades) — only ever set on a slot: 'weapon' EnchantDef.
  proc?: EnchantProcDef;
}

// Weapon/Chest/Gloves/Legs/Boots/Ring/Cape — the equipment slots the real
// 6-zone catalog (Phase E6) actually targets, per the design brief's exact
// recipe tables. The pre-catalog placeholder ENCHANTS (12 simple stat
// enchants that stood in during Phases E1-E5) have been removed wholesale;
// this registry is populated below by the full catalog.
export const ENCHANTS: Record<string, EnchantDef> = {
  enchant_minor_health: {
    id: 'enchant_minor_health', name: 'Enchant Chest: Minor Health',
    description: 'Use on an equipped chest item to apply the Minor Health enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_minor_health',
    flatHpBonus: 10,
  },
  enchant_minor_mana: {
    id: 'enchant_minor_mana', name: 'Enchant Chest: Minor Mana',
    description: 'Use on an equipped chest item to apply the Minor Mana enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_minor_mana',
    flatManaBonus: 10,
  },
  enchant_minor_stamina: {
    id: 'enchant_minor_stamina', name: 'Enchant Bracer: Minor Stamina',
    description: 'Use on an equipped bracer item to apply the Minor Stamina enchant.', slot: 'bracers', category: 'passive',
    statBonuses: { STA: 1 }, scrollItemId: 'scroll_minor_stamina',
  },
  enchant_minor_strength: {
    id: 'enchant_minor_strength', name: 'Enchant Gloves: Minor Strength',
    description: 'Use on an equipped gloves item to apply the Minor Strength enchant.', slot: 'gloves', category: 'passive',
    statBonuses: { STR: 1 }, scrollItemId: 'scroll_minor_strength',
  },
  enchant_minor_agility: {
    id: 'enchant_minor_agility', name: 'Enchant Boots: Minor Agility',
    description: 'Use on an equipped boots item to apply the Minor Agility enchant.', slot: 'boots', category: 'passive',
    statBonuses: { AGI: 1 }, scrollItemId: 'scroll_minor_agility',
  },
  enchant_minor_intellect: {
    id: 'enchant_minor_intellect', name: 'Enchant Chest: Minor Intellect',
    description: 'Use on an equipped chest item to apply the Minor Intellect enchant.', slot: 'chest', category: 'passive',
    statBonuses: { INT: 1 }, scrollItemId: 'scroll_minor_intellect',
  },
  enchant_minor_spirit: {
    id: 'enchant_minor_spirit', name: 'Enchant Chest: Minor Spirit',
    description: 'Use on an equipped chest item to apply the Minor Spirit enchant.', slot: 'chest', category: 'passive',
    statBonuses: { SPI: 1 }, scrollItemId: 'scroll_minor_spirit',
  },
  enchant_minor_defense: {
    id: 'enchant_minor_defense', name: 'Enchant Cloak: Minor Defense',
    description: 'Use on an equipped cloak item to apply the Minor Defense enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_minor_defense',
    flatArmorBonus: 2,
  },
  enchant_minor_absorption: {
    id: 'enchant_minor_absorption', name: 'Enchant Chest: Minor Absorption',
    description: 'Use on an equipped chest item to apply the Minor Absorption enchant.', slot: 'chest', category: 'defensive',
    statBonuses: {}, scrollItemId: 'scroll_minor_absorption',
    flatDamageReduction: 1,
  },
  enchant_minor_striking: {
    id: 'enchant_minor_striking', name: 'Enchant Weapon: Minor Striking',
    description: 'Use on an equipped weapon item to apply the Minor Striking enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_minor_striking',
    flatDamageBonus: 1,
  },
  enchant_minor_impact: {
    id: 'enchant_minor_impact', name: 'Enchant Weapon: Minor Impact',
    description: 'Use on an equipped weapon item to apply the Minor Impact enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_minor_impact',
    flatDamageBonus: 2,
  },
  enchant_minor_beastslayer: {
    id: 'enchant_minor_beastslayer', name: 'Enchant Weapon: Minor Beastslayer',
    description: 'Use on an equipped weapon item to apply the Minor Beastslayer enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_minor_beastslayer',
    beastDamageBonusPct: 3,
  },
  enchant_lesser_health: {
    id: 'enchant_lesser_health', name: 'Enchant Chest: Lesser Health',
    description: 'Use on an equipped chest item to apply the Lesser Health enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_health',
    flatHpBonus: 25,
  },
  enchant_lesser_mana: {
    id: 'enchant_lesser_mana', name: 'Enchant Chest: Lesser Mana',
    description: 'Use on an equipped chest item to apply the Lesser Mana enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_mana',
    flatManaBonus: 25,
  },
  enchant_lesser_stamina: {
    id: 'enchant_lesser_stamina', name: 'Enchant Bracer: Lesser Stamina',
    description: 'Use on an equipped bracer item to apply the Lesser Stamina enchant.', slot: 'bracers', category: 'passive',
    statBonuses: { STA: 3 }, scrollItemId: 'scroll_lesser_stamina',
  },
  enchant_lesser_strength: {
    id: 'enchant_lesser_strength', name: 'Enchant Gloves: Lesser Strength',
    description: 'Use on an equipped gloves item to apply the Lesser Strength enchant.', slot: 'gloves', category: 'passive',
    statBonuses: { STR: 3 }, scrollItemId: 'scroll_lesser_strength',
  },
  enchant_lesser_agility: {
    id: 'enchant_lesser_agility', name: 'Enchant Boots: Lesser Agility',
    description: 'Use on an equipped boots item to apply the Lesser Agility enchant.', slot: 'boots', category: 'passive',
    statBonuses: { AGI: 3 }, scrollItemId: 'scroll_lesser_agility',
  },
  enchant_lesser_intellect: {
    id: 'enchant_lesser_intellect', name: 'Enchant Chest: Lesser Intellect',
    description: 'Use on an equipped chest item to apply the Lesser Intellect enchant.', slot: 'chest', category: 'passive',
    statBonuses: { INT: 3 }, scrollItemId: 'scroll_lesser_intellect',
  },
  enchant_lesser_spirit: {
    id: 'enchant_lesser_spirit', name: 'Enchant Chest: Lesser Spirit',
    description: 'Use on an equipped chest item to apply the Lesser Spirit enchant.', slot: 'chest', category: 'passive',
    statBonuses: { SPI: 3 }, scrollItemId: 'scroll_lesser_spirit',
  },
  enchant_lesser_defense: {
    id: 'enchant_lesser_defense', name: 'Enchant Cloak: Lesser Defense',
    description: 'Use on an equipped cloak item to apply the Lesser Defense enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_defense',
    flatArmorBonus: 5,
  },
  enchant_lesser_absorption: {
    id: 'enchant_lesser_absorption', name: 'Enchant Chest: Lesser Absorption',
    description: 'Use on an equipped chest item to apply the Lesser Absorption enchant.', slot: 'chest', category: 'defensive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_absorption',
    flatDamageReduction: 2,
  },
  enchant_lesser_striking: {
    id: 'enchant_lesser_striking', name: 'Enchant Weapon: Lesser Striking',
    description: 'Use on an equipped weapon item to apply the Lesser Striking enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_striking',
    flatDamageBonus: 3,
  },
  enchant_lesser_impact: {
    id: 'enchant_lesser_impact', name: 'Enchant Weapon: Lesser Impact',
    description: 'Use on an equipped weapon item to apply the Lesser Impact enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_impact',
    flatDamageBonus: 5,
  },
  enchant_lesser_beastslayer: {
    id: 'enchant_lesser_beastslayer', name: 'Enchant Weapon: Lesser Beastslayer',
    description: 'Use on an equipped weapon item to apply the Lesser Beastslayer enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_beastslayer',
    beastDamageBonusPct: 5,
  },
  enchant_lesser_elemental_resistance: {
    id: 'enchant_lesser_elemental_resistance', name: 'Enchant Cloak: Lesser Elemental Resistance',
    description: 'Use on an equipped cloak item to apply the Lesser Elemental Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_lesser_elemental_resistance',
    fireResistancePct: 3,
    shadowResistancePct: 3,
  },
  enchant_health_z3: {
    id: 'enchant_health_z3', name: 'Enchant Chest: Health',
    description: 'Use on an equipped chest item to apply the Health enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_health_z3',
    flatHpBonus: 50,
  },
  enchant_mana_z3: {
    id: 'enchant_mana_z3', name: 'Enchant Chest: Mana',
    description: 'Use on an equipped chest item to apply the Mana enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_mana_z3',
    flatManaBonus: 50,
  },
  enchant_stamina_z3: {
    id: 'enchant_stamina_z3', name: 'Enchant Bracer: Stamina',
    description: 'Use on an equipped bracer item to apply the Stamina enchant.', slot: 'bracers', category: 'passive',
    statBonuses: { STA: 5 }, scrollItemId: 'scroll_stamina_z3',
  },
  enchant_strength_z3: {
    id: 'enchant_strength_z3', name: 'Enchant Gloves: Strength',
    description: 'Use on an equipped gloves item to apply the Strength enchant.', slot: 'gloves', category: 'passive',
    statBonuses: { STR: 5 }, scrollItemId: 'scroll_strength_z3',
  },
  enchant_agility_z3: {
    id: 'enchant_agility_z3', name: 'Enchant Boots: Agility',
    description: 'Use on an equipped boots item to apply the Agility enchant.', slot: 'boots', category: 'passive',
    statBonuses: { AGI: 5 }, scrollItemId: 'scroll_agility_z3',
  },
  enchant_intellect_z3: {
    id: 'enchant_intellect_z3', name: 'Enchant Chest: Intellect',
    description: 'Use on an equipped chest item to apply the Intellect enchant.', slot: 'chest', category: 'passive',
    statBonuses: { INT: 5 }, scrollItemId: 'scroll_intellect_z3',
  },
  enchant_spirit_z3: {
    id: 'enchant_spirit_z3', name: 'Enchant Chest: Spirit',
    description: 'Use on an equipped chest item to apply the Spirit enchant.', slot: 'chest', category: 'passive',
    statBonuses: { SPI: 5 }, scrollItemId: 'scroll_spirit_z3',
  },
  enchant_greater_defense_z3: {
    id: 'enchant_greater_defense_z3', name: 'Enchant Cloak: Greater Defense',
    description: 'Use on an equipped cloak item to apply the Greater Defense enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_defense_z3',
    flatArmorBonus: 10,
  },
  enchant_striking_z3: {
    id: 'enchant_striking_z3', name: 'Enchant Weapon: Striking',
    description: 'Use on an equipped weapon item to apply the Striking enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_striking_z3',
    flatDamageBonus: 5,
  },
  enchant_impact_z3: {
    id: 'enchant_impact_z3', name: 'Enchant Weapon: Impact',
    description: 'Use on an equipped weapon item to apply the Impact enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_impact_z3',
    flatDamageBonus: 7,
  },
  enchant_greater_beastslayer_z3: {
    id: 'enchant_greater_beastslayer_z3', name: 'Enchant Weapon: Greater Beastslayer',
    description: 'Use on an equipped weapon item to apply the Greater Beastslayer enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_greater_beastslayer_z3',
    beastDamageBonusPct: 8,
  },
  enchant_minor_haste_z3: {
    id: 'enchant_minor_haste_z3', name: 'Enchant Gloves: Minor Haste',
    description: 'Use on an equipped gloves item to apply the Minor Haste enchant.', slot: 'gloves', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_minor_haste_z3',
    hastePct: 3,
  },
  enchant_fire_resistance_z3: {
    id: 'enchant_fire_resistance_z3', name: 'Enchant Cloak: Fire Resistance',
    description: 'Use on an equipped cloak item to apply the Fire Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_fire_resistance_z3',
    fireResistancePct: 5,
  },
  enchant_frost_resistance_z3: {
    id: 'enchant_frost_resistance_z3', name: 'Enchant Cloak: Frost Resistance',
    description: 'Use on an equipped cloak item to apply the Frost Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_frost_resistance_z3',
  },
  enchant_shadow_resistance_z3: {
    id: 'enchant_shadow_resistance_z3', name: 'Enchant Cloak: Shadow Resistance',
    description: 'Use on an equipped cloak item to apply the Shadow Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_shadow_resistance_z3',
    shadowResistancePct: 5,
  },
  enchant_greater_health_z4: {
    id: 'enchant_greater_health_z4', name: 'Enchant Chest: Greater Health',
    description: 'Use on an equipped chest item to apply the Greater Health enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_health_z4',
    flatHpBonus: 80,
  },
  enchant_greater_mana_z4: {
    id: 'enchant_greater_mana_z4', name: 'Enchant Chest: Greater Mana',
    description: 'Use on an equipped chest item to apply the Greater Mana enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_mana_z4',
    flatManaBonus: 80,
  },
  enchant_greater_stamina_z4: {
    id: 'enchant_greater_stamina_z4', name: 'Enchant Bracer: Greater Stamina',
    description: 'Use on an equipped bracer item to apply the Greater Stamina enchant.', slot: 'bracers', category: 'passive',
    statBonuses: { STA: 7 }, scrollItemId: 'scroll_greater_stamina_z4',
  },
  enchant_greater_strength_z4: {
    id: 'enchant_greater_strength_z4', name: 'Enchant Gloves: Greater Strength',
    description: 'Use on an equipped gloves item to apply the Greater Strength enchant.', slot: 'gloves', category: 'passive',
    statBonuses: { STR: 7 }, scrollItemId: 'scroll_greater_strength_z4',
  },
  enchant_greater_agility_z4: {
    id: 'enchant_greater_agility_z4', name: 'Enchant Boots: Greater Agility',
    description: 'Use on an equipped boots item to apply the Greater Agility enchant.', slot: 'boots', category: 'passive',
    statBonuses: { AGI: 7 }, scrollItemId: 'scroll_greater_agility_z4',
  },
  enchant_greater_intellect_z4: {
    id: 'enchant_greater_intellect_z4', name: 'Enchant Chest: Greater Intellect',
    description: 'Use on an equipped chest item to apply the Greater Intellect enchant.', slot: 'chest', category: 'passive',
    statBonuses: { INT: 7 }, scrollItemId: 'scroll_greater_intellect_z4',
  },
  enchant_greater_spirit_z4: {
    id: 'enchant_greater_spirit_z4', name: 'Enchant Chest: Greater Spirit',
    description: 'Use on an equipped chest item to apply the Greater Spirit enchant.', slot: 'chest', category: 'passive',
    statBonuses: { SPI: 7 }, scrollItemId: 'scroll_greater_spirit_z4',
  },
  enchant_superior_defense_z4: {
    id: 'enchant_superior_defense_z4', name: 'Enchant Cloak: Superior Defense',
    description: 'Use on an equipped cloak item to apply the Superior Defense enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_superior_defense_z4',
    flatArmorBonus: 15,
  },
  enchant_greater_striking_z4: {
    id: 'enchant_greater_striking_z4', name: 'Enchant Weapon: Greater Striking',
    description: 'Use on an equipped weapon item to apply the Greater Striking enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_greater_striking_z4',
    flatDamageBonus: 7,
  },
  enchant_greater_impact_z4: {
    id: 'enchant_greater_impact_z4', name: 'Enchant Weapon: Greater Impact',
    description: 'Use on an equipped weapon item to apply the Greater Impact enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_greater_impact_z4',
    flatDamageBonus: 10,
  },
  enchant_greater_haste_z4: {
    id: 'enchant_greater_haste_z4', name: 'Enchant Gloves: Greater Haste',
    description: 'Use on an equipped gloves item to apply the Greater Haste enchant.', slot: 'gloves', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_greater_haste_z4',
    hastePct: 5,
  },
  enchant_greater_fire_resistance_z4: {
    id: 'enchant_greater_fire_resistance_z4', name: 'Enchant Cloak: Greater Fire Resistance',
    description: 'Use on an equipped cloak item to apply the Greater Fire Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_fire_resistance_z4',
    fireResistancePct: 8,
  },
  enchant_greater_frost_resistance_z4: {
    id: 'enchant_greater_frost_resistance_z4', name: 'Enchant Cloak: Greater Frost Resistance',
    description: 'Use on an equipped cloak item to apply the Greater Frost Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_frost_resistance_z4',
  },
  enchant_greater_shadow_resistance_z4: {
    id: 'enchant_greater_shadow_resistance_z4', name: 'Enchant Cloak: Greater Shadow Resistance',
    description: 'Use on an equipped cloak item to apply the Greater Shadow Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_shadow_resistance_z4',
    shadowResistancePct: 8,
  },
  enchant_demonslaying_z4: {
    id: 'enchant_demonslaying_z4', name: 'Enchant Weapon: Demonslaying',
    description: 'Use on an equipped weapon item to apply the Demonslaying enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_demonslaying_z4',
    demonDamageBonusPct: 12,
  },
  enchant_superior_health_z5: {
    id: 'enchant_superior_health_z5', name: 'Enchant Chest: Superior Health',
    description: 'Use on an equipped chest item to apply the Superior Health enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_superior_health_z5',
    flatHpBonus: 120,
  },
  enchant_superior_mana_z5: {
    id: 'enchant_superior_mana_z5', name: 'Enchant Chest: Superior Mana',
    description: 'Use on an equipped chest item to apply the Superior Mana enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_superior_mana_z5',
    flatManaBonus: 120,
  },
  enchant_superior_stamina_z5: {
    id: 'enchant_superior_stamina_z5', name: 'Enchant Bracer: Superior Stamina',
    description: 'Use on an equipped bracer item to apply the Superior Stamina enchant.', slot: 'bracers', category: 'passive',
    statBonuses: { STA: 10 }, scrollItemId: 'scroll_superior_stamina_z5',
  },
  enchant_superior_strength_z5: {
    id: 'enchant_superior_strength_z5', name: 'Enchant Gloves: Superior Strength',
    description: 'Use on an equipped gloves item to apply the Superior Strength enchant.', slot: 'gloves', category: 'passive',
    statBonuses: { STR: 10 }, scrollItemId: 'scroll_superior_strength_z5',
  },
  enchant_superior_agility_z5: {
    id: 'enchant_superior_agility_z5', name: 'Enchant Boots: Superior Agility',
    description: 'Use on an equipped boots item to apply the Superior Agility enchant.', slot: 'boots', category: 'passive',
    statBonuses: { AGI: 10 }, scrollItemId: 'scroll_superior_agility_z5',
  },
  enchant_superior_intellect_z5: {
    id: 'enchant_superior_intellect_z5', name: 'Enchant Chest: Superior Intellect',
    description: 'Use on an equipped chest item to apply the Superior Intellect enchant.', slot: 'chest', category: 'passive',
    statBonuses: { INT: 10 }, scrollItemId: 'scroll_superior_intellect_z5',
  },
  enchant_superior_spirit_z5: {
    id: 'enchant_superior_spirit_z5', name: 'Enchant Chest: Superior Spirit',
    description: 'Use on an equipped chest item to apply the Superior Spirit enchant.', slot: 'chest', category: 'passive',
    statBonuses: { SPI: 10 }, scrollItemId: 'scroll_superior_spirit_z5',
  },
  enchant_greater_stats_z5: {
    id: 'enchant_greater_stats_z5', name: 'Enchant Chest: Greater Stats',
    description: 'Use on an equipped chest item to apply the Greater Stats enchant.', slot: 'chest', category: 'passive',
    statBonuses: { STR: 3, STA: 3, AGI: 3, INT: 3, SPI: 3 }, scrollItemId: 'scroll_greater_stats_z5',
  },
  enchant_superior_defense_z5: {
    id: 'enchant_superior_defense_z5', name: 'Enchant Cloak: Superior Defense',
    description: 'Use on an equipped cloak item to apply the Superior Defense enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_superior_defense_z5',
    flatArmorBonus: 20,
  },
  enchant_superior_striking_z5: {
    id: 'enchant_superior_striking_z5', name: 'Enchant Weapon: Superior Striking',
    description: 'Use on an equipped weapon item to apply the Superior Striking enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_superior_striking_z5',
    flatDamageBonus: 10,
  },
  enchant_superior_impact_z5: {
    id: 'enchant_superior_impact_z5', name: 'Enchant Weapon: Superior Impact',
    description: 'Use on an equipped weapon item to apply the Superior Impact enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_superior_impact_z5',
    flatDamageBonus: 14,
  },
  enchant_greater_haste_z5: {
    id: 'enchant_greater_haste_z5', name: 'Enchant Gloves: Greater Haste',
    description: 'Use on an equipped gloves item to apply the Greater Haste enchant.', slot: 'gloves', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_greater_haste_z5',
    hastePct: 7,
  },
  enchant_greater_fire_resistance_z5: {
    id: 'enchant_greater_fire_resistance_z5', name: 'Enchant Cloak: Greater Fire Resistance',
    description: 'Use on an equipped cloak item to apply the Greater Fire Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_fire_resistance_z5',
    fireResistancePct: 12,
  },
  enchant_greater_frost_resistance_z5: {
    id: 'enchant_greater_frost_resistance_z5', name: 'Enchant Cloak: Greater Frost Resistance',
    description: 'Use on an equipped cloak item to apply the Greater Frost Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_frost_resistance_z5',
  },
  enchant_greater_shadow_resistance_z5: {
    id: 'enchant_greater_shadow_resistance_z5', name: 'Enchant Cloak: Greater Shadow Resistance',
    description: 'Use on an equipped cloak item to apply the Greater Shadow Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_greater_shadow_resistance_z5',
    shadowResistancePct: 12,
  },
  enchant_fiery_weapon_z5: {
    id: 'enchant_fiery_weapon_z5', name: 'Enchant Weapon: Fiery Weapon',
    description: 'Use on an equipped weapon item to apply the Fiery Weapon enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_fiery_weapon_z5',
    proc: { kind: 'fiery_weapon', chancePct: 20, power: 15 },
  },
  enchant_icy_chill_z5: {
    id: 'enchant_icy_chill_z5', name: 'Enchant Weapon: Icy Chill',
    description: 'Use on an equipped weapon item to apply the Icy Chill enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_icy_chill_z5',
    proc: { kind: 'icy_chill', chancePct: 10, power: 0 },
  },
  enchant_lifestealing_z5: {
    id: 'enchant_lifestealing_z5', name: 'Enchant Weapon: Lifestealing',
    description: 'Use on an equipped weapon item to apply the Lifestealing enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_lifestealing_z5',
    proc: { kind: 'lifestealing', chancePct: 15, power: 10 },
  },
  enchant_ember_health: {
    id: 'enchant_ember_health', name: 'Enchant Chest: Ember Health',
    description: 'Use on an equipped chest item to apply the Ember Health enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_ember_health',
    flatHpBonus: 180,
  },
  enchant_ember_mana: {
    id: 'enchant_ember_mana', name: 'Enchant Chest: Ember Mana',
    description: 'Use on an equipped chest item to apply the Ember Mana enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_ember_mana',
    flatManaBonus: 180,
  },
  enchant_ember_stamina: {
    id: 'enchant_ember_stamina', name: 'Enchant Bracer: Ember Stamina',
    description: 'Use on an equipped bracer item to apply the Ember Stamina enchant.', slot: 'bracers', category: 'passive',
    statBonuses: { STA: 14 }, scrollItemId: 'scroll_ember_stamina',
  },
  enchant_ember_strength: {
    id: 'enchant_ember_strength', name: 'Enchant Gloves: Ember Strength',
    description: 'Use on an equipped gloves item to apply the Ember Strength enchant.', slot: 'gloves', category: 'passive',
    statBonuses: { STR: 14 }, scrollItemId: 'scroll_ember_strength',
  },
  enchant_ember_agility: {
    id: 'enchant_ember_agility', name: 'Enchant Boots: Ember Agility',
    description: 'Use on an equipped boots item to apply the Ember Agility enchant.', slot: 'boots', category: 'passive',
    statBonuses: { AGI: 14 }, scrollItemId: 'scroll_ember_agility',
  },
  enchant_ember_intellect: {
    id: 'enchant_ember_intellect', name: 'Enchant Chest: Ember Intellect',
    description: 'Use on an equipped chest item to apply the Ember Intellect enchant.', slot: 'chest', category: 'passive',
    statBonuses: { INT: 14 }, scrollItemId: 'scroll_ember_intellect',
  },
  enchant_ember_spirit: {
    id: 'enchant_ember_spirit', name: 'Enchant Chest: Ember Spirit',
    description: 'Use on an equipped chest item to apply the Ember Spirit enchant.', slot: 'chest', category: 'passive',
    statBonuses: { SPI: 14 }, scrollItemId: 'scroll_ember_spirit',
  },
  enchant_ember_stats: {
    id: 'enchant_ember_stats', name: 'Enchant Chest: Ember Stats',
    description: 'Use on an equipped chest item to apply the Ember Stats enchant.', slot: 'chest', category: 'passive',
    statBonuses: { STR: 5, STA: 5, AGI: 5, INT: 5, SPI: 5 }, scrollItemId: 'scroll_ember_stats',
  },
  enchant_ember_defense: {
    id: 'enchant_ember_defense', name: 'Enchant Cloak: Ember Defense',
    description: 'Use on an equipped cloak item to apply the Ember Defense enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_ember_defense',
    flatArmorBonus: 30,
  },
  enchant_ember_striking: {
    id: 'enchant_ember_striking', name: 'Enchant Weapon: Ember Striking',
    description: 'Use on an equipped weapon item to apply the Ember Striking enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_ember_striking',
    flatDamageBonus: 14,
  },
  enchant_ember_impact: {
    id: 'enchant_ember_impact', name: 'Enchant Weapon: Ember Impact',
    description: 'Use on an equipped weapon item to apply the Ember Impact enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_ember_impact',
    flatDamageBonus: 20,
  },
  enchant_ember_haste: {
    id: 'enchant_ember_haste', name: 'Enchant Gloves: Ember Haste',
    description: 'Use on an equipped gloves item to apply the Ember Haste enchant.', slot: 'gloves', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_ember_haste',
    hastePct: 10,
  },
  enchant_ember_fire_resistance: {
    id: 'enchant_ember_fire_resistance', name: 'Enchant Cloak: Ember Fire Resistance',
    description: 'Use on an equipped cloak item to apply the Ember Fire Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_ember_fire_resistance',
    fireResistancePct: 15,
  },
  enchant_ember_frost_resistance: {
    id: 'enchant_ember_frost_resistance', name: 'Enchant Cloak: Ember Frost Resistance',
    description: 'Use on an equipped cloak item to apply the Ember Frost Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_ember_frost_resistance',
  },
  enchant_ember_shadow_resistance: {
    id: 'enchant_ember_shadow_resistance', name: 'Enchant Cloak: Ember Shadow Resistance',
    description: 'Use on an equipped cloak item to apply the Ember Shadow Resistance enchant.', slot: 'cape', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_ember_shadow_resistance',
    shadowResistancePct: 15,
  },
  enchant_ember_fiery_weapon: {
    id: 'enchant_ember_fiery_weapon', name: 'Enchant Weapon: Ember Fiery Weapon',
    description: 'Use on an equipped weapon item to apply the Ember Fiery Weapon enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_ember_fiery_weapon',
    proc: { kind: 'fiery_weapon', chancePct: 25, power: 20 },
  },
  enchant_ember_icy_chill: {
    id: 'enchant_ember_icy_chill', name: 'Enchant Weapon: Ember Icy Chill',
    description: 'Use on an equipped weapon item to apply the Ember Icy Chill enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_ember_icy_chill',
    proc: { kind: 'icy_chill', chancePct: 10, power: 0 },
  },
  enchant_ember_lifestealing: {
    id: 'enchant_ember_lifestealing', name: 'Enchant Weapon: Ember Lifestealing',
    description: 'Use on an equipped weapon item to apply the Ember Lifestealing enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_ember_lifestealing',
    proc: { kind: 'lifestealing', chancePct: 20, power: 15 },
  },
  enchant_crusader: {
    id: 'enchant_crusader', name: 'Enchant Weapon: Crusader',
    description: 'Use on an equipped weapon item to apply the Crusader enchant.', slot: 'weapon', category: 'offensive',
    statBonuses: {}, scrollItemId: 'scroll_crusader',
    proc: { kind: 'crusader', chancePct: 15, power: 0 },
  },
  enchant_spellpower: {
    id: 'enchant_spellpower', name: 'Enchant Weapon: Spellpower',
    description: 'Use on an equipped weapon item to apply the Spellpower enchant.', slot: 'weapon', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_spellpower',
    flatDamageBonus: 20,
  },
  enchant_healing_power: {
    id: 'enchant_healing_power', name: 'Enchant Weapon: Healing Power',
    description: 'Use on an equipped weapon item to apply the Healing Power enchant.', slot: 'weapon', category: 'passive',
    statBonuses: {}, scrollItemId: 'scroll_healing_power',
    healingPowerFlatBonus: 20,
  },
  enchant_mighty_intellect: {
    id: 'enchant_mighty_intellect', name: 'Enchant Weapon: Mighty Intellect',
    description: 'Use on an equipped weapon item to apply the Mighty Intellect enchant.', slot: 'weapon', category: 'passive',
    statBonuses: { INT: 20 }, scrollItemId: 'scroll_mighty_intellect',
  },
  enchant_mighty_spirit: {
    id: 'enchant_mighty_spirit', name: 'Enchant Weapon: Mighty Spirit',
    description: 'Use on an equipped weapon item to apply the Mighty Spirit enchant.', slot: 'weapon', category: 'passive',
    statBonuses: { SPI: 20 }, scrollItemId: 'scroll_mighty_spirit',
  },
  enchant_mighty_strength: {
    id: 'enchant_mighty_strength', name: 'Enchant Weapon: Mighty Strength',
    description: 'Use on an equipped weapon item to apply the Mighty Strength enchant.', slot: 'weapon', category: 'passive',
    statBonuses: { STR: 20 }, scrollItemId: 'scroll_mighty_strength',
  },
  enchant_mighty_agility: {
    id: 'enchant_mighty_agility', name: 'Enchant Weapon: Mighty Agility',
    description: 'Use on an equipped weapon item to apply the Mighty Agility enchant.', slot: 'weapon', category: 'passive',
    statBonuses: { AGI: 20 }, scrollItemId: 'scroll_mighty_agility',
  },

  // ── The Citadel of Krypt ─────────────────────────────────────────────
  // Ember Orb (ring/ring2/necklace) and Ember Eye (helmet/chest/shoulders/
  // legs/gloves) — loot-dropped, not crafted (Citadel Levels 1 and 2's own
  // reward), but otherwise plain members of this exact catalog: same
  // passive/100-charge/decrements-per-completed-encounter model as every
  // enchant above, so Citadel's own "soft gate, you'll likely fail without
  // enough resist" design has a real, repeatable maintenance cost — not a
  // one-time permanent stat — matching how every other charge-based system
  // in this game (Stat Food, potions, every other enchant) already treats
  // "idle-capable" as "idle until your charges run out, then top up," never
  // literally forever. 10% each, applied via the existing enchant-sourced
  // half of the resistance pipeline (CasterProfile.fireResistancePct) —
  // see combatEngine/engine.ts's resistance pipeline doc comment.
  enchant_citadel_ember_orb_ring: {
    id: 'enchant_citadel_ember_orb_ring', name: 'Ember Orb (Ring)',
    description: 'Use on an equipped ring item to apply the Ember Orb enchant.', slot: 'ring', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_orb_ring',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_orb_ring2: {
    id: 'enchant_citadel_ember_orb_ring2', name: 'Ember Orb (Ring)',
    description: 'Use on an equipped ring item to apply the Ember Orb enchant.', slot: 'ring2', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_orb_ring2',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_orb_necklace: {
    id: 'enchant_citadel_ember_orb_necklace', name: 'Ember Orb (Necklace)',
    description: 'Use on an equipped necklace item to apply the Ember Orb enchant.', slot: 'necklace', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_orb_necklace',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_eye_helmet: {
    id: 'enchant_citadel_ember_eye_helmet', name: 'Ember Eye (Helm)',
    description: 'Use on an equipped helm item to apply the Ember Eye enchant.', slot: 'helmet', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_eye_helmet',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_eye_chest: {
    id: 'enchant_citadel_ember_eye_chest', name: 'Ember Eye (Chest)',
    description: 'Use on an equipped chest item to apply the Ember Eye enchant.', slot: 'chest', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_eye_chest',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_eye_shoulders: {
    id: 'enchant_citadel_ember_eye_shoulders', name: 'Ember Eye (Shoulders)',
    description: 'Use on an equipped shoulders item to apply the Ember Eye enchant.', slot: 'shoulders', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_eye_shoulders',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_eye_legs: {
    id: 'enchant_citadel_ember_eye_legs', name: 'Ember Eye (Legs)',
    description: 'Use on an equipped legs item to apply the Ember Eye enchant.', slot: 'legs', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_eye_legs',
    fireResistancePct: 10,
  },
  enchant_citadel_ember_eye_gloves: {
    id: 'enchant_citadel_ember_eye_gloves', name: 'Ember Eye (Gloves)',
    description: 'Use on an equipped gloves item to apply the Ember Eye enchant.', slot: 'gloves', category: 'passive',
    statBonuses: {}, scrollItemId: 'citadel_ember_eye_gloves',
    fireResistancePct: 10,
  },
};

// Loot-dropped scroll ids this Citadel enchant set uses, for monsters.ts's
// Level 1/2 lootTables to reference without re-typing each id — mirrors
// gameData/towerLoot.ts's TOWER_MILESTONE_ITEM_IDS-style "export the id
// list, not just the registry" convention.
export const CITADEL_EMBER_ORB_SCROLL_IDS = ['citadel_ember_orb_ring', 'citadel_ember_orb_ring2', 'citadel_ember_orb_necklace'];
export const CITADEL_EMBER_EYE_SCROLL_IDS = [
  'citadel_ember_eye_helmet',
  'citadel_ember_eye_chest',
  'citadel_ember_eye_shoulders',
  'citadel_ember_eye_legs',
  'citadel_ember_eye_gloves',
];

export function enchantsForSlot(slot: EquipmentSlot): EnchantDef[] {
  return Object.values(ENCHANTS).filter((e) => e.slot === slot);
}

// Nearly every one of the ~106 hand-authored EnchantDef.description strings
// only says "use this to apply the X enchant" without ever stating the
// actual mechanical effect (flatDamageBonus, statBonuses, proc, etc.) —
// enchant_minor_striking is the lone exception that happens to spell its
// +1 damage out in prose. Generating the effect sentence straight from the
// EnchantDef's own numeric fields (same "one source of truth, not
// duplicated hand text" precedent as this file's achievement/title
// generators) means every enchant's real effect is correct and visible
// everywhere it's shown, instead of only for the one entry someone
// remembered to spell out by hand.
export function describeEnchantEffect(enchant: EnchantDef): string {
  const parts: string[] = [];
  for (const [stat, value] of Object.entries(enchant.statBonuses)) {
    if (value) parts.push(`+${value} ${stat}`);
  }
  if (enchant.flatHpBonus) parts.push(`+${enchant.flatHpBonus} max HP`);
  if (enchant.flatManaBonus) parts.push(`+${enchant.flatManaBonus} max mana`);
  if (enchant.flatArmorBonus) parts.push(`+${enchant.flatArmorBonus} armor`);
  if (enchant.hastePct) parts.push(`+${enchant.hastePct}% haste`);
  if (enchant.flatDamageBonus) parts.push(`+${enchant.flatDamageBonus} damage on every hit`);
  if (enchant.healingPowerFlatBonus) parts.push(`+${enchant.healingPowerFlatBonus} healing power`);
  if (enchant.flatDamageReduction) parts.push(`-${enchant.flatDamageReduction} damage taken per hit`);
  if (enchant.fireResistancePct) parts.push(`+${enchant.fireResistancePct}% fire resistance`);
  if (enchant.shadowResistancePct) parts.push(`+${enchant.shadowResistancePct}% shadow resistance`);
  if (enchant.beastDamageBonusPct) parts.push(`+${enchant.beastDamageBonusPct}% damage to Beasts`);
  if (enchant.demonDamageBonusPct) parts.push(`+${enchant.demonDamageBonusPct}% damage to Demons`);
  if (enchant.proc) {
    const { kind, chancePct, power } = enchant.proc;
    if (kind === 'fiery_weapon') parts.push(`${chancePct}% chance on hit to burn for ${power}% bonus fire damage`);
    else if (kind === 'lifestealing') parts.push(`${chancePct}% chance on hit to heal yourself for ${power}% of the damage dealt`);
    else if (kind === 'crusader') parts.push(`${chancePct}% chance on hit to gain +10% damage dealt and heal 5% of your max HP`);
    else if (kind === 'chain_lightning') parts.push(`${chancePct}% chance on hit to chain ${power}% bonus damage to up to 2 other enemies`);
    // Magnitude/duration are mirrored by hand from combatEngine/engine.ts's
    // ICY_CHILL_SLOW_PCT/ICY_CHILL_DEBUFF_DURATION_SECONDS — gameData/ stays
    // independent of combatEngine/ (see this file's own module comment
    // precedent), so this is a small duplicated constant, not an import.
    else if (kind === 'icy_chill') parts.push(`${chancePct}% chance on hit to slow the target's actions by 10% for 15s`);
  }
  return parts.length > 0 ? `${enchant.description} (${parts.join(', ')})` : enchant.description;
}

// Everything buildActiveEnchantTotals sums, for the combat engine's
// EncounterSetupInput/OfflineCombatInput (Phase E6) — field names match
// EncounterSetupInput/CasterProfile 1:1 (combatEngine/engine.ts,
// combatEngine/types.ts) so callers can simply spread this object in.
export interface EnchantTotals {
  hastePct: number;
  flatDamageBonus: number;
  healingPowerFlatBonus: number;
  flatHpBonus: number;
  flatManaBonus: number;
  flatArmorBonus: number;
  beastDamageBonusPct: number;
  demonDamageBonusPct: number;
  flatDamageReduction: number;
  fireResistancePct: number;
  shadowResistancePct: number;
  weaponProc?: EnchantProcDef;
}

// Sums every currently-charged (enchantmentCharges[slot] !== 0 — same
// "absence means not yet migrated, treat as active" convention as
// getEquipmentStatBonuses) enchant's non-statBonuses effect fields across
// every equipped slot. The STR/STA/AGI/INT/SPI-style statBonuses (including
// weapon-slot Mighty Stat enchants) keep flowing through the pre-existing
// getEquipmentStatBonuses pipeline (gameData/equipmentStats.ts) unchanged —
// this only covers the new non-stat fields that pipeline has no slot for.
// Resolved once per encounter setup (CombatScreen/DungeonScreen/
// WelcomeBackScreen/offline combat), the same static-per-encounter posture
// every other bonus already baked into EncounterSetupInput uses.
export function buildActiveEnchantTotals(
  enchantments: Partial<Record<EquipmentSlot, string>> = {},
  enchantmentCharges: Partial<Record<EquipmentSlot, number>> = {},
  // The Citadel of Krypt's Full Citadel legendary (Lightningfury) — an
  // INNATE weapon proc has no charge concept at all (unlike an enchant
  // scroll's proc), so it's simplest applied here, unconditionally, rather
  // than threaded through the charge-tracking loop below. Resolved by the
  // caller (gameData/equipmentStats.ts's getInnateWeaponProc) from the
  // equipped weapon item itself; undefined for every weapon before
  // Lightningfury existed.
  innateWeaponProc?: EnchantProcDef
): EnchantTotals {
  const totals: EnchantTotals = {
    hastePct: 0,
    flatDamageBonus: 0,
    healingPowerFlatBonus: 0,
    flatHpBonus: 0,
    flatManaBonus: 0,
    flatArmorBonus: 0,
    beastDamageBonusPct: 0,
    demonDamageBonusPct: 0,
    flatDamageReduction: 0,
    fireResistancePct: 0,
    shadowResistancePct: 0,
  };
  for (const [slot, enchantId] of Object.entries(enchantments) as [EquipmentSlot, string | undefined][]) {
    if (!enchantId) continue;
    if (enchantmentCharges[slot] === 0) continue;
    const enchant = ENCHANTS[enchantId];
    if (!enchant) continue;
    totals.hastePct += enchant.hastePct ?? 0;
    totals.flatDamageBonus += enchant.flatDamageBonus ?? 0;
    totals.healingPowerFlatBonus += enchant.healingPowerFlatBonus ?? 0;
    totals.flatHpBonus += enchant.flatHpBonus ?? 0;
    totals.flatManaBonus += enchant.flatManaBonus ?? 0;
    totals.flatArmorBonus += enchant.flatArmorBonus ?? 0;
    totals.beastDamageBonusPct += enchant.beastDamageBonusPct ?? 0;
    totals.demonDamageBonusPct += enchant.demonDamageBonusPct ?? 0;
    totals.flatDamageReduction += enchant.flatDamageReduction ?? 0;
    totals.fireResistancePct += enchant.fireResistancePct ?? 0;
    totals.shadowResistancePct += enchant.shadowResistancePct ?? 0;
    // Only the weapon slot can carry a proc, and only one weapon slot
    // exists — no summing-across-slots question the way the other fields
    // have (every slot holds at most one enchant, same as statBonuses).
    if (enchant.proc) totals.weaponProc = enchant.proc;
  }
  // Takes priority over an equipped enchant's own proc if a weapon somehow
  // has both (see ItemDef.innateProc's doc comment).
  if (innateWeaponProc) totals.weaponProc = innateWeaponProc;
  return totals;
}

// ── Disenchanting ──────────────────────────────────────────────────────
// Deliberately formulas over the item's own data (stat total for the reward
// category below, origin zone for the skill gate above) rather than static
// per-item fields — "any item can be disenchanted" (per the design brief)
// would otherwise mean hand-tagging 200+ existing items. Tools are excluded
// (equipSlot === 'tool') — they're profession gear, not armor/weapons/
// jewelry.
//
// Widened (Enchanting overhaul) from 3 generic tiers to a 2-axis system:
// WHICH ZONE's material family (dust/essence/shard all come in one of 6
// zone-specific flavors, see items.ts's "Enchanting materials" section) ×
// WHICH CATEGORY within that family (dust/lesser essence/greater essence/
// shard). The original 3-tier DisenchantTier type/ZONE_TIER_DISENCHANT_TIER
// mapping is gone (both axes below now fully replace what it only
// approximated). Material item ids/names match the design brief's exact
// Classic-WoW-derived naming (Strange Dust, Soul Dust, Vision Dust, Dream
// Dust, Illusion Dust/Brilliant Shards, Ember Shards) rather than invented
// names, per zone.
export type DisenchantCategory = 'dust' | 'lesser_essence' | 'greater_essence' | 'shard';

// Zone tier (1-6, via ZONE_TIER) -> which actual item each category yields
// in that zone's family. Zones 1-4 have no shard tier at all (per spec,
// shards ("S"/Brilliant Shards) only start appearing at zone 5); zone 6
// collapses lesser/greater essence into one tier (Ember Essence) per the
// design brief's explicit zone-6 note.
const ZONE_DISENCHANT_MATERIALS: Record<number, Partial<Record<DisenchantCategory, string>>> = {
  1: { dust: 'strange_dust', lesser_essence: 'lesser_magic_essence', greater_essence: 'greater_magic_essence' },
  2: { dust: 'soul_dust', lesser_essence: 'lesser_astral_essence', greater_essence: 'greater_astral_essence' },
  3: { dust: 'vision_dust', lesser_essence: 'lesser_mystic_essence', greater_essence: 'greater_mystic_essence' },
  4: { dust: 'dream_dust', lesser_essence: 'lesser_nether_essence', greater_essence: 'greater_nether_essence' },
  5: {
    dust: 'illusion_dust', lesser_essence: 'lesser_eternal_essence',
    greater_essence: 'greater_eternal_essence', shard: 'brilliant_shard',
  },
  6: { dust: 'ember_dust', lesser_essence: 'ember_essence', greater_essence: 'ember_essence', shard: 'ember_shards' },
};

// Per-category yield range, independent of zone — a rarer category always
// yields fewer units per item, same escalating-scarcity shape the original
// 3-tier table had (dust > essence > crystal).
const CATEGORY_YIELD_RANGE: Record<DisenchantCategory, { min: number; max: number }> = {
  dust: { min: 2, max: 4 },
  lesser_essence: { min: 1, max: 3 },
  greater_essence: { min: 1, max: 2 },
  shard: { min: 1, max: 1 },
};

function statTotal(item: ItemDef): number {
  return Object.values(item.statBonuses ?? {}).reduce((sum, v) => sum + (v ?? 0), 0);
}

export function isDisenchantable(item: ItemDef): boolean {
  return item.type === 'equipment' && item.equipSlot !== undefined && item.equipSlot !== 'tool';
}

// Result item id -> Recipe.rarity, for every Recipe.materialId-tagged
// recipe (the consolidated, randomized-stat armor/jewelry set — see
// types.ts's Recipe comment). Computed once from recipe data rather than
// hand-maintained, so this never drifts out of sync with which items are
// actually randomized, or with a recipe's own rarity tuning.
let randomizedArmorRarityByItemId: Map<string, 'common' | 'uncommon' | 'rare'> | null = null;
function randomizedArmorRarity(itemId: string): 'common' | 'uncommon' | 'rare' | undefined {
  if (!randomizedArmorRarityByItemId) {
    randomizedArmorRarityByItemId = new Map(
      Object.values(RECIPES)
        .filter((r) => r.materialId)
        .map((r) => [r.resultItemId, r.rarity])
    );
  }
  return randomizedArmorRarityByItemId.get(itemId);
}

// Which DisenchantCategory a given item falls into, independent of zone.
// Randomized-stat armor (gameData/equipmentRolls.ts) has no fixed
// statBonuses to sum — its stats vary per roll — so it uses the recipe's
// own authored rarity instead (previously unused by disenchanting at all):
// common->dust, uncommon->lesser essence, rare->greater essence/shard when
// that zone has a shard tier, else greater essence. Every other item
// (weapons, pre-overhaul "Sacred" legacy items, monster-drop jewelry) keeps
// the original statTotal-based thresholds, now mapped onto 4 categories
// instead of 3 (same cutoffs, shard only when the zone's family has one).
function disenchantCategory(item: ItemDef, zoneTier: number): DisenchantCategory {
  const hasShard = !!ZONE_DISENCHANT_MATERIALS[zoneTier]?.shard;
  const rarity = randomizedArmorRarity(item.id);
  if (rarity) {
    if (rarity === 'rare') return hasShard ? 'shard' : 'greater_essence';
    if (rarity === 'uncommon') return 'lesser_essence';
    return 'dust';
  }
  const total = statTotal(item);
  if (total >= 20) return hasShard ? 'shard' : 'greater_essence';
  if (total >= 10) return 'lesser_essence';
  return 'dust';
}

// The Enchanting skill required to disenchant gear scales with the ZONE the
// gear came from, not the item's own stat total — "any item can be
// disenchanted as long as your Enchanting is trained to the same level as
// the zone the equipment came from," per the design brief. ZONE_TIER (1-6,
// zones.ts) already orders zones by content progression; this maps that
// ordering onto the shared 1-100 Enchanting scale using the same 20/40/60/
// 80/100 rank ceilings the profession-trainer system uses for the 5 zones
// that host a trainer (professionTrainers.ts's TRAINER_ZONE_BY_RANK), with
// Molten Scar (tier 5, the one zone with no trainer of its own — it sits
// between Cinderfall's Artisan gear and Cinderheart's Master gear) filling
// the gap at 90. Zone 1 (the starting zone) is 1, not 20 — a brand-new
// Enchanter should be able to disenchant the starter gear they're already
// standing on top of, not need to rank up first.
const ZONE_TIER_DISENCHANT_SKILL: Record<number, number> = {
  1: 1, // Greenhollow Fields
  2: 40, // Stonecrag Foothills
  3: 60, // Emberfall Ridge
  4: 80, // Cinderfall Depths
  5: 90, // The Molten Scar
  6: 100, // Cinderheart Crater
};

// Crafted gear "comes from" the zone whose trainer teaches the recipe that
// makes it (by the recipe's requiredSkill rank band); dropped gear comes
// from the lowest-tier zone among the monsters whose loot table includes it
// (the earliest a player could plausibly have obtained it). Gear tied to
// neither (starter/vendor/quest items) defaults to the game's starting
// zone — never harder to disenchant than the easiest gear in the game.
export function originZoneId(item: ItemDef): string {
  const recipe = Object.values(RECIPES).find((r) => r.resultItemId === item.id);
  if (recipe) return TRAINER_ZONE_BY_RANK[tierForLevel(recipe.requiredSkill)];

  let bestZoneId: string | null = null;
  let bestTier = Infinity;
  for (const monster of Object.values(MONSTERS)) {
    if (!monster.lootTable.some((drop) => drop.itemId === item.id)) continue;
    for (const zoneId of monster.zoneIds) {
      const tier = ZONE_TIER[zoneId] ?? Infinity;
      if (tier < bestTier) {
        bestTier = tier;
        bestZoneId = zoneId;
      }
    }
  }
  return bestZoneId ?? DEFAULT_ZONE_ID;
}

export function disenchantRequiredSkill(item: ItemDef): number {
  const tier = ZONE_TIER[originZoneId(item)] ?? 1;
  return ZONE_TIER_DISENCHANT_SKILL[tier] ?? 100;
}

// Profession XP for disenchanting one item — no separate Mastery (there's
// no fixed "recipe" to master; any sufficiently-leveled item qualifies, see
// resolveDisenchantOffline's doc comment in craftingEngine.ts). Scales with
// the item's own required-skill the same way an enchant's own xpAward scales
// with its requiredSkill.
export function disenchantXpAward(item: ItemDef): number {
  return Math.max(1, Math.round(3 + disenchantRequiredSkill(item) * 2.1));
}

// The deterministic {itemId, min, max} range disenchanting this item rolls
// from, per unit disenchanted — resolveDisenchantOffline (craftingEngine.ts)
// rolls its own random quantity in that range once per item inside its
// batch loop (a single stack-wide roll wouldn't reflect "N independent
// disenchants" the way a real batch should). Combines both axes: zone tier
// picks the material FAMILY, disenchantCategory picks which member of that
// family.
export function disenchantYieldRange(item: ItemDef): { itemId: string; min: number; max: number } {
  const zoneTier = ZONE_TIER[originZoneId(item)] ?? 1;
  const category = disenchantCategory(item, zoneTier);
  const itemId = ZONE_DISENCHANT_MATERIALS[zoneTier]?.[category] ?? 'strange_dust';
  return { itemId, ...CATEGORY_YIELD_RANGE[category] };
}

// Which category a disenchant "upgrades" into on a rare roll — one step up
// the same scarcity ladder disenchantCategory already walks (dust ->
// lesser essence -> greater essence -> shard), never skipping a tier.
const CATEGORY_UPGRADE: Record<DisenchantCategory, DisenchantCategory | null> = {
  dust: 'lesser_essence',
  lesser_essence: 'greater_essence',
  greater_essence: 'shard',
  shard: null,
};

// A small rare chance that disenchanting yields the NEXT tier's material
// instead of the item's normal one (e.g. a chance at Lesser Magic Essence
// instead of Strange Dust) — without this, low-stat gear that only ever
// qualifies for the "dust" category had NO drop source at all for the
// lesser/greater essence materials several enchant scroll recipes need,
// since disenchantCategory is a fixed function of the item, never random.
// Rolled per unit of the already-resolved yield quantity (see
// splitDisenchantUpgradeYield below), not per item disenchanted, so a
// bigger batch gets proportionally more rare chances rather than one
// all-or-nothing roll for the whole session.
const DISENCHANT_UPGRADE_CHANCE = 0.08;

// Splits an already-resolved disenchant yield total (gameData/
// craftingEngine.ts's resolveDisenchantOffline/resolveDisenchantQueueOffline
// — neither one changed by this; they still only ever compute ONE material's
// quantity) into its normal portion and a small upgraded-material portion,
// for whichever writer actually grants the result to inventory
// (firebase/enchanting.ts's applyDisenchantResult/
// applyDisenchantQueueResult). upgradedItemId is null — and upgradedQuantity
// always 0 — when this item's category has no tier above it (shard) or
// that zone's material family has no item for the next category (zones 1-4
// have no shard material at all; see ZONE_DISENCHANT_MATERIALS).
export function splitDisenchantUpgradeYield(
  item: ItemDef,
  totalYieldQuantity: number
): { upgradedItemId: string | null; upgradedQuantity: number; baseQuantity: number } {
  const zoneTier = ZONE_TIER[originZoneId(item)] ?? 1;
  const category = disenchantCategory(item, zoneTier);
  const nextCategory = CATEGORY_UPGRADE[category];
  const upgradedItemId = nextCategory ? ZONE_DISENCHANT_MATERIALS[zoneTier]?.[nextCategory] ?? null : null;
  const wholeTotal = Math.round(totalYieldQuantity);
  if (!upgradedItemId || wholeTotal <= 0) {
    return { upgradedItemId: null, upgradedQuantity: 0, baseQuantity: wholeTotal };
  }

  let upgradedQuantity = 0;
  for (let i = 0; i < wholeTotal; i++) {
    if (Math.random() < DISENCHANT_UPGRADE_CHANCE) upgradedQuantity++;
  }
  return { upgradedItemId, upgradedQuantity, baseQuantity: wholeTotal - upgradedQuantity };
}

import type { ItemDef } from './types';

// V1 has zero stat variance: every unit of a given item is identical.
// This is what lets inventory be a simple { itemId: quantity } map instead
// of tracking per-item instances.

export const ITEMS: Record<string, ItemDef> = {
  // ── Starter gear — granted directly at character creation (see
  // firebase/character.ts's createCharacter), not sold, gathered, or
  // crafted. A level-1 character fighting bare-handed dies to the first
  // same-level enemy within a couple of hits; this closes most of that gap
  // with "single digit" stat bumps per the design doc, without touching
  // the calibrated per-level/per-spec combat formulas. novice_tunic and
  // novice_boots are cloth so they're legal for every class (cloth is
  // always allowed, even for Warrior/Paladin) — one shared pair of armor
  // items instead of one per class. ──────────────────────────────────────
  novice_blade: {
    id: 'novice_blade', name: 'Novice Blade', type: 'equipment',
    description: 'A plain but serviceable blade issued to every new recruit.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 5 }, sellValue: 1,
  },
  novice_focus: {
    id: 'novice_focus', name: 'Novice Focus', type: 'equipment',
    description: 'A simple focus for channeling the first sparks of spellcraft.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 5 }, sellValue: 1,
  },
  novice_tunic: {
    id: 'novice_tunic', name: 'Novice Tunic', type: 'equipment',
    description: 'A sturdy traveling tunic, plain but well-made.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { STA: 5 }, sellValue: 1,
  },
  novice_boots: {
    id: 'novice_boots', name: 'Novice Boots', type: 'equipment',
    description: 'Well-worn boots, broken in for the road ahead.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { STA: 3 }, sellValue: 1,
  },

  // ── Skinning materials ──────────────────────────────────────────────
  leather_scraps: {
    id: 'leather_scraps',
    name: 'Leather Scraps',
    type: 'material',
    description: 'Small offcuts of hide. Not much use on their own, but Leatherworking can piece several together into Light Leather.',
    stackable: true,
    sellValue: 1,
  },
  light_leather: {
    id: 'light_leather',
    name: 'Light Leather',
    type: 'material',
    description: 'Supple hide pieced together from Leather Scraps. The backbone of early Leatherworking.',
    stackable: true,
    sellValue: 1,
  },

  // ── Active Skinning materials (zones 1-6) — the 6-tier leather/hide
  // roster gathered from GATHER_NODES' skinning nodes, mirroring Mining's
  // ore/rare-chunk pairing exactly (one primary leather + one rare hide per
  // zone). `skinned_light_leather`/`skinned_thick_hide` use disambiguated
  // item ids because `light_leather`/`thick_hide` above are already taken
  // by old, now-retired Leatherworking output — their display names are
  // still plain "Light Leather"/"Thick Hide".
  skinned_light_leather: {
    id: 'skinned_light_leather', name: 'Light Leather', type: 'material',
    description: 'Supple leather skinned from creatures of Greenhollow Fields.', stackable: true, sellValue: 1,
  },
  light_hide: {
    id: 'light_hide', name: 'Light Hide', type: 'material',
    description: 'An unusually intact hide found while skinning in Greenhollow Fields.', stackable: true, sellValue: 1,
  },
  medium_leather: {
    id: 'medium_leather', name: 'Medium Leather', type: 'material',
    description: 'Tougher leather skinned from creatures of Stonecrag Foothills.', stackable: true, sellValue: 2,
  },
  medium_hide: {
    id: 'medium_hide', name: 'Medium Hide', type: 'material',
    description: 'An unusually intact hide found while skinning in Stonecrag Foothills.', stackable: true, sellValue: 2,
  },
  heavy_leather: {
    id: 'heavy_leather', name: 'Heavy Leather', type: 'material',
    description: 'Thick leather skinned from creatures of Emberfall Ridge.', stackable: true, sellValue: 3,
  },
  heavy_hide: {
    id: 'heavy_hide', name: 'Heavy Hide', type: 'material',
    description: 'An unusually intact hide found while skinning in Emberfall Ridge.', stackable: true, sellValue: 3,
  },
  thick_leather: {
    id: 'thick_leather', name: 'Thick Leather', type: 'material',
    description: 'Dense leather skinned from creatures of Cinderfall Depths.', stackable: true, sellValue: 4,
  },
  skinned_thick_hide: {
    id: 'skinned_thick_hide', name: 'Thick Hide', type: 'material',
    description: 'An unusually intact hide found while skinning in Cinderfall Depths.', stackable: true, sellValue: 4,
  },
  rugged_leather: {
    id: 'rugged_leather', name: 'Rugged Leather', type: 'material',
    description: 'Rugged leather skinned from creatures of the Molten Scar.', stackable: true, sellValue: 5,
  },
  rugged_hide: {
    id: 'rugged_hide', name: 'Rugged Hide', type: 'material',
    description: 'An unusually intact hide found while skinning in the Molten Scar.', stackable: true, sellValue: 5,
  },
  emberscar_leather: {
    id: 'emberscar_leather', name: 'Emberscar Leather', type: 'material',
    description: 'Fire-scarred leather skinned from creatures of Cinderheart Crater.', stackable: true, sellValue: 6,
  },
  emberscar_hide: {
    id: 'emberscar_hide', name: 'Emberscar Hide', type: 'material',
    description: 'An unusually intact hide found while skinning in Cinderheart Crater.', stackable: true, sellValue: 6,
  },

  // ── Leatherworking equipment (zones 1-6) — 42 items, 7 pieces × 6 tiers,
  // mirroring Blacksmithing's own armor-set structure exactly (same
  // material-cost-per-piece shape, same per-tier ARMOR_STAT_RANGES/roll
  // system via equipmentRolls.ts — statBonuses here are the pre-roll
  // fallback, same role as Blacksmithing's own armor statBonuses).
  // Helmet/Chestplate/Gloves/Legplates/Boots/Shoulders are 'leather'
  // armorType (warrior/paladin only, same ALLOWED_ARMOR_TYPES table as
  // Blacksmithing); Belt has NO armorType — universal, equippable by every
  // class regardless of armor proficiency (canClassEquip's
  // `!item.armorType` path), matching the explicit "no armor type" belt
  // requirement.
  // ── Handstitched Leather (zone, requiredSkill 1) ──────────────────
  handstitched_leather_helm: {
    id: 'handstitched_leather_helm', name: 'Handstitched Leather Helm', type: 'equipment',
    description: 'A Handstitched Leather helm, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 3, STR: 3 }, sellValue: 18,
  },
  handstitched_leather_chest: {
    id: 'handstitched_leather_chest', name: 'Handstitched Leather Chestplate', type: 'equipment',
    description: 'A Handstitched Leather chestplate, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 4, STR: 4 }, sellValue: 24,
  },
  handstitched_leather_gloves: {
    id: 'handstitched_leather_gloves', name: 'Handstitched Leather Gloves', type: 'equipment',
    description: 'A Handstitched Leather gloves, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 2, STR: 2 }, sellValue: 12,
  },
  handstitched_leather_legs: {
    id: 'handstitched_leather_legs', name: 'Handstitched Leather Legplates', type: 'equipment',
    description: 'A Handstitched Leather legplates, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 4, STR: 3 }, sellValue: 21,
  },
  handstitched_leather_boots: {
    id: 'handstitched_leather_boots', name: 'Handstitched Leather Boots', type: 'equipment',
    description: 'A Handstitched Leather boots, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 3, STR: 2 }, sellValue: 15,
  },
  handstitched_leather_shoulders: {
    id: 'handstitched_leather_shoulders', name: 'Handstitched Leather Shoulders', type: 'equipment',
    description: 'A Handstitched Leather shoulders, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'shoulders', armorType: 'leather', statBonuses: { STA: 2, STR: 2 }, sellValue: 12,
  },
  handstitched_leather_belt: {
    id: 'handstitched_leather_belt', name: 'Handstitched Leather Belt', type: 'equipment',
    description: 'A sturdy handstitched leather belt, crafted by a skilled leatherworker. No armor training required — anyone can wear it.',
    stackable: true, equipSlot: 'belt', statBonuses: { STA: 2, STR: 2 }, sellValue: 12,
  },

  // ── Fine Leather (zone, requiredSkill 18) ──────────────────
  fine_leather_helm: {
    id: 'fine_leather_helm', name: 'Fine Leather Helm', type: 'equipment',
    description: 'A Fine Leather helm, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 4, STR: 4 }, sellValue: 26,
  },
  fine_leather_chest: {
    id: 'fine_leather_chest', name: 'Fine Leather Chestplate', type: 'equipment',
    description: 'A Fine Leather chestplate, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 7, STR: 5 }, sellValue: 38,
  },
  fine_leather_gloves: {
    id: 'fine_leather_gloves', name: 'Fine Leather Gloves', type: 'equipment',
    description: 'A Fine Leather gloves, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  fine_leather_legs: {
    id: 'fine_leather_legs', name: 'Fine Leather Legplates', type: 'equipment',
    description: 'A Fine Leather legplates, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 6, STR: 5 }, sellValue: 35,
  },
  fine_leather_boots: {
    id: 'fine_leather_boots', name: 'Fine Leather Boots', type: 'equipment',
    description: 'A Fine Leather boots, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  fine_leather_shoulders: {
    id: 'fine_leather_shoulders', name: 'Fine Leather Shoulders', type: 'equipment',
    description: 'A Fine Leather shoulders, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'shoulders', armorType: 'leather', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  fine_leather_belt: {
    id: 'fine_leather_belt', name: 'Fine Leather Belt', type: 'equipment',
    description: 'A sturdy fine leather belt, crafted by a skilled leatherworker. No armor training required — anyone can wear it.',
    stackable: true, equipSlot: 'belt', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },

  // ── Barbaric Leather (zone, requiredSkill 35) ──────────────────
  barbaric_leather_helm: {
    id: 'barbaric_leather_helm', name: 'Barbaric Leather Helm', type: 'equipment',
    description: 'A Barbaric Leather helm, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 6, STR: 5 }, sellValue: 37,
  },
  barbaric_leather_chest: {
    id: 'barbaric_leather_chest', name: 'Barbaric Leather Chestplate', type: 'equipment',
    description: 'A Barbaric Leather chestplate, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 9, STR: 7 }, sellValue: 54,
  },
  barbaric_leather_gloves: {
    id: 'barbaric_leather_gloves', name: 'Barbaric Leather Gloves', type: 'equipment',
    description: 'A Barbaric Leather gloves, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 5, STR: 4 }, sellValue: 31,
  },
  barbaric_leather_legs: {
    id: 'barbaric_leather_legs', name: 'Barbaric Leather Legplates', type: 'equipment',
    description: 'A Barbaric Leather legplates, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 8, STR: 6 }, sellValue: 48,
  },
  barbaric_leather_boots: {
    id: 'barbaric_leather_boots', name: 'Barbaric Leather Boots', type: 'equipment',
    description: 'A Barbaric Leather boots, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 6, STR: 5 }, sellValue: 34,
  },
  barbaric_leather_shoulders: {
    id: 'barbaric_leather_shoulders', name: 'Barbaric Leather Shoulders', type: 'equipment',
    description: 'A Barbaric Leather shoulders, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'shoulders', armorType: 'leather', statBonuses: { STA: 5, STR: 4 }, sellValue: 31,
  },
  barbaric_leather_belt: {
    id: 'barbaric_leather_belt', name: 'Barbaric Leather Belt', type: 'equipment',
    description: 'A sturdy barbaric leather belt, crafted by a skilled leatherworker. No armor training required — anyone can wear it.',
    stackable: true, equipSlot: 'belt', statBonuses: { STA: 5, STR: 4 }, sellValue: 31,
  },

  // ── Nightscape Leather (zone, requiredSkill 52) ──────────────────
  nightscape_leather_helm: {
    id: 'nightscape_leather_helm', name: 'Nightscape Leather Helm', type: 'equipment',
    description: 'A Nightscape Leather helm, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 8, STR: 6 }, sellValue: 49,
  },
  nightscape_leather_chest: {
    id: 'nightscape_leather_chest', name: 'Nightscape Leather Chestplate', type: 'equipment',
    description: 'A Nightscape Leather chestplate, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 11, STR: 9 }, sellValue: 70,
  },
  nightscape_leather_gloves: {
    id: 'nightscape_leather_gloves', name: 'Nightscape Leather Gloves', type: 'equipment',
    description: 'A Nightscape Leather gloves, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 6, STR: 5 }, sellValue: 39,
  },
  nightscape_leather_legs: {
    id: 'nightscape_leather_legs', name: 'Nightscape Leather Legplates', type: 'equipment',
    description: 'A Nightscape Leather legplates, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 10, STR: 8 }, sellValue: 63,
  },
  nightscape_leather_boots: {
    id: 'nightscape_leather_boots', name: 'Nightscape Leather Boots', type: 'equipment',
    description: 'A Nightscape Leather boots, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 7, STR: 5 }, sellValue: 42,
  },
  nightscape_leather_shoulders: {
    id: 'nightscape_leather_shoulders', name: 'Nightscape Leather Shoulders', type: 'equipment',
    description: 'A Nightscape Leather shoulders, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'shoulders', armorType: 'leather', statBonuses: { STA: 6, STR: 5 }, sellValue: 39,
  },
  nightscape_leather_belt: {
    id: 'nightscape_leather_belt', name: 'Nightscape Leather Belt', type: 'equipment',
    description: 'A sturdy nightscape leather belt, crafted by a skilled leatherworker. No armor training required — anyone can wear it.',
    stackable: true, equipSlot: 'belt', statBonuses: { STA: 6, STR: 5 }, sellValue: 39,
  },

  // ── Wicked Leather (zone, requiredSkill 69) ──────────────────
  wicked_leather_helm: {
    id: 'wicked_leather_helm', name: 'Wicked Leather Helm', type: 'equipment',
    description: 'A Wicked Leather helm, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 9, STR: 8 }, sellValue: 61,
  },
  wicked_leather_chest: {
    id: 'wicked_leather_chest', name: 'Wicked Leather Chestplate', type: 'equipment',
    description: 'A Wicked Leather chestplate, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 13, STR: 11 }, sellValue: 86,
  },
  wicked_leather_gloves: {
    id: 'wicked_leather_gloves', name: 'Wicked Leather Gloves', type: 'equipment',
    description: 'A Wicked Leather gloves, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 7, STR: 6 }, sellValue: 47,
  },
  wicked_leather_legs: {
    id: 'wicked_leather_legs', name: 'Wicked Leather Legplates', type: 'equipment',
    description: 'A Wicked Leather legplates, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 12, STR: 10 }, sellValue: 79,
  },
  wicked_leather_boots: {
    id: 'wicked_leather_boots', name: 'Wicked Leather Boots', type: 'equipment',
    description: 'A Wicked Leather boots, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 8, STR: 6 }, sellValue: 50,
  },
  wicked_leather_shoulders: {
    id: 'wicked_leather_shoulders', name: 'Wicked Leather Shoulders', type: 'equipment',
    description: 'A Wicked Leather shoulders, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'shoulders', armorType: 'leather', statBonuses: { STA: 7, STR: 6 }, sellValue: 47,
  },
  wicked_leather_belt: {
    id: 'wicked_leather_belt', name: 'Wicked Leather Belt', type: 'equipment',
    description: 'A sturdy wicked leather belt, crafted by a skilled leatherworker. No armor training required — anyone can wear it.',
    stackable: true, equipSlot: 'belt', statBonuses: { STA: 7, STR: 6 }, sellValue: 47,
  },

  // ── Emberscar Leather (zone, requiredSkill 86) ──────────────────
  emberscar_leather_helm: {
    id: 'emberscar_leather_helm', name: 'Emberscar Leather Helm', type: 'equipment',
    description: 'A Emberscar Leather helm, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 11, STR: 9 }, sellValue: 76,
  },
  emberscar_leather_chest: {
    id: 'emberscar_leather_chest', name: 'Emberscar Leather Chestplate', type: 'equipment',
    description: 'A Emberscar Leather chestplate, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 15, STR: 13 }, sellValue: 106,
  },
  emberscar_leather_gloves: {
    id: 'emberscar_leather_gloves', name: 'Emberscar Leather Gloves', type: 'equipment',
    description: 'A Emberscar Leather gloves, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 8, STR: 7 }, sellValue: 57,
  },
  emberscar_leather_legs: {
    id: 'emberscar_leather_legs', name: 'Emberscar Leather Legplates', type: 'equipment',
    description: 'A Emberscar Leather legplates, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 14, STR: 11 }, sellValue: 95,
  },
  emberscar_leather_boots: {
    id: 'emberscar_leather_boots', name: 'Emberscar Leather Boots', type: 'equipment',
    description: 'A Emberscar Leather boots, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 9, STR: 8 }, sellValue: 65,
  },
  emberscar_leather_shoulders: {
    id: 'emberscar_leather_shoulders', name: 'Emberscar Leather Shoulders', type: 'equipment',
    description: 'A Emberscar Leather shoulders, crafted by a skilled leatherworker.',
    stackable: true, equipSlot: 'shoulders', armorType: 'leather', statBonuses: { STA: 8, STR: 7 }, sellValue: 57,
  },
  emberscar_leather_belt: {
    id: 'emberscar_leather_belt', name: 'Emberscar Leather Belt', type: 'equipment',
    description: 'A sturdy emberscar leather belt, crafted by a skilled leatherworker. No armor training required — anyone can wear it.',
    stackable: true, equipSlot: 'belt', statBonuses: { STA: 8, STR: 7 }, sellValue: 57,
  },

  // ── Tailoring overhaul — 36 cloth armor items (6 tiers x 6 pieces) + 6
  // capes, replacing the old ad-hoc linen/heavy/ashwoven/charred/ashenweave
  // roster (frozen untouched, same convention as every other retired-content
  // block). INT+STA (not STR+STA like Blacksmithing/Leatherworking) since
  // cloth's primary audience is Priest/Mage — still wearable (off-stat) by
  // Warrior/Paladin, exactly like the real layered-armor convention.
  // tailored_linen_* ids are disambiguated from the old, frozen plain
  // linen_robe/linen_gloves/linen_boots item ids (zone 1 kept the same
  // cloth material name, so the new armor needed its own item-id prefix —
  // same disambiguation pattern as Skinning's skinned_light_leather).
  tailored_linen_helm: {
    id: 'tailored_linen_helm', name: 'Linen Hood', type: 'equipment',
    description: 'A linen hood, woven by a skilled tailor.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 3, STA: 3 }, sellValue: 18,
  },
  tailored_linen_robe: {
    id: 'tailored_linen_robe', name: 'Linen Robe', type: 'equipment',
    description: 'A linen robe, woven by a skilled tailor.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 4, STA: 4 }, sellValue: 24,
  },
  tailored_linen_gloves: {
    id: 'tailored_linen_gloves', name: 'Linen Gloves', type: 'equipment',
    description: 'A linen gloves, woven by a skilled tailor.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 2, STA: 2 }, sellValue: 12,
  },
  tailored_linen_leggings: {
    id: 'tailored_linen_leggings', name: 'Linen Leggings', type: 'equipment',
    description: 'A linen leggings, woven by a skilled tailor.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 4, STA: 3 }, sellValue: 21,
  },
  tailored_linen_boots: {
    id: 'tailored_linen_boots', name: 'Linen Boots', type: 'equipment',
    description: 'A linen boots, woven by a skilled tailor.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 3, STA: 2 }, sellValue: 15,
  },
  tailored_linen_shoulders: {
    id: 'tailored_linen_shoulders', name: 'Linen Shoulders', type: 'equipment',
    description: 'A linen shoulders, woven by a skilled tailor.',
    stackable: true, equipSlot: 'shoulders', armorType: 'cloth', statBonuses: { INT: 2, STA: 2 }, sellValue: 12,
  },
  wool_robe_helm: {
    id: 'wool_robe_helm', name: 'Wool Hood', type: 'equipment',
    description: 'A wool hood, woven by a skilled tailor.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 4, STA: 4 }, sellValue: 26,
  },
  wool_robe: {
    id: 'wool_robe', name: 'Wool Robe', type: 'equipment',
    description: 'A wool robe, woven by a skilled tailor.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 7, STA: 5 }, sellValue: 38,
  },
  wool_gloves: {
    id: 'wool_gloves', name: 'Wool Gloves', type: 'equipment',
    description: 'A wool gloves, woven by a skilled tailor.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 4, STA: 3 }, sellValue: 22,
  },
  wool_leggings: {
    id: 'wool_leggings', name: 'Wool Leggings', type: 'equipment',
    description: 'A wool leggings, woven by a skilled tailor.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 6, STA: 5 }, sellValue: 35,
  },
  wool_boots: {
    id: 'wool_boots', name: 'Wool Boots', type: 'equipment',
    description: 'A wool boots, woven by a skilled tailor.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 4, STA: 3 }, sellValue: 22,
  },
  wool_shoulders: {
    id: 'wool_shoulders', name: 'Wool Shoulders', type: 'equipment',
    description: 'A wool shoulders, woven by a skilled tailor.',
    stackable: true, equipSlot: 'shoulders', armorType: 'cloth', statBonuses: { INT: 4, STA: 3 }, sellValue: 22,
  },
  silk_robe_helm: {
    id: 'silk_robe_helm', name: 'Silk Hood', type: 'equipment',
    description: 'A silk hood, woven by a skilled tailor.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 6, STA: 5 }, sellValue: 37,
  },
  silk_robe: {
    id: 'silk_robe', name: 'Silk Robe', type: 'equipment',
    description: 'A silk robe, woven by a skilled tailor.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 9, STA: 7 }, sellValue: 54,
  },
  silk_gloves: {
    id: 'silk_gloves', name: 'Silk Gloves', type: 'equipment',
    description: 'A silk gloves, woven by a skilled tailor.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 5, STA: 4 }, sellValue: 31,
  },
  silk_leggings: {
    id: 'silk_leggings', name: 'Silk Leggings', type: 'equipment',
    description: 'A silk leggings, woven by a skilled tailor.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 8, STA: 6 }, sellValue: 48,
  },
  silk_boots: {
    id: 'silk_boots', name: 'Silk Boots', type: 'equipment',
    description: 'A silk boots, woven by a skilled tailor.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 6, STA: 5 }, sellValue: 34,
  },
  silk_shoulders: {
    id: 'silk_shoulders', name: 'Silk Shoulders', type: 'equipment',
    description: 'A silk shoulders, woven by a skilled tailor.',
    stackable: true, equipSlot: 'shoulders', armorType: 'cloth', statBonuses: { INT: 5, STA: 4 }, sellValue: 31,
  },
  mageweave_robe_helm: {
    id: 'mageweave_robe_helm', name: 'Mageweave Hood', type: 'equipment',
    description: 'A mageweave hood, woven by a skilled tailor.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 8, STA: 6 }, sellValue: 49,
  },
  mageweave_robe: {
    id: 'mageweave_robe', name: 'Mageweave Robe', type: 'equipment',
    description: 'A mageweave robe, woven by a skilled tailor.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 11, STA: 9 }, sellValue: 70,
  },
  mageweave_gloves: {
    id: 'mageweave_gloves', name: 'Mageweave Gloves', type: 'equipment',
    description: 'A mageweave gloves, woven by a skilled tailor.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 6, STA: 5 }, sellValue: 39,
  },
  mageweave_leggings: {
    id: 'mageweave_leggings', name: 'Mageweave Leggings', type: 'equipment',
    description: 'A mageweave leggings, woven by a skilled tailor.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 10, STA: 8 }, sellValue: 63,
  },
  mageweave_boots: {
    id: 'mageweave_boots', name: 'Mageweave Boots', type: 'equipment',
    description: 'A mageweave boots, woven by a skilled tailor.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 7, STA: 5 }, sellValue: 42,
  },
  mageweave_shoulders: {
    id: 'mageweave_shoulders', name: 'Mageweave Shoulders', type: 'equipment',
    description: 'A mageweave shoulders, woven by a skilled tailor.',
    stackable: true, equipSlot: 'shoulders', armorType: 'cloth', statBonuses: { INT: 6, STA: 5 }, sellValue: 39,
  },
  runecloth_robe_helm: {
    id: 'runecloth_robe_helm', name: 'Runecloth Hood', type: 'equipment',
    description: 'A runecloth hood, woven by a skilled tailor.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 9, STA: 8 }, sellValue: 61,
  },
  runecloth_robe: {
    id: 'runecloth_robe', name: 'Runecloth Robe', type: 'equipment',
    description: 'A runecloth robe, woven by a skilled tailor.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 13, STA: 11 }, sellValue: 86,
  },
  runecloth_gloves: {
    id: 'runecloth_gloves', name: 'Runecloth Gloves', type: 'equipment',
    description: 'A runecloth gloves, woven by a skilled tailor.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 7, STA: 6 }, sellValue: 47,
  },
  runecloth_leggings: {
    id: 'runecloth_leggings', name: 'Runecloth Leggings', type: 'equipment',
    description: 'A runecloth leggings, woven by a skilled tailor.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 12, STA: 10 }, sellValue: 79,
  },
  runecloth_boots: {
    id: 'runecloth_boots', name: 'Runecloth Boots', type: 'equipment',
    description: 'A runecloth boots, woven by a skilled tailor.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 8, STA: 6 }, sellValue: 50,
  },
  runecloth_shoulders: {
    id: 'runecloth_shoulders', name: 'Runecloth Shoulders', type: 'equipment',
    description: 'A runecloth shoulders, woven by a skilled tailor.',
    stackable: true, equipSlot: 'shoulders', armorType: 'cloth', statBonuses: { INT: 7, STA: 6 }, sellValue: 47,
  },
  ember_robe_helm: {
    id: 'ember_robe_helm', name: 'Ember Hood', type: 'equipment',
    description: 'A ember hood, woven by a skilled tailor.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 11, STA: 9 }, sellValue: 76,
  },
  ember_robe: {
    id: 'ember_robe', name: 'Ember Robe', type: 'equipment',
    description: 'A ember robe, woven by a skilled tailor.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 15, STA: 13 }, sellValue: 106,
  },
  ember_gloves: {
    id: 'ember_gloves', name: 'Ember Gloves', type: 'equipment',
    description: 'A ember gloves, woven by a skilled tailor.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 8, STA: 7 }, sellValue: 57,
  },
  ember_leggings: {
    id: 'ember_leggings', name: 'Ember Leggings', type: 'equipment',
    description: 'A ember leggings, woven by a skilled tailor.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 14, STA: 11 }, sellValue: 95,
  },
  ember_boots: {
    id: 'ember_boots', name: 'Ember Boots', type: 'equipment',
    description: 'A ember boots, woven by a skilled tailor.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 9, STA: 8 }, sellValue: 65,
  },
  ember_shoulders: {
    id: 'ember_shoulders', name: 'Ember Shoulders', type: 'equipment',
    description: 'A ember shoulders, woven by a skilled tailor.',
    stackable: true, equipSlot: 'shoulders', armorType: 'cloth', statBonuses: { INT: 8, STA: 7 }, sellValue: 57,
  },
  // ── Capes (zones 1-6) — universal (cloth is already allowed for every
  // class), 2 random stats, same materialId as that tier's armor so they
  // feed the SAME cloth mastery bar (no separate cape mastery).
  cape_of_linen: {
    id: 'cape_of_linen', name: 'Cape of Linen', type: 'equipment',
    description: 'A plain linen cape, woven by a skilled tailor.',
    stackable: true, equipSlot: 'cape', armorType: 'cloth', statBonuses: { INT: 2, STA: 2 }, sellValue: 12,
  },
  cape_of_wool: {
    id: 'cape_of_wool', name: 'Cape of Wool', type: 'equipment',
    description: 'A woolen cape, woven by a skilled tailor.',
    stackable: true, equipSlot: 'cape', armorType: 'cloth', statBonuses: { INT: 4, STA: 3 }, sellValue: 22,
  },
  cape_of_silk: {
    id: 'cape_of_silk', name: 'Cape of Silk', type: 'equipment',
    description: 'A fine silk cape, woven by a skilled tailor.',
    stackable: true, equipSlot: 'cape', armorType: 'cloth', statBonuses: { INT: 5, STA: 4 }, sellValue: 31,
  },
  cape_of_mageweave: {
    id: 'cape_of_mageweave', name: 'Cape of Mageweave', type: 'equipment',
    description: 'A mageweave cape, humming faintly with old magic.',
    stackable: true, equipSlot: 'cape', armorType: 'cloth', statBonuses: { INT: 6, STA: 5 }, sellValue: 39,
  },
  cape_of_runecloth: {
    id: 'cape_of_runecloth', name: 'Cape of Runecloth', type: 'equipment',
    description: 'A runecloth cape, its stitched runes still faintly warm.',
    stackable: true, equipSlot: 'cape', armorType: 'cloth', statBonuses: { INT: 7, STA: 6 }, sellValue: 47,
  },
  cape_of_ember: {
    id: 'cape_of_ember', name: 'Cape of Ember', type: 'equipment',
    description: "An ember cloth cape, scorched but never burnt through.",
    stackable: true, equipSlot: 'cape', armorType: 'cloth', statBonuses: { INT: 8, STA: 7 }, sellValue: 57,
  },
  // ── Linen tier shirts (zone, requiredSkill 1) ──────────
  linen_shirt_of_mastery: {
    id: 'linen_shirt_of_mastery', name: 'Linen Shirt of Mastery', type: 'equipment',
    description: 'A tailored shirt. +1% profession material mastery XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'mastery_xp', pct: 1 }, sellValue: 12,
  },
  linen_shirt_of_the_gatherer: {
    id: 'linen_shirt_of_the_gatherer', name: 'Linen Shirt of the Gatherer', type: 'equipment',
    description: 'A tailored shirt. +1% gathering speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gathering_speed', pct: 1 }, sellValue: 12,
  },
  linen_shirt_of_the_artisan: {
    id: 'linen_shirt_of_the_artisan', name: 'Linen Shirt of the Artisan', type: 'equipment',
    description: 'A tailored shirt. +1% crafting speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'crafting_speed', pct: 1 }, sellValue: 12,
  },
  linen_shirt_of_learning: {
    id: 'linen_shirt_of_learning', name: 'Linen Shirt of Learning', type: 'equipment',
    description: 'A tailored shirt. +1% profession XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'profession_xp', pct: 1 }, sellValue: 12,
  },
  linen_shirt_of_fortune: {
    id: 'linen_shirt_of_fortune', name: 'Linen Shirt of Fortune', type: 'equipment',
    description: 'A tailored shirt. +1% gold earned from monster kills.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gold_find', pct: 1 }, sellValue: 12,
  },
  linen_shirt_of_salvaging: {
    id: 'linen_shirt_of_salvaging', name: 'Linen Shirt of Salvaging', type: 'equipment',
    description: 'A tailored shirt. +1% chance of bonus disenchanting materials.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'salvage_bonus', pct: 1 }, sellValue: 12,
  },
  linen_shirt_of_preservation: {
    id: 'linen_shirt_of_preservation', name: 'Linen Shirt of Preservation', type: 'equipment',
    description: 'A tailored shirt. +1% chance to preserve one eligible crafting material.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'material_preserve', pct: 1 }, sellValue: 12,
  },

  // ── Wool tier shirts (zone, requiredSkill 18) ──────────
  wool_shirt_of_mastery: {
    id: 'wool_shirt_of_mastery', name: 'Wool Shirt of Mastery', type: 'equipment',
    description: 'A tailored shirt. +2% profession material mastery XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'mastery_xp', pct: 2 }, sellValue: 22,
  },
  wool_shirt_of_the_gatherer: {
    id: 'wool_shirt_of_the_gatherer', name: 'Wool Shirt of the Gatherer', type: 'equipment',
    description: 'A tailored shirt. +2% gathering speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gathering_speed', pct: 2 }, sellValue: 22,
  },
  wool_shirt_of_the_artisan: {
    id: 'wool_shirt_of_the_artisan', name: 'Wool Shirt of the Artisan', type: 'equipment',
    description: 'A tailored shirt. +2% crafting speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'crafting_speed', pct: 2 }, sellValue: 22,
  },
  wool_shirt_of_learning: {
    id: 'wool_shirt_of_learning', name: 'Wool Shirt of Learning', type: 'equipment',
    description: 'A tailored shirt. +2% profession XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'profession_xp', pct: 2 }, sellValue: 22,
  },
  wool_shirt_of_fortune: {
    id: 'wool_shirt_of_fortune', name: 'Wool Shirt of Fortune', type: 'equipment',
    description: 'A tailored shirt. +2% gold earned from monster kills.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gold_find', pct: 2 }, sellValue: 22,
  },
  wool_shirt_of_salvaging: {
    id: 'wool_shirt_of_salvaging', name: 'Wool Shirt of Salvaging', type: 'equipment',
    description: 'A tailored shirt. +2% chance of bonus disenchanting materials.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'salvage_bonus', pct: 2 }, sellValue: 22,
  },
  wool_shirt_of_preservation: {
    id: 'wool_shirt_of_preservation', name: 'Wool Shirt of Preservation', type: 'equipment',
    description: 'A tailored shirt. +2% chance to preserve one eligible crafting material.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'material_preserve', pct: 2 }, sellValue: 22,
  },

  // ── Silk tier shirts (zone, requiredSkill 35) ──────────
  silk_shirt_of_mastery: {
    id: 'silk_shirt_of_mastery', name: 'Silk Shirt of Mastery', type: 'equipment',
    description: 'A tailored shirt. +4% profession material mastery XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'mastery_xp', pct: 4 }, sellValue: 31,
  },
  silk_shirt_of_the_gatherer: {
    id: 'silk_shirt_of_the_gatherer', name: 'Silk Shirt of the Gatherer', type: 'equipment',
    description: 'A tailored shirt. +4% gathering speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gathering_speed', pct: 4 }, sellValue: 31,
  },
  silk_shirt_of_the_artisan: {
    id: 'silk_shirt_of_the_artisan', name: 'Silk Shirt of the Artisan', type: 'equipment',
    description: 'A tailored shirt. +4% crafting speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'crafting_speed', pct: 4 }, sellValue: 31,
  },
  silk_shirt_of_learning: {
    id: 'silk_shirt_of_learning', name: 'Silk Shirt of Learning', type: 'equipment',
    description: 'A tailored shirt. +4% profession XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'profession_xp', pct: 4 }, sellValue: 31,
  },
  silk_shirt_of_fortune: {
    id: 'silk_shirt_of_fortune', name: 'Silk Shirt of Fortune', type: 'equipment',
    description: 'A tailored shirt. +4% gold earned from monster kills.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gold_find', pct: 4 }, sellValue: 31,
  },
  silk_shirt_of_salvaging: {
    id: 'silk_shirt_of_salvaging', name: 'Silk Shirt of Salvaging', type: 'equipment',
    description: 'A tailored shirt. +4% chance of bonus disenchanting materials.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'salvage_bonus', pct: 4 }, sellValue: 31,
  },
  silk_shirt_of_preservation: {
    id: 'silk_shirt_of_preservation', name: 'Silk Shirt of Preservation', type: 'equipment',
    description: 'A tailored shirt. +4% chance to preserve one eligible crafting material.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'material_preserve', pct: 4 }, sellValue: 31,
  },

  // ── Mageweave tier shirts (zone, requiredSkill 52) ──────────
  mageweave_shirt_of_mastery: {
    id: 'mageweave_shirt_of_mastery', name: 'Mageweave Shirt of Mastery', type: 'equipment',
    description: 'A tailored shirt. +6% profession material mastery XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'mastery_xp', pct: 6 }, sellValue: 39,
  },
  mageweave_shirt_of_the_gatherer: {
    id: 'mageweave_shirt_of_the_gatherer', name: 'Mageweave Shirt of the Gatherer', type: 'equipment',
    description: 'A tailored shirt. +6% gathering speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gathering_speed', pct: 6 }, sellValue: 39,
  },
  mageweave_shirt_of_the_artisan: {
    id: 'mageweave_shirt_of_the_artisan', name: 'Mageweave Shirt of the Artisan', type: 'equipment',
    description: 'A tailored shirt. +6% crafting speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'crafting_speed', pct: 6 }, sellValue: 39,
  },
  mageweave_shirt_of_learning: {
    id: 'mageweave_shirt_of_learning', name: 'Mageweave Shirt of Learning', type: 'equipment',
    description: 'A tailored shirt. +6% profession XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'profession_xp', pct: 6 }, sellValue: 39,
  },
  mageweave_shirt_of_fortune: {
    id: 'mageweave_shirt_of_fortune', name: 'Mageweave Shirt of Fortune', type: 'equipment',
    description: 'A tailored shirt. +6% gold earned from monster kills.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gold_find', pct: 6 }, sellValue: 39,
  },
  mageweave_shirt_of_salvaging: {
    id: 'mageweave_shirt_of_salvaging', name: 'Mageweave Shirt of Salvaging', type: 'equipment',
    description: 'A tailored shirt. +6% chance of bonus disenchanting materials.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'salvage_bonus', pct: 6 }, sellValue: 39,
  },
  mageweave_shirt_of_preservation: {
    id: 'mageweave_shirt_of_preservation', name: 'Mageweave Shirt of Preservation', type: 'equipment',
    description: 'A tailored shirt. +6% chance to preserve one eligible crafting material.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'material_preserve', pct: 6 }, sellValue: 39,
  },

  // ── Runecloth tier shirts (zone, requiredSkill 69) ──────────
  runecloth_shirt_of_mastery: {
    id: 'runecloth_shirt_of_mastery', name: 'Runecloth Shirt of Mastery', type: 'equipment',
    description: 'A tailored shirt. +8% profession material mastery XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'mastery_xp', pct: 8 }, sellValue: 47,
  },
  runecloth_shirt_of_the_gatherer: {
    id: 'runecloth_shirt_of_the_gatherer', name: 'Runecloth Shirt of the Gatherer', type: 'equipment',
    description: 'A tailored shirt. +8% gathering speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gathering_speed', pct: 8 }, sellValue: 47,
  },
  runecloth_shirt_of_the_artisan: {
    id: 'runecloth_shirt_of_the_artisan', name: 'Runecloth Shirt of the Artisan', type: 'equipment',
    description: 'A tailored shirt. +8% crafting speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'crafting_speed', pct: 8 }, sellValue: 47,
  },
  runecloth_shirt_of_learning: {
    id: 'runecloth_shirt_of_learning', name: 'Runecloth Shirt of Learning', type: 'equipment',
    description: 'A tailored shirt. +8% profession XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'profession_xp', pct: 8 }, sellValue: 47,
  },
  runecloth_shirt_of_fortune: {
    id: 'runecloth_shirt_of_fortune', name: 'Runecloth Shirt of Fortune', type: 'equipment',
    description: 'A tailored shirt. +8% gold earned from monster kills.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gold_find', pct: 8 }, sellValue: 47,
  },
  runecloth_shirt_of_salvaging: {
    id: 'runecloth_shirt_of_salvaging', name: 'Runecloth Shirt of Salvaging', type: 'equipment',
    description: 'A tailored shirt. +8% chance of bonus disenchanting materials.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'salvage_bonus', pct: 8 }, sellValue: 47,
  },
  runecloth_shirt_of_preservation: {
    id: 'runecloth_shirt_of_preservation', name: 'Runecloth Shirt of Preservation', type: 'equipment',
    description: 'A tailored shirt. +8% chance to preserve one eligible crafting material.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'material_preserve', pct: 8 }, sellValue: 47,
  },

  // ── Ember tier shirts (zone, requiredSkill 86) ──────────
  ember_shirt_of_mastery: {
    id: 'ember_shirt_of_mastery', name: 'Ember Shirt of Mastery', type: 'equipment',
    description: 'A tailored shirt. +10% profession material mastery XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'mastery_xp', pct: 10 }, sellValue: 57,
  },
  ember_shirt_of_the_gatherer: {
    id: 'ember_shirt_of_the_gatherer', name: 'Ember Shirt of the Gatherer', type: 'equipment',
    description: 'A tailored shirt. +10% gathering speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gathering_speed', pct: 10 }, sellValue: 57,
  },
  ember_shirt_of_the_artisan: {
    id: 'ember_shirt_of_the_artisan', name: 'Ember Shirt of the Artisan', type: 'equipment',
    description: 'A tailored shirt. +10% crafting speed.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'crafting_speed', pct: 10 }, sellValue: 57,
  },
  ember_shirt_of_learning: {
    id: 'ember_shirt_of_learning', name: 'Ember Shirt of Learning', type: 'equipment',
    description: 'A tailored shirt. +10% profession XP.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'profession_xp', pct: 10 }, sellValue: 57,
  },
  ember_shirt_of_fortune: {
    id: 'ember_shirt_of_fortune', name: 'Ember Shirt of Fortune', type: 'equipment',
    description: 'A tailored shirt. +10% gold earned from monster kills.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'gold_find', pct: 10 }, sellValue: 57,
  },
  ember_shirt_of_salvaging: {
    id: 'ember_shirt_of_salvaging', name: 'Ember Shirt of Salvaging', type: 'equipment',
    description: 'A tailored shirt. +10% chance of bonus disenchanting materials.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'salvage_bonus', pct: 10 }, sellValue: 57,
  },
  ember_shirt_of_preservation: {
    id: 'ember_shirt_of_preservation', name: 'Ember Shirt of Preservation', type: 'equipment',
    description: 'A tailored shirt. +10% chance to preserve one eligible crafting material.',
    stackable: true, equipSlot: 'shirt', shirtBonus: { type: 'material_preserve', pct: 10 }, sellValue: 57,
  },
  formula_linen_shirt_of_mastery: {
    id: 'formula_linen_shirt_of_mastery', name: 'Formula: Linen Shirt of Mastery', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of Mastery.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_mastery', sellValue: 0,
  },
  formula_linen_shirt_of_the_gatherer: {
    id: 'formula_linen_shirt_of_the_gatherer', name: 'Formula: Linen Shirt of the Gatherer', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of the Gatherer.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_the_gatherer', sellValue: 0,
  },
  formula_linen_shirt_of_the_artisan: {
    id: 'formula_linen_shirt_of_the_artisan', name: 'Formula: Linen Shirt of the Artisan', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of the Artisan.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_the_artisan', sellValue: 0,
  },
  formula_linen_shirt_of_learning: {
    id: 'formula_linen_shirt_of_learning', name: 'Formula: Linen Shirt of Learning', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of Learning.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_learning', sellValue: 0,
  },
  formula_linen_shirt_of_fortune: {
    id: 'formula_linen_shirt_of_fortune', name: 'Formula: Linen Shirt of Fortune', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of Fortune.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_fortune', sellValue: 0,
  },
  formula_linen_shirt_of_salvaging: {
    id: 'formula_linen_shirt_of_salvaging', name: 'Formula: Linen Shirt of Salvaging', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of Salvaging.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_salvaging', sellValue: 0,
  },
  formula_linen_shirt_of_preservation: {
    id: 'formula_linen_shirt_of_preservation', name: 'Formula: Linen Shirt of Preservation', type: 'recipe',
    description: 'Teaches the recipe for a Linen Shirt of Preservation.',
    stackable: true, teachesRecipeId: 'linen_shirt_of_preservation', sellValue: 0,
  },
  formula_wool_shirt_of_mastery: {
    id: 'formula_wool_shirt_of_mastery', name: 'Formula: Wool Shirt of Mastery', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of Mastery.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_mastery', sellValue: 0,
  },
  formula_wool_shirt_of_the_gatherer: {
    id: 'formula_wool_shirt_of_the_gatherer', name: 'Formula: Wool Shirt of the Gatherer', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of the Gatherer.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_the_gatherer', sellValue: 0,
  },
  formula_wool_shirt_of_the_artisan: {
    id: 'formula_wool_shirt_of_the_artisan', name: 'Formula: Wool Shirt of the Artisan', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of the Artisan.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_the_artisan', sellValue: 0,
  },
  formula_wool_shirt_of_learning: {
    id: 'formula_wool_shirt_of_learning', name: 'Formula: Wool Shirt of Learning', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of Learning.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_learning', sellValue: 0,
  },
  formula_wool_shirt_of_fortune: {
    id: 'formula_wool_shirt_of_fortune', name: 'Formula: Wool Shirt of Fortune', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of Fortune.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_fortune', sellValue: 0,
  },
  formula_wool_shirt_of_salvaging: {
    id: 'formula_wool_shirt_of_salvaging', name: 'Formula: Wool Shirt of Salvaging', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of Salvaging.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_salvaging', sellValue: 0,
  },
  formula_wool_shirt_of_preservation: {
    id: 'formula_wool_shirt_of_preservation', name: 'Formula: Wool Shirt of Preservation', type: 'recipe',
    description: 'Teaches the recipe for a Wool Shirt of Preservation.',
    stackable: true, teachesRecipeId: 'wool_shirt_of_preservation', sellValue: 0,
  },
  formula_silk_shirt_of_mastery: {
    id: 'formula_silk_shirt_of_mastery', name: 'Formula: Silk Shirt of Mastery', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of Mastery.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_mastery', sellValue: 0,
  },
  formula_silk_shirt_of_the_gatherer: {
    id: 'formula_silk_shirt_of_the_gatherer', name: 'Formula: Silk Shirt of the Gatherer', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of the Gatherer.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_the_gatherer', sellValue: 0,
  },
  formula_silk_shirt_of_the_artisan: {
    id: 'formula_silk_shirt_of_the_artisan', name: 'Formula: Silk Shirt of the Artisan', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of the Artisan.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_the_artisan', sellValue: 0,
  },
  formula_silk_shirt_of_learning: {
    id: 'formula_silk_shirt_of_learning', name: 'Formula: Silk Shirt of Learning', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of Learning.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_learning', sellValue: 0,
  },
  formula_silk_shirt_of_fortune: {
    id: 'formula_silk_shirt_of_fortune', name: 'Formula: Silk Shirt of Fortune', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of Fortune.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_fortune', sellValue: 0,
  },
  formula_silk_shirt_of_salvaging: {
    id: 'formula_silk_shirt_of_salvaging', name: 'Formula: Silk Shirt of Salvaging', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of Salvaging.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_salvaging', sellValue: 0,
  },
  formula_silk_shirt_of_preservation: {
    id: 'formula_silk_shirt_of_preservation', name: 'Formula: Silk Shirt of Preservation', type: 'recipe',
    description: 'Teaches the recipe for a Silk Shirt of Preservation.',
    stackable: true, teachesRecipeId: 'silk_shirt_of_preservation', sellValue: 0,
  },
  formula_mageweave_shirt_of_mastery: {
    id: 'formula_mageweave_shirt_of_mastery', name: 'Formula: Mageweave Shirt of Mastery', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of Mastery.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_mastery', sellValue: 0,
  },
  formula_mageweave_shirt_of_the_gatherer: {
    id: 'formula_mageweave_shirt_of_the_gatherer', name: 'Formula: Mageweave Shirt of the Gatherer', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of the Gatherer.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_the_gatherer', sellValue: 0,
  },
  formula_mageweave_shirt_of_the_artisan: {
    id: 'formula_mageweave_shirt_of_the_artisan', name: 'Formula: Mageweave Shirt of the Artisan', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of the Artisan.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_the_artisan', sellValue: 0,
  },
  formula_mageweave_shirt_of_learning: {
    id: 'formula_mageweave_shirt_of_learning', name: 'Formula: Mageweave Shirt of Learning', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of Learning.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_learning', sellValue: 0,
  },
  formula_mageweave_shirt_of_fortune: {
    id: 'formula_mageweave_shirt_of_fortune', name: 'Formula: Mageweave Shirt of Fortune', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of Fortune.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_fortune', sellValue: 0,
  },
  formula_mageweave_shirt_of_salvaging: {
    id: 'formula_mageweave_shirt_of_salvaging', name: 'Formula: Mageweave Shirt of Salvaging', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of Salvaging.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_salvaging', sellValue: 0,
  },
  formula_mageweave_shirt_of_preservation: {
    id: 'formula_mageweave_shirt_of_preservation', name: 'Formula: Mageweave Shirt of Preservation', type: 'recipe',
    description: 'Teaches the recipe for a Mageweave Shirt of Preservation.',
    stackable: true, teachesRecipeId: 'mageweave_shirt_of_preservation', sellValue: 0,
  },
  formula_runecloth_shirt_of_mastery: {
    id: 'formula_runecloth_shirt_of_mastery', name: 'Formula: Runecloth Shirt of Mastery', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of Mastery.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_mastery', sellValue: 0,
  },
  formula_runecloth_shirt_of_the_gatherer: {
    id: 'formula_runecloth_shirt_of_the_gatherer', name: 'Formula: Runecloth Shirt of the Gatherer', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of the Gatherer.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_the_gatherer', sellValue: 0,
  },
  formula_runecloth_shirt_of_the_artisan: {
    id: 'formula_runecloth_shirt_of_the_artisan', name: 'Formula: Runecloth Shirt of the Artisan', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of the Artisan.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_the_artisan', sellValue: 0,
  },
  formula_runecloth_shirt_of_learning: {
    id: 'formula_runecloth_shirt_of_learning', name: 'Formula: Runecloth Shirt of Learning', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of Learning.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_learning', sellValue: 0,
  },
  formula_runecloth_shirt_of_fortune: {
    id: 'formula_runecloth_shirt_of_fortune', name: 'Formula: Runecloth Shirt of Fortune', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of Fortune.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_fortune', sellValue: 0,
  },
  formula_runecloth_shirt_of_salvaging: {
    id: 'formula_runecloth_shirt_of_salvaging', name: 'Formula: Runecloth Shirt of Salvaging', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of Salvaging.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_salvaging', sellValue: 0,
  },
  formula_runecloth_shirt_of_preservation: {
    id: 'formula_runecloth_shirt_of_preservation', name: 'Formula: Runecloth Shirt of Preservation', type: 'recipe',
    description: 'Teaches the recipe for a Runecloth Shirt of Preservation.',
    stackable: true, teachesRecipeId: 'runecloth_shirt_of_preservation', sellValue: 0,
  },
  formula_ember_shirt_of_mastery: {
    id: 'formula_ember_shirt_of_mastery', name: 'Formula: Ember Shirt of Mastery', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of Mastery.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_mastery', sellValue: 0,
  },
  formula_ember_shirt_of_the_gatherer: {
    id: 'formula_ember_shirt_of_the_gatherer', name: 'Formula: Ember Shirt of the Gatherer', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of the Gatherer.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_the_gatherer', sellValue: 0,
  },
  formula_ember_shirt_of_the_artisan: {
    id: 'formula_ember_shirt_of_the_artisan', name: 'Formula: Ember Shirt of the Artisan', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of the Artisan.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_the_artisan', sellValue: 0,
  },
  formula_ember_shirt_of_learning: {
    id: 'formula_ember_shirt_of_learning', name: 'Formula: Ember Shirt of Learning', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of Learning.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_learning', sellValue: 0,
  },
  formula_ember_shirt_of_fortune: {
    id: 'formula_ember_shirt_of_fortune', name: 'Formula: Ember Shirt of Fortune', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of Fortune.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_fortune', sellValue: 0,
  },
  formula_ember_shirt_of_salvaging: {
    id: 'formula_ember_shirt_of_salvaging', name: 'Formula: Ember Shirt of Salvaging', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of Salvaging.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_salvaging', sellValue: 0,
  },
  formula_ember_shirt_of_preservation: {
    id: 'formula_ember_shirt_of_preservation', name: 'Formula: Ember Shirt of Preservation', type: 'recipe',
    description: 'Teaches the recipe for a Ember Shirt of Preservation.',
    stackable: true, teachesRecipeId: 'ember_shirt_of_preservation', sellValue: 0,
  },

  // ── Enchanting overhaul's Phase E6 rare formulas — same dungeon-boss
  // 5%-drop mechanism as the Tailoring shirt formulas above (see
  // monsters.ts's molten_herald/pyraxis loot tables), teaching the 9
  // proc/special enchant scrolls the design brief gates behind "profession
  // level + rare formula unlocks" (Fiery Weapon/Icy Chill/Lifestealing at
  // both their zone-5 and Ember-tier zone-6 versions, plus Crusader/
  // Spellpower/Healing Power) rather than ordinary trainer progression.
  formula_scroll_fiery_weapon_z5: {
    id: 'formula_scroll_fiery_weapon_z5', name: 'Formula: Fiery Weapon', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Fiery Weapon.',
    stackable: true, teachesRecipeId: 'scroll_fiery_weapon_z5', sellValue: 0,
  },
  formula_scroll_icy_chill_z5: {
    id: 'formula_scroll_icy_chill_z5', name: 'Formula: Icy Chill', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Icy Chill.',
    stackable: true, teachesRecipeId: 'scroll_icy_chill_z5', sellValue: 0,
  },
  formula_scroll_lifestealing_z5: {
    id: 'formula_scroll_lifestealing_z5', name: 'Formula: Lifestealing', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Lifestealing.',
    stackable: true, teachesRecipeId: 'scroll_lifestealing_z5', sellValue: 0,
  },
  formula_scroll_ember_fiery_weapon: {
    id: 'formula_scroll_ember_fiery_weapon', name: 'Formula: Ember Fiery Weapon', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Ember Fiery Weapon.',
    stackable: true, teachesRecipeId: 'scroll_ember_fiery_weapon', sellValue: 0,
  },
  formula_scroll_ember_icy_chill: {
    id: 'formula_scroll_ember_icy_chill', name: 'Formula: Ember Icy Chill', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Ember Icy Chill.',
    stackable: true, teachesRecipeId: 'scroll_ember_icy_chill', sellValue: 0,
  },
  formula_scroll_ember_lifestealing: {
    id: 'formula_scroll_ember_lifestealing', name: 'Formula: Ember Lifestealing', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Ember Lifestealing.',
    stackable: true, teachesRecipeId: 'scroll_ember_lifestealing', sellValue: 0,
  },
  formula_scroll_crusader: {
    id: 'formula_scroll_crusader', name: 'Formula: Crusader', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Crusader.',
    stackable: true, teachesRecipeId: 'scroll_crusader', sellValue: 0,
  },
  formula_scroll_spellpower: {
    id: 'formula_scroll_spellpower', name: 'Formula: Spellpower', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Spellpower.',
    stackable: true, teachesRecipeId: 'scroll_spellpower', sellValue: 0,
  },
  formula_scroll_healing_power: {
    id: 'formula_scroll_healing_power', name: 'Formula: Healing Power', type: 'recipe',
    description: 'Teaches the recipe for Scroll: Healing Power.',
    stackable: true, teachesRecipeId: 'scroll_healing_power', sellValue: 0,
  },
  // ── Combat drops (non-leather) ──────────────────────────────────────
  boar_meat: {
    id: 'boar_meat',
    name: 'Boar Meat',
    type: 'material',
    description: 'Raw meat from a Greenhorn Boar.',
    stackable: true,
    sellValue: 1,
  },
  small_tusk: {
    id: 'small_tusk',
    name: 'Small Tusk',
    type: 'material',
    description: 'A curved tusk, prized by trinket-makers.',
    stackable: true,
    sellValue: 3,
  },
  wolf_fang: {
    id: 'wolf_fang',
    name: 'Wolf Fang',
    type: 'material',
    description: 'A sharp fang from a Forest Wolf.',
    stackable: true,
    sellValue: 2,
  },
  raw_meat: {
    id: 'raw_meat',
    name: 'Raw Meat',
    type: 'material',
    description: 'Common meat from a slain beast.',
    stackable: true,
    sellValue: 1,
  },
  linen_cloth: {
    id: 'linen_cloth',
    name: 'Linen Cloth',
    type: 'material',
    description: 'Coarse woven cloth, stripped from a humanoid enemy.',
    stackable: true,
    sellValue: 2,
  },

  // ── Tailoring overhaul — 5 new cloth tiers (zones 2-6), reusing the exact
  // monster sources the old coarse_cloth/heavy_cloth/ashwoven_cloth/
  // charred_cloth/ashenweave_cloth dropped from (see monsters.ts) — only the
  // item identity/name changes, to the Classic-inspired Wool/Silk/Mageweave/
  // Runecloth/Ember naming. The 5 old items stay fully intact (frozen, no
  // longer dropped by anything) for any already-held stock, same convention
  // as every other retired-content block in this file.
  wool_cloth: {
    id: 'wool_cloth', name: 'Wool Cloth', type: 'material',
    description: 'Thick woven cloth, stripped from a highland bandit.', stackable: true, sellValue: 3,
  },
  silk_cloth: {
    id: 'silk_cloth', name: 'Silk Cloth', type: 'material',
    description: 'Fine, strong cloth taken from a ridge marauder.', stackable: true, sellValue: 4,
  },
  mageweave_cloth: {
    id: 'mageweave_cloth', name: 'Mageweave Cloth', type: 'material',
    description: 'Cloth woven through with faint traces of old magic.', stackable: true, sellValue: 5,
  },
  runecloth: {
    id: 'runecloth', name: 'Runecloth', type: 'material',
    description: "Cultist robes, their stitched runes still faintly warm.", stackable: true, sellValue: 6,
  },
  ember_cloth: {
    id: 'ember_cloth', name: 'Ember Cloth', type: 'material',
    description: "Cloth from the crater's own fire-cultists, scorched but never burnt through.", stackable: true, sellValue: 7,
  },

  // ── Tailoring overhaul — 6 vendor-only thread tiers, replacing the old
  // single simple_thread (frozen, same convention as the cloth retirement
  // above). A deliberate gold sink: never gathered or dropped, consumed by
  // every Tailoring recipe alongside cloth.
  coarse_thread: {
    id: 'coarse_thread', name: 'Coarse Thread', type: 'material',
    description: 'Plain thread for stitching cloth together. Sold by vendors, not gathered.', stackable: true, sellValue: 1,
  },
  fine_thread: {
    id: 'fine_thread', name: 'Fine Thread', type: 'material',
    description: 'Finer thread, holding a seam better than Coarse Thread. Sold by vendors, not gathered.', stackable: true, sellValue: 2,
  },
  silken_thread: {
    id: 'silken_thread', name: 'Silken Thread', type: 'material',
    description: 'Thread spun fine enough for silk work. Sold by vendors, not gathered.', stackable: true, sellValue: 4,
  },
  heavy_silken_thread: {
    id: 'heavy_silken_thread', name: 'Heavy Silken Thread', type: 'material',
    description: 'A heavier silken thread, for sturdier stitching. Sold by vendors, not gathered.', stackable: true, sellValue: 7,
  },
  rune_thread: {
    id: 'rune_thread', name: 'Rune Thread', type: 'material',
    description: 'Thread spun with a faint rune-work shimmer. Sold by vendors, not gathered.', stackable: true, sellValue: 11,
  },
  ember_thread: {
    id: 'ember_thread', name: 'Ember Thread', type: 'material',
    description: 'Thread that never quite cools. Sold by vendors, not gathered.', stackable: true, sellValue: 16,
  },

  copper_scrap: {
    id: 'copper_scrap',
    name: 'Copper Scrap',
    type: 'material',
    description: 'Bits of scavenged copper.',
    stackable: true,
    sellValue: 2,
  },
  small_coin_pouch: {
    id: 'small_coin_pouch',
    name: 'Small Coin Pouch',
    type: 'material',
    description: 'A pouch that can be sold for a handful of Gold.',
    stackable: true,
    sellValue: 5,
  },
  lucky_foot: {
    id: 'lucky_foot',
    name: "Lucky Foot",
    type: 'material',
    description: 'Said to bring good fortune. Mostly just a curiosity.',
    stackable: true,
    sellValue: 4,
  },

  // ── Gathering node materials ────────────────────────────────────────
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper Ore',
    type: 'material',
    description: 'Raw ore mined from a Copper Vein.',
    stackable: true,
    sellValue: 1,
  },
  peacebloom: {
    id: 'peacebloom',
    name: 'Peacebloom',
    type: 'material',
    description: 'A common but useful herb.',
    stackable: true,
    sellValue: 1,
  },

  // ── The 25-herb Herbalism/Alchemy overhaul roster (18 primary + 7 bonus
  // — see herbs.ts for the authoritative zone/level registry). sellValue
  // scales with the herb's zone tier (1-6); bonus herbs sell for a modest
  // premium over their zone's primary herbs since they're rarer.
  silverleaf: { id: 'silverleaf', name: 'Silverleaf', type: 'material', description: 'A pale herb with silvery leaves, found in Greenhollow Fields.', stackable: true, sellValue: 1 },
  earthroot: { id: 'earthroot', name: 'Earthroot', type: 'material', description: 'A gnarled root pulled from Greenhollow Fields’ soil.', stackable: true, sellValue: 1 },
  mageroyal: { id: 'mageroyal', name: 'Mageroyal', type: 'material', description: 'An herb that hums faintly with latent magic.', stackable: true, sellValue: 2 },
  briarthorn: { id: 'briarthorn', name: 'Briarthorn', type: 'material', description: 'A thorny shrub common across Stonecrag Foothills.', stackable: true, sellValue: 2 },
  bruiseweed: { id: 'bruiseweed', name: 'Bruiseweed', type: 'material', description: 'A bitter leaf long used to dull pain.', stackable: true, sellValue: 2 },
  kingsblood: { id: 'kingsblood', name: 'Kingsblood', type: 'material', description: 'A deep-red root said to thicken the blood.', stackable: true, sellValue: 3 },
  liferoot: { id: 'liferoot', name: 'Liferoot', type: 'material', description: 'A vital-looking root favored by healers.', stackable: true, sellValue: 3 },
  goldthorn: { id: 'goldthorn', name: 'Goldthorn', type: 'material', description: 'A spiny plant with golden-edged leaves.', stackable: true, sellValue: 3 },
  khadgars_whisker: { id: 'khadgars_whisker', name: "Khadgar's Whisker", type: 'material', description: 'A wispy herb named for a famous archmage.', stackable: true, sellValue: 4 },
  firebloom: { id: 'firebloom', name: 'Firebloom', type: 'material', description: 'A bloom that stays warm long after picking.', stackable: true, sellValue: 4 },
  sungrass: { id: 'sungrass', name: 'Sungrass', type: 'material', description: 'Golden grass that seems to hold onto daylight.', stackable: true, sellValue: 4 },
  blindweed: { id: 'blindweed', name: 'Blindweed', type: 'material', description: 'A pale, eyeless-looking weed from the Molten Scar.', stackable: true, sellValue: 6 },
  ghost_mushroom: { id: 'ghost_mushroom', name: 'Ghost Mushroom', type: 'material', description: 'A faintly luminous fungus found in deep crevices.', stackable: true, sellValue: 6 },
  gromsblood: { id: 'gromsblood', name: 'Gromsblood', type: 'material', description: 'A fierce-looking plant tied to old legends of rage.', stackable: true, sellValue: 6 },
  dreamfoil: { id: 'dreamfoil', name: 'Dreamfoil', type: 'material', description: 'A drowsy-scented herb from the Cinderheart Crater.', stackable: true, sellValue: 8 },
  mountain_silversage: { id: 'mountain_silversage', name: 'Mountain Silversage', type: 'material', description: 'A rare silver-leafed sage from the crater’s high ledges.', stackable: true, sellValue: 8 },
  black_lotus: { id: 'black_lotus', name: 'Black Lotus', type: 'material', description: 'An exceedingly rare bloom, dark as the crater’s depths.', stackable: true, sellValue: 8 },

  swiftthistle: { id: 'swiftthistle', name: 'Swiftthistle', type: 'material', description: 'A quick-growing thistle that sometimes turns up alongside Mageroyal or Briarthorn.', stackable: true, sellValue: 3 },
  grave_moss: { id: 'grave_moss', name: 'Grave Moss', type: 'material', description: 'A dark moss occasionally found clinging to Bruiseweed or Kingsblood.', stackable: true, sellValue: 4 },
  stranglekelp: { id: 'stranglekelp', name: 'Stranglekelp', type: 'material', description: 'A tough, rubbery kelp sometimes tangled in Liferoot.', stackable: true, sellValue: 4 },
  fadeleaf: { id: 'fadeleaf', name: 'Fadeleaf', type: 'material', description: 'A translucent leaf occasionally found near Goldthorn or Khadgar’s Whisker.', stackable: true, sellValue: 5 },
  purple_lotus: { id: 'purple_lotus', name: 'Purple Lotus', type: 'material', description: 'A striking violet bloom occasionally found near Sungrass or Blindweed.', stackable: true, sellValue: 6 },
  arthas_tears: { id: 'arthas_tears', name: "Arthas' Tears", type: 'material', description: 'A rare, cold-to-the-touch herb occasionally found near Ghost Mushroom or Gromsblood.', stackable: true, sellValue: 7 },
  plaguebloom: { id: 'plaguebloom', name: 'Plaguebloom', type: 'material', description: 'A sickly-looking bloom occasionally found near Dreamfoil or Mountain Silversage.', stackable: true, sellValue: 9 },

  // ── Leatherworking equipment (V1 recipes) ───────────────────────────
  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    type: 'equipment',
    description: 'Simple boots stitched from Light Leather.',
    stackable: true,
    equipSlot: 'boots',
    armorType: 'leather',
    statBonuses: { STA: 2 },
    sellValue: 6,
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'Leather Gloves',
    type: 'equipment',
    description: 'Flexible gloves that improve your grip in combat.',
    stackable: true,
    equipSlot: 'gloves',
    armorType: 'leather',
    statBonuses: { STR: 2 },
    sellValue: 8,
  },
  leather_cap: {
    id: 'leather_cap',
    name: 'Leather Cap',
    type: 'equipment',
    description: 'A hardened leather cap offering solid protection.',
    stackable: true,
    equipSlot: 'helmet',
    armorType: 'leather',
    statBonuses: { STA: 3 },
    sellValue: 10,
  },
    rusty_dagger: {
    id: 'rusty_dagger', name: 'Rusty Dagger', type: 'equipment',
    description: 'A crude blade, scavenged from a fallen kobold. Better than fists.', stackable: true,
    equipSlot: 'weapon', statBonuses: { STR: 3 }, sellValue: 12,
  },
  apprentice_staff: {
    id: 'apprentice_staff', name: 'Apprentice Staff', type: 'equipment',
    description: 'A gnarled staff taken from a kobold shaman, still humming with residual magic.', stackable: true,
    equipSlot: 'weapon', statBonuses: { INT: 3 }, sellValue: 12,
  },

  // ── Stonecrag Foothills materials ────────────────────────────────────
  coarse_hide: {
    id: 'coarse_hide',
    name: 'Coarse Hide',
    type: 'material',
    description: 'A tough hide, roughened by life on the rocky slopes.',
    stackable: true,
    sellValue: 2,
  },
  thick_hide: {
    id: 'thick_hide',
    name: 'Thick Hide',
    type: 'material',
    description: 'A dense hide from a foothill goat, good for heavier leatherwork.',
    stackable: true,
    sellValue: 3,
  },
  goat_horn: {
    id: 'goat_horn',
    name: 'Goat Horn',
    type: 'material',
    description: 'A curved horn, sturdy enough to interest a craftsman.',
    stackable: true,
    sellValue: 6,
  },
  stone_shard: {
    id: 'stone_shard',
    name: 'Stone Shard',
    type: 'material',
    description: 'A jagged fragment chipped from living rock.',
    stackable: true,
    sellValue: 2,
  },
  tin_ore: {
    id: 'tin_ore',
    name: 'Tin Ore',
    type: 'material',
    description: 'Raw ore mined from a Tin Vein, softer than copper.',
    stackable: true,
    sellValue: 2,
  },
  silver_ore: {
    id: 'silver_ore',
    name: 'Silver Ore',
    type: 'material',
    description: 'A bright, lustrous ore mined from a Silver Vein.',
    stackable: true,
    sellValue: 3,
  },
  flawed_gem: {
    id: 'flawed_gem',
    name: 'Flawed Gem',
    type: 'material',
    description: 'A dull, cloudy gemstone. Worth something, but not much.',
    stackable: true,
    sellValue: 15,
  },
  coarse_cloth: {
    id: 'coarse_cloth',
    name: 'Coarse Cloth',
    type: 'material',
    description: 'Rough-spun cloth stripped from a highland bandit.',
    stackable: true,
    sellValue: 3,
  },
  bandit_coin_pouch: {
    id: 'bandit_coin_pouch',
    name: 'Bandit Coin Pouch',
    type: 'material',
    description: 'A heavier pouch than most — this bandit was doing well.',
    stackable: true,
    sellValue: 10,
  },
  worn_shiv: {
    id: 'worn_shiv',
    name: 'Worn Shiv',
    type: 'material',
    description: 'A crude blade, too worn to be worth equipping. Someone might still buy it.',
    stackable: true,
    sellValue: 5,
  },
  sharp_fang: {
    id: 'sharp_fang',
    name: 'Sharp Fang',
    type: 'material',
    description: 'A large fang from a foothill wolf.',
    stackable: true,
    sellValue: 4,
  },
  alpha_pelt: {
    id: 'alpha_pelt',
    name: 'Alpha Pelt',
    type: 'material',
    description: 'A pristine pelt from a pack alpha — rare, and prized by leatherworkers for a reason.',
    stackable: true,
    sellValue: 20,
  },
  mountain_sage: {
    id: 'mountain_sage',
    name: 'Mountain Sage',
    type: 'material',
    description: 'A hardy herb that grows in thin, rocky soil.',
    stackable: true,
    sellValue: 2,
  },
  coarse_leather: {
    id: 'coarse_leather',
    name: 'Coarse Leather',
    type: 'material',
    description: 'Several coarse hides worked together into a tougher leather than the Greenhollow kind.',
    stackable: true,
    sellValue: 3,
  },

  // ── Stonecrag Foothills equipment ────────────────────────────────────
  reinforced_leather_vest: {
    id: 'reinforced_leather_vest', name: 'Reinforced Leather Vest', type: 'equipment',
    description: 'A sturdy leather vest built for the rocky foothills — a real step up from apprentice work.',
    stackable: true, equipSlot: 'chest', armorType: 'leather', statBonuses: { STA: 5, STR: 2 }, sellValue: 18,
  },
  alphahide_gloves: {
    id: 'alphahide_gloves', name: 'Alphahide Gloves', type: 'equipment',
    description: "Gloves cut from a pack alpha's pelt. Only the strongest wolf in the foothills carries hide like this.",
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 4, STR: 4 }, sellValue: 25,
  },
  thick_hide_cap: {
    id: 'thick_hide_cap', name: 'Thick Hide Cap', type: 'equipment',
    description: 'A heavy cap worked from thick hide, built to take a hit on the rocky trails.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 5 }, sellValue: 20,
  },
  ridgehide_boots: {
    id: 'ridgehide_boots', name: 'Ridgehide Boots', type: 'equipment',
    description: 'Sturdy boots cut from coarse leather and thick hide, soled for broken rock.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 4, STR: 3 }, sellValue: 20,
  },
  alpha_fang_blade: {
    id: 'alpha_fang_blade', name: 'Alpha Fang Blade', type: 'equipment',
    description: "A blade hafted from a pack alpha's own fang — a rare trophy from the toughest thing in the foothills.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 6 }, sellValue: 30,
  },
  focusing_wand: {
    id: 'focusing_wand', name: 'Focusing Wand', type: 'equipment',
    description: "A bandit's stolen spellcasting focus, still humming with someone else's magic.",
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 5 }, sellValue: 26,
  },
  stolen_spellband: {
    id: 'stolen_spellband', name: 'Stolen Spellband', type: 'equipment',
    description: "Another piece of a bandit's stolen spellcasting kit — a ring that still carries a trace of someone else's magic.",
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 4, STA: 4 }, sellValue: 50,
  },

  // ── Smithing materials ───────────────────────────────────────────────
  copper_bar: {
    id: 'copper_bar',
    name: 'Copper Bar',
    type: 'material',
    description: 'Copper ore smelted down into a workable bar.',
    stackable: true,
    sellValue: 3,
  },
  tin_bar: {
    id: 'tin_bar',
    name: 'Tin Bar',
    type: 'material',
    description: 'Tin ore smelted down into a workable bar.',
    stackable: true,
    sellValue: 4,
  },
  silver_bar: {
    id: 'silver_bar',
    name: 'Silver Bar',
    type: 'material',
    description: 'Silver ore smelted down into a workable bar.',
    stackable: true,
    sellValue: 5,
  },
  bronze_bar: {
    id: 'bronze_bar',
    name: 'Bronze Bar',
    type: 'material',
    description: 'Copper alloyed with tin — sturdier than copper alone.',
    stackable: true,
    sellValue: 6,
  },

  // ── Tailoring materials ──────────────────────────────────────────────
  simple_thread: {
    id: 'simple_thread',
    name: 'Simple Thread',
    type: 'material',
    description: 'Plain thread for stitching cloth together. Sold by vendors, not gathered.',
    stackable: true,
    sellValue: 1,
  },

  // ── Tailoring equipment ──────────────────────────────────────────────
  linen_robe: {
    id: 'linen_robe',
    name: 'Linen Robe',
    type: 'equipment',
    description: 'A simple robe stitched together from linen cloth.',
    stackable: true,
    equipSlot: 'chest',
    armorType: 'cloth',
    statBonuses: { INT: 2, SPI: 1 },
    sellValue: 8,
  },
  linen_gloves: {
    id: 'linen_gloves',
    name: 'Linen Gloves',
    type: 'equipment',
    description: 'Light gloves that keep the fingers free for spellwork.',
    stackable: true,
    equipSlot: 'gloves',
    armorType: 'cloth',
    statBonuses: { INT: 2 },
    sellValue: 7,
  },
  linen_cap: {
    id: 'linen_cap',
    name: 'Linen Cap',
    type: 'equipment',
    description: 'A soft cap sewn from stitched linen.',
    stackable: true,
    equipSlot: 'helmet',
    armorType: 'cloth',
    statBonuses: { SPI: 2, INT: 1 },
    sellValue: 9,
  },
  linen_boots: {
    id: 'linen_boots',
    name: 'Linen Boots',
    type: 'equipment',
    description: 'Soft-soled boots stitched from linen, quiet enough for spellwork on the move.',
    stackable: true,
    equipSlot: 'boots',
    armorType: 'cloth',
    statBonuses: { INT: 1, SPI: 2 },
    sellValue: 8,
  },
  sage_leggings: {
    id: 'sage_leggings',
    name: 'Sage-Woven Leggings',
    type: 'equipment',
    description: 'Coarse cloth leggings treated with mountain sage.',
    stackable: true,
    equipSlot: 'legs',
    armorType: 'cloth',
    statBonuses: { INT: 2, SPI: 2 },
    sellValue: 14,
  },

  // ── Dungeon boss drops (Phase 8) ──────────────────────────────────────
  chieftains_warhammer: {
    id: 'chieftains_warhammer', name: "Chieftain's Warhammer", type: 'equipment',
    description: 'The warhammer of the Kobold Warrens’ chieftain — heavier and better balanced than anything else this side of the Warrens.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8 }, sellValue: 45,
  },
  chieftains_seal: {
    id: 'chieftains_seal', name: "Chieftain's Seal", type: 'equipment',
    description: 'A plain band the Kobold Chieftain wore into every fight — worn smooth, but still solid.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 3 }, sellValue: 15,
  },
  warlords_signet: {
    id: 'warlords_signet', name: "Warlord's Signet", type: 'equipment',
    description: 'A heavy signet ring taken from the Alpha Warlord of the Stonecrag Depths.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 4, STR: 4 }, sellValue: 50,
  },

  // ── Consumables — vendor-bought basics; see Alchemy below for the
  // craftable, stronger line that gives Herbalism's herbs an actual use ──
  health_potion: {
    id: 'health_potion', name: 'Health Potion', type: 'consumable',
    description: 'Restores 20 health. Usable anywhere, once every 30 seconds.',
    stackable: true, sellValue: 3,
    consumableEffect: { healAmount: 20, cooldownSeconds: 30 },
  },
  bread: {
    id: 'bread', name: 'Bread', type: 'consumable',
    description: 'A dense travel loaf. Restores 40 health. Usable anywhere, once every 10 seconds.',
    stackable: true, sellValue: 1,
    consumableEffect: { healAmount: 40, cooldownSeconds: 10 },
  },
  orange_juice: {
    id: 'orange_juice', name: 'Orange Juice', type: 'consumable',
    description: 'Freshly squeezed. Restores 50 mana. Only usable in combat (there’s no mana to restore outside a fight), once every 10 seconds.',
    stackable: true, sellValue: 1,
    consumableEffect: { manaAmount: 50, cooldownSeconds: 10 },
  },

  // ── Alchemy overhaul — the 30 live recipes' potions, replacing the old
  // Alchemy line below (kept, frozen, never deleted — see recipes.ts).
  // Resource potions (healPctMax/manaPctMax, no charges, single-use, same
  // cooldown-per-item-id model as every consumable before them). Offensive/
  // defensive potions omit `buff.charges` deliberately — their actual
  // charge count is rolled at CRAFT time from the crafter's current Alchemy
  // zone Mastery (1/2/3/4 at 0/25/60/90%) and lives on the inventory
  // instance bucket (Inventory.chargedConsumables), not on this static
  // definition; `trigger` alone is enough for the combat engine to know
  // which event consumes a charge.
  minor_healing_potion: {
    id: 'minor_healing_potion', name: 'Minor Healing Potion', type: 'consumable',
    description: 'Restores 15% of max health.', stackable: true, sellValue: 2,
    consumableEffect: { healPctMax: 15, cooldownSeconds: 20 },
  },
  minor_mana_potion: {
    id: 'minor_mana_potion', name: 'Minor Mana Potion', type: 'consumable',
    description: 'Restores 15% of max mana. Only usable in combat.', stackable: true, sellValue: 2,
    consumableEffect: { manaPctMax: 15, cooldownSeconds: 20 },
  },
  elixir_of_lions_strength: {
    id: 'elixir_of_lions_strength', name: "Elixir of Lion's Strength", type: 'consumable',
    description: '+5% physical attack damage for your next attack per charge.', stackable: true, sellValue: 4,
    consumableEffect: { cooldownSeconds: 30, buff: { category: 'offensive_potion', damageMultiplierPct: 5, trigger: 'offensive_action' } },
  },
  elixir_of_minor_defense: {
    id: 'elixir_of_minor_defense', name: 'Elixir of Minor Defense', type: 'consumable',
    description: '+5% armor against your next hit taken per charge.', stackable: true, sellValue: 4,
    consumableEffect: { cooldownSeconds: 30, buff: { category: 'defensive_potion', armorBonusPct: 5, trigger: 'damage_taken' } },
  },
  weak_trolls_blood_elixir: {
    id: 'weak_trolls_blood_elixir', name: "Weak Troll's Blood Elixir", type: 'consumable',
    description: 'Heals 3% of max health alongside your next hit taken per charge.', stackable: true, sellValue: 4,
    consumableEffect: { cooldownSeconds: 30, buff: { category: 'defensive_potion', healOnTriggerPct: 3, trigger: 'damage_taken' } },
  },
  lesser_healing_potion: {
    id: 'lesser_healing_potion', name: 'Lesser Healing Potion', type: 'consumable',
    description: 'Restores 25% of max health.', stackable: true, sellValue: 6,
    consumableEffect: { healPctMax: 25, cooldownSeconds: 24 },
  },
  lesser_mana_potion: {
    id: 'lesser_mana_potion', name: 'Lesser Mana Potion', type: 'consumable',
    description: 'Restores 25% of max mana. Only usable in combat.', stackable: true, sellValue: 6,
    consumableEffect: { manaPctMax: 25, cooldownSeconds: 24 },
  },
  swiftness_potion: {
    id: 'swiftness_potion', name: 'Swiftness Potion', type: 'consumable',
    description: '+15% action speed (modeled as bonus damage) for your next attack per charge.', stackable: true, sellValue: 7,
    consumableEffect: { cooldownSeconds: 35, buff: { category: 'offensive_potion', damageMultiplierPct: 15, trigger: 'offensive_action' } },
  },
  healing_potion: {
    id: 'healing_potion', name: 'Healing Potion', type: 'consumable',
    description: 'Restores 35% of max health.', stackable: true, sellValue: 9,
    consumableEffect: { healPctMax: 35, cooldownSeconds: 28 },
  },
  elixir_of_lesser_agility: {
    id: 'elixir_of_lesser_agility', name: 'Elixir of Lesser Agility', type: 'consumable',
    description: '+8% physical attack damage for your next attack per charge.', stackable: true, sellValue: 9,
    consumableEffect: { cooldownSeconds: 35, buff: { category: 'offensive_potion', damageMultiplierPct: 8, trigger: 'offensive_action' } },
  },
  greater_healing_potion: {
    id: 'greater_healing_potion', name: 'Greater Healing Potion', type: 'consumable',
    description: 'Restores 45% of max health.', stackable: true, sellValue: 13,
    consumableEffect: { healPctMax: 45, cooldownSeconds: 32 },
  },
  greater_mana_potion: {
    id: 'greater_mana_potion', name: 'Greater Mana Potion', type: 'consumable',
    description: 'Restores 45% of max mana. Only usable in combat.', stackable: true, sellValue: 13,
    consumableEffect: { manaPctMax: 45, cooldownSeconds: 32 },
  },
  shadow_protection_potion: {
    id: 'shadow_protection_potion', name: 'Shadow Protection Potion', type: 'consumable',
    description: '+15 percentage points shadow resistance against your next hit taken per charge.', stackable: true, sellValue: 15,
    consumableEffect: { cooldownSeconds: 40, buff: { category: 'defensive_potion', shadowResistancePct: 15, trigger: 'damage_taken' } },
  },
  elixir_of_fortitude: {
    id: 'elixir_of_fortitude', name: 'Elixir of Fortitude', type: 'consumable',
    description: '+10% maximum health for your next hit taken per charge.', stackable: true, sellValue: 15,
    consumableEffect: { cooldownSeconds: 40, buff: { category: 'defensive_potion', maxHpBonusPct: 10, trigger: 'damage_taken' } },
  },
  elixir_of_agility: {
    id: 'elixir_of_agility', name: 'Elixir of Agility', type: 'consumable',
    description: '+10% physical attack damage for your next attack per charge.', stackable: true, sellValue: 16,
    consumableEffect: { cooldownSeconds: 40, buff: { category: 'offensive_potion', damageMultiplierPct: 10, trigger: 'offensive_action' } },
  },
  superior_healing_potion: {
    id: 'superior_healing_potion', name: 'Superior Healing Potion', type: 'consumable',
    description: 'Restores 55% of max health.', stackable: true, sellValue: 20,
    consumableEffect: { healPctMax: 55, cooldownSeconds: 36 },
  },
  superior_mana_potion: {
    id: 'superior_mana_potion', name: 'Superior Mana Potion', type: 'consumable',
    description: 'Restores 55% of max mana. Only usable in combat.', stackable: true, sellValue: 20,
    consumableEffect: { manaPctMax: 55, cooldownSeconds: 36 },
  },
  elixir_of_firepower: {
    id: 'elixir_of_firepower', name: 'Elixir of Firepower', type: 'consumable',
    description: '+12% magical attack damage for your next attack per charge.', stackable: true, sellValue: 22,
    consumableEffect: { cooldownSeconds: 45, buff: { category: 'offensive_potion', damageMultiplierPct: 12, trigger: 'offensive_action' } },
  },
  fire_protection_potion: {
    id: 'fire_protection_potion', name: 'Fire Protection Potion', type: 'consumable',
    description: '+20 percentage points fire resistance against your next hit taken per charge.', stackable: true, sellValue: 22,
    consumableEffect: { cooldownSeconds: 45, buff: { category: 'defensive_potion', fireResistancePct: 20, trigger: 'damage_taken' } },
  },
  elixir_of_greater_defense: {
    id: 'elixir_of_greater_defense', name: 'Elixir of Greater Defense', type: 'consumable',
    description: '+12% armor against your next hit taken per charge.', stackable: true, sellValue: 24,
    consumableEffect: { cooldownSeconds: 45, buff: { category: 'defensive_potion', armorBonusPct: 12, trigger: 'damage_taken' } },
  },
  major_healing_potion: {
    id: 'major_healing_potion', name: 'Major Healing Potion', type: 'consumable',
    description: 'Restores 65% of max health.', stackable: true, sellValue: 28,
    consumableEffect: { healPctMax: 65, cooldownSeconds: 40 },
  },
  major_mana_potion: {
    id: 'major_mana_potion', name: 'Major Mana Potion', type: 'consumable',
    description: 'Restores 65% of max mana. Only usable in combat.', stackable: true, sellValue: 28,
    consumableEffect: { manaPctMax: 65, cooldownSeconds: 40 },
  },
  elixir_of_giants: {
    id: 'elixir_of_giants', name: 'Elixir of Giants', type: 'consumable',
    description: '+15% physical attack damage for your next attack per charge.', stackable: true, sellValue: 32,
    consumableEffect: { cooldownSeconds: 50, buff: { category: 'offensive_potion', damageMultiplierPct: 15, trigger: 'offensive_action' } },
  },
  elixir_of_shadow_power: {
    id: 'elixir_of_shadow_power', name: 'Elixir of Shadow Power', type: 'consumable',
    description: '+15% magical attack damage for your next attack per charge.', stackable: true, sellValue: 32,
    consumableEffect: { cooldownSeconds: 50, buff: { category: 'offensive_potion', damageMultiplierPct: 15, trigger: 'offensive_action' } },
  },
  greater_shadow_protection_potion: {
    id: 'greater_shadow_protection_potion', name: 'Greater Shadow Protection Potion', type: 'consumable',
    description: '+30 percentage points shadow resistance against your next hit taken per charge.', stackable: true, sellValue: 34,
    consumableEffect: { cooldownSeconds: 50, buff: { category: 'defensive_potion', shadowResistancePct: 30, trigger: 'damage_taken' } },
  },
  supreme_healing_potion: {
    id: 'supreme_healing_potion', name: 'Supreme Healing Potion', type: 'consumable',
    description: 'Restores 75% of max health.', stackable: true, sellValue: 38,
    consumableEffect: { healPctMax: 75, cooldownSeconds: 44 },
  },
  supreme_mana_potion: {
    id: 'supreme_mana_potion', name: 'Supreme Mana Potion', type: 'consumable',
    description: 'Restores 75% of max mana. Only usable in combat.', stackable: true, sellValue: 38,
    consumableEffect: { manaPctMax: 75, cooldownSeconds: 44 },
  },
  elixir_of_the_mongoose: {
    id: 'elixir_of_the_mongoose', name: 'Elixir of the Mongoose', type: 'consumable',
    description: '+18% physical attack damage for your next attack per charge.', stackable: true, sellValue: 42,
    consumableEffect: { cooldownSeconds: 55, buff: { category: 'offensive_potion', damageMultiplierPct: 18, trigger: 'offensive_action' } },
  },
  greater_arcane_elixir: {
    id: 'greater_arcane_elixir', name: 'Greater Arcane Elixir', type: 'consumable',
    description: '+18% magical attack damage for your next attack per charge.', stackable: true, sellValue: 42,
    consumableEffect: { cooldownSeconds: 55, buff: { category: 'offensive_potion', damageMultiplierPct: 18, trigger: 'offensive_action' } },
  },
  flask_of_supreme_power: {
    id: 'flask_of_supreme_power', name: 'Flask of Supreme Power', type: 'consumable',
    description: '+20% all attack damage for your next attack per charge.', stackable: true, sellValue: 50,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'offensive_potion', damageMultiplierPct: 20, trigger: 'offensive_action' } },
  },

  // ── Retired Alchemy line (frozen — never deleted so existing stacks keep
  // working; no longer craftable, see recipes.ts) ──
  minor_healing_draught: {
    id: 'minor_healing_draught', name: 'Minor Healing Draught', type: 'consumable',
    description: 'A simple alchemical brew. Restores 35 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 2,
    consumableEffect: { healAmount: 35, cooldownSeconds: 25 },
  },
  minor_mana_draught: {
    id: 'minor_mana_draught', name: 'Minor Mana Draught', type: 'consumable',
    description: 'Restores 70 mana. Only usable in combat, once every 10 seconds.',
    stackable: true, sellValue: 2,
    consumableEffect: { manaAmount: 70, cooldownSeconds: 10 },
  },
  sage_healing_potion: {
    id: 'sage_healing_potion', name: 'Sage Healing Potion', type: 'consumable',
    description: 'A stronger brew made with mountain sage. Restores 70 health. Usable anywhere, once every 20 seconds.',
    stackable: true, sellValue: 4,
    consumableEffect: { healAmount: 70, cooldownSeconds: 20 },
  },
  sunpetal_elixir: {
    id: 'sunpetal_elixir', name: 'Sunpetal Elixir', type: 'consumable',
    description: 'A potent brew of Emberfall sunpetal. Restores 110 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 6,
    consumableEffect: { healAmount: 110, cooldownSeconds: 25 },
  },

  // ── Emberfall Ridge materials ─────────────────────────────────────────
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    type: 'material',
    description: 'Raw ore mined from an Iron Vein, heavier and harder than tin.',
    stackable: true,
    sellValue: 3,
  },
  sunpetal: {
    id: 'sunpetal',
    name: 'Sunpetal',
    type: 'material',
    description: 'A bright, heat-loving flower that only grows near open flame.',
    stackable: true,
    sellValue: 2,
  },
  scaled_hide: {
    id: 'scaled_hide',
    name: 'Scaled Hide',
    type: 'material',
    description: "Tough, fire-hardened hide shed by the ridge's wolves.",
    stackable: true,
    sellValue: 3,
  },
  iron_bar: {
    id: 'iron_bar',
    name: 'Iron Bar',
    type: 'material',
    description: 'Iron ore smelted into a dense, workable bar.',
    stackable: true,
    sellValue: 7,
  },
  steel_bar: {
    id: 'steel_bar',
    name: 'Steel Bar',
    type: 'material',
    description: 'Iron ore smelted twice over into a harder, refined bar.',
    stackable: true,
    sellValue: 10,
  },
  scaled_leather: {
    id: 'scaled_leather',
    name: 'Scaled Leather',
    type: 'material',
    description: 'Several scaled hides worked into leather tough enough to shrug off embers.',
    stackable: true,
    sellValue: 4,
  },
  heavy_cloth: {
    id: 'heavy_cloth',
    name: 'Heavy Cloth',
    type: 'material',
    description: 'Densely woven cloth, thick enough to blunt a blade.',
    stackable: true,
    sellValue: 4,
  },
  ember_shard: {
    id: 'ember_shard',
    name: 'Ember Shard',
    type: 'material',
    description: 'A shard of stone still warm to the touch, prized by craftsmen.',
    stackable: true,
    sellValue: 15,
  },
  obsidian_shard: {
    id: 'obsidian_shard',
    name: 'Dense Stone',
    type: 'material',
    description: 'An unusually dense stone found alongside thorium ore.',
    stackable: true,
    sellValue: 18,
  },

  // ── Emberfall Ridge equipment ─────────────────────────────────────────
  scaled_leggings: {
    id: 'scaled_leggings', name: 'Scaled Leggings', type: 'equipment',
    description: 'Leggings worked from fire-hardened scaled leather.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 7, STR: 4 }, sellValue: 34,
  },
  drakescale_boots: {
    id: 'drakescale_boots', name: 'Drakescale Boots', type: 'equipment',
    description: 'Boots reinforced with an ember shard — warm to the touch, and nearly as tough as a drake.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 6, STR: 6 }, sellValue: 42,
  },
  scaled_gloves: {
    id: 'scaled_gloves', name: 'Scaled Gloves', type: 'equipment',
    description: 'Gloves worked from fire-hardened scaled leather — the grip holds even when the hilt gets hot.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 5, STR: 3 }, sellValue: 32,
  },
  scaled_cap: {
    id: 'scaled_cap', name: 'Scaled Cap', type: 'equipment',
    description: 'A cap of overlapping scaled leather plates, tough enough to turn a glancing blow.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 7 }, sellValue: 30,
  },
  heavy_robe: {
    id: 'heavy_robe', name: 'Heavy Robe', type: 'equipment',
    description: 'A dense robe woven from heavy cloth, built to survive the ridge as much as the fight.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 6, SPI: 4 }, sellValue: 30,
  },
  heavy_leggings: {
    id: 'heavy_leggings', name: 'Heavy Leggings', type: 'equipment',
    description: 'Leggings woven from heavy cloth, thick enough to blunt a blade.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 8, SPI: 5 }, sellValue: 32,
  },
  heavy_gloves: {
    id: 'heavy_gloves', name: 'Heavy Gloves', type: 'equipment',
    description: 'Gloves cut from heavy cloth, thick but never clumsy.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 6, SPI: 3 }, sellValue: 28,
  },
  heavy_cap: {
    id: 'heavy_cap', name: 'Heavy Cap', type: 'equipment',
    description: 'A dense cloth cap, warm against the ridge’s wind.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 8, SPI: 2 }, sellValue: 30,
  },
  heavy_boots: {
    id: 'heavy_boots', name: 'Heavy Boots', type: 'equipment',
    description: 'Boots cut from heavy cloth and lined for the ridge’s scorched ground.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 31,
  },
  serrated_cleaver: {
    id: 'serrated_cleaver', name: 'Serrated Cleaver', type: 'equipment',
    description: "A brutal, notch-edged blade favored by the ridge's marauders.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8 }, sellValue: 35,
  },
  embertwined_rod: {
    id: 'embertwined_rod', name: 'Ember-Twined Rod', type: 'equipment',
    description: 'A rod wound with heat-cured vine, dropped by the same marauders who prize the Serrated Cleaver.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 8 }, sellValue: 35,
  },
  drakes_ember_eye: {
    id: 'drakes_ember_eye', name: "Drake's Ember Eye", type: 'equipment',
    description: 'A polished ring set with a still-smoldering ember, taken from a scorched drake.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 7 }, sellValue: 44,
  },

  // ── Sundered Forge dungeon boss drop ─────────────────────────────────
  kaldrun_warhammer: {
    id: 'kaldrun_warhammer', name: "Kaldrun's Warhammer", type: 'equipment',
    description: "The Forgemaster's own warhammer — heavier and better balanced than anything else on the ridge.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12, STA: 3 }, sellValue: 70,
  },
  kaldrun_tempered_band: {
    id: 'kaldrun_tempered_band', name: "Kaldrun's Tempered Band", type: 'equipment',
    description: "A heavy ring quenched in the Forgemaster's own fire, matching the ember-set rings the ridge's drakes carry.",
    stackable: true, equipSlot: 'ring', statBonuses: { STR: 7 }, sellValue: 44,
  },

  // ── Cinderfall Depths materials ───────────────────────────────────────
  mithril_ore: {
    id: 'mithril_ore', name: 'Mithril Ore', type: 'material',
    description: 'A light but immensely strong ore, found deep in collapsed dwarven tunnels.',
    stackable: true, sellValue: 4,
  },
  gold_ore: {
    id: 'gold_ore', name: 'Gold Ore', type: 'material',
    description: 'A soft, gleaming ore mined from a Gold Vein.',
    stackable: true, sellValue: 5,
  },
  emberpetal: {
    id: 'emberpetal', name: 'Emberpetal', type: 'material',
    description: 'A hardy bloom that thrives on residual heat, found nowhere else.',
    stackable: true, sellValue: 3,
  },
  ashhide: {
    id: 'ashhide', name: 'Ashhide', type: 'material',
    description: 'Tough, ash-grey hide from a beast long adapted to the ruins.',
    stackable: true, sellValue: 4,
  },
  mithril_bar: {
    id: 'mithril_bar', name: 'Mithril Bar', type: 'material',
    description: 'Mithril ore smelted into a light, immensely strong bar.',
    stackable: true, sellValue: 9,
  },
  gold_bar: {
    id: 'gold_bar', name: 'Gold Bar', type: 'material',
    description: 'Gold ore smelted into a soft, gleaming bar.',
    stackable: true, sellValue: 10,
  },
  ashhide_leather: {
    id: 'ashhide_leather', name: 'Ashhide Leather', type: 'material',
    description: 'Ashhide worked into leather tough enough to survive the ruins.',
    stackable: true, sellValue: 5,
  },
  ashwoven_cloth: {
    id: 'ashwoven_cloth', name: 'Ashwoven Cloth', type: 'material',
    description: 'Cloth salvaged from a cinder scavenger, woven through with fine ash fibers.',
    stackable: true, sellValue: 5,
  },
  cindercore_shard: {
    id: 'cindercore_shard', name: 'Cindercore Shard', type: 'material',
    description: 'A shard still glowing faintly from within, prized by craftsmen.',
    stackable: true, sellValue: 18,
  },
  smoky_quartz: {
    id: 'smoky_quartz', name: 'Smoky Quartz', type: 'material',
    description: 'A dark, smoke-clouded crystal formed under ash and pressure.',
    stackable: true, sellValue: 20,
  },

  // ── Cinderfall Depths equipment ───────────────────────────────────────
  ashhide_leggings: {
    id: 'ashhide_leggings', name: 'Ashhide Leggings', type: 'equipment',
    description: 'Leggings worked from tough ashhide leather.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 8, STR: 5 }, sellValue: 40,
  },
  ashhide_boots: {
    id: 'ashhide_boots', name: 'Ashhide Boots', type: 'equipment',
    description: 'Boots reinforced with a cindercore shard, warm underfoot even in the deep ruins.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 7, STR: 7 }, sellValue: 50,
  },
  ashhide_gloves: {
    id: 'ashhide_gloves', name: 'Ashhide Gloves', type: 'equipment',
    description: 'Gloves cut from tough ashhide, stitched to survive the ruins.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 6, STR: 4 }, sellValue: 38,
  },
  ashhide_cap: {
    id: 'ashhide_cap', name: 'Ashhide Cap', type: 'equipment',
    description: 'A sturdy cap of ashhide leather, worn by scavengers who plan on coming back out.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 9 }, sellValue: 35,
  },
  ashwoven_robe: {
    id: 'ashwoven_robe', name: 'Ashwoven Robe', type: 'equipment',
    description: 'A robe woven from salvaged ashwoven cloth, still faintly warm.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 36,
  },
  ashwoven_leggings: {
    id: 'ashwoven_leggings', name: 'Ashwoven Leggings', type: 'equipment',
    description: 'Leggings woven from salvaged ashwoven cloth.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 9, SPI: 6 }, sellValue: 38,
  },
  ashwoven_gloves: {
    id: 'ashwoven_gloves', name: 'Ashwoven Gloves', type: 'equipment',
    description: 'Gloves cut from ashwoven cloth, still faintly warm.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 7, SPI: 4 }, sellValue: 34,
  },
  ashwoven_cap: {
    id: 'ashwoven_cap', name: 'Ashwoven Cap', type: 'equipment',
    description: 'A cap of ashwoven cloth, worn by those who work the ruins.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 9, SPI: 3 }, sellValue: 35,
  },
  ashwoven_boots: {
    id: 'ashwoven_boots', name: 'Ashwoven Boots', type: 'equipment',
    description: 'Boots woven from salvaged ashwoven cloth, soft-footed in the ruins.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 37,
  },
  scavenged_hatchet: {
    id: 'scavenged_hatchet', name: 'Scavenged Hatchet', type: 'equipment',
    description: "A cinder scavenger's own hatchet, still sharp despite its owner's fate.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 9 }, sellValue: 40,
  },
  scavenged_focus: {
    id: 'scavenged_focus', name: 'Scavenged Focus', type: 'equipment',
    description: "A cracked focusing crystal pried from the same scavenger's hoard as the Scavenged Hatchet.",
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 9 }, sellValue: 40,
  },
  overseers_greatmace: {
    id: 'overseers_greatmace', name: "Overseer's Greatmace", type: 'equipment',
    description: 'The ceremonial mace of the Ashen Overseer — too heavy for most, and twice as deadly.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 14, STA: 4 }, sellValue: 80,
  },
  overseers_band: {
    id: 'overseers_band', name: "Overseer's Band", type: 'equipment',
    description: 'A plain ash-blackened ring the Overseer wore under its gauntlet — solid, and built to outlast whoever wears it.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 8 }, sellValue: 60,
  },
  emberpetal_tonic: {
    id: 'emberpetal_tonic', name: 'Emberpetal Tonic', type: 'consumable',
    description: 'A potent brew of emberpetal. Restores 150 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 8,
    consumableEffect: { healAmount: 150, cooldownSeconds: 25 },
  },

  // ── The Molten Scar materials ─────────────────────────────────────────
  thorium_ore: {
    id: 'thorium_ore', name: 'Thorium Ore', type: 'material',
    description: 'A dense, faintly warm ore that never fully cools, mined from the rift itself.',
    stackable: true, sellValue: 5,
  },
  cinderbloom: {
    id: 'cinderbloom', name: 'Cinderbloom', type: 'material',
    description: 'A rare flower that only grows in the heat radiating from the rift.',
    stackable: true, sellValue: 4,
  },
  scaleback_hide: {
    id: 'scaleback_hide', name: 'Scaleback Hide', type: 'material',
    description: 'Thick, overlapping scaled hide from a beast that calls the rift home.',
    stackable: true, sellValue: 5,
  },
  thorium_bar: {
    id: 'thorium_bar', name: 'Thorium Bar', type: 'material',
    description: 'Thorium ore smelted into a bar that radiates heat long after cooling.',
    stackable: true, sellValue: 11,
  },
  scaleback_leather: {
    id: 'scaleback_leather', name: 'Scaleback Leather', type: 'material',
    description: 'Scaleback hide worked into leather that shrugs off both blade and flame.',
    stackable: true, sellValue: 6,
  },
  charred_cloth: {
    id: 'charred_cloth', name: 'Charred Cloth', type: 'material',
    description: 'Cultist robes, scorched but salvageable.',
    stackable: true, sellValue: 6,
  },
  magma_heart: {
    id: 'magma_heart', name: 'Magma Heart', type: 'material',
    description: 'A core of solidified magma that still pulses with faint heat, prized by craftsmen.',
    stackable: true, sellValue: 22,
  },
  fire_opal: {
    id: 'fire_opal', name: 'Fire Opal', type: 'material',
    description: 'A gemstone that seems to hold a flame within it.',
    stackable: true, sellValue: 25,
  },

  // ── The Molten Scar equipment ─────────────────────────────────────────
  scaleback_leggings: {
    id: 'scaleback_leggings', name: 'Scaleback Leggings', type: 'equipment',
    description: 'Leggings worked from scaleback leather.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 10, STR: 6 }, sellValue: 48,
  },
  scaleback_boots: {
    id: 'scaleback_boots', name: 'Scaleback Boots', type: 'equipment',
    description: 'Boots set with a magma heart, warm and unyielding.',
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 9, STR: 9 }, sellValue: 62,
  },
  scaleback_gloves: {
    id: 'scaleback_gloves', name: 'Scaleback Gloves', type: 'equipment',
    description: 'Gloves worked from scaleback leather, tough enough to grip a blade fresh from the forge.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 8, STR: 6 }, sellValue: 46,
  },
  scaleback_cap: {
    id: 'scaleback_cap', name: 'Scaleback Cap', type: 'equipment',
    description: 'A heavy cap of scaleback leather, molded to shrug off both blade and flame.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 12 }, sellValue: 42,
  },
  charred_robe: {
    id: 'charred_robe', name: 'Charred Robe', type: 'equipment',
    description: 'A cultist robe, reclaimed and re-stitched from salvaged charred cloth.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 9, SPI: 6 }, sellValue: 44,
  },
  charred_leggings: {
    id: 'charred_leggings', name: 'Charred Leggings', type: 'equipment',
    description: 'Cultist leggings, reclaimed and re-stitched from salvaged charred cloth.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 11, SPI: 7 }, sellValue: 46,
  },
  charred_gloves: {
    id: 'charred_gloves', name: 'Charred Gloves', type: 'equipment',
    description: 'Cultist gloves, still smelling faintly of brimstone.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 9, SPI: 5 }, sellValue: 42,
  },
  charred_cap: {
    id: 'charred_cap', name: 'Charred Cap', type: 'equipment',
    description: "A cultist's hood, reclaimed from the rift's edge.",
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 11, SPI: 4 }, sellValue: 43,
  },
  charred_boots: {
    id: 'charred_boots', name: 'Charred Boots', type: 'equipment',
    description: 'Cultist boots, re-stitched from salvaged charred cloth.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 10, SPI: 7 }, sellValue: 45,
  },
  zealots_blade: {
    id: 'zealots_blade', name: "Zealot's Blade", type: 'equipment',
    description: 'A ritual blade carried by a cultist zealot, its edge blessed by something best left unnamed.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 11 }, sellValue: 50,
  },
  zealots_icon: {
    id: 'zealots_icon', name: "Zealot's Icon", type: 'equipment',
    description: 'A cult icon carried by the same zealot who wields the Zealot’s Blade, warm to the touch.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 11 }, sellValue: 50,
  },
  heralds_ember_band: {
    id: 'heralds_ember_band', name: "Herald's Ember Band", type: 'equipment',
    description: 'A ring taken from the Molten Herald, still warm as a living coal.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 12, STA: 3 }, sellValue: 95,
  },
  magma_forged_band: {
    id: 'magma_forged_band', name: 'Magma-Forged Band', type: 'equipment',
    description: "A heavy band melted and reset around a magma hound's collar — the metal never fully cooled.",
    stackable: true, equipSlot: 'ring', statBonuses: { STR: 12, STA: 3 }, sellValue: 95,
  },
  cinderbloom_elixir: {
    id: 'cinderbloom_elixir', name: 'Cinderbloom Elixir', type: 'consumable',
    description: 'A powerful brew of cinderbloom. Restores 200 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 10,
    consumableEffect: { healAmount: 200, cooldownSeconds: 25 },
  },

  // ── Cinderheart Crater materials ──────────────────────────────────────
  obsidian_ore: {
    id: 'obsidian_ore', name: 'Obsidian Ore', type: 'material',
    description: 'A jagged, glassy-black ore, mined at the very edge of the crater.',
    stackable: true, sellValue: 6,
  },
  platinum_ore: {
    id: 'platinum_ore', name: 'Platinum Ore', type: 'material',
    description: 'A rare, silvery-white ore mined from a Platinum Vein.',
    stackable: true, sellValue: 8,
  },
  emberheart_bloom: {
    id: 'emberheart_bloom', name: 'Emberheart Bloom', type: 'material',
    description: 'A flower that blooms only at the crater’s rim, pulsing faintly like a heartbeat.',
    stackable: true, sellValue: 5,
  },
  emberscale_hide: {
    id: 'emberscale_hide', name: 'Emberscale Hide', type: 'material',
    description: 'Hide from a beast that has lived its whole life at the crater’s edge.',
    stackable: true, sellValue: 6,
  },
  obsidian_bar: {
    id: 'obsidian_bar', name: 'Obsidian Bar', type: 'material',
    description: 'Obsidian ore smelted at incredible heat into a dense, glassy-black bar.',
    stackable: true, sellValue: 13,
  },
  platinum_bar: {
    id: 'platinum_bar', name: 'Platinum Bar', type: 'material',
    description: 'Rare platinum ore smelted into a dense, silvery-white bar.',
    stackable: true, sellValue: 14,
  },
  emberscale_leather: {
    id: 'emberscale_leather', name: 'Emberscale Leather', type: 'material',
    description: 'Emberscale hide worked into the toughest leather yet crafted.',
    stackable: true, sellValue: 7,
  },
  ashenweave_cloth: {
    id: 'ashenweave_cloth', name: 'Ashenweave Cloth', type: 'material',
    description: 'Cloth woven with fine ash, taken from the crater’s most fervent cultists.',
    stackable: true, sellValue: 7,
  },
  emberlords_ash: {
    id: 'emberlords_ash', name: "Emberlord's Ash", type: 'material',
    description: 'Ash gathered at the very edge of the crater, said to still carry a fraction of the sleeping power below.',
    stackable: true, sellValue: 26,
  },
  heartflame_crystal: {
    id: 'heartflame_crystal', name: 'Heartflame Crystal', type: 'material',
    description: 'A crystal that burns with an inner flame, never dimming and never spreading.',
    stackable: true, sellValue: 30,
  },

  // ── Cinderheart Crater equipment ──────────────────────────────────────
  emberscale_leggings: {
    id: 'emberscale_leggings', name: 'Emberscale Leggings', type: 'equipment',
    description: 'Leggings worked from emberscale leather, the toughest hide known.',
    stackable: true, equipSlot: 'legs', armorType: 'leather', statBonuses: { STA: 12, STR: 7 }, sellValue: 58,
  },
  emberscale_boots: {
    id: 'emberscale_boots', name: 'Emberscale Boots', type: 'equipment',
    description: "Boots set with a fragment of the Emberlord's own ash.",
    stackable: true, equipSlot: 'boots', armorType: 'leather', statBonuses: { STA: 11, STR: 11 }, sellValue: 75,
  },
  emberscale_gloves: {
    id: 'emberscale_gloves', name: 'Emberscale Gloves', type: 'equipment',
    description: 'Gloves worked from the toughest leather known, fit for the crater’s edge.',
    stackable: true, equipSlot: 'gloves', armorType: 'leather', statBonuses: { STA: 10, STR: 8 }, sellValue: 55,
  },
  emberscale_cap: {
    id: 'emberscale_cap', name: 'Emberscale Cap', type: 'equipment',
    description: 'A crown of emberscale leather, worn by those who’ve stared into the crater and lived.',
    stackable: true, equipSlot: 'helmet', armorType: 'leather', statBonuses: { STA: 15 }, sellValue: 50,
  },
  ashenweave_robe: {
    id: 'ashenweave_robe', name: 'Ashenweave Robe', type: 'equipment',
    description: 'A robe woven from the finest ashenweave cloth, taken from the crater’s most devout.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 11, SPI: 7 }, sellValue: 52,
  },
  ashenweave_leggings: {
    id: 'ashenweave_leggings', name: 'Ashenweave Leggings', type: 'equipment',
    description: 'Leggings woven from the finest ashenweave cloth, taken from the crater’s most devout.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 13, SPI: 8 }, sellValue: 55,
  },
  ashenweave_gloves: {
    id: 'ashenweave_gloves', name: 'Ashenweave Gloves', type: 'equipment',
    description: 'Gloves of the finest ashenweave cloth, still warm from the crater’s edge.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 11, SPI: 6 }, sellValue: 50,
  },
  ashenweave_cap: {
    id: 'ashenweave_cap', name: 'Ashenweave Cap', type: 'equipment',
    description: 'A hood of ashenweave cloth, worn by the crater’s most devoted.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 13, SPI: 5 }, sellValue: 51,
  },
  ashenweave_boots: {
    id: 'ashenweave_boots', name: 'Ashenweave Boots', type: 'equipment',
    description: 'Boots of the finest ashenweave cloth, taken from the crater’s most devout.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 12, SPI: 8 }, sellValue: 53,
  },
  harbingers_talon: {
    id: 'harbingers_talon', name: "Harbinger's Talon", type: 'equipment',
    description: "A curved blade shaped like the claw of the Ashfall Harbinger it was taken from.",
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 13 }, sellValue: 80,
  },
  harbingers_omen: {
    id: 'harbingers_omen', name: "Harbinger's Omen", type: 'equipment',
    description: 'A cracked oracle-bone carried by the Ashfall Harbinger, still whispering warnings of what’s waking below.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 13 }, sellValue: 80,
  },
  sentinels_signet: {
    id: 'sentinels_signet', name: "Sentinel's Signet", type: 'equipment',
    description: 'A heavy signet ring pried from a fallen Emberguard Sentinel.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 10 }, sellValue: 85,
  },
  emberheart_potion: {
    id: 'emberheart_potion', name: 'Emberheart Potion', type: 'consumable',
    description: 'The strongest healing brew yet devised. Restores 260 health. Usable anywhere, once every 25 seconds.',
    stackable: true, sellValue: 14,
    consumableEffect: { healAmount: 260, cooldownSeconds: 25 },
  },

  // ── Cinderheart Sanctum dungeon boss drop ─────────────────────────────
  pyraxis_warblade: {
    id: 'pyraxis_warblade', name: "Pyraxis's Warblade", type: 'equipment',
    description: 'The warblade of Pyraxis, Warden of the Cinderheart — forged in fire older than the world above.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 18, STA: 5 }, sellValue: 140,
  },

  // ── Damaged dungeon boss drops — unequippable (no equipSlot) until a
  // Blacksmith repairs them into the real item above. See recipes.ts's
  // "Repairs" section and monsters.ts's ashen_overseer/pyraxis lootTables,
  // which drop these instead of the finished item directly.
  overseers_greatmace_damaged: {
    id: 'overseers_greatmace_damaged', name: "Overseer's Greatmace (Damaged)", type: 'material',
    description: 'The Overseer’s greatmace, cracked and ash-choked from the fight that won it. A skilled Blacksmith could restore it.',
    stackable: true, repairsIntoItemId: 'overseers_greatmace', sellValue: 20,
  },
  pyraxis_warblade_damaged: {
    id: 'pyraxis_warblade_damaged', name: "Pyraxis's Warblade (Damaged)", type: 'material',
    description: 'Pyraxis’s warblade, its edge shattered and its fire gone cold. Only an Artisan Blacksmith could reforge it.',
    stackable: true, repairsIntoItemId: 'pyraxis_warblade', sellValue: 35,
  },

  // ── Profession tools — equipSlot 'tool', one tier per zone, sold by each
  // zone's vendor. gatherBonusPct is deliberately modest (see the design
  // brief: "do not allow tools to become an enormous source of power").
  rusty_mining_pick: {
    id: 'rusty_mining_pick', name: 'Rusty Mining Pick', type: 'equipment',
    description: 'A basic mining pick, nicked and pitted but serviceable.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 0, sellValue: 2,
  },
  sturdy_mining_pick: {
    id: 'sturdy_mining_pick', name: 'Sturdy Mining Pick', type: 'equipment',
    description: 'A well-balanced pick that bites deeper with less effort.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 2, sellValue: 8,
  },
  embertempered_pick: {
    id: 'embertempered_pick', name: 'Ember-Tempered Pick', type: 'equipment',
    description: 'Quenched in Emberfall’s heat, its head barely dulls.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 4, sellValue: 18,
  },
  dwarven_mining_pick: {
    id: 'dwarven_mining_pick', name: 'Dwarven Mining Pick', type: 'equipment',
    description: 'Dwarven-forged and perfectly weighted, recovered from Cinderfall’s ruined forges.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 6, sellValue: 35,
  },
  brimstone_pick: {
    id: 'brimstone_pick', name: 'Brimstone Pick', type: 'equipment',
    description: 'Its head is cast from cooled brimstone, hard enough to crack any seam in the Scar.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 8, sellValue: 60,
  },
  emberforged_pick: {
    id: 'emberforged_pick', name: 'Emberforged Pick', type: 'equipment',
    description: 'Forged at the world’s molten heart — the finest mining pick there is.',
    stackable: true, equipSlot: 'tool', toolType: 'mining_pick', gatherBonusPct: 10, sellValue: 95,
  },

  worn_skinning_knife: {
    id: 'worn_skinning_knife', name: 'Worn Skinning Knife', type: 'equipment',
    description: 'A basic skinning knife with a dull but functional edge.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 0, sellValue: 2,
  },
  honed_skinning_knife: {
    id: 'honed_skinning_knife', name: 'Honed Skinning Knife', type: 'equipment',
    description: 'Freshly honed, it parts hide cleanly from flesh.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 2, sellValue: 8,
  },
  embertempered_skinning_knife: {
    id: 'embertempered_skinning_knife', name: 'Ember-Tempered Skinning Knife', type: 'equipment',
    description: 'Tempered in Emberfall’s forges, it holds an edge far longer.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 4, sellValue: 18,
  },
  dwarven_skinning_knife: {
    id: 'dwarven_skinning_knife', name: 'Dwarven Skinning Knife', type: 'equipment',
    description: 'A dwarven blade recovered from Cinderfall, still razor-true.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 6, sellValue: 35,
  },
  brimstone_skinning_knife: {
    id: 'brimstone_skinning_knife', name: 'Brimstone Skinning Knife', type: 'equipment',
    description: 'Its blade is quenched brimstone-black and never seems to dull.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 8, sellValue: 60,
  },
  emberforged_skinning_knife: {
    id: 'emberforged_skinning_knife', name: 'Emberforged Skinning Knife', type: 'equipment',
    description: 'Forged at the world’s molten heart — the finest skinning knife there is.',
    stackable: true, equipSlot: 'tool', toolType: 'skinning_knife', gatherBonusPct: 10, sellValue: 95,
  },

  simple_fishing_rod: {
    id: 'simple_fishing_rod', name: 'Simple Fishing Rod', type: 'equipment',
    description: 'A plain rod cut from a sapling branch — good enough to start.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 0, sellValue: 2,
  },
  reinforced_fishing_rod: {
    id: 'reinforced_fishing_rod', name: 'Reinforced Fishing Rod', type: 'equipment',
    description: 'Reinforced with wire-wrapped joints for a sturdier cast.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 2, sellValue: 8,
  },
  embercured_fishing_rod: {
    id: 'embercured_fishing_rod', name: 'Ember-Cured Fishing Rod', type: 'equipment',
    description: 'Cured over Emberfall’s fissures until the wood turned iron-hard.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 4, sellValue: 18,
  },
  dwarven_fishing_rod: {
    id: 'dwarven_fishing_rod', name: 'Dwarven Fishing Rod', type: 'equipment',
    description: 'A dwarven angler’s rod, recovered intact from Cinderfall’s flooded lower halls.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 6, sellValue: 35,
  },
  brimstone_fishing_rod: {
    id: 'brimstone_fishing_rod', name: 'Brimstone Fishing Rod', type: 'equipment',
    description: 'Its line is woven from heat-cured brimstone fiber, strong enough for anything the Scar’s pools hold.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 8, sellValue: 60,
  },
  emberforged_fishing_rod: {
    id: 'emberforged_fishing_rod', name: 'Emberforged Fishing Rod', type: 'equipment',
    description: 'Forged at the world’s molten heart — the finest fishing rod there is.',
    stackable: true, equipSlot: 'tool', toolType: 'fishing_rod', gatherBonusPct: 10, sellValue: 95,
  },

  // ── Fish (legacy) — Fishing's original single-fish-per-zone yield, frozen
  // in place and still catchable from each zone's original fishing hole.
  // Superseded by the full targeted-fishing catalog below.
  brook_trout: {
    id: 'brook_trout', name: 'Brook Trout', type: 'material',
    description: 'A common trout pulled from Greenhollow’s streams.',
    stackable: true, sellValue: 2,
  },
  mountain_char: {
    id: 'mountain_char', name: 'Mountain Char', type: 'material',
    description: 'A cold-water fish from Stonecrag’s highland pools.',
    stackable: true, sellValue: 4,
  },
  ember_eel: {
    id: 'ember_eel', name: 'Ember Eel', type: 'material',
    description: 'An eel that thrives in Emberfall’s heat-warmed waters.',
    stackable: true, sellValue: 7,
  },
  ashfin_carp: {
    id: 'ashfin_carp', name: 'Ashfin Carp', type: 'material',
    description: 'A pale carp found in Cinderfall’s flooded depths.',
    stackable: true, sellValue: 10,
  },
  magma_darter: {
    id: 'magma_darter', name: 'Magma Darter', type: 'material',
    description: 'A quick, heat-blooded fish that darts through the Scar’s cooler pools.',
    stackable: true, sellValue: 14,
  },
  emberheart_koi: {
    id: 'emberheart_koi', name: 'Emberheart Koi', type: 'material',
    description: 'A striking, ember-scaled koi found only at the world’s molten heart.',
    stackable: true, sellValue: 20,
  },

  // ── Fishing — targeted catches across the six real zones. Each zone's
  // fish share a zone-exclusive rare Pearl (fixed-chance catch bonus, see
  // FISHING_HOLES rareBonus), which Cooking and other professions prize.
  // Greenhollow Fields
  brilliant_smallfish: {
    id: 'brilliant_smallfish', name: 'Brilliant Smallfish', type: 'material',
    description: 'A catch from the gentle streams of Greenhollow Fields.',
    stackable: true, sellValue: 2,
  },
  longjaw_mud_snapper: {
    id: 'longjaw_mud_snapper', name: 'Longjaw Mud Snapper', type: 'material',
    description: 'A catch from the gentle streams of Greenhollow Fields.',
    stackable: true, sellValue: 3,
  },
  slitherskin_mackerel: {
    id: 'slitherskin_mackerel', name: 'Slitherskin Mackerel', type: 'material',
    description: 'A catch from the gentle streams of Greenhollow Fields.',
    stackable: true, sellValue: 4,
  },
  // Stonecrag Foothills
  bristle_whisker_catfish: {
    id: 'bristle_whisker_catfish', name: 'Bristle Whisker Catfish', type: 'material',
    description: 'A catch from the rivers and marshes of Stonecrag Foothills.',
    stackable: true, sellValue: 4,
  },
  rainbow_fin_albacore: {
    id: 'rainbow_fin_albacore', name: 'Rainbow Fin Albacore', type: 'material',
    description: 'A catch from the rivers and marshes of Stonecrag Foothills.',
    stackable: true, sellValue: 5,
  },
  sagefish: {
    id: 'sagefish', name: 'Sagefish', type: 'material',
    description: 'A catch from the rivers and marshes of Stonecrag Foothills.',
    stackable: true, sellValue: 6,
  },
  oily_blackmouth: {
    id: 'oily_blackmouth', name: 'Oily Blackmouth', type: 'material',
    description: 'A catch from the rivers and marshes of Stonecrag Foothills.',
    stackable: true, sellValue: 7,
  },
  // Emberfall Ridge
  mithril_head_trout: {
    id: 'mithril_head_trout', name: 'Mithril Head Trout', type: 'material',
    description: 'A catch from the deep waters of Emberfall Ridge.',
    stackable: true, sellValue: 7,
  },
  rockscale_cod: {
    id: 'rockscale_cod', name: 'Rockscale Cod', type: 'material',
    description: 'A catch from the deep waters of Emberfall Ridge.',
    stackable: true, sellValue: 8,
  },
  greater_sagefish: {
    id: 'greater_sagefish', name: 'Greater Sagefish', type: 'material',
    description: 'A catch from the deep waters of Emberfall Ridge.',
    stackable: true, sellValue: 9,
  },
  firefin_snapper: {
    id: 'firefin_snapper', name: 'Firefin Snapper', type: 'material',
    description: 'A catch from the deep waters of Emberfall Ridge.',
    stackable: true, sellValue: 10,
  },
  // Cinderfall Depths
  redgill: {
    id: 'redgill', name: 'Redgill', type: 'material',
    description: 'A catch from the ancient waters of Cinderfall Depths.',
    stackable: true, sellValue: 10,
  },
  nightfin_snapper: {
    id: 'nightfin_snapper', name: 'Nightfin Snapper', type: 'material',
    description: 'A catch from the ancient waters of Cinderfall Depths.',
    stackable: true, sellValue: 11,
  },
  sunscale_salmon: {
    id: 'sunscale_salmon', name: 'Sunscale Salmon', type: 'material',
    description: 'A catch from the ancient waters of Cinderfall Depths.',
    stackable: true, sellValue: 13,
  },
  spotted_yellowtail: {
    id: 'spotted_yellowtail', name: 'Spotted Yellowtail', type: 'material',
    description: 'A catch from the ancient waters of Cinderfall Depths.',
    stackable: true, sellValue: 14,
  },
  // The Molten Scar
  stonescale_eel: {
    id: 'stonescale_eel', name: 'Stonescale Eel', type: 'material',
    description: 'A catch from the dangerous waters of The Molten Scar.',
    stackable: true, sellValue: 14,
  },
  glossy_mightfish: {
    id: 'glossy_mightfish', name: 'Glossy Mightfish', type: 'material',
    description: 'A catch from the dangerous waters of The Molten Scar.',
    stackable: true, sellValue: 16,
  },
  whitescale_salmon: {
    id: 'whitescale_salmon', name: 'Whitescale Salmon', type: 'material',
    description: 'A catch from the dangerous waters of The Molten Scar.',
    stackable: true, sellValue: 18,
  },
  darkclaw_lobster: {
    id: 'darkclaw_lobster', name: 'Darkclaw Lobster', type: 'material',
    description: 'A catch from the dangerous waters of The Molten Scar.',
    stackable: true, sellValue: 20,
  },
  // Cinderheart Crater
  emberfin_snapper: {
    id: 'emberfin_snapper', name: 'Emberfin Snapper', type: 'material',
    description: 'A catch from the ember-warmed waters of Cinderheart Crater.',
    stackable: true, sellValue: 20,
  },
  magmascale_eel: {
    id: 'magmascale_eel', name: 'Magmascale Eel', type: 'material',
    description: 'A catch from the ember-warmed waters of Cinderheart Crater.',
    stackable: true, sellValue: 21,
  },
  ashen_salmon: {
    id: 'ashen_salmon', name: 'Ashen Salmon', type: 'material',
    description: 'A catch from the ember-warmed waters of Cinderheart Crater.',
    stackable: true, sellValue: 22,
  },
  molten_lobster: {
    id: 'molten_lobster', name: 'Molten Lobster', type: 'material',
    description: 'A catch from the ember-warmed waters of Cinderheart Crater.',
    stackable: true, sellValue: 23,
  },

  // ── Zone pearls — a fixed 3% per-catch rare bonus from any fishing hole
  // in that zone, independent of mastery/level/speed. Shared crafting
  // materials across professions (not auto-consumed by any recipe).
  freshwater_pearl: {
    id: 'freshwater_pearl', name: 'Freshwater Pearl', type: 'material',
    description: 'A rare, lustrous pearl found only in the waters of Greenhollow Fields.',
    stackable: true, sellValue: 15,
  },
  river_pearl: {
    id: 'river_pearl', name: 'River Pearl', type: 'material',
    description: 'A rare, lustrous pearl found only in the waters of Stonecrag Foothills.',
    stackable: true, sellValue: 28,
  },
  deepwater_pearl: {
    id: 'deepwater_pearl', name: 'Deepwater Pearl', type: 'material',
    description: 'A rare, lustrous pearl found only in the waters of Emberfall Ridge.',
    stackable: true, sellValue: 45,
  },
  moonlit_pearl: {
    id: 'moonlit_pearl', name: 'Moonlit Pearl', type: 'material',
    description: 'A rare, lustrous pearl found only in the waters of Cinderfall Depths.',
    stackable: true, sellValue: 65,
  },
  prismatic_pearl: {
    id: 'prismatic_pearl', name: 'Prismatic Pearl', type: 'material',
    description: 'A rare, lustrous pearl found only in the waters of The Molten Scar.',
    stackable: true, sellValue: 90,
  },
  ember_pearl: {
    id: 'ember_pearl', name: 'Ember Pearl', type: 'material',
    description: 'A rare, lustrous pearl found only in the waters of Cinderheart Crater.',
    stackable: true, sellValue: 120,
  },

  // ── Cooking's non-fish ingredients — monster drops (boar_meat/raw_meat
  // above already cover Greenhollow/Stonecrag/Emberfall; these fill in the
  // three upper zones, which previously dropped nothing food-related at
  // all) and two Seasoning tiers, so Cooking draws from combat across the
  // whole level range, not just Fishing. See monsters.ts for which creature
  // drops which.
  scavenger_meat: {
    id: 'scavenger_meat', name: 'Scavenger Meat', type: 'material',
    description: 'Tough meat scavenged by Cinderfall’s ash-scavengers.',
    stackable: true, sellValue: 2,
  },
  hound_meat: {
    id: 'hound_meat', name: 'Magma Hound Meat', type: 'material',
    description: 'Fire-toughened meat from a magma hound.',
    stackable: true, sellValue: 3,
  },
  drake_meat: {
    id: 'drake_meat', name: 'Scaleback Drake Meat', type: 'material',
    description: 'Rich, marbled meat from a scaleback drake.',
    stackable: true, sellValue: 4,
  },
  behemoth_flank: {
    id: 'behemoth_flank', name: 'Charhide Behemoth Flank', type: 'material',
    description: 'A heavy cut of flank from a charhide behemoth — enough to feed a crowd.',
    stackable: true, sellValue: 6,
  },
  pyraxis_flank: {
    id: 'pyraxis_flank', name: 'Pyraxis Flank', type: 'material',
    description: 'A rare cut of drake meat, still warm with Pyraxis’s inner fire.',
    stackable: true, sellValue: 15,
  },
  common_seasoning: {
    id: 'common_seasoning', name: 'Common Seasoning', type: 'material',
    description: 'A basic blend of salt and dried herbs, carried by Emberfall’s marauders.',
    stackable: true, sellValue: 2,
  },
  rare_seasoning: {
    id: 'rare_seasoning', name: 'Rare Seasoning', type: 'material',
    description: 'A potent blend of exotic spices, found only on Cinderheart’s most dangerous foes.',
    stackable: true, sellValue: 8,
  },

  // ── Enchanting materials — produced by Disenchanting (see
  // gameData/enchanting.ts's ZONE_DISENCHANT_MATERIALS), consumed by
  // enchant-scroll recipes (recipes.ts). Names follow the Enchanting
  // overhaul's own Classic-WoW-derived material table exactly (Strange
  // Dust/Magic Essence through Illusion Dust/Eternal Essence for zones
  // 1-5, Ember Shards for zone 6) rather than this file's earlier,
  // differently-named first draft. A shard tier (Brilliant Shard) only
  // exists at zone 5 — the design brief's own recipe catalog never
  // references a shard before then; zone 6 skips a dust/essence of its
  // own for CRAFTING (its recipes reuse zone 5's Greater Eternal Essence,
  // see enchanting.ts's "E6" convention) but still gets its own Ember
  // Dust/Ember Essence here for DISENCHANTING yield purposes only, per
  // the brief's "Ember Shards and appropriate high-tier materials."
  strange_dust: {
    id: 'strange_dust', name: 'Strange Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser Greenhollow Fields equipment.',
    stackable: true, sellValue: 3,
  },
  lesser_magic_essence: {
    id: 'lesser_magic_essence', name: 'Lesser Magic Essence', type: 'material',
    description: 'A condensed mote of magical residue, disenchanted from ordinary Greenhollow Fields equipment.',
    stackable: true, sellValue: 9,
  },
  greater_magic_essence: {
    id: 'greater_magic_essence', name: 'Greater Magic Essence', type: 'material',
    description: 'A potent mote of magical residue, disenchanted only from Greenhollow Fields’ finest equipment.',
    stackable: true, sellValue: 16,
  },
  soul_dust: {
    id: 'soul_dust', name: 'Soul Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser Stonecrag Foothills equipment.',
    stackable: true, sellValue: 5,
  },
  lesser_astral_essence: {
    id: 'lesser_astral_essence', name: 'Lesser Astral Essence', type: 'material',
    description: 'A condensed mote of magical residue, disenchanted from ordinary Stonecrag Foothills equipment.',
    stackable: true, sellValue: 13,
  },
  greater_astral_essence: {
    id: 'greater_astral_essence', name: 'Greater Astral Essence', type: 'material',
    description: 'A potent mote of magical residue, disenchanted only from Stonecrag Foothills’ finest equipment.',
    stackable: true, sellValue: 22,
  },
  vision_dust: {
    id: 'vision_dust', name: 'Vision Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser Emberfall Ridge equipment.',
    stackable: true, sellValue: 7,
  },
  lesser_mystic_essence: {
    id: 'lesser_mystic_essence', name: 'Lesser Mystic Essence', type: 'material',
    description: 'A condensed mote of magical residue, disenchanted from ordinary Emberfall Ridge equipment.',
    stackable: true, sellValue: 18,
  },
  greater_mystic_essence: {
    id: 'greater_mystic_essence', name: 'Greater Mystic Essence', type: 'material',
    description: 'A potent mote of magical residue, disenchanted only from Emberfall Ridge’s finest equipment.',
    stackable: true, sellValue: 30,
  },
  dream_dust: {
    id: 'dream_dust', name: 'Dream Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser Cinderfall Depths equipment.',
    stackable: true, sellValue: 10,
  },
  lesser_nether_essence: {
    id: 'lesser_nether_essence', name: 'Lesser Nether Essence', type: 'material',
    description: 'A condensed mote of magical residue, disenchanted from ordinary Cinderfall Depths equipment.',
    stackable: true, sellValue: 24,
  },
  greater_nether_essence: {
    id: 'greater_nether_essence', name: 'Greater Nether Essence', type: 'material',
    description: 'A potent mote of magical residue, disenchanted only from Cinderfall Depths’ finest equipment.',
    stackable: true, sellValue: 40,
  },
  illusion_dust: {
    id: 'illusion_dust', name: 'Illusion Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser Molten Scar equipment.',
    stackable: true, sellValue: 14,
  },
  lesser_eternal_essence: {
    id: 'lesser_eternal_essence', name: 'Lesser Eternal Essence', type: 'material',
    description: 'A condensed mote of magical residue, disenchanted from ordinary Molten Scar equipment.',
    stackable: true, sellValue: 32,
  },
  greater_eternal_essence: {
    id: 'greater_eternal_essence', name: 'Greater Eternal Essence', type: 'material',
    description: 'A potent mote of magical residue, disenchanted only from the Molten Scar’s finest equipment.',
    stackable: true, sellValue: 52,
  },
  brilliant_shard: {
    id: 'brilliant_shard', name: 'Brilliant Shard', type: 'material',
    description: 'A hardened shard of enchanting power, disenchanted only from the Molten Scar’s rarest equipment.',
    stackable: true, sellValue: 60,
  },
  ember_dust: {
    id: 'ember_dust', name: 'Ember Dust', type: 'material',
    description: 'A fine, faintly glowing dust left over from disenchanting lesser Cinderheart Crater equipment.',
    stackable: true, sellValue: 20,
  },
  ember_essence: {
    id: 'ember_essence', name: 'Ember Essence', type: 'material',
    description: 'A blazing mote of magical residue, disenchanted from Cinderheart Crater equipment.',
    stackable: true, sellValue: 48,
  },
  ember_shards: {
    id: 'ember_shards', name: 'Ember Shards', type: 'material',
    description: 'Searing fragments of enchanting power, disenchanted only from Cinderheart Crater’s rarest equipment.',
    stackable: true, sellValue: 75,
  },

  // ── Enchanting overhaul's magic Wood — vendor-only (see vendors.ts),
  // NEVER monster-dropped and with no Woodcutting profession gathering it
  // (per the design brief), one tier per zone. Feeds the combined Wand/
  // Staff/Book equipment-Mastery track for that zone (gameData/materials.ts's
  // WOOD_MATERIALS) the same way a cloth tier feeds Tailoring's armor+cape
  // Mastery — see recipes.ts's matching section.
  simple_wood: {
    id: 'simple_wood', name: 'Simple Wood', type: 'material',
    description: 'A plain, enchanter-grade timber, faintly receptive to magic. Sold by vendors, never found in the wild.',
    stackable: true, sellValue: 1,
  },
  star_wood: {
    id: 'star_wood', name: 'Star Wood', type: 'material',
    description: 'Timber seasoned until it holds a charge far better than anything freshly cut. Sold by vendors, never found in the wild.',
    stackable: true, sellValue: 4,
  },
  mystic_wood: {
    id: 'mystic_wood', name: 'Mystic Wood', type: 'material',
    description: 'Cut from the dense core of an old trunk, humming faintly even before it’s enchanted. Sold by vendors, never found in the wild.',
    stackable: true, sellValue: 8,
  },
  enchanted_hardwood: {
    id: 'enchanted_hardwood', name: 'Enchanted Hardwood', type: 'material',
    description: 'A timber as dense as its namesake metal, able to hold a far stronger enchantment. Sold by vendors, never found in the wild.',
    stackable: true, sellValue: 14,
  },
  ancient_runewood: {
    id: 'ancient_runewood', name: 'Ancient Runewood', type: 'material',
    description: 'Timber cured near open flame until it’s nearly as hot to the touch as it is magically receptive. Sold by vendors, never found in the wild.',
    stackable: true, sellValue: 22,
  },
  emberheart_wood: {
    id: 'emberheart_wood', name: 'Emberheart Wood', type: 'material',
    description: 'Timber that smolders faintly of its own accord, the finest focus an Enchanter can work with. Sold by vendors, never found in the wild.',
    stackable: true, sellValue: 32,
  },

  // ── Enchanting overhaul's Wand/Staff/Book equipment — 6 zones x 3 types,
  // all using the EXISTING randomized-2-stat system (equipmentRolls.ts),
  // same as Blacksmithing/Leatherworking/Tailoring's armor. Wand and Staff
  // both occupy the 'weapon' slot (this engine enforces no 1h/2h exclusivity
  // — see types.ts's EquipmentSlot comment); Staff's stat budget is roughly
  // double Wand's "to compensate for 2 slots" per the design brief, even
  // though nothing here mechanically reserves a second slot for it. Book
  // occupies 'offhand' as Enchanting's answer to a shield, and additionally
  // consumes that zone's cloth tier as a crafting ingredient (recipes.ts) —
  // the cloth itself contributes no Mastery here (only the recipe's own
  // materialId, the zone's Wood, does).
  rough_wand: {
    id: 'rough_wand', name: 'Rough Wand', type: 'equipment',
    description: 'A plain Rough Wood wand, freshly carved and enchanted.',
    stackable: true, equipSlot: 'weapon', sellValue: 5,
  },
  rough_staff: {
    id: 'rough_staff', name: 'Rough Staff', type: 'equipment',
    description: 'A plain Rough Wood staff, freshly carved and enchanted.',
    stackable: true, equipSlot: 'weapon', sellValue: 8,
  },
  rough_tome: {
    id: 'rough_tome', name: 'Rough Tome', type: 'equipment',
    description: 'A plain Rough Wood-bound tome, its linen cover freshly enchanted.',
    stackable: true, equipSlot: 'offhand', sellValue: 5,
  },
  aged_wand: {
    id: 'aged_wand', name: 'Aged Wand', type: 'equipment',
    description: 'A wand of seasoned Aged Wood, holding its enchantment far better than green timber.',
    stackable: true, equipSlot: 'weapon', sellValue: 9,
  },
  aged_staff: {
    id: 'aged_staff', name: 'Aged Staff', type: 'equipment',
    description: 'A staff of seasoned Aged Wood, holding its enchantment far better than green timber.',
    stackable: true, equipSlot: 'weapon', sellValue: 14,
  },
  aged_tome: {
    id: 'aged_tome', name: 'Aged Tome', type: 'equipment',
    description: 'An Aged Wood-bound tome, its wool cover enchanted to hold a stronger charge.',
    stackable: true, equipSlot: 'offhand', sellValue: 9,
  },
  heartwood_wand: {
    id: 'heartwood_wand', name: 'Heartwood Wand', type: 'equipment',
    description: 'A wand cut from dense Heartwood, humming even before the enchantment takes.',
    stackable: true, equipSlot: 'weapon', sellValue: 16,
  },
  heartwood_staff: {
    id: 'heartwood_staff', name: 'Heartwood Staff', type: 'equipment',
    description: 'A staff cut from dense Heartwood, humming even before the enchantment takes.',
    stackable: true, equipSlot: 'weapon', sellValue: 24,
  },
  heartwood_tome: {
    id: 'heartwood_tome', name: 'Heartwood Tome', type: 'equipment',
    description: 'A Heartwood-bound tome, its silk cover enchanted to hold a stronger charge.',
    stackable: true, equipSlot: 'offhand', sellValue: 16,
  },
  ironwood_wand: {
    id: 'ironwood_wand', name: 'Ironwood Wand', type: 'equipment',
    description: 'A wand of dense Ironwood, able to hold a far stronger enchantment than ordinary timber.',
    stackable: true, equipSlot: 'weapon', sellValue: 26,
  },
  ironwood_staff: {
    id: 'ironwood_staff', name: 'Ironwood Staff', type: 'equipment',
    description: 'A staff of dense Ironwood, able to hold a far stronger enchantment than ordinary timber.',
    stackable: true, equipSlot: 'weapon', sellValue: 38,
  },
  ironwood_tome: {
    id: 'ironwood_tome', name: 'Ironwood Tome', type: 'equipment',
    description: 'An Ironwood-bound tome, its mageweave cover enchanted to hold a stronger charge.',
    stackable: true, equipSlot: 'offhand', sellValue: 26,
  },
  charwood_wand: {
    id: 'charwood_wand', name: 'Charwood Wand', type: 'equipment',
    description: 'A wand of fire-cured Charwood, nearly as hot to the touch as it is magically receptive.',
    stackable: true, equipSlot: 'weapon', sellValue: 40,
  },
  charwood_staff: {
    id: 'charwood_staff', name: 'Charwood Staff', type: 'equipment',
    description: 'A staff of fire-cured Charwood, nearly as hot to the touch as it is magically receptive.',
    stackable: true, equipSlot: 'weapon', sellValue: 58,
  },
  charwood_tome: {
    id: 'charwood_tome', name: 'Charwood Tome', type: 'equipment',
    description: 'A Charwood-bound tome, its runecloth cover enchanted to hold a stronger charge.',
    stackable: true, equipSlot: 'offhand', sellValue: 40,
  },
  emberwood_wand: {
    id: 'emberwood_wand', name: 'Emberwood Wand', type: 'equipment',
    description: 'A wand of smoldering Emberwood, the finest focus an Enchanter can work with.',
    stackable: true, equipSlot: 'weapon', sellValue: 58,
  },
  emberwood_staff: {
    id: 'emberwood_staff', name: 'Emberwood Staff', type: 'equipment',
    description: 'A staff of smoldering Emberwood, the finest focus an Enchanter can work with.',
    stackable: true, equipSlot: 'weapon', sellValue: 84,
  },
  emberwood_tome: {
    id: 'emberwood_tome', name: 'Emberwood Tome', type: 'equipment',
    description: 'An Emberwood-bound tome, its ember cloth cover enchanted to hold the strongest charge an Enchanter can craft.',
    stackable: true, equipSlot: 'offhand', sellValue: 58,
  },

  // ── Enchanting scrolls — see gameData/enchanting.ts's module doc comment
  // and recipes.ts's matching section. The pre-catalog placeholder scrolls
  // (12 simple stat enchants) that stood in during Phases E1-E5 have been
  // removed wholesale and replaced by the full 6-zone catalog below (Phase
  // E6), per the design brief's complete enchantment recipe expansion.

  scroll_minor_health: {
    id: 'scroll_minor_health', name: 'Scroll: Minor Health', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Minor Health enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_health', sellValue: 3,
  },
  scroll_minor_mana: {
    id: 'scroll_minor_mana', name: 'Scroll: Minor Mana', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Minor Mana enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_mana', sellValue: 3,
  },
  scroll_minor_stamina: {
    id: 'scroll_minor_stamina', name: 'Scroll: Minor Stamina', type: 'enchant_scroll',
    description: 'Use on an equipped bracer item to apply the Minor Stamina enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_stamina', sellValue: 3,
  },
  scroll_minor_strength: {
    id: 'scroll_minor_strength', name: 'Scroll: Minor Strength', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Minor Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_strength', sellValue: 3,
  },
  scroll_minor_agility: {
    id: 'scroll_minor_agility', name: 'Scroll: Minor Agility', type: 'enchant_scroll',
    description: 'Use on an equipped boots item to apply the Minor Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_agility', sellValue: 3,
  },
  scroll_minor_intellect: {
    id: 'scroll_minor_intellect', name: 'Scroll: Minor Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Minor Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_intellect', sellValue: 3,
  },
  scroll_minor_spirit: {
    id: 'scroll_minor_spirit', name: 'Scroll: Minor Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Minor Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_spirit', sellValue: 3,
  },
  scroll_minor_defense: {
    id: 'scroll_minor_defense', name: 'Scroll: Minor Defense', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Minor Defense enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_defense', sellValue: 3,
  },
  scroll_minor_absorption: {
    id: 'scroll_minor_absorption', name: 'Scroll: Minor Absorption', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Minor Absorption enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_absorption', sellValue: 3,
  },
  scroll_minor_striking: {
    id: 'scroll_minor_striking', name: 'Scroll: Minor Striking', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Minor Striking enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_striking', sellValue: 3,
  },
  scroll_minor_impact: {
    id: 'scroll_minor_impact', name: 'Scroll: Minor Impact', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Minor Impact enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_impact', sellValue: 3,
  },
  scroll_minor_beastslayer: {
    id: 'scroll_minor_beastslayer', name: 'Scroll: Minor Beastslayer', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Minor Beastslayer enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_beastslayer', sellValue: 3,
  },
  scroll_lesser_health: {
    id: 'scroll_lesser_health', name: 'Scroll: Lesser Health', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Lesser Health enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_health', sellValue: 6,
  },
  scroll_lesser_mana: {
    id: 'scroll_lesser_mana', name: 'Scroll: Lesser Mana', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Lesser Mana enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_mana', sellValue: 6,
  },
  scroll_lesser_stamina: {
    id: 'scroll_lesser_stamina', name: 'Scroll: Lesser Stamina', type: 'enchant_scroll',
    description: 'Use on an equipped bracer item to apply the Lesser Stamina enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_stamina', sellValue: 6,
  },
  scroll_lesser_strength: {
    id: 'scroll_lesser_strength', name: 'Scroll: Lesser Strength', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Lesser Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_strength', sellValue: 6,
  },
  scroll_lesser_agility: {
    id: 'scroll_lesser_agility', name: 'Scroll: Lesser Agility', type: 'enchant_scroll',
    description: 'Use on an equipped boots item to apply the Lesser Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_agility', sellValue: 6,
  },
  scroll_lesser_intellect: {
    id: 'scroll_lesser_intellect', name: 'Scroll: Lesser Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Lesser Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_intellect', sellValue: 6,
  },
  scroll_lesser_spirit: {
    id: 'scroll_lesser_spirit', name: 'Scroll: Lesser Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Lesser Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_spirit', sellValue: 6,
  },
  scroll_lesser_defense: {
    id: 'scroll_lesser_defense', name: 'Scroll: Lesser Defense', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Lesser Defense enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_defense', sellValue: 6,
  },
  scroll_lesser_absorption: {
    id: 'scroll_lesser_absorption', name: 'Scroll: Lesser Absorption', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Lesser Absorption enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_absorption', sellValue: 6,
  },
  scroll_lesser_striking: {
    id: 'scroll_lesser_striking', name: 'Scroll: Lesser Striking', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Lesser Striking enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_striking', sellValue: 6,
  },
  scroll_lesser_impact: {
    id: 'scroll_lesser_impact', name: 'Scroll: Lesser Impact', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Lesser Impact enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_impact', sellValue: 6,
  },
  scroll_lesser_beastslayer: {
    id: 'scroll_lesser_beastslayer', name: 'Scroll: Lesser Beastslayer', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Lesser Beastslayer enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_beastslayer', sellValue: 6,
  },
  scroll_lesser_elemental_resistance: {
    id: 'scroll_lesser_elemental_resistance', name: 'Scroll: Lesser Elemental Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Lesser Elemental Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_lesser_elemental_resistance', sellValue: 6,
  },
  scroll_health_z3: {
    id: 'scroll_health_z3', name: 'Scroll: Health', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Health enchant.', stackable: true,
    scrollEnchantId: 'enchant_health_z3', sellValue: 9,
  },
  scroll_mana_z3: {
    id: 'scroll_mana_z3', name: 'Scroll: Mana', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Mana enchant.', stackable: true,
    scrollEnchantId: 'enchant_mana_z3', sellValue: 9,
  },
  scroll_stamina_z3: {
    id: 'scroll_stamina_z3', name: 'Scroll: Stamina', type: 'enchant_scroll',
    description: 'Use on an equipped bracer item to apply the Stamina enchant.', stackable: true,
    scrollEnchantId: 'enchant_stamina_z3', sellValue: 9,
  },
  scroll_strength_z3: {
    id: 'scroll_strength_z3', name: 'Scroll: Strength', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_strength_z3', sellValue: 9,
  },
  scroll_agility_z3: {
    id: 'scroll_agility_z3', name: 'Scroll: Agility', type: 'enchant_scroll',
    description: 'Use on an equipped boots item to apply the Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_agility_z3', sellValue: 9,
  },
  scroll_intellect_z3: {
    id: 'scroll_intellect_z3', name: 'Scroll: Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_intellect_z3', sellValue: 9,
  },
  scroll_spirit_z3: {
    id: 'scroll_spirit_z3', name: 'Scroll: Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_spirit_z3', sellValue: 9,
  },
  scroll_greater_defense_z3: {
    id: 'scroll_greater_defense_z3', name: 'Scroll: Greater Defense', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Defense enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_defense_z3', sellValue: 9,
  },
  scroll_striking_z3: {
    id: 'scroll_striking_z3', name: 'Scroll: Striking', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Striking enchant.', stackable: true,
    scrollEnchantId: 'enchant_striking_z3', sellValue: 9,
  },
  scroll_impact_z3: {
    id: 'scroll_impact_z3', name: 'Scroll: Impact', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Impact enchant.', stackable: true,
    scrollEnchantId: 'enchant_impact_z3', sellValue: 9,
  },
  scroll_greater_beastslayer_z3: {
    id: 'scroll_greater_beastslayer_z3', name: 'Scroll: Greater Beastslayer', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Greater Beastslayer enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_beastslayer_z3', sellValue: 9,
  },
  scroll_minor_haste_z3: {
    id: 'scroll_minor_haste_z3', name: 'Scroll: Minor Haste', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Minor Haste enchant.', stackable: true,
    scrollEnchantId: 'enchant_minor_haste_z3', sellValue: 9,
  },
  scroll_fire_resistance_z3: {
    id: 'scroll_fire_resistance_z3', name: 'Scroll: Fire Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Fire Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_fire_resistance_z3', sellValue: 9,
  },
  scroll_frost_resistance_z3: {
    id: 'scroll_frost_resistance_z3', name: 'Scroll: Frost Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Frost Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_frost_resistance_z3', sellValue: 9,
  },
  scroll_shadow_resistance_z3: {
    id: 'scroll_shadow_resistance_z3', name: 'Scroll: Shadow Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Shadow Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_shadow_resistance_z3', sellValue: 9,
  },
  scroll_greater_health_z4: {
    id: 'scroll_greater_health_z4', name: 'Scroll: Greater Health', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Greater Health enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_health_z4', sellValue: 12,
  },
  scroll_greater_mana_z4: {
    id: 'scroll_greater_mana_z4', name: 'Scroll: Greater Mana', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Greater Mana enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_mana_z4', sellValue: 12,
  },
  scroll_greater_stamina_z4: {
    id: 'scroll_greater_stamina_z4', name: 'Scroll: Greater Stamina', type: 'enchant_scroll',
    description: 'Use on an equipped bracer item to apply the Greater Stamina enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_stamina_z4', sellValue: 12,
  },
  scroll_greater_strength_z4: {
    id: 'scroll_greater_strength_z4', name: 'Scroll: Greater Strength', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Greater Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_strength_z4', sellValue: 12,
  },
  scroll_greater_agility_z4: {
    id: 'scroll_greater_agility_z4', name: 'Scroll: Greater Agility', type: 'enchant_scroll',
    description: 'Use on an equipped boots item to apply the Greater Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_agility_z4', sellValue: 12,
  },
  scroll_greater_intellect_z4: {
    id: 'scroll_greater_intellect_z4', name: 'Scroll: Greater Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Greater Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_intellect_z4', sellValue: 12,
  },
  scroll_greater_spirit_z4: {
    id: 'scroll_greater_spirit_z4', name: 'Scroll: Greater Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Greater Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_spirit_z4', sellValue: 12,
  },
  scroll_superior_defense_z4: {
    id: 'scroll_superior_defense_z4', name: 'Scroll: Superior Defense', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Superior Defense enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_defense_z4', sellValue: 12,
  },
  scroll_greater_striking_z4: {
    id: 'scroll_greater_striking_z4', name: 'Scroll: Greater Striking', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Greater Striking enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_striking_z4', sellValue: 12,
  },
  scroll_greater_impact_z4: {
    id: 'scroll_greater_impact_z4', name: 'Scroll: Greater Impact', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Greater Impact enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_impact_z4', sellValue: 12,
  },
  scroll_greater_haste_z4: {
    id: 'scroll_greater_haste_z4', name: 'Scroll: Greater Haste', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Greater Haste enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_haste_z4', sellValue: 12,
  },
  scroll_greater_fire_resistance_z4: {
    id: 'scroll_greater_fire_resistance_z4', name: 'Scroll: Greater Fire Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Fire Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_fire_resistance_z4', sellValue: 12,
  },
  scroll_greater_frost_resistance_z4: {
    id: 'scroll_greater_frost_resistance_z4', name: 'Scroll: Greater Frost Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Frost Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_frost_resistance_z4', sellValue: 12,
  },
  scroll_greater_shadow_resistance_z4: {
    id: 'scroll_greater_shadow_resistance_z4', name: 'Scroll: Greater Shadow Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Shadow Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_shadow_resistance_z4', sellValue: 12,
  },
  scroll_demonslaying_z4: {
    id: 'scroll_demonslaying_z4', name: 'Scroll: Demonslaying', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Demonslaying enchant.', stackable: true,
    scrollEnchantId: 'enchant_demonslaying_z4', sellValue: 12,
  },
  scroll_superior_health_z5: {
    id: 'scroll_superior_health_z5', name: 'Scroll: Superior Health', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Superior Health enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_health_z5', sellValue: 15,
  },
  scroll_superior_mana_z5: {
    id: 'scroll_superior_mana_z5', name: 'Scroll: Superior Mana', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Superior Mana enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_mana_z5', sellValue: 15,
  },
  scroll_superior_stamina_z5: {
    id: 'scroll_superior_stamina_z5', name: 'Scroll: Superior Stamina', type: 'enchant_scroll',
    description: 'Use on an equipped bracer item to apply the Superior Stamina enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_stamina_z5', sellValue: 15,
  },
  scroll_superior_strength_z5: {
    id: 'scroll_superior_strength_z5', name: 'Scroll: Superior Strength', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Superior Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_strength_z5', sellValue: 15,
  },
  scroll_superior_agility_z5: {
    id: 'scroll_superior_agility_z5', name: 'Scroll: Superior Agility', type: 'enchant_scroll',
    description: 'Use on an equipped boots item to apply the Superior Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_agility_z5', sellValue: 15,
  },
  scroll_superior_intellect_z5: {
    id: 'scroll_superior_intellect_z5', name: 'Scroll: Superior Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Superior Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_intellect_z5', sellValue: 15,
  },
  scroll_superior_spirit_z5: {
    id: 'scroll_superior_spirit_z5', name: 'Scroll: Superior Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Superior Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_spirit_z5', sellValue: 15,
  },
  scroll_greater_stats_z5: {
    id: 'scroll_greater_stats_z5', name: 'Scroll: Greater Stats', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Greater Stats enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_stats_z5', sellValue: 15,
  },
  scroll_superior_defense_z5: {
    id: 'scroll_superior_defense_z5', name: 'Scroll: Superior Defense', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Superior Defense enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_defense_z5', sellValue: 15,
  },
  scroll_superior_striking_z5: {
    id: 'scroll_superior_striking_z5', name: 'Scroll: Superior Striking', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Superior Striking enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_striking_z5', sellValue: 15,
  },
  scroll_superior_impact_z5: {
    id: 'scroll_superior_impact_z5', name: 'Scroll: Superior Impact', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Superior Impact enchant.', stackable: true,
    scrollEnchantId: 'enchant_superior_impact_z5', sellValue: 15,
  },
  scroll_greater_haste_z5: {
    id: 'scroll_greater_haste_z5', name: 'Scroll: Greater Haste', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Greater Haste enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_haste_z5', sellValue: 15,
  },
  scroll_greater_fire_resistance_z5: {
    id: 'scroll_greater_fire_resistance_z5', name: 'Scroll: Greater Fire Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Fire Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_fire_resistance_z5', sellValue: 15,
  },
  scroll_greater_frost_resistance_z5: {
    id: 'scroll_greater_frost_resistance_z5', name: 'Scroll: Greater Frost Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Frost Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_frost_resistance_z5', sellValue: 15,
  },
  scroll_greater_shadow_resistance_z5: {
    id: 'scroll_greater_shadow_resistance_z5', name: 'Scroll: Greater Shadow Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Greater Shadow Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_greater_shadow_resistance_z5', sellValue: 15,
  },
  scroll_fiery_weapon_z5: {
    id: 'scroll_fiery_weapon_z5', name: 'Scroll: Fiery Weapon', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Fiery Weapon enchant.', stackable: true,
    scrollEnchantId: 'enchant_fiery_weapon_z5', sellValue: 30,
  },
  scroll_icy_chill_z5: {
    id: 'scroll_icy_chill_z5', name: 'Scroll: Icy Chill', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Icy Chill enchant.', stackable: true,
    scrollEnchantId: 'enchant_icy_chill_z5', sellValue: 30,
  },
  scroll_lifestealing_z5: {
    id: 'scroll_lifestealing_z5', name: 'Scroll: Lifestealing', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Lifestealing enchant.', stackable: true,
    scrollEnchantId: 'enchant_lifestealing_z5', sellValue: 30,
  },
  scroll_ember_health: {
    id: 'scroll_ember_health', name: 'Scroll: Ember Health', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Ember Health enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_health', sellValue: 18,
  },
  scroll_ember_mana: {
    id: 'scroll_ember_mana', name: 'Scroll: Ember Mana', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Ember Mana enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_mana', sellValue: 18,
  },
  scroll_ember_stamina: {
    id: 'scroll_ember_stamina', name: 'Scroll: Ember Stamina', type: 'enchant_scroll',
    description: 'Use on an equipped bracer item to apply the Ember Stamina enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_stamina', sellValue: 18,
  },
  scroll_ember_strength: {
    id: 'scroll_ember_strength', name: 'Scroll: Ember Strength', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Ember Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_strength', sellValue: 18,
  },
  scroll_ember_agility: {
    id: 'scroll_ember_agility', name: 'Scroll: Ember Agility', type: 'enchant_scroll',
    description: 'Use on an equipped boots item to apply the Ember Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_agility', sellValue: 18,
  },
  scroll_ember_intellect: {
    id: 'scroll_ember_intellect', name: 'Scroll: Ember Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Ember Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_intellect', sellValue: 18,
  },
  scroll_ember_spirit: {
    id: 'scroll_ember_spirit', name: 'Scroll: Ember Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Ember Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_spirit', sellValue: 18,
  },
  scroll_ember_stats: {
    id: 'scroll_ember_stats', name: 'Scroll: Ember Stats', type: 'enchant_scroll',
    description: 'Use on an equipped chest item to apply the Ember Stats enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_stats', sellValue: 18,
  },
  scroll_ember_defense: {
    id: 'scroll_ember_defense', name: 'Scroll: Ember Defense', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Ember Defense enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_defense', sellValue: 18,
  },
  scroll_ember_striking: {
    id: 'scroll_ember_striking', name: 'Scroll: Ember Striking', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Ember Striking enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_striking', sellValue: 18,
  },
  scroll_ember_impact: {
    id: 'scroll_ember_impact', name: 'Scroll: Ember Impact', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Ember Impact enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_impact', sellValue: 18,
  },
  scroll_ember_haste: {
    id: 'scroll_ember_haste', name: 'Scroll: Ember Haste', type: 'enchant_scroll',
    description: 'Use on an equipped gloves item to apply the Ember Haste enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_haste', sellValue: 18,
  },
  scroll_ember_fire_resistance: {
    id: 'scroll_ember_fire_resistance', name: 'Scroll: Ember Fire Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Ember Fire Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_fire_resistance', sellValue: 18,
  },
  scroll_ember_frost_resistance: {
    id: 'scroll_ember_frost_resistance', name: 'Scroll: Ember Frost Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Ember Frost Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_frost_resistance', sellValue: 18,
  },
  scroll_ember_shadow_resistance: {
    id: 'scroll_ember_shadow_resistance', name: 'Scroll: Ember Shadow Resistance', type: 'enchant_scroll',
    description: 'Use on an equipped cloak item to apply the Ember Shadow Resistance enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_shadow_resistance', sellValue: 18,
  },
  scroll_ember_fiery_weapon: {
    id: 'scroll_ember_fiery_weapon', name: 'Scroll: Ember Fiery Weapon', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Ember Fiery Weapon enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_fiery_weapon', sellValue: 36,
  },
  scroll_ember_icy_chill: {
    id: 'scroll_ember_icy_chill', name: 'Scroll: Ember Icy Chill', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Ember Icy Chill enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_icy_chill', sellValue: 36,
  },
  scroll_ember_lifestealing: {
    id: 'scroll_ember_lifestealing', name: 'Scroll: Ember Lifestealing', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Ember Lifestealing enchant.', stackable: true,
    scrollEnchantId: 'enchant_ember_lifestealing', sellValue: 36,
  },
  scroll_crusader: {
    id: 'scroll_crusader', name: 'Scroll: Crusader', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Crusader enchant.', stackable: true,
    scrollEnchantId: 'enchant_crusader', sellValue: 36,
  },
  scroll_spellpower: {
    id: 'scroll_spellpower', name: 'Scroll: Spellpower', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Spellpower enchant.', stackable: true,
    scrollEnchantId: 'enchant_spellpower', sellValue: 36,
  },
  scroll_healing_power: {
    id: 'scroll_healing_power', name: 'Scroll: Healing Power', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Healing Power enchant.', stackable: true,
    scrollEnchantId: 'enchant_healing_power', sellValue: 36,
  },
  scroll_mighty_intellect: {
    id: 'scroll_mighty_intellect', name: 'Scroll: Mighty Intellect', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Mighty Intellect enchant.', stackable: true,
    scrollEnchantId: 'enchant_mighty_intellect', sellValue: 18,
  },
  scroll_mighty_spirit: {
    id: 'scroll_mighty_spirit', name: 'Scroll: Mighty Spirit', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Mighty Spirit enchant.', stackable: true,
    scrollEnchantId: 'enchant_mighty_spirit', sellValue: 18,
  },
  scroll_mighty_strength: {
    id: 'scroll_mighty_strength', name: 'Scroll: Mighty Strength', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Mighty Strength enchant.', stackable: true,
    scrollEnchantId: 'enchant_mighty_strength', sellValue: 18,
  },
  scroll_mighty_agility: {
    id: 'scroll_mighty_agility', name: 'Scroll: Mighty Agility', type: 'enchant_scroll',
    description: 'Use on an equipped weapon item to apply the Mighty Agility enchant.', stackable: true,
    scrollEnchantId: 'enchant_mighty_agility', sellValue: 18,
  },

  // ── Alchemy potions — healAmount/manaAmount potions stay simple instant
  // active-use items (health_potion/emberpetal_tonic/etc. above); these are
  // the buff-category potions the profession overhaul adds. Only one buff
  // per category can be active at a time (see gameData/buffs.ts).
  mana_potion: {
    id: 'mana_potion', name: 'Mana Potion', type: 'consumable',
    description: 'Restores 25 mana. Usable anywhere, once every 30 seconds.',
    stackable: true, sellValue: 4,
    consumableEffect: { manaAmount: 25, cooldownSeconds: 30 },
  },
  minor_battle_draught: {
    id: 'minor_battle_draught', name: 'Minor Battle Draught', type: 'consumable',
    description: 'An offensive draught: +10% damage dealt for 20 offensive actions.',
    stackable: true, sellValue: 8,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'offensive_potion', damageMultiplierPct: 10, charges: 20 } },
  },
  minor_stoneskin_draught: {
    id: 'minor_stoneskin_draught', name: 'Minor Stoneskin Draught', type: 'consumable',
    description: 'A defensive draught: -10% damage taken for 20 hits.',
    stackable: true, sellValue: 8,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'defensive_potion', mitigationMultiplierPct: 10, charges: 20 } },
  },
  tonic_of_might: {
    id: 'tonic_of_might', name: 'Tonic of Might', type: 'consumable',
    description: 'Grants +8 Strength for 5 minutes.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'stat_potion', statBonuses: { STR: 8 }, durationSeconds: 300 } },
  },
  elixir_of_the_mind: {
    id: 'elixir_of_the_mind', name: 'Elixir of the Mind', type: 'consumable',
    description: 'Grants +8 Intellect for 5 minutes.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'stat_potion', statBonuses: { INT: 8 }, durationSeconds: 300 } },
  },
  draught_of_resistance: {
    id: 'draught_of_resistance', name: 'Draught of Resistance', type: 'consumable',
    description: 'Hardens the skin against harm: -15% damage taken for 5 minutes.',
    stackable: true, sellValue: 18,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'resistance_potion', mitigationMultiplierPct: 15, durationSeconds: 300 } },
  },
  potion_of_precision: {
    id: 'potion_of_precision', name: 'Potion of Precision', type: 'consumable',
    description: 'Sharpens the senses: +8% chance to hit for 5 minutes.',
    stackable: true, sellValue: 18,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'precision_potion', hitChanceBonusPct: 8, durationSeconds: 300 } },
  },
  potion_of_evasion: {
    id: 'potion_of_evasion', name: 'Potion of Evasion', type: 'consumable',
    description: 'Lightens the step: +8% chance to dodge for 5 minutes.',
    stackable: true, sellValue: 18,
    consumableEffect: { cooldownSeconds: 90, buff: { category: 'evasion_potion', dodgeBonusPct: 8, durationSeconds: 300 } },
  },
  greater_battle_draught: {
    id: 'greater_battle_draught', name: 'Greater Battle Draught', type: 'consumable',
    description: 'An offensive draught: +18% damage dealt for 25 offensive actions.',
    stackable: true, sellValue: 30,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'offensive_potion', damageMultiplierPct: 18, charges: 25 } },
  },
  greater_stoneskin_draught: {
    id: 'greater_stoneskin_draught', name: 'Greater Stoneskin Draught', type: 'consumable',
    description: 'A defensive draught: -18% damage taken for 25 hits.',
    stackable: true, sellValue: 30,
    consumableEffect: { cooldownSeconds: 60, buff: { category: 'defensive_potion', mitigationMultiplierPct: 18, charges: 25 } },
  },

  // ── Cooking food (legacy) — frozen in place (their recipes are deleted,
  // not these items — see recipes.ts) for the full 3-tier Cooking overhaul
  // below. One "Well Fed" style dish per zone, scaling in both
  // heal amount and stat bonus. Only one Well Fed buff active at a time
  // (same exclusivity rule as potions), and food is a separate buff
  // category entirely so eating doesn't compete with potions for a slot.
  farmhouse_stew: {
    id: 'farmhouse_stew', name: 'Farmhouse Stew', type: 'consumable',
    description: 'A hearty stew. Restores 30 health and grants +3 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 6,
    consumableEffect: { healAmount: 30, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 3 }, durationSeconds: 600 } },
  },
  highland_roast: {
    id: 'highland_roast', name: 'Highland Roast', type: 'consumable',
    description: 'Roasted mountain game. Restores 50 health and grants +5 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 10,
    consumableEffect: { healAmount: 50, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 5 }, durationSeconds: 600 } },
  },
  embercured_fillet: {
    id: 'embercured_fillet', name: 'Embercured Fillet', type: 'consumable',
    description: 'Fire-cured eel. Restores 75 health and grants +4 Strength and +4 Intellect (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 16,
    consumableEffect: {
      healAmount: 75, cooldownSeconds: 30,
      buff: { category: 'well_fed', statBonuses: { STR: 4, INT: 4 }, durationSeconds: 600 },
    },
  },
  ashfin_chowder: {
    id: 'ashfin_chowder', name: 'Ashfin Chowder', type: 'consumable',
    description: 'A thick carp chowder. Restores 100 health and grants +7 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 22,
    consumableEffect: { healAmount: 100, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 7 }, durationSeconds: 600 } },
  },
  magma_darter_skewers: {
    id: 'magma_darter_skewers', name: 'Magma Darter Skewers', type: 'consumable',
    description: 'Skewered and seared. Restores 130 health and grants +6 Strength and +6 Intellect (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 30,
    consumableEffect: {
      healAmount: 130, cooldownSeconds: 30,
      buff: { category: 'well_fed', statBonuses: { STR: 6, INT: 6 }, durationSeconds: 600 },
    },
  },
  emberheart_feast: {
    id: 'emberheart_feast', name: 'Emberheart Feast', type: 'consumable',
    description: 'A banquet fit for the world’s molten heart. Restores 180 health and grants +10 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 40,
    consumableEffect: { healAmount: 180, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 10 }, durationSeconds: 600 } },
  },

  // ── More Cooking food — fills in Basic Food (cheap, pure heal, no buff —
  // an alternative to the single-fish Stat Food dishes above for players
  // who'd rather hunt than fish), Combination Meals (fish + monster drops +
  // herbs/seasoning together, per the design brief's explicit "Wolf & Trout
  // Stew"/"Hunter's Seafood Feast" examples — stronger buffs than any
  // single-source dish at the same level), and Feasts (high-level,
  // high-quantity, multi-source material sinks). Each recipe exists for a
  // distinct reason rather than being a near-duplicate of its neighbors.
  roasted_boar_meat: {
    id: 'roasted_boar_meat', name: 'Roasted Boar Meat', type: 'consumable',
    description: 'Simple roasted meat. Restores 20 health. No frills, no buff — just food.',
    stackable: true, sellValue: 2,
    consumableEffect: { healAmount: 20, cooldownSeconds: 30 },
  },
  hunters_jerky: {
    id: 'hunters_jerky', name: 'Hunter’s Jerky', type: 'consumable',
    description: 'Dried trail rations. Restores 35 health. No frills, no buff — just food.',
    stackable: true, sellValue: 4,
    consumableEffect: { healAmount: 35, cooldownSeconds: 30 },
  },
  wolf_trout_stew: {
    id: 'wolf_trout_stew', name: 'Wolf & Trout Stew', type: 'consumable',
    description: 'Trout, wolf meat, and wild herbs simmered together. Restores 40 health and grants +3 Strength and +3 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 9,
    consumableEffect: { healAmount: 40, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 3, STA: 3 }, durationSeconds: 600 } },
  },
  spiced_trail_soup: {
    id: 'spiced_trail_soup', name: 'Spiced Trail Soup', type: 'consumable',
    description: 'Mountain char and trail meat in a seasoned broth. Restores 65 health and grants +5 Intellect and +3 Spirit (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 14,
    consumableEffect: { healAmount: 65, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { INT: 5, SPI: 3 }, durationSeconds: 600 } },
  },
  scavengers_broth: {
    id: 'scavengers_broth', name: 'Scavenger’s Broth', type: 'consumable',
    description: 'Ember eel and scavenged meat in a hearty broth. Restores 85 health and grants +6 Strength and +4 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 19,
    consumableEffect: { healAmount: 85, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 6, STA: 4 }, durationSeconds: 600 } },
  },
  charred_skewer: {
    id: 'charred_skewer', name: 'Charred Skewer', type: 'consumable',
    description: 'Skewered ashfin carp and charred meat. Restores 95 health and grants +6 Intellect and +5 Spirit (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 23,
    consumableEffect: { healAmount: 95, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { INT: 6, SPI: 5 }, durationSeconds: 600 } },
  },
  hunters_seafood_feast: {
    id: 'hunters_seafood_feast', name: 'Hunter’s Seafood Feast', type: 'consumable',
    description: 'Magma darter and magma hound meat with rare seasoning. A true combination dish: restores 115 health and grants +7 Strength and +7 Intellect (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 28,
    consumableEffect: { healAmount: 115, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 7, INT: 7 }, durationSeconds: 600 } },
  },
  drake_meat_platter: {
    id: 'drake_meat_platter', name: 'Drake Meat Platter', type: 'consumable',
    description: 'Scaleback drake meat seared with magma darter. Restores 125 health and grants +8 Strength and +8 Stamina (Well Fed) for 10 minutes.',
    stackable: true, sellValue: 32,
    consumableEffect: { healAmount: 125, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 8, STA: 8 }, durationSeconds: 600 } },
  },
  behemoth_feast: {
    id: 'behemoth_feast', name: 'Behemoth Feast', type: 'consumable',
    description: 'A feast of charhide behemoth flank, magma darter, and rare seasoning — enough for a whole party. Restores 160 health and grants +6 Strength and +14 Stamina (Well Fed) for 15 minutes.',
    stackable: true, sellValue: 55,
    consumableEffect: { healAmount: 160, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STR: 6, STA: 14 }, durationSeconds: 900 } },
  },
  // Deliberately requires old low-level fish alongside high-level ones —
  // per the design brief's "Master Fisherman's Feast" example, keeping
  // demand for beginner materials alive even at the endgame.
  master_fishermans_feast: {
    id: 'master_fishermans_feast', name: 'Master Fisherman’s Feast', type: 'consumable',
    description: 'A grand feast of emberheart koi, brook trout, and drake meat — a whole party could eat from this. Restores 170 health and grants +12 Stamina, +8 Intellect, and +8 Spirit (Well Fed) for 15 minutes.',
    stackable: true, sellValue: 70,
    consumableEffect: { healAmount: 170, cooldownSeconds: 30, buff: { category: 'well_fed', statBonuses: { STA: 12, INT: 8, SPI: 8 }, durationSeconds: 900 } },
  },
  pyraxis_flame_seared_flank: {
    id: 'pyraxis_flame_seared_flank', name: 'Pyraxis Flame-Seared Flank', type: 'consumable',
    description: 'Pyraxis’s own flank, seared over its still-smoldering embers with emberheart koi and rare seasoning. The finest meal in Cinderheart Crater: restores 200 health and grants +15 Strength, +15 Intellect, and +10 Stamina (Well Fed) for 15 minutes.',
    stackable: true, sellValue: 120,
    consumableEffect: {
      healAmount: 200, cooldownSeconds: 30,
      buff: { category: 'well_fed', statBonuses: { STR: 15, INT: 15, STA: 10 }, durationSeconds: 900 },
    },
  },
  // The recipe itself is a rare boss drop, not trainer-taught — see
  // recipes.ts's pyraxis_flame_seared_flank entry (learnedAutomatically:
  // false) and monsters.ts's pyraxis lootTable, matching the design brief's
  // "obtaining the recipe is only one part of the process" example.
  recipe_pyraxis_flame_seared_flank: {
    id: 'recipe_pyraxis_flame_seared_flank', name: 'Recipe: Pyraxis Flame-Seared Flank', type: 'recipe',
    description: 'A scorched recipe card, pried from Pyraxis’s hoard. Use to learn the recipe.',
    stackable: true, teachesRecipeId: 'pyraxis_flame_seared_flank', sellValue: 0,
  },

  // ── Cooking overhaul Tier 1 — Recovery Food. Pure sustain: manual use
  // heals to FULL and resets the attack timer (see recoveryFood's doc
  // comment in types.ts); Auto Eat (a purchased profession rank, not a
  // recipe) uses the same item for a smaller rank-scaled heal. No stat
  // bonuses, no buff, and completely unusable in a dungeon/raid either
  // way. One dish per zone, primarily built from that zone's fish.
  greenhollow_hearth_stew: {
    id: 'greenhollow_hearth_stew', name: 'Greenhollow Hearth Stew', type: 'consumable',
    description: 'A simple, filling stew of smallfish and boar meat. Restores all health when eaten manually.',
    stackable: true, sellValue: 3,
    consumableEffect: { cooldownSeconds: 20, recoveryFood: true },
  },
  stonecrag_camp_broth: {
    id: 'stonecrag_camp_broth', name: 'Stonecrag Camp Broth', type: 'consumable',
    description: 'A hearty trailside broth of catfish and game meat. Restores all health when eaten manually.',
    stackable: true, sellValue: 6,
    consumableEffect: { cooldownSeconds: 20, recoveryFood: true },
  },
  emberfall_field_rations: {
    id: 'emberfall_field_rations', name: 'Emberfall Field Rations', type: 'consumable',
    description: 'Dense, heat-cured trout rations carried by Emberfall’s hardiest travelers. Restores all health when eaten manually.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 20, recoveryFood: true },
  },
  cinderfall_scavengers_stew: {
    id: 'cinderfall_scavengers_stew', name: 'Cinderfall Scavenger’s Stew', type: 'consumable',
    description: 'Redgill and scavenged meat, boiled down into something surprisingly restorative. Restores all health when eaten manually.',
    stackable: true, sellValue: 22,
    consumableEffect: { cooldownSeconds: 20, recoveryFood: true },
  },
  molten_hound_roast: {
    id: 'molten_hound_roast', name: 'Molten Hound Roast', type: 'consumable',
    description: 'Stonescale eel and magma hound meat, roasted together over the Scar’s own heat. Restores all health when eaten manually.',
    stackable: true, sellValue: 38,
    consumableEffect: { cooldownSeconds: 20, recoveryFood: true },
  },
  cinderheart_ember_roast: {
    id: 'cinderheart_ember_roast', name: 'Cinderheart Ember Roast', type: 'consumable',
    description: 'Emberfin snapper and behemoth flank, slow-roasted at the world’s molten heart. Restores all health when eaten manually.',
    stackable: true, sellValue: 60,
    consumableEffect: { cooldownSeconds: 20, recoveryFood: true },
  },

  // ── Cooking overhaul Tier 2 — Stat Food. One dish per zone, granting a
  // temporary bonus to all 5 primary stats (run through the existing class/
  // spec stat-conversion system — no new combat formulas). Charges are
  // deliberately absent here: they're rolled at CRAFT time by that zone's
  // Cooking Mastery (1-4, see gameData/cookingMastery.ts) into a
  // chargedConsumables bucket, never a fixed property of the item itself —
  // see firebase/consumables.ts's equipStatFood. No healAmount — Stat Food
  // restores no health, per the design brief.
  greenhollow_hunters_stew: {
    id: 'greenhollow_hunters_stew', name: 'Greenhollow Hunter’s Stew', type: 'consumable',
    description: 'A well-seasoned stew that keeps a hunter sharp. Grants a small bonus to all stats until its charges run out.',
    stackable: true, sellValue: 8,
    consumableEffect: { cooldownSeconds: 20, buff: { category: 'stat_food', statBonuses: { STR: 2, STA: 2, AGI: 2, INT: 2, SPI: 2 }, trigger: 'stat_food_use' } },
  },
  stonecrag_highland_fare: {
    id: 'stonecrag_highland_fare', name: 'Stonecrag Highland Fare', type: 'consumable',
    description: 'A trail-ready meal favored by Stonecrag’s highland scouts. Grants a bonus to all stats until its charges run out.',
    stackable: true, sellValue: 16,
    consumableEffect: { cooldownSeconds: 20, buff: { category: 'stat_food', statBonuses: { STR: 4, STA: 4, AGI: 4, INT: 4, SPI: 4 }, trigger: 'stat_food_use' } },
  },
  emberfall_ridge_platter: {
    id: 'emberfall_ridge_platter', name: 'Emberfall Ridge Platter', type: 'consumable',
    description: 'A rich, fire-cured platter that fortifies body and mind. Grants a bonus to all stats until its charges run out.',
    stackable: true, sellValue: 28,
    consumableEffect: { cooldownSeconds: 20, buff: { category: 'stat_food', statBonuses: { STR: 7, STA: 7, AGI: 7, INT: 7, SPI: 7 }, trigger: 'stat_food_use' } },
  },
  cinderfall_depths_banquet: {
    id: 'cinderfall_depths_banquet', name: 'Cinderfall Depths Banquet', type: 'consumable',
    description: 'A hearty banquet drawn from the ruins below. Grants a sizable bonus to all stats until its charges run out.',
    stackable: true, sellValue: 44,
    consumableEffect: { cooldownSeconds: 20, buff: { category: 'stat_food', statBonuses: { STR: 11, STA: 11, AGI: 11, INT: 11, SPI: 11 }, trigger: 'stat_food_use' } },
  },
  molten_scar_feast_platter: {
    id: 'molten_scar_feast_platter', name: 'Molten Scar Feast Platter', type: 'consumable',
    description: 'A heat-forged platter prepared for the Scar’s most dangerous hunts. Grants a strong bonus to all stats until its charges run out.',
    stackable: true, sellValue: 68,
    consumableEffect: { cooldownSeconds: 20, buff: { category: 'stat_food', statBonuses: { STR: 16, STA: 16, AGI: 16, INT: 16, SPI: 16 }, trigger: 'stat_food_use' } },
  },
  cinderheart_molten_banquet: {
    id: 'cinderheart_molten_banquet', name: 'Cinderheart Molten Banquet', type: 'consumable',
    description: 'A banquet worthy of the world’s molten heart. Grants a powerful bonus to all stats until its charges run out.',
    stackable: true, sellValue: 95,
    consumableEffect: { cooldownSeconds: 20, buff: { category: 'stat_food', statBonuses: { STR: 22, STA: 22, AGI: 22, INT: 22, SPI: 22 }, trigger: 'stat_food_use' } },
  },

  // ── Tailoring bags — permanent inventory capacity, consumed on use (see
  // firebase/consumables.ts's bagCapacityBonus handling). Each is strictly
  // additive, so order of purchase/use never matters.
  small_pack: {
    id: 'small_pack', name: 'Small Pack', type: 'consumable',
    description: 'A simple cloth pack. Permanently increases inventory capacity by 8.',
    stackable: true, sellValue: 5,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 8 },
  },
  travelers_pack: {
    id: 'travelers_pack', name: "Traveler's Pack", type: 'consumable',
    description: 'A reinforced traveling pack. Permanently increases inventory capacity by 12.',
    stackable: true, sellValue: 12,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 12 },
  },
  explorers_pack: {
    id: 'explorers_pack', name: "Explorer's Pack", type: 'consumable',
    description: 'A rugged multi-pocket pack. Permanently increases inventory capacity by 16.',
    stackable: true, sellValue: 25,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 16 },
  },
  dwarven_rucksack: {
    id: 'dwarven_rucksack', name: 'Dwarven Rucksack', type: 'consumable',
    description: 'A dwarven-made rucksack recovered from Cinderfall. Permanently increases inventory capacity by 20.',
    stackable: true, sellValue: 45,
    consumableEffect: { cooldownSeconds: 0, bagCapacityBonus: 20 },
  },

  // ── Blacksmithing profession quest chain reward (see quests.ts's
  // "The Lost Forge" chain) — a recipe that must be taught by this item
  // rather than just hitting a skill threshold (Recipe.learnedAutomatically
  // === false), per the design brief's "profession quest chains can teach
  // unique recipes" requirement.
  formula_emberforged_gauntlets: {
    id: 'formula_emberforged_gauntlets', name: 'Formula: Emberforged Gauntlets', type: 'recipe',
    description: 'A scorched forge-formula recovered from the Molten Scar. Use to learn the recipe.',
    stackable: true, teachesRecipeId: 'emberforged_gauntlets_recipe', sellValue: 0,
  },
  emberforged_gauntlets: {
    id: 'emberforged_gauntlets', name: 'Emberforged Gauntlets', type: 'equipment',
    description: 'Gauntlets forged from a formula passed down since Cinderfall’s dwarves — among the finest a Blacksmith can make.',
    stackable: true, equipSlot: 'gloves', armorType: 'plate', statBonuses: { STR: 14, STA: 8 }, sellValue: 90,
  },

  // ── Voidforged gear — the endgame capstone set, bought from the Void
  // Vendor (Cinderheart Crater) for Void Shards rather than gold. A
  // deliberate step above the best craftable/dungeon-drop gear in each
  // slot, since it's gated behind farming the same endgame zone rather
  // than being a shortcut around it.
  voidforged_warblade: {
    id: 'voidforged_warblade', name: 'Voidforged Warblade', type: 'equipment',
    description: 'A blade quenched in the crater’s waking power. It hums faintly, even at rest.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 22, STA: 8 }, sellValue: 160,
  },
  voidforged_scepter: {
    id: 'voidforged_scepter', name: 'Voidforged Scepter', type: 'equipment',
    description: 'A scepter that channels the crater’s stirring power into focused will.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 14, SPI: 6 }, sellValue: 160,
  },
  voidforged_chestguard: {
    id: 'voidforged_chestguard', name: 'Voidforged Chestguard', type: 'equipment',
    description: 'Plate forged at the world’s molten heart, tempered in something older than fire.',
    stackable: true, equipSlot: 'chest', armorType: 'plate', statBonuses: { STA: 18, STR: 4 }, sellValue: 120,
  },
  voidforged_vestments: {
    id: 'voidforged_vestments', name: 'Voidforged Vestments', type: 'equipment',
    description: 'Robes woven through with threads of the crater’s own stirring power.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 15, SPI: 9 }, sellValue: 120,
  },
  voidforged_signet: {
    id: 'voidforged_signet', name: 'Voidforged Signet', type: 'equipment',
    description: 'A ring cut from crystallized Void Shard — equally at home on any hand.',
    stackable: true, equipSlot: 'ring', statBonuses: { STR: 5, STA: 8, INT: 5, SPI: 5 }, sellValue: 110,
  },

  // ── Second gather-node materials — a 2nd Mining/Herbalism/Skinning node
  // per zone (see zones.ts's GATHER_NODES) so each gathering profession has
  // more than one thing to gather per zone. Same requiredLevel/sellValue
  // tier as that zone's original node; a few are also woven into existing
  // recipes as an added ingredient for more varied material lists (see
  // recipes.ts).
  // Mining/Smithing's Mastery-pilot rareBonus stones (see zones.ts's
  // GATHER_NODES) — ids predate the overhaul (each was its own standalone
  // node once) but now drop as a 10% bonus alongside that zone's primary
  // ore, renamed to match the new design's naming.
  granite_chunk: {
    id: 'granite_chunk', name: 'Rough Stone', type: 'material',
    description: 'A rough, unworked stone found alongside copper ore.', stackable: true, sellValue: 1,
  },
  wildroot: {
    id: 'wildroot', name: 'Wildroot', type: 'material',
    description: 'A gnarled root with a sharp, earthy smell.', stackable: true, sellValue: 1,
  },
  rabbit_pelt: {
    id: 'rabbit_pelt', name: 'Rabbit Pelt', type: 'material',
    description: 'A small, soft pelt from the warrens.', stackable: true, sellValue: 1,
  },
  flint: {
    id: 'flint', name: 'Coarse Stone', type: 'material',
    description: 'A hard, flaking stone found alongside tin ore.', stackable: true, sellValue: 2,
  },
  frostcap: {
    id: 'frostcap', name: 'Frostcap', type: 'material',
    description: 'A pale mushroom that stays cold to the touch.', stackable: true, sellValue: 2,
  },
  jackal_fur: {
    id: 'jackal_fur', name: 'Jackal Fur', type: 'material',
    description: 'Coarse fur, still carrying the jackal’s musk.', stackable: true, sellValue: 2,
  },
  sulfur_chunk: {
    id: 'sulfur_chunk', name: 'Heavy Stone', type: 'material',
    description: 'A dense, unusually heavy stone found alongside iron ore.', stackable: true, sellValue: 3,
  },
  emberleaf: {
    id: 'emberleaf', name: 'Emberleaf', type: 'material',
    description: 'A leaf that stays warm long after picking.', stackable: true, sellValue: 3,
  },
  cinderwolf_pelt: {
    id: 'cinderwolf_pelt', name: 'Cinderwolf Pelt', type: 'material',
    description: 'A singed pelt, still faintly warm.', stackable: true, sellValue: 3,
  },
  shadowore: {
    id: 'shadowore', name: 'Solid Stone', type: 'material',
    description: 'An unusually solid, dense stone found alongside mithril ore.', stackable: true, sellValue: 4,
  },
  ashroot: {
    id: 'ashroot', name: 'Ashroot', type: 'material',
    description: 'A root grown entirely through packed ash.', stackable: true, sellValue: 4,
  },
  scavenger_hide: {
    id: 'scavenger_hide', name: 'Scavenger Hide', type: 'material',
    description: 'Mangy hide from a ruin-dwelling scavenger.', stackable: true, sellValue: 4,
  },
  scorchweed: {
    id: 'scorchweed', name: 'Scorchweed', type: 'material',
    description: 'A wiry weed that thrives in scorched ground.', stackable: true, sellValue: 5,
  },
  scaleback_scale: {
    id: 'scaleback_scale', name: 'Scaleback Scale', type: 'material',
    description: 'A single overlapping scale, still warm.', stackable: true, sellValue: 5,
  },
  starforge_ore: {
    id: 'starforge_ore', name: 'Fire Stone', type: 'material',
    description: 'A stone that stays warm to the touch, found alongside obsidian ore.', stackable: true, sellValue: 6,
  },
  heartbloom: {
    id: 'heartbloom', name: 'Heartbloom', type: 'material',
    description: 'A flower that pulses faintly, warm as a heartbeat.', stackable: true, sellValue: 6,
  },
  emberscale_claw: {
    id: 'emberscale_claw', name: 'Emberscale Claw', type: 'material',
    description: 'A curved claw, still sharp enough to work.', stackable: true, sellValue: 6,
  },

  // ── Blacksmithing full armor sets (material-Mastery/randomized-stat overhaul) ──
  // Each (tier, slot) pair used to be two separate items — a "plain" STR/STA
  // one and a "Sacred"-prefixed INT/SPI one — purely so casters had a usable
  // alternative. The duplicate RECIPE for the Sacred half of each pair was
  // removed (see gameData/recipes.ts's matching section); a newly-crafted
  // item now rolls 2 random stats from STR/STA/INT/SPI instead
  // (gameData/equipmentRolls.ts's rollArmorStats), with the roll denormalized
  // onto the equipped/inventory instance itself, not this static entry — see
  // gameData/types.ts's EquippedItemRef doc comment.
  //
  // The 42 "Sacred"-prefixed entries below are kept completely untouched
  // (frozen legacy items, no longer reachable from any recipe) purely so a
  // pre-existing stack or equipped copy never disappears or 404s — every
  // consumer (equip, stat lookup, disenchant, vendor, collection log) keeps
  // working on them exactly as before this overhaul, forever, with zero
  // migration needed.
  //
  // The "plain" entries below (the ones a recipe still produces) keep their
  // OLD statBonuses too, for the identical reason: a pre-existing stack or
  // equipped copy of e.g. `copper_helm` predates per-instance rolls and has
  // no roll data to fall back on, so getEquipmentStatBonuses
  // (gameData/equipmentStats.ts) uses a ref's `rolls` when present and only
  // falls back to this static field for such legacy, never-rolled copies —
  // a NEWLY crafted copy always carries its own `rolls`, which wins. Only
  // `armorType` was removed from the 42 armor pieces (not the 6 jewelry
  // pieces, which never had one): keeping it would have meant only the
  // class(es) that could previously wear the "plain" variant could wear the
  // new single consolidated item, silently locking out whichever class used
  // to need the "Sacred" cloth variant — and every stat combo must in fact
  // be equippable by every class for "equal probability per combo" to mean
  // anything. No `armorType` is the same "unrestricted" convention weapons
  // and rings already use (see classStats.ts's canClassEquip).
  copper_helm: {
    id: 'copper_helm', name: 'Copper Helm', type: 'equipment',
    description: 'An orange helm forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 3, STR: 3 }, sellValue: 18,
  },
  sacred_copper_helm: {
    id: 'sacred_copper_helm', name: 'Sacred Copper Helm', type: 'equipment',
    description: 'An orange, light-touched helm forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 3, SPI: 3 }, sellValue: 18,
  },
  copper_chestplate: {
    id: 'copper_chestplate', name: 'Copper Chestplate', type: 'equipment',
    description: 'An orange chestplate forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 4, STR: 4 }, sellValue: 24,
  },
  sacred_copper_chestplate: {
    id: 'sacred_copper_chestplate', name: 'Sacred Copper Chestplate', type: 'equipment',
    description: 'An orange, light-touched chestplate forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 4, SPI: 4 }, sellValue: 24,
  },
  copper_gauntlets: {
    id: 'copper_gauntlets', name: 'Copper Gauntlets', type: 'equipment',
    description: 'An orange gauntlets forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 2, STR: 2 }, sellValue: 12,
  },
  sacred_copper_gauntlets: {
    id: 'sacred_copper_gauntlets', name: 'Sacred Copper Gauntlets', type: 'equipment',
    description: 'An orange, light-touched gauntlets forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 2, SPI: 2 }, sellValue: 12,
  },
  copper_bracers: {
    id: 'copper_bracers', name: 'Copper Bracers', type: 'equipment',
    description: 'An orange bracers forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 2, STR: 2 }, sellValue: 12,
  },
  copper_legplates: {
    id: 'copper_legplates', name: 'Copper Legplates', type: 'equipment',
    description: 'An orange legplates forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 4, STR: 3 }, sellValue: 21,
  },
  sacred_copper_legplates: {
    id: 'sacred_copper_legplates', name: 'Sacred Copper Legplates', type: 'equipment',
    description: 'An orange, light-touched legplates forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 4, SPI: 3 }, sellValue: 21,
  },
  copper_greaves: {
    id: 'copper_greaves', name: 'Copper Greaves', type: 'equipment',
    description: 'An orange greaves forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 3, STR: 2 }, sellValue: 15,
  },
  sacred_copper_greaves: {
    id: 'sacred_copper_greaves', name: 'Sacred Copper Greaves', type: 'equipment',
    description: 'An orange, light-touched greaves forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 3, SPI: 2 }, sellValue: 15,
  },
  copper_shield: {
    id: 'copper_shield', name: 'Copper Shield', type: 'equipment',
    description: 'An orange shield forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 3, STR: 3 }, sellValue: 18,
  },
  sacred_copper_shield: {
    id: 'sacred_copper_shield', name: 'Copper-Bound Tome', type: 'equipment',
    description: 'A spellbook bound in orange Copper plating by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 3, SPI: 3 }, sellValue: 18,
  },
  copper_sword: {
    id: 'copper_sword', name: 'Copper Sword', type: 'equipment',
    description: 'An orange sword forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 6, STA: 3 }, sellValue: 27,
  },
  sacred_copper_sword: {
    id: 'sacred_copper_sword', name: 'Sacred Copper Sword', type: 'equipment',
    description: 'An orange, light-touched sword forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 6, SPI: 3 }, sellValue: 27,
  },
  copper_battleaxe: {
    id: 'copper_battleaxe', name: 'Copper Battleaxe', type: 'equipment',
    description: 'An orange battleaxe forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8, STA: 5 }, sellValue: 39,
  },
  sacred_copper_battleaxe: {
    id: 'sacred_copper_battleaxe', name: 'Sacred Copper Battleaxe', type: 'equipment',
    description: 'An orange, light-touched battleaxe forged from Copper by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 8, SPI: 5 }, sellValue: 39,
  },
  bronze_helm: {
    id: 'bronze_helm', name: 'Bronze Helm', type: 'equipment',
    description: 'A brown helm forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 4, STR: 4 }, sellValue: 26,
  },
  sacred_bronze_helm: {
    id: 'sacred_bronze_helm', name: 'Sacred Bronze Helm', type: 'equipment',
    description: 'A brown, light-touched helm forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 4, SPI: 4 }, sellValue: 26,
  },
  bronze_chestplate: {
    id: 'bronze_chestplate', name: 'Bronze Chestplate', type: 'equipment',
    description: 'A brown chestplate forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 7, STR: 5 }, sellValue: 38,
  },
  sacred_bronze_chestplate: {
    id: 'sacred_bronze_chestplate', name: 'Sacred Bronze Chestplate', type: 'equipment',
    description: 'A brown, light-touched chestplate forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 38,
  },
  bronze_gauntlets: {
    id: 'bronze_gauntlets', name: 'Bronze Gauntlets', type: 'equipment',
    description: 'A brown gauntlets forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  sacred_bronze_gauntlets: {
    id: 'sacred_bronze_gauntlets', name: 'Sacred Bronze Gauntlets', type: 'equipment',
    description: 'A brown, light-touched gauntlets forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 4, SPI: 3 }, sellValue: 22,
  },
  bronze_bracers: {
    id: 'bronze_bracers', name: 'Bronze Bracers', type: 'equipment',
    description: 'A brown bracers forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  bronze_legplates: {
    id: 'bronze_legplates', name: 'Bronze Legplates', type: 'equipment',
    description: 'A brown legplates forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 6, STR: 5 }, sellValue: 35,
  },
  sacred_bronze_legplates: {
    id: 'sacred_bronze_legplates', name: 'Sacred Bronze Legplates', type: 'equipment',
    description: 'A brown, light-touched legplates forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 35,
  },
  bronze_greaves: {
    id: 'bronze_greaves', name: 'Bronze Greaves', type: 'equipment',
    description: 'A brown greaves forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 4, STR: 3 }, sellValue: 22,
  },
  sacred_bronze_greaves: {
    id: 'sacred_bronze_greaves', name: 'Sacred Bronze Greaves', type: 'equipment',
    description: 'A brown, light-touched greaves forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 4, SPI: 3 }, sellValue: 22,
  },
  bronze_shield: {
    id: 'bronze_shield', name: 'Bronze Shield', type: 'equipment',
    description: 'A brown shield forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 6, STR: 5 }, sellValue: 32,
  },
  sacred_bronze_shield: {
    id: 'sacred_bronze_shield', name: 'Bronze-Rimmed Orb', type: 'equipment',
    description: 'A focusing orb banded in brown Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 32,
  },
  bronze_sword: {
    id: 'bronze_sword', name: 'Bronze Sword', type: 'equipment',
    description: 'A brown sword forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 8, STA: 5 }, sellValue: 42,
  },
  sacred_bronze_sword: {
    id: 'sacred_bronze_sword', name: 'Sacred Bronze Sword', type: 'equipment',
    description: 'A brown, light-touched sword forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 8, SPI: 5 }, sellValue: 42,
  },
  bronze_battleaxe: {
    id: 'bronze_battleaxe', name: 'Bronze Battleaxe', type: 'equipment',
    description: 'A brown battleaxe forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12, STA: 7 }, sellValue: 61,
  },
  sacred_bronze_battleaxe: {
    id: 'sacred_bronze_battleaxe', name: 'Sacred Bronze Battleaxe', type: 'equipment',
    description: 'A brown, light-touched battleaxe forged from Bronze by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 12, SPI: 7 }, sellValue: 61,
  },
  iron_helm: {
    id: 'iron_helm', name: 'Iron Helm', type: 'equipment',
    description: 'A dark gray helm forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 6, STR: 5 }, sellValue: 37,
  },
  sacred_iron_helm: {
    id: 'sacred_iron_helm', name: 'Sacred Iron Helm', type: 'equipment',
    description: 'A dark gray, light-touched helm forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 37,
  },
  iron_chestplate: {
    id: 'iron_chestplate', name: 'Iron Chestplate', type: 'equipment',
    description: 'A dark gray chestplate forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 9, STR: 7 }, sellValue: 54,
  },
  sacred_iron_chestplate: {
    id: 'sacred_iron_chestplate', name: 'Sacred Iron Chestplate', type: 'equipment',
    description: 'A dark gray, light-touched chestplate forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 9, SPI: 7 }, sellValue: 54,
  },
  iron_gauntlets: {
    id: 'iron_gauntlets', name: 'Iron Gauntlets', type: 'equipment',
    description: 'A dark gray gauntlets forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 5, STR: 4 }, sellValue: 31,
  },
  sacred_iron_gauntlets: {
    id: 'sacred_iron_gauntlets', name: 'Sacred Iron Gauntlets', type: 'equipment',
    description: 'A dark gray, light-touched gauntlets forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 5, SPI: 4 }, sellValue: 31,
  },
  iron_bracers: {
    id: 'iron_bracers', name: 'Iron Bracers', type: 'equipment',
    description: 'A dark gray bracers forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 5, STR: 4 }, sellValue: 31,
  },
  iron_legplates: {
    id: 'iron_legplates', name: 'Iron Legplates', type: 'equipment',
    description: 'A dark gray legplates forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 8, STR: 6 }, sellValue: 48,
  },
  sacred_iron_legplates: {
    id: 'sacred_iron_legplates', name: 'Sacred Iron Legplates', type: 'equipment',
    description: 'A dark gray, light-touched legplates forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 48,
  },
  iron_greaves: {
    id: 'iron_greaves', name: 'Iron Greaves', type: 'equipment',
    description: 'A dark gray greaves forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 6, STR: 5 }, sellValue: 34,
  },
  sacred_iron_greaves: {
    id: 'sacred_iron_greaves', name: 'Sacred Iron Greaves', type: 'equipment',
    description: 'A dark gray, light-touched greaves forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 34,
  },
  iron_shield: {
    id: 'iron_shield', name: 'Iron Shield', type: 'equipment',
    description: 'A dark gray shield forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 7, STR: 6 }, sellValue: 44,
  },
  sacred_iron_shield: {
    id: 'sacred_iron_shield', name: 'Iron-Clasped Tome', type: 'equipment',
    description: 'A spellbook clasped in dark gray Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 7, SPI: 6 }, sellValue: 44,
  },
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', type: 'equipment',
    description: 'A dark gray sword forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 12, STA: 6 }, sellValue: 61,
  },
  sacred_iron_sword: {
    id: 'sacred_iron_sword', name: 'Sacred Iron Sword', type: 'equipment',
    description: 'A dark gray, light-touched sword forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 12, SPI: 6 }, sellValue: 61,
  },
  iron_battleaxe: {
    id: 'iron_battleaxe', name: 'Iron Battleaxe', type: 'equipment',
    description: 'A dark gray battleaxe forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 17, STA: 9 }, sellValue: 88,
  },
  sacred_iron_battleaxe: {
    id: 'sacred_iron_battleaxe', name: 'Sacred Iron Battleaxe', type: 'equipment',
    description: 'A dark gray, light-touched battleaxe forged from Iron by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 17, SPI: 9 }, sellValue: 88,
  },
  steel_helm: {
    id: 'steel_helm', name: 'Steel Helm', type: 'equipment',
    description: 'A light gray helm forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 8, STR: 6 }, sellValue: 49,
  },
  sacred_steel_helm: {
    id: 'sacred_steel_helm', name: 'Sacred Steel Helm', type: 'equipment',
    description: 'A light gray, light-touched helm forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 49,
  },
  steel_chestplate: {
    id: 'steel_chestplate', name: 'Steel Chestplate', type: 'equipment',
    description: 'A light gray chestplate forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 11, STR: 9 }, sellValue: 70,
  },
  sacred_steel_chestplate: {
    id: 'sacred_steel_chestplate', name: 'Sacred Steel Chestplate', type: 'equipment',
    description: 'A light gray, light-touched chestplate forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 11, SPI: 9 }, sellValue: 70,
  },
  steel_gauntlets: {
    id: 'steel_gauntlets', name: 'Steel Gauntlets', type: 'equipment',
    description: 'A light gray gauntlets forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 6, STR: 5 }, sellValue: 39,
  },
  sacred_steel_gauntlets: {
    id: 'sacred_steel_gauntlets', name: 'Sacred Steel Gauntlets', type: 'equipment',
    description: 'A light gray, light-touched gauntlets forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 6, SPI: 5 }, sellValue: 39,
  },
  steel_bracers: {
    id: 'steel_bracers', name: 'Steel Bracers', type: 'equipment',
    description: 'A light gray bracers forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 6, STR: 5 }, sellValue: 39,
  },
  steel_legplates: {
    id: 'steel_legplates', name: 'Steel Legplates', type: 'equipment',
    description: 'A light gray legplates forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 10, STR: 8 }, sellValue: 63,
  },
  sacred_steel_legplates: {
    id: 'sacred_steel_legplates', name: 'Sacred Steel Legplates', type: 'equipment',
    description: 'A light gray, light-touched legplates forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 10, SPI: 8 }, sellValue: 63,
  },
  steel_greaves: {
    id: 'steel_greaves', name: 'Steel Greaves', type: 'equipment',
    description: 'A light gray greaves forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 7, STR: 5 }, sellValue: 42,
  },
  sacred_steel_greaves: {
    id: 'sacred_steel_greaves', name: 'Sacred Steel Greaves', type: 'equipment',
    description: 'A light gray, light-touched greaves forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 7, SPI: 5 }, sellValue: 42,
  },
  steel_shield: {
    id: 'steel_shield', name: 'Steel Shield', type: 'equipment',
    description: 'A light gray shield forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 9, STR: 7 }, sellValue: 56,
  },
  sacred_steel_shield: {
    id: 'sacred_steel_shield', name: 'Steel-Banded Orb', type: 'equipment',
    description: 'A focusing orb caged in light gray Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 9, SPI: 7 }, sellValue: 56,
  },
  steel_sword: {
    id: 'steel_sword', name: 'Steel Sword', type: 'equipment',
    description: 'A light gray sword forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 14, STA: 8 }, sellValue: 77,
  },
  sacred_steel_sword: {
    id: 'sacred_steel_sword', name: 'Sacred Steel Sword', type: 'equipment',
    description: 'A light gray, light-touched sword forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 14, SPI: 8 }, sellValue: 77,
  },
  steel_battleaxe: {
    id: 'steel_battleaxe', name: 'Steel Battleaxe', type: 'equipment',
    description: 'A light gray battleaxe forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 21, STA: 11 }, sellValue: 112,
  },
  sacred_steel_battleaxe: {
    id: 'sacred_steel_battleaxe', name: 'Sacred Steel Battleaxe', type: 'equipment',
    description: 'A light gray, light-touched battleaxe forged from Steel by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 21, SPI: 11 }, sellValue: 112,
  },
  mithril_helm: {
    id: 'mithril_helm', name: 'Mithril Helm', type: 'equipment',
    description: 'A dark blue helm forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 9, STR: 8 }, sellValue: 61,
  },
  sacred_mithril_helm: {
    id: 'sacred_mithril_helm', name: 'Sacred Mithril Helm', type: 'equipment',
    description: 'A dark blue, light-touched helm forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 9, SPI: 8 }, sellValue: 61,
  },
  mithril_chestplate: {
    id: 'mithril_chestplate', name: 'Mithril Chestplate', type: 'equipment',
    description: 'A dark blue chestplate forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 13, STR: 11 }, sellValue: 86,
  },
  sacred_mithril_chestplate: {
    id: 'sacred_mithril_chestplate', name: 'Sacred Mithril Chestplate', type: 'equipment',
    description: 'A dark blue, light-touched chestplate forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 13, SPI: 11 }, sellValue: 86,
  },
  mithril_gauntlets: {
    id: 'mithril_gauntlets', name: 'Mithril Gauntlets', type: 'equipment',
    description: 'A dark blue gauntlets forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 7, STR: 6 }, sellValue: 47,
  },
  sacred_mithril_gauntlets: {
    id: 'sacred_mithril_gauntlets', name: 'Sacred Mithril Gauntlets', type: 'equipment',
    description: 'A dark blue, light-touched gauntlets forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 7, SPI: 6 }, sellValue: 47,
  },
  mithril_bracers: {
    id: 'mithril_bracers', name: 'Mithril Bracers', type: 'equipment',
    description: 'A dark blue bracers forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 7, STR: 6 }, sellValue: 47,
  },
  mithril_legplates: {
    id: 'mithril_legplates', name: 'Mithril Legplates', type: 'equipment',
    description: 'A dark blue legplates forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 12, STR: 10 }, sellValue: 79,
  },
  sacred_mithril_legplates: {
    id: 'sacred_mithril_legplates', name: 'Sacred Mithril Legplates', type: 'equipment',
    description: 'A dark blue, light-touched legplates forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 12, SPI: 10 }, sellValue: 79,
  },
  mithril_greaves: {
    id: 'mithril_greaves', name: 'Mithril Greaves', type: 'equipment',
    description: 'A dark blue greaves forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 8, STR: 6 }, sellValue: 50,
  },
  sacred_mithril_greaves: {
    id: 'sacred_mithril_greaves', name: 'Sacred Mithril Greaves', type: 'equipment',
    description: 'A dark blue, light-touched greaves forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 8, SPI: 6 }, sellValue: 50,
  },
  mithril_shield: {
    id: 'mithril_shield', name: 'Mithril Shield', type: 'equipment',
    description: 'A dark blue shield forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 10, STR: 9 }, sellValue: 68,
  },
  sacred_mithril_shield: {
    id: 'sacred_mithril_shield', name: 'Mithril-Bound Tome', type: 'equipment',
    description: 'A spellbook bound in dark blue Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 10, SPI: 9 }, sellValue: 68,
  },
  mithril_sword: {
    id: 'mithril_sword', name: 'Mithril Sword', type: 'equipment',
    description: 'A dark blue sword forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 17, STA: 9 }, sellValue: 94,
  },
  sacred_mithril_sword: {
    id: 'sacred_mithril_sword', name: 'Sacred Mithril Sword', type: 'equipment',
    description: 'A dark blue, light-touched sword forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 17, SPI: 9 }, sellValue: 94,
  },
  mithril_battleaxe: {
    id: 'mithril_battleaxe', name: 'Mithril Battleaxe', type: 'equipment',
    description: 'A dark blue battleaxe forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 25, STA: 13 }, sellValue: 137,
  },
  sacred_mithril_battleaxe: {
    id: 'sacred_mithril_battleaxe', name: 'Sacred Mithril Battleaxe', type: 'equipment',
    description: 'A dark blue, light-touched battleaxe forged from Mithril by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 25, SPI: 13 }, sellValue: 137,
  },
  thorium_helm: {
    id: 'thorium_helm', name: 'Thorium Helm', type: 'equipment',
    description: 'A light teal helm forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 11, STR: 9 }, sellValue: 76,
  },
  sacred_thorium_helm: {
    id: 'sacred_thorium_helm', name: 'Sacred Thorium Helm', type: 'equipment',
    description: 'A light teal, light-touched helm forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 11, SPI: 9 }, sellValue: 76,
  },
  thorium_chestplate: {
    id: 'thorium_chestplate', name: 'Thorium Chestplate', type: 'equipment',
    description: 'A light teal chestplate forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 15, STR: 13 }, sellValue: 106,
  },
  sacred_thorium_chestplate: {
    id: 'sacred_thorium_chestplate', name: 'Sacred Thorium Chestplate', type: 'equipment',
    description: 'A light teal, light-touched chestplate forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 15, SPI: 13 }, sellValue: 106,
  },
  thorium_gauntlets: {
    id: 'thorium_gauntlets', name: 'Thorium Gauntlets', type: 'equipment',
    description: 'A light teal gauntlets forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 8, STR: 7 }, sellValue: 57,
  },
  sacred_thorium_gauntlets: {
    id: 'sacred_thorium_gauntlets', name: 'Sacred Thorium Gauntlets', type: 'equipment',
    description: 'A light teal, light-touched gauntlets forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 8, SPI: 7 }, sellValue: 57,
  },
  thorium_bracers: {
    id: 'thorium_bracers', name: 'Thorium Bracers', type: 'equipment',
    description: 'A light teal bracers forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 8, STR: 7 }, sellValue: 57,
  },
  thorium_legplates: {
    id: 'thorium_legplates', name: 'Thorium Legplates', type: 'equipment',
    description: 'A light teal legplates forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 14, STR: 11 }, sellValue: 95,
  },
  sacred_thorium_legplates: {
    id: 'sacred_thorium_legplates', name: 'Sacred Thorium Legplates', type: 'equipment',
    description: 'A light teal, light-touched legplates forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 14, SPI: 11 }, sellValue: 95,
  },
  thorium_greaves: {
    id: 'thorium_greaves', name: 'Thorium Greaves', type: 'equipment',
    description: 'A light teal greaves forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 9, STR: 8 }, sellValue: 65,
  },
  sacred_thorium_greaves: {
    id: 'sacred_thorium_greaves', name: 'Sacred Thorium Greaves', type: 'equipment',
    description: 'A light teal, light-touched greaves forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 9, SPI: 8 }, sellValue: 65,
  },
  thorium_shield: {
    id: 'thorium_shield', name: 'Thorium Shield', type: 'equipment',
    description: 'A light teal shield forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 12, STR: 10 }, sellValue: 84,
  },
  sacred_thorium_shield: {
    id: 'sacred_thorium_shield', name: 'Thorium-Rimmed Orb', type: 'equipment',
    description: 'A focusing orb banded in light teal Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 12, SPI: 10 }, sellValue: 84,
  },
  thorium_sword: {
    id: 'thorium_sword', name: 'Thorium Sword', type: 'equipment',
    description: 'A light teal sword forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 20, STA: 11 }, sellValue: 118,
  },
  sacred_thorium_sword: {
    id: 'sacred_thorium_sword', name: 'Sacred Thorium Sword', type: 'equipment',
    description: 'A light teal, light-touched sword forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 20, SPI: 11 }, sellValue: 118,
  },
  thorium_battleaxe: {
    id: 'thorium_battleaxe', name: 'Thorium Battleaxe', type: 'equipment',
    description: 'A light teal battleaxe forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 29, STA: 16 }, sellValue: 171,
  },
  sacred_thorium_battleaxe: {
    id: 'sacred_thorium_battleaxe', name: 'Sacred Thorium Battleaxe', type: 'equipment',
    description: 'A light teal, light-touched battleaxe forged from Thorium by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 29, SPI: 16 }, sellValue: 171,
  },
  obsidian_helm: {
    id: 'obsidian_helm', name: 'Obsidian Helm', type: 'equipment',
    description: 'A black helm forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', statBonuses: { STA: 12, STR: 10 }, sellValue: 88,
  },
  sacred_obsidian_helm: {
    id: 'sacred_obsidian_helm', name: 'Sacred Obsidian Helm', type: 'equipment',
    description: 'A black, light-touched helm forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'helmet', armorType: 'cloth', statBonuses: { INT: 12, SPI: 10 }, sellValue: 88,
  },
  obsidian_chestplate: {
    id: 'obsidian_chestplate', name: 'Obsidian Chestplate', type: 'equipment',
    description: 'A black chestplate forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', statBonuses: { STA: 18, STR: 14 }, sellValue: 128,
  },
  sacred_obsidian_chestplate: {
    id: 'sacred_obsidian_chestplate', name: 'Sacred Obsidian Chestplate', type: 'equipment',
    description: 'A black, light-touched chestplate forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'chest', armorType: 'cloth', statBonuses: { INT: 18, SPI: 14 }, sellValue: 128,
  },
  obsidian_gauntlets: {
    id: 'obsidian_gauntlets', name: 'Obsidian Gauntlets', type: 'equipment',
    description: 'A black gauntlets forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', statBonuses: { STA: 10, STR: 8 }, sellValue: 72,
  },
  sacred_obsidian_gauntlets: {
    id: 'sacred_obsidian_gauntlets', name: 'Sacred Obsidian Gauntlets', type: 'equipment',
    description: 'A black, light-touched gauntlets forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'gloves', armorType: 'cloth', statBonuses: { INT: 10, SPI: 8 }, sellValue: 72,
  },
  obsidian_bracers: {
    id: 'obsidian_bracers', name: 'Obsidian Bracers', type: 'equipment',
    description: 'A black bracers forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'bracers', statBonuses: { STA: 10, STR: 8 }, sellValue: 72,
  },
  obsidian_legplates: {
    id: 'obsidian_legplates', name: 'Obsidian Legplates', type: 'equipment',
    description: 'A black legplates forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', statBonuses: { STA: 16, STR: 13 }, sellValue: 116,
  },
  sacred_obsidian_legplates: {
    id: 'sacred_obsidian_legplates', name: 'Sacred Obsidian Legplates', type: 'equipment',
    description: 'A black, light-touched legplates forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'legs', armorType: 'cloth', statBonuses: { INT: 16, SPI: 13 }, sellValue: 116,
  },
  obsidian_greaves: {
    id: 'obsidian_greaves', name: 'Obsidian Greaves', type: 'equipment',
    description: 'A black greaves forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', statBonuses: { STA: 10, STR: 9 }, sellValue: 76,
  },
  sacred_obsidian_greaves: {
    id: 'sacred_obsidian_greaves', name: 'Sacred Obsidian Greaves', type: 'equipment',
    description: 'A black, light-touched greaves forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'boots', armorType: 'cloth', statBonuses: { INT: 10, SPI: 9 }, sellValue: 76,
  },
  obsidian_shield: {
    id: 'obsidian_shield', name: 'Obsidian Shield', type: 'equipment',
    description: 'A black shield forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', statBonuses: { STA: 14, STR: 12 }, sellValue: 104,
  },
  sacred_obsidian_shield: {
    id: 'sacred_obsidian_shield', name: 'Obsidian-Clasped Tome', type: 'equipment',
    description: 'A spellbook clasped in black Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'offhand', armorType: 'cloth', statBonuses: { INT: 14, SPI: 12 }, sellValue: 104,
  },
  obsidian_sword: {
    id: 'obsidian_sword', name: 'Obsidian Sword', type: 'equipment',
    description: 'A black sword forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 23, STA: 12 }, sellValue: 140,
  },
  sacred_obsidian_sword: {
    id: 'sacred_obsidian_sword', name: 'Sacred Obsidian Sword', type: 'equipment',
    description: 'A black, light-touched sword forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 23, SPI: 12 }, sellValue: 140,
  },
  obsidian_battleaxe: {
    id: 'obsidian_battleaxe', name: 'Obsidian Battleaxe', type: 'equipment',
    description: 'A black battleaxe forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { STR: 33, STA: 18 }, sellValue: 204,
  },
  sacred_obsidian_battleaxe: {
    id: 'sacred_obsidian_battleaxe', name: 'Sacred Obsidian Battleaxe', type: 'equipment',
    description: 'A black, light-touched battleaxe forged from Obsidian by a skilled blacksmith.',
    stackable: true, equipSlot: 'weapon', statBonuses: { INT: 33, SPI: 18 }, sellValue: 204,
  },
  silver_necklace: {
    id: 'silver_necklace', name: 'Silver Necklace', type: 'equipment',
    description: 'A silver necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { STA: 3, STR: 3 }, sellValue: 25,
  },
  sacred_silver_necklace: {
    id: 'sacred_silver_necklace', name: 'Sacred Silver Necklace', type: 'equipment',
    description: 'A silver necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { INT: 3, SPI: 3 }, sellValue: 25,
  },
  silver_ring: {
    id: 'silver_ring', name: 'Silver Ring', type: 'equipment',
    description: 'A silver ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 3, STR: 2 }, sellValue: 21,
  },
  sacred_silver_ring: {
    id: 'sacred_silver_ring', name: 'Sacred Silver Ring', type: 'equipment',
    description: 'A silver ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 3, SPI: 2 }, sellValue: 21,
  },
  gold_necklace: {
    id: 'gold_necklace', name: 'Gold Necklace', type: 'equipment',
    description: 'A gold necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { STA: 7, STR: 5 }, sellValue: 56,
  },
  sacred_gold_necklace: {
    id: 'sacred_gold_necklace', name: 'Sacred Gold Necklace', type: 'equipment',
    description: 'A gold necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { INT: 7, SPI: 5 }, sellValue: 56,
  },
  gold_ring: {
    id: 'gold_ring', name: 'Gold Ring', type: 'equipment',
    description: 'A gold ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 6, STR: 5 }, sellValue: 47,
  },
  sacred_gold_ring: {
    id: 'sacred_gold_ring', name: 'Sacred Gold Ring', type: 'equipment',
    description: 'A gold ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 6, SPI: 5 }, sellValue: 47,
  },
  platinum_necklace: {
    id: 'platinum_necklace', name: 'Platinum Necklace', type: 'equipment',
    description: 'A platinum necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { STA: 9, STR: 7 }, sellValue: 83,
  },
  sacred_platinum_necklace: {
    id: 'sacred_platinum_necklace', name: 'Sacred Platinum Necklace', type: 'equipment',
    description: 'A platinum necklace set with a faintly glowing stone.',
    stackable: true, equipSlot: 'necklace', statBonuses: { INT: 9, SPI: 7 }, sellValue: 83,
  },
  platinum_ring: {
    id: 'platinum_ring', name: 'Platinum Ring', type: 'equipment',
    description: 'A platinum ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { STA: 7, STR: 6 }, sellValue: 68,
  },
  sacred_platinum_ring: {
    id: 'sacred_platinum_ring', name: 'Sacred Platinum Ring', type: 'equipment',
    description: 'A platinum ring set with a faintly glowing stone.',
    stackable: true, equipSlot: 'ring', statBonuses: { INT: 7, SPI: 6 }, sellValue: 68,
  },

};

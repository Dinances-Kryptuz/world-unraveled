import type { ClassId, SpecId } from './classStats';
import type { ProfessionId } from './types';

export type QuestCategory = 'zone' | 'class' | 'profession' | 'daily';

// A deliberately small set of objective shapes — each one maps onto an
// event type real gameplay already produces (a kill, a gather tick, a
// craft tick, an ability use, healing done) rather than inventing new
// tracked state. Any filter field left undefined matches anything of that
// event type — e.g. `{ type: 'kill', count: 100 }` with no monsterId is
// "kill 100 of anything, anywhere," which is exactly what the daily
// quests below want.
export type QuestObjective =
  | { type: 'kill'; monsterId?: string; zoneId?: string; bossOnly?: boolean; count: number }
  | { type: 'gather'; itemId?: string; count: number }
  | { type: 'craft'; itemId?: string; count: number }
  | { type: 'use_ability'; abilityIds: string[]; count: number }
  | { type: 'heal_amount'; count: number };

export interface QuestReward {
  xp?: number;
  gold?: number;
  itemId?: string;
  itemQuantity?: number;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  category: QuestCategory;
  // All objectives must be completed (AND) — most quests below have just
  // one; the profession quests use two (gather, then craft) to match the
  // design doc's own "gather X -> craft Y" example.
  objectives: QuestObjective[];
  rewards: QuestReward;
  // Chain-gating: this quest isn't offered until its predecessor is in
  // completedIds. A whole zone/class chain is just 2-3 quests linked this
  // way, not a separate "chain" data structure.
  prerequisiteQuestId?: string;
  requiredLevel?: number;
  // Class quests only: which class (and optionally which specs within it)
  // this is offered to. Specs matter because some classes' defensive
  // abilities are spec-locked (e.g. Last Stand is Warrior Tank only) —
  // without this a DPS-spec player could get a class quest they can never
  // complete.
  classId?: ClassId;
  requiredSpecs?: SpecId[];
  // Zone quests only: which zone this belongs to. Only offered once that
  // zone is actually unlocked for the character (see questEngine.ts) so a
  // level 1 character never sees a zone-3 quest board entry it can't act on.
  zoneId?: string;
  repeatable?: boolean;
  cooldownHours?: number;
  // Profession quests only: which profession the character must already
  // know for this to be offered — see questEngine.ts's isQuestAvailable.
  // Undefined means "no profession gate" (used by nothing currently, but
  // kept optional rather than required since not every future profession
  // quest need be gated this narrowly).
  profession?: ProfessionId;
}

// "Keep active quests relatively limited... so the player does not have a
// massive checklist" — design doc.
export const MAX_ACTIVE_QUESTS = 8;

export const DEFAULT_DAILY_COOLDOWN_HOURS = 20;

export const QUESTS: Record<string, QuestDef> = {
  // ── Greenhollow Fields ──────────────────────────────────────────────
  // Hares first, not boars — a level-1 character starting completely
  // unequipped is badly overmatched by the Greenhorn Boar's level-3
  // canonical level (see the early-game balance pass); the Thornback Hare
  // is the zone's actual level-1-appropriate target, so it opens the chain.
  greenhollow_hares: {
    id: 'greenhollow_hares',
    name: 'Hares of Greenhollow',
    category: 'zone',
    zoneId: 'greenhollow_fields',
    description: 'Thornback Hares are stripping the fields bare. Cull a few.',
    objectives: [{ type: 'kill', monsterId: 'thornback_hare', count: 15 }],
    rewards: { xp: 100, gold: 8 },
  },
  greenhollow_boars: {
    id: 'greenhollow_boars',
    name: 'Boars of Greenhollow',
    category: 'zone',
    zoneId: 'greenhollow_fields',
    description: 'Greenhorn Boars have been trampling the fields. Thin their numbers.',
    objectives: [{ type: 'kill', monsterId: 'greenhorn_boar', count: 15 }],
    rewards: { xp: 200, gold: 15 },
    prerequisiteQuestId: 'greenhollow_hares',
  },
  greenhollow_wolves: {
    id: 'greenhollow_wolves',
    name: 'Wolves at the Door',
    category: 'zone',
    zoneId: 'greenhollow_fields',
    description: 'Forest Wolves are growing bolder by the day. Drive them back.',
    objectives: [{ type: 'kill', monsterId: 'forest_wolf', count: 12 }],
    rewards: { xp: 350, gold: 25 },
    prerequisiteQuestId: 'greenhollow_boars',
  },
  greenhollow_chieftain: {
    id: 'greenhollow_chieftain',
    name: 'The Kobold Chieftain',
    category: 'zone',
    zoneId: 'greenhollow_fields',
    description: 'The Kobold Chieftain leads the raids on Greenhollow from his warren. End him.',
    objectives: [{ type: 'kill', monsterId: 'kobold_chieftain', count: 1 }],
    rewards: { xp: 600, gold: 50, itemId: 'health_potion', itemQuantity: 5 },
    prerequisiteQuestId: 'greenhollow_wolves',
  },

  // ── Stonecrag Foothills ───────────────────────────────────────────────
  stonecrag_jackals: {
    id: 'stonecrag_jackals',
    name: 'Jackals of the Ridge',
    category: 'zone',
    zoneId: 'stonecrag_foothills',
    description: 'Ridge Jackals harass travelers on the lower trails. Cull the pack.',
    objectives: [{ type: 'kill', monsterId: 'ridge_jackal', count: 15 }],
    rewards: { xp: 900, gold: 40 },
  },
  stonecrag_goats: {
    id: 'stonecrag_goats',
    name: 'Goat Culling',
    category: 'zone',
    zoneId: 'stonecrag_foothills',
    description: 'Craggy Goats have overrun the higher slopes.',
    objectives: [{ type: 'kill', monsterId: 'craggy_goat', count: 12 }],
    rewards: { xp: 1400, gold: 60 },
    prerequisiteQuestId: 'stonecrag_jackals',
  },
  stonecrag_warlord: {
    id: 'stonecrag_warlord',
    name: 'The Alpha Warlord',
    category: 'zone',
    zoneId: 'stonecrag_foothills',
    description: 'The Alpha Warlord commands the wolf packs from the Stonecrag Depths. Defeat it.',
    objectives: [{ type: 'kill', monsterId: 'alpha_warlord', count: 1 }],
    rewards: { xp: 2500, gold: 120, itemId: 'sage_healing_potion', itemQuantity: 5 },
    prerequisiteQuestId: 'stonecrag_goats',
  },

  // ── Emberfall Ridge ───────────────────────────────────────────────────
  emberfall_wolves: {
    id: 'emberfall_wolves',
    name: 'Cinder Wolves',
    category: 'zone',
    zoneId: 'emberfall_ridge',
    description: 'Cinder Wolves prowl the lower ridge, drawn in by the old forge fires.',
    objectives: [{ type: 'kill', monsterId: 'cinder_wolf', count: 15 }],
    rewards: { xp: 4000, gold: 90 },
  },
  emberfall_marauders: {
    id: 'emberfall_marauders',
    name: 'Marauders of the Ridge',
    category: 'zone',
    zoneId: 'emberfall_ridge',
    description: 'Ridgeback Marauders raid the upper trails for anything they can carry.',
    objectives: [{ type: 'kill', monsterId: 'ridgeback_marauder', count: 12 }],
    rewards: { xp: 6000, gold: 140 },
    prerequisiteQuestId: 'emberfall_wolves',
  },
  emberfall_kaldrun: {
    id: 'emberfall_kaldrun',
    name: 'Forgemaster Kaldrun',
    category: 'zone',
    zoneId: 'emberfall_ridge',
    description: 'Forgemaster Kaldrun has claimed the Sundered Forge for himself. Put an end to that.',
    objectives: [{ type: 'kill', monsterId: 'forgemaster_kaldrun', count: 1 }],
    rewards: { xp: 10000, gold: 300, itemId: 'sunpetal_elixir', itemQuantity: 5 },
    prerequisiteQuestId: 'emberfall_marauders',
  },

  // ── Cinderfall Depths ──────────────────────────────────────────────────
  cinderfall_wraiths: {
    id: 'cinderfall_wraiths',
    name: 'Wraiths of the Deep',
    category: 'zone',
    zoneId: 'cinderfall_depths',
    description: 'Ash Wraiths drift through the buried tunnels, drawn by anything still living.',
    objectives: [{ type: 'kill', monsterId: 'ash_wraith', count: 15 }],
    rewards: { xp: 16000, gold: 400 },
  },
  cinderfall_scavengers: {
    id: 'cinderfall_scavengers',
    name: 'Scavengers of Cinderfall',
    category: 'zone',
    zoneId: 'cinderfall_depths',
    description: 'Cinder Scavengers pick through the ruins for anything of value — including you.',
    objectives: [{ type: 'kill', monsterId: 'cinder_scavenger', count: 12 }],
    rewards: { xp: 22000, gold: 550 },
    prerequisiteQuestId: 'cinderfall_wraiths',
  },
  cinderfall_overseer: {
    id: 'cinderfall_overseer',
    name: 'The Ashen Overseer',
    category: 'zone',
    zoneId: 'cinderfall_depths',
    description: 'The Ashen Overseer still runs the Buried Foundry as if the city above it never fell. End its watch.',
    objectives: [{ type: 'kill', monsterId: 'ashen_overseer', count: 1 }],
    rewards: { xp: 32000, gold: 900, itemId: 'emberpetal_tonic', itemQuantity: 5 },
    prerequisiteQuestId: 'cinderfall_scavengers',
  },

  // ── The Molten Scar ────────────────────────────────────────────────────
  molten_scar_cultists: {
    id: 'molten_scar_cultists',
    name: 'Cultists of the Rift',
    category: 'zone',
    zoneId: 'molten_scar',
    description: 'Cultists gather at the rift’s edge, worshipping a power that hasn’t stirred in ages.',
    objectives: [{ type: 'kill', monsterId: 'cultist_adept', count: 15 }],
    rewards: { xp: 45000, gold: 1200 },
  },
  molten_scar_embers: {
    id: 'molten_scar_embers',
    name: 'Living Embers',
    category: 'zone',
    zoneId: 'molten_scar',
    description: 'Living Embers spill from the rift itself, hungry for fuel.',
    objectives: [{ type: 'kill', monsterId: 'living_ember', count: 12 }],
    rewards: { xp: 60000, gold: 1600 },
    prerequisiteQuestId: 'molten_scar_cultists',
  },
  molten_scar_herald: {
    id: 'molten_scar_herald',
    name: 'The Molten Herald',
    category: 'zone',
    zoneId: 'molten_scar',
    description: 'The Molten Herald commands the Scarred Sanctum in the name of a power still sleeping below. Silence it.',
    objectives: [{ type: 'kill', monsterId: 'molten_herald', count: 1 }],
    rewards: { xp: 85000, gold: 2400, itemId: 'cinderbloom_elixir', itemQuantity: 5 },
    prerequisiteQuestId: 'molten_scar_embers',
  },

  // ── Cinderheart Crater ─────────────────────────────────────────────────
  cinderheart_cultists: {
    id: 'cinderheart_cultists',
    name: 'Devoted of the Crater',
    category: 'zone',
    zoneId: 'cinderheart_crater',
    description: 'The Emberlord’s most devoted cultists have made the crater’s rim their home.',
    objectives: [{ type: 'kill', monsterId: 'emberlord_cultist', count: 15 }],
    rewards: { xp: 110000, gold: 3200 },
  },
  cinderheart_walkers: {
    id: 'cinderheart_walkers',
    name: 'Flamewalkers',
    category: 'zone',
    zoneId: 'cinderheart_crater',
    description: 'Flamewalkers stride the crater freely, answering to something ancient and patient.',
    objectives: [{ type: 'kill', monsterId: 'flamewalker', count: 12 }],
    rewards: { xp: 150000, gold: 4200 },
    prerequisiteQuestId: 'cinderheart_cultists',
  },
  cinderheart_pyraxis: {
    id: 'cinderheart_pyraxis',
    name: 'Warden of the Cinderheart',
    category: 'zone',
    zoneId: 'cinderheart_crater',
    description: 'Pyraxis guards the path into the crater’s heart. What waits beyond is a problem for another day — first, it must fall.',
    objectives: [{ type: 'kill', monsterId: 'pyraxis', count: 1 }],
    rewards: { xp: 220000, gold: 6000, itemId: 'emberheart_potion', itemQuantity: 5 },
    prerequisiteQuestId: 'cinderheart_walkers',
  },

  // ── Class quests ──────────────────────────────────────────────────────
  // Warrior Tank: Last Stand is spec-locked, so this chain is too.
  warrior_tank_shield_and_steel: {
    id: 'warrior_tank_shield_and_steel',
    name: 'Shield and Steel',
    category: 'class',
    classId: 'warrior',
    requiredSpecs: ['warrior_tank'],
    description: 'A warrior who never guards is a warrior who never lasts. Use Last Stand in combat.',
    objectives: [{ type: 'use_ability', abilityIds: ['warrior_tank_last_stand'], count: 10 }],
    rewards: { xp: 300, gold: 20 },
  },
  warrior_tank_resolve: {
    id: 'warrior_tank_resolve',
    name: "Warrior's Resolve",
    category: 'class',
    classId: 'warrior',
    requiredSpecs: ['warrior_tank'],
    description: 'Make defensive discipline second nature.',
    objectives: [{ type: 'use_ability', abilityIds: ['warrior_tank_last_stand'], count: 30 }],
    rewards: { xp: 800, gold: 50 },
    prerequisiteQuestId: 'warrior_tank_shield_and_steel',
  },
  // Warrior DPS: Execute is spec-locked, so this chain is too.
  warrior_dps_bloodlust: {
    id: 'warrior_dps_bloodlust',
    name: 'Finishing Blow',
    category: 'class',
    classId: 'warrior',
    requiredSpecs: ['warrior_dps'],
    description: 'Cut down wounded enemies before they can flee. Use Execute in combat.',
    objectives: [{ type: 'use_ability', abilityIds: ['warrior_dps_execute'], count: 10 }],
    rewards: { xp: 300, gold: 20 },
  },
  warrior_dps_relentless: {
    id: 'warrior_dps_relentless',
    name: 'Relentless',
    category: 'class',
    classId: 'warrior',
    requiredSpecs: ['warrior_dps'],
    description: 'Leave nothing standing.',
    objectives: [{ type: 'use_ability', abilityIds: ['warrior_dps_execute'], count: 30 }],
    rewards: { xp: 800, gold: 50 },
    prerequisiteQuestId: 'warrior_dps_bloodlust',
  },
  // Priest: heal_amount counts Holy's real heals AND Shadow's healFrac
  // self-sustain, so both specs can complete this without splitting it.
  priest_healing_hands: {
    id: 'priest_healing_hands',
    name: 'Healing Hands',
    category: 'class',
    classId: 'priest',
    description: 'Restore health in combat to prove your calling.',
    objectives: [{ type: 'heal_amount', count: 500 }],
    rewards: { xp: 300, gold: 20 },
  },
  priest_calling: {
    id: 'priest_calling',
    name: "A Priest's Calling",
    category: 'class',
    classId: 'priest',
    description: 'Continue your training in the healing arts.',
    objectives: [{ type: 'heal_amount', count: 2000 }],
    rewards: { xp: 800, gold: 50 },
    prerequisiteQuestId: 'priest_healing_hands',
  },
  // Paladin: Blessing of Protection is class-wide (not spec-locked), so
  // both specs can complete this without splitting it either.
  paladin_divine_protection: {
    id: 'paladin_divine_protection',
    name: 'Divine Protection',
    category: 'class',
    classId: 'paladin',
    description: 'Call upon your defensive gifts in the heat of battle.',
    objectives: [{ type: 'use_ability', abilityIds: ['paladin_blessing_of_protection', 'prot_paladin_divine_shield'], count: 10 }],
    rewards: { xp: 300, gold: 20 },
  },
  paladin_guardians_oath: {
    id: 'paladin_guardians_oath',
    name: "Guardian's Oath",
    category: 'class',
    classId: 'paladin',
    description: 'A true guardian protects without hesitation.',
    objectives: [{ type: 'use_ability', abilityIds: ['paladin_blessing_of_protection', 'prot_paladin_divine_shield'], count: 30 }],
    rewards: { xp: 800, gold: 50 },
    prerequisiteQuestId: 'paladin_divine_protection',
  },

  // ── Profession quests — "gather X, craft Y" per the design doc's own
  // example, one per production profession. Rewards are deliberately
  // modest (this is a tutorial nudge, not an endgame reward). ────────────
  profession_leatherworking: {
    id: 'profession_leatherworking',
    name: 'Hide and Seam',
    category: 'profession',
    profession: 'leatherworking',
    description: 'Gather leather scraps and work them into Light Leather.',
    objectives: [
      { type: 'gather', itemId: 'leather_scraps', count: 10 },
      { type: 'craft', itemId: 'light_leather', count: 5 },
    ],
    rewards: { xp: 100, gold: 10 },
  },
  profession_smithing: {
    id: 'profession_smithing',
    name: 'Ore to Bar',
    category: 'profession',
    profession: 'smithing',
    description: 'Mine copper ore and smelt it into bars.',
    objectives: [
      { type: 'gather', itemId: 'copper_ore', count: 10 },
      { type: 'craft', itemId: 'copper_bar', count: 5 },
    ],
    rewards: { xp: 100, gold: 10 },
  },
  profession_tailoring: {
    id: 'profession_tailoring',
    name: 'First Stitches',
    category: 'profession',
    profession: 'tailoring',
    description: 'Prove your skill at the loom with your first robe.',
    objectives: [{ type: 'craft', itemId: 'linen_robe', count: 1 }],
    rewards: { xp: 100, gold: 10 },
  },
  profession_alchemy: {
    id: 'profession_alchemy',
    name: 'A Simple Brew',
    category: 'profession',
    profession: 'alchemy',
    description: 'Gather peacebloom and brew your first healing draughts.',
    objectives: [
      { type: 'gather', itemId: 'peacebloom', count: 10 },
      { type: 'craft', itemId: 'minor_healing_draught', count: 3 },
    ],
    rewards: { xp: 100, gold: 10 },
  },

  // ── "The Lost Forge" — Blacksmithing's profession quest chain, per the
  // design brief's "profession quest chains... can teach unique recipes"
  // requirement. Not required for ordinary Blacksmithing progression
  // (nothing about leveling the skill depends on it) — purely a bonus
  // path to a recipe you can't get any other way. Set in the Molten
  // Scar/Cinderheart Crater (zones 5-6), where the brief asks for
  // "additional rare recipe rewards."
  forge_apprentice_trial: {
    id: 'forge_apprentice_trial',
    name: 'The Lost Forge: Apprentice Trial',
    category: 'profession',
    profession: 'smithing',
    requiredLevel: 40,
    description: 'A journeyman smith in the Molten Scar wants proof you can turn ore into something useful. Smelt Brimstone Bars.',
    objectives: [{ type: 'craft', itemId: 'brimstone_bar', count: 10 }],
    rewards: { xp: 300, gold: 20 },
  },
  forge_journeyman_trial: {
    id: 'forge_journeyman_trial',
    name: 'The Lost Forge: Journeyman Trial',
    category: 'profession',
    profession: 'smithing',
    prerequisiteQuestId: 'forge_apprentice_trial',
    requiredLevel: 40,
    description: 'Dig deeper. The old forge’s formula is said to need a mountain of brimstone ore to even attempt.',
    objectives: [{ type: 'gather', itemId: 'brimstone_ore', count: 20 }],
    rewards: { xp: 400, gold: 30 },
  },
  forge_master_trial: {
    id: 'forge_master_trial',
    name: 'The Lost Forge: Master Trial',
    category: 'profession',
    profession: 'smithing',
    prerequisiteQuestId: 'forge_journeyman_trial',
    requiredLevel: 48,
    description: 'The formula is sealed behind the Molten Herald itself. Bring it down to claim what it guards.',
    objectives: [{ type: 'kill', monsterId: 'molten_herald', bossOnly: true, count: 1 }],
    rewards: { xp: 600, gold: 50, itemId: 'formula_emberforged_gauntlets', itemQuantity: 1 },
  },

  // ── Dailies — simple, repeatable, deliberately not click-heavy. ───────
  daily_slaughter: {
    id: 'daily_slaughter',
    name: 'Daily Slaughter',
    category: 'daily',
    repeatable: true,
    cooldownHours: DEFAULT_DAILY_COOLDOWN_HOURS,
    description: 'Defeat 100 enemies, anywhere.',
    objectives: [{ type: 'kill', count: 100 }],
    rewards: { xp: 500, gold: 40 },
  },
  daily_gathering: {
    id: 'daily_gathering',
    name: 'Daily Gathering',
    category: 'daily',
    repeatable: true,
    cooldownHours: DEFAULT_DAILY_COOLDOWN_HOURS,
    description: 'Gather 50 materials, of any kind.',
    objectives: [{ type: 'gather', count: 50 }],
    rewards: { xp: 400, gold: 30 },
  },
  daily_crafting: {
    id: 'daily_crafting',
    name: 'Daily Crafting',
    category: 'daily',
    repeatable: true,
    cooldownHours: DEFAULT_DAILY_COOLDOWN_HOURS,
    description: 'Craft 5 items, of any kind.',
    objectives: [{ type: 'craft', count: 5 }],
    rewards: { xp: 400, gold: 30 },
  },
  daily_boss_hunter: {
    id: 'daily_boss_hunter',
    name: 'Boss Hunter',
    category: 'daily',
    repeatable: true,
    cooldownHours: DEFAULT_DAILY_COOLDOWN_HOURS,
    description: 'Defeat a boss, anywhere.',
    objectives: [{ type: 'kill', bossOnly: true, count: 1 }],
    rewards: { xp: 1200, gold: 80 },
  },
};

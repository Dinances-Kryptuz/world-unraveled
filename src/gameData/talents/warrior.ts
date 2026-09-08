import type { TalentTree } from './types';

export const WARRIOR_DPS_TALENTS: TalentTree = [
  {
    level: 5,
    damage: { name: 'Sharpened Steel', description: '+5% damage', effect: { kind: 'flat_dmg', params: [5] } },
    survival: { name: 'Iron Hide', description: '+6% armor', effect: { kind: 'armor_mult', params: [6] } },
    support: { name: 'Battle Cry', description: 'Party damage +2%', effect: { kind: 'flat_dmg', params: [1] } },
  },
  {
    level: 10,
    damage: { name: 'Brutal Strikes', description: '+8% damage against enemies above 75% HP', effect: { kind: 'above_hp', params: [75, 8] } },
    survival: { name: 'Second Wind', description: 'Restore 2% max HP after a kill', effect: { kind: 'passive_heal_add', params: [0.4] } },
    support: { name: 'Rallying Presence', description: 'Party max HP +4%', effect: { kind: 'hp_mult', params: [2] } },
  },
  {
    level: 15,
    damage: { name: 'Executioner', description: '+12% damage against enemies below 30% HP', effect: { kind: 'below_hp', params: [30, 12] } },
    survival: { name: 'Defensive Stance', description: 'Damage taken -6%', effect: { kind: 'flat_dmg_taken', params: [6] } },
    support: { name: 'Intimidating Shout', description: 'Enemies deal 4% less damage to party', effect: { kind: 'flat_dmg_taken', params: [2] } },
  },
  {
    level: 20,
    damage: { name: 'Weapon Mastery', description: '+8% base damage', effect: { kind: 'flat_dmg', params: [8] } },
    survival: { name: 'Heavy Armor', description: '+10% armor effectiveness', effect: { kind: 'armor_mult', params: [10] } },
    support: { name: 'Commanding Voice', description: 'Party accuracy +3%', effect: { kind: 'dead', params: [], note: 'No solo analog for accuracy buffs' } },
  },
  {
    level: 25,
    damage: { name: 'Bloodlust', description: '+8% damage while below 50% HP', effect: { kind: 'self_below_hp_dmg', params: [50, 8] } },
    survival: { name: 'Last Stand', description: 'Once/fight, lethal damage leaves you at 10% HP', effect: { kind: 'once_per_fight', params: [], note: 'Survive lethal at 10% HP' } },
    support: { name: 'War Banner', description: 'Party damage +4%', effect: { kind: 'flat_dmg', params: [2] } },
  },
  {
    level: 30,
    damage: { name: 'Whirlwind', description: 'Every 5th attack deals +40% damage', effect: { kind: 'every_n', params: [5, 40] } },
    survival: { name: 'Shield Wall', description: 'Every 10th incoming attack deals 50% less damage', effect: { kind: 'flat_dmg_taken', params: [5] } },
    support: { name: 'Battlefield Leader', description: 'Party attack speed +3%', effect: { kind: 'flat_dmg', params: [1.5] } },
  },
  {
    level: 35,
    damage: { name: 'Overpower', description: '10% chance to deal 2x damage', effect: { kind: 'chance_mult', params: [0.1, 100] } },
    survival: { name: 'Unbreakable', description: 'Healing received +15%', effect: { kind: 'dead', params: [], note: 'Warrior has no self-heal source to amplify' } },
    support: { name: 'Protective Instinct', description: 'Redirect 5% ally damage to yourself', effect: { kind: 'dead', params: [], note: 'No ally to redirect from when solo' } },
  },
  {
    level: 40,
    damage: { name: 'Frenzy', description: 'Consecutive attacks increase damage up to 12%', effect: { kind: 'ramp', params: [12] } },
    survival: { name: 'Juggernaut', description: 'Damage taken -5% above 75% HP', effect: { kind: 'self_below_hp_mitigation', params: [25, 5] } },
    support: { name: 'Rally', description: 'Party regenerates 0.5% max HP/sec', effect: { kind: 'passive_heal_add', params: [0.25] } },
  },
  {
    level: 45,
    damage: { name: 'Deep Wounds', description: 'Attacks deal an additional 3% damage over 6 sec', effect: { kind: 'flat_dmg', params: [3] } },
    survival: { name: 'Adrenaline', description: 'Damage taken -10% below 30% HP', effect: { kind: 'self_below_hp_mitigation', params: [30, 10] } },
    support: { name: 'War Leader', description: "Party damage +5% against your target", effect: { kind: 'flat_dmg', params: [2.5] } },
  },
  {
    level: 50,
    damage: { name: 'Relentless', description: 'Killing an enemy reduces next attack timer by 50%', effect: { kind: 'flat_dmg', params: [5] } },
    survival: { name: 'Indomitable', description: 'Once/fight remove 50% of DoT damage', effect: { kind: 'once_per_fight', params: [], note: 'Remove 50% of DoT damage once per fight' } },
    support: { name: 'Mass Rally', description: 'Party max HP +8% for first 30 sec', effect: { kind: 'hp_mult', params: [4] } },
  },
  {
    level: 55,
    damage: { name: 'Deathblow', description: '+75% damage against enemies below 15% HP', effect: { kind: 'below_hp', params: [15, 75] } },
    survival: { name: "Titan's Resolve", description: '+15% survivability', effect: { kind: 'surv_coef_mult', params: [15] } },
    support: { name: 'Heroic Sacrifice', description: 'Absorb 10% of party damage', effect: { kind: 'dead', params: [], note: 'No party to absorb damage from when solo' } },
  },
  {
    level: 60,
    damage: { name: 'Berserker', description: '+18% damage, +8% damage taken', effect: { kind: 'flat_dmg', params: [18] } },
    survival: { name: 'Living Fortress', description: '+22% survivability', effect: { kind: 'surv_coef_mult', params: [22] } },
    support: { name: 'Avatar of War', description: 'Party +8% damage and +8% survivability', effect: { kind: 'flat_dmg', params: [4] } },
  },
];
export const WARRIOR_DPS_EXTRA_DMG_TAKEN_AT_60 = 8;

export const WARRIOR_TANK_TALENTS: TalentTree = [
  {
    level: 5,
    damage: { name: 'Shield Bash', description: '+6% damage', effect: { kind: 'flat_dmg', params: [6] } },
    survival: { name: 'Ironwall', description: '+7% armor', effect: { kind: 'armor_mult', params: [7] } },
    support: { name: "Guardian's Presence", description: 'Party damage taken -2%', effect: { kind: 'flat_dmg_taken', params: [1] } },
  },
  {
    level: 10,
    damage: { name: 'Heavy Swing', description: '+8% damage', effect: { kind: 'flat_dmg', params: [8] } },
    survival: { name: 'Fortified', description: '+7% max HP', effect: { kind: 'hp_mult', params: [7] } },
    support: { name: 'Taunt Mastery', description: 'Enemies deal 3% more damage to you and 3% less to allies', effect: { kind: 'dead', params: [], note: 'Taunt mechanics require actual party threat, no solo analog' } },
  },
  {
    level: 15,
    damage: { name: 'Counterattack', description: '12% chance to deal 50% attack damage after being hit', effect: { kind: 'chance_mult', params: [0.12, 50] } },
    survival: { name: 'Bulwark', description: '+8% mitigation', effect: { kind: 'flat_dmg_taken', params: [8] } },
    support: { name: 'Bodyguard', description: 'Redirect 4% ally damage to yourself', effect: { kind: 'dead', params: [], note: 'No ally to redirect from when solo' } },
  },
  {
    level: 20,
    damage: { name: 'Crushing Blow', description: '+10% damage against high-armor enemies', effect: { kind: 'flat_dmg', params: [10] } },
    survival: { name: 'Stone Skin', description: 'Damage taken -7%', effect: { kind: 'flat_dmg_taken', params: [7] } },
    support: { name: 'Commanding Shout', description: 'Party max HP +4%', effect: { kind: 'hp_mult', params: [2] } },
  },
  {
    level: 25,
    damage: { name: 'Shield Slam', description: 'Every 5th attack +40% damage', effect: { kind: 'every_n', params: [5, 40] } },
    survival: { name: 'Last Bastion', description: 'Damage taken -15% below 30% HP', effect: { kind: 'self_below_hp_mitigation', params: [30, 15] } },
    support: { name: 'Defensive Formation', description: 'Party damage taken -4%', effect: { kind: 'flat_dmg_taken', params: [2] } },
  },
  {
    level: 30,
    damage: { name: 'Revenge', description: 'Damage increases 3% after each recent hit, up to 15%', effect: { kind: 'ramp', params: [15] } },
    survival: { name: 'Unyielding', description: 'Healing received +15%', effect: { kind: 'dead', params: [], note: 'Warrior Tank has no self-heal source to amplify' } },
    support: { name: 'Shared Fortitude', description: 'Party armor +7%', effect: { kind: 'armor_mult', params: [3.5] } },
  },
  {
    level: 35,
    damage: { name: 'Retaliation', description: 'Reflect 8% incoming damage', effect: { kind: 'flat_dmg', params: [4] } },
    survival: { name: 'Immovable', description: 'Avoidance +4%', effect: { kind: 'avoidance_add', params: [4] } },
    support: { name: 'Intervene', description: 'Redirect 8% strongest ally damage to you', effect: { kind: 'dead', params: [], note: 'No ally to redirect from when solo' } },
  },
  {
    level: 40,
    damage: { name: 'War Machine', description: '+12% damage above 75% HP', effect: { kind: 'self_below_hp_dmg', params: [75, 12] } },
    survival: { name: 'Adamant', description: '+12% armor effectiveness', effect: { kind: 'armor_mult', params: [12] } },
    support: { name: 'Protector', description: 'Weakest ally damage taken -5%', effect: { kind: 'flat_dmg_taken', params: [2.5] } },
  },
  {
    level: 45,
    damage: { name: 'Punishing Blow', description: '+15% damage after mitigating an attack', effect: { kind: 'flat_dmg', params: [7.5] } },
    survival: { name: 'Never Yield', description: 'Once/fight, lethal damage leaves you at 5% HP', effect: { kind: 'once_per_fight', params: [], note: 'Survive lethal at 5% HP' } },
    support: { name: 'Mass Intervene', description: 'Party damage taken -4%', effect: { kind: 'flat_dmg_taken', params: [2] } },
  },
  {
    level: 50,
    damage: { name: 'Aggressive Guard', description: 'Successful mitigation gives +3% damage, stacking 5x', effect: { kind: 'flat_dmg', params: [7.5] } },
    survival: { name: 'Unbreakable Will', description: 'Damage taken -10% below 25% HP', effect: { kind: 'self_below_hp_mitigation', params: [25, 10] } },
    support: { name: 'Guardian Aura', description: 'Party survivability +6%', effect: { kind: 'surv_coef_mult', params: [3] } },
  },
  {
    level: 55,
    damage: { name: 'Juggernaut', description: '+15% damage above 50% HP', effect: { kind: 'self_below_hp_dmg', params: [50, 15] } },
    survival: { name: "Titan's Armor", description: '+18% survivability', effect: { kind: 'surv_coef_mult', params: [18] } },
    support: { name: 'Sacrificial Guard', description: 'Absorb 15% party damage', effect: { kind: 'dead', params: [], note: 'No party to absorb damage from when solo' } },
  },
  {
    level: 60,
    damage: { name: 'Warbringer', description: '+18% damage', effect: { kind: 'flat_dmg', params: [18] } },
    survival: { name: 'Immortal Bastion', description: '+25% survivability', effect: { kind: 'surv_coef_mult', params: [25] } },
    support: { name: 'Living Shield', description: 'Party damage taken -10% while you live', effect: { kind: 'flat_dmg_taken', params: [5] } },
  },
];

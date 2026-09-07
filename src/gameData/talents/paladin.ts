import type { TalentTree } from './types';

export const PROT_PALADIN_TALENTS: TalentTree = [
  {
    level: 5,
    damage: { name: 'Holy Strike', description: '+6% damage', effect: { kind: 'flat_dmg', params: [6] } },
    survival: { name: 'Blessed Armor', description: '+7% armor', effect: { kind: 'armor_mult', params: [7] } },
    support: { name: 'Devotion Aura', description: 'Party armor +4%', effect: { kind: 'armor_mult', params: [2] } },
  },
  {
    level: 10,
    damage: { name: 'Judgment', description: 'Every 8th attack +35% damage', effect: { kind: 'every_n', params: [8, 35] } },
    survival: { name: 'Divine Bulwark', description: '+7% mitigation', effect: { kind: 'flat_dmg_taken', params: [7] } },
    support: { name: 'Blessing of Protection', description: 'Ally damage taken -10%', effect: { kind: 'dead', params: [], note: 'No ally to protect when solo' } },
  },
  {
    level: 15,
    damage: { name: 'Shield of Faith', description: '+8% damage above 75% HP', effect: { kind: 'self_below_hp_dmg', params: [75, 8] } },
    survival: { name: 'Sacred Shield', description: 'Absorb 5% max HP every 15 attacks', effect: { kind: 'flat_dmg_taken', params: [3.3] } },
    support: { name: "Light's Guardian", description: 'Party damage taken -3%', effect: { kind: 'flat_dmg_taken', params: [1.5] } },
  },
  {
    level: 20,
    damage: { name: 'Consecration', description: 'Every 10th attack +40% damage', effect: { kind: 'every_n', params: [10, 40] } },
    survival: { name: 'Unbreakable Faith', description: '+7% max HP', effect: { kind: 'hp_mult', params: [7] } },
    support: { name: 'Blessing of Might', description: 'Party damage +4%', effect: { kind: 'flat_dmg', params: [2] } },
  },
  {
    level: 25,
    damage: { name: 'Holy Retribution', description: 'After taking damage, next attack +50%', effect: { kind: 'flat_dmg', params: [10] } },
    survival: { name: 'Ardent Defender', description: 'Once/fight survive lethal damage at 10% HP', effect: { kind: 'once_per_fight', params: [], note: 'Survive lethal at 10% HP' } },
    support: { name: 'Aura Mastery', description: "Party defensive effects +15% stronger", effect: { kind: 'flat_dmg_taken', params: [2] } },
  },
  {
    level: 30,
    damage: { name: "Crusader's Strike", description: 'Every 5th attack +45% damage', effect: { kind: 'every_n', params: [5, 45] } },
    survival: { name: "Guardian's Shield", description: 'Mitigation +10%', effect: { kind: 'flat_dmg_taken', params: [10] } },
    support: { name: 'Beacon of Protection', description: 'Redirect 5% ally damage to yourself', effect: { kind: 'dead', params: [], note: 'No ally to redirect from when solo' } },
  },
  {
    level: 35,
    damage: { name: "Avenger's Shield", description: 'Every 8th attack +60% damage', effect: { kind: 'every_n', params: [8, 60] } },
    survival: { name: 'Divine Guardian', description: 'Damage taken -10%', effect: { kind: 'flat_dmg_taken', params: [10] } },
    support: { name: 'Blessing of Kings', description: 'Party +5% core stats', effect: { kind: 'flat_dmg', params: [2.5] } },
  },
  {
    level: 40,
    damage: { name: 'Sacred Wrath', description: '+10% damage above 75% HP', effect: { kind: 'self_below_hp_dmg', params: [75, 10] } },
    survival: { name: 'Bulwark of Light', description: '20% healing received becomes shield', effect: { kind: 'flat_dmg_taken', params: [2] } },
    support: { name: 'Holy Ground', description: 'Party regenerates 0.4% max HP/sec', effect: { kind: 'passive_heal_add', params: [0.2] } },
  },
  {
    level: 45,
    damage: { name: 'Hammer of Justice', description: '+15% damage below 30% enemy HP', effect: { kind: 'below_hp', params: [30, 15] } },
    survival: { name: 'Righteous Defense', description: 'Damage taken -8% below 50% HP', effect: { kind: 'self_below_hp_mitigation', params: [50, 8] } },
    support: { name: 'Hand of Sacrifice', description: 'Absorb 10% ally damage', effect: { kind: 'dead', params: [], note: 'No ally to absorb damage from when solo' } },
  },
  {
    level: 50,
    damage: { name: 'Shield of Righteous', description: 'Every 12th attack +100% damage', effect: { kind: 'every_n', params: [12, 100] } },
    survival: { name: 'Divine Protection', description: 'Every 20 attacks, next 3 attacks deal 40% less damage', effect: { kind: 'flat_dmg_taken', params: [3] } },
    support: { name: 'Aura of Resolve', description: 'Party damage taken -5%', effect: { kind: 'flat_dmg_taken', params: [2.5] } },
  },
  {
    level: 55,
    damage: { name: 'Crusader', description: '+15% damage', effect: { kind: 'flat_dmg', params: [15] } },
    survival: { name: 'Holy Bastion', description: '+18% survivability', effect: { kind: 'surv_coef_mult', params: [18] } },
    support: { name: 'Grand Protector', description: "Party damage taken -8% while you're above 50% HP", effect: { kind: 'flat_dmg_taken', params: [4] } },
  },
  {
    level: 60,
    damage: { name: 'Avenging Guardian', description: '+20% damage', effect: { kind: 'flat_dmg', params: [20] } },
    survival: { name: 'Aegis of Light', description: '+25% survivability', effect: { kind: 'surv_coef_mult', params: [25] } },
    support: { name: 'Avatar of Protection', description: 'Party damage taken -12%, max HP +10%', effect: { kind: 'flat_dmg_taken', params: [6] } },
  },
];

export const HOLY_PALADIN_TALENTS: TalentTree = [
  {
    level: 5,
    damage: { name: 'Holy Power', description: '+5% damage', effect: { kind: 'flat_dmg', params: [5] } },
    survival: { name: 'Blessed Resilience', description: '+6% survivability', effect: { kind: 'surv_coef_mult', params: [6] } },
    support: { name: 'Healing Light', description: '+7% healing', effect: { kind: 'heal_mult', params: [3.5] } },
  },
  {
    level: 10,
    damage: { name: 'Judgment', description: '+8% damage', effect: { kind: 'flat_dmg', params: [8] } },
    survival: { name: 'Divine Armor', description: '+7% armor', effect: { kind: 'armor_mult', params: [7] } },
    support: { name: 'Blessing of Might', description: 'Ally damage +5%', effect: { kind: 'flat_dmg', params: [2.5] } },
  },
  {
    level: 15,
    damage: { name: "Crusader's Strike", description: 'Every 6th attack +40% damage', effect: { kind: 'every_n', params: [6, 40] } },
    survival: { name: 'Holy Shield', description: 'Absorb 5% max HP every 15 attacks', effect: { kind: 'flat_dmg_taken', params: [3.3] } },
    support: { name: 'Beacon of Light', description: "10% of your healing transfers to another ally", effect: { kind: 'dead', params: [], note: 'No ally to transfer healing to when solo' } },
  },
  {
    level: 20,
    damage: { name: 'Sacred Flame', description: 'DoT deals 5% attack damage over 8 sec', effect: { kind: 'flat_dmg', params: [5] } },
    survival: { name: 'Divine Protection', description: 'Damage taken -7%', effect: { kind: 'flat_dmg_taken', params: [7] } },
    support: { name: 'Blessing of Wisdom', description: 'Party healing +5%', effect: { kind: 'heal_mult', params: [2.5] } },
  },
  {
    level: 25,
    damage: { name: "Light's Judgment", description: '15% of damage heals you', effect: { kind: 'heal_frac_add', params: [15] } },
    survival: { name: 'Ardent Defender', description: 'Once/fight survive lethal damage at 10% HP', effect: { kind: 'once_per_fight', params: [], note: 'Survive lethal at 10% HP' } },
    support: { name: 'Beacon Mastery', description: 'Healing transfer increased to 20%', effect: { kind: 'dead', params: [], note: 'Depends on Beacon of Light, which is itself a dead pick solo' } },
  },
  {
    level: 30,
    damage: { name: 'Consecration', description: 'Every 10th attack +40% damage', effect: { kind: 'every_n', params: [10, 40] } },
    survival: { name: "Guardian's Grace", description: 'Healing received +15%', effect: { kind: 'heal_mult', params: [15] } },
    support: { name: 'Holy Aura', description: 'Party healing +10%', effect: { kind: 'heal_mult', params: [5] } },
  },
  {
    level: 35,
    damage: { name: 'Holy Avenger', description: '+10% damage and +8% healing', effect: { kind: 'flat_dmg', params: [10] } },
    survival: { name: 'Divine Shield', description: 'Every 15th attack received deals 60% less damage', effect: { kind: 'flat_dmg_taken', params: [4] } },
    support: { name: 'Hand of Sacrifice', description: 'Absorb 8% ally damage', effect: { kind: 'dead', params: [], note: 'No ally to absorb damage from when solo' } },
  },
  {
    level: 40,
    damage: { name: "Crusader's Fury", description: 'Consecutive attacks increase damage up to 10%', effect: { kind: 'ramp', params: [10] } },
    survival: { name: 'Blessed Life', description: 'Regenerate 0.5% max HP/sec', effect: { kind: 'dead', params: [], note: 'Duplicates the passive-heal mechanic already baked into this spec' } },
    support: { name: 'Aura Mastery', description: 'Party buffs +15% stronger', effect: { kind: 'flat_dmg', params: [2] } },
  },
  {
    level: 45,
    damage: { name: 'Hammer of Wrath', description: '+60% damage against enemies below 20% HP', effect: { kind: 'below_hp', params: [20, 60] } },
    survival: { name: 'Guardian Spirit', description: 'Once/fight survive lethal damage at 15% HP', effect: { kind: 'once_per_fight', params: [], note: 'Survive lethal at 15% HP' } },
    support: { name: "Light's Beacon", description: 'Strongest ally receives +10% healing', effect: { kind: 'dead', params: [], note: 'No ally to heal when solo' } },
  },
  {
    level: 50,
    damage: { name: 'Divine Storm', description: 'Every 12th attack +80% damage', effect: { kind: 'every_n', params: [12, 80] } },
    survival: { name: 'Unbreakable Faith', description: 'Damage taken -12% below 30% HP', effect: { kind: 'self_below_hp_mitigation', params: [30, 12] } },
    support: { name: 'Mass Blessing', description: 'Party +5% damage and +5% survivability', effect: { kind: 'flat_dmg', params: [2.5] } },
  },
  {
    level: 55,
    damage: { name: 'Avenging Wrath', description: '+15% damage and +15% healing', effect: { kind: 'flat_dmg', params: [15] } },
    survival: { name: 'Divine Champion', description: '+18% survivability', effect: { kind: 'surv_coef_mult', params: [18] } },
    support: { name: 'Beacon of Hope', description: 'Party healing +15%', effect: { kind: 'heal_mult', params: [7.5] } },
  },
  {
    level: 60,
    damage: { name: "Light's Fury", description: '+18% damage and +18% healing', effect: { kind: 'flat_dmg', params: [18] } },
    survival: { name: 'Eternal Guardian', description: '+22% survivability', effect: { kind: 'surv_coef_mult', params: [22] } },
    support: { name: 'Avatar of Light', description: 'Party healing +18%, damage +8%', effect: { kind: 'heal_mult', params: [9] } },
  },
];

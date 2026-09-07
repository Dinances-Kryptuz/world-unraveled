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
    survival: { name: 'Adrenaline', description: 'Damage

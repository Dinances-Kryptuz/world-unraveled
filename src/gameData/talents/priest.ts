import type { TalentTree } from './types';

export const SHADOW_PRIEST_TALENTS: TalentTree = [
  {
    level: 5,
    damage: { name: 'Dark Knowledge', description: '+5% spell damage', effect: { kind: 'flat_dmg', params: [5] } },
    survival: { name: 'Shadow Barrier', description: '+6% survivability', effect: { kind: 'surv_coef_mult', params: [6] } },
    support: { name: "Mind's Eye", description: 'Party accuracy +2%', effect: { kind: 'dead', params: [], note: 'No solo analog for accuracy buffs' } },
  },
  {
    level: 10,
    damage: { name: 'Void Touch', description: 'Attacks apply DoT for 2% attack damage over 6 sec', effect: { kind: 'flat_dmg', params: [2] } },
    survival: { name: 'Mental Fortitude', description: '+7% max HP', effect: { kind: 'hp_mult', params: [7] } },
    support: { name: 'Power Infusion', description: 'Ally damage +5%', effect: { kind: 'flat_dmg', params: [2.5] } },
  },
  {
    level: 15,
    damage: { name: 'Pain', description: 'Attacks apply second DoT for 3% damage over 8 sec', effect: { kind: 'flat_dmg', params: [3] } },
    survival: { name: 'Psychic Shield', description: 'Damage taken -6%', effect: { kind: 'flat_dmg_taken', params: [6] } },
    support: { name: 'Mind Link', description: "3% of your damage damages an enemy attacking your protected ally", effect: { kind: 'dead', params: [], note: 'No ally to protect when solo' } },
  },
  {
    level: 20,
    damage: { name: 'Devouring Shadow', description: 'Heal for 8% damage dealt', effect: { kind: 'heal_frac_add', params: [8] } },
    survival: { name: 'Dark Resilience', description: 'Healing received +12%', effect: { kind: 'heal_mult', params: [12] } },
    support: { name: 'Shadow Veil', description: 'Party damage taken -3%', effect: { kind: 'flat_dmg_taken', params: [1.5] } },
  },
  {
    level: 25,
    damage: { name: 'Void Burst', description: 'Every 6th attack +60% damage', effect: { kind: 'every_n', params: [6, 60] } },
    survival: { name: 'Vampiric Embrace', description: 'Damage-based healing +20%', effect: { kind: 'heal_mult', params: [20] } },
    support: { name: 'Vampiric Presence', description: '3% of your damage heals lowest-HP ally', effect: { kind: 'dead', params: [], note: "Solo, you ARE the lowest-HP ally, but this duplicates existing lifesteal rather than adding new value" } },
  },
  {
    level: 30,
    damage: { name: 'Mind Flay', description: 'Consecutive attacks increase damage up to 10%', effect: { kind: 'ramp', params: [10] } },
    survival: { name: 'Fade', description: 'Every 10th incoming attack deals 50% less damage', effect: { kind: 'flat_dmg_taken', params: [5] } },
    support: { name: 'Mass Dispel', description: 'Every 20 attacks, enemy damage -10% for 10 sec', effect: { kind: 'flat_dmg_taken', params: [2] } },
  },
  {
    level: 35,
    damage: { name: 'Void Eruption', description: '10% chance to deal 50% splash damage', effect: { kind: 'chance_mult', params: [0.1, 50] } },
    survival: { name: 'Dispersion', description: 'Every 15th incoming attack deals 60% less damage', effect: { kind: 'flat_dmg_taken', params: [4] } },
    support: { name: 'Psychic Link', description: 'Party damage +5% against your target', effect: { kind: 'flat_dmg', params: [2.5] } },
  },
  {
    level: 40,
    damage: { name: 'Dark Ascension', description: 'Damage increases 1% every 5 sec, up to 10%', effect: { kind: 'ramp', params: [10] } },
    survival: { name: 'Shadowform', description: '+12% survivability', effect: { kind: 'surv_coef_mult', params: [12] } },
    support: { name: 'Shared Pain', description: 'Redirect 5% ally damage to yourself', effect: { kind: 'dead', params: [], note: 'No ally to redirect from when solo' } },
  },
  {
    level: 45,
    damage: { name: 'Devouring Plague', description: '8% attack damage over 10 sec', effect: { kind: 'flat_dmg', params: [8] } },
    survival: { name: 'Mental Escape', description: 'Restore 3% max HP after avoiding an attack', effect: { kind: 'passive_heal_add', params: [0.3] } },
    support: { name: 'Sanctified Shadow', description: 'Party healing received +8%', effect: { kind: 'heal_mult', params: [4] } },
  },
  {
    level: 50,
    damage: { name: 'Void Torrent', description: 'Every 12th attack +100% damage', effect: { kind: 'every_n', params: [12, 100] } },
    survival: { name: 'Void Shield', description: 'Absorb 8% max HP every 20 attacks', effect: { kind: 'flat_dmg_taken', params: [3] } },
    support: { name: 'Mind Control', description: 'Every 30 attacks, enemy damage -15% for 10 sec', effect: { kind: 'flat_dmg_taken', params: [2] } },
  },
  {
    level: 55,
    damage: { name: 'Abyssal Power', description: '+15% damage', effect: { kind: 'flat_dmg', params: [15] } },
    survival: { name: 'Unstable Form', description: 'Enemies attacking you deal 5% less damage', effect: { kind: 'flat_dmg_taken', params: [5] } },
    support: { name: 'Dark Benediction', description: 'Party damage +7%', effect: { kind: 'flat_dmg', params: [3.5] } },
  },
  {
    level: 60,
    damage: { name: 'Void Master', description: '+20% damage', effect: { kind: 'flat_dmg', params: [20] } },
    survival: { name: 'Eternal Shadow', description: '+22% survivability', effect: { kind: 'surv_coef_mult', params: [22] } },
    support: { name: 'Avatar of Void', description: 'Party +8% damage and +8% healing', effect: { kind: 'flat_dmg', params: [4] } },
  },
];

export const HOLY_PRIEST_TALENTS: TalentTree = [
  {
    level: 5,
    damage: { name: 'Holy Fire', description: '+6% damage', effect: { kind: 'flat_dmg', params: [6] } },
    survival: { name: 'Divine Fortitude', description: '+7% survivability', effect: { kind: 'surv_coef_mult', params: [7] } },
    support: { name: 'Blessing', description: 'Party healing +5%', effect: { kind: 'heal_mult', params: [2.5] } },
  },
  {
    level: 10,
    damage: { name: 'Smite', description: '+8% damage', effect: { kind: 'flat_dmg', params: [8] } },
    survival: { name: 'Holy Resilience', description: '+7% max HP', effect: { kind: 'hp_mult', params: [7] } },
    support: { name: 'Renew', description: 'Heal lowest-HP ally for 2% max HP every 10 sec', effect: { kind: 'passive_heal_add', params: [0.1] } },
  },
  {
    level: 15,
    damage: { name: 'Searing Light', description: '+10% damage against enemies below 50% HP', effect: { kind: 'below_hp', params: [50, 10] } },
    survival: { name: 'Guardian Angel', description: 'First lethal attack deals only 50% damage', effect: { kind: 'once_per_fight', params: [], note: 'First lethal hit deals only 50% damage' } },
    support: { name: 'Prayer of Mending', description: 'Heal damaged ally for 5% max HP every 12 sec', effect: { kind: 'passive_heal_add', params: [0.2] } },
  },
  {
    level: 20,
    damage: { name: 'Empowered Smite', description: '15% of damage heals you', effect: { kind: 'heal_frac_add', params: [15] } },
    survival: { name: 'Divine Shield', description: 'Every 15th attack deals 60% less damage', effect: { kind: 'flat_dmg_taken', params: [4] } },
    support: { name: 'Holy Word', description: 'Every 20 attacks heal all allies for 6% max HP', effect: { kind: 'flat_dmg_taken', params: [1.5] } },
  },
  {
    level: 25,
    damage: { name: 'Burning Faith', description: '+10% damage below 50% HP', effect: { kind: 'self_below_hp_dmg', params: [50, 10] } },
    survival: { name: 'Serenity', description: 'Healing received +20%', effect: { kind: 'heal_mult', params: [20] } },
    support: { name: 'Circle of Healing', description: 'Heal all allies for 2% max HP every 8 sec', effect: { kind: 'passive_heal_add', params: [0.125] } },
  },
  {
    level: 30,
    damage: { name: 'Divine Wrath', description: 'Every 6th attack +50% damage', effect: { kind: 'every_n', params: [6, 50] } },
    survival: { name: 'Guardian Spirit', description: 'Once/fight survive lethal damage at 10% HP', effect: { kind: 'once_per_fight', params: [], note: 'Survive lethal at 10% HP' } },
    support: { name: 'Prayer of Protection', description: 'Party damage taken -6% for 10 sec every 30 attacks', effect: { kind: 'flat_dmg_taken', params: [1] } },
  },
  {
    level: 35,
    damage: { name: 'Atonement', description: '10% damage dealt becomes healing', effect: { kind: 'heal_frac_add', params: [10] } },
    survival: { name: 'Angelic Body', description: 'Avoidance +4%', effect: { kind: 'avoidance_add', params: [4] } },
    support: { name: 'Atonement Aura', description: '5% of your damage heals lowest-HP ally', effect: { kind: 'dead', params: [], note: 'Duplicates existing self-heal mechanic when solo' } },
  },
  {
    level: 40,
    damage: { name: 'Holy Nova', description: 'Every 10th attack +40% damage', effect: { kind: 'every_n', params: [10, 40] } },
    survival: { name: 'Divine Aegis', description: '20% overhealing becomes a shield', effect: { kind: 'flat_dmg_taken', params: [3] } },
    support: { name: 'Mass Renew', description: 'Party regenerates 0.4% max HP/sec', effect: { kind: 'passive_heal_add', params: [0.2] } },
  },
  {
    level: 45,
    damage: { name: 'Sacred Flame', description: 'DoT deals 5% damage over 8 sec and increases healing +5%', effect: { kind: 'flat_dmg', params: [5] } },
    survival: { name: "Light's Grace", description: 'Healing +15% on targets below 30% HP', effect: { kind: 'heal_mult', params: [4.5] } },
    support: { name: 'Guardian Angel', description: 'Weakest ally damage taken -10%', effect: { kind: 'flat_dmg_taken', params: [5] } },
  },
  {
    level: 50,
    damage: { name: 'Divine Surge', description: 'Every 12th attack +80% damage', effect: { kind: 'every_n', params: [12, 80] } },
    survival: { name: 'Faith Unbroken', description: 'Once/fight cannot fall below 1 HP for 3 sec', effect: { kind: 'once_per_fight', params: [], note: 'Cannot die for 3 seconds, once per fight' } },
    support: { name: 'Mass Prayer', description: 'Party healing received +10%', effect: { kind: 'heal_mult', params: [5] } },
  },
  {
    level: 55,
    damage: { name: 'Holy Avenger', description: '+12% damage and +10% healing', effect: { kind: 'flat_dmg', params: [12] } },
    survival: { name: 'Archangel', description: '+15% survivability', effect: { kind: 'surv_coef_mult', params: [15] } },
    support: { name: 'Beacon of Light', description: "20% of your healing copied to another ally", effect: { kind: 'dead', params: [], note: 'No ally to copy healing to when solo' } },
  },
  {
    level: 60,
    damage: { name: 'Lightbringer', description: '+18% damage and +15% damage-based healing', effect: { kind: 'flat_dmg', params: [18] } },
    survival: { name: 'Divine Champion', description: '+25% survivability', effect: { kind: 'surv_coef_mult', params: [25] } },
    support: { name: 'Avatar of Light', description: 'Party healing +20%, survivability +8%', effect: { kind: 'heal_mult', params: [10] } },
  },
];

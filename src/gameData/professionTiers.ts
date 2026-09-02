import type { ProfessionTierDef } from './types';

// Applies uniformly to all four V1 professions (Skinning, Mining, Herbalism,
// Leatherworking) per the "apply the gate consistently" decision. Doesn't
// affect V1 content directly (Greenhollow Fields tops out around level 15,
// nowhere near the 75 Apprentice ceiling) but the gate logic is real, not stubbed,
// so it's already correct when future zones raise the level ceiling.
export const PROFESSION_TIERS: ProfessionTierDef[] = [
  {
    tier: 'apprentice',
    minSkill: 1,
    maxSkill: 75,
    unlockRequirement: { type: 'free' },
  },
  {
    tier: 'journeyman',
    minSkill: 76,
    maxSkill: 125,
    unlockRequirement: { type: 'trainer', goldCost: 10, requiredSkill: 75 },
  },
  {
    tier: 'expert',
    minSkill: 126,
    maxSkill: 200,
    unlockRequirement: { type: 'trainer', goldCost: 50, requiredSkill: 125 },
  },
  {
    tier: 'artisan',
    minSkill: 201,
    maxSkill: 275,
    unlockRequirement: { type: 'trainer', goldCost: 200, requiredSkill: 200 },
  },
  {
    tier: 'master',
    minSkill: 276,
    maxSkill: 300,
    unlockRequirement: {
      type: 'quest',
      questId: 'master_of_the_craft', // placeholder quest id, per-profession quest content is post-V1
      requiredSkill: 275,
    },
  },
];

export function getTierForSkillLevel(skill: number): ProfessionTierDef {
  const tier = PROFESSION_TIERS.find((t) => skill >= t.minSkill && skill <= t.maxSkill);
  return tier ?? PROFESSION_TIERS[0];
}

// Guild Milestones — every 5 guild levels unlocks one permanent, guild-wide
// bonus for every member (not just whoever earned the XP that crossed the
// threshold). Reuses guildHeadquarters.ts's guildXpProgress/guildLevelForXp
// for the level itself; this file only maps level -> which bonuses are
// unlocked so far (cumulative — reaching level 10 keeps the level 5 bonus
// too, it doesn't replace it).
//
// Each bonus reuses an EXISTING stacking channel rather than inventing new
// engine math:
// - mountSpeedPct stacks additively with a character's own best mount
//   bonus (gameData/mounts.ts's bestMountSpeedBonusPct) the same way two
//   speed sources always have in this game — see firebase/travel.ts and
//   TopBar.tsx. At Master Mount (80%) + this milestone (20%), the combined
//   100% makes gameData/travel.ts's travelSeconds formula resolve to 0:
//   genuinely instant, not just "very fast" — exactly the stated design.
// - gatheringTimePct/craftingTimePct are added into the same toolBonusPct/
//   craftingSpeedPct channel a Shirt of the Gatherer/Artisan already feeds
//   (gatheringEngine.ts/craftingEngine.ts sum tool + shirt speed bonuses
//   together before applying them) — a guild bonus is just another speed
//   source stacked the same way.
// - gatheringMasteryPct/craftingMasteryPct are added into the existing
//   masteryXpPct channel (Shirt of Mastery's own lever) — the guild
//   accelerates how fast a member's own node/material Mastery grows,
//   rather than inventing a second, parallel "effective Mastery" axis that
//   would have to be reconciled against the real one's milestone stepping.
// - materialPreservePct feeds CraftingShirtBonuses' own material_preserve
//   channel the same way. Unlike the 5 fields above (which only ever come
//   from level milestones), gatheringTimePct/craftingTimePct/
//   materialPreservePct are ALSO where Guild Headquarters' Storehouse/
//   Workshop room bonuses get folded in (useGuildMilestones.tsx adds
//   roomBonusPct('storehouse'|'workshop', ...) into these same 3 fields
//   after this function returns) — one guild can stack a level milestone
//   and its own room upgrades in the same speed/preserve channel.
export interface GuildMilestoneBonuses {
  mountSpeedPct: number;
  gatheringTimePct: number;
  craftingTimePct: number;
  gatheringMasteryPct: number;
  craftingMasteryPct: number;
  materialPreservePct: number;
}

export interface GuildMilestoneDef {
  level: number;
  id: keyof GuildMilestoneBonuses;
  value: number;
  label: string;
  description: string;
}

export const GUILD_MILESTONES: GuildMilestoneDef[] = [
  {
    level: 5,
    id: 'mountSpeedPct',
    value: 20,
    label: '+20% Mount Speed',
    description: "Every guild member's mount flies 20% faster — stacks with their own Mount Trainer bonus (Master Mount + this reaches 100%, making travel instant).",
  },
  {
    level: 10,
    id: 'gatheringTimePct',
    value: 10,
    label: '-10% Gathering Time',
    description: 'Every guild member gathers, mines, skins, and fishes 10% faster.',
  },
  {
    level: 15,
    id: 'craftingTimePct',
    value: 10,
    label: '-10% Crafting Time',
    description: 'Every guild member crafts 10% faster.',
  },
  {
    level: 20,
    id: 'gatheringMasteryPct',
    value: 10,
    label: '+10% Gathering Mastery',
    description: "Every guild member's gathering Mastery XP grows 10% faster.",
  },
  {
    level: 25,
    id: 'craftingMasteryPct',
    value: 10,
    label: '+10% Crafting Mastery',
    description: "Every guild member's material Mastery XP grows 10% faster.",
  },
];

const ZERO_BONUSES: GuildMilestoneBonuses = {
  mountSpeedPct: 0,
  gatheringTimePct: 0,
  craftingTimePct: 0,
  gatheringMasteryPct: 0,
  craftingMasteryPct: 0,
  materialPreservePct: 0,
};

// Sums every milestone whose level has been reached — a guild at level 23
// has the level 5/10/15/20 bonuses but not level 25's yet.
export function guildMilestoneBonuses(guildLevel: number): GuildMilestoneBonuses {
  const bonuses = { ...ZERO_BONUSES };
  for (const milestone of GUILD_MILESTONES) {
    if (guildLevel >= milestone.level) {
      bonuses[milestone.id] += milestone.value;
    }
  }
  return bonuses;
}

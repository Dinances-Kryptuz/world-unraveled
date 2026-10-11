import { ZONES } from './zones';

// Cooking overhaul Tier 1 — Auto Eat. A permanent, sequentially-purchased
// upgrade (same shape as mounts.ts's 5-rank Riding trainer, just 3 ranks at
// zones 2/4/6 instead of 2-6), evaluated post-damage each combat tick in
// combatEngine/engine.ts exactly like the existing Part 8 auto-heal
// automation — except the threshold/efficiency are fixed per rank (not
// player-configured) and it only ever eats Recovery Food, never a potion.
// hpTriggerPct/healEfficiencyPct are both % of max HP, per the design
// brief's own worked numbers. Substantially increasing costs, mirroring
// mounts.ts's own 500/2000/8000/25000/75000 escalation.
export interface AutoEatRankDef {
  rank: number;
  hpTriggerPct: number;
  healEfficiencyPct: number;
  cost: number;
  requiredZoneId: string;
}

export const AUTO_EAT_RANKS: AutoEatRankDef[] = [
  { rank: 1, hpTriggerPct: 20, healEfficiencyPct: 20, cost: 750, requiredZoneId: 'stonecrag_foothills' },
  { rank: 2, hpTriggerPct: 30, healEfficiencyPct: 40, cost: 6000, requiredZoneId: 'cinderfall_depths' },
  { rank: 3, hpTriggerPct: 50, healEfficiencyPct: 80, cost: 40000, requiredZoneId: 'cinderheart_crater' },
];

export function autoEatRankDef(rank: number): AutoEatRankDef | undefined {
  return AUTO_EAT_RANKS.find((r) => r.rank === rank);
}

export function autoEatZoneName(rank: number): string {
  const def = autoEatRankDef(rank);
  if (!def) return '';
  return ZONES[def.requiredZoneId]?.name ?? def.requiredZoneId;
}

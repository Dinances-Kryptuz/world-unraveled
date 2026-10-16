// Guild Expeditions (Phase 4) — mirrors functions/src/expeditions.ts's own
// constants (kept in sync by hand, same precedent as guilds.ts/
// guildContracts.ts's small duplicated constants). Party composition is
// deliberately simplified for this first pass: the character's own current
// setup (self + recruited companions), NOT a live multi-human-player party
// — forming real cross-account parties would need an invite/accept flow
// this phase doesn't build. "Asynchronous" here means the expedition runs
// for hours while the player is offline, which this delivers either way.
export type ExpeditionTier = 'common' | 'uncommon' | 'rare' | 'epic';

export const EXPEDITION_TIERS: ExpeditionTier[] = ['common', 'uncommon', 'rare', 'epic'];

export const EXPEDITION_DURATION_SECONDS: Record<ExpeditionTier, number> = {
  common: 4 * 3600,
  uncommon: 8 * 3600,
  rare: 12 * 3600,
  epic: 24 * 3600,
};

export const EXPEDITION_SEALS_REWARD: Record<ExpeditionTier, number> = {
  common: 5,
  uncommon: 10,
  rare: 20,
  epic: 40,
};

export const EXPEDITION_XP_REWARD: Record<ExpeditionTier, number> = {
  common: 100,
  uncommon: 200,
  rare: 400,
  epic: 800,
};

export const EXPEDITION_BASE_SUCCESS: Record<ExpeditionTier, number> = {
  common: 0.85,
  uncommon: 0.75,
  rare: 0.65,
  epic: 0.55,
};

export const EXPEDITION_DROP_CHANCE: Record<ExpeditionTier, number> = {
  common: 0.08,
  uncommon: 0.12,
  rare: 0.15,
  epic: 0.2,
};

export function expeditionTierLabel(tier: ExpeditionTier): string {
  switch (tier) {
    case 'common':
      return 'Common';
    case 'uncommon':
      return 'Uncommon';
    case 'rare':
      return 'Rare';
    case 'epic':
      return 'Epic';
  }
}

export function expeditionLootItemIds(tier: ExpeditionTier): string[] {
  return [`expedition_necklace_${tier}`, `expedition_ring_${tier}`, `expedition_cape_${tier}`, `expedition_tabard_${tier}`];
}

export type CombatRole = 'tank' | 'healer' | 'dps';

export interface ExpeditionPartyMember {
  label: string; // display name — "You" or the companion's name
  class: string;
  spec: string;
  role: CombatRole;
}

export interface ExpeditionDoc {
  id: string;
  guildId: string;
  ownerUid: string;
  tier: ExpeditionTier;
  startedAt: Date;
  completesAt: Date;
  successChance: number;
  party: ExpeditionPartyMember[];
  resolved: boolean;
  success: boolean | null;
  claimed: boolean;
  lootItemId: string | null;
}

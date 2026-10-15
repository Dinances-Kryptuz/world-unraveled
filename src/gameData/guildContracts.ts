// Mirrors functions/src/contracts.ts's shape — see that file's module
// comment for the full design (fixed 3 contracts/week, bounded Hunting
// claims, 25%-capped companion auto-contribution, Guild Momentum).
export type ContractCategory = 'gathering' | 'crafting' | 'hunting';

export interface ContractRow {
  category: ContractCategory;
  materialId: string | null;
  label: string;
  requirement: number;
  progress: number;
  playerContributions: Record<string, number>;
  companionContributions: Record<string, number>;
  claims: Record<string, boolean>;
  completedAt: Date | null;
}

export interface GuildWeek {
  guildId: string;
  weekId: string;
  contracts: ContractRow[];
}

export const CONTRACT_XP_REWARD = 50;
export const CONTRACT_GOLD_POOL = 300;
export const HUNTING_KILLS_PER_CALL_MAX = 20;
export const MAX_MOMENTUM = 5;

export function contractCategoryLabel(category: ContractCategory): string {
  switch (category) {
    case 'gathering':
      return 'Gathering';
    case 'crafting':
      return 'Crafting';
    case 'hunting':
      return 'Hunting';
  }
}

export function myShareOfContract(contract: ContractRow, uid: string): number {
  return (contract.playerContributions[uid] ?? 0) + (contract.companionContributions[uid] ?? 0);
}

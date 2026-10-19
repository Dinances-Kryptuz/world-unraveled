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

// Exact client-side port of functions/src/weekId.ts's isoWeekId — needed
// here so the UI can tell whether Character.huntingKillTally (a running
// kill count reset per-week) still belongs to the CURRENT week without a
// round trip to the server; the server's own copy is still what actually
// decides which week a guild's contracts belong to.
export function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0 .. Sunday = 6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to this week's Thursday
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
}

// The tally only counts if it's still THIS week's — a stale tally from a
// prior week (one the player just hasn't killed anything in yet since
// rollover) reads as 0, same "absence is the zero state" convention as
// every other optional Character field.
export function currentHuntingKills(tally: { weekId: string; kills: number } | undefined, now: Date): number {
  if (!tally || tally.weekId !== isoWeekId(now)) return 0;
  return tally.kills;
}

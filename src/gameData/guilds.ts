// Pure data shapes + small constants shared between the Guild Hall UI and
// src/firebase/guilds.ts — mirrors functions/src/guilds.ts's own constants
// (kept in sync by hand; there are only two numbers to keep matching).
export const MAX_GUILD_MEMBERS = 20;
export const MAX_OFFICERS = 3;

export type GuildRole = 'master' | 'officer' | 'member';

export interface GuildMemberRow {
  uid: string;
  name: string;
  class: string;
  spec: string | null;
  level: number;
  title: string | null;
  role: GuildRole;
  joinedAt: Date | null;
}

export interface GuildDetails {
  id: string;
  name: string;
  tag: string | null;
  ownerId: string;
  officerIds: string[];
  memberIds: string[];
  level: number;
  xp: number;
  headquartersTier: number;
  // Shared guild treasury (Phase 5) — donated by members, spent by the
  // Guild Master/Officers on room upgrades and restoration projects. A
  // separate pool from any individual member's own gold.
  gold: number;
  rooms: Record<string, number>;
  restorationIds: string[];
  // Denormalized roster, maintained server-side by a Firestore trigger
  // (functions/src/guildRoster.ts) on every guildMembers write — lets the
  // Guild Hall render the member list from this ONE doc read instead of a
  // separate up-to-MAX_GUILD_MEMBERS-reads collection query. Undefined for
  // a guild that existed before that trigger shipped and hasn't had a
  // membership write since; callers should fall back to listGuildMembers()
  // (and trigger backfillGuildRoster()) in that case.
  roster?: GuildMemberRow[];
  // Weekly Guild Contracts' 5-stage track (0-5) — advances by 1 whenever at
  // least one contract was completed the prior ISO week, and otherwise is
  // left exactly as-is (paused, never reset) on a missed week. See
  // functions/src/contracts.ts's getOrCreateGuildWeek.
  momentum: number;
}

export interface GuildPublicSummary {
  id: string;
  name: string;
  tag: string | null;
  memberCount: number;
  level: number;
}

export function roleLabel(role: GuildRole): string {
  switch (role) {
    case 'master':
      return 'Guild Master';
    case 'officer':
      return 'Officer';
    case 'member':
      return 'Member';
  }
}

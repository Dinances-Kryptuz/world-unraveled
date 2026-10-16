// Shared by contracts.ts, expeditions.ts, and guildHeadquarters.ts — mirrors
// gameData/guildHeadquarters.ts's own constants (same small-duplication
// precedent as every other pair of client/function constants in this
// feature). Only the 3 rooms actually wired into a Cloud Function-side
// calculation need their per-level bonus here; Storehouse/Workshop are
// computed client-side for display only (see that file's own comment).
export const ROOM_BONUS_PER_LEVEL = {
  barracks: 1, // % companion contribution efficiency
  warroom: 1, // % expedition Seals/XP reward
  library: 1, // % guild XP gain from contracts/expeditions
} as const;

export function roomLevel(rooms: Record<string, number> | undefined, roomId: keyof typeof ROOM_BONUS_PER_LEVEL): number {
  return Math.max(0, Math.min(5, rooms?.[roomId] ?? 0));
}

export function roomBonusMultiplier(rooms: Record<string, number> | undefined, roomId: keyof typeof ROOM_BONUS_PER_LEVEL): number {
  return 1 + (roomLevel(rooms, roomId) * ROOM_BONUS_PER_LEVEL[roomId]) / 100;
}

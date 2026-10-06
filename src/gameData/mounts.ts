import { ZONE_TIER } from './zones';

// Pure mount data — no Firestore here, same split as bank.ts (gating/cost
// math) vs firebase/mounts.ts (the writer). A mount is a permanent gold
// sink from the Mount Trainer that cuts flight time (gameData/travel.ts's
// travelMinutes), not an inventory item — see Character.mounts.
//
// Five ranks, same naming convention as profession tiers
// (professionTiers.ts), each trainable starting one zone later —
// Apprentice at Stonecrag Foothills (zone 2) through Master at Cinderheart
// Crater (zone 6) — so the mount trainer's zone-gating mirrors the
// profession trainers' "learn the next rank once you've reached the zone
// for it" shape (professionTrainers.ts). Also sequential like profession
// ranks: a rank can't be trained until the one before it is owned (see
// requiredPriorMountId/firebase/mounts.ts's trainMount), not just reachable
// by zone.
export interface MountDef {
  id: string;
  name: string;
  rank: 'apprentice' | 'journeyman' | 'expert' | 'artisan' | 'master';
  description: string;
  cost: number;
  // Percent reduction applied to travelMinutes' base duration, e.g. 50
  // means flights take half as long.
  speedBonusPct: number;
  // Which zone the character must be standing in to train this rank — see
  // firebase/mounts.ts's trainMount.
  requiredZoneId: string;
}

const MOUNT_RANK_ZONE: Record<MountDef['rank'], string> = {
  apprentice: 'stonecrag_foothills', // zone 2
  journeyman: 'emberfall_ridge', // zone 3
  expert: 'cinderfall_depths', // zone 4
  artisan: 'molten_scar', // zone 5
  master: 'cinderheart_crater', // zone 6
};

export const MOUNTS: Record<string, MountDef> = {
  apprentice_mount: {
    id: 'apprentice_mount',
    name: 'Apprentice Riding',
    rank: 'apprentice',
    description: 'Cuts flight time between zones by 10%.',
    cost: 500,
    speedBonusPct: 10,
    requiredZoneId: MOUNT_RANK_ZONE.apprentice,
  },
  journeyman_mount: {
    id: 'journeyman_mount',
    name: 'Journeyman Riding',
    rank: 'journeyman',
    description: 'Cuts flight time between zones by 20%.',
    cost: 2000,
    speedBonusPct: 20,
    requiredZoneId: MOUNT_RANK_ZONE.journeyman,
  },
  expert_mount: {
    id: 'expert_mount',
    name: 'Expert Riding',
    rank: 'expert',
    description: 'Cuts flight time between zones by 30%.',
    cost: 8000,
    speedBonusPct: 30,
    requiredZoneId: MOUNT_RANK_ZONE.expert,
  },
  artisan_mount: {
    id: 'artisan_mount',
    name: 'Artisan Riding',
    rank: 'artisan',
    description: 'Cuts flight time between zones by 60%.',
    cost: 25000,
    speedBonusPct: 60,
    requiredZoneId: MOUNT_RANK_ZONE.artisan,
  },
  master_mount: {
    id: 'master_mount',
    name: 'Master Riding',
    rank: 'master',
    description: 'Cuts flight time between zones by 80%.',
    cost: 75000,
    speedBonusPct: 80,
    requiredZoneId: MOUNT_RANK_ZONE.master,
  },
};

export const MOUNT_ORDER: string[] = ['apprentice_mount', 'journeyman_mount', 'expert_mount', 'artisan_mount', 'master_mount'];

// The rank that must already be owned before this one can be trained — null
// for Apprentice (the first rank, nothing gates it). Sequential by design:
// each rank is a bigger speed jump than the last (10/20/30/60/80%), so
// without this a player who can already reach a later zone's trainer could
// skip straight to it and never need the earlier ranks at all.
export function requiredPriorMountId(mountId: string): string | null {
  const index = MOUNT_ORDER.indexOf(mountId);
  return index > 0 ? MOUNT_ORDER[index - 1] : null;
}

// Mounts don't stack — a player with more than one just always flies at
// whichever owned mount is fastest.
export function bestMountSpeedBonusPct(ownedMountIds: string[]): number {
  let best = 0;
  for (const id of ownedMountIds) {
    const bonus = MOUNTS[id]?.speedBonusPct ?? 0;
    if (bonus > best) best = bonus;
  }
  return best;
}

// Sort key for the Mount Trainer list — by zone tier (gameData/zones.ts's
// ZONE_TIER) so ranks always display Apprentice-to-Master regardless of
// object key order.
export function mountZoneTier(mount: MountDef): number {
  return ZONE_TIER[mount.requiredZoneId] ?? 0;
}

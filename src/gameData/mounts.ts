// Pure mount data — no Firestore here, same split as bank.ts (gating/cost
// math) vs firebase/mounts.ts (the writer). A mount is a permanent,
// account-wide-per-character gold sink that cuts flight time (gameData/
// travel.ts's travelMinutes), not an inventory item — see Character.mounts.
export interface MountDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  // Percent reduction applied to travelMinutes' base duration, e.g. 50 means
  // flights take half as long. Test values per the initial ask — expect
  // cost/speedBonusPct to be tuned down/up later.
  speedBonusPct: number;
}

export const MOUNTS: Record<string, MountDef> = {
  beginner_mount: {
    id: 'beginner_mount',
    name: 'Beginner Mount',
    description: 'A modest riding beast — cuts flight time between zones by 50%.',
    cost: 40000,
    speedBonusPct: 50,
  },
};

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

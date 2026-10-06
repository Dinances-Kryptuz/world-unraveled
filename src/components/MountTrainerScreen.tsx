import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { trainMount } from '../firebase/mounts';
import { MOUNTS, MOUNT_ORDER, requiredPriorMountId } from '../gameData/mounts';
import { ZONES } from '../gameData/zones';

// Five ranks (Apprentice → Master), each trainable starting at its own zone
// — see gameData/mounts.ts's MOUNT_RANK_ZONE — and strictly sequential: the
// previous rank must already be owned (see requiredPriorMountId) before the
// next one can be trained, mirroring how profession ranks work.
export function MountTrainerScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [training, setTraining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!character) return null;

  async function handleTrain(mountId: string) {
    if (!user) return;
    setTraining(mountId);
    setError(null);
    try {
      const result = await trainMount(user.uid, mountId);
      if (!result.success) {
        setError(result.reason ?? 'Could not train that mount.');
      } else {
        await refetch();
      }
    } finally {
      setTraining(null);
    }
  }

  return (
    <div className="mount-trainer-screen">
      <h2>Mount Trainer</h2>
      <p>Permanent gold sinks that cut zone-travel flight time. Mounts don't stack — only your fastest one applies.</p>
      <ul>
        {MOUNT_ORDER.map((mountId) => {
          const mount = MOUNTS[mountId];
          const owned = character.mounts.includes(mountId);
          const inZone = zoneId === mount.requiredZoneId;
          const isBusy = training === mountId;
          const canAfford = character.gold >= mount.cost;
          const zoneName = ZONES[mount.requiredZoneId]?.name ?? mount.requiredZoneId;
          const priorId = requiredPriorMountId(mountId);
          const priorOwned = !priorId || character.mounts.includes(priorId);
          let lockedNote: string | null = null;
          if (!owned) {
            if (!priorOwned) lockedNote = `Train ${MOUNTS[priorId!].name} first`;
            else if (!inZone) lockedNote = `train this at ${zoneName}`;
          }
          return (
            <li key={mountId}>
              <div className="item-row-main">
                <span>
                  <strong>{mount.name}</strong> — {mount.description} ({mount.cost.toLocaleString()} gold)
                  {lockedNote && <small> — {lockedNote}</small>}
                </span>
              </div>
              <button onClick={() => handleTrain(mountId)} disabled={owned || isBusy || !priorOwned || !inZone || !canAfford}>
                {owned ? 'Owned' : 'Train'}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

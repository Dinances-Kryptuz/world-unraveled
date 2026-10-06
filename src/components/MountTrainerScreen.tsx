import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { trainMount } from '../firebase/mounts';
import { MOUNTS, MOUNT_ORDER } from '../gameData/mounts';
import { ZONES } from '../gameData/zones';

// Five ranks (Apprentice → Master), each trainable starting at its own zone
// — see gameData/mounts.ts's MOUNT_RANK_ZONE. Mounts don't stack, so owning
// a later rank makes an earlier one pointless to buy, but nothing stops a
// player from training out of order if they can reach a later zone's
// trainer some other way (a dungeon shortcut, a future teleport item, …).
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
          return (
            <li key={mountId}>
              <div className="item-row-main">
                <span>
                  <strong>{mount.name}</strong> — {mount.description} ({mount.cost.toLocaleString()} gold)
                  {!owned && !inZone && <small> — train this at {zoneName}</small>}
                </span>
              </div>
              <button onClick={() => handleTrain(mountId)} disabled={owned || isBusy || !inZone || !canAfford}>
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

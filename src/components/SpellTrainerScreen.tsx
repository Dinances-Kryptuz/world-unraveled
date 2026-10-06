import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { trainAbility } from '../firebase/character';
import { ABILITIES } from '../combatEngine/abilities';
import { abilityTrainingCost, abilityTrainingZoneId } from '../gameData/abilityTraining';
import { ZONES } from '../gameData/zones';
import type { Ability } from '../combatEngine/types';

// The full catalog for the character's class/spec — shown regardless of
// current level, per the design ask ("see all the spells you will be able
// to get, at what level you get them"), not just what's level-unlocked
// already. Excludes the basic attack, which is never trained — it's always
// free (see combatEngine/abilities.ts's isBasicAttack).
function abilitiesForClassSpec(cls: string, spec: string | null): Ability[] {
  return Object.values(ABILITIES)
    .filter((a) => a.class === cls && !a.isBasicAttack && (!a.spec || a.spec === spec))
    .sort((a, b) => a.unlockLevel - b.unlockLevel);
}

export function SpellTrainerScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [training, setTraining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!character) return null;

  const abilities = abilitiesForClassSpec(character.class, character.spec);
  const trainedSet = new Set(character.trainedAbilityIds);

  async function handleTrain(abilityId: string) {
    if (!user) return;
    setTraining(abilityId);
    setError(null);
    try {
      const result = await trainAbility(user.uid, abilityId);
      if (!result.success) {
        setError(result.reason ?? 'Could not train that ability.');
      } else {
        await refetch();
      }
    } finally {
      setTraining(null);
    }
  }

  return (
    <div className="spell-trainer-screen">
      <h2>Spells &amp; Abilities</h2>
      <p>Every ability your class (and spec, once chosen) can ever learn. Training one requires reaching its level and standing in the right zone.</p>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {abilities.map((ability) => {
          const known = trainedSet.has(ability.id);
          const reachedLevel = character.level >= ability.unlockLevel;
          const requiredZoneId = abilityTrainingZoneId(ability.unlockLevel);
          const inZone = zoneId === requiredZoneId;
          const cost = abilityTrainingCost(ability.unlockLevel);
          const canAfford = character.gold >= cost;
          const isBusy = training === ability.id;
          const zoneName = ZONES[requiredZoneId]?.name ?? requiredZoneId;

          let statusNote: string | null = null;
          if (!known) {
            if (!reachedLevel) statusNote = `Requires character level ${ability.unlockLevel}`;
            else if (!inZone) statusNote = `Train this at ${zoneName}`;
          }

          return (
            <li key={ability.id} style={{ marginBottom: 10, opacity: known ? 1 : reachedLevel ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <strong>{ability.name}</strong> — {ability.description}
                  <br />
                  <small>
                    Unlocks at level {ability.unlockLevel} · {cost.toLocaleString()} gold
                    {statusNote ? ` · ${statusNote}` : ''}
                  </small>
                </div>
                {known ? (
                  <em>Known</em>
                ) : (
                  <button onClick={() => handleTrain(ability.id)} disabled={isBusy || !reachedLevel || !inZone || !canAfford}>
                    Train
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

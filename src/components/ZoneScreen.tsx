import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity } from '../firebase/character';
import { ZONES } from '../gameData/zones';
import { MONSTERS } from '../gameData/monsters';
import { CombatScreen } from './CombatScreen';

const CURRENT_ZONE_ID = 'greenhollow_fields';

export function ZoneScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const zone = ZONES[CURRENT_ZONE_ID];

  async function handleFight(monsterId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'combat', targetId: monsterId, zoneId: CURRENT_ZONE_ID });
    await refetch();
  }

  if (!character) return null;

  if (character.currentActivity.type === 'combat' && character.currentActivity.targetId) {
    return <CombatScreen monsterId={character.currentActivity.targetId} />;
  }

  return (
    <div className="zone-screen">
      <h1>{zone.name}</h1>
      <p>{zone.description}</p>

      <h2>Monsters</h2>
      <ul>
        {zone.monsterIds.map((monsterId) => {
          const monster = MONSTERS[monsterId];
          return (
            <li key={monsterId}>
              {monster.name} (Lv {monster.levelRange[0]}-{monster.levelRange[1]})
              <button onClick={() => handleFight(monsterId)}>Fight</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

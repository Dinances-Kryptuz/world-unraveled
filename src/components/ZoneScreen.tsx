import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity } from '../firebase/character';
import { ZONES, GATHER_NODES } from '../gameData/zones';
import { MONSTERS } from '../gameData/monsters';
import { CombatScreen } from './CombatScreen';
import { GatheringScreen } from './GatheringScreen';

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

  async function handleGather(nodeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'gathering', targetId: nodeId, zoneId: CURRENT_ZONE_ID });
    await refetch();
  }

  if (!character) return null;

  if (character.currentActivity.type === 'combat' && character.currentActivity.targetId) {
    return <CombatScreen monsterId={character.currentActivity.targetId} />;
  }

  if (character.currentActivity.type === 'gathering' && character.currentActivity.targetId) {
    const node = GATHER_NODES[character.currentActivity.targetId];
    if (node) return <GatheringScreen node={node} />;
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

      <h2>Gathering</h2>
      <ul>
        {zone.gatherNodeIds.map((nodeId) => {
          const node = GATHER_NODES[nodeId];
          return (
            <li key={nodeId}>
              {node.name} ({node.profession}, Lv {node.requiredLevel}+)
              <button onClick={() => handleGather(nodeId)}>Gather</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

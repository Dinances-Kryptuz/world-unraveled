import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity } from '../firebase/character';
import { ZONES, GATHER_NODES } from '../gameData/zones';
import { MONSTERS } from '../gameData/monsters';
import { RECIPES } from '../gameData/recipes';
import { CombatScreen } from './CombatScreen';
import { GatheringScreen } from './GatheringScreen';
import { CraftingScreen } from './CraftingScreen';

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

  async function handleCraft(recipeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'crafting', targetId: recipeId, zoneId: CURRENT_ZONE_ID });
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

  if (character.currentActivity.type === 'crafting' && character.currentActivity.targetId) {
    const recipe = RECIPES[character.currentActivity.targetId];
    if (recipe) return <CraftingScreen recipe={recipe} />;
  }

  const leatherworkingLevel = character.professions.leatherworking.level;

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

      <h2>Crafting (Leatherworking)</h2>
      <ul>
        {Object.values(RECIPES).map((recipe) => {
          const meetsLevel = leatherworkingLevel >= recipe.requiredSkill;
          return (
            <li key={recipe.id}>
              {recipe.name} (requires Lv {recipe.requiredSkill}) — materials:{' '}
              {recipe.materials.map((m) => `${m.quantity}x ${m.itemId}`).join(', ')}
              <button onClick={() => handleCraft(recipe.id)} disabled={!meetsLevel}>
                {meetsLevel ? 'Craft' : `Need Lv ${recipe.requiredSkill}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

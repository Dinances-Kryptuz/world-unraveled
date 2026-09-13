import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity } from '../firebase/character';
import { ZONES, GATHER_NODES } from '../gameData/zones';
import { MONSTERS } from '../gameData/monsters';
import { RECIPES } from '../gameData/recipes';
import { CombatScreen } from './CombatScreen';
import { GatheringScreen } from './GatheringScreen';
import { CraftingScreen } from './CraftingScreen';
import { WelcomeBackScreen, isLongAbsence } from './WelcomeBackScreen';
import { SpecSelectionScreen } from './SpecSelectionScreen';
import { mobColorTier, type MobColorTier } from '../gameData/combatFormulas';

const CURRENT_ZONE_ID = 'greenhollow_fields';

const TIER_COLORS: Record<MobColorTier, string> = {
  grey: '#8c8c8c',
  green: '#2e9e4f',
  yellow: '#b8960c',
  orange: '#d2691e',
  red: '#c0392b',
  unknown: '#7d2ae8',
};

function MonsterLevelBadge({ monsterLevel, playerLevel }: { monsterLevel: number; playerLevel: number }) {
  const diff = monsterLevel - playerLevel;
  const tier = mobColorTier(diff);
  const label = tier === 'unknown' ? '??' : `Lv ${monsterLevel}`;
  return (
    <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }} title={`${tier} — ${diff >= 0 ? '+' : ''}${diff} levels vs you`}>
      {label}
    </span>
  );
}

export function ZoneScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const zone = ZONES[CURRENT_ZONE_ID];
  const [dismissedWelcomeBack, setDismissedWelcomeBack] = useState(false);

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

  if (character.level >= 5 && character.spec === null) {
    return <SpecSelectionScreen />;
  }

  const activity = character.currentActivity;
  const showWelcomeBack = !dismissedWelcomeBack && activity.type !== null && isLongAbsence(activity);

  if (showWelcomeBack) {
    return <WelcomeBackScreen character={character} onContinue={() => setDismissedWelcomeBack(true)} />;
  }

  if (activity.type === 'combat' && activity.targetId) {
    return <CombatScreen monsterId={activity.targetId} />;
  }

  if (activity.type === 'gathering' && activity.targetId) {
    const node = GATHER_NODES[activity.targetId];
    if (node) return <GatheringScreen node={node} />;
  }

  if (activity.type === 'crafting' && activity.targetId) {
    const recipe = RECIPES[activity.targetId];
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
              {monster.name} (<MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} />)
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

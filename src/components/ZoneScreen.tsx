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
import { craftingColorTier } from '../gameData/activityEngine';
import { professionXpForLevel } from '../gameData/xpTables';
import { XpBar } from './XpBar';
import { MonsterLootPanel } from './MonsterLootPanel';
import { ITEMS } from '../gameData/items';
import type { ProfessionId, Recipe, Zone } from '../gameData/types';

function isZoneUnlocked(zone: Zone, characterLevel: number): boolean {
  return zone.unlockRequirement.type === 'none' || characterLevel >= zone.unlockRequirement.level;
}

// Shared by the monster level badge and the crafting recipe color-tier text —
// both use the same classic-WoW grey/green/yellow/orange/red palette.
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

export function ZoneScreen({
  selectedZoneId,
  onSelectZone,
}: {
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
}) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [dismissedWelcomeBack, setDismissedWelcomeBack] = useState(false);
  const [expandedMonsterId, setExpandedMonsterId] = useState<string | null>(null);
  const zone = ZONES[selectedZoneId];

  async function handleFight(monsterId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'combat', targetId: monsterId, zoneId: zone.id });
    await refetch();
  }

  async function handleGather(nodeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'gathering', targetId: nodeId, zoneId: zone.id });
    await refetch();
  }

  async function handleCraft(recipeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'crafting', targetId: recipeId, zoneId: zone.id });
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

  const professionEntries = Object.entries(character.professions) as [ProfessionId, { level: number; xp: number }][];

  const recipesByProfession = new Map<ProfessionId, Recipe[]>();
  for (const recipe of Object.values(RECIPES)) {
    const list = recipesByProfession.get(recipe.profession) ?? [];
    list.push(recipe);
    recipesByProfession.set(recipe.profession, list);
  }

  return (
    <div className="zone-screen">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {Object.values(ZONES).map((z) => {
          const unlocked = isZoneUnlocked(z, character.level);
          return (
            <button
              key={z.id}
              onClick={() => unlocked && onSelectZone(z.id)}
              disabled={!unlocked}
              title={unlocked ? undefined : `Unlocks at level ${z.unlockRequirement.type === 'characterLevel' ? z.unlockRequirement.level : '?'}`}
              style={{ fontWeight: z.id === zone.id ? 700 : 400 }}
            >
              {z.name}
              {!unlocked && z.unlockRequirement.type === 'characterLevel' ? ` (Lv ${z.unlockRequirement.level})` : ''}
            </button>
          );
        })}
      </div>

      <h1>{zone.name}</h1>
      <p>{zone.description}</p>

      <h2>Monsters</h2>
      <ul>
        {zone.monsterIds.map((monsterId) => {
          const monster = MONSTERS[monsterId];
          const isExpanded = expandedMonsterId === monsterId;
          return (
            <li key={monsterId}>
              {monster.name} (<MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} />)
              <button onClick={() => handleFight(monsterId)}>Fight</button>
              <button onClick={() => setExpandedMonsterId(isExpanded ? null : monsterId)}>Drops</button>
              {isExpanded && <MonsterLootPanel monster={monster} />}
            </li>
          );
        })}
      </ul>

      <h2>Gathering (Mining, Herbalism, Skinning)</h2>
      <ul>
        {zone.gatherNodeIds.map((nodeId) => {
          const node = GATHER_NODES[nodeId];
          const professionLabel = node.profession.charAt(0).toUpperCase() + node.profession.slice(1);
          return (
            <li key={nodeId}>
              {node.name} ({professionLabel}, Lv {node.requiredLevel}+) — yields {ITEMS[node.itemId]?.name ?? node.itemId}
              <button onClick={() => handleGather(nodeId)}>Gather</button>
            </li>
          );
        })}
      </ul>

      {[...recipesByProfession.entries()].map(([professionId, recipes]) => {
        const professionLevel = character.professions[professionId].level;
        const professionLabel = professionId.charAt(0).toUpperCase() + professionId.slice(1);
        return (
          <div key={professionId}>
            <h2>Crafting ({professionLabel})</h2>
            <ul>
              {recipes.map((recipe) => {
                const meetsLevel = professionLevel >= recipe.requiredSkill;
                const tier = craftingColorTier(professionLevel, recipe.requiredSkill, recipe.colorBreakpoints);
                return (
                  <li key={recipe.id}>
                    <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{recipe.name}</span> (requires Lv{' '}
                    {recipe.requiredSkill}) — materials:{' '}
                    {recipe.materials
                      .map((m) => `${m.quantity}x ${ITEMS[m.itemId]?.name ?? m.itemId}`)
                      .join(', ')}
                    <button onClick={() => handleCraft(recipe.id)} disabled={!meetsLevel}>
                      {meetsLevel ? 'Craft' : `Need Lv ${recipe.requiredSkill}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <h2>Professions</h2>
      {professionEntries.map(([professionId, state]) => (
        <XpBar
          key={professionId}
          level={state.level}
          xp={state.xp}
          curve={professionXpForLevel}
          label={professionId.charAt(0).toUpperCase() + professionId.slice(1)}
        />
      ))}
    </div>
  );
}

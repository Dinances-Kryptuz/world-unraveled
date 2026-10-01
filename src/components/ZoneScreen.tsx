import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity, stopActivity } from '../firebase/character';
import { ZONES, GATHER_NODES, FISHING_HOLES } from '../gameData/zones';
import { FishingScreen } from './FishingScreen';
import { MONSTERS } from '../gameData/monsters';
import { RECIPES } from '../gameData/recipes';
import { DUNGEONS } from '../gameData/dungeons';
import { MAX_ACTIVE_COMPANIONS, REQUIRED_DUNGEON_PARTY_SIZE } from '../gameData/companions';
import { CombatScreen } from './CombatScreen';
import { GatheringScreen } from './GatheringScreen';
import { CraftingScreen } from './CraftingScreen';
import { DungeonScreen } from './DungeonScreen';
import { WelcomeBackScreen, isLongAbsence } from './WelcomeBackScreen';
import { SpecSelectionScreen } from './SpecSelectionScreen';
import { craftingColorTier } from '../gameData/activityEngine';
import { getProfessionState, PROFESSION_LABELS, checkLearnProfession, checkRankUp } from '../gameData/professionTiers';
import { trainersInZone } from '../gameData/professionTrainers';
import { learnProfession, advanceProfessionRank, abandonProfession, canUseRecipe } from '../firebase/professions';
import { professionXpForLevel } from '../gameData/xpTables';
import { XpBar } from './XpBar';
import { MonsterLootPanel } from './MonsterLootPanel';
import { MonsterLevelBadge, CombatTypeBadge, TIER_COLORS } from './MonsterLevelBadge';
import { ITEMS } from '../gameData/items';
import { describeItemStats } from '../gameData/equipmentStats';
import { resolveSpecDef } from '../gameData/combatProfileWithTalents';
import { COMBAT_TYPE_ICONS, COMBAT_TYPE_LABELS } from '../gameData/combatTriangle';
import type { ProfessionId, Recipe, Zone } from '../gameData/types';

function isZoneUnlocked(zone: Zone, characterLevel: number): boolean {
  return zone.unlockRequirement.type === 'none' || characterLevel >= zone.unlockRequirement.level;
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
  const [activeDungeonId, setActiveDungeonId] = useState<string | null>(null);
  const zone = ZONES[selectedZoneId];

  async function handleFight(monsterId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'combat', targetId: monsterId, zoneId: zone.id });
    await refetch();
  }

  // Dungeons are deliberately not written to currentActivity (see
  // DungeonScreen's own doc comment) — entering one just clears whatever
  // regular activity was running so it doesn't keep "elapsing" underneath
  // the run, and local state alone decides which screen renders.
  async function handleEnterDungeon(dungeonId: string) {
    if (!user) return;
    await stopActivity(user.uid);
    await refetch();
    setActiveDungeonId(dungeonId);
  }

  async function handleGather(nodeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'gathering', targetId: nodeId, zoneId: zone.id });
    await refetch();
  }

  async function handleFish(holeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'fishing', targetId: holeId, zoneId: zone.id });
    await refetch();
  }

  async function handleCraft(recipeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'crafting', targetId: recipeId, zoneId: zone.id });
    await refetch();
  }

  async function handleLearnProfession(professionId: ProfessionId) {
    if (!user) return;
    await learnProfession(user.uid, professionId);
    await refetch();
  }

  async function handleAdvanceRank(professionId: ProfessionId) {
    if (!user) return;
    await advanceProfessionRank(user.uid, professionId);
    await refetch();
  }

  async function handleAbandon(professionId: ProfessionId) {
    if (!user) return;
    if (!confirm(`Abandon ${PROFESSION_LABELS[professionId]}? Your skill progress will be lost.`)) return;
    await abandonProfession(user.uid, professionId);
    await refetch();
  }

  if (!character) return null;

  if (character.level >= 5 && character.spec === null) {
    return <SpecSelectionScreen />;
  }

  if (activeDungeonId) {
    return <DungeonScreen dungeonId={activeDungeonId} onExit={() => setActiveDungeonId(null)} />;
  }

  const activity = character.currentActivity;
  const showWelcomeBack = !dismissedWelcomeBack && activity.type !== null && isLongAbsence(activity);
  const playerCombatType = resolveSpecDef(character.class, character.spec).combatType;

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

  if (activity.type === 'fishing' && activity.targetId) {
    const hole = FISHING_HOLES[activity.targetId];
    if (hole) return <FishingScreen hole={hole} />;
  }

  if (activity.type === 'crafting' && activity.targetId) {
    const recipe = RECIPES[activity.targetId];
    if (recipe) return <CraftingScreen recipe={recipe} />;
  }

  const professionEntries = Object.entries(character.professions) as [ProfessionId, { level: number; xp: number; unlockedTier: import('../gameData/types').ProfessionTierName }][];
  const knownProfessionIds = new Set(professionEntries.map(([id]) => id));

  // Only professions the character actually knows show up as craftable —
  // an unknown profession's recipes are invisible rather than
  // visible-but-disabled, matching "learn it at a trainer first."
  const recipesByProfession = new Map<ProfessionId, Recipe[]>();
  for (const recipe of Object.values(RECIPES)) {
    if (!knownProfessionIds.has(recipe.profession)) continue;
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
      <p>
        <small>
          Enemy composition:{' '}
          {(['melee', 'ranged', 'magic'] as const)
            .map((t) => ({ t, count: zone.monsterIds.filter((id) => MONSTERS[id].combatType === t).length }))
            .filter(({ count }) => count > 0)
            .map(({ t, count }) => `${COMBAT_TYPE_ICONS[t]} ${COMBAT_TYPE_LABELS[t]} (${count})`)
            .join(' · ')}
        </small>
      </p>

      <h2>Monsters</h2>
      <ul>
        {zone.monsterIds.map((monsterId) => {
          const monster = MONSTERS[monsterId];
          const isExpanded = expandedMonsterId === monsterId;
          return (
            <li key={monsterId}>
              {monster.name} (<MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} />{' '}
              <CombatTypeBadge monsterType={monster.combatType} playerType={playerCombatType} />)
              <button onClick={() => handleFight(monsterId)}>Fight</button>
              <button onClick={() => setExpandedMonsterId(isExpanded ? null : monsterId)}>Drops</button>
              {isExpanded && <MonsterLootPanel monster={monster} />}
            </li>
          );
        })}
      </ul>

      {Object.values(DUNGEONS)
        .filter((d) => d.zoneId === zone.id)
        .map((dungeon) => {
          const partySize = character.activeCompanionIds.length + 1;
          const readyForDungeon = character.activeCompanionIds.length === MAX_ACTIVE_COMPANIONS;
          return (
            <div key={dungeon.id}>
              <h2>Dungeons</h2>
              <ul>
                <li>
                  <div>
                    <strong>{dungeon.name}</strong> (Lv {dungeon.levelRange[0]}–{dungeon.levelRange[1]}) —{' '}
                    {dungeon.description}
                    <br />
                    <small>{dungeon.stages.length} stages, ending in a boss</small>
                    <br />
                    <small>
                      Requires a full party of {REQUIRED_DUNGEON_PARTY_SIZE} — you have {partySize}/
                      {REQUIRED_DUNGEON_PARTY_SIZE} (see Companions below to recruit and add more)
                    </small>
                  </div>
                  <button onClick={() => handleEnterDungeon(dungeon.id)} disabled={!readyForDungeon}>
                    Enter
                  </button>
                </li>
              </ul>
            </div>
          );
        })}

      <h2>Gathering</h2>
      <ul>
        {zone.gatherNodeIds.map((nodeId) => {
          const node = GATHER_NODES[nodeId];
          const professionLabel = PROFESSION_LABELS[node.profession];
          if (!knownProfessionIds.has(node.profession)) {
            return (
              <li key={nodeId} style={{ opacity: 0.6 }}>
                {node.name} ({professionLabel}) — learn {professionLabel} at a trainer below to gather here.
              </li>
            );
          }
          const skillLevel = getProfessionState(character.professions, node.profession).level;
          const meetsLevel = skillLevel >= node.requiredLevel;
          const tier = craftingColorTier(skillLevel, node.requiredLevel, node.colorBreakpoints);
          const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
          const hasRequiredTool = !node.requiredToolType || equippedTool?.toolType === node.requiredToolType;
          const canGather = meetsLevel && hasRequiredTool;
          return (
            <li key={nodeId}>
              <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{node.name}</span> ({professionLabel}, skill{' '}
              {node.requiredLevel}+) — yields {ITEMS[node.itemId]?.name ?? node.itemId}
              <button onClick={() => handleGather(nodeId)} disabled={!canGather}>
                {!meetsLevel ? `Need skill ${node.requiredLevel}` : !hasRequiredTool ? 'Need tool equipped' : 'Gather'}
              </button>
            </li>
          );
        })}
      </ul>

      <h2>Fishing</h2>
      <ul>
        {zone.fishingHoleIds.map((holeId) => {
          const hole = FISHING_HOLES[holeId];
          if (!knownProfessionIds.has('fishing')) {
            return (
              <li key={holeId} style={{ opacity: 0.6 }}>
                {hole.name} (Fishing) — learn Fishing at a trainer below to fish here.
              </li>
            );
          }
          const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
          const hasRod = equippedTool?.toolType === 'fishing_rod';
          return (
            <li key={holeId}>
              {hole.name} — yields {hole.lootTable.map((d) => ITEMS[d.itemId]?.name ?? d.itemId).join(', ')}
              <button onClick={() => handleFish(holeId)} disabled={!hasRod}>
                {hasRod ? 'Fish' : 'Need Fishing Rod equipped'}
              </button>
            </li>
          );
        })}
      </ul>

      {[...recipesByProfession.entries()].map(([professionId, recipes]) => {
        const professionLevel = getProfessionState(character.professions, professionId).level;
        const professionLabel = PROFESSION_LABELS[professionId];
        return (
          <div key={professionId}>
            <h2>Crafting ({professionLabel})</h2>
            <ul>
              {recipes
                .filter((recipe) => canUseRecipe(character, recipe))
                .map((recipe) => {
                  const meetsSkill = professionLevel >= recipe.requiredSkill;
                  const meetsLevel = !recipe.requiredCharacterLevel || character.level >= recipe.requiredCharacterLevel;
                  const canCraft = meetsSkill && meetsLevel;
                  const tier = craftingColorTier(professionLevel, recipe.requiredSkill, recipe.colorBreakpoints);
                  const resultItem = ITEMS[recipe.resultItemId];
                  return (
                    <li key={recipe.id}>
                      <span
                        style={{ color: TIER_COLORS[tier], fontWeight: 700, cursor: 'help' }}
                        title={resultItem ? describeItemStats(resultItem) : undefined}
                      >
                        {recipe.name}
                      </span>{' '}
                      (requires skill {recipe.requiredSkill}
                      {recipe.requiredCharacterLevel ? `, Lv ${recipe.requiredCharacterLevel}` : ''}) — materials:{' '}
                      {recipe.materials
                        .map((m) => `${m.quantity}x ${ITEMS[m.itemId]?.name ?? m.itemId}`)
                        .join(', ')}
                      <button onClick={() => handleCraft(recipe.id)} disabled={!canCraft}>
                        {canCraft ? 'Craft' : !meetsLevel ? `Need Lv ${recipe.requiredCharacterLevel}` : `Need skill ${recipe.requiredSkill}`}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        );
      })}

      <h2>Profession Trainers</h2>
      <ul>
        {trainersInZone(zone.id).map(({ profession, rank }) => {
          const label = PROFESSION_LABELS[profession];
          const state = character.professions[profession];

          if (rank === 'apprentice') {
            if (state) return null; // already learned — nothing to do with this trainer
            const check = checkLearnProfession(profession, Object.keys(character.professions) as ProfessionId[], character.level, character.gold);
            return (
              <li key={profession}>
                Learn {label} ({check.goldCost} gold)
                <button onClick={() => handleLearnProfession(profession)} disabled={!check.ok}>
                  Learn
                </button>
                {!check.ok && <small> — {check.reason}</small>}
              </li>
            );
          }

          if (!state || state.unlockedTier !== PROFESSION_TIER_BELOW[rank]) return null; // not relevant yet / already past
          const check = checkRankUp(profession, state.level, state.unlockedTier, character.level, character.gold);
          return (
            <li key={profession}>
              Train {rank[0].toUpperCase() + rank.slice(1)} {label} ({check.goldCost} gold)
              <button onClick={() => handleAdvanceRank(profession)} disabled={!check.ok}>
                Train
              </button>
              {!check.ok && <small> — {check.reason}</small>}
            </li>
          );
        })}
      </ul>

      <h2>Professions</h2>
      {professionEntries.map(([professionId, state]) => (
        <div key={professionId} style={{ marginBottom: 8 }}>
          <XpBar
            level={state.level}
            xp={state.xp}
            curve={professionXpForLevel}
            label={`${PROFESSION_LABELS[professionId]} (${state.unlockedTier})`}
          />
          <button onClick={() => handleAbandon(professionId)}>Abandon {PROFESSION_LABELS[professionId]}</button>
        </div>
      ))}
      {professionEntries.length === 0 && <p>You haven’t learned any professions yet — visit a trainer above.</p>}
    </div>
  );
}

const PROFESSION_TIER_BELOW: Record<import('../gameData/types').ProfessionTierName, import('../gameData/types').ProfessionTierName> = {
  apprentice: 'apprentice', // unused — apprentice is handled by the learn-profession branch above
  journeyman: 'apprentice',
  expert: 'journeyman',
  artisan: 'expert',
};

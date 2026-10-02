import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity } from '../../firebase/character';
import { ZONES, GATHER_NODES } from '../../gameData/zones';
import { getProfessionState, PROFESSION_LABELS, PROFESSION_CATEGORY } from '../../gameData/professionTiers';
import { craftingColorTier } from '../../gameData/activityEngine';
import { ITEMS } from '../../gameData/items';
import { TIER_COLORS } from '../MonsterLevelBadge';
import { ProfessionTrainerList } from './ProfessionTrainerList';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId } from '../../gameData/types';

const GATHERING_PROFESSION_IDS = (Object.keys(PROFESSION_CATEGORY) as ProfessionId[]).filter(
  (id) => PROFESSION_CATEGORY[id] === 'gathering'
);

// One of the three Professions sub-pages (see Sidebar.tsx) — shows the
// CURRENT zone's gather nodes only, per explicit direction: picking
// Gathering should show what you can gather right where you are, not a
// global list. Trainers/known-skill summary below are filtered to just
// Herbalism/Mining/Skinning.
export function GatheringProfessionsScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const zone = ZONES[zoneId];

  async function handleGather(nodeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'gathering', targetId: nodeId, zoneId: zone.id });
    await refetch();
  }

  if (!character) return null;

  const knownProfessionIds = new Set(Object.keys(character.professions) as ProfessionId[]);

  return (
    <div className="zone-screen">
      <h2>Gathering — {zone.name}</h2>
      <ul>
        {zone.gatherNodeIds.map((nodeId) => {
          const node = GATHER_NODES[nodeId];
          const professionLabel = PROFESSION_LABELS[node.profession];
          if (!knownProfessionIds.has(node.profession)) {
            return (
              <li key={nodeId} style={{ opacity: 0.6 }}>
                {node.name} ({professionLabel}) — learn {professionLabel} below to gather here.
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
        {zone.gatherNodeIds.length === 0 && <p>No gathering nodes in this zone.</p>}
      </ul>

      <ProfessionTrainerList zoneId={zoneId} professionIds={GATHERING_PROFESSION_IDS} />
      <ProfessionSummaryList professionIds={GATHERING_PROFESSION_IDS} />
    </div>
  );
}

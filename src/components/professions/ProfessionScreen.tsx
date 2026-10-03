import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity } from '../../firebase/character';
import { ZONES, GATHER_NODES, FISHING_HOLES } from '../../gameData/zones';
import { RECIPES } from '../../gameData/recipes';
import { PROFESSION_LABELS, PROFESSION_CATEGORY, getProfessionState } from '../../gameData/professionTiers';
import { craftingColorTier } from '../../gameData/activityEngine';
import { canUseRecipe } from '../../firebase/professions';
import { ITEMS } from '../../gameData/items';
import { describeItemStats } from '../../gameData/equipmentStats';
import { TIER_COLORS } from '../MonsterLevelBadge';
import { ProfessionTrainerList } from './ProfessionTrainerList';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId } from '../../gameData/types';

// A single profession's own page — one per sidebar nav item (see
// Sidebar.tsx), replacing the old three-category pages (Gathering/Fishing/
// Crafting) that stacked every known crafting profession's full recipe list
// onto one screen. Gathering/Fishing content is filtered to the current
// zone (gather nodes/fishing holes are genuinely zone-specific); Crafting's
// recipe list is NOT (a known recipe has no zoneId in the data model at all
// and is craftable anywhere — only the trainer below is zone-scoped).
export function ProfessionScreen({ professionId, zoneId }: { professionId: ProfessionId; zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const zone = ZONES[zoneId];
  const label = PROFESSION_LABELS[professionId];
  const category = PROFESSION_CATEGORY[professionId];

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
    await startActivity(user.uid, { type: 'crafting', targetId: recipeId, zoneId });
    await refetch();
  }

  if (!character) return null;
  const char = character;

  const known = !!char.professions[professionId];
  const professionLevel = getProfessionState(char.professions, professionId).level;
  const recipesForProfession = Object.values(RECIPES).filter((recipe) => recipe.profession === professionId);

  function renderRecipeList() {
    return (
      <ul>
        {recipesForProfession
          .filter((recipe) => canUseRecipe(char, recipe))
          .map((recipe) => {
            const meetsSkill = professionLevel >= recipe.requiredSkill;
            const meetsLevel = !recipe.requiredCharacterLevel || char.level >= recipe.requiredCharacterLevel;
            const meetsGold = !recipe.goldCost || char.gold >= recipe.goldCost;
            const canCraft = meetsSkill && meetsLevel && meetsGold;
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
                {recipe.materials.map((m) => `${m.quantity}x ${ITEMS[m.itemId]?.name ?? m.itemId}`).join(', ')}
                {recipe.goldCost ? ` + ${recipe.goldCost} gold` : ''}
                <button onClick={() => handleCraft(recipe.id)} disabled={!canCraft}>
                  {canCraft
                    ? 'Craft'
                    : !meetsLevel
                      ? `Need Lv ${recipe.requiredCharacterLevel}`
                      : !meetsSkill
                        ? `Need skill ${recipe.requiredSkill}`
                        : `Need ${recipe.goldCost} gold`}
                </button>
              </li>
            );
          })}
      </ul>
    );
  }

  return (
    <div className="zone-screen">
      <h2>{label}</h2>

      {category === 'gathering' && (
        <ul>
          {zone.gatherNodeIds
            .map((id) => GATHER_NODES[id])
            .filter((node) => node.profession === professionId)
            .map((node) => {
              if (!known) {
                return (
                  <li key={node.id} style={{ opacity: 0.6 }}>
                    {node.name} — learn {label} below to gather here.
                  </li>
                );
              }
              const meetsLevel = professionLevel >= node.requiredLevel;
              const tier = craftingColorTier(professionLevel, node.requiredLevel, node.colorBreakpoints);
              const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
              const hasRequiredTool = !node.requiredToolType || equippedTool?.toolType === node.requiredToolType;
              const canGather = meetsLevel && hasRequiredTool;
              return (
                <li key={node.id}>
                  <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{node.name}</span> (skill {node.requiredLevel}+)
                  — yields {ITEMS[node.itemId]?.name ?? node.itemId}
                  <button onClick={() => handleGather(node.id)} disabled={!canGather}>
                    {!meetsLevel ? `Need skill ${node.requiredLevel}` : !hasRequiredTool ? 'Need tool equipped' : 'Gather'}
                  </button>
                </li>
              );
            })}
          {zone.gatherNodeIds.filter((id) => GATHER_NODES[id].profession === professionId).length === 0 && (
            <p>No {label} nodes in {zone.name}.</p>
          )}
        </ul>
      )}

      {/* Smelting lives here rather than under Blacksmithing — turning ore
          into bars is a Mining skill in its own right (gated on Mining
          skill, grants Mining XP); Blacksmithing recipes then consume those
          bars like any other material. Only Mining currently has any
          recipes tagged to it, so this renders for no other gathering
          profession. */}
      {category === 'gathering' && recipesForProfession.length > 0 && (
        <>
          <h3>Smelting</h3>
          {!known && <p>You don't know {label} yet — learn it below.</p>}
          {known && renderRecipeList()}
        </>
      )}

      {category === 'fishing' && (
        <ul>
          {zone.fishingHoleIds.map((holeId) => {
            const hole = FISHING_HOLES[holeId];
            if (!known) {
              return (
                <li key={holeId} style={{ opacity: 0.6 }}>
                  {hole.name} — learn {label} below to fish here.
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
          {zone.fishingHoleIds.length === 0 && <p>No fishing holes in {zone.name}.</p>}
        </ul>
      )}

      {category === 'production' && (
        <>
          {!known && <p>You don't know {label} yet — learn it below.</p>}
          {known && renderRecipeList()}
        </>
      )}

      <ProfessionTrainerList zoneId={zoneId} professionIds={[professionId]} />
      <ProfessionSummaryList professionIds={[professionId]} />
    </div>
  );
}

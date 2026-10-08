import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity } from '../../firebase/character';
import { ZONES, GATHER_NODES, FISHING_HOLES } from '../../gameData/zones';
import { RECIPES } from '../../gameData/recipes';
import { PROFESSION_LABELS, PROFESSION_CATEGORY, getProfessionState } from '../../gameData/professionTiers';
import { gatheringColorTier, GATHERING_COLOR_XP_PCT } from '../../gameData/gatheringEngine';
import { craftingColorTier, CRAFTING_COLOR_XP_PCT } from '../../gameData/craftingEngine';
import { canUseRecipe } from '../../firebase/professions';
import { ITEMS } from '../../gameData/items';
import { describeItemStats } from '../../gameData/equipmentStats';
import { TIER_COLORS } from '../MonsterLevelBadge';
import { ItemSlot } from '../ItemSlot';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId } from '../../gameData/types';

// Smithing's full-armor recipe ids are prefixed by their metal tier (plain
// for the STR+STA plate line, 'sacred_<tier>_' for the INT+SPI cloth line —
// see recipes.ts/items.ts's generated Blacksmithing section) — order here
// is display order for the dropdown list, matching the zone progression.
const SMITHING_TIER_ORDER = ['copper', 'bronze', 'iron', 'steel', 'mithril', 'thorium', 'obsidian', 'silver', 'gold', 'platinum'];
const SMITHING_TIER_LABELS: Record<string, string> = {
  copper: 'Copper', bronze: 'Bronze', iron: 'Iron', steel: 'Steel', mithril: 'Mithril',
  thorium: 'Thorium', obsidian: 'Obsidian', silver: 'Silver Jewelry', gold: 'Gold Jewelry', platinum: 'Platinum Jewelry',
};

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

  function renderRecipeList(recipesToShow: typeof recipesForProfession = recipesForProfession) {
    return (
      <ul>
        {recipesToShow
          .filter((recipe) => canUseRecipe(char, recipe))
          .map((recipe) => {
            const meetsSkill = professionLevel >= recipe.requiredSkill;
            const meetsLevel = !recipe.requiredCharacterLevel || char.level >= recipe.requiredCharacterLevel;
            const meetsGold = !recipe.goldCost || char.gold >= recipe.goldCost;
            const canCraft = meetsSkill && meetsLevel && meetsGold;
            // All 6 crafting professions now share craftingEngine.ts's
            // level-delta color formula — "red" (below requiredSkill) stays
            // a purely gating display on top of it. Mining's Smelting
            // recipes land here too (tagged to a gathering-category
            // profession) and still show a color/XP% for flavor even though
            // they never actually earn Mining XP (see CraftingScreen's
            // earnsProfessionXp comment) — harmless since the % is never
            // read anywhere but this tooltip.
            const tier = !meetsSkill ? 'red' : craftingColorTier(professionLevel, recipe.requiredSkill);
            const resultItem = ITEMS[recipe.resultItemId];
            const masteryLevel = getProfessionState(char.professions, professionId).mastery?.[recipe.id]?.level ?? 0;
            return (
              <li key={recipe.id}>
                <div className="item-row-main">
                  {resultItem && <ItemSlot item={resultItem} />}
                  <span>
                    <span
                      style={{ color: TIER_COLORS[tier], fontWeight: 700, cursor: 'help' }}
                      title={resultItem ? describeItemStats(resultItem) : undefined}
                    >
                      {recipe.name}
                    </span>{' '}
                    (requires level {recipe.requiredSkill}
                    {recipe.requiredCharacterLevel ? `, Lv ${recipe.requiredCharacterLevel}` : ''}
                    {meetsSkill ? `, ${(CRAFTING_COLOR_XP_PCT[tier as keyof typeof CRAFTING_COLOR_XP_PCT] * 100).toFixed(0)}% XP` : ''}
                    ) — materials:{' '}
                    {recipe.materials.map((m) => `${m.quantity}x ${ITEMS[m.itemId]?.name ?? m.itemId}`).join(', ')}
                    {recipe.goldCost ? ` + ${recipe.goldCost} gold` : ''}
                    {known ? ` — Mastery ${masteryLevel}` : ''}
                  </span>
                </div>
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

  // Smithing's full armor buildout (masteryEngine.ts's pilot) is ~130
  // recipes — a single flat list would be unusable, so it's grouped into
  // one clickable dropdown per metal tier, the same pattern as Mining's own
  // Smelting section below. A recipe not matching any known tier slug
  // (the two Blacksmith repair recipes, the quest-taught Emberforged
  // Gauntlets) falls into a final ungrouped section rather than vanishing.
  function renderGroupedSmithingRecipes() {
    const grouped = new Map<string, typeof recipesForProfession>();
    const ungrouped: typeof recipesForProfession = [];
    for (const recipe of recipesForProfession) {
      const slug = SMITHING_TIER_ORDER.find((s) => {
        const stripped = recipe.id.startsWith('sacred_') ? recipe.id.slice('sacred_'.length) : recipe.id;
        return stripped.startsWith(`${s}_`);
      });
      if (!slug) {
        ungrouped.push(recipe);
        continue;
      }
      if (!grouped.has(slug)) grouped.set(slug, []);
      grouped.get(slug)!.push(recipe);
    }
    return (
      <>
        {SMITHING_TIER_ORDER.filter((slug) => grouped.has(slug)).map((slug) => (
          <details key={slug}>
            <summary>{SMITHING_TIER_LABELS[slug]}</summary>
            {renderRecipeList(grouped.get(slug))}
          </details>
        ))}
        {ungrouped.length > 0 && (
          <details>
            <summary>Other</summary>
            {renderRecipeList(ungrouped)}
          </details>
        )}
      </>
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
                    {node.name} — learn {label} at the Professions Trainer to gather here.
                  </li>
                );
              }
              const meetsLevel = professionLevel >= node.requiredLevel;
              const tier = !meetsLevel ? 'red' : gatheringColorTier(professionLevel, node.requiredLevel);
              const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
              const hasRequiredTool = !node.requiredToolType || equippedTool?.toolType === node.requiredToolType;
              const canGather = meetsLevel && hasRequiredTool;
              const yieldItem = ITEMS[node.itemId];
              const bonusItem = node.rareBonus ? ITEMS[node.rareBonus.itemId] : null;
              const masteryLevel = getProfessionState(char.professions, professionId).mastery?.[node.id]?.level ?? 0;
              return (
                <li key={node.id}>
                  <div className="item-row-main">
                    {yieldItem && <ItemSlot item={yieldItem} />}
                    <span>
                      <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{node.name}</span> (level{' '}
                      {node.requiredLevel}+
                      {meetsLevel ? `, ${(GATHERING_COLOR_XP_PCT[tier as keyof typeof GATHERING_COLOR_XP_PCT] * 100).toFixed(0)}% XP` : ''}
                      ) — yields {yieldItem?.name ?? node.itemId}
                      {bonusItem ? ` (+${(node.rareBonus!.chance * 100).toFixed(0)}% chance of ${bonusItem.name})` : ''}
                      {known ? ` — Mastery ${masteryLevel}` : ''}
                    </span>
                  </div>
                  <button onClick={() => handleGather(node.id)} disabled={!canGather}>
                    {!meetsLevel ? `Need level ${node.requiredLevel}` : !hasRequiredTool ? 'Need tool equipped' : 'Gather'}
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
        <details>
          <summary>Smelting</summary>
          {!known && <p>You don't know {label} yet — learn it at the Professions Trainer.</p>}
          {known && renderRecipeList()}
        </details>
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
            const meetsLevel = professionLevel >= hole.requiredLevel;
            const tier = !meetsLevel ? 'red' : gatheringColorTier(professionLevel, hole.requiredLevel);
            const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
            const hasRod = equippedTool?.toolType === 'fishing_rod';
            const canFish = meetsLevel && hasRod;
            const yieldItem = ITEMS[hole.itemId];
            const masteryLevel = getProfessionState(char.professions, 'fishing').mastery?.[holeId]?.level ?? 0;
            return (
              <li key={holeId}>
                <div className="item-row-main">
                  {yieldItem && <ItemSlot item={yieldItem} />}
                  <span>
                    <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{hole.name}</span> (level{' '}
                    {hole.requiredLevel}+
                    {meetsLevel ? `, ${(GATHERING_COLOR_XP_PCT[tier as keyof typeof GATHERING_COLOR_XP_PCT] * 100).toFixed(0)}% XP` : ''}
                    ) — yields {yieldItem?.name ?? hole.itemId} ({(hole.catchChance * 100).toFixed(0)}% catch chance)
                    {known ? ` — Mastery ${masteryLevel}` : ''}
                  </span>
                </div>
                <button onClick={() => handleFish(holeId)} disabled={!canFish}>
                  {!meetsLevel ? `Need level ${hole.requiredLevel}` : !hasRod ? 'Need Fishing Rod equipped' : 'Fish'}
                </button>
              </li>
            );
          })}
          {zone.fishingHoleIds.length === 0 && <p>No fishing holes in {zone.name}.</p>}
        </ul>
      )}

      {category === 'production' && (
        <>
          {!known && <p>You don't know {label} yet — learn it at the Professions Trainer.</p>}
          {known && (professionId === 'smithing' ? renderGroupedSmithingRecipes() : renderRecipeList())}
        </>
      )}

      <ProfessionSummaryList professionIds={[professionId]} />
    </div>
  );
}

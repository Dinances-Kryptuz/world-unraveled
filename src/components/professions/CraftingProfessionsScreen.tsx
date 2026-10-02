import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity } from '../../firebase/character';
import { RECIPES } from '../../gameData/recipes';
import { getProfessionState, PROFESSION_LABELS, PROFESSION_CATEGORY } from '../../gameData/professionTiers';
import { craftingColorTier } from '../../gameData/activityEngine';
import { canUseRecipe } from '../../firebase/professions';
import { ITEMS } from '../../gameData/items';
import { describeItemStats } from '../../gameData/equipmentStats';
import { TIER_COLORS } from '../MonsterLevelBadge';
import { ProfessionTrainerList } from './ProfessionTrainerList';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId, Recipe } from '../../gameData/types';

const CRAFTING_PROFESSION_IDS = (Object.keys(PROFESSION_CATEGORY) as ProfessionId[]).filter(
  (id) => PROFESSION_CATEGORY[id] === 'production'
);

// One of the three Professions sub-pages (see Sidebar.tsx). Unlike
// Gathering/Fishing, the recipe list itself is NOT zone-filtered — a known
// recipe is craftable anywhere you have the materials, same as it always
// was (recipes have no zoneId in the data model at all). Only the trainers
// below are zone-scoped, same as every other category.
export function CraftingProfessionsScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();

  async function handleCraft(recipeId: string) {
    if (!user || !character) return;
    await startActivity(user.uid, { type: 'crafting', targetId: recipeId, zoneId });
    await refetch();
  }

  if (!character) return null;

  const knownProfessionIds = new Set(Object.keys(character.professions) as ProfessionId[]);
  const recipesByProfession = new Map<ProfessionId, Recipe[]>();
  for (const recipe of Object.values(RECIPES)) {
    if (!CRAFTING_PROFESSION_IDS.includes(recipe.profession) || !knownProfessionIds.has(recipe.profession)) continue;
    const list = recipesByProfession.get(recipe.profession) ?? [];
    list.push(recipe);
    recipesByProfession.set(recipe.profession, list);
  }

  return (
    <div className="zone-screen">
      <h2>Crafting</h2>
      {[...recipesByProfession.entries()].map(([professionId, recipes]) => {
        const professionLevel = getProfessionState(character.professions, professionId).level;
        const professionLabel = PROFESSION_LABELS[professionId];
        return (
          <div key={professionId}>
            <h3>{professionLabel}</h3>
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
      {recipesByProfession.size === 0 && <p>You don't know any crafting professions yet — learn one below.</p>}

      <ProfessionTrainerList zoneId={zoneId} professionIds={CRAFTING_PROFESSION_IDS} />
      <ProfessionSummaryList professionIds={CRAFTING_PROFESSION_IDS} />
    </div>
  );
}

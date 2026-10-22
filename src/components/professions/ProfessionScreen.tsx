import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity, advanceDisenchantQueue } from '../../firebase/character';
import { ZONES, GATHER_NODES, FISHING_HOLES } from '../../gameData/zones';
import { RECIPES } from '../../gameData/recipes';
import { PROFESSION_LABELS, PROFESSION_CATEGORY, PROFESSION_MILESTONE_LEVELS, getProfessionState } from '../../gameData/professionTiers';
import { gatheringColorTier, GATHERING_COLOR_XP_PCT, fishingZoneMasteryPercent } from '../../gameData/gatheringEngine';
import { craftingColorTier, CRAFTING_COLOR_XP_PCT } from '../../gameData/craftingEngine';
import { canUseRecipe } from '../../firebase/professions';
import { useEnchantScroll, removeEnchant } from '../../firebase/enchanting';
import { subscribeToInventory, isLocked } from '../../firebase/inventory';
import { ENCHANTS, describeEnchantEffect, isDisenchantable, disenchantRequiredSkill, disenchantYieldRange, type EnchantCategory } from '../../gameData/enchanting';
import { ITEMS } from '../../gameData/items';
import { equippedItemId, toolTypeToEquipSlot } from '../../gameData/equipmentStats';
import { describeItemStats } from '../../gameData/equipmentStats';
import { MATERIALS, LEATHER_MATERIALS, CLOTH_MATERIALS, WOOD_MATERIALS, getMaterial, type MaterialDef } from '../../gameData/materials';
import { getItemDisplayName, equipmentSuffixFor } from '../../gameData/equipmentSuffixes';
import { rarityColor, inferItemRarity, RARITY_LABELS, RARITY_COLORS } from '../../gameData/itemRarity';
import { materialIdForItem } from '../../gameData/itemMetadata';
import { matchesInventoryFilter, type InventoryEntry } from '../../gameData/inventorySort';
import {
  materialMasteryPercent,
  materialMasterySpeedMultiplier,
  materialMasteryBonusChance,
  MATERIAL_MASTERY_XP_THRESHOLDS,
} from '../../gameData/equipmentRolls';
import { AUTO_EAT_RANKS } from '../../gameData/cooking';
import { purchaseAutoEatRank } from '../../firebase/cooking';
import { TIER_COLORS } from '../MonsterLevelBadge';
import { ItemSlot } from '../ItemSlot';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId, EquipmentSlot } from '../../gameData/types';
import type { Inventory } from '../../types/character';

// The 6 equipment slots any enchant actually targets (ENCHANTS' own slot
// values — see gameData/enchanting.ts) in a sensible display order, used by
// the Active Enchants list.
const ENCHANT_SLOTS: EquipmentSlot[] = ['weapon', 'chest', 'bracers', 'gloves', 'legs', 'boots', 'ring', 'cape'];

// Smithing's full-armor recipe ids are prefixed by their metal/jewelry tier
// (see recipes.ts's Recipe.materialId and items.ts's generated Blacksmithing
// section) — derived from the same gameData/materials.ts registry the
// Mastery panel below reads, rather than a second hand-maintained list, so
// a future material only needs registering once. The jewelry tiers get a
// "Jewelry" suffix here (a display nuance specific to this dropdown
// grouping, not the material's own name — see materials.ts's doc comment
// on why MaterialDef.name stays a bare name for the Mastery/title system).
const SMITHING_TIER_ORDER = MATERIALS.map((m) => m.id);
const JEWELRY_MATERIAL_IDS = new Set(['silver', 'gold', 'platinum']);
const SMITHING_TIER_LABELS: Record<string, string> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, JEWELRY_MATERIAL_IDS.has(m.id) ? `${m.name} Jewelry` : m.name])
);

// Same grouping pattern for Leatherworking's own 6-tier armor buildout (see
// recipes.ts's Leatherworking-overhaul module comment) — no jewelry-style
// suffix needed since Leatherworking has no jewelry tier. Deliberately a
// SEPARATE id list from LEATHER_MATERIALS (used only by the Mastery panel
// below): recipe/item ids are prefixed by the tier's EQUIPMENT-LINE name
// (handstitched_leather_helm, etc.) while LEATHER_MATERIALS' ids are the
// MASTERY slugs (light_leather, etc.) — the two namespaces only happen to
// coincide for the 6th tier (both "emberscar_leather"), per materials.ts's
// own module comment on why the two are independent.
const LEATHERWORKING_TIER_ORDER = [
  'handstitched_leather',
  'fine_leather',
  'barbaric_leather',
  'nightscape_leather',
  'wicked_leather',
  'emberscar_leather',
];
const LEATHERWORKING_TIER_LABELS: Record<string, string> = {
  handstitched_leather: 'Handstitched Leather',
  fine_leather: 'Fine Leather',
  barbaric_leather: 'Barbaric Leather',
  nightscape_leather: 'Nightscape Leather',
  wicked_leather: 'Wicked Leather',
  emberscar_leather: 'Emberscar Leather',
};

// Same grouping pattern again for Tailoring's own 84-recipe buildout (36
// cloth armor + 6 capes + 42 shirts) — the armor/shirt recipe ids are
// prefixed by the cloth tier's own slug (tailored_linen_helm,
// wool_shirt_of_mastery, etc.), close to but not identical to
// CLOTH_MATERIALS' own ids (runecloth/ember_cloth vs. this slug's
// runecloth/ember — see materials.ts's doc comment on why item/recipe-id
// prefixes and Mastery material ids are independent namespaces). Capes
// (cape_of_linen, etc.) and the 4 bag recipes don't match any tier prefix
// and fall into the existing "Other" bucket, same as Smithing's repair
// recipes.
const TAILORING_TIER_ORDER = ['tailored_linen', 'wool', 'silk', 'mageweave', 'runecloth', 'ember'];
const TAILORING_TIER_LABELS: Record<string, string> = {
  tailored_linen: 'Linen',
  wool: 'Wool',
  silk: 'Silk',
  mageweave: 'Mageweave',
  runecloth: 'Runecloth',
  ember: 'Ember',
};

// Enchanting overhaul's Wand/Staff/Book buildout (6 zones x 3 types) — same
// grouping pattern again, this time scoped to JUST those 18 recipes (see
// renderEnchantingPanel's own recipesForProfession.filter) so scroll_*
// recipes stay in their own separate "Craft Scrolls" list instead of
// landing in an "Other" bucket here.
const ENCHANTING_EQUIPMENT_TIER_ORDER = ['rough', 'aged', 'heartwood', 'ironwood', 'charwood', 'emberwood'];
const ENCHANTING_EQUIPMENT_TIER_LABELS: Record<string, string> = {
  rough: 'Rough',
  aged: 'Aged',
  heartwood: 'Heartwood',
  ironwood: 'Ironwood',
  charwood: 'Charwood',
  emberwood: 'Emberwood',
};
// The combined Wand/Staff/Book Mastery track's bar label per the design
// brief's explicit naming ask — distinct from the material's own "Master
// of {name}" title/achievement wording (renderMaterialMasteryPanel's
// labelOverride only touches the bar header, nothing else).
const ENCHANTING_ARMAMENTS_LABELS: Record<string, string> = {
  simple_wood: 'Enchanted Armaments I',
  star_wood: 'Enchanted Armaments II',
  mystic_wood: 'Enchanted Armaments III',
  enchanted_hardwood: 'Enchanted Armaments IV',
  ancient_runewood: 'Enchanted Armaments V',
  emberheart_wood: 'Ember Armaments',
};

// Enchanting UI cleanup — scrolls (both "Craft Scrolls" and "Use Scroll")
// grouped by the enchant's own EnchantCategory (gameData/enchanting.ts)
// instead of one long flat list, per the user's "offensive vs defensive vs
// stats" sorting ask. 'passive' covers every flat stat/HP/mana/armor/
// resistance enchant, which reads to a player as "stat bonuses."
const SCROLL_CATEGORY_ORDER: EnchantCategory[] = ['offensive', 'defensive', 'passive'];
const SCROLL_CATEGORY_LABELS: Record<EnchantCategory, string> = {
  offensive: 'Offensive',
  defensive: 'Defensive',
  passive: 'Stat Bonuses',
};
function scrollCategory(scrollItemId: string): EnchantCategory {
  const item = ITEMS[scrollItemId];
  const enchant = item?.scrollEnchantId ? ENCHANTS[item.scrollEnchantId] : undefined;
  return enchant?.category ?? 'passive';
}
function groupByScrollCategory<T>(list: T[], getScrollItemId: (entry: T) => string): Record<EnchantCategory, T[]> {
  const groups: Record<EnchantCategory, T[]> = { offensive: [], defensive: [], passive: [] };
  for (const entry of list) groups[scrollCategory(getScrollItemId(entry))].push(entry);
  return groups;
}

// Enchanting's own sub-tabs — the panel used to be one long flat page
// (Craft Equipment, Material Mastery, Craft Scrolls, every owned scroll,
// Active Enchants, then finally Disenchant at the very bottom), which made
// Disenchant — a page you reach for constantly, dozens of times a session —
// the thing you had to scroll furthest to find. Each tab now renders only
// its own section.
type EnchantingTab = 'equipment' | 'scrolls' | 'enchants' | 'disenchant';
const ENCHANTING_TABS: { id: EnchantingTab; label: string }[] = [
  { id: 'equipment', label: 'Craft Equipment' },
  { id: 'scrolls', label: 'Scrolls' },
  { id: 'enchants', label: 'Active Enchants' },
  { id: 'disenchant', label: 'Disenchant' },
];

// A single profession's own page — one per sidebar nav item (see
// Sidebar.tsx), replacing the old three-category pages (Gathering/Fishing/
// Crafting) that stacked every known crafting profession's full recipe list
// onto one screen. Gathering/Fishing content is filtered to the current
// zone (gather nodes/fishing holes are genuinely zone-specific); Crafting's
// recipe list is NOT (a known recipe has no zoneId in the data model at all
// and is craftable anywhere — only the trainer below is zone-scoped).
export function ProfessionScreen({
  professionId,
  zoneId,
  onActivityStarted,
}: {
  professionId: ProfessionId;
  zoneId: string;
  // Starting a gather/fish/craft/disenchant activity from here writes a
  // brand-new currentActivity to Firestore — that always succeeds and
  // takes over immediately EXCEPT when a dungeon run is active, since
  // App.tsx's activityNode selection checks activeDungeonId (local React
  // state, never part of currentActivity) before currentActivity.type, so
  // the Dungeon pane kept monopolizing the activity slot regardless of
  // what the player just started here — the player had to leave the
  // dungeon first before the new activity's own screen would ever show.
  // This callback (App.tsx's handleActivityStarted) clears that local
  // state too, so any action started here actually takes over right away.
  onActivityStarted?: () => void;
}) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const zone = ZONES[zoneId];
  const label = PROFESSION_LABELS[professionId];
  const category = PROFESSION_CATEGORY[professionId];

  // Every profession's recipe list needs live inventory now (the have/need
  // material display and the Craft button's material-sufficiency gate —
  // see renderRecipeList below), not just Enchanting's own panel (listing
  // scrolls to use and equipment to disenchant). This used to be gated to
  // `professionId === 'enchanting'` only, which left `inventory` stuck at
  // null for every other profession — meaning every recipe's have/need
  // line showed 0 and its Craft button was wrongly disabled as "Need
  // materials" regardless of what was actually owned.
  const [inventory, setInventory] = useState<Inventory | null>(null);
  useEffect(() => {
    if (!user) return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user]);

  // The quantity slider's chosen value per disenchantable item id — defaults
  // to the full owned stack (see renderEnchantingPanel) the first time an
  // item is seen, so "disenchant everything" needs no interaction beyond one
  // click, per the design brief's "further incentivize idle" ask.
  const [disenchantQty, setDisenchantQty] = useState<Record<string, number>>({});

  // Continuous Disenchanting Queue overhaul — which rows (keyed by
  // instanceId ?? itemId, matching disenchantQty's own key) are currently
  // checked for bulk queueing, plus the disenchant list's own slot/tier/
  // suffix filter so "Select all shown" operates on exactly what's
  // currently displayed, never the whole inventory silently.
  const [selectedForQueue, setSelectedForQueue] = useState<Set<string>>(new Set());
  const [disenchantFilter, setDisenchantFilter] = useState<{ slot: EquipmentSlot | ''; materialId: string; suffix: string }>({
    slot: '',
    materialId: '',
    suffix: '',
  });
  const [enchantingTab, setEnchantingTab] = useState<EnchantingTab>('equipment');
  // Using a scroll previously gave zero feedback either way — handleUseScroll
  // never even looked at useEnchantScroll's own success/reason, so it just
  // silently refetched regardless, which reads as "nothing happened" even
  // on success. Same local message-state shape as autoEatError above.
  const [scrollMessage, setScrollMessage] = useState<string | null>(null);

  // Cooking overhaul Tier 1 — Auto Eat's own tiny bit of local state, same
  // shape as MountTrainerScreen's training/error pair.
  const [autoEatTraining, setAutoEatTraining] = useState(false);
  const [autoEatError, setAutoEatError] = useState<string | null>(null);

  async function handleTrainAutoEat(rank: number) {
    if (!user) return;
    setAutoEatTraining(true);
    setAutoEatError(null);
    try {
      const result = await purchaseAutoEatRank(user.uid, rank);
      if (!result.success) {
        setAutoEatError(result.reason ?? 'Could not learn that Auto Eat rank.');
      } else {
        await refetch();
      }
    } finally {
      setAutoEatTraining(false);
    }
  }

  async function handleGather(nodeId: string) {
    if (!user) return;
    onActivityStarted?.();
    await startActivity(user.uid, {
      type: 'gathering',
      targetId: nodeId,
      zoneId: zone.id,
      equippedShirtItemId: equippedItemId(character?.equipment.shirt),
    });
    await refetch();
  }

  async function handleFish(holeId: string) {
    if (!user) return;
    onActivityStarted?.();
    await startActivity(user.uid, {
      type: 'fishing',
      targetId: holeId,
      zoneId: zone.id,
      equippedShirtItemId: equippedItemId(character?.equipment.shirt),
    });
    await refetch();
  }

  async function handleCraft(recipeId: string) {
    if (!user) return;
    onActivityStarted?.();
    await startActivity(user.uid, {
      type: 'crafting',
      targetId: recipeId,
      zoneId,
      equippedShirtItemId: equippedItemId(character?.equipment.shirt),
    });
    await refetch();
  }

  async function handleUseScroll(scrollItemId: string) {
    if (!user) return;
    setScrollMessage(null);
    const result = await useEnchantScroll(user.uid, scrollItemId);
    if (!result.success) {
      setScrollMessage(result.reason ?? 'Could not use that scroll.');
      return;
    }
    const enchant = ITEMS[scrollItemId]?.scrollEnchantId ? ENCHANTS[ITEMS[scrollItemId].scrollEnchantId!] : undefined;
    setScrollMessage(enchant ? `Applied ${enchant.name} to your ${enchant.slot}.` : 'Enchant applied.');
    await refetch();
  }

  async function handleRemoveEnchant(slot: EquipmentSlot) {
    if (!user) return;
    await removeEnchant(user.uid, slot);
    await refetch();
  }

  async function handleStartDisenchanting(itemId: string, quantity: number, instanceId?: string) {
    if (!user) return;
    onActivityStarted?.();
    await startActivity(user.uid, {
      type: 'disenchanting',
      targetId: itemId,
      zoneId,
      quantity,
      instanceId,
      equippedShirtItemId: equippedItemId(character?.equipment.shirt),
    });
    await refetch();
  }

  // Continuous Disenchanting Queue overhaul — queues one or more selected
  // rows at once. If a disenchant activity is already running, the
  // selection is APPENDED to its existing queue (advanceDisenchantQueue,
  // current item untouched) rather than restarting it; otherwise the
  // first selected item becomes the new activity's current target and the
  // rest seed its queue (startActivity). Always confirms exactly how many
  // equipment pieces will be destroyed first, per the design brief's
  // explicit "display a confirmation before starting the queue" rule.
  async function handleAddToDisenchantQueue(entries: { itemId: string; instanceId?: string; quantity: number }[]) {
    if (!user || entries.length === 0) return;
    const totalPieces = entries.reduce((sum, e) => sum + e.quantity, 0);
    if (!confirm(`This will destroy ${totalPieces} equipment piece${totalPieces === 1 ? '' : 's'}. Continue?`)) return;

    if (character?.currentActivity.type === 'disenchanting') {
      await advanceDisenchantQueue(user.uid, {
        targetId: character.currentActivity.targetId,
        zoneId: character.currentActivity.zoneId,
        instanceId: character.currentActivity.disenchantInstanceId,
        quantity: character.currentActivity.disenchantQuantity,
        queue: [...(character.currentActivity.disenchantQueue ?? []), ...entries],
        equippedShirtItemId: character.currentActivity.equippedShirtItemId,
      });
    } else {
      onActivityStarted?.();
      const [first, ...rest] = entries;
      await startActivity(user.uid, {
        type: 'disenchanting',
        targetId: first.itemId,
        zoneId,
        quantity: first.quantity,
        instanceId: first.instanceId,
        disenchantQueue: rest,
        equippedShirtItemId: equippedItemId(character?.equipment.shirt),
      });
    }
    setSelectedForQueue(new Set());
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
        {recipesToShow.map((recipe) => {
          const resultItem = ITEMS[recipe.resultItemId];
          // Recipe-discovery recipes (learnedAutomatically: false — RARITY-6's
          // dungeon/monster-drop formulas, the Tailoring/Enchanting formula
          // scrolls) used to be filtered out of this list entirely until
          // learned, which hid them from a player who had no idea such a
          // recipe existed at all. Show them as an explicit locked row
          // instead — "requirements shown rather than hidden" per the design
          // brief's UI section — rather than vanishing silently.
          if (!canUseRecipe(char, recipe)) {
            return (
              <li key={recipe.id} className="recipe-undiscovered" style={{ opacity: 0.55 }}>
                <div className="item-row-main">
                  {resultItem && <ItemSlot item={resultItem} />}
                  <span>
                    <strong>{recipe.name}</strong> — Undiscovered (learn this recipe from a{' '}
                    {recipe.source === 'dungeon_drop'
                      ? 'dungeon'
                      : recipe.source === 'monster_drop'
                        ? 'monster'
                        : recipe.source === 'rare_world_drop'
                          ? 'rare world'
                          : 'special'}{' '}
                    drop)
                  </span>
                </div>
              </li>
            );
          }
          const meetsSkill = professionLevel >= recipe.requiredSkill;
          const meetsLevel = !recipe.requiredCharacterLevel || char.level >= recipe.requiredCharacterLevel;
          const meetsGold = !recipe.goldCost || char.gold >= recipe.goldCost;
          const meetsMaterials = recipe.materials.every((m) => (inventory?.items[m.itemId] ?? 0) >= m.quantity);
          const canCraft = meetsSkill && meetsLevel && meetsGold && meetsMaterials;
          // All 6 crafting professions now share craftingEngine.ts's
          // level-delta color formula — "red" (below requiredSkill) stays
          // a purely gating display on top of it. Mining's Smelting
          // recipes land here too (tagged to a gathering-category
          // profession) and still show a color/XP% for flavor even though
          // they never actually earn Mining XP (see CraftingScreen's
          // earnsProfessionXp comment) — harmless since the % is never
          // read anywhere but this tooltip.
          const tier = !meetsSkill ? 'red' : craftingColorTier(professionLevel, recipe.requiredSkill);
          const masteryLevel = getProfessionState(char.professions, professionId).mastery?.[recipe.id]?.level ?? 0;
          // Milestone 4's masterwork recipes are exactly "requiredSkill 100
          // + a purple result" — read directly off the data rather than a
          // hardcoded id list, so a future masterwork recipe gets the badge
          // automatically.
          const isMasterwork = recipe.requiredSkill >= 100 && resultItem?.rarity === 'purple';
          const itemRarity = resultItem ? inferItemRarity(resultItem) : null;
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
                  {isMasterwork && <span style={{ color: RARITY_COLORS.purple, fontWeight: 700 }}>[Masterwork]</span>}{' '}
                  {itemRarity && resultItem && (
                    <span style={{ color: rarityColor(resultItem) ?? undefined }}>({RARITY_LABELS[itemRarity]})</span>
                  )}{' '}
                  (requires level {recipe.requiredSkill}
                  {recipe.requiredCharacterLevel ? `, Lv ${recipe.requiredCharacterLevel}` : ''}
                  {meetsSkill ? `, ${(CRAFTING_COLOR_XP_PCT[tier as keyof typeof CRAFTING_COLOR_XP_PCT] * 100).toFixed(0)}% XP` : ''}
                  ) — materials:{' '}
                  {recipe.materials
                    .map((m, i) => {
                      const have = inventory?.items[m.itemId] ?? 0;
                      const short = have < m.quantity;
                      return (
                        <span key={m.itemId} style={short ? { color: '#c0392b' } : undefined}>
                          {i > 0 ? ', ' : ''}
                          {have}/{m.quantity} {ITEMS[m.itemId]?.name ?? m.itemId}
                        </span>
                      );
                    })}
                  {recipe.goldCost ? ` + ${recipe.goldCost} gold` : ''}
                  {known ? ` — Mastery ${masteryLevel}%` : ''}
                </span>
              </div>
              <button onClick={() => handleCraft(recipe.id)} disabled={!canCraft}>
                {canCraft
                  ? 'Craft'
                  : !meetsLevel
                    ? `Need Lv ${recipe.requiredCharacterLevel}`
                    : !meetsSkill
                      ? `Need skill ${recipe.requiredSkill}`
                      : !meetsMaterials
                        ? 'Need materials'
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
  // Generalized (tierOrder/tierLabels params) so Leatherworking's own
  // 42-recipe, 6-tier buildout reuses the exact same grouping — see the
  // professionId === 'leatherworking' dispatch below.
  function renderGroupedRecipesByTier(
    tierOrder: string[],
    tierLabels: Record<string, string>,
    recipesToGroup: typeof recipesForProfession = recipesForProfession
  ) {
    const grouped = new Map<string, typeof recipesForProfession>();
    const ungrouped: typeof recipesForProfession = [];
    for (const recipe of recipesToGroup) {
      const slug = tierOrder.find((s) => {
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
        {tierOrder.filter((slug) => grouped.has(slug)).map((slug) => (
          <details key={slug}>
            <summary>{tierLabels[slug]}</summary>
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

  // One row per gameData/materials.ts MaterialDef, generated dynamically —
  // no per-metal component, so a future material shows up here automatically
  // the moment it's registered. Mastery is strictly optional/completionist
  // (see types/character.ts's materialMastery doc comment) and fully
  // independent of the profession's own 1-100 level/XP shown above.
  // Generalized (registry param) so Leatherworking's LEATHER_MATERIALS
  // reuses the exact same panel as Blacksmithing's MATERIALS — see the
  // professionId === 'leatherworking' dispatch below.
  function renderMaterialMasteryPanel(registry: MaterialDef[], labelOverride?: Record<string, string>) {
    return (
      <details open>
        <summary>Material Mastery</summary>
        <ul>
          {registry.map((material) => {
            const xp = char.materialMastery?.[material.id]?.xp ?? 0;
            const threshold = MATERIAL_MASTERY_XP_THRESHOLDS[material.id] ?? 0;
            const pct = materialMasteryPercent(xp, material.id);
            const speedBonus = (materialMasterySpeedMultiplier(pct) - 1) * 100;
            const bonusOutput = materialMasteryBonusChance(pct) * 100;
            const achievementId = `mastery_${material.id}`;
            const achieved = char.unlockedAchievementIds.includes(achievementId);
            const barLabel = labelOverride?.[material.id] ?? `${material.name} Mastery`;
            return (
              <li key={material.id}>
                <strong>{barLabel} — {pct.toFixed(1)}%</strong>
                <div className="profession-xp-bar-track">
                  <div className="profession-xp-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div>
                  {Math.floor(xp)} / {threshold} XP · Crafting Speed: +{speedBonus.toFixed(1)}% · Bonus Output:{' '}
                  {bonusOutput.toFixed(1)}% · Stat Quality: {pct >= 100 ? 'Maximum' : pct >= 50 ? 'Improved' : 'Baseline'}
                </div>
                <div>
                  Achievement: {achieved ? '✓ Unlocked' : 'In Progress'} · Title Reward: Master of {material.name}
                </div>
              </li>
            );
          })}
        </ul>
      </details>
    );
  }

  // Cooking overhaul Tier 1 — Auto Eat's permanent, sequentially-purchased
  // rank, shown inline on the Cooking tab rather than as its own top-level
  // screen (unlike Mount Trainer) since it's conceptually part of Cooking,
  // not a separate character-progression system. Same sequential/zone-
  // gated posture as MountTrainerScreen.
  function renderAutoEatPanel() {
    const currentRank = char.autoEatRank ?? 0;
    const nextRank = AUTO_EAT_RANKS.find((r) => r.rank === currentRank + 1);
    return (
      <details open>
        <summary>Auto Eat</summary>
        <p>
          A permanent upgrade that automatically eats whatever Recovery Food is pinned to your Food slot when your HP
          drops low enough — never in a dungeon or raid.
        </p>
        <p>
          Current rank: {currentRank === 0 ? 'None' : currentRank}
          {currentRank > 0 && (
            <>
              {' '}— triggers at {AUTO_EAT_RANKS[currentRank - 1].hpTriggerPct}% HP, heals{' '}
              {AUTO_EAT_RANKS[currentRank - 1].healEfficiencyPct}% of max HP.
            </>
          )}
        </p>
        {nextRank && (
          <div className="item-row-main">
            <span>
              <strong>Rank {nextRank.rank}</strong> — triggers at {nextRank.hpTriggerPct}% HP, heals{' '}
              {nextRank.healEfficiencyPct}% of max HP ({nextRank.cost.toLocaleString()} gold)
              {zoneId !== nextRank.requiredZoneId && <small> — learn this at {ZONES[nextRank.requiredZoneId]?.name ?? nextRank.requiredZoneId}</small>}
            </span>
            <button
              onClick={() => handleTrainAutoEat(nextRank.rank)}
              disabled={autoEatTraining || zoneId !== nextRank.requiredZoneId || char.gold < nextRank.cost}
            >
              Learn
            </button>
          </div>
        )}
        {!nextRank && currentRank > 0 && <p>Auto Eat fully learned.</p>}
        {autoEatError && <p className="error">{autoEatError}</p>}
      </details>
    );
  }

  // Enchanting's crafting recipes (scroll_* — see recipes.ts's "Enchanting
  // scrolls" section) are just like any other profession's: renderRecipeList
  // below already handles them via the normal timed/offline CraftingScreen
  // flow. What's unique to this tab is everything AFTER a scroll exists —
  // using it on gear, viewing what's active, and the disenchant batch —
  // which used to live scattered across EquipmentScreen.tsx (apply/remove)
  // and InventoryScreen.tsx (a single-item disenchant button) and is
  // consolidated here instead.
  function renderEnchantingPanel() {
    if (!known) return <p>You don't know {label} yet — learn it at the Professions Trainer.</p>;
    const skill = professionLevel;

    const scrollEntries = Object.entries(inventory?.items ?? {})
      .filter(([itemId, quantity]) => quantity > 0 && ITEMS[itemId]?.type === 'enchant_scroll')
      .sort(([a], [b]) => (ITEMS[a]?.name ?? a).localeCompare(ITEMS[b]?.name ?? b));

    const disenchantableEntries: { itemId: string; quantity: number; instanceId?: string; rolls?: Record<string, number> }[] = [
      ...Object.entries(inventory?.items ?? {})
        .filter(
          ([itemId, quantity]) =>
            quantity > 0 && ITEMS[itemId] && isDisenchantable(ITEMS[itemId]!) && !isLocked(inventory!, itemId)
        )
        .map(([itemId, quantity]) => ({ itemId, quantity })),
      // Randomized-roll equipment lives in its own instanceId-keyed bucket
      // (see types/character.ts's Inventory.equipmentInstances) — each
      // distinct roll is disenchanted independently so the player picks
      // which specific variant to break down. Equipment Locking overhaul —
      // a locked instance never appears here at all (never "disabled",
      // simply excluded), matching "locked equipment cannot be included in
      // bulk disenchant selection."
      ...Object.entries(inventory?.equipmentInstances ?? {})
        .filter(
          ([instanceId, inst]) =>
            inst.quantity > 0 && ITEMS[inst.itemId] && isDisenchantable(ITEMS[inst.itemId]!) && !isLocked(inventory!, instanceId)
        )
        .map(([instanceId, inst]) => ({ itemId: inst.itemId, quantity: inst.quantity, instanceId, rolls: inst.rolls })),
    ].sort((a, b) => (ITEMS[a.itemId]?.name ?? a.itemId).localeCompare(ITEMS[b.itemId]?.name ?? b.itemId));

    const equipmentRecipes = recipesForProfession.filter((r) =>
      ENCHANTING_EQUIPMENT_TIER_ORDER.some((s) => r.id.startsWith(`${s}_`))
    );
    const scrollRecipes = recipesForProfession.filter((r) => !equipmentRecipes.includes(r));
    const scrollRecipeGroups = groupByScrollCategory(scrollRecipes, (r) => r.resultItemId);
    const scrollEntryGroups = groupByScrollCategory(scrollEntries, ([itemId]) => itemId);

    return (
      <>
        <div className="zone-tabs">
          {ENCHANTING_TABS.map((t) => (
            <button
              key={t.id}
              className="zone-tab"
              onClick={() => setEnchantingTab(t.id)}
              style={enchantingTab === t.id ? { background: 'var(--class-accent)', color: 'var(--class-accent-text)' } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {enchantingTab === 'equipment' && (
          <>
            <h3>Craft Equipment</h3>
            {renderGroupedRecipesByTier(ENCHANTING_EQUIPMENT_TIER_ORDER, ENCHANTING_EQUIPMENT_TIER_LABELS, equipmentRecipes)}
            {renderMaterialMasteryPanel(WOOD_MATERIALS, ENCHANTING_ARMAMENTS_LABELS)}
          </>
        )}

        {enchantingTab === 'scrolls' && (
          <>
            <h3>Craft Scrolls</h3>
            {SCROLL_CATEGORY_ORDER.filter((cat) => scrollRecipeGroups[cat].length > 0).map((cat) => (
              <details key={cat} open>
                <summary>
                  {SCROLL_CATEGORY_LABELS[cat]} ({scrollRecipeGroups[cat].length})
                </summary>
                {renderRecipeList(scrollRecipeGroups[cat])}
              </details>
            ))}

            <h3>Use Scroll</h3>
            {scrollMessage && <p>{scrollMessage}</p>}
            {scrollEntries.length === 0 ? (
              <p>No scrolls in your inventory — craft one above.</p>
            ) : (
              SCROLL_CATEGORY_ORDER.filter((cat) => scrollEntryGroups[cat].length > 0).map((cat) => (
                <details key={cat} open>
                  <summary>
                    {SCROLL_CATEGORY_LABELS[cat]} ({scrollEntryGroups[cat].length})
                  </summary>
                  <ul>
                    {scrollEntryGroups[cat].map(([itemId, quantity]) => {
                      const scroll = ITEMS[itemId]!;
                      const enchant = scroll.scrollEnchantId ? ENCHANTS[scroll.scrollEnchantId] : undefined;
                      if (!enchant) return null;
                      const equippedEnchantItemId = equippedItemId(char.equipment[enchant.slot]);
                      const equippedItem = equippedEnchantItemId ? ITEMS[equippedEnchantItemId] : null;
                      return (
                        <li key={itemId}>
                          <div className="item-row-main">
                            <ItemSlot item={scroll} quantity={quantity} />
                            <span>
                              {scroll.name} ({describeEnchantEffect(enchant)}) —{' '}
                              {equippedItem ? `applies to your equipped ${equippedItem.name}` : `no ${enchant.slot} equipped`}
                            </span>
                          </div>
                          <button onClick={() => handleUseScroll(itemId)}>Use</button>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))
            )}
          </>
        )}

        {enchantingTab === 'enchants' && (
          <>
            <h3>Active Enchants</h3>
            <ul>
              {ENCHANT_SLOTS.filter((slot) => char.enchantments[slot]).map((slot) => {
                const enchant = ENCHANTS[char.enchantments[slot]!];
                const equippedSlotItemId = equippedItemId(char.equipment[slot]);
                const equippedItem = equippedSlotItemId ? ITEMS[equippedSlotItemId] : null;
                // Absent (not yet migrated to the charge model) reads as "still
                // active" — see getEquipmentStatBonuses's matching doc comment.
                const charges = char.enchantmentCharges?.[slot];
                return (
                  <li key={slot}>
                    {slot} ({equippedItem ? equippedItem.name : 'empty'}): <em>{enchant.name}</em> ({describeEnchantEffect(enchant)})
                    {charges !== undefined ? ` — ${charges} charges left` : ''}
                    <button onClick={() => handleRemoveEnchant(slot)}>Remove Enchant</button>
                  </li>
                );
              })}
              {ENCHANT_SLOTS.every((slot) => !char.enchantments[slot]) && <li>No active enchants.</li>}
            </ul>
          </>
        )}

        {enchantingTab === 'disenchant' && (
          <>
            <h3>Disenchant</h3>
            {disenchantableEntries.length === 0 ? (
          <p>No disenchantable equipment in your inventory.</p>
        ) : (
          (() => {
            // Continuous Disenchanting Queue overhaul — bulk selection
            // works against whatever the slot/tier/suffix filters below
            // currently show, never the whole unfiltered list, per the
            // design brief's explicit "Select All Unlocked must apply
            // only to the current filtered results" rule (every entry
            // here is already unlocked by construction — see
            // disenchantableEntries above — so filtering by `locked` has
            // nothing left to exclude and is deliberately omitted here).
            const availableSlots = Array.from(
              new Set(disenchantableEntries.map((e) => ITEMS[e.itemId]?.equipSlot).filter((s): s is EquipmentSlot => !!s))
            );
            const availableMaterialIds = Array.from(
              new Set(disenchantableEntries.map((e) => materialIdForItem(e.itemId)).filter((m): m is string => !!m))
            );
            const availableSuffixes = Array.from(
              new Set(disenchantableEntries.map((e) => equipmentSuffixFor(e.rolls)).filter((s): s is string => !!s))
            );
            const filtered = disenchantableEntries.filter((e) =>
              matchesInventoryFilter(
                { key: e.instanceId ?? e.itemId, itemId: e.itemId, quantity: e.quantity, rolls: e.rolls, locked: false } as InventoryEntry,
                {
                  slot: disenchantFilter.slot || null,
                  materialId: disenchantFilter.materialId || null,
                  suffix: disenchantFilter.suffix || null,
                }
              )
            );
            const selectedEntries = disenchantableEntries.filter((e) => selectedForQueue.has(e.instanceId ?? e.itemId));
            const totalSelectedPieces = selectedEntries.reduce(
              (sum, e) => sum + Math.min(disenchantQty[e.instanceId ?? e.itemId] ?? e.quantity, e.quantity),
              0
            );

            return (
              <>
                <div className="inventory-controls">
                  <label>
                    Slot{' '}
                    <select
                      value={disenchantFilter.slot}
                      onChange={(e) => setDisenchantFilter((p) => ({ ...p, slot: e.target.value as EquipmentSlot | '' }))}
                    >
                      <option value="">All</option>
                      {availableSlots.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tier{' '}
                    <select
                      value={disenchantFilter.materialId}
                      onChange={(e) => setDisenchantFilter((p) => ({ ...p, materialId: e.target.value }))}
                    >
                      <option value="">All</option>
                      {availableMaterialIds.map((m) => (
                        <option key={m} value={m}>
                          {getMaterial(m)?.name ?? m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Suffix{' '}
                    <select
                      value={disenchantFilter.suffix}
                      onChange={(e) => setDisenchantFilter((p) => ({ ...p, suffix: e.target.value }))}
                    >
                      <option value="">All</option>
                      {availableSuffixes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() =>
                      setSelectedForQueue(new Set(filtered.filter((e) => skill >= disenchantRequiredSkill(ITEMS[e.itemId]!)).map((e) => e.instanceId ?? e.itemId)))
                    }
                  >
                    Select all shown ({filtered.length})
                  </button>
                  <button onClick={() => setSelectedForQueue(new Set())} disabled={selectedForQueue.size === 0}>
                    Clear selection
                  </button>
                  {/* One click to start disenchanting — respects your
                      checkboxes when anything is checked (same set "Queue N
                      selected" below acts on), so it never destroys an item
                      you deliberately unchecked. Only when NOTHING is
                      checked does it fall back to "everything currently
                      shown and skill-eligible," matching "Select all shown"
                      followed by Queue in one click. */}
                  <button
                    onClick={() => {
                      const eligibleShown = filtered.filter((e) => skill >= disenchantRequiredSkill(ITEMS[e.itemId]!));
                      const toQueue = selectedForQueue.size > 0 ? selectedEntries : eligibleShown;
                      handleAddToDisenchantQueue(
                        toQueue.map((e) => ({
                          itemId: e.itemId,
                          ...(e.instanceId !== undefined ? { instanceId: e.instanceId } : {}),
                          quantity: Math.min(disenchantQty[e.instanceId ?? e.itemId] ?? e.quantity, e.quantity),
                        }))
                      );
                    }}
                    disabled={
                      selectedForQueue.size === 0 &&
                      filtered.filter((e) => skill >= disenchantRequiredSkill(ITEMS[e.itemId]!)).length === 0
                    }
                    title={
                      selectedForQueue.size > 0
                        ? `Disenchant the ${selectedForQueue.size} item${selectedForQueue.size === 1 ? '' : 's'} you've checked below`
                        : 'Nothing checked — disenchants every item currently shown that you have the skill for'
                    }
                  >
                    {selectedForQueue.size > 0 ? `Disenchant Selected (${selectedForQueue.size})` : 'Disenchant All Shown'}
                  </button>
                </div>

                <ul>
                  {filtered.map(({ itemId, quantity, instanceId, rolls }) => {
                    const item = ITEMS[itemId]!;
                    const requiredSkill = disenchantRequiredSkill(item);
                    const meetsSkill = skill >= requiredSkill;
                    const qtyKey = instanceId ?? itemId;
                    const qty = Math.min(disenchantQty[qtyKey] ?? quantity, quantity);
                    return (
                      <li key={qtyKey}>
                        <div className="item-row-main">
                          <input
                            type="checkbox"
                            checked={selectedForQueue.has(qtyKey)}
                            disabled={!meetsSkill}
                            onChange={(e) =>
                              setSelectedForQueue((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(qtyKey);
                                else next.delete(qtyKey);
                                return next;
                              })
                            }
                          />
                          <ItemSlot item={item} quantity={quantity} statOverride={rolls} />
                          <span style={{ color: rarityColor(item) ?? undefined }}>{getItemDisplayName(item.name, rolls)}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={quantity}
                          value={qty}
                          disabled={!meetsSkill || quantity <= 1}
                          onChange={(e) => setDisenchantQty((prev) => ({ ...prev, [qtyKey]: Number(e.target.value) }))}
                        />
                        <span>{qty}</span>
                        <button
                          onClick={() => handleStartDisenchanting(itemId, qty, instanceId)}
                          disabled={!meetsSkill}
                          title={`Disenchants into ${ITEMS[disenchantYieldRange(item).itemId]?.name ?? 'materials'} (requires Enchanting ${requiredSkill})`}
                        >
                          {meetsSkill ? `Disenchant ${qty} now` : `Needs skill ${requiredSkill}`}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {selectedForQueue.size > 0 && (
                  <p>
                    <small>
                      {totalSelectedPieces} piece{totalSelectedPieces === 1 ? '' : 's'} selected — click "Disenchant
                      Selected" above to start
                      {character?.currentActivity.type === 'disenchanting' ? ' (adds to the running queue)' : ''}.
                    </small>
                  </p>
                )}
              </>
            );
          })()
        )}
          </>
        )}
      </>
    );
  }

  // Milestone 4's 25/50/75/100 achievement/title milestones — shown here
  // as "next milestone" progress so they read as an active goal, not just
  // a Collection Log entry discovered after the fact.
  const nextProfessionMilestone = known ? PROFESSION_MILESTONE_LEVELS.find((lvl) => professionLevel < lvl) : undefined;

  return (
    <div className="zone-screen">
      <h2>{label}</h2>
      {known && (
        <p className="profession-milestone-progress">
          {nextProfessionMilestone
            ? `Level ${professionLevel} / ${nextProfessionMilestone} — next milestone: ${
                nextProfessionMilestone === 100 ? `Master ${label}` : `${label} ${nextProfessionMilestone}`
              }`
            : `Level ${professionLevel} — Master ${label} achieved.`}
        </p>
      )}

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
              const equippedToolId = node.requiredToolType
                ? equippedItemId(character.equipment[toolTypeToEquipSlot(node.requiredToolType)])
                : null;
              const equippedTool = equippedToolId ? ITEMS[equippedToolId] : null;
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
                      {known ? ` — Mastery ${masteryLevel}%` : ''}
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
        <>
          {known && (
            <p>
              {zone.name} Fishing Mastery: {fishingZoneMasteryPercent(char.fishingZoneMastery?.[zone.id]?.xp ?? 0).toFixed(1)}% —
              shared by every fishing hole in this zone; grants speed and bonus-yield, never pearl chance. Reach 100% for the
              Master Angler of {zone.name} title.
            </p>
          )}
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
              const equippedToolId = equippedItemId(character.equipment.tool_fishing);
              const equippedTool = equippedToolId ? ITEMS[equippedToolId] : null;
              const hasRod = equippedTool?.toolType === 'fishing_rod';
              const canFish = meetsLevel && hasRod;
              const yieldItem = ITEMS[hole.itemId];
              const pearlItem = hole.rareBonus ? ITEMS[hole.rareBonus.itemId] : null;
              return (
                <li key={holeId}>
                  <div className="item-row-main">
                    {yieldItem && <ItemSlot item={yieldItem} />}
                    <span>
                      <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{hole.name}</span> (level{' '}
                      {hole.requiredLevel}+
                      {meetsLevel ? `, ${(GATHERING_COLOR_XP_PCT[tier as keyof typeof GATHERING_COLOR_XP_PCT] * 100).toFixed(0)}% XP` : ''}
                      ) — yields {yieldItem?.name ?? hole.itemId} ({(hole.catchChance * 100).toFixed(0)}% catch chance)
                      {pearlItem ? `, ${(hole.rareBonus!.chance * 100).toFixed(0)}% chance of ${pearlItem.name}` : ''}
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
        </>
      )}

      {category === 'production' && professionId === 'enchanting' && renderEnchantingPanel()}

      {category === 'production' && professionId !== 'enchanting' && (
        <>
          {!known && <p>You don't know {label} yet — learn it at the Professions Trainer.</p>}
          {known &&
            (professionId === 'smithing' ? (
              <>
                {renderGroupedRecipesByTier(SMITHING_TIER_ORDER, SMITHING_TIER_LABELS)}
                {renderMaterialMasteryPanel(MATERIALS)}
              </>
            ) : professionId === 'leatherworking' ? (
              <>
                {renderGroupedRecipesByTier(LEATHERWORKING_TIER_ORDER, LEATHERWORKING_TIER_LABELS)}
                {renderMaterialMasteryPanel(LEATHER_MATERIALS)}
              </>
            ) : professionId === 'tailoring' ? (
              <>
                {renderGroupedRecipesByTier(TAILORING_TIER_ORDER, TAILORING_TIER_LABELS)}
                {renderMaterialMasteryPanel(CLOTH_MATERIALS)}
              </>
            ) : professionId === 'cooking' ? (
              <>
                {renderAutoEatPanel()}
                {renderRecipeList()}
              </>
            ) : (
              renderRecipeList()
            ))}
        </>
      )}

      <ProfessionSummaryList professionIds={[professionId]} />
    </div>
  );
}

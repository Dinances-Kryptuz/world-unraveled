import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity } from '../../firebase/character';
import { ZONES, GATHER_NODES, FISHING_HOLES } from '../../gameData/zones';
import { RECIPES } from '../../gameData/recipes';
import { PROFESSION_LABELS, PROFESSION_CATEGORY, getProfessionState } from '../../gameData/professionTiers';
import { gatheringColorTier, GATHERING_COLOR_XP_PCT } from '../../gameData/gatheringEngine';
import { craftingColorTier, CRAFTING_COLOR_XP_PCT } from '../../gameData/craftingEngine';
import { canUseRecipe } from '../../firebase/professions';
import { useEnchantScroll, removeEnchant } from '../../firebase/enchanting';
import { subscribeToInventory } from '../../firebase/inventory';
import { ENCHANTS, isDisenchantable, disenchantRequiredSkill, disenchantTier } from '../../gameData/enchanting';
import { ITEMS } from '../../gameData/items';
import { equippedItemId } from '../../gameData/equipmentStats';
import { describeItemStats } from '../../gameData/equipmentStats';
import { MATERIALS, LEATHER_MATERIALS, type MaterialDef } from '../../gameData/materials';
import {
  materialMasteryPercent,
  materialMasterySpeedMultiplier,
  materialMasteryBonusChance,
  MATERIAL_MASTERY_XP_THRESHOLDS,
} from '../../gameData/equipmentRolls';
import { TIER_COLORS } from '../MonsterLevelBadge';
import { ItemSlot } from '../ItemSlot';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId, EquipmentSlot } from '../../gameData/types';
import type { Inventory } from '../../types/character';

// The 6 equipment slots any enchant actually targets (ENCHANTS' own slot
// values — see gameData/enchanting.ts) in a sensible display order, used by
// the Active Enchants list.
const ENCHANT_SLOTS: EquipmentSlot[] = ['weapon', 'chest', 'gloves', 'legs', 'boots', 'ring'];

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

  // Only Enchanting's panel needs live inventory (to list scrolls to use and
  // equipment to disenchant) — every other profession tab skips the
  // subscription entirely.
  const [inventory, setInventory] = useState<Inventory | null>(null);
  useEffect(() => {
    if (!user || professionId !== 'enchanting') return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user, professionId]);

  // The quantity slider's chosen value per disenchantable item id — defaults
  // to the full owned stack (see renderEnchantingPanel) the first time an
  // item is seen, so "disenchant everything" needs no interaction beyond one
  // click, per the design brief's "further incentivize idle" ask.
  const [disenchantQty, setDisenchantQty] = useState<Record<string, number>>({});

  async function handleGather(nodeId: string) {
    if (!user) return;
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
    await useEnchantScroll(user.uid, scrollItemId);
    await refetch();
  }

  async function handleRemoveEnchant(slot: EquipmentSlot) {
    if (!user) return;
    await removeEnchant(user.uid, slot);
    await refetch();
  }

  async function handleStartDisenchanting(itemId: string, quantity: number, instanceId?: string) {
    if (!user) return;
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
  // Generalized (tierOrder/tierLabels params) so Leatherworking's own
  // 42-recipe, 6-tier buildout reuses the exact same grouping — see the
  // professionId === 'leatherworking' dispatch below.
  function renderGroupedRecipesByTier(tierOrder: string[], tierLabels: Record<string, string>) {
    const grouped = new Map<string, typeof recipesForProfession>();
    const ungrouped: typeof recipesForProfession = [];
    for (const recipe of recipesForProfession) {
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
  function renderMaterialMasteryPanel(registry: MaterialDef[]) {
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
            return (
              <li key={material.id}>
                <strong>{material.name} Mastery — {pct.toFixed(1)}%</strong>
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
        .filter(([itemId, quantity]) => quantity > 0 && ITEMS[itemId] && isDisenchantable(ITEMS[itemId]!))
        .map(([itemId, quantity]) => ({ itemId, quantity })),
      // Randomized-roll equipment lives in its own instanceId-keyed bucket
      // (see types/character.ts's Inventory.equipmentInstances) — each
      // distinct roll is disenchanted independently so the player picks
      // which specific variant to break down.
      ...Object.entries(inventory?.equipmentInstances ?? {})
        .filter(([, inst]) => inst.quantity > 0 && ITEMS[inst.itemId] && isDisenchantable(ITEMS[inst.itemId]!))
        .map(([instanceId, inst]) => ({ itemId: inst.itemId, quantity: inst.quantity, instanceId, rolls: inst.rolls })),
    ].sort((a, b) => (ITEMS[a.itemId]?.name ?? a.itemId).localeCompare(ITEMS[b.itemId]?.name ?? b.itemId));

    return (
      <>
        <h3>Craft Scrolls</h3>
        {renderRecipeList()}

        <h3>Use Scroll</h3>
        {scrollEntries.length === 0 ? (
          <p>No scrolls in your inventory — craft one above.</p>
        ) : (
          <ul>
            {scrollEntries.map(([itemId, quantity]) => {
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
                      {scroll.name} ({enchant.description}) — {equippedItem ? `applies to your equipped ${equippedItem.name}` : `no ${enchant.slot} equipped`}
                    </span>
                  </div>
                  <button onClick={() => handleUseScroll(itemId)}>Use</button>
                </li>
              );
            })}
          </ul>
        )}

        <h3>Active Enchants</h3>
        <ul>
          {ENCHANT_SLOTS.filter((slot) => char.enchantments[slot]).map((slot) => {
            const enchant = ENCHANTS[char.enchantments[slot]!];
            const equippedSlotItemId = equippedItemId(char.equipment[slot]);
            const equippedItem = equippedSlotItemId ? ITEMS[equippedSlotItemId] : null;
            return (
              <li key={slot}>
                {slot} ({equippedItem ? equippedItem.name : 'empty'}): <em>{enchant.name}</em> ({enchant.description})
                <button onClick={() => handleRemoveEnchant(slot)}>Remove Enchant</button>
              </li>
            );
          })}
          {ENCHANT_SLOTS.every((slot) => !char.enchantments[slot]) && <li>No active enchants.</li>}
        </ul>

        <h3>Disenchant</h3>
        {disenchantableEntries.length === 0 ? (
          <p>No disenchantable equipment in your inventory.</p>
        ) : (
          <ul>
            {disenchantableEntries.map(({ itemId, quantity, instanceId, rolls }) => {
              const item = ITEMS[itemId]!;
              const requiredSkill = disenchantRequiredSkill(item);
              const meetsSkill = skill >= requiredSkill;
              const qtyKey = instanceId ?? itemId;
              const qty = Math.min(disenchantQty[qtyKey] ?? quantity, quantity);
              return (
                <li key={qtyKey}>
                  <div className="item-row-main">
                    <ItemSlot item={item} quantity={quantity} statOverride={rolls} />
                    <span>{item.name}</span>
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
                    title={`Disenchants into ${disenchantTier(item)} (requires Enchanting ${requiredSkill})`}
                  >
                    {meetsSkill ? `Disenchant ${qty}` : `Needs skill ${requiredSkill}`}
                  </button>
                </li>
              );
            })}
          </ul>
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
              const equippedToolId = equippedItemId(character.equipment.tool);
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
            const equippedToolId = equippedItemId(character.equipment.tool);
            const equippedTool = equippedToolId ? ITEMS[equippedToolId] : null;
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
            ) : (
              renderRecipeList()
            ))}
        </>
      )}

      <ProfessionSummaryList professionIds={[professionId]} />
    </div>
  );
}

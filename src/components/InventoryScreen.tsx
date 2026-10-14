import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { subscribeToInventory, isLocked, setItemLocked } from '../firebase/inventory';
import { useConsumableOutOfCombat, setEquippedConsumable, equipStatFood } from '../firebase/consumables';
import { setInventorySortPrefs } from '../firebase/character';
import { ITEMS } from '../gameData/items';
import { equipmentSuffixFor } from '../gameData/equipmentSuffixes';
import { materialIdForItem } from '../gameData/itemMetadata';
import { getMaterial } from '../gameData/materials';
import { sortInventoryEntries, matchesInventoryFilter, type InventoryEntry } from '../gameData/inventorySort';
import { SLOT_LABEL } from './EquipmentScreen';
import { ConsumablesBar } from './ConsumablesBar';
import { ItemSlot } from './ItemSlot';
import type { Inventory, InventorySortOption } from '../types/character';
import type { BaseStat } from '../gameData/classStats';
import type { EquipmentSlot } from '../gameData/types';

const SORT_LABELS: Record<InventorySortOption, string> = {
  slot: 'Equipment Slot',
  tier: 'Material / Tier',
  suffix: 'Stat Combination / Suffix',
  totalStats: 'Highest Total Primary Stats',
  individualStat: 'Individual Primary Stat',
  newest: 'Newest First',
  oldest: 'Oldest First',
};
const SORT_OPTIONS = Object.keys(SORT_LABELS) as InventorySortOption[];
const BASE_STATS: BaseStat[] = ['STR', 'STA', 'AGI', 'INT', 'SPI'];

export function InventoryScreen() {
  const { user } = useAuth();
  const { character, refetch, applyOptimisticUpdate } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  // Local-only until the player actually changes something — avoids a
  // write on every page load, and falls back to the persisted
  // character.inventorySortPrefs (or a sensible default) otherwise.
  const [localPrefs, setLocalPrefs] = useState<{
    sortBy: InventorySortOption;
    sortStat: BaseStat;
    filterSlot: EquipmentSlot | '';
    filterTier: string;
    filterSuffix: string;
    filterLocked: 'locked' | 'unlocked' | '';
  } | null>(null);

  const prefs = localPrefs ?? {
    sortBy: character?.inventorySortPrefs?.sortBy ?? 'slot',
    sortStat: character?.inventorySortPrefs?.sortStat ?? 'STR',
    filterSlot: character?.inventorySortPrefs?.filterSlot ?? '',
    filterTier: character?.inventorySortPrefs?.filterTier ?? '',
    filterSuffix: character?.inventorySortPrefs?.filterSuffix ?? '',
    filterLocked: character?.inventorySortPrefs?.filterLocked ?? '',
  };

  function updatePrefs(patch: Partial<typeof prefs>) {
    const next = { ...prefs, ...patch };
    setLocalPrefs(next);
    if (user) {
      void setInventorySortPrefs(user.uid, {
        sortBy: next.sortBy,
        sortStat: next.sortStat,
        filterSlot: next.filterSlot || null,
        filterTier: next.filterTier || null,
        filterSuffix: next.filterSuffix || null,
        filterLocked: next.filterLocked || null,
      });
    }
  }

  if (!inventory || !character) return null;

  async function handleUseConsumable(itemId: string) {
    if (!user) return;
    setError(null);
    // Optimistic cooldown so a rapid second click can't slip in before the
    // write round-trips — matches the pattern applyOptimisticUpdate already
    // exists for (xp/gold elsewhere).
    const usedAt = new Date();
    applyOptimisticUpdate((c) => ({ ...c, itemCooldowns: { ...c.itemCooldowns, [itemId]: usedAt } }));
    const result = await useConsumableOutOfCombat(user.uid, itemId);
    if (!result.success) {
      setError(result.reason ?? 'Could not use that item.');
      applyOptimisticUpdate((c) => {
        const next = { ...c.itemCooldowns };
        delete next[itemId];
        return { ...c, itemCooldowns: next };
      });
    }
    await refetch();
  }

  async function handleEquipConsumable(slot: 'food' | 'potion', itemId: string | null) {
    if (!user) return;
    const result = await setEquippedConsumable(user.uid, slot, itemId);
    if (!result.success) setError(result.reason ?? 'Could not equip that.');
    await refetch();
  }

  // Cooking overhaul Tier 2 — Stat Food. Equipping immediately consumes one
  // serving from inventory (unlike the Food/Potion slots above, which are
  // just pointers) — see firebase/consumables.ts's equipStatFood doc
  // comment for why a Stat Food serving can't go through the generic
  // buffUpdateForItem path.
  async function handleEquipStatFood(itemId: string) {
    if (!user) return;
    setError(null);
    const result = await equipStatFood(user.uid, itemId);
    if (!result.success) setError(result.reason ?? 'Could not equip that Stat Food.');
    await refetch();
  }

  // Equipment Locking overhaul — `identifier` is the instanceId for a
  // randomized roll or the plain itemId for a non-instanced equipment item,
  // matching Inventory.lockedInstanceIds' doc comment.
  async function handleToggleLock(identifier: string, currentlyLocked: boolean) {
    if (!user) return;
    await setItemLocked(user.uid, identifier, !currentlyLocked);
  }

  // A base item already counts as one occupied slot whether it's a plain
  // stack, one or more randomized-roll instances, one or more charge
  // buckets, or any combination — see firebase/inventory.ts's
  // grantEquipmentInstances/grantChargedConsumables, which enforce the same
  // accounting server-side.
  const instanceBaseItemIds = new Set([
    ...Object.values(inventory.equipmentInstances ?? {}).map((inst) => inst.itemId),
    ...Object.values(inventory.chargedConsumables ?? {}).map((bucket) => bucket.itemId),
  ]);
  for (const itemId of Object.keys(inventory.items)) instanceBaseItemIds.delete(itemId);
  const distinctItemCount = Object.values(inventory.items).filter((q) => q > 0).length + instanceBaseItemIds.size;

  const rawEntries: (InventoryEntry & { remainingCharges?: number })[] = [
    ...Object.entries(inventory.items)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ key: itemId, itemId, quantity, locked: isLocked(inventory, itemId) })),
    // Randomized-roll equipment (gameData/equipmentRolls.ts) lives in its
    // own instanceId-keyed bucket — each distinct roll shown as its own row
    // so different stat combinations of the same base item stay
    // distinguishable, same as the Equipment/Disenchant pickers.
    ...Object.entries(inventory.equipmentInstances ?? {})
      .filter(([, inst]) => inst.quantity > 0)
      .map(([instanceId, inst]) => ({
        key: instanceId,
        itemId: inst.itemId,
        quantity: inst.quantity,
        rolls: inst.rolls,
        acquiredAt: inst.acquiredAt,
        locked: isLocked(inventory, instanceId),
      })),
    // Charge-count-distinguished offensive/defensive potions
    // (gameData/consumableCharges.ts) — same "each distinct bucket its own
    // row" treatment, so a player can see which stack is nearly spent
    // before using it. Never lockable (not equipment).
    ...Object.entries(inventory.chargedConsumables ?? {})
      .filter(([, bucket]) => bucket.quantity > 0)
      .map(([instanceId, bucket]) => ({
        key: instanceId,
        itemId: bucket.itemId,
        quantity: bucket.quantity,
        remainingCharges: bucket.remainingCharges,
        locked: false,
      })),
  ];

  // Filter option lists are built from what's actually present, not every
  // possible value in the game — an empty inventory shows no filter noise.
  const availableSlots = Array.from(
    new Set(rawEntries.map((e) => ITEMS[e.itemId]?.equipSlot).filter((s): s is EquipmentSlot => !!s))
  );
  const availableMaterialIds = Array.from(new Set(rawEntries.map((e) => materialIdForItem(e.itemId)).filter((m): m is string => !!m)));
  const availableSuffixes = Array.from(new Set(rawEntries.map((e) => equipmentSuffixFor(e.rolls)).filter((s): s is string => !!s)));

  const filter = {
    slot: prefs.filterSlot || null,
    materialId: prefs.filterTier || null,
    suffix: prefs.filterSuffix || null,
    locked: prefs.filterLocked || null,
  };
  const filteredEntries = rawEntries.filter((e) => matchesInventoryFilter(e, filter));
  const entries = sortInventoryEntries(filteredEntries, prefs.sortBy, prefs.sortStat) as (InventoryEntry & {
    remainingCharges?: number;
  })[];

  return (
    <div className="inventory-screen">
      <h2>Inventory</h2>
      <p>
        <small>
          {distinctItemCount} / {character.bagSlots} item slots used
        </small>
      </p>
      <ConsumablesBar
        character={character}
        inventoryItems={inventory.items}
        allowMana={false}
        allowRecoveryFood={true}
        onUse={handleUseConsumable}
        onEquip={handleEquipConsumable}
      />
      {error && <p className="error">{error}</p>}
      {character.activeBuffs.stat_food && (
        <p>
          Active Stat Food: {ITEMS[character.activeBuffs.stat_food.itemId]?.name ?? character.activeBuffs.stat_food.itemId} (
          {character.activeBuffs.stat_food.charges} charges left)
        </p>
      )}

      <div className="inventory-controls">
        <label>
          Sort by{' '}
          <select value={prefs.sortBy} onChange={(e) => updatePrefs({ sortBy: e.target.value as InventorySortOption })}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {SORT_LABELS[opt]}
              </option>
            ))}
          </select>
        </label>
        {prefs.sortBy === 'individualStat' && (
          <label>
            Stat{' '}
            <select value={prefs.sortStat} onChange={(e) => updatePrefs({ sortStat: e.target.value as BaseStat })}>
              {BASE_STATS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Slot{' '}
          <select value={prefs.filterSlot} onChange={(e) => updatePrefs({ filterSlot: e.target.value as EquipmentSlot | '' })}>
            <option value="">All</option>
            {availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {SLOT_LABEL[slot]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tier{' '}
          <select value={prefs.filterTier} onChange={(e) => updatePrefs({ filterTier: e.target.value })}>
            <option value="">All</option>
            {availableMaterialIds.map((materialId) => (
              <option key={materialId} value={materialId}>
                {getMaterial(materialId)?.name ?? materialId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Suffix{' '}
          <select value={prefs.filterSuffix} onChange={(e) => updatePrefs({ filterSuffix: e.target.value })}>
            <option value="">All</option>
            {availableSuffixes.map((suffix) => (
              <option key={suffix} value={suffix}>
                {suffix}
              </option>
            ))}
          </select>
        </label>
        <label>
          Locked{' '}
          <select
            value={prefs.filterLocked}
            onChange={(e) => updatePrefs({ filterLocked: e.target.value as 'locked' | 'unlocked' | '' })}
          >
            <option value="">All</option>
            <option value="locked">Locked only</option>
            <option value="unlocked">Unlocked only</option>
          </select>
        </label>
      </div>

      {entries.length === 0 ? (
        <p>{rawEntries.length === 0 ? 'Empty so far — go fight or gather something.' : 'No items match the current filters.'}</p>
      ) : (
        // Melvor/WoW-style fixed bag grid — 6 columns, as many rows as
        // character.bagSlots needs (see index.css's .inventory-grid). Every
        // slot the player owns gets a cell, filled ones first; the rest
        // render as empty placeholders, same convention as
        // EquipmentPaperDoll's unequipped slots. No name text next to a
        // tile anymore — ItemSlot's own hover tooltip (name, rarity, stats,
        // description) already covers it; a tile's only other affordance is
        // click-to-act where exactly one action applies (equip a Stat Food,
        // toggle an equipment item's lock) — nothing to click otherwise.
        <div className="inventory-grid">
          {entries.map(({ key, itemId, quantity, rolls, remainingCharges, locked }) => {
            const item = ITEMS[itemId];
            if (!item) return null;
            const isStatFood = item.consumableEffect?.buff?.category === 'stat_food';
            const isLockableEquipment = item.type === 'equipment';
            const equippedRef = item.equipSlot ? character.equipment[item.equipSlot] : null;
            const compareStats = equippedRef ? equippedRef.rolls ?? ITEMS[equippedRef.itemId]?.statBonuses : undefined;
            const onClick = isStatFood
              ? () => handleEquipStatFood(itemId)
              : isLockableEquipment
                ? () => handleToggleLock(key, locked)
                : undefined;
            return (
              <ItemSlot
                key={key}
                item={item}
                quantity={quantity}
                statOverride={rolls}
                remainingCharges={remainingCharges}
                compareStats={compareStats}
                locked={locked}
                onClick={onClick}
              />
            );
          })}
          {Array.from({ length: Math.max(0, character.bagSlots - entries.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="item-slot item-slot-empty" />
          ))}
        </div>
      )}
    </div>
  );
}

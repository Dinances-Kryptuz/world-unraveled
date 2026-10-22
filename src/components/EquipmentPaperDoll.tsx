import { useState, type ReactNode } from 'react';
import { ITEMS } from '../gameData/items';
import { canClassEquip } from '../gameData/classStats';
import { canEquipInOffhand, isTwoHandedWeapon } from '../gameData/equipmentStats';
import { isFoodItem, isPotionItem, consumableOwnedQuantities } from '../gameData/consumableClassification';
import { ItemSlot } from './ItemSlot';
import { describeEnchantEffect } from '../gameData/enchanting';
import type { EnchantDef } from '../gameData/enchanting';
import type { Inventory } from '../types/character';
import type { EquipmentSlot, ItemDef, EquippedItemRef } from '../gameData/types';
import type { ClassId } from '../gameData/classStats';
import type { BaseStat } from '../gameData/classStats';

const CONSUMABLE_SLOT_LABEL: Record<'food' | 'potion', string> = { food: 'Food', potion: 'Potion' };
const CONSUMABLE_SLOT_ICON: Record<'food' | 'potion', string> = { food: '🍞', potion: '🧪' };
type PaperDollTarget = EquipmentSlot | 'food' | 'potion';

// The paper-doll's own visual order — same 3-column + bottom-row layout
// EquipmentScreen.tsx has always used, now shared so the Companion
// equipment UI (Equipment overhaul's companion-parity ask) renders the
// exact same grid instead of its old plain-text <ul>.
const LEFT_COLUMN: EquipmentSlot[] = ['helmet', 'necklace', 'shoulders', 'cape', 'chest', 'shirt', 'tabard', 'bracers'];
const RIGHT_COLUMN: EquipmentSlot[] = ['gloves', 'belt', 'legs', 'boots', 'ring', 'ring2'];
const BOTTOM_ROW: EquipmentSlot[] = ['weapon', 'offhand', 'ammo'];
// The former single generic 'tool' slot — mining pick/skinning knife/
// fishing rod all competing for one spot, so equipping one unequipped
// whichever other was already there — split into 3 type-locked slots (see
// EquipmentSlot's doc comment in gameData/types.ts). Rendered in its own
// row, gated by showTool, same as the single slot used to be.
const TOOL_ROW: EquipmentSlot[] = ['tool_mining', 'tool_skinning', 'tool_fishing'];

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Weapon', offhand: 'Off Hand', chest: 'Chest', helmet: 'Helmet', gloves: 'Gloves',
  legs: 'Legs', boots: 'Boots', ring: 'Ring', ring2: 'Ring', necklace: 'Necklace',
  tool_mining: 'Mining Pick', tool_skinning: 'Skinning Knife', tool_fishing: 'Fishing Rod',
  shoulders: 'Shoulders', cape: 'Cape', shirt: 'Shirt', tabard: 'Tabard', bracers: 'Bracers',
  belt: 'Belt', ammo: 'Ammo',
};

const SLOT_PLACEHOLDER_ICON: Record<EquipmentSlot, string> = {
  weapon: '⚔️', offhand: '🛡️', chest: '👕', helmet: '🪖', gloves: '🧤',
  legs: '👖', boots: '🥾', ring: '💍', ring2: '💍', necklace: '📿',
  tool_mining: '⛏️', tool_skinning: '🔪', tool_fishing: '🎣',
  shoulders: '🛡', cape: '🧣', shirt: '👕', tabard: '🏳', bracers: '⌚',
  belt: '🎗', ammo: '🏹',
};

function fitsSlot(item: ItemDef, slot: EquipmentSlot): boolean {
  if (slot === 'offhand') return canEquipInOffhand(item);
  if (slot === 'ring' || slot === 'ring2') return item.equipSlot === 'ring';
  return item.equipSlot === slot;
}

// Shared by EquipmentScreen (the player's own gear) and CompanionScreen
// (one instance per recruited companion) — Equipment overhaul's companion-
// UI-parity ask. `enchantments`/`enchantmentCharges` are player-only
// (companions have no enchant slots — see types/character.ts's
// CompanionState doc comment, which is just `{ equipment }` and nothing
// else); omitting them simply renders no enchant dot, never an error.
// `showTool` is false for companions (they never gather) and also gates
// the two consumable (Food/Potion) quick-equip tiles added to the same
// row — a companion never gathers OR eats/drinks on its own, so there's
// nothing for either to point at. `consumables` is omitted entirely by
// CompanionScreen for the same reason; providing it is what actually
// turns the 2 extra tiles on (showTool alone only gates the 3 tool tiles).
export function EquipmentPaperDoll({
  equipment,
  inventory,
  allowedClass,
  onEquip,
  onUnequip,
  enchantments,
  enchantmentCharges,
  getEnchantInfo,
  showTool = true,
  consumables,
  centerPanel,
}: {
  equipment: Record<EquipmentSlot, EquippedItemRef | null>;
  inventory: Inventory;
  allowedClass: ClassId;
  onEquip: (slot: EquipmentSlot, itemId: string, instanceId?: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  enchantments?: Partial<Record<EquipmentSlot, string>>;
  enchantmentCharges?: Partial<Record<EquipmentSlot, number>>;
  getEnchantInfo?: (enchantId: string) => EnchantDef | undefined;
  showTool?: boolean;
  // The Food/Potion quick-equip pin (Character.equippedConsumables) —
  // rendered as 2 more tiles next to the 3 tool tiles, reusing that same
  // existing pointer mechanism (setEquippedConsumable) rather than
  // inventing new state; ConsumablesBar's own "Use"/"All consumables" UI
  // is untouched and still lives wherever it's already rendered.
  consumables?: {
    equipped: { food: string | null; potion: string | null };
    onEquip: (slot: 'food' | 'potion', itemId: string | null) => void;
  };
  // Rendered between the left/right columns (EquipmentScreen's "Character
  // Stats" panel). Omitted for the Companion UI, which shows its own
  // header/stats outside this component instead.
  centerPanel?: ReactNode;
}) {
  const [selectedSlot, setSelectedSlot] = useState<PaperDollTarget | null>(null);

  function renderSlotTile(slot: EquipmentSlot) {
    const equippedRef = equipment[slot];
    const equippedItem = equippedRef ? ITEMS[equippedRef.itemId] : null;
    const enchantId = enchantments?.[slot];
    const enchant = enchantId ? getEnchantInfo?.(enchantId) : undefined;
    const enchantCharges = enchantmentCharges?.[slot];
    return (
      <div key={slot} className="equipment-grid-tile">
        {equippedItem ? (
          <ItemSlot
            item={equippedItem}
            highlight={selectedSlot === slot}
            statOverride={equippedRef?.rolls}
            onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
            enchant={
              enchant
                ? { name: enchant.name, effect: describeEnchantEffect(enchant), charges: enchantCharges }
                : undefined
            }
          >
            {enchant && <span className="item-slot-enchant-dot" />}
          </ItemSlot>
        ) : (
          <button
            className={`item-slot item-slot-empty${selectedSlot === slot ? ' item-slot-highlight' : ''}`}
            onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
            title={SLOT_LABEL[slot]}
            type="button"
          >
            <span className="item-slot-icon item-slot-placeholder">{SLOT_PLACEHOLDER_ICON[slot]}</span>
          </button>
        )}
      </div>
    );
  }

  function renderConsumableTile(kind: 'food' | 'potion') {
    const itemId = consumables?.equipped[kind] ?? null;
    const item = itemId ? ITEMS[itemId] : null;
    const isSelected = selectedSlot === kind;
    return (
      <div key={kind} className="equipment-grid-tile">
        {item ? (
          <ItemSlot item={item} highlight={isSelected} onClick={() => setSelectedSlot(isSelected ? null : kind)} />
        ) : (
          <button
            className={`item-slot item-slot-empty${isSelected ? ' item-slot-highlight' : ''}`}
            onClick={() => setSelectedSlot(isSelected ? null : kind)}
            title={CONSUMABLE_SLOT_LABEL[kind]}
            type="button"
          >
            <span className="item-slot-icon item-slot-placeholder">{CONSUMABLE_SLOT_ICON[kind]}</span>
          </button>
        )}
      </div>
    );
  }

  const pickerSlot = selectedSlot;
  const isConsumablePicker = pickerSlot === 'food' || pickerSlot === 'potion';
  const pickerEquipSlot = !isConsumablePicker ? (pickerSlot as EquipmentSlot | null) : null;
  // Equipment Comparison overhaul — the currently-equipped item's effective
  // stats, so every candidate in the picker shows a diff against exactly
  // what this slot already holds (player or companion, same code path).
  const compareStats: Partial<Record<BaseStat, number>> | undefined = pickerEquipSlot
    ? equipment[pickerEquipSlot]?.rolls ?? (equipment[pickerEquipSlot] ? ITEMS[equipment[pickerEquipSlot]!.itemId]?.statBonuses : undefined)
    : undefined;

  const pickerOptions: {
    item: ItemDef;
    quantity: number;
    instanceId?: string;
    rolls?: Partial<Record<BaseStat, number>>;
  }[] = pickerEquipSlot
    ? [
        ...Object.entries(inventory.items)
          .filter(([itemId, quantity]) => quantity > 0 && ITEMS[itemId] && fitsSlot(ITEMS[itemId]!, pickerEquipSlot))
          .map(([itemId, quantity]) => ({ item: ITEMS[itemId]!, quantity })),
        // Randomized-roll equipment (gameData/equipmentRolls.ts) — see
        // Inventory.equipmentInstances' doc comment. Offering these here
        // for companions too is the actual backend-UI parity gap this
        // overhaul closes: firebase/companions.ts's equipCompanionItem
        // already accepted an instanceId, nothing in the UI ever offered
        // one before this component existed.
        ...Object.entries(inventory.equipmentInstances ?? {})
          .filter(([, inst]) => inst.quantity > 0 && ITEMS[inst.itemId] && fitsSlot(ITEMS[inst.itemId]!, pickerEquipSlot))
          .map(([instanceId, inst]) => ({
            item: ITEMS[inst.itemId]!,
            quantity: inst.quantity,
            instanceId,
            rolls: inst.rolls,
          })),
      ]
    : [];
  // Object.entries() on a Firestore-synced map isn't guaranteed to return
  // the same key order on every snapshot — a charge/potion bucket that
  // empties and later gets re-granted comes back as a freshly-inserted key
  // (see firebase/consumables.ts's delete-then-recreate pattern), which
  // silently reshuffled this picker's remaining candidates after every
  // equip. Sort by a stable key (item id, then instance id) so the list
  // order never depends on write history — same fix QuestLog.tsx already
  // applies to its own Firestore map iteration for the identical reason.
  pickerOptions.sort((a, b) => a.item.id.localeCompare(b.item.id) || (a.instanceId ?? '').localeCompare(b.instanceId ?? ''));

  // Consumable (food/potion) picker options — anything in inventory
  // (plain items + charge-bucketed potions, via consumableOwnedQuantities)
  // matching the relevant classifier, owned in quantity > 0.
  const consumableQuantities = isConsumablePicker ? consumableOwnedQuantities(inventory) : {};
  const consumablePickerOptions: { item: ItemDef; quantity: number }[] = isConsumablePicker
    ? Object.entries(consumableQuantities)
        .filter(([itemId, quantity]) => {
          if (quantity <= 0) return false;
          const item = ITEMS[itemId];
          if (!item) return false;
          return pickerSlot === 'food' ? isFoodItem(item) : isPotionItem(item);
        })
        .map(([itemId, quantity]) => ({ item: ITEMS[itemId]!, quantity }))
        // Same unstable-Firestore-map-order fix as pickerOptions above.
        .sort((a, b) => a.item.id.localeCompare(b.item.id))
    : [];

  return (
    <div className="equipment-paper-doll">
      <div className="equipment-grid">
        <div className="equipment-col">{LEFT_COLUMN.map(renderSlotTile)}</div>
        {centerPanel}
        <div className="equipment-col">{RIGHT_COLUMN.map(renderSlotTile)}</div>
      </div>

      <div className="equipment-bottom-row">{BOTTOM_ROW.map(renderSlotTile)}</div>
      {showTool && (
        <div className="equipment-bottom-row equipment-tool-row">
          {TOOL_ROW.map(renderSlotTile)}
          {consumables && renderConsumableTile('food')}
          {consumables && renderConsumableTile('potion')}
        </div>
      )}

      {pickerEquipSlot && (
        <div className="equipment-picker">
          <h4>{SLOT_LABEL[pickerEquipSlot]}</h4>
          {equipment[pickerEquipSlot] && <button onClick={() => onUnequip(pickerEquipSlot)}>Unequip</button>}
          {pickerOptions.length === 0 ? (
            <p>Nothing in inventory fits here.</p>
          ) : (
            <div className="item-grid">
              {pickerOptions.map(({ item, quantity, instanceId, rolls }) => {
                const allowed = canClassEquip(allowedClass, item);
                const willDropOffhand = pickerEquipSlot === 'weapon' && isTwoHandedWeapon(item) && !!equipment.offhand;
                return (
                  <div key={instanceId ?? item.id} className="loot-entry">
                    <ItemSlot
                      item={item}
                      quantity={quantity}
                      disabled={!allowed}
                      statOverride={rolls}
                      compareStats={compareStats}
                      onClick={() => onEquip(pickerEquipSlot, item.id, instanceId)}
                    />
                    {!allowed && <small>{item.armorType} — not usable</small>}
                    {allowed && willDropOffhand && <small>unequips off hand</small>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isConsumablePicker && consumables && (
        <div className="equipment-picker">
          <h4>{CONSUMABLE_SLOT_LABEL[pickerSlot]}</h4>
          {consumables.equipped[pickerSlot] && (
            <button onClick={() => consumables.onEquip(pickerSlot, null)}>Unpin</button>
          )}
          {consumablePickerOptions.length === 0 ? (
            <p>Nothing in inventory fits here.</p>
          ) : (
            <div className="item-grid">
              {consumablePickerOptions.map(({ item, quantity }) => (
                <div key={item.id} className="loot-entry">
                  <ItemSlot item={item} quantity={quantity} onClick={() => consumables.onEquip(pickerSlot, item.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

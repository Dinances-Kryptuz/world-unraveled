import { useState, type ReactNode } from 'react';
import { ITEMS } from '../gameData/items';
import { canClassEquip } from '../gameData/classStats';
import { canEquipInOffhand, isTwoHandedWeapon } from '../gameData/equipmentStats';
import { ItemSlot } from './ItemSlot';
import type { Inventory } from '../types/character';
import type { EquipmentSlot, ItemDef, EquippedItemRef } from '../gameData/types';
import type { ClassId } from '../gameData/classStats';
import type { BaseStat } from '../gameData/classStats';

// The paper-doll's own visual order — same 3-column + bottom-row layout
// EquipmentScreen.tsx has always used, now shared so the Companion
// equipment UI (Equipment overhaul's companion-parity ask) renders the
// exact same grid instead of its old plain-text <ul>.
const LEFT_COLUMN: EquipmentSlot[] = ['helmet', 'necklace', 'shoulders', 'cape', 'chest', 'shirt', 'tabard', 'bracers'];
const RIGHT_COLUMN: EquipmentSlot[] = ['gloves', 'belt', 'legs', 'boots', 'ring', 'ring2'];
const BOTTOM_ROW: EquipmentSlot[] = ['weapon', 'offhand', 'ammo'];

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Weapon', offhand: 'Off Hand', chest: 'Chest', helmet: 'Helmet', gloves: 'Gloves',
  legs: 'Legs', boots: 'Boots', ring: 'Ring', ring2: 'Ring', necklace: 'Necklace', tool: 'Tool',
  shoulders: 'Shoulders', cape: 'Cape', shirt: 'Shirt', tabard: 'Tabard', bracers: 'Bracers',
  belt: 'Belt', ammo: 'Ammo',
};

const SLOT_PLACEHOLDER_ICON: Record<EquipmentSlot, string> = {
  weapon: '⚔️', offhand: '🛡️', chest: '👕', helmet: '🪖', gloves: '🧤',
  legs: '👖', boots: '🥾', ring: '💍', ring2: '💍', necklace: '📿', tool: '🛠️',
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
// `showTool` is false for companions (they never gather).
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
  centerPanel,
}: {
  equipment: Record<EquipmentSlot, EquippedItemRef | null>;
  inventory: Inventory;
  allowedClass: ClassId;
  onEquip: (slot: EquipmentSlot, itemId: string, instanceId?: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  enchantments?: Partial<Record<EquipmentSlot, string>>;
  enchantmentCharges?: Partial<Record<EquipmentSlot, number>>;
  getEnchantInfo?: (enchantId: string) => { name: string; description: string } | undefined;
  showTool?: boolean;
  // Rendered between the left/right columns (EquipmentScreen's "Character
  // Stats" panel). Omitted for the Companion UI, which shows its own
  // header/stats outside this component instead.
  centerPanel?: ReactNode;
}) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);

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
          >
            {enchant && (
              <span
                className="item-slot-enchant-dot"
                title={`${enchant.name} — ${enchant.description}${enchantCharges !== undefined ? ` (${enchantCharges} charges left)` : ''}`}
              />
            )}
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

  const pickerSlot = selectedSlot;
  // Equipment Comparison overhaul — the currently-equipped item's effective
  // stats, so every candidate in the picker shows a diff against exactly
  // what this slot already holds (player or companion, same code path).
  const compareStats: Partial<Record<BaseStat, number>> | undefined = pickerSlot
    ? equipment[pickerSlot]?.rolls ?? (equipment[pickerSlot] ? ITEMS[equipment[pickerSlot]!.itemId]?.statBonuses : undefined)
    : undefined;

  const pickerOptions: {
    item: ItemDef;
    quantity: number;
    instanceId?: string;
    rolls?: Partial<Record<BaseStat, number>>;
  }[] = pickerSlot
    ? [
        ...Object.entries(inventory.items)
          .filter(([itemId, quantity]) => quantity > 0 && ITEMS[itemId] && fitsSlot(ITEMS[itemId]!, pickerSlot))
          .map(([itemId, quantity]) => ({ item: ITEMS[itemId]!, quantity })),
        // Randomized-roll equipment (gameData/equipmentRolls.ts) — see
        // Inventory.equipmentInstances' doc comment. Offering these here
        // for companions too is the actual backend-UI parity gap this
        // overhaul closes: firebase/companions.ts's equipCompanionItem
        // already accepted an instanceId, nothing in the UI ever offered
        // one before this component existed.
        ...Object.entries(inventory.equipmentInstances ?? {})
          .filter(([, inst]) => inst.quantity > 0 && ITEMS[inst.itemId] && fitsSlot(ITEMS[inst.itemId]!, pickerSlot))
          .map(([instanceId, inst]) => ({
            item: ITEMS[inst.itemId]!,
            quantity: inst.quantity,
            instanceId,
            rolls: inst.rolls,
          })),
      ]
    : [];

  return (
    <div className="equipment-paper-doll">
      <div className="equipment-grid">
        <div className="equipment-col">{LEFT_COLUMN.map(renderSlotTile)}</div>
        {centerPanel}
        <div className="equipment-col">{RIGHT_COLUMN.map(renderSlotTile)}</div>
      </div>

      <div className="equipment-bottom-row">{BOTTOM_ROW.map(renderSlotTile)}</div>
      {showTool && <div className="equipment-bottom-row equipment-tool-row">{renderSlotTile('tool')}</div>}

      {pickerSlot && (
        <div className="equipment-picker">
          <h4>{SLOT_LABEL[pickerSlot]}</h4>
          {equipment[pickerSlot] && <button onClick={() => onUnequip(pickerSlot)}>Unequip</button>}
          {pickerOptions.length === 0 ? (
            <p>Nothing in inventory fits here.</p>
          ) : (
            <div className="item-grid">
              {pickerOptions.map(({ item, quantity, instanceId, rolls }) => {
                const allowed = canClassEquip(allowedClass, item);
                const willDropOffhand = pickerSlot === 'weapon' && isTwoHandedWeapon(item) && !!equipment.offhand;
                return (
                  <div key={instanceId ?? item.id} className="loot-entry">
                    <ItemSlot
                      item={item}
                      quantity={quantity}
                      disabled={!allowed}
                      statOverride={rolls}
                      compareStats={compareStats}
                      onClick={() => onEquip(pickerSlot, item.id, instanceId)}
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
    </div>
  );
}

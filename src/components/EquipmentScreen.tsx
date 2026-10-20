import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { equipItem, unequipItem } from '../firebase/character';
import { setEquippedConsumable, useConsumableOutOfCombat } from '../firebase/consumables';
import { subscribeToInventory } from '../firebase/inventory';
import { ENCHANTS } from '../gameData/enchanting';
import { statAtLevel } from '../gameData/classStats';
import { getEquipmentStatBonuses, baseStatTooltip } from '../gameData/equipmentStats';
import { EquipmentPaperDoll, SLOT_LABEL } from './EquipmentPaperDoll';
import { ConsumablesBar } from './ConsumablesBar';
import type { Inventory } from '../types/character';
import type { EquipmentSlot } from '../gameData/types';
import type { BaseStat } from '../gameData/classStats';

export { SLOT_LABEL };

// Exported so CompanionScreen can build the same centered stat panel for a
// companion's own paper doll, instead of a second, drifting copy of this
// list.
export const BASE_STATS: BaseStat[] = ['STR', 'STA', 'INT', 'SPI', 'AGI'];
export const BASE_STAT_LABEL: Record<BaseStat, string> = {
  STR: 'Strength', STA: 'Stamina', INT: 'Intellect', SPI: 'Spirit', AGI: 'Agility',
};

// Icon-grid paper doll: one tile per slot, hover for name/stats (ItemSlot's
// own tooltip), click to open a small picker of what from your inventory
// fits there. The grid/picker itself is EquipmentPaperDoll (shared with
// CompanionScreen — Equipment overhaul's companion-UI-parity ask); this
// screen supplies the player-specific bits (live stat totals, enchant
// lookups, the Quick-use consumables bar) around it.
export function EquipmentScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  if (!character || !inventory) return null;

  async function handleEquip(slot: EquipmentSlot, itemId: string, instanceId?: string) {
    if (!user) return;
    setError(null);
    try {
      await equipItem(user.uid, slot, itemId, instanceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not equip that.');
    }
    await refetch();
  }

  async function handleUnequip(slot: EquipmentSlot) {
    if (!user) return;
    await unequipItem(user.uid, slot);
    await refetch();
  }

  async function handleUseConsumable(itemId: string) {
    if (!user) return;
    const result = await useConsumableOutOfCombat(user.uid, itemId);
    if (!result.success) setError(result.reason ?? 'Could not use that item.');
    await refetch();
  }

  async function handleEquipConsumable(slot: 'food' | 'potion', itemId: string | null) {
    if (!user) return;
    const result = await setEquippedConsumable(user.uid, slot, itemId);
    if (!result.success) setError(result.reason ?? 'Could not equip that.');
    await refetch();
  }

  const equipmentBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments, character.enchantmentCharges);
  // statAtLevel's class growth rates are deliberately fractional (e.g.
  // warrior STR +1.2/level), and combat math elsewhere (combatEngine/
  // engine.ts, gameData/combatFormulas.ts) depends on that real precision
  // — rounding inside statAtLevel itself would quietly shift damage/HP
  // balance. This panel is display-only, so it rounds just its OWN total
  // (base + equipment) at the end, which is what was showing raw float
  // noise like 14.399999999999999 instead of 14.4.
  const totalStats: Record<BaseStat, number> = {
    STR: Math.round(statAtLevel(character.class, 'STR', character.level) + (equipmentBonuses.STR ?? 0)),
    STA: Math.round(statAtLevel(character.class, 'STA', character.level) + (equipmentBonuses.STA ?? 0)),
    INT: Math.round(statAtLevel(character.class, 'INT', character.level) + (equipmentBonuses.INT ?? 0)),
    SPI: Math.round(statAtLevel(character.class, 'SPI', character.level) + (equipmentBonuses.SPI ?? 0)),
    AGI: Math.round(statAtLevel(character.class, 'AGI', character.level) + (equipmentBonuses.AGI ?? 0)),
  };

  return (
    <div className="equipment-screen">
      <h2>Equipment</h2>
      {error && <p className="error">{error}</p>}

      <EquipmentPaperDoll
        equipment={character.equipment}
        inventory={inventory}
        allowedClass={character.class}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        enchantments={character.enchantments}
        enchantmentCharges={character.enchantmentCharges}
        getEnchantInfo={(enchantId) => ENCHANTS[enchantId]}
        centerPanel={
          <div className="equipment-stats-panel">
            <h3>Character Stats</h3>
            {BASE_STATS.map((stat) => (
              <div key={stat} className="equipment-stat-row" title={baseStatTooltip(stat, character.class, character.spec)}>
                <span>{BASE_STAT_LABEL[stat]}</span>
                <span className="equipment-stat-value">{totalStats[stat]}</span>
              </div>
            ))}
          </div>
        }
      />

      {character.professions.enchanting && (
        <p>
          <small>Apply, remove, or disenchant enchants from the Enchanting tab.</small>
        </p>
      )}

      <h3>Quick-use</h3>
      <ConsumablesBar
        character={character}
        inventoryItems={inventory.items}
        allowMana={false}
        allowRecoveryFood={true}
        onUse={handleUseConsumable}
        onEquip={handleEquipConsumable}
      />
    </div>
  );
}

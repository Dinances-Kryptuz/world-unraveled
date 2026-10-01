import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { recruitCompanion, setActiveCompanion, equipCompanionItem, unequipCompanionItem } from '../firebase/companions';
import { subscribeToInventory } from '../firebase/inventory';
import { COMPANIONS, companionsInZone, checkRecruitCompanion } from '../gameData/companions';
import { CLASS_LABELS, SPEC_LABELS, canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import type { Inventory } from '../types/character';
import type { EquipmentSlot } from '../gameData/types';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'ring'];

function formatStatBonuses(statBonuses: Partial<Record<string, number>> | undefined): string {
  const parts = Object.entries(statBonuses ?? {}).map(([stat, val]) => `+${val} ${stat}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

export function CompanionScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user]);

  if (!character || !inventory) return null;

  const recruitable = companionsInZone(zoneId);
  const recruitedIds = Object.keys(character.companions);

  async function handleRecruit(companionId: string) {
    if (!user) return;
    await recruitCompanion(user.uid, companionId);
    await refetch();
  }

  async function handleSetActive(companionId: string | null) {
    if (!user) return;
    await setActiveCompanion(user.uid, companionId);
    await refetch();
  }

  async function handleEquip(companionId: string, slot: EquipmentSlot, itemId: string) {
    if (!user) return;
    await equipCompanionItem(user.uid, companionId, slot, itemId);
    await refetch();
  }

  async function handleUnequip(companionId: string, slot: EquipmentSlot) {
    if (!user) return;
    await unequipCompanionItem(user.uid, companionId, slot);
    await refetch();
  }

  const equippableInInventory = Object.entries(inventory.items).filter(([itemId, quantity]) => {
    const item = ITEMS[itemId];
    return item?.type === 'equipment' && item.equipSlot !== 'tool' && quantity > 0;
  });

  return (
    <div className="companion-screen">
      <h2>Companions</h2>

      {recruitable.length > 0 && (
        <>
          <h3>Recruit here</h3>
          <ul>
            {recruitable.map((def) => {
              const check = checkRecruitCompanion(def.id, recruitedIds, character.level, character.gold);
              const alreadyRecruited = recruitedIds.includes(def.id);
              return (
                <li key={def.id}>
                  <strong>{def.name}</strong> — {CLASS_LABELS[def.class]} ({SPEC_LABELS[def.specId]}).{' '}
                  {def.description} Costs {def.recruitGoldCost} gold, requires level {def.requiredCharacterLevel}.
                  <button onClick={() => handleRecruit(def.id)} disabled={!check.ok || alreadyRecruited}>
                    {alreadyRecruited ? 'Recruited' : check.ok ? 'Recruit' : check.reason}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>Your companions</h3>
      {recruitedIds.length === 0 ? (
        <p>You haven't recruited any companions yet.</p>
      ) : (
        <>
          <ul>
            <li>
              Fighting alongside you: <strong>{character.activeCompanionId ? COMPANIONS[character.activeCompanionId]?.name : 'nobody (solo)'}</strong>
              <button onClick={() => handleSetActive(null)} disabled={!character.activeCompanionId}>
                Fight solo
              </button>
            </li>
          </ul>
          {recruitedIds.map((companionId) => {
            const def = COMPANIONS[companionId];
            const state = character.companions[companionId];
            if (!def || !state) return null;
            const isActive = character.activeCompanionId === companionId;
            return (
              <div key={companionId} className="companion-card">
                <h4>
                  {def.name} — {CLASS_LABELS[def.class]} ({SPEC_LABELS[def.specId]}), level {character.level}
                </h4>
                <button onClick={() => handleSetActive(companionId)} disabled={isActive}>
                  {isActive ? 'Active' : 'Bring along'}
                </button>
                <ul>
                  {SLOT_ORDER.map((slot) => {
                    const equippedId = state.equipment[slot];
                    const equippedItem = equippedId ? ITEMS[equippedId] : null;
                    return (
                      <li key={slot}>
                        {slot}: {equippedItem ? `${equippedItem.name}${formatStatBonuses(equippedItem.statBonuses)}` : '(empty)'}
                        {equippedItem && <button onClick={() => handleUnequip(companionId, slot)}>Unequip</button>}
                      </li>
                    );
                  })}
                </ul>
                <details>
                  <summary>Equip from inventory</summary>
                  {equippableInInventory.length === 0 ? (
                    <p>No equippable items in inventory.</p>
                  ) : (
                    <ul>
                      {equippableInInventory.map(([itemId, quantity]) => {
                        const item = ITEMS[itemId];
                        if (!item?.equipSlot) return null;
                        const allowed = canClassEquip(def.class, item);
                        return (
                          <li key={itemId}>
                            {item.name}
                            {formatStatBonuses(item.statBonuses)} x{quantity}
                            <button onClick={() => handleEquip(companionId, item.equipSlot!, itemId)} disabled={!allowed}>
                              {allowed ? 'Equip' : `${item.armorType} — not usable`}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </details>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

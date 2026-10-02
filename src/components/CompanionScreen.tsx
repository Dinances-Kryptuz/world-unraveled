import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { recruitCompanion, addCompanionToParty, removeCompanionFromParty, equipCompanionItem, unequipCompanionItem } from '../firebase/companions';
import { subscribeToInventory } from '../firebase/inventory';
import { COMPANIONS, checkRecruitCompanion, MAX_ACTIVE_COMPANIONS, REQUIRED_DUNGEON_PARTY_SIZE } from '../gameData/companions';
import { CLASS_LABELS, SPEC_LABELS, canClassEquip } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import { ZONES } from '../gameData/zones';
import type { Inventory } from '../types/character';
import type { EquipmentSlot } from '../gameData/types';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'ring'];

function formatStatBonuses(statBonuses: Partial<Record<string, number>> | undefined): string {
  const parts = Object.entries(statBonuses ?? {}).map(([stat, val]) => `+${val} ${stat}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

export function CompanionScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user]);

  if (!character || !inventory) return null;

  // The full roster, not just the current zone's — recruiting was never
  // actually zone-gated server-side (see firebase/companions.ts's
  // recruitCompanion, which only checks level/gold), so filtering this list
  // by zone just made companions like the Mage pair hard to find unless you
  // happened to be standing in Stonecrag Foothills or Emberfall Ridge when
  // you checked. Sorted by level requirement so earlier recruits lead.
  const recruitable = Object.values(COMPANIONS).sort((a, b) => a.requiredCharacterLevel - b.requiredCharacterLevel);
  // Sorted by the roster's own fixed order (gameData/companions.ts), not
  // Object.keys(character.companions) — Firestore doesn't guarantee a
  // map's key order survives a dot-path update to one of its nested
  // fields (equipCompanionItem writes `companions.<id>.equipment.<slot>`),
  // so that order could silently shuffle on every gear change otherwise.
  const recruitedIds = Object.keys(COMPANIONS).filter((id) => character.companions[id]);

  async function handleRecruit(companionId: string) {
    if (!user) return;
    await recruitCompanion(user.uid, companionId);
    await refetch();
  }

  async function handleAddToParty(companionId: string) {
    if (!user) return;
    await addCompanionToParty(user.uid, companionId);
    await refetch();
  }

  async function handleRemoveFromParty(companionId: string) {
    if (!user) return;
    await removeCompanionFromParty(user.uid, companionId);
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
          <h3>Recruit</h3>
          <ul>
            {recruitable.map((def) => {
              const check = checkRecruitCompanion(def.id, recruitedIds, character.level, character.gold);
              const alreadyRecruited = recruitedIds.includes(def.id);
              const zoneName = ZONES[def.recruitZoneId]?.name ?? def.recruitZoneId;
              return (
                <li key={def.id}>
                  <strong>{def.name}</strong> — {CLASS_LABELS[def.class]} ({SPEC_LABELS[def.specId]}).{' '}
                  {def.description} Found in {zoneName}. Costs {def.recruitGoldCost} gold, requires level{' '}
                  {def.requiredCharacterLevel}.
                  <button onClick={() => handleRecruit(def.id)} disabled={!check.ok || alreadyRecruited}>
                    {alreadyRecruited ? 'Recruited' : check.ok ? 'Recruit' : check.reason}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>Your party</h3>
      {recruitedIds.length === 0 ? (
        <p>You haven't recruited any companions yet.</p>
      ) : (
        <>
          <p>
            Party: <strong>You</strong>
            {character.activeCompanionIds.map((id) => `, ${COMPANIONS[id]?.name ?? id}`).join('')} —{' '}
            {character.activeCompanionIds.length + 1} / {REQUIRED_DUNGEON_PARTY_SIZE}
            {character.activeCompanionIds.length === MAX_ACTIVE_COMPANIONS
              ? ' (full — ready for a dungeon)'
              : ` (recruit and bring ${MAX_ACTIVE_COMPANIONS - character.activeCompanionIds.length} more to enter a dungeon)`}
          </p>
          {recruitedIds.map((companionId) => {
            const def = COMPANIONS[companionId];
            const state = character.companions[companionId];
            if (!def || !state) return null;
            const isActive = character.activeCompanionIds.includes(companionId);
            const partyFull = character.activeCompanionIds.length >= MAX_ACTIVE_COMPANIONS;
            return (
              <div key={companionId} className="companion-card">
                <h4>
                  {def.name} — {CLASS_LABELS[def.class]} ({SPEC_LABELS[def.specId]}), level {character.level}
                </h4>
                {isActive ? (
                  <button onClick={() => handleRemoveFromParty(companionId)}>Remove from party</button>
                ) : (
                  <button onClick={() => handleAddToParty(companionId)} disabled={partyFull}>
                    {partyFull ? `Party full (${MAX_ACTIVE_COMPANIONS}/${MAX_ACTIVE_COMPANIONS})` : 'Add to party'}
                  </button>
                )}
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

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { recruitCompanion, addCompanionToParty, removeCompanionFromParty, equipCompanionItem, unequipCompanionItem } from '../firebase/companions';
import { getAccount, listRosterSummaries, addAltToParty, removeAltFromParty } from '../firebase/characterSlots';
import { subscribeToInventory } from '../firebase/inventory';
import { COMPANIONS, checkRecruitCompanion, MAX_ACTIVE_COMPANIONS, REQUIRED_DUNGEON_PARTY_SIZE } from '../gameData/companions';
import type { RosterSlotSummary } from '../gameData/characterSlots';
import { CLASS_LABELS, SPEC_LABELS, canClassEquip, type ClassId, type SpecId } from '../gameData/classStats';
import { ITEMS } from '../gameData/items';
import { ZONES } from '../gameData/zones';
import { ItemSlot } from './ItemSlot';
import type { Inventory } from '../types/character';
import type { EquipmentSlot } from '../gameData/types';

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'offhand', 'chest', 'helmet', 'gloves', 'legs', 'boots', 'necklace', 'ring', 'ring2'];

export function CompanionScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [roster, setRoster] = useState<RosterSlotSummary[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user]);

  async function loadRoster() {
    if (!user) return;
    const account = await getAccount(user.uid);
    setRoster(await listRosterSummaries(user.uid, account));
  }

  useEffect(() => {
    void loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!character || !inventory) return null;

  const groupHeadcount = character.activeCompanionIds.length + character.activeAltSlots.length;

  async function handleAddAltToParty(slot: number) {
    if (!user || !character) return;
    const result = await addAltToParty(user.uid, slot, character);
    if (result.success) await refetch();
  }

  async function handleRemoveAltFromParty(slot: number) {
    if (!user || !character) return;
    await removeAltFromParty(user.uid, slot, character);
    await refetch();
  }

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

      {roster.length > 0 && (
        <>
          <h3>Your Characters</h3>
          <p>
            <small>
              Recruiting one of your own characters into the party is free (no wage), and it fights with its own
              real gear, spec, and talents — better than a hired companion at the same job.
            </small>
          </p>
          <ul>
            {roster.map((r) => {
              const isActive = character.activeAltSlots.includes(r.slot);
              const partyFull = groupHeadcount >= MAX_ACTIVE_COMPANIONS;
              return (
                <li key={r.slot}>
                  <strong>{r.name}</strong> — {CLASS_LABELS[r.class as ClassId]}
                  {r.spec ? ` (${SPEC_LABELS[r.spec as SpecId]})` : ''}, level {r.level}
                  {isActive ? (
                    <button onClick={() => handleRemoveAltFromParty(r.slot)}>Remove from party</button>
                  ) : (
                    <button onClick={() => handleAddAltToParty(r.slot)} disabled={partyFull}>
                      {partyFull ? 'Party full' : 'Add to party'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>Your party</h3>
      {recruitedIds.length === 0 && roster.length === 0 ? (
        <p>You haven't recruited any companions yet.</p>
      ) : (
        <>
          <p>
            Party: <strong>You</strong>
            {character.activeCompanionIds.map((id) => `, ${COMPANIONS[id]?.name ?? id}`).join('')}
            {character.activeAltSlots
              .map((slot) => roster.find((r) => r.slot === slot))
              .filter((r): r is RosterSlotSummary => !!r)
              .map((r) => `, ${r.name}`)
              .join('')} —{' '}
            {groupHeadcount + 1} / {REQUIRED_DUNGEON_PARTY_SIZE}
            {groupHeadcount === MAX_ACTIVE_COMPANIONS
              ? ' (full — ready for a dungeon)'
              : ` (recruit and bring ${MAX_ACTIVE_COMPANIONS - groupHeadcount} more to enter a dungeon)`}
          </p>
          {recruitedIds.map((companionId) => {
            const def = COMPANIONS[companionId];
            const state = character.companions[companionId];
            if (!def || !state) return null;
            const isActive = character.activeCompanionIds.includes(companionId);
            const partyFull = groupHeadcount >= MAX_ACTIVE_COMPANIONS;
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
                        <div className="item-row-main">
                          {equippedItem ? <ItemSlot item={equippedItem} /> : <div className="item-slot item-slot-empty" />}
                          <span>
                            {slot}: {equippedItem ? equippedItem.name : '(empty)'}
                          </span>
                        </div>
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
                        // See EquipmentScreen's matching comment — a ring
                        // item fits either independent ring slot, so both
                        // are offered rather than always targeting 'ring'.
                        if (item.equipSlot === 'ring') {
                          return (
                            <li key={itemId}>
                              <div className="item-row-main">
                                <ItemSlot item={item} quantity={quantity} />
                                <span>{item.name}</span>
                              </div>
                              <button onClick={() => handleEquip(companionId, 'ring', itemId)} disabled={!allowed}>
                                {allowed ? 'Equip (Ring 1)' : `${item.armorType} — not usable`}
                              </button>
                              {allowed && (
                                <button onClick={() => handleEquip(companionId, 'ring2', itemId)}>Equip (Ring 2)</button>
                              )}
                            </li>
                          );
                        }
                        return (
                          <li key={itemId}>
                            <div className="item-row-main">
                              <ItemSlot item={item} quantity={quantity} />
                              <span>{item.name}</span>
                            </div>
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

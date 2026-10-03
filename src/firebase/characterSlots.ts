import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { createCharacter } from './character';
import type { ClassId } from '../gameData/classStats';
import { MAX_ACTIVE_COMPANIONS, buildAltCombatSetup, type CompanionCombatSetup } from '../gameData/companions';
import type { Character } from '../types/character';
import {
  MAX_CHARACTER_SLOTS,
  DEFAULT_ACCOUNT_STATE,
  type AccountState,
  type RosterSlotSummary,
} from '../gameData/characterSlots';

// Lazily created on first read — every account that existed before this
// feature did has no accounts/{uid} doc at all yet, and just starts here at
// slot 1/1 (its existing characters/{uid} IS that slot) with no migration
// step needed, per "auto-migrate, no visible change."
export async function getAccount(uid: string): Promise<AccountState> {
  const snap = await getDoc(doc(db, 'accounts', uid));
  if (!snap.exists()) {
    await setDoc(doc(db, 'accounts', uid), DEFAULT_ACCOUNT_STATE);
    return { ...DEFAULT_ACCOUNT_STATE };
  }
  const data = snap.data();
  return {
    unlockedSlots: data.unlockedSlots ?? DEFAULT_ACCOUNT_STATE.unlockedSlots,
    activeSlot: data.activeSlot ?? DEFAULT_ACCOUNT_STATE.activeSlot,
  };
}

// Called right after a level-up resolves to MAX_CHARACTER_LEVEL (see
// CombatScreen/DungeonScreen/WelcomeBackScreen). Comparing activeSlot to
// unlockedSlots (rather than just checking "did this character hit max
// level") is what stops an already-accounted-for slot from re-unlocking the
// next one every time its maxed character is played again later.
export async function checkAndUnlockNextSlot(uid: string): Promise<void> {
  const account = await getAccount(uid);
  if (account.activeSlot === account.unlockedSlots && account.unlockedSlots < MAX_CHARACTER_SLOTS) {
    await updateDoc(doc(db, 'accounts', uid), { unlockedSlots: account.unlockedSlots + 1 });
  }
}

// Lightweight summaries of every unlocked slot OTHER than the active one —
// for the character-select screen, so it doesn't have to pull each roster
// character's full doc (equipment/quests/professions/etc.) just to list
// name/class/spec/level.
export async function listRosterSummaries(uid: string, account: AccountState): Promise<RosterSlotSummary[]> {
  const slots: number[] = [];
  for (let slot = 1; slot <= account.unlockedSlots; slot++) {
    if (slot !== account.activeSlot) slots.push(slot);
  }
  const snaps = await Promise.all(slots.map((slot) => getDoc(doc(db, 'characters', uid, 'roster', String(slot)))));
  const summaries: RosterSlotSummary[] = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists()) return;
    const data = snap.data();
    summaries.push({ slot: slots[i], name: data.name, class: data.class, spec: data.spec ?? null, level: data.level });
  });
  return summaries;
}

// Archives whatever character is currently live (if any — see
// isValidNewCharacter's companions below) into its own slot, then rolls a
// brand new level-1 character fresh into characters/{uid} and makes it the
// active one. Only ever called for the one slot the unlock-check above just
// opened up (account.unlockedSlots, which by that same invariant has never
// been filled yet) — the UI only offers this action for that slot.
export async function createCharacterInNewSlot(
  uid: string,
  name: string,
  cls: ClassId,
  account: AccountState
): Promise<{ success: boolean; reason?: string }> {
  if (account.unlockedSlots <= account.activeSlot) {
    return { success: false, reason: 'No new character slot is available yet.' };
  }
  const targetSlot = account.unlockedSlots;

  const [activeChar, activeInv, activeBank] = await Promise.all([
    getDoc(doc(db, 'characters', uid)),
    getDoc(doc(db, 'characters', uid, 'inventory', 'main')),
    getDoc(doc(db, 'characters', uid, 'bank', 'main')),
  ]);

  const batch = writeBatch(db);
  if (activeChar.exists()) {
    batch.set(doc(db, 'characters', uid, 'roster', String(account.activeSlot)), activeChar.data()!);
  }
  if (activeInv.exists()) {
    batch.set(doc(db, 'characters', uid, 'roster', String(account.activeSlot), 'inventory', 'main'), activeInv.data()!);
  }
  if (activeBank.exists()) {
    batch.set(doc(db, 'characters', uid, 'roster', String(account.activeSlot), 'bank', 'main'), activeBank.data()!);
  }
  batch.update(doc(db, 'accounts', uid), { activeSlot: targetSlot });
  await batch.commit();

  // createCharacter() setDoc's characters/{uid} + its inventory/bank mains —
  // a full overwrite, which is exactly right since the previous occupant was
  // just archived into the roster above.
  await createCharacter(uid, name, cls);
  return { success: true };
}

// Swaps which character is "live" at characters/{uid} — archives the
// currently-active character into its own roster slot and promotes the
// target roster slot's data (character + inventory + bank) into the live
// position, then clears the target's now-stale roster copy. Every existing
// firebase/*.ts function and UI screen keeps reading/writing
// characters/{uid} exactly as before; this is the only place that ever
// moves data in or out of it.
export async function switchActiveCharacter(
  uid: string,
  targetSlot: number,
  account: AccountState
): Promise<{ success: boolean; reason?: string }> {
  if (targetSlot === account.activeSlot) return { success: false, reason: 'Already playing that character.' };
  if (targetSlot < 1 || targetSlot > account.unlockedSlots) return { success: false, reason: 'That slot is not unlocked.' };

  const [activeChar, activeInv, activeBank, targetChar, targetInv, targetBank] = await Promise.all([
    getDoc(doc(db, 'characters', uid)),
    getDoc(doc(db, 'characters', uid, 'inventory', 'main')),
    getDoc(doc(db, 'characters', uid, 'bank', 'main')),
    getDoc(doc(db, 'characters', uid, 'roster', String(targetSlot))),
    getDoc(doc(db, 'characters', uid, 'roster', String(targetSlot), 'inventory', 'main')),
    getDoc(doc(db, 'characters', uid, 'roster', String(targetSlot), 'bank', 'main')),
  ]);
  if (!targetChar.exists()) return { success: false, reason: 'That character slot is empty.' };

  const batch = writeBatch(db);
  if (activeChar.exists()) {
    batch.set(doc(db, 'characters', uid, 'roster', String(account.activeSlot)), activeChar.data()!);
  }
  if (activeInv.exists()) {
    batch.set(doc(db, 'characters', uid, 'roster', String(account.activeSlot), 'inventory', 'main'), activeInv.data()!);
  }
  if (activeBank.exists()) {
    batch.set(doc(db, 'characters', uid, 'roster', String(account.activeSlot), 'bank', 'main'), activeBank.data()!);
  }
  batch.set(doc(db, 'characters', uid), targetChar.data()!);
  batch.set(doc(db, 'characters', uid, 'inventory', 'main'), targetInv.exists() ? targetInv.data()! : { items: {} });
  batch.set(doc(db, 'characters', uid, 'bank', 'main'), targetBank.exists() ? targetBank.data()! : { items: {} });
  batch.delete(doc(db, 'characters', uid, 'roster', String(targetSlot)));
  batch.delete(doc(db, 'characters', uid, 'roster', String(targetSlot), 'inventory', 'main'));
  batch.delete(doc(db, 'characters', uid, 'roster', String(targetSlot), 'bank', 'main'));
  batch.update(doc(db, 'accounts', uid), { activeSlot: targetSlot });
  await batch.commit();
  return { success: true };
}

// Recruits one of the account's OTHER characters into this character's
// dungeon party — combined with activeCompanionIds, capped at
// MAX_ACTIVE_COMPANIONS (one shared party-size limit; see ZoneScreen.tsx's
// dungeon-entry gate). Validated against a fresh roster read, not just
// trusted from the client, same "ownership-scoped, not fully value-scoped"
// posture as every other companions write in this codebase.
export async function addAltToParty(
  uid: string,
  slot: number,
  character: Character
): Promise<{ success: boolean; reason?: string }> {
  if (character.activeAltSlots.includes(slot)) return { success: false, reason: 'Already recruited.' };
  if (character.activeCompanionIds.length + character.activeAltSlots.length >= MAX_ACTIVE_COMPANIONS) {
    return { success: false, reason: 'Your party is already full.' };
  }
  const rosterSnap = await getDoc(doc(db, 'characters', uid, 'roster', String(slot)));
  if (!rosterSnap.exists()) return { success: false, reason: 'That character slot is empty.' };

  await updateDoc(doc(db, 'characters', uid), {
    activeAltSlots: [...character.activeAltSlots, slot],
  });
  return { success: true };
}

export async function removeAltFromParty(uid: string, slot: number, character: Character): Promise<void> {
  await updateDoc(doc(db, 'characters', uid), {
    activeAltSlots: character.activeAltSlots.filter((s) => s !== slot),
  });
}

// Builds the live combat setup for every currently-recruited alt (0 to
// MAX_ACTIVE_COMPANIONS) — callers (DungeonScreen, the only place alts fight
// — see ZoneScreen.tsx's "companions only fight in dungeons" rule) spread
// this alongside resolveActiveCompanionSetups() into
// EncounterSetupInput.companions. Reads each roster doc directly (not
// through getCharacter()'s full Date-conversion/backfill pipeline — an
// AI-controlled alt has no use for any of that) rather than caching
// anything, so a recruited alt always fights with its CURRENT gear/talents,
// not a stale snapshot from whenever it was recruited. A slot that's gone
// missing (switched into, or overwritten by a new character — see
// createCharacterInNewSlot/switchActiveCharacter) is silently skipped,
// same "tolerate, don't crash" posture resolveActiveCompanionSetups takes.
export async function resolveActiveAltSetups(uid: string, character: Character): Promise<CompanionCombatSetup[]> {
  const snaps = await Promise.all(
    character.activeAltSlots.map((slot) => getDoc(doc(db, 'characters', uid, 'roster', String(slot))))
  );
  const setups: CompanionCombatSetup[] = [];
  character.activeAltSlots.forEach((slot, i) => {
    const snap = snaps[i];
    if (!snap.exists()) return;
    const data = snap.data();
    setups.push(
      buildAltCombatSetup(slot, {
        name: data.name,
        class: data.class,
        spec: data.spec ?? null,
        level: data.level,
        equipment: data.equipment,
        enchantments: data.enchantments,
        talentPicks: data.talentPicks,
        equippedAbilityIds: data.equippedAbilityIds,
      })
    );
  });
  return setups;
}

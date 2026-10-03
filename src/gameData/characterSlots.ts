// Phase 4: multi-character accounts. One Firebase user (uid) now owns up to
// MAX_CHARACTER_SLOTS characters, but — deliberately, to avoid a risky
// full-collection migration — only ONE of them is ever "live" at
// characters/{uid} (the exact path every existing firebase/*.ts function,
// combat-engine caller, and UI screen already reads/writes). The other
// unlocked-but-not-currently-played slots are archived in full under
// characters/{uid}/roster/{slotIndex}, in the IDENTICAL Character shape —
// see firebase/characterSlots.ts for the account doc and the archive/
// promote swap that makes switching characters work without touching any
// of that existing code.
export const MAX_CHARACTER_SLOTS = 3;

// accounts/{uid} — one tiny doc per Firebase user, tracking which slot is
// currently live and how many are unlocked. Lazily created on first read
// (see firebase/characterSlots.ts's getAccount) so every account that
// existed before this feature did just starts at slot 1/1 with no
// migration step, per "auto-migrate, no visible change."
export interface AccountState {
  unlockedSlots: number; // 1..MAX_CHARACTER_SLOTS
  activeSlot: number; // 1..unlockedSlots — which slot's data currently lives at characters/{uid}
}

export const DEFAULT_ACCOUNT_STATE: AccountState = { unlockedSlots: 1, activeSlot: 1 };

// A lightweight read of one roster (non-active) slot for the character-select
// screen — just enough to render a row without pulling the whole Character
// doc (equipment, quests, professions, etc.) for slots you're not playing.
export interface RosterSlotSummary {
  slot: number;
  name: string;
  class: string;
  spec: string | null;
  level: number;
}

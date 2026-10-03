import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { getAccount, listRosterSummaries, switchActiveCharacter, createCharacterInNewSlot } from '../firebase/characterSlots';
import { MAX_CHARACTER_SLOTS, type AccountState, type RosterSlotSummary } from '../gameData/characterSlots';
import { CLASS_LABELS, SPEC_LABELS, type ClassId, type SpecId } from '../gameData/classStats';

const CLASS_OPTIONS: { id: ClassId; name: string; blurb: string }[] = [
  { id: 'warrior', name: 'Warrior', blurb: 'Melee damage or tank. High strength and stamina.' },
  { id: 'priest', name: 'Priest', blurb: 'Shadow damage or holy healer. High intellect and spirit.' },
  { id: 'paladin', name: 'Paladin', blurb: 'Tank or holy healer. Balanced across all stats.' },
];

// Lets a player see every character slot their account has unlocked, switch
// which one is actively played (see firebase/characterSlots.ts's
// switchActiveCharacter — a full archive/promote swap under characters/{uid},
// invisible to every other screen), and roll a new level-1 character into a
// freshly-unlocked slot (checkAndUnlockNextSlot fires automatically from
// CombatScreen/DungeonScreen/WelcomeBackScreen once the active character
// hits MAX_CHARACTER_LEVEL).
export function CharacterSelectScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [roster, setRoster] = useState<RosterSlotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [creatingClass, setCreatingClass] = useState<ClassId | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const acc = await getAccount(user.uid);
    setAccount(acc);
    setRoster(await listRosterSummaries(user.uid, acc));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user || !character) return null;
  if (loading || !account) return <p>Loading your characters…</p>;

  const hasEmptySlot = account.unlockedSlots > account.activeSlot;

  async function handleSwitch(slot: number) {
    if (!user || !account) return;
    setBusy(true);
    setError(null);
    const result = await switchActiveCharacter(user.uid, slot, account);
    if (!result.success) {
      setError(result.reason ?? 'Could not switch characters.');
    } else {
      await refetch();
      await load();
    }
    setBusy(false);
  }

  async function handleCreate() {
    if (!user || !account) return;
    const trimmed = creatingName.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Name must be 2-20 characters.');
      return;
    }
    if (!creatingClass) {
      setError('Choose a class first.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createCharacterInNewSlot(user.uid, trimmed, creatingClass, account);
    if (!result.success) {
      setError(result.reason ?? 'Could not create a new character.');
    } else {
      setCreatingName('');
      setCreatingClass(null);
      await refetch();
      await load();
    }
    setBusy(false);
  }

  return (
    <div className="character-select-screen">
      <h2>Your Characters</h2>
      <p>
        <small>
          {account.unlockedSlots} / {MAX_CHARACTER_SLOTS} character slots unlocked — reach level {60} with your
          newest character to unlock the next one.
        </small>
      </p>

      <ul>
        <li>
          <strong>{character.name}</strong> — {CLASS_LABELS[character.class]}
          {character.spec ? ` (${SPEC_LABELS[character.spec]})` : ''} — Level {character.level}{' '}
          <em>(currently playing)</em>
        </li>
        {roster.map((r) => (
          <li key={r.slot}>
            <strong>{r.name}</strong> — {CLASS_LABELS[r.class as ClassId]}
            {r.spec ? ` (${SPEC_LABELS[r.spec as SpecId]})` : ''} — Level {r.level}{' '}
            <button onClick={() => handleSwitch(r.slot)} disabled={busy}>
              Switch to
            </button>
          </li>
        ))}
      </ul>

      {hasEmptySlot && (
        <div className="character-create-panel">
          <h3>Create your new character (slot {account.unlockedSlots})</h3>
          <input
            type="text"
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            placeholder="Character name"
            maxLength={20}
            disabled={busy}
          />
          <ul>
            {CLASS_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <div>
                  <strong>{opt.name}</strong> — {opt.blurb}
                </div>
                <button
                  onClick={() => setCreatingClass(opt.id)}
                  disabled={busy}
                  style={{ opacity: creatingClass === opt.id ? 1 : 0.6 }}
                >
                  {creatingClass === opt.id ? 'Selected' : 'Choose'}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={handleCreate} disabled={busy || creatingName.trim().length === 0 || !creatingClass}>
            {busy ? 'Creating…' : 'Create Character'}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

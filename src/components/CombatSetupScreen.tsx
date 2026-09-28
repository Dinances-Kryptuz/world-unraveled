import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { setEquippedAbilities } from '../firebase/character';
import { maxEquippedSlots, unlockedAbilities, effectiveLoadout, basicAttackFor } from '../combatEngine/progression';
import type { Ability } from '../combatEngine/types';

function AbilityRow({ ability, children }: { ability: Ability; children: React.ReactNode }) {
  return (
    <li>
      <div>
        <strong>{ability.name}</strong> — {ability.description}
        <br />
        <small>
          {ability.cooldownSeconds > 0 ? `${ability.cooldownSeconds}s cooldown` : 'No cooldown'}
          {ability.resourceType ? ` · ${ability.resourceCost} ${ability.resourceType}` : ' · Free'}
        </small>
      </div>
      {children}
    </li>
  );
}

export function CombatSetupScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [pending, setPending] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const level = character?.level ?? 1;
  const cls = character?.class;
  const slots = maxEquippedSlots(level);
  const unlocked = cls ? unlockedAbilities(cls, level) : [];
  const basic = cls ? basicAttackFor(cls) : null;

  useEffect(() => {
    if (!character || !character.class) return;
    setPending(effectiveLoadout(character.class, character.level, character.equippedAbilityIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.class, character?.level, character?.equippedAbilityIds.join(',')]);

  if (!character || !cls) return null;

  const equippedSet = new Set(pending);
  const available = unlocked.filter((a) => !equippedSet.has(a.id));

  function move(index: number, direction: -1 | 1) {
    setPending((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function unequip(id: string) {
    setPending((prev) => prev.filter((a) => a !== id));
  }

  function equip(id: string) {
    if (pending.length >= slots) return;
    setPending((prev) => [...prev, id]);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await setEquippedAbilities(user.uid, pending);
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  if (level < 10) {
    return (
      <div className="combat-setup-screen">
        <h2>Combat Setup</h2>
        <p>
          You're currently using <strong>{basic?.name}</strong>
          {unlocked[unlocked.length - 1] ? ` and ${unlocked[unlocked.length - 1].name}` : ''} automatically.
        </p>
        <p>The priority system — choosing and ordering your own abilities — unlocks at level 10.</p>
      </div>
    );
  }

  const dirty = JSON.stringify(pending) !== JSON.stringify(effectiveLoadout(cls, level, character.equippedAbilityIds));

  return (
    <div className="combat-setup-screen">
      <h2>Combat Setup</h2>
      <p>
        {slots} ability slot{slots === 1 ? '' : 's'} — checked top to bottom every time you act. {basic?.name} is
        always available as a free fallback and never takes a slot.
      </p>

      <h3>
        Equipped ({pending.length} / {slots})
      </h3>
      {pending.length === 0 ? (
        <p>No abilities equipped — you'll only use {basic?.name}.</p>
      ) : (
        <ul>
          {pending.map((id, index) => {
            const ability = unlocked.find((a) => a.id === id);
            if (!ability) return null;
            return (
              <AbilityRow key={id} ability={ability}>
                <div>
                  <button onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button onClick={() => move(index, 1)} disabled={index === pending.length - 1}>
                    ↓
                  </button>
                  <button onClick={() => unequip(id)}>Unequip</button>
                </div>
              </AbilityRow>
            );
          })}
        </ul>
      )}

      <h3>Available</h3>
      {available.length === 0 ? (
        <p>Everything you've unlocked is equipped.</p>
      ) : (
        <ul>
          {available.map((ability) => (
            <AbilityRow key={ability.id} ability={ability}>
              <button onClick={() => equip(ability.id)} disabled={pending.length >= slots}>
                Equip
              </button>
            </AbilityRow>
          ))}
        </ul>
      )}

      <button onClick={handleSave} disabled={saving || !dirty}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

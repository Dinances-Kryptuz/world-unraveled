import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { saveCombatSetup } from '../firebase/character';
import { maxEquippedSlots, unlockedAbilities, effectiveLoadout, basicAttackFor } from '../combatEngine/progression';
import { resourcesForClass } from '../combatEngine/resources';
import type { ClassId } from '../gameData/classStats';
import type { Ability, Condition, ConditionGroup, ConditionType, ResourceType } from '../combatEngine/types';

const RESOURCE_LABELS: Record<ResourceType, string> = {
  rage: 'Rage',
  mana: 'Mana',
  holyPower: 'Holy Power',
};

function AbilityRow({ ability, controls, footer }: { ability: Ability; controls: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <strong>{ability.name}</strong> — {ability.description}
          <br />
          <small>
            {ability.cooldownSeconds > 0 ? `${ability.cooldownSeconds}s cooldown` : 'No cooldown'}
            {ability.resourceType ? ` · ${ability.resourceCost} ${ability.resourceType}` : ' · Free'}
          </small>
        </div>
        {controls}
      </div>
      {footer}
    </li>
  );
}

function ConditionsEditor({
  abilityId,
  cls,
  group,
  onAdd,
  onUpdate,
  onRemove,
  onSetLogic,
}: {
  abilityId: string;
  cls: ClassId;
  group: ConditionGroup | undefined;
  onAdd: (abilityId: string) => void;
  onUpdate: (abilityId: string, index: number, patch: Partial<Condition>) => void;
  onRemove: (abilityId: string, index: number) => void;
  onSetLogic: (abilityId: string, logic: 'AND' | 'OR') => void;
}) {
  const conditions = group?.conditions ?? [];
  const resourceOptions = resourcesForClass(cls);

  return (
    <div style={{ marginTop: 6, marginLeft: 4, fontSize: '0.85rem' }}>
      {conditions.length === 0 ? (
        <p style={{ margin: '2px 0', color: '#6b6156' }}>Always used when off cooldown.</p>
      ) : (
        <>
          {conditions.length > 1 && (
            <label style={{ display: 'block', marginBottom: 4 }}>
              Require{' '}
              <select value={group?.logic ?? 'AND'} onChange={(e) => onSetLogic(abilityId, e.target.value as 'AND' | 'OR')}>
                <option value="AND">ALL</option>
                <option value="OR">ANY</option>
              </select>{' '}
              of these:
            </label>
          )}
          {conditions.map((c, i) => {
            const isResource = c.type === 'resource_below' || c.type === 'resource_above';
            return (
              <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <select
                  value={c.type}
                  onChange={(e) => {
                    const type = e.target.value as ConditionType;
                    const nowResource = type === 'resource_below' || type === 'resource_above';
                    onUpdate(abilityId, i, { type, resource: nowResource ? c.resource ?? resourceOptions[0] : undefined });
                  }}
                >
                  <option value="self_hp_below">My HP is below</option>
                  <option value="self_hp_above">My HP is above</option>
                  <option value="target_hp_below">Target's HP is below</option>
                  <option value="target_hp_above">Target's HP is above</option>
                  {resourceOptions.length > 0 && <option value="resource_below">My resource is below</option>}
                  {resourceOptions.length > 0 && <option value="resource_above">My resource is above</option>}
                </select>
                {isResource && (
                  <select
                    value={c.resource ?? resourceOptions[0]}
                    onChange={(e) => onUpdate(abilityId, i, { resource: e.target.value as ResourceType })}
                  >
                    {resourceOptions.map((r) => (
                      <option key={r} value={r}>
                        {RESOURCE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={c.value}
                  onChange={(e) => onUpdate(abilityId, i, { value: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  style={{ width: 56 }}
                />
                <span>%</span>
                <button onClick={() => onRemove(abilityId, i)}>✕</button>
              </div>
            );
          })}
        </>
      )}
      <button onClick={() => onAdd(abilityId)} disabled={conditions.length >= 3}>
        + Add condition
      </button>
    </div>
  );
}

export function CombatSetupScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [pending, setPending] = useState<string[]>([]);
  const [pendingConditions, setPendingConditions] = useState<Record<string, ConditionGroup>>({});
  const [saving, setSaving] = useState(false);

  const level = character?.level ?? 1;
  const cls = character?.class;
  const slots = maxEquippedSlots(level);
  const unlocked = cls ? unlockedAbilities(cls, level) : [];
  const basic = cls ? basicAttackFor(cls) : null;

  const abilityConditionsKey = JSON.stringify(character?.abilityConditions ?? {});

  useEffect(() => {
    if (!character || !character.class) return;
    const loadout = effectiveLoadout(character.class, character.level, character.equippedAbilityIds);
    setPending(loadout);
    const conditions: Record<string, ConditionGroup> = {};
    for (const id of loadout) {
      if (character.abilityConditions[id]) conditions[id] = character.abilityConditions[id];
    }
    setPendingConditions(conditions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.class, character?.level, character?.equippedAbilityIds.join(','), abilityConditionsKey]);

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
    setPendingConditions((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function equip(id: string) {
    if (pending.length >= slots) return;
    setPending((prev) => [...prev, id]);
  }

  function addCondition(abilityId: string) {
    setPendingConditions((prev) => {
      const existing = prev[abilityId] ?? { logic: 'AND' as const, conditions: [] };
      if (existing.conditions.length >= 3) return prev;
      const newCondition: Condition = { type: 'self_hp_below', value: 50 };
      return { ...prev, [abilityId]: { ...existing, conditions: [...existing.conditions, newCondition] } };
    });
  }

  function updateCondition(abilityId: string, index: number, patch: Partial<Condition>) {
    setPendingConditions((prev) => {
      const group = prev[abilityId];
      if (!group) return prev;
      const conditions = group.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
      return { ...prev, [abilityId]: { ...group, conditions } };
    });
  }

  function removeCondition(abilityId: string, index: number) {
    setPendingConditions((prev) => {
      const group = prev[abilityId];
      if (!group) return prev;
      const conditions = group.conditions.filter((_, i) => i !== index);
      if (conditions.length === 0) {
        const next = { ...prev };
        delete next[abilityId];
        return next;
      }
      return { ...prev, [abilityId]: { ...group, conditions } };
    });
  }

  function setLogic(abilityId: string, logic: 'AND' | 'OR') {
    setPendingConditions((prev) => {
      const group = prev[abilityId];
      if (!group) return prev;
      return { ...prev, [abilityId]: { ...group, logic } };
    });
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveCombatSetup(user.uid, pending, pendingConditions);
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

  const savedLoadout = effectiveLoadout(cls, level, character.equippedAbilityIds);
  const savedConditions: Record<string, ConditionGroup> = {};
  for (const id of savedLoadout) {
    if (character.abilityConditions[id]) savedConditions[id] = character.abilityConditions[id];
  }
  const dirty =
    JSON.stringify(pending) !== JSON.stringify(savedLoadout) ||
    JSON.stringify(pendingConditions) !== JSON.stringify(savedConditions);

  return (
    <div className="combat-setup-screen">
      <h2>Combat Setup</h2>
      <p>
        {slots} ability slot{slots === 1 ? '' : 's'} — checked top to bottom every time you act. An ability with a
        condition is skipped (falling through to the next one) unless that condition is met. {basic?.name} is always
        available as a free, unconditional fallback and never takes a slot.
      </p>

      <h3>
        Equipped ({pending.length} / {slots})
      </h3>
      {pending.length === 0 ? (
        <p>No abilities equipped — you'll only use {basic?.name}.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {pending.map((id, index) => {
            const ability = unlocked.find((a) => a.id === id);
            if (!ability) return null;
            return (
              <AbilityRow
                key={id}
                ability={ability}
                controls={
                  <div>
                    <button onClick={() => move(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <button onClick={() => move(index, 1)} disabled={index === pending.length - 1}>
                      ↓
                    </button>
                    <button onClick={() => unequip(id)}>Unequip</button>
                  </div>
                }
                footer={
                  <ConditionsEditor
                    abilityId={id}
                    cls={cls}
                    group={pendingConditions[id]}
                    onAdd={addCondition}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                    onSetLogic={setLogic}
                  />
                }
              />
            );
          })}
        </ul>
      )}

      <h3>Available</h3>
      {available.length === 0 ? (
        <p>Everything you've unlocked is equipped.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {available.map((ability) => (
            <AbilityRow
              key={ability.id}
              ability={ability}
              controls={
                <button onClick={() => equip(ability.id)} disabled={pending.length >= slots}>
                  Equip
                </button>
              }
            />
          ))}
        </ul>
      )}

      <button onClick={handleSave} disabled={saving || !dirty}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

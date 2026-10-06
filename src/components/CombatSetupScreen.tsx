import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { saveCombatSetup, saveCombatPreset, activateCombatPreset, deleteCombatPreset } from '../firebase/character';
import {
  maxEquippedSlots,
  unlockedAbilities,
  effectiveLoadout,
  basicAttackFor,
  MAX_COMBAT_PRESETS,
  CONDITIONS_UNLOCK_LEVEL,
  PRIORITY_UNLOCK_LEVEL,
} from '../combatEngine/progression';
import { resourcesForClass } from '../combatEngine/resources';
import type { ClassId } from '../gameData/classStats';
import type { Ability, Condition, ConditionGroup, ConditionType, ResourceType } from '../combatEngine/types';
import type { CombatPreset } from '../types/character';

const RESOURCE_LABELS: Record<ResourceType, string> = {
  rage: 'Rage',
  mana: 'Mana',
  holyPower: 'Holy Power',
};

function AbilityRow({
  ability,
  controls,
  footer,
  dimmed,
}: {
  ability: Ability;
  controls: React.ReactNode;
  footer?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <li style={{ marginBottom: 10, opacity: dimmed ? 0.55 : 1 }}>
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
  const [pendingDisabled, setPendingDisabled] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetBusyId, setPresetBusyId] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);

  const level = character?.level ?? 1;
  const cls = character?.class;
  const spec = character?.spec ?? null;
  const slots = maxEquippedSlots(level);
  const unlocked = cls ? unlockedAbilities(cls, spec, level) : [];
  const basic = cls ? basicAttackFor(cls) : null;

  const abilityConditionsKey = JSON.stringify(character?.abilityConditions ?? {});
  const disabledAbilityIdsKey = (character?.disabledAbilityIds ?? []).join(',');
  const trainedAbilityIdsKey = (character?.trainedAbilityIds ?? []).join(',');

  useEffect(() => {
    if (!character || !character.class) return;
    const loadout = effectiveLoadout(
      character.class,
      character.spec,
      character.level,
      character.equippedAbilityIds,
      character.trainedAbilityIds
    );
    setPending(loadout);
    const conditions: Record<string, ConditionGroup> = {};
    for (const id of loadout) {
      if (character.abilityConditions[id]) conditions[id] = character.abilityConditions[id];
    }
    setPendingConditions(conditions);
    setPendingDisabled(new Set(character.disabledAbilityIds.filter((id) => loadout.includes(id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character?.class,
    character?.level,
    character?.equippedAbilityIds.join(','),
    trainedAbilityIdsKey,
    abilityConditionsKey,
    disabledAbilityIdsKey,
  ]);

  if (!character || !cls) return null;

  const trainedSet = new Set(character.trainedAbilityIds);
  const equippedSet = new Set(pending);
  const available = unlocked.filter((a) => !equippedSet.has(a.id) && trainedSet.has(a.id));
  const untrained = unlocked.filter((a) => !equippedSet.has(a.id) && !trainedSet.has(a.id));

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
    setPendingDisabled((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleDisabled(id: string) {
    setPendingDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function equip(id: string) {
    if (pending.length >= slots) return;
    setPending((prev) => {
      const next = [...prev, id];
      if (canReorder) return next;
      // Below the priority-system unlock, equip order isn't meaningful —
      // effectiveLoadout() re-sorts by unlockLevel at combat time regardless,
      // so keep the setup screen's display in sync with that instead of
      // showing an order combat won't actually use.
      const unlockLevelById = new Map(unlocked.map((a) => [a.id, a.unlockLevel]));
      return next.sort((a, b) => (unlockLevelById.get(a) ?? 0) - (unlockLevelById.get(b) ?? 0));
    });
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
      await saveCombatSetup(user.uid, pending, pendingConditions, [...pendingDisabled]);
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  // Compares against the EFFECTIVE saved loadout (savedLoadout/savedConditions,
  // computed below from effectiveLoadout()), not the raw character fields —
  // a character who's never explicitly saved has an empty equippedAbilityIds
  // in storage while still fighting with the recommended default, and a
  // preset that happens to match that default should still show as active.
  function isPresetActive(preset: CombatPreset): boolean {
    return (
      JSON.stringify(preset.equippedAbilityIds) === JSON.stringify(savedLoadout) &&
      JSON.stringify(preset.abilityConditions) === JSON.stringify(savedConditions) &&
      JSON.stringify([...preset.disabledAbilityIds].sort()) === JSON.stringify([...savedDisabled].sort())
    );
  }

  async function handleSaveAsPreset() {
    if (!user) return;
    setPresetBusyId('__saving__');
    setPresetError(null);
    try {
      const result = await saveCombatPreset(user.uid, presetName);
      if (!result.success) {
        setPresetError(result.reason ?? 'Could not save preset.');
        return;
      }
      setPresetName('');
      await refetch();
    } finally {
      setPresetBusyId(null);
    }
  }

  async function handleActivatePreset(presetId: string) {
    if (!user) return;
    setPresetBusyId(presetId);
    try {
      await activateCombatPreset(user.uid, presetId);
      await refetch();
    } finally {
      setPresetBusyId(null);
    }
  }

  async function handleDeletePreset(presetId: string) {
    if (!user) return;
    setPresetBusyId(presetId);
    try {
      await deleteCombatPreset(user.uid, presetId);
      await refetch();
    } finally {
      setPresetBusyId(null);
    }
  }

  const canReorder = level >= PRIORITY_UNLOCK_LEVEL;
  const canUseConditions = level >= CONDITIONS_UNLOCK_LEVEL;

  const savedLoadout = effectiveLoadout(cls, spec, level, character.equippedAbilityIds, character.trainedAbilityIds);
  const savedConditions: Record<string, ConditionGroup> = {};
  for (const id of savedLoadout) {
    if (character.abilityConditions[id]) savedConditions[id] = character.abilityConditions[id];
  }
  const savedDisabled = character.disabledAbilityIds.filter((id) => savedLoadout.includes(id));
  const dirty =
    JSON.stringify(pending) !== JSON.stringify(savedLoadout) ||
    JSON.stringify(pendingConditions) !== JSON.stringify(savedConditions) ||
    JSON.stringify([...pendingDisabled].sort()) !== JSON.stringify([...savedDisabled].sort());

  return (
    <div className="combat-setup-screen">
      <h2>Combat Setup</h2>
      <p>
        {slots} ability slot{slots === 1 ? '' : 's'}
        {canReorder
          ? ' — checked top to bottom every time you act.'
          : " — used automatically in a fixed order (reordering unlocks at level " + PRIORITY_UNLOCK_LEVEL + ')'}
        {canUseConditions
          ? " An ability with a condition is skipped (falling through to the next one) unless that condition is met."
          : ` Conditions unlock at level ${CONDITIONS_UNLOCK_LEVEL}.`}{' '}
        {basic?.name} is always available as a free, unconditional fallback and never takes a slot. Uncheck an
        equipped ability's "Auto-cast" box to pause it without unequipping it (it stays slotted with its conditions
        saved, it just won't be used until you re-check it).
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
            const isDisabled = pendingDisabled.has(id);
            return (
              <AbilityRow
                key={id}
                ability={ability}
                dimmed={isDisabled}
                controls={
                  <div>
                    <label style={{ marginRight: 8, fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={!isDisabled} onChange={() => toggleDisabled(id)} /> Auto-cast
                    </label>
                    {canReorder && (
                      <>
                        <button onClick={() => move(index, -1)} disabled={index === 0}>
                          ↑
                        </button>
                        <button onClick={() => move(index, 1)} disabled={index === pending.length - 1}>
                          ↓
                        </button>
                      </>
                    )}
                    <button onClick={() => unequip(id)}>Unequip</button>
                  </div>
                }
                footer={
                  canUseConditions ? (
                    <ConditionsEditor
                      abilityId={id}
                      cls={cls}
                      group={pendingConditions[id]}
                      onAdd={addCondition}
                      onUpdate={updateCondition}
                      onRemove={removeCondition}
                      onSetLogic={setLogic}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </ul>
      )}

      <h3>Available</h3>
      {available.length === 0 ? (
        <p>Everything you've trained is equipped.</p>
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

      {untrained.length > 0 && (
        <>
          <h3>Not Yet Trained</h3>
          <p>
            <small>Visit Class Trainer → Spells &amp; Abilities to learn these.</small>
          </p>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {untrained.map((ability) => (
              <AbilityRow key={ability.id} ability={ability} dimmed controls={<em>Untrained</em>} />
            ))}
          </ul>
        </>
      )}

      <button onClick={handleSave} disabled={saving || !dirty}>
        {saving ? 'Saving…' : 'Save'}
      </button>

      <h3>Presets</h3>
      <p>Save your current (saved) loadout under a name to switch back to it with one click later.</p>
      {character.combatPresets.length === 0 ? (
        <p>No saved presets yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {character.combatPresets.map((preset) => {
            const active = isPresetActive(preset);
            return (
              <li key={preset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <strong>{preset.name}</strong>
                  {active ? ' — active' : ''}
                </span>
                <div>
                  <button onClick={() => handleActivatePreset(preset.id)} disabled={active || presetBusyId !== null}>
                    {presetBusyId === preset.id ? 'Activating…' : 'Activate'}
                  </button>
                  <button onClick={() => handleDeletePreset(preset.id)} disabled={presetBusyId !== null}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Preset name"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          maxLength={24}
        />
        <button
          onClick={handleSaveAsPreset}
          disabled={
            dirty ||
            presetBusyId !== null ||
            presetName.trim().length === 0 ||
            character.combatPresets.length >= MAX_COMBAT_PRESETS
          }
        >
          Save current as preset
        </button>
      </div>
      {dirty && <small style={{ color: '#6b6156' }}>Save your changes above first — presets snapshot your saved loadout.</small>}
      {character.combatPresets.length >= MAX_COMBAT_PRESETS && (
        <small style={{ color: '#6b6156' }}>You've saved the maximum of {MAX_COMBAT_PRESETS} presets — delete one to save another.</small>
      )}
      {presetError && <p className="error">{presetError}</p>}
    </div>
  );
}

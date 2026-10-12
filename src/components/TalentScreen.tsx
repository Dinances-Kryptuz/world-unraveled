import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { pickTalent, respecTalents, getRespecCost, respecSpec, getSpecRespecCost } from '../firebase/character';
import { unlockedRows } from '../utils/talentEvaluator';
import type { TalentColumn } from '../gameData/talents';
import { SPECS, SPEC_LABELS, type SpecId } from '../gameData/classStats';

const COLUMN_LABELS: Record<TalentColumn, string> = {
  damage: '⚔️ Damage',
  survival: '🛡️ Survival',
  support: '✨ Support',
};

export function TalentScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [respeccing, setRespeccing] = useState(false);
  const [respecError, setRespecError] = useState<string | null>(null);
  const [specRespeccing, setSpecRespeccing] = useState(false);
  const [specRespecError, setSpecRespecError] = useState<string | null>(null);
  const [confirmingSpec, setConfirmingSpec] = useState<SpecId | null>(null);

  if (!character || !character.spec) return null;

  const rows = unlockedRows(character.spec, character.level);
  // Attribute/Specialization overhaul — every OTHER spec of this character's
  // own class (never a different class, per the design brief's explicit
  // "not the class itself" rule — SPECS[id].class filters that out by
  // construction, nothing to additionally check here).
  const otherClassSpecs = (Object.keys(SPECS) as SpecId[]).filter(
    (id) => SPECS[id].class === character.class && id !== character.spec
  );

  async function handlePick(rowLevel: number, column: TalentColumn) {
    if (!user) return;
    await pickTalent(user.uid, rowLevel, column);
    await refetch();
  }

  async function handleRespec() {
    if (!user) return;
    setRespeccing(true);
    setRespecError(null);
    const result = await respecTalents(user.uid);
    if (!result.success) {
      setRespecError(result.reason ?? 'Respec failed.');
    } else {
      await refetch();
    }
    setRespeccing(false);
  }

  async function handleRespecSpec(newSpec: SpecId) {
    if (!user) return;
    setSpecRespeccing(true);
    setSpecRespecError(null);
    const result = await respecSpec(user.uid, newSpec);
    if (!result.success) {
      setSpecRespecError(result.reason ?? 'Spec change failed.');
    } else {
      setConfirmingSpec(null);
      await refetch();
    }
    setSpecRespeccing(false);
  }

  return (
    <div className="talent-screen">
      <h2>Talents</h2>
      <p>One pick per row. Locked rows unlock as you level.</p>
      <button onClick={handleRespec} disabled={respeccing}>
        {respeccing ? 'Respeccing…' : `Respec (${getRespecCost(character.respecCount)} gold)`}
      </button>
      {respecError && <p className="error">{respecError}</p>}

      {otherClassSpecs.length > 0 && (
        <div className="spec-respec-section">
          <h3>Change Specialization</h3>
          <p>
            <small>
              Switching specs resets your talent tree AND unlearns every spell/ability you've trained — you'll need
              to pay the Class Trainer to learn them all back. The gold cost below grows each time you switch,
              separately from the talent respec cost above.
            </small>
          </p>
          {otherClassSpecs.map((specId) => (
            <div key={specId}>
              {confirmingSpec === specId ? (
                <>
                  <span>
                    Become {SPEC_LABELS[specId]} for {getSpecRespecCost(character.specRespecCount ?? 0)} gold? This
                    resets your talents and unlearns all your abilities.
                  </span>
                  <button onClick={() => handleRespecSpec(specId)} disabled={specRespeccing}>
                    {specRespeccing ? 'Switching…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmingSpec(null)} disabled={specRespeccing}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmingSpec(specId)}>
                  Become {SPEC_LABELS[specId]} ({getSpecRespecCost(character.specRespecCount ?? 0)} gold)
                </button>
              )}
            </div>
          ))}
          {specRespecError && <p className="error">{specRespecError}</p>}
        </div>
      )}

      <ul>
        {rows.map((row) => {
          const chosen = character.talentPicks[row.level];
          return (
            <li key={row.level}>
              <div>
                <strong>Level {row.level}</strong>
              </div>
              {(['damage', 'survival', 'support'] as TalentColumn[]).map((col) => {
                const option = row[col];
                const isChosen = chosen === col;
                return (
                  <div key={col} style={{ opacity: chosen && !isChosen ? 0.5 : 1 }}>
                    <span>
                      {COLUMN_LABELS[col]}: <strong>{option.name}</strong> — {option.description}
                    </span>
                    <button onClick={() => handlePick(row.level, col)} disabled={!!chosen}>
                      {isChosen ? 'Chosen' : 'Pick'}
                    </button>
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

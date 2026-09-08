import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { pickTalent, respecTalents } from '../firebase/character';
import { unlockedRows } from '../utils/talentEvaluator';
import type { TalentColumn } from '../gameData/talents';

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

  if (!character || !character.spec) return null;

  const rows = unlockedRows(character.spec, character.level);

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

  return (
    <div className="talent-screen">
      <h2>Talents</h2>
      <p>One pick per row. Locked rows unlock as you level.</p>
      <button onClick={handleRespec} disabled={respeccing}>
        {respeccing ? 'Respeccing…' : 'Respec (100 gold)'}
      </button>
      {respecError && <p className="error">{respecError}</p>}

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

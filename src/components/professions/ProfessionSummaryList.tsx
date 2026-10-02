import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { PROFESSION_LABELS } from '../../gameData/professionTiers';
import { professionXpForLevel } from '../../gameData/xpTables';
import { abandonProfession } from '../../firebase/professions';
import { XpBar } from '../XpBar';
import type { ProfessionId } from '../../gameData/types';

// The known-professions XP bars + Abandon buttons, filtered to one
// category's ids — shared by all three Professions sub-pages so each one
// only shows the skills it's actually about (Gathering doesn't need to
// show your Blacksmithing level).
export function ProfessionSummaryList({ professionIds }: { professionIds: ProfessionId[] }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();

  async function handleAbandon(professionId: ProfessionId) {
    if (!user) return;
    if (!confirm(`Abandon ${PROFESSION_LABELS[professionId]}? Your skill progress will be lost.`)) return;
    await abandonProfession(user.uid, professionId);
    await refetch();
  }

  if (!character) return null;

  const idSet = new Set(professionIds);
  const entries = (Object.entries(character.professions) as [ProfessionId, { level: number; xp: number; unlockedTier: string }][]).filter(
    ([id]) => idSet.has(id)
  );
  if (entries.length === 0) return null;

  return (
    <>
      <h2>Your Skill</h2>
      {entries.map(([professionId, state]) => (
        <div key={professionId} style={{ marginBottom: 8 }}>
          <XpBar
            level={state.level}
            xp={state.xp}
            curve={professionXpForLevel}
            label={`${PROFESSION_LABELS[professionId]} (${state.unlockedTier})`}
          />
          <button onClick={() => handleAbandon(professionId)}>Abandon {PROFESSION_LABELS[professionId]}</button>
        </div>
      ))}
    </>
  );
}

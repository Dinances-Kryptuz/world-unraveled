import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { PROFESSION_LABELS, maxSkillForUnlockedTier } from '../../gameData/professionTiers';
import { abandonProfession } from '../../firebase/professions';
import { StatBar } from '../StatBar';
import type { ProfessionId } from '../../gameData/types';
import type { ProfessionState } from '../../types/character';

// The known-professions skill bars + Abandon buttons, filtered to one
// category's ids — shared by all three Professions sub-pages so each one
// only shows the skills it's actually about (Gathering doesn't need to
// show your Blacksmithing level). A flat skill-vs-rank-ceiling bar, not an
// XP-curve one — every profession (gathering/crafting/fishing alike) now
// grants discrete skill-up chances rather than XP (see activityEngine.ts's
// PROFESSION_SKILLUP_CHANCE_BY_TIER), so there's no "xp toward next level"
// to show anymore.
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
  const entries = (Object.entries(character.professions) as [ProfessionId, ProfessionState][]).filter(([id]) =>
    idSet.has(id)
  );
  if (entries.length === 0) return null;

  return (
    <>
      <h2>Your Skill</h2>
      {entries.map(([professionId, state]) => (
        <div key={professionId} style={{ marginBottom: 8 }}>
          <StatBar
            label={`${PROFESSION_LABELS[professionId]} (${state.unlockedTier})`}
            current={state.level}
            max={maxSkillForUnlockedTier(state.unlockedTier)}
            color="#6b4f2a"
          />
          <button onClick={() => handleAbandon(professionId)}>Abandon {PROFESSION_LABELS[professionId]}</button>
        </div>
      ))}
    </>
  );
}

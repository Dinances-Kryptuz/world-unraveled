import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { PROFESSION_LABELS, checkLearnProfession, checkRankUp } from '../../gameData/professionTiers';
import { trainersInZone } from '../../gameData/professionTrainers';
import { learnProfession, advanceProfessionRank } from '../../firebase/professions';
import type { ProfessionId, ProfessionTierName } from '../../gameData/types';

const PROFESSION_TIER_BELOW: Record<ProfessionTierName, ProfessionTierName> = {
  apprentice: 'apprentice', // unused — apprentice is handled by the learn-profession branch below
  journeyman: 'apprentice',
  expert: 'journeyman',
  artisan: 'expert',
  master: 'artisan',
};

// The "Learn X" / "Train <rank> X" trainer list, filtered to one
// profession-category's ids (gathering/fishing/crafting — see
// gameData/professionTiers.ts's ProfessionCategory) and scoped to whichever
// zone is currently selected (trainers are genuinely per-zone: Zone 1 =
// Apprentice, Zone 2 = Journeyman, and so on — see professionTrainers.ts).
// Shared by all three Professions sub-pages instead of copy-pasted three
// times.
export function ProfessionTrainerList({ zoneId, professionIds }: { zoneId: string; professionIds: ProfessionId[] }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();

  async function handleLearn(professionId: ProfessionId) {
    if (!user) return;
    await learnProfession(user.uid, professionId);
    await refetch();
  }

  async function handleAdvance(professionId: ProfessionId) {
    if (!user) return;
    await advanceProfessionRank(user.uid, professionId);
    await refetch();
  }

  if (!character) return null;

  const idSet = new Set(professionIds);
  const entries = trainersInZone(zoneId).filter((t) => idSet.has(t.profession));
  if (entries.length === 0) return null;

  return (
    <>
      <h2>Trainers</h2>
      <ul>
        {entries.map(({ profession, rank }) => {
          const label = PROFESSION_LABELS[profession];
          const state = character.professions[profession];

          if (rank === 'apprentice') {
            if (state) return null; // already learned — nothing to do with this trainer
            const check = checkLearnProfession(profession, Object.keys(character.professions) as ProfessionId[], character.level, character.gold);
            return (
              <li key={profession}>
                Learn {label} ({check.goldCost} gold)
                <button onClick={() => handleLearn(profession)} disabled={!check.ok}>
                  Learn
                </button>
                {!check.ok && <small> — {check.reason}</small>}
              </li>
            );
          }

          if (!state || state.unlockedTier !== PROFESSION_TIER_BELOW[rank]) return null; // not relevant yet / already past
          const check = checkRankUp(profession, state.level, state.unlockedTier, character.level, character.gold);
          return (
            <li key={profession}>
              Train {rank[0].toUpperCase() + rank.slice(1)} {label} ({check.goldCost} gold)
              <button onClick={() => handleAdvance(profession)} disabled={!check.ok}>
                Train
              </button>
              {!check.ok && <small> — {check.reason}</small>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

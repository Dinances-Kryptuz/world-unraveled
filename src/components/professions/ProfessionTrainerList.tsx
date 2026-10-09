import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import {
  PROFESSION_LABELS,
  PROFESSION_TIERS,
  checkLearnProfession,
  checkRankUp,
  requiredCharacterLevelForRank,
} from '../../gameData/professionTiers';
import { TRAINER_ZONE_BY_RANK } from '../../gameData/professionTrainers';
import { ZONES } from '../../gameData/zones';
import { learnProfession, advanceProfessionRank } from '../../firebase/professions';
import type { ProfessionId, ProfessionTierName } from '../../gameData/types';
import type { Character } from '../../types/character';

const RANK_ORDER: ProfessionTierName[] = ['apprentice', 'journeyman', 'expert', 'artisan', 'master'];
const RANK_LABEL: Record<ProfessionTierName, string> = {
  apprentice: 'Apprentice',
  journeyman: 'Journeyman',
  expert: 'Expert',
  artisan: 'Artisan',
  master: 'Master',
};

function zoneName(zoneId: string): string {
  return ZONES[zoneId]?.name ?? zoneId;
}

// One profession's full 5-rank roadmap — shown regardless of which zone the
// character is standing in, same "see the whole path up front" shape as
// MountTrainerScreen (which lists all 5 mount ranks at once, not just the
// one trainable from the current zone). Each row says the character level
// AND the zone required, with a chained lockedNote exactly like Mount
// Trainer's requiredPriorMountId logic: you can't see "Requires level 35"
// for Artisan without also learning you need Expert first.
function ProfessionRoadmap({ profession, character }: { profession: ProfessionId; character: Character }) {
  const label = PROFESSION_LABELS[profession];
  const state = character.professions[profession];
  const currentRankIndex = state ? RANK_ORDER.indexOf(state.unlockedTier) : -1;

  return (
    <details>
      <summary>
        {label}
        {state ? ` — ${RANK_LABEL[state.unlockedTier]} (skill ${state.level})` : ' — not learned'}
      </summary>
      <ul>
        {RANK_ORDER.map((rank, rankIndex) => {
          const rankLabel = RANK_LABEL[rank];
          const requiredZoneId = TRAINER_ZONE_BY_RANK[rank];
          const requiredLevel = requiredCharacterLevelForRank(profession, rank);
          const goldCost = PROFESSION_TIERS.find((t) => t.tier === rank)!.goldCost;
          const inZone = character.currentZoneId === requiredZoneId;
          const owned = rankIndex <= currentRankIndex;

          if (owned) {
            return (
              <li key={rank}>
                {rankLabel} {label} — trained ({zoneName(requiredZoneId)})
              </li>
            );
          }

          const isNextRank = rankIndex === currentRankIndex + 1;
          if (!isNextRank) {
            // Not reachable yet — a later rank than the one actually next.
            const priorRankLabel = RANK_LABEL[RANK_ORDER[currentRankIndex + 1]];
            return (
              <li key={rank} style={{ opacity: 0.6 }}>
                {rankLabel} {label} ({goldCost.toLocaleString()} gold) — requires level {requiredLevel}, train at{' '}
                {zoneName(requiredZoneId)}
                <small> — train {priorRankLabel} first</small>
              </li>
            );
          }

          // This IS the next actionable rank — a real check with a real button.
          const check =
            rank === 'apprentice'
              ? checkLearnProfession(profession, Object.keys(character.professions) as ProfessionId[], character.level, character.gold)
              : checkRankUp(profession, state!.level, state!.unlockedTier, character.level, character.gold);
          const ok = check.ok && inZone;
          const reason = !check.ok ? check.reason : !inZone ? `Train this at ${zoneName(requiredZoneId)}.` : undefined;

          return (
            <ProfessionRankRow
              key={rank}
              profession={profession}
              rank={rank}
              rankLabel={rankLabel}
              label={label}
              goldCost={goldCost}
              requiredLevel={requiredLevel}
              requiredZoneId={requiredZoneId}
              ok={ok}
              reason={reason}
            />
          );
        })}
      </ul>
    </details>
  );
}

function ProfessionRankRow({
  profession,
  rank,
  rankLabel,
  label,
  goldCost,
  requiredLevel,
  requiredZoneId,
  ok,
  reason,
}: {
  profession: ProfessionId;
  rank: ProfessionTierName;
  rankLabel: string;
  label: string;
  goldCost: number;
  requiredLevel: number;
  requiredZoneId: string;
  ok: boolean;
  reason?: string;
}) {
  const { user } = useAuth();
  const { refetch } = useCharacter();

  async function handleTrain() {
    if (!user) return;
    if (rank === 'apprentice') {
      await learnProfession(user.uid, profession);
    } else {
      await advanceProfessionRank(user.uid, profession);
    }
    await refetch();
  }

  return (
    <li>
      {rank === 'apprentice' ? 'Learn' : `Train ${rankLabel}`} {label} ({goldCost.toLocaleString()} gold) — requires
      level {requiredLevel}, train at {zoneName(requiredZoneId)}
      <button onClick={handleTrain} disabled={!ok}>
        {rank === 'apprentice' ? 'Learn' : 'Train'}
      </button>
      {!ok && reason && <small> — {reason}</small>}
    </li>
  );
}

// The full trainer roadmap for every profession in `professionIds` —
// visible from any zone (travel to the listed zone to actually train),
// same posture as MountTrainerScreen. Shared by the Professions Trainer
// screen instead of copy-pasted.
export function ProfessionTrainerList({ professionIds }: { professionIds: ProfessionId[] }) {
  const { character } = useCharacter();
  if (!character) return null;

  return (
    <>
      <h2>Trainers</h2>
      <p>
        <small>Shown for every zone — travel to the listed zone to actually train.</small>
      </p>
      {professionIds.map((profession) => (
        <ProfessionRoadmap key={profession} profession={profession} character={character} />
      ))}
    </>
  );
}

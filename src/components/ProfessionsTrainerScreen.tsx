import { ProfessionTrainerList } from './professions/ProfessionTrainerList';
import { ALL_PROFESSION_IDS } from '../gameData/professionTiers';

// All profession trainers in one place, instead of each one living at the
// bottom of its own profession's page (see ProfessionScreen.tsx) — still
// scoped to whatever zone the character is currently standing in, same as
// before (professions are genuinely zone-gated: Zone 1 = Apprentice, Zone 2
// = Journeyman, and so on — see gameData/professionTrainers.ts).
export function ProfessionsTrainerScreen({ zoneId }: { zoneId: string }) {
  return (
    <div className="professions-trainer-screen">
      <h2>Professions Trainer</h2>
      <ProfessionTrainerList zoneId={zoneId} professionIds={ALL_PROFESSION_IDS} />
    </div>
  );
}

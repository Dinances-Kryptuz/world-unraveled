import { ProfessionTrainerList } from './professions/ProfessionTrainerList';
import { ALL_PROFESSION_IDS } from '../gameData/professionTiers';

// All profession trainers in one place, instead of each one living at the
// bottom of its own profession's page (see ProfessionScreen.tsx) — shows
// every profession's full rank roadmap regardless of which zone the
// character is currently standing in, same "see the whole path" shape as
// MountTrainerScreen (professions are still genuinely zone-gated to train:
// Zone 1 = Apprentice, Zone 2 = Journeyman, and so on — see
// gameData/professionTrainers.ts — just no longer hidden from view).
export function ProfessionsTrainerScreen() {
  return (
    <div className="professions-trainer-screen">
      <h2>Professions Trainer</h2>
      <ProfessionTrainerList professionIds={ALL_PROFESSION_IDS} />
    </div>
  );
}

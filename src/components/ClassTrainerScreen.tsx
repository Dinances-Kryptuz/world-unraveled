import { useState } from 'react';
import { useCharacter } from '../hooks/useCharacter';
import { SpellTrainerScreen } from './SpellTrainerScreen';
import { TalentScreen } from './TalentScreen';
import { CombatSetupScreen } from './CombatSetupScreen';

type ClassTrainerTab = 'spells' | 'talents' | 'combat';

const TAB_LABELS: Record<ClassTrainerTab, string> = {
  spells: 'Spells & Abilities',
  talents: 'Talents',
  combat: 'Combat Set Up',
};

// One Class Trainer entry point for everything tied to how the character
// fights — Spells & Abilities (the gold-for-training gate, see
// SpellTrainerScreen), Talents (relocated from its own sidebar slot), and
// Combat Set Up (relocated from Settings, see SettingsScreen's doc comment
// for why it used to live there). A <select> dropdown rather than a tab bar
// per the design ask ("click Class Trainer and it brings a drop down menu
// that has...").
export function ClassTrainerScreen({ zoneId }: { zoneId: string }) {
  const { character } = useCharacter();
  const [tab, setTab] = useState<ClassTrainerTab>('spells');

  if (!character) return null;

  const showTalents = !!character.spec;
  const effectiveTab = tab === 'talents' && !showTalents ? 'spells' : tab;

  return (
    <div className="class-trainer-screen">
      <h2>Class Trainer</h2>
      <label>
        <select value={effectiveTab} onChange={(e) => setTab(e.target.value as ClassTrainerTab)}>
          <option value="spells">{TAB_LABELS.spells}</option>
          {showTalents && <option value="talents">{TAB_LABELS.talents}</option>}
          <option value="combat">{TAB_LABELS.combat}</option>
        </select>
      </label>

      {effectiveTab === 'spells' && <SpellTrainerScreen zoneId={zoneId} />}
      {effectiveTab === 'talents' && showTalents && <TalentScreen />}
      {effectiveTab === 'combat' && <CombatSetupScreen />}
    </div>
  );
}

import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { chooseSpec } from '../firebase/character';
import { SPECS, type SpecId } from '../gameData/classStats';
import { SPEC_INFO, SPEC_ICONS } from '../gameData/classInfo';
import { PreGameShell } from './PreGameShell';

export function SpecSelectionScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();

  if (!character) return null;

  const availableSpecs = (Object.keys(SPECS) as SpecId[]).filter(
    (id) => SPECS[id].class === character.class
  );

  async function handleChoose(spec: SpecId) {
    if (!user) return;
    await chooseSpec(user.uid, spec);
    await refetch();
  }

  return (
    <PreGameShell zoneId={character.currentZoneId}>
      <div className="spec-selection">
        <h1>Choose Your Path</h1>
        <p>You've reached level 5 — time to specialize.</p>
        <div className="spec-card-grid">
          {availableSpecs.map((specId) => {
            const info = SPEC_INFO[specId];
            return (
              <div key={specId} className="spec-card">
                <div className="spec-card-icon">{SPEC_ICONS[specId]}</div>
                <strong className="spec-card-name">{info.label}</strong>
                <p className="spec-card-blurb">{info.blurb}</p>
                <button onClick={() => handleChoose(specId)}>Choose</button>
              </div>
            );
          })}
        </div>
      </div>
    </PreGameShell>
  );
}

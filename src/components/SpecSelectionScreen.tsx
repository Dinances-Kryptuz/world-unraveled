import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { chooseSpec } from '../firebase/character';
import { SPECS, type SpecId } from '../gameData/classStats';

const SPEC_INFO: Record<SpecId, { label: string; blurb: string }> = {
  warrior_dps: { label: 'Melee DPS', blurb: 'Highest sustained damage. Fast kills, moderate durability.' },
  warrior_tank: { label: 'Tank', blurb: 'Slower kills, but the safest spec in the game.' },
  shadow_priest: { label: 'Shadow', blurb: 'Ranged damage with self-sustain from the damage you deal.' },
  holy_priest: { label: 'Holy', blurb: 'The best pure healer. Low damage, extremely hard to kill.' },
  prot_paladin: { label: 'Protection', blurb: 'A hybrid tank — less durable than a Warrior Tank, but hits harder.' },
  holy_paladin: { label: 'Holy', blurb: 'A battle healer — more durable and offensive than Holy Priest.' },
};

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
    <div className="spec-selection">
      <h1>Choose Your Path</h1>
      <p>You've reached level 5 — time to specialize.</p>
      <ul>
        {availableSpecs.map((specId) => {
          const info = SPEC_INFO[specId];
          return (
            <li key={specId}>
              <div>
                <strong>{info.label}</strong> — {info.blurb}
              </div>
              <button onClick={() => handleChoose(specId)}>Choose</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

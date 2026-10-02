import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { startActivity } from '../../firebase/character';
import { ZONES, FISHING_HOLES } from '../../gameData/zones';
import { ITEMS } from '../../gameData/items';
import { ProfessionTrainerList } from './ProfessionTrainerList';
import { ProfessionSummaryList } from './ProfessionSummaryList';
import type { ProfessionId } from '../../gameData/types';

const FISHING_PROFESSION_IDS: ProfessionId[] = ['fishing'];

// One of the three Professions sub-pages (see Sidebar.tsx) — shows the
// CURRENT zone's fishing hole only, same "based on the zone you're in" rule
// as Gathering.
export function FishingProfessionsScreen({ zoneId }: { zoneId: string }) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const zone = ZONES[zoneId];

  async function handleFish(holeId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'fishing', targetId: holeId, zoneId: zone.id });
    await refetch();
  }

  if (!character) return null;

  const knowsFishing = !!character.professions.fishing;

  return (
    <div className="zone-screen">
      <h2>Fishing — {zone.name}</h2>
      <ul>
        {zone.fishingHoleIds.map((holeId) => {
          const hole = FISHING_HOLES[holeId];
          if (!knowsFishing) {
            return (
              <li key={holeId} style={{ opacity: 0.6 }}>
                {hole.name} (Fishing) — learn Fishing below to fish here.
              </li>
            );
          }
          const equippedTool = character.equipment.tool ? ITEMS[character.equipment.tool] : null;
          const hasRod = equippedTool?.toolType === 'fishing_rod';
          return (
            <li key={holeId}>
              {hole.name} — yields {hole.lootTable.map((d) => ITEMS[d.itemId]?.name ?? d.itemId).join(', ')}
              <button onClick={() => handleFish(holeId)} disabled={!hasRod}>
                {hasRod ? 'Fish' : 'Need Fishing Rod equipped'}
              </button>
            </li>
          );
        })}
        {zone.fishingHoleIds.length === 0 && <p>No fishing holes in this zone.</p>}
      </ul>

      <ProfessionTrainerList zoneId={zoneId} professionIds={FISHING_PROFESSION_IDS} />
      <ProfessionSummaryList professionIds={FISHING_PROFESSION_IDS} />
    </div>
  );
}

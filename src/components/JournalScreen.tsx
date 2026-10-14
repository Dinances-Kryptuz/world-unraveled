import { useCharacter } from '../hooks/useCharacter';
import { ZONES, ZONE_TIER, GATHER_NODES, FISHING_HOLES } from '../gameData/zones';
import { MONSTERS } from '../gameData/monsters';
import { ITEMS } from '../gameData/items';
import { getMonsterIcon } from '../gameData/monsterIcons';
import { COMBAT_TYPE_ICONS, COMBAT_TYPE_LABELS } from '../gameData/combatTriangle';
import { ItemSlot } from './ItemSlot';

const ZONE_IDS_IN_ORDER = Object.keys(ZONES).sort((a, b) => (ZONE_TIER[a] ?? 0) - (ZONE_TIER[b] ?? 0));

// One zone's revealed content — resources (every gather node + fishing hole
// that yields an item) and creatures (every monster) — only ever rendered
// for an already-discovered zone (see JournalScreen below); an undiscovered
// zone's own gatherNodeIds/monsterIds never reach this component at all, so
// there's no risk of accidentally leaking spoiler content through it.
function ZoneJournalEntry({ zoneId }: { zoneId: string }) {
  const zone = ZONES[zoneId];
  const resourceRows = [
    ...zone.gatherNodeIds.map((id) => GATHER_NODES[id]).filter((n): n is NonNullable<typeof n> => !!n),
    ...zone.fishingHoleIds.map((id) => FISHING_HOLES[id]).filter((n): n is NonNullable<typeof n> => !!n),
  ];
  const creatureRows = zone.monsterIds.map((id) => MONSTERS[id]).filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <details className="journal-zone-entry" open>
      <summary className="journal-zone-name">{zone.name}</summary>
      <div className="journal-zone-body">
        <h4>Resources</h4>
        {resourceRows.length === 0 ? (
          <p className="journal-empty">No gatherable resources here.</p>
        ) : (
          <ul className="journal-list">
            {resourceRows.map((node) => {
              const item = ITEMS[node.itemId];
              return (
                <li key={node.id} className="journal-row">
                  {item && <ItemSlot item={item} />}
                  <span>{node.name}</span>
                </li>
              );
            })}
          </ul>
        )}

        <h4>Creatures</h4>
        {creatureRows.length === 0 ? (
          <p className="journal-empty">No creatures recorded here.</p>
        ) : (
          <ul className="journal-list">
            {creatureRows.map((monster) => (
              <li key={monster.id} className="journal-row">
                <span className="journal-monster-icon">{getMonsterIcon(monster.id)}</span>
                <span>
                  {monster.name} — Lv {monster.levelRange[0]}–{monster.levelRange[1]}{' '}
                  <span title={COMBAT_TYPE_LABELS[monster.combatType]}>{COMBAT_TYPE_ICONS[monster.combatType]}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

// A zone not yet discovered shows only its name, locked — entering it for
// the first time (see firebase/character.ts's getCharacter, which backfills
// Character.discoveredZoneIds the moment currentZoneId resolves to a new
// zone) is what reveals its resources/creatures here, same "the game
// resolves it for you" discovery posture as the rest of this codebase's
// lazy backfills.
function LockedZoneEntry() {
  return (
    <div className="journal-zone-entry journal-zone-locked">
      <div className="journal-zone-name">
        🔒 <span>???</span>
      </div>
      <p className="journal-empty">Not yet discovered — travel here to fill in this page.</p>
    </div>
  );
}

// A reference log of every zone's resources and creatures, filled in as the
// player actually visits each one — the "Journal" the user asked for,
// living between Professions Trainer and Characters in the sidebar (see
// Sidebar.tsx).
export function JournalScreen() {
  const { character } = useCharacter();
  if (!character) return null;
  const discovered = new Set(character.discoveredZoneIds);

  return (
    <div className="journal-screen">
      <h2>Journal</h2>
      <p>
        <small>
          {discovered.size} / {ZONE_IDS_IN_ORDER.length} zones discovered
        </small>
      </p>
      {ZONE_IDS_IN_ORDER.map((zoneId) =>
        discovered.has(zoneId) ? <ZoneJournalEntry key={zoneId} zoneId={zoneId} /> : <LockedZoneEntry key={zoneId} />
      )}
    </div>
  );
}

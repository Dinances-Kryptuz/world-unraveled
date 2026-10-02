import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity, stopActivity } from '../firebase/character';
import { ZONES } from '../gameData/zones';
import { ZoneBanner } from './ZoneBanner';
import { MONSTERS } from '../gameData/monsters';
import { DUNGEONS } from '../gameData/dungeons';
import { MAX_ACTIVE_COMPANIONS, REQUIRED_DUNGEON_PARTY_SIZE } from '../gameData/companions';
import { resolveSpecDef } from '../gameData/combatProfileWithTalents';
import { MonsterLootPanel } from './MonsterLootPanel';
import { MonsterLevelBadge, CombatTypeBadge } from './MonsterLevelBadge';
import { COMBAT_TYPE_ICONS, COMBAT_TYPE_LABELS } from '../gameData/combatTriangle';

// The Adventure page: explore the current zone (picked in TopBar, visible
// from every page — see App.tsx), fight its monsters, and enter its
// dungeon. Gathering/Fishing/Crafting and their trainers moved to their own
// Professions sidebar sections (see components/professions/) — this screen
// used to show all of that stacked underneath the monster list too.
export function ZoneScreen({
  selectedZoneId,
  onEnterDungeon,
}: {
  selectedZoneId: string;
  onEnterDungeon: (dungeonId: string) => void;
}) {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [expandedMonsterId, setExpandedMonsterId] = useState<string | null>(null);
  const zone = ZONES[selectedZoneId];

  async function handleFight(monsterId: string) {
    if (!user) return;
    await startActivity(user.uid, { type: 'combat', targetId: monsterId, zoneId: zone.id });
    await refetch();
  }

  // Dungeons are deliberately not written to currentActivity (see
  // DungeonScreen's own doc comment) — entering one just clears whatever
  // regular activity was running so it doesn't keep "elapsing" underneath
  // the run; App.tsx's activeDungeonId state decides which screen renders.
  async function handleEnterDungeon(dungeonId: string) {
    if (!user) return;
    await stopActivity(user.uid);
    await refetch();
    onEnterDungeon(dungeonId);
  }

  if (!character) return null;

  const playerCombatType = resolveSpecDef(character.class, character.spec).combatType;

  return (
    <div className="zone-screen">
      <ZoneBanner zoneId={zone.id} />
      <p>
        <small>
          Enemy composition:{' '}
          {(['melee', 'ranged', 'magic'] as const)
            .map((t) => ({ t, count: zone.monsterIds.filter((id) => MONSTERS[id].combatType === t).length }))
            .filter(({ count }) => count > 0)
            .map(({ t, count }) => `${COMBAT_TYPE_ICONS[t]} ${COMBAT_TYPE_LABELS[t]} (${count})`)
            .join(' · ')}
        </small>
      </p>

      <h2>Monsters</h2>
      <ul>
        {zone.monsterIds.map((monsterId) => {
          const monster = MONSTERS[monsterId];
          const isExpanded = expandedMonsterId === monsterId;
          return (
            <li key={monsterId}>
              {monster.name} (<MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} />{' '}
              <CombatTypeBadge monsterType={monster.combatType} playerType={playerCombatType} />)
              <button onClick={() => handleFight(monsterId)}>Fight</button>
              <button onClick={() => setExpandedMonsterId(isExpanded ? null : monsterId)}>Drops</button>
              {isExpanded && <MonsterLootPanel monster={monster} />}
            </li>
          );
        })}
      </ul>

      {Object.values(DUNGEONS)
        .filter((d) => d.zoneId === zone.id)
        .map((dungeon) => {
          const partySize = character.activeCompanionIds.length + 1;
          const readyForDungeon = character.activeCompanionIds.length === MAX_ACTIVE_COMPANIONS;
          return (
            <div key={dungeon.id}>
              <h2>Dungeons</h2>
              <ul>
                <li>
                  <div>
                    <strong>{dungeon.name}</strong> (Lv {dungeon.levelRange[0]}–{dungeon.levelRange[1]}) —{' '}
                    {dungeon.description}
                    <br />
                    <small>{dungeon.stages.length} stages, ending in a boss</small>
                    <br />
                    <small>
                      Requires a full party of {REQUIRED_DUNGEON_PARTY_SIZE} — you have {partySize}/
                      {REQUIRED_DUNGEON_PARTY_SIZE} (see Companions below to recruit and add more)
                    </small>
                  </div>
                  <button onClick={() => handleEnterDungeon(dungeon.id)} disabled={!readyForDungeon}>
                    Enter
                  </button>
                </li>
              </ul>
            </div>
          );
        })}
    </div>
  );
}

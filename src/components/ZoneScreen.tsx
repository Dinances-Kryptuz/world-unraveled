import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startActivity, stopActivity } from '../firebase/character';
import { payDungeonCompanionFee } from '../firebase/companions';
import { ZONES } from '../gameData/zones';
import { ZoneBanner } from './ZoneBanner';
import { MONSTERS } from '../gameData/monsters';
import { DUNGEONS } from '../gameData/dungeons';
import { MAX_ACTIVE_COMPANIONS, REQUIRED_DUNGEON_PARTY_SIZE, dungeonCompanionFee } from '../gameData/companions';
import { ZONE_TIER } from '../gameData/zones';
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
  const [feeError, setFeeError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
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
  // The companion wage (see gameData/companions.ts's dungeonCompanionFee) is
  // charged here, up front, before the run starts — failing to pay blocks
  // entry entirely rather than letting the party in for free.
  async function handleEnterDungeon(dungeonId: string) {
    if (!user) return;
    setFeeError(null);
    setEntering(true);
    try {
      const feeResult = await payDungeonCompanionFee(user.uid, dungeonId);
      if (!feeResult.success) {
        setFeeError(feeResult.reason ?? 'Could not pay your party.');
        return;
      }
      await stopActivity(user.uid);
      await refetch();
      onEnterDungeon(dungeonId);
    } finally {
      setEntering(false);
    }
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
          const fee = dungeonCompanionFee(ZONE_TIER[dungeon.zoneId] ?? 1, character.activeCompanionIds.length);
          const canAffordFee = character.gold >= fee;
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
                    <br />
                    <small>Your party charges {fee} gold up front for this run (you have {Math.floor(character.gold)}).</small>
                  </div>
                  <button onClick={() => handleEnterDungeon(dungeon.id)} disabled={!readyForDungeon || !canAffordFee || entering}>
                    {entering ? 'Entering…' : 'Enter'}
                  </button>
                  {readyForDungeon && !canAffordFee && <p className="error">Need {fee} gold to pay your party first.</p>}
                  {feeError && <p className="error">{feeError}</p>}
                </li>
              </ul>
            </div>
          );
        })}
    </div>
  );
}

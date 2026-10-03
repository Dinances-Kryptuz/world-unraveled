import { getMonsterIcon } from '../gameData/monsterIcons';

// A large framed icon shown above a fight's HP bar — same "no real art
// pipeline, emoji stands in" approach as ItemSlot, just sized up and given
// its own frame so a fight reads as "you're facing THIS creature" instead
// of just a name and a bar. isBoss gets a heavier, gold-accented frame.
export function MonsterPortrait({ monsterId, isBoss }: { monsterId: string; isBoss?: boolean }) {
  return (
    <div className={`monster-portrait${isBoss ? ' monster-portrait-boss' : ''}`}>
      <span>{getMonsterIcon(monsterId)}</span>
    </div>
  );
}

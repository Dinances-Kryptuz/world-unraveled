import { useState } from 'react';
import { getMonsterIcon } from '../gameData/monsterIcons';
import { COMBAT_TYPE_LABELS } from '../gameData/combatTriangle';
import type { Monster } from '../gameData/types';

// Resolves to /monster-art/{monsterId}.<ext> by convention — same approach
// as ItemSlot.tsx's ItemIcon (tries .webp then .png, falls back to the
// emoji glyph), just sized to fill the round portrait frame via object-fit:
// cover instead of sitting inset like an item tile. See
// public/monster-art/README.md for the art spec.
const ART_EXTENSIONS = ['webp', 'png'];

function MonsterArt({ monsterId }: { monsterId: string }) {
  const [extIndex, setExtIndex] = useState(0);
  if (extIndex >= ART_EXTENSIONS.length) {
    return <span>{getMonsterIcon(monsterId)}</span>;
  }
  return (
    <img
      className="monster-portrait-img"
      src={`/monster-art/${monsterId}.${ART_EXTENSIONS[extIndex]}`}
      alt=""
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}

// A large framed icon shown above a fight's HP bar — same "no real art
// pipeline, emoji stands in" approach as ItemSlot, just sized up and given
// its own frame so a fight reads as "you're facing THIS creature" instead
// of just a name and a bar. isBoss gets a heavier, gold-accented frame.
export function MonsterPortrait({ monsterId, isBoss }: { monsterId: string; isBoss?: boolean }) {
  return (
    <div className={`monster-portrait${isBoss ? ' monster-portrait-boss' : ''}`}>
      {/* key={monsterId} forces a fresh mount (and a fresh .webp attempt)
          when the fight moves to a different monster — CombatScreen/
          DungeonScreen keep this component mounted across a multi-wave
          fight rather than unmounting it, so without this the extension
          fallback state from the PREVIOUS monster would carry over. */}
      <MonsterArt key={monsterId} monsterId={monsterId} />
    </div>
  );
}

function MonsterSlotIcon({ monsterId }: { monsterId: string }) {
  const [extIndex, setExtIndex] = useState(0);
  if (extIndex >= ART_EXTENSIONS.length) {
    return <span className="item-slot-icon">{getMonsterIcon(monsterId)}</span>;
  }
  return (
    <img
      className="item-slot-icon item-slot-icon-img"
      src={`/monster-art/${monsterId}.${ART_EXTENSIONS[extIndex]}`}
      alt=""
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}

// The Journal's small grid tile for a discovered creature — same
// icon-only-tile-plus-hover-tooltip shape as ItemSlot (reusing its exact
// .item-slot/.item-tooltip CSS, since a monster tile has nothing an item
// tile doesn't: one icon, one tooltip), rather than MonsterPortrait's big
// round combat frame.
export function MonsterSlot({ monster }: { monster: Monster }) {
  return (
    <div className="item-slot">
      <MonsterSlotIcon key={monster.id} monsterId={monster.id} />
      <div className="item-tooltip">
        <div className="item-tooltip-name">{monster.name}</div>
        <div className="item-tooltip-meta">
          Lv {monster.levelRange[0]}–{monster.levelRange[1]} · {COMBAT_TYPE_LABELS[monster.combatType]}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ITEMS } from '../gameData/items';
import { ItemSlot } from './ItemSlot';
import type { Character } from '../types/character';

function formatRemaining(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Every active potion/food buff (Character.activeBuffs), always visible —
// the one thing missing that made a just-eaten 10-minute food buff
// impossible to tell apart from "did nothing": there was no indication
// anywhere of what was active or how much longer it had. Duration-based
// buffs (stat potions, Well Fed food) count down to 0:00; charge-based ones
// (offensive/defensive potions) show charges left instead, consistent with
// gameData/buffs.ts's isBuffActive split.
export function ActiveBuffsBar({ character }: { character: Character }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const entries = Object.values(character.activeBuffs).filter(
    (buff): buff is NonNullable<typeof buff> => {
      if (!buff) return false;
      if (buff.charges !== undefined) return buff.charges > 0;
      if (buff.expiresAt !== undefined) return buff.expiresAt.getTime() > now;
      return true;
    }
  );

  if (entries.length === 0) return null;

  return (
    <div className="active-buffs-bar">
      {entries.map((buff) => {
        const item = ITEMS[buff.itemId];
        if (!item) return null;
        const remainingLabel =
          buff.charges !== undefined
            ? `${buff.charges} charge${buff.charges === 1 ? '' : 's'}`
            : buff.expiresAt !== undefined
              ? formatRemaining((buff.expiresAt.getTime() - now) / 1000)
              : null;
        return (
          <div key={buff.itemId} className="active-buff-entry">
            <ItemSlot item={item} />
            {remainingLabel && <small>{remainingLabel}</small>}
          </div>
        );
      })}
    </div>
  );
}

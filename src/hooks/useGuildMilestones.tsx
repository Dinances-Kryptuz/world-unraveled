import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useCharacter } from './useCharacter';
import { getGuild } from '../firebase/guilds';
import { guildXpProgress, roomBonusPct } from '../gameData/guildHeadquarters';
import { guildMilestoneBonuses, type GuildMilestoneBonuses } from '../gameData/guildMilestones';

const ZERO_BONUSES: GuildMilestoneBonuses = {
  mountSpeedPct: 0,
  gatheringTimePct: 0,
  craftingTimePct: 0,
  gatheringMasteryPct: 0,
  craftingMasteryPct: 0,
  materialPreservePct: 0,
};

const GuildMilestoneContext = createContext<GuildMilestoneBonuses>(ZERO_BONUSES);

// One guild-doc read per guildId change (not per render, not polled) — a
// guild's level only moves at contract/expedition turn-ins, so "current as
// of the last time this character's guild membership changed or the app
// reloaded" is accurate enough, same lazy-refresh posture already used for
// guildMembers' own point-in-time snapshot (see firebase/guilds.ts). Every
// consumer (TopBar's mount-speed math, Gathering/Fishing/CraftingScreen's
// time/Mastery math) reads from this one shared value instead of each
// doing its own guild fetch.
export function GuildMilestoneProvider({ children }: { children: ReactNode }) {
  const { character } = useCharacter();
  const guildId = character?.guildId;
  const [bonuses, setBonuses] = useState<GuildMilestoneBonuses>(ZERO_BONUSES);

  useEffect(() => {
    if (!guildId) {
      setBonuses(ZERO_BONUSES);
      return;
    }
    let cancelled = false;
    getGuild(guildId).then((guild) => {
      if (cancelled) return;
      if (!guild) {
        setBonuses(ZERO_BONUSES);
        return;
      }
      // Headquarters' Storehouse/Workshop room bonuses stack additively
      // into the same gatheringTimePct/craftingTimePct/materialPreservePct
      // channels a guild's level milestones already use — see
      // guildMilestones.ts's own comment on why these 3 fields (and only
      // these 3) double as the room-bonus landing spot.
      const milestoneBonuses = guildMilestoneBonuses(guildXpProgress(guild.xp).level);
      setBonuses({
        ...milestoneBonuses,
        gatheringTimePct: milestoneBonuses.gatheringTimePct + roomBonusPct('storehouse', guild.rooms.storehouse ?? 0),
        materialPreservePct: milestoneBonuses.materialPreservePct + roomBonusPct('workshop', guild.rooms.workshop ?? 0),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  return <GuildMilestoneContext.Provider value={bonuses}>{children}</GuildMilestoneContext.Provider>;
}

export function useGuildMilestoneBonuses(): GuildMilestoneBonuses {
  return useContext(GuildMilestoneContext);
}

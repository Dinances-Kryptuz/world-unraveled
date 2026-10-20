import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useCharacter } from './useCharacter';
import { getGuild } from '../firebase/guilds';
import { guildXpProgress } from '../gameData/guildHeadquarters';
import { guildMilestoneBonuses, type GuildMilestoneBonuses } from '../gameData/guildMilestones';

const ZERO_BONUSES: GuildMilestoneBonuses = {
  mountSpeedPct: 0,
  gatheringTimePct: 0,
  craftingTimePct: 0,
  gatheringMasteryPct: 0,
  craftingMasteryPct: 0,
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
      setBonuses(guild ? guildMilestoneBonuses(guildXpProgress(guild.xp).level) : ZERO_BONUSES);
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

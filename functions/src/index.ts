import { initializeApp } from 'firebase-admin/app';

initializeApp();

export {
  createGuild,
  joinGuild,
  leaveGuild,
  kickGuildMember,
  setGuildMemberRole,
  refreshGuildMemberProfile,
  inviteToGuild,
  acceptGuildInvite,
  declineGuildInvite,
  claimCompanionContributionsToGuild,
} from './guilds';

export {
  getOrCreateGuildWeek,
  contributeMaterial,
  reportHuntingKills,
  claimContractReward,
  claimCompanionContributions,
} from './contracts';

export { startExpedition, claimExpedition } from './expeditions';

export { donateGoldToGuild, upgradeGuildRoom, completeRestorationProject } from './guildHeadquarters';

export { onGuildMemberWritten, backfillGuildRoster } from './guildRoster';

export { refreshGuildDiscoveryCache } from './guildDiscoveryCache';

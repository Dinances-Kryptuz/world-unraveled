import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Rebuilds a single cached "top guilds" doc from guildPublicSummaries every
// 10 minutes, so browseGuilds() — hit by every non-guilded player who opens
// Guild Hall — costs 1 read instead of an up-to-20-doc collection query
// every single time. Guild discovery doesn't need second-by-second
// freshness, so the 10-minute staleness is a deliberate, cheap trade.
// Requires Cloud Scheduler, which (like Cloud Functions itself) needs the
// Blaze plan.

const db = getFirestore();
const DISCOVERY_PAGE_SIZE = 20;

export const refreshGuildDiscoveryCache = onSchedule('every 10 minutes', async () => {
  const snap = await db.collection('guildPublicSummaries').orderBy('memberCount', 'desc').limit(DISCOVERY_PAGE_SIZE).get();
  const guilds = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      tag: data.tag ?? null,
      memberCount: data.memberCount ?? 0,
      level: data.level ?? 1,
    };
  });
  await db.collection('guildDiscoveryCache').doc('top').set({ guilds, updatedAt: Timestamp.now() });
});

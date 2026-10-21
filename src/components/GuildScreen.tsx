import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import {
  createGuild,
  joinGuild,
  leaveGuild,
  kickGuildMember,
  setGuildMemberRole,
  refreshGuildMemberProfile,
  getGuild,
  listGuildMembers,
  browseGuilds,
  backfillGuildRoster,
  inviteToGuild,
  acceptGuildInvite,
  declineGuildInvite,
  claimCompanionContributionsToGuild,
} from '../firebase/guilds';
import { MAX_GUILD_MEMBERS, MAX_OFFICERS, roleLabel, type GuildDetails, type GuildMemberRow, type GuildPublicSummary } from '../gameData/guilds';
import { CLASS_LABELS, SPEC_LABELS, type ClassId, type SpecId } from '../gameData/classStats';
import { COMPANIONS } from '../gameData/companions';
import { PROFESSION_LABELS } from '../gameData/professionTiers';
import { getTitle } from '../gameData/titles';
import type { CompanionState } from '../types/character';
import { ClassColoredName } from './ClassColoredName';
import {
  getOrCreateGuildWeek,
  contributeMaterial,
  reportHuntingKills,
  claimContractReward,
  claimCompanionContributions,
} from '../firebase/guildContracts';
import {
  contractCategoryLabel,
  myShareOfContract,
  currentHuntingKills,
  HUNTING_KILLS_PER_CALL_MAX,
  MAX_MOMENTUM,
  type GuildWeek,
} from '../gameData/guildContracts';
import { subscribeToInventory } from '../firebase/inventory';
import type { Inventory } from '../types/character';
import { donateGoldToGuild, upgradeGuildRoom } from '../firebase/guildHeadquarters';
import { GUILD_MILESTONES } from '../gameData/guildMilestones';
import {
  ROOM_IDS,
  ROOM_LABELS,
  ROOM_BONUS_LABEL,
  ROOM_MAX_LEVEL,
  roomBonusPct,
  roomUpgradeCost,
  guildXpProgress,
  headquartersTierForLevel,
  HEADQUARTERS_TIER_NAMES,
  type RoomId,
} from '../gameData/guildHeadquarters';
import { ITEMS } from '../gameData/items';

function CreateOrBrowseGuild({ onChanged }: { onChanged: () => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guilds, setGuilds] = useState<GuildPublicSummary[] | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    browseGuilds()
      .then(setGuilds)
      .catch(() => setGuilds([]));
  }, []);

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      await createGuild(name.trim(), tag.trim());
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guild.');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(guildId: string) {
    setError(null);
    setJoiningId(guildId);
    try {
      await joinGuild(guildId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join guild.');
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="guild-screen">
      <div className="guild-panel">
        <h3>Found a Guild</h3>
        <div className="guild-create-form">
          <input
            type="text"
            placeholder="Guild name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tag (optional, 2-5 letters)"
            value={tag}
            maxLength={5}
            onChange={(e) => setTag(e.target.value)}
          />
          <button onClick={handleCreate} disabled={creating || name.trim().length < 3}>
            {creating ? 'Founding…' : 'Found Guild'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="guild-panel">
        <h3>Browse Guilds</h3>
        {guilds === null && <p>Loading…</p>}
        {guilds !== null && guilds.length === 0 && <p className="guild-empty">No guilds have been founded yet.</p>}
        {guilds !== null && guilds.length > 0 && (
          <ul className="guild-browse-list">
            {guilds.map((g) => (
              <li key={g.id} className="guild-browse-row">
                <span className="guild-browse-name">
                  {g.name}
                  {g.tag && <span className="guild-tag"> [{g.tag}]</span>}
                </span>
                <span className="guild-browse-meta">
                  Lv {g.level} · {g.memberCount}/{MAX_GUILD_MEMBERS} members
                </span>
                <button
                  onClick={() => handleJoin(g.id)}
                  disabled={joiningId === g.id || g.memberCount >= MAX_GUILD_MEMBERS}
                >
                  {g.memberCount >= MAX_GUILD_MEMBERS ? 'Full' : joiningId === g.id ? 'Joining…' : 'Join'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContractRowView({
  contract,
  index,
  guildId,
  weekId,
  myUid,
  heldAmount,
  onChanged,
}: {
  contract: GuildWeek['contracts'][number];
  index: number;
  guildId: string;
  weekId: string;
  myUid: string;
  // How many of contract.materialId the player currently holds (0 for a
  // Hunting contract, which has no materialId) — read from the live
  // inventory subscription in ContractsPanel, so "how many to turn in" is
  // always grounded in what's actually in the bag rather than a free-typed
  // number the server would've silently clamped anyway.
  heldAmount: number;
  onChanged: () => void;
}) {
  const { character, refetch } = useCharacter();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.min(100, Math.round((contract.progress / contract.requirement) * 100));
  const complete = contract.completedAt !== null;
  const myShare = myShareOfContract(contract, myUid);
  const alreadyClaimed = !!contract.claims[myUid];
  const remaining = contract.requirement - contract.progress;
  const maxContribution = Math.max(0, Math.min(heldAmount, remaining));

  async function handleContribute(n: number) {
    if (!(n > 0)) return;
    setError(null);
    setBusy(true);
    try {
      await contributeMaterial(guildId, weekId, index, n);
      setAmount('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to contribute.');
    } finally {
      setBusy(false);
    }
  }

  // Real client-tracked kill count since the contract's ISO week opened
  // (Character.huntingKillTally, bumped by advanceQuests on every combat
  // kill) minus whatever's already been reported to THIS contract
  // (contract.playerContributions[myUid], the server's own authoritative
  // record) — so "Report Kills" always submits exactly the newly-earned
  // kills, never re-submits ones already credited, and never needs a
  // manually typed number at all.
  const trackedKills = character ? currentHuntingKills(character.huntingKillTally, new Date()) : 0;
  const alreadyReportedKills = contract.playerContributions[myUid] ?? 0;
  const killsToReport = Math.max(0, Math.min(trackedKills - alreadyReportedKills, remaining, HUNTING_KILLS_PER_CALL_MAX));

  async function handleReportKills() {
    if (!(killsToReport > 0)) return;
    setError(null);
    setBusy(true);
    try {
      await reportHuntingKills(guildId, weekId, index, killsToReport);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report kills.');
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim() {
    setError(null);
    setBusy(true);
    try {
      await claimContractReward(guildId, weekId, index);
      onChanged();
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim reward.');
    } finally {
      setBusy(false);
    }
  }

  const materialName = contract.materialId ? ITEMS[contract.materialId]?.name ?? contract.materialId : null;

  return (
    <li className="guild-contract-row">
      <div className="guild-contract-header">
        <span className="guild-contract-category">{contractCategoryLabel(contract.category)}</span>
        <span className="guild-contract-label">{contract.label}</span>
      </div>
      <div className="guild-contract-bar-track">
        <div className="guild-contract-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="guild-contract-meta">
        {contract.progress} / {contract.requirement} {complete ? '— Complete!' : `(${pct}%)`}
        {myShare > 0 && ` · your contribution: ${myShare}`}
      </div>
      {error && <p className="error">{error}</p>}
      {!complete && contract.category !== 'hunting' && (
        <div className="guild-contract-actions">
          <span className="guild-contract-held">You have {heldAmount}{materialName ? ` ${materialName}` : ''}.</span>
          <input
            type="number"
            min={1}
            max={maxContribution}
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={() => handleContribute(Math.min(Math.floor(Number(amount)), maxContribution))} disabled={busy || !(Number(amount) > 0) || maxContribution <= 0}>
            Contribute
          </button>
          <button onClick={() => handleContribute(maxContribution)} disabled={busy || maxContribution <= 0}>
            Contribute All ({maxContribution})
          </button>
        </div>
      )}
      {!complete && contract.category === 'hunting' && (
        <div className="guild-contract-actions">
          <span className="guild-contract-held">
            {trackedKills} kill{trackedKills === 1 ? '' : 's'} tracked this week · {killsToReport} not yet reported.
          </span>
          <button onClick={handleReportKills} disabled={busy || killsToReport <= 0}>
            Report {killsToReport} Kill{killsToReport === 1 ? '' : 's'}
          </button>
        </div>
      )}
      {complete && myShare > 0 && !alreadyClaimed && (
        <div className="guild-contract-actions">
          <button onClick={handleClaim} disabled={busy}>
            Claim Reward
          </button>
        </div>
      )}
      {complete && alreadyClaimed && <p className="guild-placeholder-note">Reward claimed.</p>}
    </li>
  );
}

function ContractsPanel({ guildId, myUid }: { guildId: string; myUid: string }) {
  const { user } = useAuth();
  const [week, setWeek] = useState<GuildWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, setInventory);
    return unsubscribe;
  }, [user]);

  async function load() {
    try {
      const w = await getOrCreateGuildWeek(guildId);
      setWeek(w);
      // Only pay for a second read when claimCompanionContributions
      // actually changed something (once per companion per week) — most
      // visits land here with nothing to claim, and used to still cost a
      // guaranteed redundant getOrCreateGuildWeek call every time.
      const changed = await claimCompanionContributions(guildId, w.weekId);
      if (changed) {
        const w2 = await getOrCreateGuildWeek(guildId);
        setWeek(w2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  if (error) return <p className="error">{error}</p>;
  if (!week) return <p>Loading contracts…</p>;

  return (
    <div className="guild-panel">
      <h3>Weekly Contracts — {week.weekId}</h3>
      <ul className="guild-contract-list">
        {week.contracts.map((c, i) => (
          <ContractRowView
            key={i}
            contract={c}
            index={i}
            guildId={guildId}
            weekId={week.weekId}
            myUid={myUid}
            heldAmount={c.materialId ? inventory?.items[c.materialId] ?? 0 : 0}
            onChanged={load}
          />
        ))}
      </ul>
    </div>
  );
}

function HeadquartersPanel({
  guild,
  canManage,
  onChanged,
}: {
  guild: GuildDetails;
  canManage: boolean;
  onChanged: () => void;
}) {
  const { refetch } = useCharacter();
  const [donateAmount, setDonateAmount] = useState('');
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { level } = guildXpProgress(guild.xp);
  const tier = headquartersTierForLevel(level);

  async function handleDonate() {
    const amount = Math.floor(Number(donateAmount));
    if (!(amount > 0)) return;
    setError(null);
    setDonating(true);
    try {
      await donateGoldToGuild(guild.id, amount);
      setDonateAmount('');
      onChanged();
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to donate.');
    } finally {
      setDonating(false);
    }
  }

  async function handleUpgrade(roomId: RoomId) {
    setError(null);
    setBusyRoom(roomId);
    try {
      await upgradeGuildRoom(guild.id, roomId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade room.');
    } finally {
      setBusyRoom(null);
    }
  }

  return (
    <div className="guild-panel">
      <h3>
        Headquarters — {HEADQUARTERS_TIER_NAMES[tier - 1]} (Tier {tier})
      </h3>
      <p className="guild-meta-line">Guild Gold: {guild.gold}</p>
      <div className="guild-create-form">
        <input type="number" min={1} placeholder="Gold to donate" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} />
        <button onClick={handleDonate} disabled={donating || !(Number(donateAmount) > 0)}>
          {donating ? 'Donating…' : 'Donate'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="expedition-tier-grid">
        {ROOM_IDS.map((roomId) => {
          const roomLevel = Math.max(0, Math.min(ROOM_MAX_LEVEL, guild.rooms[roomId] ?? 0));
          const maxed = roomLevel >= ROOM_MAX_LEVEL;
          const cost = roomUpgradeCost(roomLevel);
          return (
            <div key={roomId} className="expedition-tier-card">
              <span className="expedition-tier-name">
                {ROOM_LABELS[roomId]} (Lv {roomLevel}/{ROOM_MAX_LEVEL})
              </span>
              <span className="expedition-tier-meta">{ROOM_BONUS_LABEL[roomId]}</span>
              <span className="expedition-tier-meta">
                {roomId === 'trophyhall' ? 'Cosmetic' : `+${roomBonusPct(roomId, roomLevel)}% current`}
              </span>
              {canManage && !maxed && (
                <button onClick={() => handleUpgrade(roomId)} disabled={busyRoom !== null || guild.gold < cost}>
                  {busyRoom === roomId ? 'Upgrading…' : `Upgrade (${cost} gold)`}
                </button>
              )}
              {maxed && <span className="guild-placeholder-note">Fully upgraded.</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Every 5 guild levels grants a permanent bonus for every member, not just
// whoever contributed the XP — see gameData/guildMilestones.ts for how each
// bonus is actually applied (mount speed, gathering/crafting time, Mastery
// XP rate).
function GuildMilestonesPanel({ guildLevel }: { guildLevel: number }) {
  return (
    <div className="guild-panel">
      <h3>Guild Milestones</h3>
      <div className="expedition-tier-grid">
        {GUILD_MILESTONES.map((m) => {
          const unlocked = guildLevel >= m.level;
          return (
            <div key={m.id} className="expedition-tier-card">
              <span className="expedition-tier-name">
                Level {m.level} — {m.label}
              </span>
              <span className="expedition-tier-meta">{m.description}</span>
              <span className="guild-placeholder-note">{unlocked ? 'Unlocked' : `Locked — ${m.level - guildLevel} level${m.level - guildLevel === 1 ? '' : 's'} to go`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sortRoster(members: GuildMemberRow[]): GuildMemberRow[] {
  return members
    .slice()
    .sort((a, b) => (a.role === b.role ? b.level - a.level : a.role === 'master' ? -1 : b.role === 'master' ? 1 : a.role === 'officer' ? -1 : 1));
}

function GuildOverview({
  guildId,
  myUid,
  companions,
  onChanged,
}: {
  guildId: string;
  myUid: string;
  // The current player's own recruited companions, rendered as extra roster
  // rows below (see the Roster panel) — Firestore rules restrict a
  // character doc to its own owner, so there's no way to show OTHER
  // members' companions without new denormalization; scoped to "your own
  // companions show up under your own roster row" for this first pass.
  companions: Partial<Record<string, CompanionState>>;
  onChanged: () => void;
}) {
  const [guild, setGuild] = useState<GuildDetails | null>(null);
  const [members, setMembers] = useState<GuildMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // getGuild() alone covers the roster, now that a Firestore trigger
  // (functions/src/guildRoster.ts) keeps it denormalized on the guild doc
  // — this is 1 read instead of 1 + up to MAX_GUILD_MEMBERS from a
  // separate listGuildMembers() query, on every single Guild Hall open.
  // The listGuildMembers() fallback only runs for a guild whose doc
  // predates that trigger and has had no membership write since;
  // backfillGuildRoster() makes every later visit to that guild cheap too.
  async function load() {
    const g = await getGuild(guildId);
    setGuild(g);
    if (!g) return;
    if (g.roster) {
      setMembers(sortRoster(g.roster));
    } else {
      backfillGuildRoster(guildId);
      const m = await listGuildMembers(guildId);
      setMembers(sortRoster(m));
    }
  }

  useEffect(() => {
    refreshGuildMemberProfile().finally(load);
    // Companion guild auto-contribution (Phase 7) — fire-and-forget on
    // every Guild Hall open, same posture as refreshGuildMemberProfile
    // right above (best-effort, never blocks or reruns `load`). A
    // successful claim doesn't need to force a reload here either — the
    // small gold trickle shows up next time `guild.gold` is read, same as
    // any other guild-gold change this screen doesn't optimistically patch.
    void claimCompanionContributionsToGuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function handleInvite() {
    const name = inviteName.trim();
    if (!name) return;
    setInviting(true);
    setInviteMessage(null);
    try {
      const result = await inviteToGuild(guildId, name);
      setInviteMessage(`Invited ${result.invitedName}.`);
      setInviteName('');
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : 'Failed to send invite.');
    } finally {
      setInviting(false);
    }
  }

  async function handleKick(targetUid: string) {
    setError(null);
    setBusyUid(targetUid);
    try {
      await kickGuildMember(guildId, targetUid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.');
    } finally {
      setBusyUid(null);
    }
  }

  async function handleSetRole(targetUid: string, role: 'officer' | 'member') {
    setError(null);
    setBusyUid(targetUid);
    try {
      await setGuildMemberRole(guildId, targetUid, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role.');
    } finally {
      setBusyUid(null);
    }
  }

  async function handleLeave() {
    setError(null);
    setLeaving(true);
    try {
      await leaveGuild();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave guild.');
      setLeaving(false);
    }
  }

  if (!guild || !members) return <div className="guild-screen">Loading guild…</div>;

  const isOwner = guild.ownerId === myUid;
  const isOfficer = guild.officerIds.includes(myUid);
  const canManage = isOwner || isOfficer;
  const officerCount = guild.officerIds.length;

  return (
    <div className="guild-screen">
      <div className="guild-panel">
        <h3>
          {guild.name}
          {guild.tag && <span className="guild-tag"> [{guild.tag}]</span>}
        </h3>
        <p className="guild-meta-line">
          Level {guildXpProgress(guild.xp).level} · {guild.memberIds.length}/{MAX_GUILD_MEMBERS} members · {officerCount}/{MAX_OFFICERS} Officers
        </p>
        {(() => {
          const { level, xpIntoLevel, xpForNextLevel } = guildXpProgress(guild.xp);
          return (
            <>
              <div className="profession-xp-bar-track">
                <div
                  className="profession-xp-bar-fill"
                  style={{ width: `${Math.min(100, (xpIntoLevel / xpForNextLevel) * 100)}%` }}
                />
              </div>
              <p className="guild-meta-line">
                <small>
                  {Math.floor(xpIntoLevel).toLocaleString()} / {xpForNextLevel.toLocaleString()} guild XP to level {level + 1}
                </small>
              </p>
            </>
          );
        })()}
        <p className="guild-meta-line">Guild Momentum: {guild.momentum}/{MAX_MOMENTUM}</p>
      </div>

      <GuildMilestonesPanel guildLevel={guildXpProgress(guild.xp).level} />

      <HeadquartersPanel guild={guild} canManage={canManage} onChanged={load} />

      <ContractsPanel guildId={guildId} myUid={myUid} />

      <div className="guild-panel">
        <h3>Roster</h3>
        {error && <p className="error">{error}</p>}
        <ul className="guild-roster-list">
          {members.map((m) => (
            <li key={m.uid} className="guild-roster-row">
              <span className="guild-roster-name">
                <ClassColoredName name={m.name} cls={m.class as ClassId} />
              </span>
              <span className="guild-roster-meta">
                Lv {m.level} {CLASS_LABELS[m.class as ClassId] ?? m.class}
                {m.spec ? ` (${SPEC_LABELS[m.spec as SpecId] ?? m.spec})` : ''}
                {m.title && getTitle(m.title) ? ` «${getTitle(m.title)!.name}»` : ''}
              </span>
              <span className="guild-roster-role">{roleLabel(m.role)}</span>
              {canManage && m.uid !== myUid && m.role !== 'master' && (
                <span className="guild-roster-actions">
                  {isOwner && m.role !== 'officer' && (
                    <button disabled={busyUid === m.uid} onClick={() => handleSetRole(m.uid, 'officer')}>
                      Promote
                    </button>
                  )}
                  {isOwner && m.role === 'officer' && (
                    <button disabled={busyUid === m.uid} onClick={() => handleSetRole(m.uid, 'member')}>
                      Demote
                    </button>
                  )}
                  {(isOwner || (isOfficer && m.role === 'member')) && (
                    <button disabled={busyUid === m.uid} onClick={() => handleKick(m.uid)}>
                      Remove
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
          {Object.entries(companions).map(([companionId, state]) => {
              if (!state) return null;
              const def = COMPANIONS[companionId];
              if (!def) return null;
              const specialty = [state.gatheringProfession, state.craftingProfession]
                .filter((p): p is NonNullable<typeof p> => !!p)
                .map((p) => PROFESSION_LABELS[p])
                .join(' / ');
              return (
                <li key={`companion:${companionId}`} className="guild-roster-row guild-roster-row-companion">
                  <span className="guild-roster-name">
                    <ClassColoredName name={def.name} cls={def.class} />
                  </span>
                  <span className="guild-roster-meta">
                    {CLASS_LABELS[def.class] ?? def.class} {SPEC_LABELS[def.specId] ?? def.specId}
                    {specialty ? ` — ${specialty}` : ''}
                  </span>
                  <span className="guild-roster-role">Companion</span>
                </li>
              );
            })}
        </ul>
        <p className="guild-meta-line">
          <small>Your recruited companions contribute to the guild automatically and don't count toward the member cap.</small>
        </p>
        {guild.memberIds.length < MAX_GUILD_MEMBERS && (
          <div className="guild-invite-row">
            <input
              type="text"
              placeholder="Character name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              disabled={inviting}
            />
            <button onClick={handleInvite} disabled={inviting || !inviteName.trim()}>
              {inviting ? 'Inviting…' : 'Invite'}
            </button>
            {inviteMessage && <p className="guild-meta-line"><small>{inviteMessage}</small></p>}
          </div>
        )}
      </div>

      <div className="guild-panel">
        <button onClick={handleLeave} disabled={leaving}>
          {leaving ? 'Leaving…' : isOwner && guild.memberIds.length === 1 ? 'Disband Guild' : 'Leave Guild'}
        </button>
      </div>
    </div>
  );
}

// Guild invites (Phase 7) — shown above the create/browse screen whenever
// a guild member has invited this character; not reachable once already
// in a guild (acceptGuildInvite itself also refuses that case, same guard
// duplicated here just so the button isn't even clickable).
function PendingInviteBanner({ guildName, onChanged }: { guildName: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptGuildInvite();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite.');
      setBusy(false);
    }
  }

  async function handleDecline() {
    setBusy(true);
    setError(null);
    try {
      await declineGuildInvite();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite.');
      setBusy(false);
    }
  }

  return (
    <div className="guild-panel">
      <h3>Guild Invite</h3>
      <p>
        <strong>{guildName}</strong> has invited you to join.
      </p>
      {error && <p className="error">{error}</p>}
      <button onClick={handleAccept} disabled={busy}>
        Accept
      </button>
      <button onClick={handleDecline} disabled={busy}>
        Decline
      </button>
    </div>
  );
}

export function GuildScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user || !character) return null;

  function handleChanged() {
    setRefreshKey((k) => k + 1);
    refetch();
  }

  if (character.guildId) {
    return (
      <GuildOverview
        key={refreshKey}
        guildId={character.guildId}
        myUid={user.uid}
        companions={character.companions}
        onChanged={handleChanged}
      />
    );
  }

  return (
    <div key={refreshKey}>
      {character.pendingGuildInviteId && character.pendingGuildInviteGuildName && (
        <PendingInviteBanner guildName={character.pendingGuildInviteGuildName} onChanged={handleChanged} />
      )}
      <CreateOrBrowseGuild onChanged={handleChanged} />
    </div>
  );
}

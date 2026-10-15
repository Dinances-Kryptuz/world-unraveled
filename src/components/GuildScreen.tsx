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
} from '../firebase/guilds';
import { MAX_GUILD_MEMBERS, MAX_OFFICERS, roleLabel, type GuildDetails, type GuildMemberRow, type GuildPublicSummary } from '../gameData/guilds';
import { CLASS_LABELS, SPEC_LABELS, type ClassId, type SpecId } from '../gameData/classStats';
import { ClassColoredName } from './ClassColoredName';
import {
  getOrCreateGuildWeek,
  contributeMaterial,
  reportHuntingKills,
  claimContractReward,
  claimCompanionContributions,
} from '../firebase/guildContracts';
import { contractCategoryLabel, myShareOfContract, MAX_MOMENTUM, type GuildWeek } from '../gameData/guildContracts';
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
  onChanged,
}: {
  contract: GuildWeek['contracts'][number];
  index: number;
  guildId: string;
  weekId: string;
  myUid: string;
  onChanged: () => void;
}) {
  const { refetch } = useCharacter();
  const [amount, setAmount] = useState('');
  const [kills, setKills] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.min(100, Math.round((contract.progress / contract.requirement) * 100));
  const complete = contract.completedAt !== null;
  const myShare = myShareOfContract(contract, myUid);
  const alreadyClaimed = !!contract.claims[myUid];

  async function handleContribute() {
    const n = Math.floor(Number(amount));
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

  async function handleReportKills() {
    const n = Math.floor(Number(kills));
    if (!(n > 0)) return;
    setError(null);
    setBusy(true);
    try {
      await reportHuntingKills(guildId, weekId, index, n);
      setKills('');
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
          <input
            type="number"
            min={1}
            placeholder={materialName ? `${materialName} to turn in` : 'Amount'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={handleContribute} disabled={busy || !(Number(amount) > 0)}>
            Contribute
          </button>
        </div>
      )}
      {!complete && contract.category === 'hunting' && (
        <div className="guild-contract-actions">
          <input type="number" min={1} max={20} placeholder="Kills to report" value={kills} onChange={(e) => setKills(e.target.value)} />
          <button onClick={handleReportKills} disabled={busy || !(Number(kills) > 0)}>
            Report Kills
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
  const [week, setWeek] = useState<GuildWeek | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const w = await getOrCreateGuildWeek(guildId);
      setWeek(w);
      claimCompanionContributions(guildId, w.weekId).then(() => {
        getOrCreateGuildWeek(guildId).then(setWeek);
      });
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
          <ContractRowView key={i} contract={c} index={i} guildId={guildId} weekId={week.weekId} myUid={myUid} onChanged={load} />
        ))}
      </ul>
    </div>
  );
}

function GuildOverview({ guildId, myUid, onChanged }: { guildId: string; myUid: string; onChanged: () => void }) {
  const [guild, setGuild] = useState<GuildDetails | null>(null);
  const [members, setMembers] = useState<GuildMemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function load() {
    const [g, m] = await Promise.all([getGuild(guildId), listGuildMembers(guildId)]);
    setGuild(g);
    setMembers(m.sort((a, b) => (a.role === b.role ? b.level - a.level : a.role === 'master' ? -1 : b.role === 'master' ? 1 : a.role === 'officer' ? -1 : 1)));
  }

  useEffect(() => {
    refreshGuildMemberProfile().finally(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

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
          Level {guild.level} · {guild.memberIds.length}/{MAX_GUILD_MEMBERS} members · {officerCount}/{MAX_OFFICERS} Officers
        </p>
        <p className="guild-meta-line">Guild Momentum: {guild.momentum}/{MAX_MOMENTUM}</p>
        <p className="guild-placeholder-note">
          Expeditions, headquarters upgrades, and restoration are coming in later phases.
        </p>
      </div>

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
        </ul>
      </div>

      <div className="guild-panel">
        <button onClick={handleLeave} disabled={leaving}>
          {leaving ? 'Leaving…' : isOwner && guild.memberIds.length === 1 ? 'Disband Guild' : 'Leave Guild'}
        </button>
      </div>
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
    return <GuildOverview key={refreshKey} guildId={character.guildId} myUid={user.uid} onChanged={handleChanged} />;
  }

  return <CreateOrBrowseGuild key={refreshKey} onChanged={handleChanged} />;
}

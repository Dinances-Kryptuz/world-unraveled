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
        <p className="guild-placeholder-note">
          Weekly contracts, expeditions, and headquarters upgrades are coming in later phases.
        </p>
      </div>

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

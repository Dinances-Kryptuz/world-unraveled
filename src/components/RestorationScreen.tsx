import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { getGuild } from '../firebase/guilds';
import { completeRestorationProject } from '../firebase/guildHeadquarters';
import { RESTORATION_PROJECTS } from '../gameData/guildHeadquarters';
import type { GuildDetails } from '../gameData/guilds';

export function RestorationScreen() {
  const { user } = useAuth();
  const { character } = useCharacter();
  const [guild, setGuild] = useState<GuildDetails | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!character?.guildId) {
      setGuild(null);
      return;
    }
    setGuild(await getGuild(character.guildId));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.guildId]);

  if (!user || !character) return null;
  if (!character.guildId || !guild) {
    return (
      <div className="guild-panel">
        <h3>Restoration Grounds</h3>
        <p>Join a guild to help restore Ashenfall.</p>
      </div>
    );
  }

  const isOwner = guild.ownerId === user.uid;
  const isOfficer = guild.officerIds.includes(user.uid);
  const canManage = isOwner || isOfficer;

  async function handleComplete(projectId: string) {
    setError(null);
    setBusyId(projectId);
    try {
      await completeRestorationProject(guild!.id, projectId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete project.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="guild-panel">
      <h3>Restoration Grounds</h3>
      <p className="guild-meta-line">Guild Gold: {guild.gold}</p>
      <p className="guild-placeholder-note">
        Completing a project awards every current guild member a cosmetic title — no mechanical bonus.
      </p>
      {error && <p className="error">{error}</p>}
      <ul className="guild-browse-list">
        {RESTORATION_PROJECTS.map((project) => {
          const done = guild.restorationIds.includes(project.id);
          return (
            <li key={project.id} className="guild-browse-row">
              <span className="guild-browse-name">{project.name}</span>
              <span className="guild-browse-meta">{project.description}</span>
              <span className="guild-browse-meta">{project.cost} gold</span>
              {done ? (
                <span className="guild-placeholder-note">Restored</span>
              ) : (
                canManage && (
                  <button onClick={() => handleComplete(project.id)} disabled={busyId !== null || guild.gold < project.cost}>
                    {busyId === project.id ? 'Restoring…' : 'Restore'}
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startExpedition, claimExpedition, getExpedition, getMyActiveExpedition, type ClaimExpeditionResult } from '../firebase/expeditions';
import {
  EXPEDITION_TIERS,
  expeditionTierLabel,
  expeditionLootItemIds,
  EXPEDITION_DURATION_SECONDS,
  EXPEDITION_SEALS_REWARD,
  EXPEDITION_XP_REWARD,
  EXPEDITION_BASE_SUCCESS,
  EXPEDITION_DROP_CHANCE,
  EXPEDITION_SUCCESS_PCT_PER_PERSON,
  type ExpeditionTier,
  type ExpeditionDoc,
} from '../gameData/expeditions';
import { COMPANIONS } from '../gameData/companions';
import { ITEMS } from '../gameData/items';
import type { Character } from '../types/character';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Ready to claim!';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s remaining`;
}

// One active expedition per character is enforced server-side (see
// functions/src/expeditions.ts's module comment), so by the time this
// picker is showing at all, no companion can already be away on another
// one — every recruited companion is always a free pick here.
function TierPicker({ guildId, character, onStarted }: { guildId: string; character: Character; onStarted: () => void }) {
  const [starting, setStarting] = useState<ExpeditionTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recruitedIds = Object.keys(character.companions).filter((id) => COMPANIONS[id]);
  // Defaults to every recruited companion selected — matches the previous
  // "send everyone you've recruited" behavior unless the player opts one
  // out (e.g. to keep it free for a dungeon run instead).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(recruitedIds));
  const partySize = 1 + selectedIds.size;

  function toggleCompanion(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleStart(tier: ExpeditionTier) {
    setError(null);
    setStarting(tier);
    try {
      await startExpedition(guildId, tier, Array.from(selectedIds));
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start expedition.');
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="guild-panel">
      <h3>Launch an Expedition</h3>
      <p className="guild-placeholder-note">
        Your party is yourself plus whichever recruited companions you bring — each person adds {Math.round(EXPEDITION_SUCCESS_PCT_PER_PERSON * 100)}%
        to the success chance. A companion you send becomes unavailable for dungeons until the expedition returns.
      </p>
      {recruitedIds.length > 0 && (
        <div className="expedition-party-list">
          {recruitedIds.map((id) => {
            const def = COMPANIONS[id];
            return (
              <label key={id} style={{ display: 'block' }}>
                <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleCompanion(id)} /> {def.name}
              </label>
            );
          })}
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="expedition-tier-grid">
        {EXPEDITION_TIERS.map((tier) => {
          const successChance = Math.max(
            0.05,
            Math.min(0.98, EXPEDITION_BASE_SUCCESS[tier] + partySize * EXPEDITION_SUCCESS_PCT_PER_PERSON)
          );
          const lootNames = expeditionLootItemIds(tier)
            .map((id) => ITEMS[id]?.name)
            .filter((name): name is string => !!name);
          return (
            <div key={tier} className={`expedition-tier-card expedition-tier-${tier}`}>
              <span className="expedition-tier-name">{expeditionTierLabel(tier)}</span>
              <span className="expedition-tier-meta">{formatDuration(EXPEDITION_DURATION_SECONDS[tier])}</span>
              <span className="expedition-tier-meta">
                {EXPEDITION_SEALS_REWARD[tier]} Seals · {EXPEDITION_XP_REWARD[tier]} Guild XP
              </span>
              <span className="expedition-tier-meta">{Math.round(successChance * 100)}% success chance ({partySize} in party)</span>
              {lootNames.length > 0 && (
                <span className="expedition-tier-meta">
                  <small>
                    {Math.round(EXPEDITION_DROP_CHANCE[tier] * 100)}% chance of: {lootNames.join(', ')}
                  </small>
                </span>
              )}
              <button onClick={() => handleStart(tier)} disabled={starting !== null}>
                {starting === tier ? 'Launching…' : 'Launch'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveExpeditionPanel({ expedition, onResolved }: { expedition: ExpeditionDoc; onResolved: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimExpeditionResult | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = expedition.completesAt.getTime() - now;
  const ready = remainingMs <= 0;

  async function handleClaim() {
    setError(null);
    setClaiming(true);
    try {
      const r = await claimExpedition(expedition.id);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim expedition.');
    } finally {
      setClaiming(false);
    }
  }

  if (result) {
    const lootItem = result.lootItemId ? ITEMS[result.lootItemId] : null;
    return (
      <div className="guild-panel">
        <h3>{result.success ? 'Expedition Successful!' : 'Expedition Failed'}</h3>
        {result.success ? (
          <>
            <p>Your party returned with {result.seals} Expedition Seals and {result.xp} Guild XP.</p>
            {lootItem && <p>A rare find: <strong>{lootItem.name}</strong>!</p>}
          </>
        ) : (
          <p>Your party was turned back without reward. Better luck next time.</p>
        )}
        <button onClick={onResolved}>Continue</button>
      </div>
    );
  }

  return (
    <div className="guild-panel">
      <h3>{expeditionTierLabel(expedition.tier)} Expedition in Progress</h3>
      <p className="guild-meta-line">{formatRemaining(remainingMs)}</p>
      <p className="guild-meta-line">Success chance: {Math.round(expedition.successChance * 100)}%</p>
      <ul className="expedition-party-list">
        {expedition.party.map((m, i) => (
          <li key={i}>
            {m.label} — {m.role}
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
      <button onClick={handleClaim} disabled={!ready || claiming}>
        {claiming ? 'Claiming…' : ready ? 'Claim Rewards' : 'Not Finished Yet'}
      </button>
    </div>
  );
}

export function ExpeditionScreen() {
  const { user } = useAuth();
  const { character } = useCharacter();
  const [expedition, setExpedition] = useState<ExpeditionDoc | null | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const active = character?.activeExpeditionId ? await getExpedition(character.activeExpeditionId) : await getMyActiveExpedition(user!.uid);
      if (!cancelled) setExpedition(active);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  if (!user || !character) return null;
  if (!character.guildId) {
    return (
      <div className="guild-panel">
        <h3>Expedition Command</h3>
        <p>Join a guild before launching an expedition.</p>
      </div>
    );
  }

  if (expedition === undefined) return <p>Loading…</p>;

  if (expedition && !expedition.resolved) {
    return <ActiveExpeditionPanel expedition={expedition} onResolved={() => setRefreshKey((k) => k + 1)} />;
  }

  return <TierPicker guildId={character.guildId} character={character} onStarted={() => setRefreshKey((k) => k + 1)} />;
}

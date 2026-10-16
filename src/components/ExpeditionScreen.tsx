import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { startExpedition, claimExpedition, getExpedition, getMyActiveExpedition, type ClaimExpeditionResult } from '../firebase/expeditions';
import {
  EXPEDITION_TIERS,
  expeditionTierLabel,
  EXPEDITION_DURATION_SECONDS,
  EXPEDITION_SEALS_REWARD,
  EXPEDITION_XP_REWARD,
  type ExpeditionTier,
  type ExpeditionDoc,
} from '../gameData/expeditions';
import { ITEMS } from '../gameData/items';

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

function TierPicker({ guildId, onStarted }: { guildId: string; onStarted: () => void }) {
  const [starting, setStarting] = useState<ExpeditionTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(tier: ExpeditionTier) {
    setError(null);
    setStarting(tier);
    try {
      await startExpedition(guildId, tier);
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
        Your party is yourself plus your currently recruited companions. Longer expeditions take longer but pay out more.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="expedition-tier-grid">
        {EXPEDITION_TIERS.map((tier) => (
          <div key={tier} className={`expedition-tier-card expedition-tier-${tier}`}>
            <span className="expedition-tier-name">{expeditionTierLabel(tier)}</span>
            <span className="expedition-tier-meta">{formatDuration(EXPEDITION_DURATION_SECONDS[tier])}</span>
            <span className="expedition-tier-meta">
              {EXPEDITION_SEALS_REWARD[tier]} Seals · {EXPEDITION_XP_REWARD[tier]} Guild XP
            </span>
            <button onClick={() => handleStart(tier)} disabled={starting !== null}>
              {starting === tier ? 'Launching…' : 'Launch'}
            </button>
          </div>
        ))}
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

  return <TierPicker guildId={character.guildId} onStarted={() => setRefreshKey((k) => k + 1)} />;
}

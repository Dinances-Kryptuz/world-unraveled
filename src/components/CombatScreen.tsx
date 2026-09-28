import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, stopActivity, getCharacter } from '../firebase/character';
import { MONSTERS } from '../gameData/monsters';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp, ATTACK_INTERVAL_SECONDS } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { characterXpForLevelV2 } from '../gameData/xpTables';
import {
  createEncounterState,
  advanceCombat,
  tryManualUseAbility,
  ABILITIES,
  type EncounterSetupInput,
  type KillReward,
  type TickContext,
} from '../combatEngine/engine';
import type { CombatState, CombatEvent, CombatEventKind, Combatant } from '../combatEngine/types';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';
import { TickBar } from './TickBar';
import { StatBar, hpBarColor } from './StatBar';
import { MonsterLevelBadge } from './MonsterLevelBadge';

const AUTOSAVE_INTERVAL_SECONDS = 10;
const MAX_LOG_LINES = 30;

const RESOURCE_LABELS: Record<string, string> = { rage: 'Rage', mana: 'Mana', holyPower: 'Holy Power' };
const RESOURCE_COLORS: Record<string, string> = { rage: '#a3312a', mana: '#2d6ca3', holyPower: '#b8960c' };

const LOG_COLORS: Record<CombatEventKind, string> = {
  damage_out: '#2a2420',
  damage_in: '#c0392b',
  heal: '#2e9e4f',
  miss: '#8c8c8c',
  death: '#b8960c',
  status: '#5c4a8a',
};

// Buffs/dots/stuns as small badges under a combatant's HP bar, so their
// status is visible at a glance instead of only inferable from the log.
function StatusBadges({ combatant }: { combatant: Combatant }) {
  const badges: { key: string; label: string; harmful: boolean }[] = [];
  for (const buff of combatant.buffs) {
    const harmful = buff.damageDealtPct < 0 || buff.damageTakenPct > 0;
    const name = ABILITIES[buff.abilityId]?.name ?? buff.abilityId;
    badges.push({ key: `buff-${buff.abilityId}`, label: `${name} (${Math.ceil(buff.remainingSeconds)}s)`, harmful });
  }
  for (const dot of combatant.dots) {
    const name = ABILITIES[dot.abilityId]?.name ?? dot.abilityId;
    badges.push({ key: `dot-${dot.abilityId}`, label: `${name} (${Math.ceil(dot.remainingSeconds)}s)`, harmful: true });
  }
  if (combatant.stunnedSeconds > 0) {
    badges.push({ key: 'stun', label: `Stunned (${Math.ceil(combatant.stunnedSeconds)}s)`, harmful: true });
  }
  if (badges.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
      {badges.map((b) => (
        <span
          key={b.key}
          style={{
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: 4,
            background: b.harmful ? '#f4d9d6' : '#d9f0df',
            color: b.harmful ? '#a3312a' : '#1f7a3d',
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

interface SessionTotals {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
}

const EMPTY_TOTALS: SessionTotals = { monstersDefeated: 0, xpGained: 0, goldGained: 0 };

export function CombatScreen({ monsterId }: { monsterId: string }) {
  const { user } = useAuth();
  // ZoneScreen never renders CombatScreen until it has confirmed a loaded
  // character, so this is always non-null in practice — but useCharacter()'s
  // type is nullable (it also serves the loading/logged-out states), and
  // this component's hooks (below) can't have an early return before them.
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedTotals, setBankedTotals] = useState<SessionTotals>(EMPTY_TOTALS);
  const [log, setLog] = useState<CombatEvent[]>([]);
  const [retreated, setRetreated] = useState(false);

  const combatStateRef = useRef<CombatState | null>(null);
  const pendingKillsRef = useRef<KillReward[]>([]);
  const retreatedRef = useRef(false);

  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const monster = MONSTERS[monsterId];

  function buildEncounterInput(c: Character): EncounterSetupInput {
    const specDef = resolveSpecDef(c.class, c.spec);
    const talentTotals = c.spec ? evaluateTalents(c.spec, c.talentPicks).totals : EMPTY_TALENT_TOTALS;
    const extraDamageTakenPct = getExtraDamageTakenPct(c.spec, c.talentPicks);
    const equipmentBonuses = getEquipmentStatBonuses(c.equipment);
    const charMaxHp = maxHp(c.class, c.level, equipmentBonuses);
    const startedAt = c.currentActivity.startedAt ?? new Date();
    const currentHp = resolveCurrentHp(c.currentHp, charMaxHp, c.hpCheckpointAt, startedAt);
    return {
      cls: c.class,
      level: c.level,
      specId: c.spec,
      specDef,
      talentTotals,
      extraDamageTakenPct,
      equipmentBonuses,
      currentHp,
      monster,
      savedEquippedAbilityIds: c.equippedAbilityIds,
      savedAbilityConditions: c.abilityConditions,
    };
  }

  useEffect(() => {
    setBankedTotals(EMPTY_TOTALS);
    setLog([]);
    setRetreated(false);
    retreatedRef.current = false;
    pendingKillsRef.current = [];
    combatStateRef.current = createEncounterState(buildEncounterInput(character));
    // Refs don't trigger a re-render on their own — without this, the
    // screen would render nothing for up to a second, until the first
    // interval tick happens to call setTick/setLog itself.
    setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monsterId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (retreatedRef.current || !combatStateRef.current) return;

      const ctx: TickContext = { monster, playerLevel: characterRef.current?.level ?? character.level };
      const result = advanceCombat(combatStateRef.current, ctx, 1);
      pendingKillsRef.current.push(...result.kills);
      if (result.events.length > 0) {
        setLog((prev) => [...result.events, ...prev].slice(0, MAX_LOG_LINES));
      }
      if (result.playerDied) {
        retreatedRef.current = true;
        setRetreated(true);
        void autosave();
        return;
      }

      setTick((t) => t + 1);
      secondsSinceSaveRef.current += 1;
      if (secondsSinceSaveRef.current >= AUTOSAVE_INTERVAL_SECONDS) {
        secondsSinceSaveRef.current = 0;
        void autosave();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monsterId]);

  async function autosave() {
    const currentUser = userRef.current;
    const state = combatStateRef.current;
    const player = state?.party.find((p) => p.isPlayer);
    if (!currentUser || !state || !player) return;

    const kills = pendingKillsRef.current;
    pendingKillsRef.current = [];
    if (kills.length === 0) return;

    const xpGained = Math.round(kills.reduce((sum, k) => sum + k.xpGained, 0));
    const goldGained = Math.round(kills.reduce((sum, k) => sum + k.goldGained, 0));
    const lootByItem: Record<string, number> = {};
    for (const kill of kills) {
      for (const drop of kill.loot) {
        lootByItem[drop.itemId] = (lootByItem[drop.itemId] ?? 0) + drop.quantity;
      }
    }
    const lootToSave = Object.entries(lootByItem).map(([itemId, quantity]) => ({ itemId, quantity }));

    setBankedTotals((prev) => ({
      monstersDefeated: prev.monstersDefeated + kills.length,
      xpGained: prev.xpGained + xpGained,
      goldGained: prev.goldGained + goldGained,
    }));
    // Bump the shared character xp/gold now, in the same tick as the banked
    // session totals above, so the header bar and this screen's "session"
    // line move together instead of the header lagging behind the Firestore
    // round-trip below.
    applyOptimisticUpdate((c) => ({ ...c, xp: c.xp + xpGained, gold: c.gold + goldGained }));

    try {
      await applyCombatResult(currentUser.uid, {
        xpGained,
        goldGained,
        loot: lootToSave,
        hpAfter: player.hp,
      });

      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        let newLevel = fresh.level;
        while (fresh.xp >= characterXpForLevelV2(newLevel + 1)) {
          newLevel++;
        }
        if (newLevel !== fresh.level) {
          const equipBonuses = getEquipmentStatBonuses(fresh.equipment);
          const restoredHp = maxHp(fresh.class, newLevel, equipBonuses);
          await setCharacterLevel(currentUser.uid, newLevel, restoredHp);
          player.hp = restoredHp;
          player.maxHp = restoredHp;
        }
      }

      await refetch();
    } catch (err) {
      console.error('Combat autosave failed, will retry next cycle:', err);
      pendingKillsRef.current.push(...kills);
      setBankedTotals((prev) => ({
        monstersDefeated: prev.monstersDefeated - kills.length,
        xpGained: prev.xpGained - xpGained,
        goldGained: prev.goldGained - goldGained,
      }));
      applyOptimisticUpdate((c) => ({ ...c, xp: c.xp - xpGained, gold: c.gold - goldGained }));
    }
  }

  async function handleStop() {
    if (!retreatedRef.current) await autosave();
    if (userRef.current) await stopActivity(userRef.current.uid);
    await refetch();
  }

  function handleManualUse(abilityId: string) {
    const state = combatStateRef.current;
    if (!state || retreatedRef.current) return;
    const ctx: TickContext = { monster, playerLevel: characterRef.current?.level ?? character.level };
    const result = tryManualUseAbility(state, 'player', abilityId, ctx);
    if (!result) return;
    pendingKillsRef.current.push(...result.kills);
    if (result.events.length > 0) {
      setLog((prev) => [...result.events, ...prev].slice(0, MAX_LOG_LINES));
    }
    setTick((t) => t + 1);
  }

  if (!character.currentActivity.startedAt || !combatStateRef.current) return null;

  const state = combatStateRef.current;
  const player = state.party.find((p) => p.isPlayer)!;
  const enemy = state.enemies[0];

  return (
    <div className="combat-screen">
      <h2>
        Fighting {monster.name} — <MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} />
      </h2>

      {!retreated && (
        <>
          <StatBar label="You" current={player.hp} max={player.maxHp} color={hpBarColor((player.hp / player.maxHp) * 100)} />
          {Object.entries(player.resources).map(([type, pool]) =>
            pool ? (
              <StatBar
                key={type}
                label={RESOURCE_LABELS[type] ?? type}
                current={pool.current}
                max={pool.max}
                color={RESOURCE_COLORS[type] ?? '#6b4f2a'}
              />
            ) : null
          )}
          <StatusBadges combatant={player} />

          <StatBar label={enemy.name} current={enemy.hp} max={enemy.maxHp} color={hpBarColor((enemy.hp / enemy.maxHp) * 100)} />
          <StatusBadges combatant={enemy} />

          <TickBar seconds={ATTACK_INTERVAL_SECONDS} color="#6b4f2a" label="Attack rhythm" />

          <div style={{ marginTop: 8 }}>
            {player.equippedAbilityIds.map((abilityId) => {
              const ability = ABILITIES[abilityId];
              if (!ability) return null;
              const cooldown = player.cooldowns[abilityId] ?? 0;
              const pool = ability.resourceType ? player.resources[ability.resourceType] : undefined;
              const affordable = !ability.resourceType || (pool !== undefined && pool.current >= (ability.resourceCost ?? 0));
              const disabled = cooldown > 0 || !affordable;
              const cdPct =
                ability.cooldownSeconds > 0
                  ? Math.max(0, Math.min(100, ((ability.cooldownSeconds - cooldown) / ability.cooldownSeconds) * 100))
                  : 100;
              return (
                <div key={abilityId} style={{ display: 'inline-block', marginRight: 8, marginBottom: 8, width: 140 }}>
                  <button
                    onClick={() => handleManualUse(abilityId)}
                    disabled={disabled}
                    title={cooldown <= 0 && !affordable ? `Not enough ${RESOURCE_LABELS[ability.resourceType!] ?? ability.resourceType}` : undefined}
                    style={{ width: '100%' }}
                  >
                    {cooldown > 0 ? `${ability.name} (${Math.ceil(cooldown)}s)` : ability.name}
                  </button>
                  {ability.cooldownSeconds > 0 && (
                    <div style={{ background: '#e2d9c8', borderRadius: 3, height: 4, width: '100%', marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ background: '#6b4f2a', height: '100%', width: `${cdPct}%`, transition: 'width 1s linear' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {retreated ? (
        <p>
          You were forced to retreat! This session: {bankedTotals.monstersDefeated} defeated, +
          {bankedTotals.xpGained} XP, +{bankedTotals.goldGained} gold. Your HP will recover over time.
        </p>
      ) : (
        <p>
          This session: {bankedTotals.monstersDefeated} defeated, +{bankedTotals.xpGained} XP, +
          {bankedTotals.goldGained} gold
        </p>
      )}

      <button onClick={handleStop}>Stop</button>

      <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto', fontSize: '0.85rem' }}>
        {log.map((entry, i) => (
          <div
            key={i}
            style={{
              color: LOG_COLORS[entry.kind],
              fontStyle: entry.kind === 'miss' ? 'italic' : 'normal',
              fontWeight: entry.kind === 'death' ? 700 : 400,
            }}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}

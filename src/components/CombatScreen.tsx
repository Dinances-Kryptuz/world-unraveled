import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, stopActivity, getCharacter } from '../firebase/character';
import { MONSTERS } from '../gameData/monsters';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
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
import type { CombatState } from '../combatEngine/types';
import type { Character } from '../types/character';
import type { User } from 'firebase/auth';

const AUTOSAVE_INTERVAL_SECONDS = 10;
const MAX_LOG_LINES = 30;

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
  const [log, setLog] = useState<string[]>([]);
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
        setLog((prev) => [...result.events.map((e) => e.message), ...prev].slice(0, MAX_LOG_LINES));
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
      setLog((prev) => [...result.events.map((e) => e.message), ...prev].slice(0, MAX_LOG_LINES));
    }
    setTick((t) => t + 1);
  }

  if (!character.currentActivity.startedAt || !combatStateRef.current) return null;

  const state = combatStateRef.current;
  const player = state.party.find((p) => p.isPlayer)!;
  const enemy = state.enemies[0];

  return (
    <div className="combat-screen">
      <h2>Fighting {monster.name}</h2>

      {!retreated && (
        <>
          <p>
            You: {Math.round(player.hp)} / {Math.round(player.maxHp)} HP
            {Object.entries(player.resources).map(([type, pool]) =>
              pool ? (
                <span key={type}>
                  {' '}
                  — {type}: {Math.round(pool.current)} / {pool.max}
                </span>
              ) : null
            )}
          </p>
          <p>
            {enemy.name}: {Math.round(enemy.hp)} / {Math.round(enemy.maxHp)} HP
          </p>
          {player.equippedAbilityIds.map((abilityId) => {
            const ability = ABILITIES[abilityId];
            if (!ability) return null;
            const cooldown = player.cooldowns[abilityId] ?? 0;
            return (
              <button key={abilityId} onClick={() => handleManualUse(abilityId)} disabled={cooldown > 0}>
                {cooldown > 0 ? `${ability.name} (${Math.ceil(cooldown)}s)` : ability.name}
              </button>
            );
          })}
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

      <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto', fontSize: '0.85rem', color: '#6b6156' }}>
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

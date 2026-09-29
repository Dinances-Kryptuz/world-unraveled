import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, getCharacter } from '../firebase/character';
import { subscribeToInventory } from '../firebase/inventory';
import { recordConsumableUse, remainingCooldownSeconds } from '../firebase/consumables';
import { DUNGEONS } from '../gameData/dungeons';
import { MONSTERS } from '../gameData/monsters';
import { ITEMS } from '../gameData/items';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp, ATTACK_INTERVAL_SECONDS } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { characterXpForLevelV2 } from '../gameData/xpTables';
import {
  createEncounterState,
  advanceCombat,
  tryManualUseAbility,
  type EncounterSetupInput,
  type KillReward,
  type TickContext,
} from '../combatEngine/engine';
import type { CombatState, CombatEvent } from '../combatEngine/types';
import type { Monster } from '../gameData/types';
import type { Character, Inventory } from '../types/character';
import type { User } from 'firebase/auth';
import { TickBar } from './TickBar';
import { StatBar, hpBarColor } from './StatBar';
import { MonsterLevelBadge } from './MonsterLevelBadge';
import { StatusBadges } from './StatusBadges';
import { ResourceBars } from './ResourceBars';
import { AbilityBar } from './AbilityBar';
import { ConsumablesBar } from './ConsumablesBar';
import { CombatLog } from './CombatLog';

const AUTOSAVE_INTERVAL_SECONDS = 10;
const MAX_LOG_LINES = 30;

interface SessionTotals {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
}

const EMPTY_TOTALS: SessionTotals = { monstersDefeated: 0, xpGained: 0, goldGained: 0 };

// A dungeon run: the same discrete engine as CombatScreen, just fed a fixed
// sequence of monster stages via TickContext.nextMonster instead of one
// monster respawning as itself. Deliberately NOT written to
// Character.currentActivity — a run is live-session-only for this first
// pass (no offline catch-up simulation for dungeons yet), so closing the
// tab mid-run just loses the current stage, not anything already earned
// (kills are autosaved via applyCombatResult the same as regular combat).
export function DungeonScreen({ dungeonId, onExit }: { dungeonId: string; onExit: () => void }) {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const secondsSinceSaveRef = useRef(0);

  const [bankedTotals, setBankedTotals] = useState<SessionTotals>(EMPTY_TOTALS);
  const [fullClears, setFullClears] = useState(0);
  const [log, setLog] = useState<CombatEvent[]>([]);
  const [retreated, setRetreated] = useState(false);
  const [inventory, setInventory] = useState<Inventory | null>(null);

  const dungeon = DUNGEONS[dungeonId];
  const stageIndexRef = useRef(0);
  const currentMonsterRef = useRef<Monster>(MONSTERS[dungeon.stages[0]]);
  const fullClearsRef = useRef(0);
  const pendingLogRef = useRef<CombatEvent[]>([]);

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

  useEffect(() => {
    if (!user) return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user]);

  // Advances to the next stage (looping back to the first after the boss),
  // and drops a banner line in the log when a full clear happens — called
  // by the engine itself, from inside advanceCombat's respawn step.
  function nextMonster(justDefeated: Monster): Monster {
    if (justDefeated.isBoss) {
      fullClearsRef.current++;
      setFullClears(fullClearsRef.current);
      pendingLogRef.current.push({
        message: `You cleared ${dungeon.name}! Looping back to the first stage.`,
        kind: 'status',
      });
    }
    stageIndexRef.current = (stageIndexRef.current + 1) % dungeon.stages.length;
    const next = MONSTERS[dungeon.stages[stageIndexRef.current]];
    currentMonsterRef.current = next;
    return next;
  }

  function buildEncounterInput(c: Character): EncounterSetupInput {
    const specDef = resolveSpecDef(c.class, c.spec);
    const talentTotals = c.spec ? evaluateTalents(c.spec, c.talentPicks).totals : EMPTY_TALENT_TOTALS;
    const extraDamageTakenPct = getExtraDamageTakenPct(c.spec, c.talentPicks);
    const equipmentBonuses = getEquipmentStatBonuses(c.equipment);
    const charMaxHp = maxHp(c.class, c.level, equipmentBonuses);
    const currentHp = resolveCurrentHp(c.currentHp, charMaxHp, c.hpCheckpointAt, new Date());
    return {
      cls: c.class,
      level: c.level,
      specId: c.spec,
      specDef,
      talentTotals,
      extraDamageTakenPct,
      equipmentBonuses,
      currentHp,
      monster: currentMonsterRef.current,
      savedEquippedAbilityIds: c.equippedAbilityIds,
      savedAbilityConditions: c.abilityConditions,
    };
  }

  useEffect(() => {
    setBankedTotals(EMPTY_TOTALS);
    setFullClears(0);
    setLog([]);
    setRetreated(false);
    retreatedRef.current = false;
    pendingKillsRef.current = [];
    stageIndexRef.current = 0;
    fullClearsRef.current = 0;
    currentMonsterRef.current = MONSTERS[dungeon.stages[0]];
    combatStateRef.current = createEncounterState(buildEncounterInput(character));
    setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dungeonId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (retreatedRef.current || !combatStateRef.current) return;

      const ctx: TickContext = {
        monster: currentMonsterRef.current,
        playerLevel: characterRef.current?.level ?? character.level,
        nextMonster,
      };
      const result = advanceCombat(combatStateRef.current, ctx, 1);
      pendingKillsRef.current.push(...result.kills);
      const extra = pendingLogRef.current;
      pendingLogRef.current = [];
      if (result.events.length > 0 || extra.length > 0) {
        setLog((prev) => [...extra, ...result.events, ...prev].slice(0, MAX_LOG_LINES));
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
  }, [dungeonId]);

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
      console.error('Dungeon autosave failed, will retry next cycle:', err);
      pendingKillsRef.current.push(...kills);
      setBankedTotals((prev) => ({
        monstersDefeated: prev.monstersDefeated - kills.length,
        xpGained: prev.xpGained - xpGained,
        goldGained: prev.goldGained - goldGained,
      }));
      applyOptimisticUpdate((c) => ({ ...c, xp: c.xp - xpGained, gold: c.gold - goldGained }));
    }
  }

  async function handleExit() {
    if (!retreatedRef.current) await autosave();
    await refetch();
    onExit();
  }

  function handleManualUse(abilityId: string) {
    const state = combatStateRef.current;
    if (!state || retreatedRef.current) return;
    const ctx: TickContext = {
      monster: currentMonsterRef.current,
      playerLevel: characterRef.current?.level ?? character.level,
      nextMonster,
    };
    const result = tryManualUseAbility(state, 'player', abilityId, ctx);
    if (!result) return;
    pendingKillsRef.current.push(...result.kills);
    if (result.events.length > 0) {
      setLog((prev) => [...result.events, ...prev].slice(0, MAX_LOG_LINES));
    }
    setTick((t) => t + 1);
  }

  function handleUseConsumable(itemId: string) {
    const state = combatStateRef.current;
    const currentUser = userRef.current;
    if (!state || retreatedRef.current || !currentUser) return;
    const item = ITEMS[itemId];
    const effect = item?.consumableEffect;
    if (!effect) return;
    const currentCharacter = characterRef.current ?? character;
    if (remainingCooldownSeconds(currentCharacter, itemId, effect.cooldownSeconds, new Date()) > 0) return;

    const player = state.party.find((p) => p.isPlayer)!;
    if (effect.healAmount) {
      player.hp = Math.min(player.maxHp, player.hp + effect.healAmount);
    }
    if (effect.manaAmount && player.resources.mana) {
      player.resources.mana.current = Math.min(player.resources.mana.max, player.resources.mana.current + effect.manaAmount);
    }
    setTick((t) => t + 1);

    const usedAt = new Date();
    applyOptimisticUpdate((c) => ({ ...c, itemCooldowns: { ...c.itemCooldowns, [itemId]: usedAt } }));
    void recordConsumableUse(currentUser.uid, itemId);
  }

  if (!combatStateRef.current) return null;

  const state = combatStateRef.current;
  const player = state.party.find((p) => p.isPlayer)!;
  const enemy = state.enemies[0];
  const monster = currentMonsterRef.current;
  const stageLabel = `Stage ${stageIndexRef.current + 1} / ${dungeon.stages.length}${monster.isBoss ? ' — Boss' : ''}`;

  return (
    <div className="combat-screen">
      <h2>{dungeon.name}</h2>
      <p>
        <small>{stageLabel}</small>
      </p>
      <h3>
        {monster.isBoss ? '☠ ' : ''}
        {monster.name} — <MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} />
      </h3>

      {!retreated && (
        <>
          <StatBar label="You" current={player.hp} max={player.maxHp} color={hpBarColor((player.hp / player.maxHp) * 100)} />
          <ResourceBars combatant={player} />
          <StatusBadges combatant={player} />

          <StatBar label={enemy.name} current={enemy.hp} max={enemy.maxHp} color={hpBarColor((enemy.hp / enemy.maxHp) * 100)} />
          <StatusBadges combatant={enemy} />

          <TickBar seconds={ATTACK_INTERVAL_SECONDS} color="#6b4f2a" label="Attack rhythm" />

          <AbilityBar player={player} onUse={handleManualUse} />
          <ConsumablesBar
            character={character}
            inventoryItems={inventory?.items ?? {}}
            allowMana={true}
            onUse={handleUseConsumable}
          />
        </>
      )}

      {retreated ? (
        <p>
          You were forced to retreat! This run: {bankedTotals.monstersDefeated} defeated, +{bankedTotals.xpGained} XP,
          +{bankedTotals.goldGained} gold, {fullClears} full clear{fullClears === 1 ? '' : 's'}. Your HP will recover
          over time.
        </p>
      ) : (
        <p>
          This run: {bankedTotals.monstersDefeated} defeated, +{bankedTotals.xpGained} XP, +{bankedTotals.goldGained}{' '}
          gold, {fullClears} full clear{fullClears === 1 ? '' : 's'}
        </p>
      )}

      <button onClick={handleExit}>Exit Dungeon</button>

      <CombatLog events={log} />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, stopActivity, getCharacter, advanceQuests } from '../firebase/character';
import { subscribeToInventory } from '../firebase/inventory';
import { recordConsumableUse, remainingCooldownSeconds, consumeBuffCharges } from '../firebase/consumables';
import { MONSTERS } from '../gameData/monsters';
import { ITEMS } from '../gameData/items';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { evaluateActiveBuffs } from '../gameData/buffs';
import { maxHp, resolveCurrentHp, ATTACK_INTERVAL_SECONDS } from '../gameData/combatFormulas';
import { AUTOSAVE_INTERVAL_SECONDS } from '../gameData/activityEngine';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { characterXpForLevelV2, MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
import { checkAndUnlockNextSlot } from '../firebase/characterSlots';
import type { QuestEvent } from '../gameData/questEngine';
import {
  createEncounterState,
  advanceCombat,
  tryManualUseAbility,
  mergeQuestSignals,
  type EncounterSetupInput,
  type KillReward,
  type QuestSignals,
  type TickContext,
} from '../combatEngine/engine';
import type { CombatState, CombatEvent } from '../combatEngine/types';
import type { Character, Inventory } from '../types/character';
import type { User } from 'firebase/auth';
import { TickBar } from './TickBar';
import { StatBar, hpBarColor } from './StatBar';
import { MonsterLevelBadge } from './MonsterLevelBadge';
import { MonsterPortrait } from './MonsterPortrait';
import { StatusBadges } from './StatusBadges';
import { ResourceBars } from './ResourceBars';
import { AbilityBar } from './AbilityBar';
import { ConsumablesBar } from './ConsumablesBar';
import { CombatLog } from './CombatLog';
import { notify } from '../utils/notifications';

const MAX_LOG_LINES = 30;

interface SessionTotals {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
  voidShardsGained: number;
}

const EMPTY_TOTALS: SessionTotals = { monstersDefeated: 0, xpGained: 0, goldGained: 0, voidShardsGained: 0 };

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
  const [inventory, setInventory] = useState<Inventory | null>(null);

  const combatStateRef = useRef<CombatState | null>(null);
  const pendingKillsRef = useRef<KillReward[]>([]);
  const pendingQuestSignalsRef = useRef<QuestSignals>({ healingDone: 0, abilityUseCounts: {} });
  const pendingBuffTriggersRef = useRef<{ offensive_action: number; damage_taken: number }>({
    offensive_action: 0,
    damage_taken: 0,
  });
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

  const monster = MONSTERS[monsterId];

  // The player's current combat-triangle type — read from the freshest
  // character data available (the ref during an active tick, falling back
  // to the render-time character before the ref is populated).
  function currentPlayerCombatType() {
    const c = characterRef.current ?? character;
    return resolveSpecDef(c.class, c.spec).combatType;
  }

  function buildEncounterInput(c: Character): EncounterSetupInput {
    const specDef = resolveSpecDef(c.class, c.spec);
    const talentTotals = c.spec ? evaluateTalents(c.spec, c.talentPicks).totals : EMPTY_TALENT_TOTALS;
    const buffTotals = evaluateActiveBuffs(c.activeBuffs, new Date());
    const extraDamageTakenPct = getExtraDamageTakenPct(c.spec, c.talentPicks);
    const equipmentBonuses = getEquipmentStatBonuses(c.equipment, c.enchantments);
    const charMaxHp = maxHp(c.class, c.level, equipmentBonuses, talentTotals.hpMultPct);
    const startedAt = c.currentActivity.startedAt ?? new Date();
    const currentHp = resolveCurrentHp(c.currentHp, charMaxHp, c.hpCheckpointAt, startedAt);
    return {
      cls: c.class,
      level: c.level,
      specId: c.spec,
      specDef,
      talentTotals,
      buffTotals,
      extraDamageTakenPct,
      equipmentBonuses,
      currentHp,
      monster,
      savedEquippedAbilityIds: c.equippedAbilityIds,
      savedAbilityConditions: c.abilityConditions,
      disabledAbilityIds: c.disabledAbilityIds,
      // Companions only fight in dungeons (see DungeonScreen.tsx) — open-
      // world combat is always solo, per an explicit product decision: a
      // companion that tagged along on ordinary zone grinding made "bring
      // your crew" feel the same everywhere instead of being the thing
      // that makes a dungeon's full-group requirement meaningful.
    };
  }

  useEffect(() => {
    setBankedTotals(EMPTY_TOTALS);
    setLog([]);
    setRetreated(false);
    retreatedRef.current = false;
    pendingKillsRef.current = [];
    pendingQuestSignalsRef.current = { healingDone: 0, abilityUseCounts: {} };
    pendingBuffTriggersRef.current = { offensive_action: 0, damage_taken: 0 };
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

      const ctx: TickContext = { monster, playerLevel: characterRef.current?.level ?? character.level, playerCombatType: currentPlayerCombatType() };
      const result = advanceCombat(combatStateRef.current, ctx, 1);
      pendingKillsRef.current.push(...result.kills);
      if (characterRef.current?.notificationsEnabled) {
        for (const kill of result.kills) {
          const lootLines = kill.loot.map((drop) => `${drop.quantity}x ${ITEMS[drop.itemId]?.name ?? drop.itemId}`);
          notify(`${monster.name} defeated`, [
            `+${Math.round(kill.xpGained)} XP`,
            ...(kill.goldGained > 0 ? [`+${Math.round(kill.goldGained)} Gold`] : []),
            ...lootLines,
          ]);
        }
      }
      mergeQuestSignals(pendingQuestSignalsRef.current, result.questSignals);
      for (const event of result.events) {
        if (event.kind === 'damage_out') pendingBuffTriggersRef.current.offensive_action++;
        else if (event.kind === 'damage_in') pendingBuffTriggersRef.current.damage_taken++;
      }
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
    const questSignals = pendingQuestSignalsRef.current;
    const buffTriggers = pendingBuffTriggersRef.current;
    const hasQuestSignals = questSignals.healingDone > 0 || Object.keys(questSignals.abilityUseCounts).length > 0;
    const hasBuffTriggers = buffTriggers.offensive_action > 0 || buffTriggers.damage_taken > 0;
    if (kills.length === 0 && !hasQuestSignals && !hasBuffTriggers) return;
    pendingKillsRef.current = [];
    pendingQuestSignalsRef.current = { healingDone: 0, abilityUseCounts: {} };
    pendingBuffTriggersRef.current = { offensive_action: 0, damage_taken: 0 };
    const currentCharacterForBuffs = characterRef.current ?? character;
    if (hasBuffTriggers) void consumeBuffCharges(currentUser.uid, currentCharacterForBuffs, buffTriggers);

    const xpGained = Math.round(kills.reduce((sum, k) => sum + k.xpGained, 0));
    const goldGained = Math.round(kills.reduce((sum, k) => sum + k.goldGained, 0));
    const voidShardsGained = Math.round(kills.reduce((sum, k) => sum + k.voidShardsGained, 0));
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
      voidShardsGained: prev.voidShardsGained + voidShardsGained,
    }));
    // Bump the shared character xp/gold now, in the same tick as the banked
    // session totals above, so the header bar and this screen's "session"
    // line move together instead of the header lagging behind the Firestore
    // round-trip below. Also mirror applyCombatResult's startedAt reset
    // (below) into local state immediately — useCharacter has no live
    // listener, so without this, `character.currentActivity.startedAt`
    // only ever advances once the Firestore round-trip's refetch() resolves,
    // staying stale for the whole autosave interval in between. With
    // isLongAbsence's threshold now close to that interval (see
    // activityEngine.ts), that staleness alone was enough to flash the
    // Welcome Back screen on every autosave tick before snapping back off.
    applyOptimisticUpdate((c) => ({
      ...c,
      xp: c.xp + xpGained,
      gold: c.gold + goldGained,
      voidShards: c.voidShards + voidShardsGained,
      currentActivity: { ...c.currentActivity, startedAt: new Date() },
    }));

    try {
      // One read per cycle, done up front rather than after the write —
      // see GatheringScreen's matching comment for the full reasoning. Using
      // fresh.xp (pre-write) + the locally-known xpGained is exactly
      // equivalent to the old post-write read for level-up purposes, and
      // this same read also safely merges quest progress and reconciles
      // local state afterward, replacing what used to be two separate reads
      // of the same document (this one plus refetch()) with exactly one.
      const fresh = await getCharacter(currentUser.uid);
      // Routes through the catch block below (rolling back the speculative
      // optimistic update and re-queuing these kills for next cycle) rather
      // than silently dropping them — near-impossible for an already-loaded
      // character, but a bare `return` here would otherwise discard this
      // cycle's rewards without ever persisting or retrying them.
      if (!fresh) throw new Error('Character not found during autosave');
      const newXp = fresh.xp + xpGained;

      await applyCombatResult(currentUser.uid, {
        xpGained,
        goldGained,
        voidShardsGained,
        loot: lootToSave,
        hpAfter: player.hp,
      });

      let newLevel = fresh.level;
      while (newLevel < MAX_CHARACTER_LEVEL && newXp >= characterXpForLevelV2(newLevel + 1)) {
        newLevel++;
      }
      let restoredHp: number | null = null;
      if (newLevel !== fresh.level) {
        const equipBonuses = getEquipmentStatBonuses(fresh.equipment, fresh.enchantments);
        const freshTalentTotals = fresh.spec ? evaluateTalents(fresh.spec, fresh.talentPicks).totals : EMPTY_TALENT_TOTALS;
        restoredHp = maxHp(fresh.class, newLevel, equipBonuses, freshTalentTotals.hpMultPct);
        await setCharacterLevel(currentUser.uid, newLevel, restoredHp);
        player.hp = restoredHp;
        player.maxHp = restoredHp;
        if (newLevel >= MAX_CHARACTER_LEVEL) void checkAndUnlockNextSlot(currentUser.uid);
      }

      const killCountsByMonster: Record<string, number> = {};
      for (const kill of kills) {
        killCountsByMonster[kill.monsterId] = (killCountsByMonster[kill.monsterId] ?? 0) + 1;
      }
      const questEvents: QuestEvent[] = Object.entries(killCountsByMonster).map(([monsterId, count]) => ({
        type: 'kill',
        monsterId,
        count,
      }));
      if (questSignals.healingDone > 0) {
        questEvents.push({ type: 'heal_amount', amount: Math.round(questSignals.healingDone) });
      }
      for (const [abilityId, count] of Object.entries(questSignals.abilityUseCounts)) {
        questEvents.push({ type: 'use_ability', abilityId, count });
      }
      if (questEvents.length > 0) {
        await advanceQuests(currentUser.uid, fresh, questEvents);
      }

      applyOptimisticUpdate(() => ({
        ...fresh,
        xp: newXp,
        gold: fresh.gold + goldGained,
        voidShards: fresh.voidShards + voidShardsGained,
        level: newLevel,
        currentHp: restoredHp ?? player.hp,
        currentActivity: { ...fresh.currentActivity, startedAt: new Date() },
      }));
    } catch (err) {
      console.error('Combat autosave failed, will retry next cycle:', err);
      pendingKillsRef.current.push(...kills);
      mergeQuestSignals(pendingQuestSignalsRef.current, questSignals);
      setBankedTotals((prev) => ({
        monstersDefeated: prev.monstersDefeated - kills.length,
        xpGained: prev.xpGained - xpGained,
        goldGained: prev.goldGained - goldGained,
        voidShardsGained: prev.voidShardsGained - voidShardsGained,
      }));
      applyOptimisticUpdate((c) => ({ ...c, xp: c.xp - xpGained, gold: c.gold - goldGained, voidShards: c.voidShards - voidShardsGained }));
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
    const ctx: TickContext = { monster, playerLevel: characterRef.current?.level ?? character.level, playerCombatType: currentPlayerCombatType() };
    const result = tryManualUseAbility(state, 'player', abilityId, ctx);
    if (!result) return;
    pendingKillsRef.current.push(...result.kills);
    mergeQuestSignals(pendingQuestSignalsRef.current, result.questSignals);
    for (const event of result.events) {
      if (event.kind === 'damage_out') pendingBuffTriggersRef.current.offensive_action++;
      else if (event.kind === 'damage_in') pendingBuffTriggersRef.current.damage_taken++;
    }
    if (result.events.length > 0) {
      setLog((prev) => [...result.events, ...prev].slice(0, MAX_LOG_LINES));
    }
    setTick((t) => t + 1);
  }

  // Applies the effect directly to the live player Combatant, same instant
  // feedback as a manual ability use — the resulting HP reaches Firestore
  // via the next autosave, same as any other in-combat HP change. Only the
  // cooldown/inventory bookkeeping is persisted here (recordConsumableUse).
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
    // Applied directly to the live profile for immediate effect this fight
    // (buffTotals is otherwise only baked in once, at encounter setup) —
    // see buildPlayerProfile in engine.ts for the matching formulas.
    if (effect.buff) {
      const b = effect.buff;
      player.profile.damageCoef *= 1 + (b.damageMultiplierPct ?? 0) / 100;
      player.profile.damageTakenMult *= 1 - (b.mitigationMultiplierPct ?? 0) / 100;
      player.profile.avoidance = Math.min(0.75, player.profile.avoidance + (b.dodgeBonusPct ?? 0) / 100);
      player.profile.accuracy += (b.hitChanceBonusPct ?? 0) / 100;
    }
    setTick((t) => t + 1);

    const usedAt = new Date();
    applyOptimisticUpdate((c) => ({ ...c, itemCooldowns: { ...c.itemCooldowns, [itemId]: usedAt } }));
    void recordConsumableUse(currentUser.uid, itemId);
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
          <MonsterPortrait monsterId={monster.id} isBoss={monster.isBoss} />
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
          You were forced to retreat! This session: {bankedTotals.monstersDefeated} defeated, +
          {bankedTotals.xpGained} XP, +{bankedTotals.goldGained} gold
          {bankedTotals.voidShardsGained > 0 ? `, +${bankedTotals.voidShardsGained} Void Shards` : ''}. Your HP will
          recover over time.
        </p>
      ) : (
        <p>
          This session: {bankedTotals.monstersDefeated} defeated, +{bankedTotals.xpGained} XP, +
          {bankedTotals.goldGained} gold
          {bankedTotals.voidShardsGained > 0 ? `, +${bankedTotals.voidShardsGained} Void Shards` : ''}
        </p>
      )}

      <button onClick={handleStop}>Stop</button>

      <CombatLog events={log} />
    </div>
  );
}

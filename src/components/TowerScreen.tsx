import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { getCharacter, setCharacterLevel } from '../firebase/character';
import { subscribeToInventory } from '../firebase/inventory';
import {
  consumeBuffCharges,
  setEquippedConsumable,
  applyConsumableAutomationUsage,
  recordConsumableUse,
  remainingCooldownSeconds,
} from '../firebase/consumables';
import { consumeEnchantCharges } from '../firebase/enchanting';
import { payTowerAttemptCost, applyTowerAttemptResult } from '../firebase/tower';
import {
  TOWER_AFFIXES,
  affixesForFloor,
  towerAttemptCost,
  guardianForFloor,
  towerAffixHpMultiplier,
  towerAffixDamageMultiplier,
} from '../gameData/tower';
import { towerHpMultiplier, towerDamageMultiplier, ATTACK_INTERVAL_SECONDS } from '../gameData/combatFormulas';
import { TOWER_MILESTONE_FLOORS } from '../gameData/towerLoot';
import { ITEMS } from '../gameData/items';
import { inferItemRarity, RARITY_COLORS } from '../gameData/itemRarity';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { resolveCombatProfile } from '../gameData/resolveCombatProfile';
import {
  buildConsumableAutomationState,
  emptyConsumableAutomationState,
  type ConsumableAutomationRuntimeState,
} from '../gameData/consumableAutomation';
import { resolveActiveCompanionSetups, REQUIRED_DUNGEON_PARTY_SIZE, type CompanionCombatSetup } from '../gameData/companions';
import { resolveActiveAltSetups } from '../firebase/characterSlots';
import { isShieldEquipped } from '../gameData/equipmentStats';
import { characterXpForLevelV2, MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
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
import { StatBar, HEALTH_BAR_COLOR, ENEMY_HEALTH_BAR_COLOR } from './StatBar';
import { MonsterPortrait } from './MonsterPortrait';
import { StatusBadges } from './StatusBadges';
import { ResourceBars } from './ResourceBars';
import { AbilityBar } from './AbilityBar';
import { ConsumablesBar } from './ConsumablesBar';
import { CombatLog } from './CombatLog';

const MAX_LOG_LINES = 30;

type Phase = 'idle' | 'fighting' | 'result';

interface AttemptResultInfo {
  won: boolean;
  floor: number;
  xpGained: number;
  goldGained: number;
  newHighestFloor: number;
  droppedDown: boolean;
  milestoneItemId?: string;
}

// The Tower of Infinity — the end-game "how high can you climb" mini-game.
// Deliberately NOT hoisted into App.tsx's shared activityNode slot the way
// combat/gathering/a dungeon run are: a Tower attempt is short (locked at
// well under a minute even at the hardest reliably-contested floors — see
// the Phase 0 simulation behind combatFormulas.ts's TOWER_HP_GROWTH/
// TOWER_DAMAGE_GROWTH), so rather than threading it through that persistent-
// across-navigation machinery, leaving this screen mid-fight simply forfeits
// the attempt as a loss (see the unmount effect below) — a flagged, deliberate
// v1 scope cut, not an oversight.
export function TowerScreen() {
  const { user } = useAuth();
  const { character: characterOrNull, refetch, applyOptimisticUpdate } = useCharacter();
  const character = characterOrNull!;
  const [, setTick] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [log, setLog] = useState<CombatEvent[]>([]);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<AttemptResultInfo | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [starting, setStarting] = useState(false);

  const phaseRef = useRef<Phase>('idle');
  const combatStateRef = useRef<CombatState | null>(null);
  const attemptFloorRef = useRef(0);
  const guardianRef = useRef<Monster | null>(null);
  const altSetupsRef = useRef<CompanionCombatSetup[]>([]);
  const pendingBuffTriggersRef = useRef<{ offensive_action: number; damage_taken: number; stat_food_use: number }>({
    offensive_action: 0,
    damage_taken: 0,
    stat_food_use: 0,
  });
  const pendingEnchantTriggersRef = useRef<{ offensive_action: number; damage_taken: number }>({
    offensive_action: 0,
    damage_taken: 0,
  });
  const consumableStateRef = useRef<ConsumableAutomationRuntimeState>(emptyConsumableAutomationState());
  const generationRef = useRef(0);
  const characterRef = useRef<Character | null>(character);
  const userRef = useRef<User | null>(user);

  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!user) return;
    return subscribeToInventory(user.uid, setInventory);
  }, [user]);

  function currentPlayerCombatType() {
    const c = characterRef.current ?? character;
    return resolveSpecDef(c.class, c.spec).combatType;
  }

  function computeMultipliers(floor: number, companionCount: number) {
    const affixes = affixesForFloor(floor);
    const partySize = 1 + companionCount;
    return {
      hp: towerHpMultiplier(floor, partySize) * towerAffixHpMultiplier(affixes),
      dmg: towerDamageMultiplier(floor) * towerAffixDamageMultiplier(affixes),
    };
  }

  function buildEncounterInput(c: Character, floor: number): EncounterSetupInput {
    const specDef = resolveSpecDef(c.class, c.spec);
    const { equipmentBonuses, talentTotals, buffTotals, enchantTotals, currentHp } = resolveCombatProfile(c, new Date());
    const extraDamageTakenPct = getExtraDamageTakenPct(c.spec, c.talentPicks);
    const companions = [...resolveActiveCompanionSetups(c), ...altSetupsRef.current];
    const { hp, dmg } = computeMultipliers(floor, companions.length);
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
      monster: guardianRef.current!,
      savedEquippedAbilityIds: c.equippedAbilityIds,
      trainedAbilityIds: c.trainedAbilityIds,
      savedAbilityConditions: c.abilityConditions,
      disabledAbilityIds: c.disabledAbilityIds,
      hasShieldEquipped: isShieldEquipped(c.equipment),
      companions,
      ...enchantTotals,
      monsterHpMultiplier: hp,
      monsterDamageMultiplier: dmg,
    };
  }

  function recordTriggers(events: CombatEvent[], killCount: number) {
    for (const event of events) {
      if (event.kind === 'damage_out') {
        pendingBuffTriggersRef.current.offensive_action++;
        pendingEnchantTriggersRef.current.offensive_action++;
      } else if (event.kind === 'damage_in') {
        pendingBuffTriggersRef.current.damage_taken++;
        pendingEnchantTriggersRef.current.damage_taken++;
      } else if (event.kind === 'miss_out') {
        pendingEnchantTriggersRef.current.offensive_action++;
      }
    }
    pendingBuffTriggersRef.current.stat_food_use += killCount;
  }

  function currentTickContext(): TickContext {
    const floor = attemptFloorRef.current;
    const companionCount = (combatStateRef.current?.party.length ?? 1) - 1;
    const { hp, dmg } = computeMultipliers(floor, companionCount);
    return {
      monster: guardianRef.current!,
      playerLevel: characterRef.current?.level ?? character.level,
      playerCombatType: currentPlayerCombatType(),
      monsterHpMultiplier: hp,
      monsterDamageMultiplier: dmg,
      consumableState: consumableStateRef.current,
    };
  }

  async function handleAttempt() {
    if (!user || phaseRef.current !== 'idle' || starting) return;
    setAttemptError(null);
    setResultInfo(null);
    setStarting(true);
    const floor = (character.towerHighestFloor ?? 0) + 1;
    try {
      const payResult = await payTowerAttemptCost(user.uid, character, floor);
      if (!payResult.success) {
        setAttemptError(payResult.reason ?? 'Could not start this attempt.');
        return;
      }
      const generation = ++generationRef.current;
      applyOptimisticUpdate((c) => ({ ...c, gold: c.gold - (payResult.costPaid ?? 0) }));
      const setups = await resolveActiveAltSetups(user.uid, character);
      if (generationRef.current !== generation) return;
      altSetupsRef.current = setups;
      attemptFloorRef.current = floor;
      guardianRef.current = guardianForFloor(floor);
      pendingBuffTriggersRef.current = { offensive_action: 0, damage_taken: 0, stat_food_use: 0 };
      pendingEnchantTriggersRef.current = { offensive_action: 0, damage_taken: 0 };
      consumableStateRef.current = buildConsumableAutomationState(character, inventory ?? { items: {} }, new Date());
      setLog([]);
      combatStateRef.current = createEncounterState(buildEncounterInput(character, floor));
      phaseRef.current = 'fighting';
      setPhase('fighting');
    } finally {
      setStarting(false);
    }
  }

  // The player-death flag is accepted for symmetry with the tick loop's
  // call site but deliberately unused here: a kill that lands the same tick
  // the Guardian dies still counts as a win (kills are always honored
  // regardless of what else happens that tick — see DungeonScreen.tsx's
  // identical "record kills, then separately check playerDied" ordering).
  async function finalizeAttempt(kills: KillReward[], _playerDiedFlag: boolean) {
    if (phaseRef.current !== 'fighting') return;
    phaseRef.current = 'result';
    setPhase('result');

    const state = combatStateRef.current;
    const currentUser = userRef.current;
    if (!state || !currentUser) return;

    const player = state.party.find((p) => p.isPlayer)!;
    const floor = attemptFloorRef.current;
    const won = kills.length > 0;
    const xpGained = Math.round(kills.reduce((sum, k) => sum + k.xpGained, 0));
    const goldGained = Math.round(kills.reduce((sum, k) => sum + k.goldGained, 0));
    const hpAfter = Math.max(0, player.hp);

    const buffTriggers = pendingBuffTriggersRef.current;
    const enchantTriggers = pendingEnchantTriggersRef.current;
    const consumableState = consumableStateRef.current;
    const currentCharacterForBuffs = characterRef.current ?? character;
    const hasBuffTriggers = buffTriggers.offensive_action > 0 || buffTriggers.damage_taken > 0 || buffTriggers.stat_food_use > 0;
    if (hasBuffTriggers) void consumeBuffCharges(currentUser.uid, currentCharacterForBuffs, buffTriggers);
    const hasEnchantTriggers = kills.length > 0 || enchantTriggers.offensive_action > 0 || enchantTriggers.damage_taken > 0;
    if (hasEnchantTriggers) {
      void consumeEnchantCharges(currentUser.uid, currentCharacterForBuffs, {
        offensive_action: enchantTriggers.offensive_action,
        damage_taken: enchantTriggers.damage_taken,
        completedEncounters: kills.length,
      });
    }
    const hasConsumableUsage =
      consumableState.offensiveChargesConsumed > 0 ||
      consumableState.defensiveChargesConsumed > 0 ||
      consumableState.healingUsed > 0 ||
      consumableState.manaUsed > 0;
    if (hasConsumableUsage && currentCharacterForBuffs.consumableAutomation) {
      void applyConsumableAutomationUsage(currentUser.uid, currentCharacterForBuffs.consumableAutomation, {
        offensiveChargesConsumed: consumableState.offensiveChargesConsumed,
        defensiveChargesConsumed: consumableState.defensiveChargesConsumed,
        healingUsed: consumableState.healingUsed,
        manaUsed: consumableState.manaUsed,
      });
    }

    try {
      const attemptResult = await applyTowerAttemptResult(currentUser.uid, currentCharacterForBuffs, {
        floor,
        won,
        xpGained,
        goldGained,
        hpAfter,
      });

      const fresh = await getCharacter(currentUser.uid);
      if (fresh) {
        let newLevel = fresh.level;
        while (newLevel < MAX_CHARACTER_LEVEL && fresh.xp >= characterXpForLevelV2(newLevel + 1)) {
          newLevel++;
        }
        if (newLevel !== fresh.level) {
          const restoredHp = resolveCombatProfile(fresh, new Date(), { level: newLevel }).maxHp;
          await setCharacterLevel(currentUser.uid, newLevel, restoredHp);
        }
      }

      setResultInfo({
        won,
        floor,
        xpGained,
        goldGained,
        newHighestFloor: attemptResult.newHighestFloor,
        droppedDown: attemptResult.droppedDown,
        milestoneItemId: attemptResult.milestoneItemId,
      });
    } finally {
      await refetch();
    }
  }

  // The tick loop runs for the lifetime of this screen (not just while
  // 'fighting') and simply no-ops outside that phase via phaseRef — same
  // "stable effect, fresh ref reads inside" pattern CombatScreen/
  // DungeonScreen use for their own always-mounted interval.
  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current !== 'fighting' || !combatStateRef.current) return;
      const ctx = currentTickContext();
      const result = advanceCombat(combatStateRef.current, ctx, 1);
      recordTriggers(result.events, result.kills.length);
      if (result.events.length > 0) {
        setLog((prev) => [...result.events, ...prev].slice(0, MAX_LOG_LINES));
      }
      if (result.kills.length > 0 || result.playerDied) {
        void finalizeAttempt(result.kills, result.playerDied);
        return;
      }
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving this screen mid-fight forfeits the attempt as a loss — see this
  // component's doc comment for why that's a deliberate v1 scope cut rather
  // than threading Tower through App.tsx's persistent activityNode slot.
  useEffect(() => {
    return () => {
      if (phaseRef.current === 'fighting') {
        void finalizeAttempt([], true);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualUse(abilityId: string) {
    const state = combatStateRef.current;
    if (!state || phaseRef.current !== 'fighting') return;
    const ctx = currentTickContext();
    const result = tryManualUseAbility(state, 'player', abilityId, ctx);
    if (!result) return;
    recordTriggers(result.events, result.kills.length);
    if (result.events.length > 0) {
      setLog((prev) => [...result.events, ...prev].slice(0, MAX_LOG_LINES));
    }
    if (result.kills.length > 0) {
      void finalizeAttempt(result.kills, false);
      return;
    }
    setTick((t) => t + 1);
  }

  function handleUseConsumable(itemId: string) {
    const state = combatStateRef.current;
    const currentUser = userRef.current;
    if (!state || phaseRef.current !== 'fighting' || !currentUser) return;
    const item = ITEMS[itemId];
    const effect = item?.consumableEffect;
    if (!effect || effect.recoveryFood) return;
    const currentCharacter = characterRef.current ?? character;
    if (remainingCooldownSeconds(currentCharacter, itemId, effect.cooldownSeconds, new Date()) > 0) return;

    const player = state.party.find((p) => p.isPlayer)!;
    if (effect.healAmount) {
      player.hp = Math.min(player.maxHp, player.hp + effect.healAmount);
    }
    if (effect.manaAmount && player.resources.mana) {
      player.resources.mana.current = Math.min(player.resources.mana.max, player.resources.mana.current + effect.manaAmount);
    }
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

  async function handleEquipConsumable(slot: 'food' | 'potion', itemId: string | null) {
    const currentUser = userRef.current;
    if (!currentUser) return;
    await setEquippedConsumable(currentUser.uid, slot, itemId);
    await refetch();
  }

  function handleContinue() {
    setResultInfo(null);
    setPhase('idle');
  }

  const floor = (character.towerHighestFloor ?? 0) + 1;
  const previewAffixes = affixesForFloor(floor);
  const previewGuardian = guardianForFloor(floor);
  const cost = towerAttemptCost(floor);
  const partySize = 1 + character.activeCompanionIds.length + character.activeAltSlots.length;
  const nextMilestone = TOWER_MILESTONE_FLOORS.find((f) => f >= floor);
  const failures = character.towerConsecutiveFailures ?? 0;

  const eligibilityError =
    character.level < MAX_CHARACTER_LEVEL
      ? `Requires character level ${MAX_CHARACTER_LEVEL}.`
      : partySize < REQUIRED_DUNGEON_PARTY_SIZE
        ? `Requires a full party of ${REQUIRED_DUNGEON_PARTY_SIZE} — you have ${partySize}/${REQUIRED_DUNGEON_PARTY_SIZE}.`
        : character.gold < cost
          ? `This floor costs ${cost} gold up front (you have ${Math.floor(character.gold)}).`
          : null;

  if (phase === 'idle') {
    return (
      <div className="tower-screen">
        <h2>The Tower of Infinity</h2>
        <p>
          Highest floor reached: <strong>{character.towerHighestFloor ?? 0}</strong>
          {failures > 0 && <> — {failures}/3 consecutive failures at this floor (a 3rd drops you back a floor)</>}
        </p>

        <h3>Floor {floor}</h3>
        <p>
          {previewGuardian.name}
          {previewAffixes.length > 0 && (
            <>
              {' '}— affixes:{' '}
              {previewAffixes.map((id) => TOWER_AFFIXES[id].name).join(', ')}
            </>
          )}
        </p>
        {previewAffixes.map((id) => (
          <p key={id}>
            <small>
              <strong>{TOWER_AFFIXES[id].name}:</strong> {TOWER_AFFIXES[id].description}
            </small>
          </p>
        ))}
        <p>Cost to attempt: {cost} gold</p>
        {nextMilestone && <p>Next reward at floor {nextMilestone}.</p>}

        {eligibilityError && <p className="error">{eligibilityError}</p>}
        {attemptError && <p className="error">{attemptError}</p>}

        <button onClick={() => void handleAttempt()} disabled={!!eligibilityError || starting}>
          {starting ? 'Starting…' : `Attempt Floor ${floor}`}
        </button>
      </div>
    );
  }

  if (phase === 'result' && resultInfo) {
    const milestoneItem = resultInfo.milestoneItemId ? ITEMS[resultInfo.milestoneItemId] : null;
    const milestoneRarity = milestoneItem ? inferItemRarity(milestoneItem) : null;
    return (
      <div className="tower-screen">
        <h2>The Tower of Infinity</h2>
        {resultInfo.won ? (
          <>
            <p>You defeated the Guardian of Floor {resultInfo.floor}!</p>
            <p>
              +{resultInfo.xpGained} XP{resultInfo.goldGained > 0 ? `, +${resultInfo.goldGained} gold` : ''}
            </p>
            {milestoneItem && (
              <p style={{ color: milestoneRarity ? RARITY_COLORS[milestoneRarity] : undefined }}>
                Milestone reward: {milestoneItem.name}!
              </p>
            )}
            <p>Highest floor is now {resultInfo.newHighestFloor}.</p>
          </>
        ) : (
          <>
            <p>You were defeated on Floor {resultInfo.floor}.</p>
            {resultInfo.droppedDown ? (
              <p>Three failures in a row — you've dropped back to floor {resultInfo.newHighestFloor}.</p>
            ) : (
              <p>Your HP will recover over time. Try again when you're ready.</p>
            )}
          </>
        )}
        <button onClick={handleContinue}>Continue</button>
      </div>
    );
  }

  if (!combatStateRef.current) return null;

  const state = combatStateRef.current;
  const player = state.party.find((p) => p.isPlayer)!;
  const companions = state.party.filter((p) => !p.isPlayer);
  const guardian = guardianRef.current!;

  return (
    <div className="tower-screen combat-screen">
      <h2>The Tower of Infinity</h2>
      <p>
        <small>Floor {attemptFloorRef.current}</small>
      </p>
      <h3>☠ {guardian.name}</h3>
      <p>
        <small>Leaving this screen now will forfeit the attempt as a loss.</small>
      </p>

      <MonsterPortrait monsterId={guardian.id} isBoss />
      <StatBar label="You" current={player.hp} max={player.maxHp} color={HEALTH_BAR_COLOR} />
      <ResourceBars combatant={player} />
      <StatusBadges combatant={player} />

      {companions.map((companion) => (
        <div key={companion.id}>
          <StatBar
            label={companion.name}
            current={companion.hp}
            max={companion.maxHp}
            color={HEALTH_BAR_COLOR}
          />
          <StatusBadges combatant={companion} />
        </div>
      ))}

      {state.enemies.map((enemy) => (
        <div key={enemy.id}>
          <StatBar label={enemy.name} current={enemy.hp} max={enemy.maxHp} color={ENEMY_HEALTH_BAR_COLOR} />
          <StatusBadges combatant={enemy} />
        </div>
      ))}

      <TickBar seconds={ATTACK_INTERVAL_SECONDS} color="var(--class-accent)" label="Attack rhythm" />

      <AbilityBar player={player} onUse={handleManualUse} />
      <ConsumablesBar
        character={character}
        inventoryItems={inventory?.items ?? {}}
        allowMana={true}
        allowRecoveryFood={false}
        onUse={handleUseConsumable}
        onEquip={handleEquipConsumable}
      />

      <CombatLog events={log} />
    </div>
  );
}

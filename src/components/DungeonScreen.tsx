import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { applyCombatResult, setCharacterLevel, getCharacter, advanceQuests, startActivity } from '../firebase/character';
import { subscribeToInventory } from '../firebase/inventory';
import {
  recordConsumableUse,
  remainingCooldownSeconds,
  consumeBuffCharges,
  setEquippedConsumable,
  applyConsumableAutomationUsage,
  consumeFeast,
} from '../firebase/consumables';
import { type BaseStat } from '../gameData/classStats';
import { consumeEnchantCharges } from '../firebase/enchanting';
import { DUNGEONS } from '../gameData/dungeons';
import { MONSTERS } from '../gameData/monsters';
import { notify } from '../utils/notifications';
import { ITEMS } from '../gameData/items';
import { inferItemRarity, RARITY_COLORS } from '../gameData/itemRarity';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { resolveCombatProfile } from '../gameData/resolveCombatProfile';
import {
  buildConsumableAutomationState,
  emptyConsumableAutomationState,
  type ConsumableAutomationRuntimeState,
} from '../gameData/consumableAutomation';
import { resolveActiveCompanionSetups, type CompanionCombatSetup } from '../gameData/companions';
import { ATTACK_INTERVAL_SECONDS, DUNGEON_TRASH_DAMAGE_MULTIPLIER, DUNGEON_BOSS_DAMAGE_MULTIPLIER } from '../gameData/combatFormulas';
import { isShieldEquipped } from '../gameData/equipmentStats';
import { characterXpForLevelV2, MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
import { checkAndUnlockNextSlot, resolveActiveAltSetups } from '../firebase/characterSlots';
import { equippedItemId } from '../gameData/equipmentStats';
import { shirtBonusForItemId, shirtBonusPct } from '../gameData/shirts';
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
import type { Monster } from '../gameData/types';
import type { Character, Inventory } from '../types/character';
import type { User } from 'firebase/auth';
import { TickBar } from './TickBar';
import { StatBar, HEALTH_BAR_COLOR, ENEMY_HEALTH_BAR_COLOR } from './StatBar';
import { MonsterLevelBadge } from './MonsterLevelBadge';
import { MonsterPortrait } from './MonsterPortrait';
import { StatusBadges } from './StatusBadges';
import { ResourceBars } from './ResourceBars';
import { AbilityBar } from './AbilityBar';
import { ConsumablesBar } from './ConsumablesBar';
import { CombatLog } from './CombatLog';
import { ItemSlot } from './ItemSlot';

const AUTOSAVE_INTERVAL_SECONDS = 10;
const MAX_LOG_LINES = 30;

interface SessionTotals {
  monstersDefeated: number;
  xpGained: number;
  goldGained: number;
  voidShardsGained: number;
}

const EMPTY_TOTALS: SessionTotals = { monstersDefeated: 0, xpGained: 0, goldGained: 0, voidShardsGained: 0 };

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
  // Equipment Rarity overhaul — a small rarity-colored "recent loot" strip.
  // Combat events (CombatLog) never carried loot item ids (only text), and
  // there was previously no in-page surface for loot at all beyond the OS
  // notify() toast (plain text, can't be colored) — this is new, not a
  // restyle of something that already rendered.
  const [recentLoot, setRecentLoot] = useState<{ itemId: string; quantity: number }[]>([]);
  const MAX_RECENT_LOOT = 8;
  const [fullClears, setFullClears] = useState(0);
  const [log, setLog] = useState<CombatEvent[]>([]);
  const [retreated, setRetreated] = useState(false);
  const [inventory, setInventory] = useState<Inventory | null>(null);

  const dungeon = DUNGEONS[dungeonId];
  const stageIndexRef = useRef(0);
  const currentMonsterRef = useRef<Monster>(MONSTERS[dungeon.stages[0]]);
  const fullClearsRef = useRef(0);
  // Persisted via the next autosave (see Character.dungeonClears) — unlike
  // fullClearsRef/bankedTotals above, which are this SESSION's count and
  // reset on reload, this feeds the lifetime total Phase 5's achievements
  // (gameData/achievements.ts) check against.
  const pendingDungeonClearsRef = useRef(0);
  const pendingLogRef = useRef<CombatEvent[]>([]);

  const combatStateRef = useRef<CombatState | null>(null);
  // Populated once, async, before the first createEncounterState call (see
  // the dungeonId setup effect below) — resolveActiveAltSetups needs a
  // Firestore read per recruited alt, which buildEncounterInput (called
  // synchronously from several places: setup, every tick, manual ability
  // use) can't do itself. Alts only ever fight in dungeons (same
  // "companions only fight in dungeons" rule as hired companions — see
  // ZoneScreen.tsx), so this ref lives here, not in CombatScreen.
  const altSetupsRef = useRef<CompanionCombatSetup[]>([]);
  const pendingKillsRef = useRef<KillReward[]>([]);
  const pendingQuestSignalsRef = useRef<QuestSignals>({ healingDone: 0, abilityUseCounts: {} });
  const pendingBuffTriggersRef = useRef<{ offensive_action: number; damage_taken: number; stat_food_use: number }>({
    offensive_action: 0,
    damage_taken: 0,
    stat_food_use: 0,
  });
  // Enchanting overhaul's charge counters — see CombatScreen.tsx's matching
  // pendingEnchantTriggersRef comment for why this is a separate tally from
  // pendingBuffTriggersRef above.
  const pendingEnchantTriggersRef = useRef<{ offensive_action: number; damage_taken: number }>({
    offensive_action: 0,
    damage_taken: 0,
  });
  // Herbalism/Alchemy overhaul's Part 8 automation — see CombatScreen.tsx's
  // matching comment; built once per run (the dungeonId setup effect below)
  // and mutated in place through every tick/manual-use via ctx.
  const consumableStateRef = useRef<ConsumableAutomationRuntimeState>(emptyConsumableAutomationState());
  // See CombatScreen.tsx's matching comment — guards against building
  // automation state before the inventory subscription below has
  // delivered its first snapshot (inventory starts as null), which
  // otherwise silently locked auto-potions/auto-eat out of the whole run.
  const consumableStateReadyRef = useRef(false);
  const retreatedRef = useRef(false);
  // Cooking overhaul Tier 3 — Feasts. Chosen ONCE per run via the pre-run
  // picker below (before createEncounterState's first call, so it's baked
  // into the player's/every companion's profile from the very first tick —
  // this engine computes stats once at encounter setup, never live) and
  // held for the run's whole lifetime, same client-session-only posture as
  // every other piece of dungeon run state (see this file's module doc
  // comment on why nothing here is written to CurrentActivity). Lasts
  // through a wipe/retreat since nothing here ever clears it until the
  // player actually leaves (onExit/a new dungeonId).
  const feastStatBonusesRef = useRef<Partial<Record<BaseStat, number>>>({});
  const [feastPending, setFeastPending] = useState(true);
  const [feastError, setFeastError] = useState<string | null>(null);
  // Dungeons never write to Character.currentActivity (see this component's
  // own doc comment above), so there's no CurrentActivity.equippedShirtItemId
  // snapshot to read here — this ref plays the same role, captured once at
  // run entry (the dungeonId setup effect below) rather than read live every
  // tick, so re-equipping a shirt mid-run (if the player even can) can't
  // retroactively change a run already in progress.
  const goldFindPctRef = useRef(0);

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
      pendingDungeonClearsRef.current++;
      pendingLogRef.current.push({
        message: `You cleared ${dungeon.name}! Looping back to the first stage.`,
        kind: 'status',
      });
    }
    // Cooking overhaul Tier 2 — Stat Food consumes exactly 1 charge per
    // COMPLETED ENCOUNTER (this function fires once per whole-wave clear,
    // regardless of stage size — see TickContext.nextMonster's doc
    // comment), never once per enemy in a multi_target wave.
    pendingBuffTriggersRef.current.stat_food_use++;
    stageIndexRef.current = (stageIndexRef.current + 1) % dungeon.stages.length;
    const next = MONSTERS[dungeon.stages[stageIndexRef.current]];
    currentMonsterRef.current = next;
    return next;
  }

  // The player's current combat-triangle type — read from the freshest
  // character data available (the ref during an active tick, falling back
  // to the render-time character before the ref is populated).
  function currentPlayerCombatType() {
    const c = characterRef.current ?? character;
    return resolveSpecDef(c.class, c.spec).combatType;
  }

  function notifyKills(kills: KillReward[]) {
    if (!characterRef.current?.notificationsEnabled) return;
    for (const kill of kills) {
      const lootLines = kill.loot.map((drop) => `${drop.quantity}x ${ITEMS[drop.itemId]?.name ?? drop.itemId}`);
      notify(`${MONSTERS[kill.monsterId]?.name ?? 'Monster'} defeated`, [
        `+${Math.round(kill.xpGained)} XP`,
        ...(kill.goldGained > 0 ? [`+${Math.round(kill.goldGained)} Gold`] : []),
        ...lootLines,
      ]);
    }
  }

  // How many enemies the CURRENT stage should field — only a dungeon's own
  // 'multi_target' stages ever field more than one, and even then never the
  // boss stage: the final fight is always a single capstone encounter, not
  // another wave, regardless of what the trash stages do.
  function currentEncounterSize(): number {
    if (dungeon.combatType !== 'multi_target' || currentMonsterRef.current.isBoss) return 1;
    return dungeon.encounterSize ?? 2;
  }

  // Divides the existing party-size HP scaling across the wave instead of
  // multiplying it again on top — a 2-enemy wave's TOTAL hp should be
  // comparable to a single-enemy wave's at the same party size, not double it.
  function currentMonsterHpMultiplier(companionCount: number): number {
    return (1 + companionCount) / currentEncounterSize();
  }

  // Combat/Rarity overhaul — the damage-side counterpart. Deliberately NOT
  // scaled by party size (unlike HP above): a dungeon's per-hit threat is
  // meant to challenge an undergeared party member regardless of how many
  // allies are along, not just add up to a bigger total HP bar to chew
  // through.
  function currentMonsterDamageMultiplier(): number {
    return currentMonsterRef.current.isBoss ? DUNGEON_BOSS_DAMAGE_MULTIPLIER : DUNGEON_TRASH_DAMAGE_MULTIPLIER;
  }

  function buildEncounterInput(c: Character): EncounterSetupInput {
    const specDef = resolveSpecDef(c.class, c.spec);
    const { equipmentBonuses, talentTotals, buffTotals, enchantTotals, currentHp } = resolveCombatProfile(c, new Date());
    // Cooking overhaul Tier 3 — Feasts fold into the SAME statBonuses pool
    // a Stat Food buff already uses (both just add — "stacks with personal
    // Stat Food" per the design brief), so the player needs zero new
    // CasterProfile plumbing. Mutating buffTotals.statBonuses directly
    // (rather than threading a new field through buildPlayerProfile) is
    // safe here: resolveCombatProfile's evaluateActiveBuffs call just
    // returned a fresh object this call owns outright.
    for (const [stat, value] of Object.entries(feastStatBonusesRef.current)) {
      const key = stat as BaseStat;
      buffTotals.statBonuses[key] = (buffTotals.statBonuses[key] ?? 0) + (value ?? 0);
    }
    const extraDamageTakenPct = getExtraDamageTakenPct(c.spec, c.talentPicks);
    // Feasts are party-wide — each companion/alt gets the exact same
    // feastStatBonuses folded into its OWN equipmentBonuses, which
    // buildCompanionProfile (combatEngine/engine.ts) already reads into
    // every stat formula exactly like the player's equipment, so this is
    // the only change companions need (no new profile field there either).
    const companions = [...resolveActiveCompanionSetups(c), ...altSetupsRef.current].map((companion) => ({
      ...companion,
      equipmentBonuses: (() => {
        const merged = { ...companion.equipmentBonuses };
        for (const [stat, value] of Object.entries(feastStatBonusesRef.current)) {
          const key = stat as BaseStat;
          merged[key] = (merged[key] ?? 0) + (value ?? 0);
        }
        return merged;
      })(),
    }));
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
      monster: currentMonsterRef.current,
      savedEquippedAbilityIds: c.equippedAbilityIds,
      trainedAbilityIds: c.trainedAbilityIds,
      savedAbilityConditions: c.abilityConditions,
      disabledAbilityIds: c.disabledAbilityIds,
      hasShieldEquipped: isShieldEquipped(c.equipment),
      companions,
      ...enchantTotals,
      // A dungeon is fixed-size group content (REQUIRED_DUNGEON_PARTY_SIZE,
      // enforced before the player can even enter — see ZoneScreen.tsx) —
      // scale the monster's HP by the full party size so a 5-person group
      // fighting it is a real fight instead of an instant kill, without
      // touching the per-hit damage formulas open-world combat already
      // relies on. Monster HP is otherwise purely a function of its level
      // (see combatFormulas.ts's monsterHp), so this has to happen here
      // rather than by inventing a per-monster "group HP" field. Divided
      // across the wave for a multi_target stage — see
      // currentMonsterHpMultiplier.
      monsterHpMultiplier: currentMonsterHpMultiplier(companions.length),
      monsterDamageMultiplier: currentMonsterDamageMultiplier(),
      encounterSize: currentEncounterSize(),
    };
  }

  // Guards initializeEncounter's async work below against a rapid dungeonId
  // change (unmount/remount) completing after a newer mount already reset
  // this screen's state — same role as the plain `cancelled` flag the old
  // single mount-effect IIFE used, just reusable from the Feast picker's
  // button handler too, which fires well after this effect returns.
  const mountGenerationRef = useRef(0);

  useEffect(() => {
    mountGenerationRef.current++;
    setBankedTotals(EMPTY_TOTALS);
    setFullClears(0);
    setLog([]);
    setRecentLoot([]);
    setRetreated(false);
    retreatedRef.current = false;
    pendingKillsRef.current = [];
    pendingQuestSignalsRef.current = { healingDone: 0, abilityUseCounts: {} };
    pendingBuffTriggersRef.current = { offensive_action: 0, damage_taken: 0, stat_food_use: 0 };
    pendingEnchantTriggersRef.current = { offensive_action: 0, damage_taken: 0 };
    stageIndexRef.current = 0;
    fullClearsRef.current = 0;
    pendingDungeonClearsRef.current = 0;
    currentMonsterRef.current = MONSTERS[dungeon.stages[0]];
    combatStateRef.current = null;
    consumableStateRef.current = emptyConsumableAutomationState();
    consumableStateReadyRef.current = false;
    goldFindPctRef.current = shirtBonusPct(shirtBonusForItemId(equippedItemId(character.equipment.shirt)), 'gold_find');
    feastStatBonusesRef.current = {};
    setFeastPending(true);
    setFeastError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dungeonId]);

  // Builds consumableStateRef as soon as real inventory data is available —
  // see CombatScreen.tsx's matching effect. Only ever builds once per run.
  useEffect(() => {
    if (!inventory || consumableStateReadyRef.current) return;
    consumableStateRef.current = buildConsumableAutomationState(characterRef.current ?? character, inventory, new Date());
    consumableStateReadyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dungeonId, inventory]);

  // Resolves alt setups (an async Firestore read per recruited alt — see
  // altSetupsRef's doc comment) and creates the actual encounter — held
  // back until the Feast choice below resolves, so whichever Feast (if
  // any) was picked is already baked into the player's/every companion's
  // profile from the very first tick (this engine computes stats once at
  // encounter setup, never live mid-fight).
  async function initializeEncounter() {
    const generation = mountGenerationRef.current;
    const setups = user ? await resolveActiveAltSetups(user.uid, character) : [];
    if (mountGenerationRef.current !== generation) return;
    altSetupsRef.current = setups;
    combatStateRef.current = createEncounterState(buildEncounterInput(character));
    setTick((t) => t + 1);
  }

  // Cooking overhaul Tier 3 — the pre-run Feast picker's "Enter" action.
  // itemId === null means "skip, no Feast" — still proceeds into the run.
  async function handleChooseFeast(itemId: string | null) {
    const generation = mountGenerationRef.current;
    if (itemId) {
      if (!user) return;
      setFeastError(null);
      const result = await consumeFeast(user.uid, itemId);
      if (mountGenerationRef.current !== generation) return;
      if (!result.success) {
        setFeastError(result.reason ?? 'Could not use that Feast.');
        return;
      }
      feastStatBonusesRef.current = ITEMS[itemId]?.consumableEffect?.feastStatBonuses ?? {};
      await refetch();
    }
    setFeastPending(false);
    void initializeEncounter();
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (retreatedRef.current || !combatStateRef.current) return;

      const companionCount = combatStateRef.current.party.length - 1;
      const ctx: TickContext = {
        monster: currentMonsterRef.current,
        playerLevel: characterRef.current?.level ?? character.level,
        playerCombatType: currentPlayerCombatType(),
        nextMonster,
        encounterSize: currentEncounterSize(),
        monsterHpMultiplier: currentMonsterHpMultiplier(companionCount),
        monsterDamageMultiplier: currentMonsterDamageMultiplier(),
        consumableState: consumableStateRef.current,
        goldFindPct: goldFindPctRef.current,
      };
      const result = advanceCombat(combatStateRef.current, ctx, 1);
      pendingKillsRef.current.push(...result.kills);
      notifyKills(result.kills);
      if (result.kills.some((k) => k.loot.length > 0)) {
        const newDrops = result.kills.flatMap((k) => k.loot);
        setRecentLoot((prev) => [...newDrops, ...prev].slice(0, MAX_RECENT_LOOT));
      }
      mergeQuestSignals(pendingQuestSignalsRef.current, result.questSignals);
      for (const event of result.events) {
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
    const questSignals = pendingQuestSignalsRef.current;
    const buffTriggers = pendingBuffTriggersRef.current;
    const enchantTriggers = pendingEnchantTriggersRef.current;
    const consumableState = consumableStateRef.current;
    const hasQuestSignals = questSignals.healingDone > 0 || Object.keys(questSignals.abilityUseCounts).length > 0;
    const hasBuffTriggers = buffTriggers.offensive_action > 0 || buffTriggers.damage_taken > 0 || buffTriggers.stat_food_use > 0;
    const hasEnchantTriggers = kills.length > 0 || enchantTriggers.offensive_action > 0 || enchantTriggers.damage_taken > 0;
    const hasConsumableUsage =
      consumableState.offensiveChargesConsumed > 0 ||
      consumableState.defensiveChargesConsumed > 0 ||
      consumableState.healingUsed > 0 ||
      consumableState.manaUsed > 0;
    if (kills.length === 0 && !hasQuestSignals && !hasBuffTriggers && !hasConsumableUsage) return;
    pendingKillsRef.current = [];
    pendingQuestSignalsRef.current = { healingDone: 0, abilityUseCounts: {} };
    pendingBuffTriggersRef.current = { offensive_action: 0, damage_taken: 0, stat_food_use: 0 };
    pendingEnchantTriggersRef.current = { offensive_action: 0, damage_taken: 0 };
    const dungeonClearsGained = pendingDungeonClearsRef.current;
    pendingDungeonClearsRef.current = 0;
    const currentCharacterForBuffs = characterRef.current ?? character;
    if (hasBuffTriggers) void consumeBuffCharges(currentUser.uid, currentCharacterForBuffs, buffTriggers);
    if (hasEnchantTriggers) {
      void consumeEnchantCharges(currentUser.uid, currentCharacterForBuffs, {
        offensive_action: enchantTriggers.offensive_action,
        damage_taken: enchantTriggers.damage_taken,
        completedEncounters: kills.length,
      });
    }
    if (hasConsumableUsage && currentCharacterForBuffs.consumableAutomation) {
      const usage = {
        offensiveChargesConsumed: consumableState.offensiveChargesConsumed,
        defensiveChargesConsumed: consumableState.defensiveChargesConsumed,
        healingUsed: consumableState.healingUsed,
        manaUsed: consumableState.manaUsed,
      };
      consumableState.offensiveChargesConsumed = 0;
      consumableState.defensiveChargesConsumed = 0;
      consumableState.healingUsed = 0;
      consumableState.manaUsed = 0;
      void applyConsumableAutomationUsage(currentUser.uid, currentCharacterForBuffs.consumableAutomation, usage);
    }

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
    applyOptimisticUpdate((c) => ({ ...c, xp: c.xp + xpGained, gold: c.gold + goldGained, voidShards: c.voidShards + voidShardsGained }));

    try {
      await applyCombatResult(currentUser.uid, {
        xpGained,
        goldGained,
        voidShardsGained,
        loot: lootToSave,
        hpAfter: player.hp,
        dungeonCleared: dungeonClearsGained > 0 ? { dungeonId, count: dungeonClearsGained } : undefined,
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
      }

      await refetch();
    } catch (err) {
      console.error('Dungeon autosave failed, will retry next cycle:', err);
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

  async function handleExit() {
    if (!retreatedRef.current) await autosave();
    await refetch();
    onExit();
  }

  // Equipment Rarity overhaul's Part 8 — leaves the party farming this same
  // dungeon while the player is away, instead of just abandoning the run.
  // Banks whatever this session already earned (same as a normal exit),
  // then writes a 'dungeon' currentActivity anchored at now so the next
  // long-absence WelcomeBackScreen can simulate the stage sequence offline
  // (see combatEngine/offlineCombat.ts's simulateOfflineDungeonCombat).
  // Companions/alts are re-resolved fresh from the character at that later
  // point (not snapshotted here) — same posture live entry already has.
  async function handleFarmOffline() {
    if (!user || retreatedRef.current) return;
    if (!retreatedRef.current) await autosave();
    await startActivity(user.uid, {
      type: 'dungeon',
      targetId: dungeonId,
      zoneId: dungeon.zoneId,
      equippedShirtItemId: equippedItemId(character.equipment.shirt),
      dungeonFeastStatBonuses: feastStatBonusesRef.current,
    });
    await refetch();
    onExit();
  }

  function handleManualUse(abilityId: string) {
    const state = combatStateRef.current;
    if (!state || retreatedRef.current) return;
    const ctx: TickContext = {
      monster: currentMonsterRef.current,
      playerLevel: characterRef.current?.level ?? character.level,
      playerCombatType: currentPlayerCombatType(),
      nextMonster,
      encounterSize: currentEncounterSize(),
      monsterHpMultiplier: currentMonsterHpMultiplier(state.party.length - 1),
      monsterDamageMultiplier: currentMonsterDamageMultiplier(),
      consumableState: consumableStateRef.current,
      goldFindPct: goldFindPctRef.current,
    };
    const result = tryManualUseAbility(state, 'player', abilityId, ctx);
    if (!result) return;
    pendingKillsRef.current.push(...result.kills);
    notifyKills(result.kills);
    mergeQuestSignals(pendingQuestSignalsRef.current, result.questSignals);
    for (const event of result.events) {
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
    // Cooking overhaul Tier 1 — Recovery Food is completely prohibited in
    // a dungeon/raid. ConsumablesBar's allowRecoveryFood={false} already
    // keeps it off this screen's UI entirely, but this handler never
    // trusts the UI alone (same posture as every server-revalidated action
    // in this codebase).
    if (effect.recoveryFood) return;
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

  if (feastPending) {
    const feastOptions = Object.values(ITEMS).filter(
      (item) => item.consumableEffect?.feastStatBonuses && (inventory?.items[item.id] ?? 0) > 0
    );
    return (
      <div className="dungeon-screen">
        <h2>{dungeon.name}</h2>
        <p>Choose a Feast for this run (optional). It lasts the whole run, even if your party wipes, and applies to every companion too.</p>
        {feastOptions.length === 0 ? (
          <p>You have no Feasts.</p>
        ) : (
          <div className="inventory-grid">
            {feastOptions.map((item) => (
              <ItemSlot
                key={item.id}
                item={item}
                quantity={inventory?.items[item.id] ?? 0}
                onClick={() => void handleChooseFeast(item.id)}
              />
            ))}
          </div>
        )}
        {feastError && <p className="error">{feastError}</p>}
        <button onClick={() => void handleChooseFeast(null)}>Enter without a Feast</button>
      </div>
    );
  }

  if (!combatStateRef.current) return null;

  const state = combatStateRef.current;
  const player = state.party.find((p) => p.isPlayer)!;
  const companions = state.party.filter((p) => !p.isPlayer);
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
        {monster.name} — <MonsterLevelBadge monsterLevel={monster.level} playerLevel={character.level} isElite={monster.isElite} />
      </h3>

      {!retreated && (
        <>
          <MonsterPortrait monsterId={monster.id} isBoss={monster.isBoss} />
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

          {state.enemies.map((enemy, i) => (
            <div key={enemy.id}>
              <StatBar
                label={state.enemies.length > 1 ? `${enemy.name} ${i + 1}` : enemy.name}
                current={enemy.hp}
                max={enemy.maxHp}
                color={ENEMY_HEALTH_BAR_COLOR}
              />
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
        </>
      )}

      {retreated ? (
        <p>
          You were forced to retreat! This run: {bankedTotals.monstersDefeated} defeated, +{bankedTotals.xpGained} XP,
          +{bankedTotals.goldGained} gold
          {bankedTotals.voidShardsGained > 0 ? `, +${bankedTotals.voidShardsGained} Void Shards` : ''}, {fullClears}{' '}
          full clear{fullClears === 1 ? '' : 's'}. Your HP will recover over time.
        </p>
      ) : (
        <p>
          This run: {bankedTotals.monstersDefeated} defeated, +{bankedTotals.xpGained} XP, +{bankedTotals.goldGained}{' '}
          gold{bankedTotals.voidShardsGained > 0 ? `, +${bankedTotals.voidShardsGained} Void Shards` : ''}, {fullClears}{' '}
          full clear{fullClears === 1 ? '' : 's'}
        </p>
      )}

      {recentLoot.length > 0 && (
        <div className="dungeon-recent-loot">
          <strong>Recent loot:</strong>{' '}
          {recentLoot.map((drop, i) => {
            const dropItem = ITEMS[drop.itemId];
            const rarity = dropItem ? inferItemRarity(dropItem) : null;
            return (
              <span key={i} style={{ color: rarity ? RARITY_COLORS[rarity] : undefined, marginRight: 8 }}>
                {drop.quantity}x {dropItem?.name ?? drop.itemId}
              </span>
            );
          })}
        </div>
      )}

      <button onClick={handleExit}>Exit Dungeon</button>
      {!retreated && (
        <button onClick={() => void handleFarmOffline()} title="Leave your party here to keep clearing this dungeon while you're away.">
          Leave Party Farming (Offline)
        </button>
      )}

      <CombatLog events={log} />
    </div>
  );
}

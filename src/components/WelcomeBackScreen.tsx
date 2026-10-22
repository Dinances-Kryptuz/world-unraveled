import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { LIVE_SESSION_THRESHOLD_SECONDS } from '../gameData/activityEngine';
import {
  resolveCraftingOffline,
  resolveDisenchantQueueOffline,
  type CraftingRecipeLike,
  type CraftingShirtBonuses,
  type DisenchantQueueItemInput,
} from '../gameData/craftingEngine';
import { buildCraftingMasteryInputs, buildCraftingProfessionResultOptions } from '../gameData/craftingMasteryInputs';
import { resolveGatheringOffline, type GatheringResourceLike, type GatheringShirtBonuses } from '../gameData/gatheringEngine';
import { herbZoneOf } from '../gameData/herbs';
import { MONSTERS } from '../gameData/monsters';
import { GATHER_NODES, FISHING_HOLES } from '../gameData/zones';
import { RECIPES } from '../gameData/recipes';
import { ITEMS } from '../gameData/items';
import { disenchantRequiredSkill, disenchantXpAward, disenchantYieldRange } from '../gameData/enchanting';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { resolveCombatProfile } from '../gameData/resolveCombatProfile';
import { simulateOfflineCombat, simulateOfflineDungeonCombat } from '../combatEngine/offlineCombat';
import { DUNGEONS } from '../gameData/dungeons';
import { resolveActiveCompanionSetups } from '../gameData/companions';
import { resolveActiveAltSetups } from '../firebase/characterSlots';
import { isShieldEquipped, getInnateWeaponProc } from '../gameData/equipmentStats';
import { type BaseStat } from '../gameData/classStats';
import { getProfessionState, maxSkillForUnlockedTier, PROFESSION_CATEGORY } from '../gameData/professionTiers';
import { getInventory, isLocked } from '../firebase/inventory';
import {
  applyCombatResult,
  setCharacterLevel,
  applyGatheringProfessionResult,
  applyCraftingProfessionResult,
  advanceQuests,
  touchActivityStartedAt,
} from '../firebase/character';
import { applyFishingResult } from '../firebase/professions';
import { applyConsumableAutomationUsage } from '../firebase/consumables';
import { consumeEnchantCharges, applyDisenchantQueueResult } from '../firebase/enchanting';
import { checkAndUnlockNextSlot } from '../firebase/characterSlots';
import { MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
import { buildConsumableAutomationState } from '../gameData/consumableAutomation';
import { shirtBonusForItemId, shirtBonusPct } from '../gameData/shirts';
import type { Character, CurrentActivity } from '../types/character';

export function isLongAbsence(activity: CurrentActivity): boolean {
  if (!activity.startedAt) return false;
  const elapsedSeconds = (Date.now() - activity.startedAt.getTime()) / 1000;
  return elapsedSeconds > LIVE_SESSION_THRESHOLD_SECONDS;
}

export function WelcomeBackScreen({
  character,
  onContinue,
}: {
  character: Character;
  onContinue: () => void;
}) {
  const { user } = useAuth();
  const { refetch } = useCharacter();
  const [summary, setSummary] = useState<string | null>(null);

  // Previews only (see each branch's own comment) — built from the same
  // CurrentActivity.equippedShirtItemId snapshot the real screens use, so
  // this estimate matches what the real autosave will actually persist.
  function gatheringShirtBonuses(shirtItemId: string | null | undefined): GatheringShirtBonuses {
    const shirtBonus = shirtBonusForItemId(shirtItemId);
    return {
      gatheringSpeedPct: shirtBonusPct(shirtBonus, 'gathering_speed'),
      professionXpPct: shirtBonusPct(shirtBonus, 'profession_xp'),
      masteryXpPct: shirtBonusPct(shirtBonus, 'mastery_xp'),
    };
  }
  function craftingShirtBonuses(shirtItemId: string | null | undefined): CraftingShirtBonuses {
    const shirtBonus = shirtBonusForItemId(shirtItemId);
    return {
      craftingSpeedPct: shirtBonusPct(shirtBonus, 'crafting_speed'),
      professionXpPct: shirtBonusPct(shirtBonus, 'profession_xp'),
      masteryXpPct: shirtBonusPct(shirtBonus, 'mastery_xp'),
      materialPreservePct: shirtBonusPct(shirtBonus, 'material_preserve'),
    };
  }

  useEffect(() => {
    async function compute() {
      const activity = character.currentActivity;
      if (!activity.startedAt || !activity.targetId) {
        setSummary('Welcome back!');
        return;
      }
      const now = new Date();

      if (activity.type === 'combat') {
        const monster = MONSTERS[activity.targetId];
        const specDef = resolveSpecDef(character.class, character.spec);
        const extraDmgTaken = getExtraDamageTakenPct(character.spec, character.talentPicks);
        const {
          equipmentBonuses: equipBonuses,
          talentTotals,
          buffTotals,
          currentHp: startingHp,
        } = resolveCombatProfile(character, now, { hpAt: activity.startedAt });
        // Herbalism/Alchemy overhaul's Part 8 automation — built from
        // inventory as of the moment the player went offline (activity.
        // startedAt is also what cooldownRemaining is measured from, see
        // buildConsumableAutomationState's remainingCooldown), then mutated
        // in place through the WHOLE offline window by the exact same
        // tick-by-tick engine live combat uses (see offlineCombat.ts).
        const offlineInventory = user ? await getInventory(user.uid) : { items: {} };
        const consumableState = buildConsumableAutomationState(character, offlineInventory, activity.startedAt);

        const result = simulateOfflineCombat({
          startedAt: activity.startedAt,
          now,
          cls: character.class,
          specId: character.spec,
          specDef,
          talentTotals,
          buffTotals,
          extraDamageTakenPct: extraDmgTaken,
          equipmentBonuses: equipBonuses,
          startingLevel: character.level,
          startingXp: character.xp,
          startingHp,
          savedEquippedAbilityIds: character.equippedAbilityIds,
          trainedAbilityIds: character.trainedAbilityIds,
          savedAbilityConditions: character.abilityConditions,
          disabledAbilityIds: character.disabledAbilityIds,
          hasShieldEquipped: isShieldEquipped(character.equipment),
          innateWeaponProc: getInnateWeaponProc(character.equipment),
          monster,
          consumableState,
          goldFindPct: shirtBonusPct(shirtBonusForItemId(activity.equippedShirtItemId), 'gold_find'),
          // Companions only fight in dungeons — idle/offline catch-up is
          // always open-world solo, same as live open-world combat.
          enchantments: character.enchantments,
          enchantmentCharges: character.enchantmentCharges,
        });

        if (user) {
          await applyCombatResult(user.uid, {
            xpGained: result.xpGained,
            goldGained: result.goldGained,
            voidShardsGained: result.voidShardsGained,
            loot: result.loot,
            hpAfter: result.hpAfter,
          });
          if (result.finalLevel !== character.level) {
            await setCharacterLevel(user.uid, result.finalLevel, result.hpAfter);
            if (result.finalLevel >= MAX_CHARACTER_LEVEL) void checkAndUnlockNextSlot(user.uid);
          }
          if (result.finalConsumableState) {
            const fcs = result.finalConsumableState;
            const usage = {
              offensiveChargesConsumed: fcs.offensiveChargesConsumed,
              defensiveChargesConsumed: fcs.defensiveChargesConsumed,
              healingUsed: fcs.healingUsed,
              manaUsed: fcs.manaUsed,
            };
            const autoEat = fcs.autoEatUsed > 0 && fcs.autoEat?.itemId ? { used: fcs.autoEatUsed, itemId: fcs.autoEat.itemId } : undefined;
            if (
              usage.offensiveChargesConsumed > 0 ||
              usage.defensiveChargesConsumed > 0 ||
              usage.healingUsed > 0 ||
              usage.manaUsed > 0 ||
              autoEat
            ) {
              await applyConsumableAutomationUsage(user.uid, character.equippedConsumables.potion, usage, autoEat);
            }
          }
          const { offensiveAction, damageTaken } = result.enchantTriggerCounts;
          if (offensiveAction > 0 || damageTaken > 0 || result.monstersDefeated > 0) {
            await consumeEnchantCharges(user.uid, character, {
              offensive_action: offensiveAction,
              damage_taken: damageTaken,
              completedEncounters: result.monstersDefeated,
            });
          }
          // Deliberately NOT refetching here — the persisted write resets
          // currentActivity.startedAt to now, which would make
          // isLongAbsence() go false and cause ZoneScreen to swap this
          // screen out from under the player before they've even read the
          // summary. handleContinue() below refetches once they dismiss it.
        }

        const retreatNote = result.forcedRetreat ? ' You were forced to retreat before your time was up.' : '';
        const levelUpNote = result.finalLevel !== character.level ? ` You reached level ${result.finalLevel}!` : '';
        const voidShardsNote = result.voidShardsGained > 0 ? ` and ${result.voidShardsGained} Void Shards` : '';
        setSummary(
          `While you were away, you defeated ${result.monstersDefeated} ${monster.name}${
            result.monstersDefeated === 1 ? '' : 's'
          }, earning ${result.xpGained} XP and ${result.goldGained} gold${voidShardsNote}.${retreatNote}${levelUpNote}`
        );
      } else if (activity.type === 'dungeon') {
        // Equipment Rarity overhaul's Part 8 — offline/overnight dungeon
        // farming. Same shape as the 'combat' branch above, but fights the
        // dungeon's fixed stage sequence with the player's CURRENT
        // companions/alts (resolved fresh here, not snapshotted — same
        // "companions only fight in dungeons, always at this character's
        // level" rule live entry already follows), and folds in whichever
        // Feast (if any) was active when the party was left farming (see
        // CurrentActivity.dungeonFeastStatBonuses).
        const dungeon = DUNGEONS[activity.targetId];
        const specDef = resolveSpecDef(character.class, character.spec);
        const {
          equipmentBonuses: equipBonuses,
          talentTotals,
          buffTotals,
          currentHp: startingHp,
        } = resolveCombatProfile(character, now, { hpAt: activity.startedAt });
        const feastBonuses = activity.dungeonFeastStatBonuses ?? {};
        for (const [stat, value] of Object.entries(feastBonuses)) {
          const key = stat as BaseStat;
          buffTotals.statBonuses[key] = (buffTotals.statBonuses[key] ?? 0) + (value ?? 0);
        }
        const extraDmgTaken = getExtraDamageTakenPct(character.spec, character.talentPicks);
        const offlineInventory = user ? await getInventory(user.uid) : { items: {} };
        const consumableState = buildConsumableAutomationState(character, offlineInventory, activity.startedAt);
        const companions = [...resolveActiveCompanionSetups(character), ...(user ? await resolveActiveAltSetups(user.uid, character) : [])].map(
          (companion) => ({
            ...companion,
            equipmentBonuses: (() => {
              const merged = { ...companion.equipmentBonuses };
              for (const [stat, value] of Object.entries(feastBonuses)) {
                const key = stat as BaseStat;
                merged[key] = (merged[key] ?? 0) + (value ?? 0);
              }
              return merged;
            })(),
          })
        );

        const result = simulateOfflineDungeonCombat({
          startedAt: activity.startedAt,
          now,
          cls: character.class,
          specId: character.spec,
          specDef,
          talentTotals,
          buffTotals,
          extraDamageTakenPct: extraDmgTaken,
          equipmentBonuses: equipBonuses,
          startingLevel: character.level,
          startingXp: character.xp,
          startingHp,
          savedEquippedAbilityIds: character.equippedAbilityIds,
          trainedAbilityIds: character.trainedAbilityIds,
          savedAbilityConditions: character.abilityConditions,
          disabledAbilityIds: character.disabledAbilityIds,
          hasShieldEquipped: isShieldEquipped(character.equipment),
          innateWeaponProc: getInnateWeaponProc(character.equipment),
          stages: dungeon.stages.map((id) => MONSTERS[id]),
          dungeonCombatType: dungeon.combatType,
          dungeonEncounterSize: dungeon.encounterSize,
          companions,
          consumableState,
          goldFindPct: shirtBonusPct(shirtBonusForItemId(activity.equippedShirtItemId), 'gold_find'),
          enchantments: character.enchantments,
          enchantmentCharges: character.enchantmentCharges,
        });

        if (user) {
          await applyCombatResult(user.uid, {
            xpGained: result.xpGained,
            goldGained: result.goldGained,
            voidShardsGained: result.voidShardsGained,
            loot: result.loot,
            hpAfter: result.hpAfter,
            dungeonCleared: result.dungeonClearsGained > 0 ? { dungeonId: activity.targetId, count: result.dungeonClearsGained } : undefined,
          });
          if (result.finalLevel !== character.level) {
            await setCharacterLevel(user.uid, result.finalLevel, result.hpAfter);
            if (result.finalLevel >= MAX_CHARACTER_LEVEL) void checkAndUnlockNextSlot(user.uid);
          }
          if (result.finalConsumableState) {
            const fcs = result.finalConsumableState;
            const usage = {
              offensiveChargesConsumed: fcs.offensiveChargesConsumed,
              defensiveChargesConsumed: fcs.defensiveChargesConsumed,
              healingUsed: fcs.healingUsed,
              manaUsed: fcs.manaUsed,
            };
            if (usage.offensiveChargesConsumed > 0 || usage.defensiveChargesConsumed > 0 || usage.healingUsed > 0 || usage.manaUsed > 0) {
              await applyConsumableAutomationUsage(user.uid, character.equippedConsumables.potion, usage);
            }
          }
          const { offensiveAction, damageTaken } = result.enchantTriggerCounts;
          if (offensiveAction > 0 || damageTaken > 0 || result.monstersDefeated > 0) {
            await consumeEnchantCharges(user.uid, character, {
              offensive_action: offensiveAction,
              damage_taken: damageTaken,
              completedEncounters: result.monstersDefeated,
            });
          }
          // Deliberately NOT refetching here — same reasoning as the
          // 'combat' branch above (applyCombatResult's own
          // currentActivity.startedAt bump would otherwise race
          // isLongAbsence()).
        }

        const retreatNote = result.forcedRetreat ? ' Your party was forced to retreat before your time was up.' : '';
        const levelUpNote = result.finalLevel !== character.level ? ` You reached level ${result.finalLevel}!` : '';
        const voidShardsNote = result.voidShardsGained > 0 ? ` and ${result.voidShardsGained} Void Shards` : '';
        const clearsNote =
          result.dungeonClearsGained > 0
            ? ` Your party cleared ${dungeon.name} ${result.dungeonClearsGained} time${result.dungeonClearsGained === 1 ? '' : 's'}.`
            : '';
        setSummary(
          `While you were away, your party in ${dungeon.name} defeated ${result.monstersDefeated} enem${
            result.monstersDefeated === 1 ? 'y' : 'ies'
          }, earning ${result.xpGained} XP and ${result.goldGained} gold${voidShardsNote}.${clearsNote}${retreatNote}${levelUpNote}`
        );
      } else if (activity.type === 'gathering') {
        // All 4 gathering professions (Mining/Herbalism/Skinning/Fishing's
        // own branch below) now share gatheringEngine.ts's 1-100 XP+Mastery
        // engine — no more branching on usesMasteryEngine here. Persists
        // through the same writer GatheringScreen's own autosave uses, so
        // the catch-up is actually banked instead of just previewed.
        const node = GATHER_NODES[activity.targetId];
        const itemName = ITEMS[node.itemId]?.name ?? node.itemId;
        const prof = getProfessionState(character.professions, node.profession);
        const masteryState = prof.mastery?.[node.id] ?? { level: 0, xp: 0 };
        const herbZoneId = node.profession === 'herbalism' ? herbZoneOf(node.itemId) : undefined;
        const nodeLike: GatheringResourceLike = {
          itemId: node.itemId,
          baseXp: node.baseXp,
          secondsPerAction: node.secondsPerAction,
          requiredLevel: node.requiredLevel,
          rareBonus: node.rareBonus,
        };
        const result = resolveGatheringOffline(
          activity.startedAt,
          now,
          nodeLike,
          prof.level,
          prof.xp,
          masteryState.level,
          masteryState.xp,
          maxSkillForUnlockedTier(node.profession, prof.unlockedTier),
          0,
          herbZoneId ? { zoneMasteryStartingXp: character.herbalismZoneMastery?.[herbZoneId]?.xp ?? 0 } : undefined,
          gatheringShirtBonuses(activity.equippedShirtItemId)
        );
        const levelUpNote = result.finalSkill !== prof.level ? ` Your ${node.profession} level reached ${result.finalSkill}!` : '';
        const wholeQuantity = Math.floor(result.quantityGained);
        const wholeBonus = Math.floor(result.rareBonusQuantity);
        if (user && (wholeQuantity > 0 || wholeBonus > 0 || result.professionXpGained > 0)) {
          await applyGatheringProfessionResult(user.uid, node.profession, node.id, character, {
            itemId: node.itemId,
            quantity: wholeQuantity,
            rareBonusItemId: node.rareBonus?.itemId,
            rareBonusQuantity: wholeBonus,
            newSkillLevel: result.finalSkill,
            newSkillXp: result.finalSkillXp,
            newMasteryLevel: result.finalMasteryLevel,
            newMasteryXp: result.finalMasteryXp,
            ...(herbZoneId
              ? { herbalismZoneMastery: { zoneId: herbZoneId, xpGained: result.herbalismZoneMasteryXpGained ?? 0 } }
              : {}),
          });
          const events = [{ type: 'gather' as const, itemId: node.itemId, count: wholeQuantity }];
          if (node.rareBonus && wholeBonus > 0) events.push({ type: 'gather' as const, itemId: node.rareBonus.itemId, count: wholeBonus });
          await advanceQuests(user.uid, character, events);
          await touchActivityStartedAt(user.uid);
        }
        setSummary(`While you were away, you gathered ${wholeQuantity} ${itemName}.${levelUpNote}`);
      } else if (activity.type === 'crafting') {
        // All 6 crafting professions now share craftingEngine.ts's 1-100
        // XP+Mastery engine — Mining's Smelting recipes land here too
        // (tagged to a gathering-category profession) but never earn
        // Mining XP/Mastery of their own, per the same earnsProfessionXp
        // split CraftingScreen uses. Uses the same craftingMasteryInputs.ts
        // helpers CraftingScreen's own autosave uses, so both call sites
        // share identical mastery-axis logic.
        const recipe = RECIPES[activity.targetId];
        const inventory = user ? await getInventory(user.uid) : { items: {} };
        const prof = getProfessionState(character.professions, recipe.profession);
        const masteryState = prof.mastery?.[recipe.id] ?? { level: 0, xp: 0 };
        const recipeLike: CraftingRecipeLike = {
          resultItemId: recipe.resultItemId,
          resultQuantity: recipe.resultQuantity,
          baseXp: recipe.xpAward,
          craftSeconds: recipe.craftSeconds,
          requiredSkill: recipe.requiredSkill,
          materials: recipe.materials,
          goldCost: recipe.goldCost,
        };
        const { materialMasteryInput, alchemyZoneMasteryInput, enchantingZoneMasteryInput, cookingZoneMasteryInput, anyZoneOrMaterialMastery, material } =
          buildCraftingMasteryInputs(character, recipe);
        const result = resolveCraftingOffline(
          activity.startedAt,
          now,
          recipeLike,
          prof.level,
          prof.xp,
          anyZoneOrMaterialMastery ? 0 : masteryState.level,
          anyZoneOrMaterialMastery ? 0 : masteryState.xp,
          maxSkillForUnlockedTier(recipe.profession, prof.unlockedTier),
          inventory.items,
          character.gold,
          materialMasteryInput,
          alchemyZoneMasteryInput,
          craftingShirtBonuses(activity.equippedShirtItemId),
          enchantingZoneMasteryInput,
          cookingZoneMasteryInput
        );
        const earnsProfessionXp = PROFESSION_CATEGORY[recipe.profession] === 'production';
        const levelUpNote =
          earnsProfessionXp && result.finalSkill !== prof.level
            ? ` Your ${recipe.profession} level reached ${result.finalSkill}!`
            : '';
        const wholeCrafted = Math.floor(result.itemsCrafted);
        if (user && (wholeCrafted > 0 || result.professionXpGained > 0)) {
          await applyCraftingProfessionResult(
            user.uid,
            recipe.profession,
            recipe.id,
            character,
            buildCraftingProfessionResultOptions(
              recipe,
              result,
              { materialMasteryInput, alchemyZoneMasteryInput, enchantingZoneMasteryInput, cookingZoneMasteryInput, anyZoneOrMaterialMastery, material },
              wholeCrafted,
              earnsProfessionXp
            )
          );
          await touchActivityStartedAt(user.uid);
        }
        setSummary(`While you were away, you crafted ${wholeCrafted} ${recipe.name}.${levelUpNote}`);
      } else if (activity.type === 'fishing') {
        // Fishing shares gatheringEngine.ts's engine with Mining/Herbalism/
        // Skinning — see the gathering branch above for the same persisting
        // pattern, with the hole's catchChance baked into the resolver.
        const hole = FISHING_HOLES[activity.targetId];
        const itemName = ITEMS[hole.itemId]?.name ?? hole.itemId;
        const prof = getProfessionState(character.professions, 'fishing');
        const holeLike: GatheringResourceLike = {
          itemId: hole.itemId,
          baseXp: hole.baseXp,
          secondsPerAction: hole.secondsPerAction,
          requiredLevel: hole.requiredLevel,
          catchChance: hole.catchChance,
          rareBonus: hole.rareBonus,
        };
        const result = resolveGatheringOffline(
          activity.startedAt,
          now,
          holeLike,
          prof.level,
          prof.xp,
          0,
          0,
          maxSkillForUnlockedTier('fishing', prof.unlockedTier),
          0,
          undefined,
          gatheringShirtBonuses(activity.equippedShirtItemId),
          { zoneMasteryStartingXp: character.fishingZoneMastery?.[hole.zoneId]?.xp ?? 0 }
        );
        const levelUpNote = result.finalSkill !== prof.level ? ` Your Fishing level reached ${result.finalSkill}!` : '';
        const wholeQuantity = Math.floor(result.quantityGained);
        const wholeBonus = Math.floor(result.rareBonusQuantity);
        if (user && (wholeQuantity > 0 || wholeBonus > 0 || result.professionXpGained > 0)) {
          await applyFishingResult(user.uid, character, {
            itemId: hole.itemId,
            quantity: wholeQuantity,
            rareBonusItemId: hole.rareBonus?.itemId,
            rareBonusQuantity: wholeBonus,
            newSkillLevel: result.finalSkill,
            newSkillXp: result.finalSkillXp,
            fishingZoneMastery: { zoneId: hole.zoneId, xpGained: result.fishingZoneMasteryXpGained ?? 0 },
          });
          const events = [{ type: 'gather' as const, itemId: hole.itemId, count: wholeQuantity }];
          if (hole.rareBonus && wholeBonus > 0) events.push({ type: 'gather' as const, itemId: hole.rareBonus.itemId, count: wholeBonus });
          await advanceQuests(user.uid, character, events);
          await touchActivityStartedAt(user.uid);
        }
        setSummary(
          wholeQuantity >= 1
            ? `While you were away, you caught ${wholeQuantity} ${itemName}.${levelUpNote}`
            : 'While you were away, the fish weren’t biting.'
        );
      } else if (activity.type === 'disenchanting') {
        // Rewritten to match DisenchantingScreen's own autosave exactly:
        // the REAL live resolver is queue-aware (resolveDisenchantQueueOffline),
        // processing the "current" item (targetId/disenchantInstanceId/
        // disenchantQuantity) PLUS everything still queued
        // (currentActivity.disenchantQueue) in one pass — not just the
        // single current item the old preview-only branch here looked at.
        const item = ITEMS[activity.targetId];
        if (!item) {
          setSummary('Welcome back!');
        } else {
          const inventory = user ? await getInventory(user.uid) : { items: {} };
          const owned = inventory.items[activity.targetId] ?? 0;
          const requested = activity.disenchantQuantity ?? 1;
          const yieldRange = disenchantYieldRange(item);
          const current: DisenchantQueueItemInput = {
            itemId: activity.targetId,
            instanceId: activity.disenchantInstanceId,
            requiredSkill: disenchantRequiredSkill(item),
            baseXp: disenchantXpAward(item),
            yieldItemId: yieldRange.itemId,
            yieldMin: yieldRange.min,
            yieldMax: yieldRange.max,
            maxQuantity: Math.min(requested, owned),
          };
          const queueItems: DisenchantQueueItemInput[] = (activity.disenchantQueue ?? [])
            .map((q): DisenchantQueueItemInput | null => {
              const queuedItem = ITEMS[q.itemId];
              if (!queuedItem) return null;
              const queuedYieldRange = disenchantYieldRange(queuedItem);
              return {
                itemId: q.itemId,
                instanceId: q.instanceId,
                requiredSkill: disenchantRequiredSkill(queuedItem),
                baseXp: disenchantXpAward(queuedItem),
                yieldItemId: queuedYieldRange.itemId,
                yieldMin: queuedYieldRange.min,
                yieldMax: queuedYieldRange.max,
                maxQuantity: q.quantity,
              };
            })
            .filter((q): q is DisenchantQueueItemInput => q !== null);
          const freshInventory = user ? await getInventory(user.uid) : inventory;
          const eligible = [current, ...queueItems].filter((entry) => !isLocked(freshInventory, entry.instanceId ?? entry.itemId));

          const prof = getProfessionState(character.professions, 'enchanting');
          const salvageBonusPct = shirtBonusPct(shirtBonusForItemId(activity.equippedShirtItemId), 'salvage_bonus');
          const result = resolveDisenchantQueueOffline(
            eligible,
            activity.startedAt,
            now,
            prof.level,
            prof.xp,
            maxSkillForUnlockedTier('enchanting', prof.unlockedTier),
            salvageBonusPct
          );
          const totalDisenchanted = result.perItem.reduce((sum, entry) => sum + entry.itemsDisenchanted, 0);
          const levelUpNote =
            result.finalSkill !== prof.level ? ` Your Enchanting level reached ${result.finalSkill}!` : '';
          if (user && result.perItem.length > 0) {
            await applyDisenchantQueueResult(user.uid, result.perItem, result.finalSkill, result.finalSkillXp);
            await touchActivityStartedAt(user.uid);
          }
          setSummary(
            totalDisenchanted > 0
              ? `While you were away, you disenchanted ${totalDisenchanted} item${totalDisenchanted === 1 ? '' : 's'}.${levelUpNote}`
              : 'While you were away, you had nothing left to disenchant.'
          );
        }
      } else {
        setSummary('Welcome back!');
      }
    }
    compute().catch((err) => {
      console.error('Welcome back calculation failed:', err);
      setSummary("Welcome back! (Couldn't calculate exact offline progress, but everything already saved is safe.)");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleContinue() {
    await refetch();
    onContinue();
  }

  return (
    <div className="welcome-back-screen">
      <h2>Welcome Back</h2>
      <p>{summary ?? 'Calculating what happened while you were away…'}</p>
      <button onClick={handleContinue} disabled={summary === null}>
        Continue
      </button>
    </div>
  );
}

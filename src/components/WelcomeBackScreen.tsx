import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { resolveGathering, resolveCrafting, resolveFishing, LIVE_SESSION_THRESHOLD_SECONDS } from '../gameData/activityEngine';
import {
  resolveMasteryGatheringOffline,
  resolveMasteryCraftingOffline,
  usesMasteryEngine,
  type MasteryGatherNodeLike,
  type MasteryCraftRecipeLike,
} from '../gameData/masteryEngine';
import { MONSTERS } from '../gameData/monsters';
import { GATHER_NODES, FISHING_HOLES } from '../gameData/zones';
import { RECIPES } from '../gameData/recipes';
import { ITEMS } from '../gameData/items';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { simulateOfflineCombat } from '../combatEngine/offlineCombat';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { getProfessionState, maxSkillForUnlockedTier } from '../gameData/professionTiers';
import { evaluateActiveBuffs } from '../gameData/buffs';
import { getInventory } from '../firebase/inventory';
import { applyCombatResult, setCharacterLevel } from '../firebase/character';
import { checkAndUnlockNextSlot } from '../firebase/characterSlots';
import { MAX_CHARACTER_LEVEL } from '../gameData/xpTables';
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
        const talentTotals = character.spec
          ? evaluateTalents(character.spec, character.talentPicks).totals
          : EMPTY_TALENT_TOTALS;
        const buffTotals = evaluateActiveBuffs(character.activeBuffs, now);
        const extraDmgTaken = getExtraDamageTakenPct(character.spec, character.talentPicks);
        const equipBonuses = getEquipmentStatBonuses(character.equipment, character.enchantments);
        const charMaxHp = maxHp(character.class, character.level, equipBonuses, talentTotals.hpMultPct);
        const startingHp = resolveCurrentHp(character.currentHp, charMaxHp, character.hpCheckpointAt, activity.startedAt);

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
          monster,
          // Companions only fight in dungeons — idle/offline catch-up is
          // always open-world solo, same as live open-world combat.
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
      } else if (activity.type === 'gathering') {
        const node = GATHER_NODES[activity.targetId];
        const itemName = ITEMS[node.itemId]?.name ?? node.itemId;
        if (usesMasteryEngine(node.profession)) {
          const prof = getProfessionState(character.professions, node.profession);
          const masteryState = prof.mastery?.[node.id] ?? { level: 0, xp: 0 };
          const nodeLike: MasteryGatherNodeLike = {
            itemId: node.itemId,
            baseProfessionXp: node.xpPerAction,
            secondsPerAction: node.secondsPerAction,
            requiredLevel: node.requiredLevel,
            colorBreakpoints: node.colorBreakpoints,
            rareBonus: node.rareBonus,
          };
          const result = resolveMasteryGatheringOffline(
            activity.startedAt,
            now,
            nodeLike,
            prof.level,
            prof.xp,
            masteryState.level,
            masteryState.xp,
            maxSkillForUnlockedTier(prof.unlockedTier)
          );
          const levelUpNote = result.finalSkill !== prof.level ? ` Your ${node.profession} skill reached ${result.finalSkill}!` : '';
          setSummary(
            `While you were away, you gathered ${Math.floor(result.quantityGained)} ${itemName}.${levelUpNote}`
          );
        } else {
          const currentSkill = getProfessionState(character.professions, node.profession).level;
          const result = resolveGathering(activity.startedAt, now, node, currentSkill);
          setSummary(
            `While you were away, you gathered ${Math.floor(result.quantityGained)} ${itemName}, gaining ${Math.floor(
              result.skillupsGained
            )} skill.`
          );
        }
      } else if (activity.type === 'crafting') {
        const recipe = RECIPES[activity.targetId];
        const inventory = user ? await getInventory(user.uid) : { items: {} };
        if (usesMasteryEngine(recipe.profession)) {
          const prof = getProfessionState(character.professions, recipe.profession);
          const masteryState = prof.mastery?.[recipe.id] ?? { level: 0, xp: 0 };
          const recipeLike: MasteryCraftRecipeLike = {
            resultItemId: recipe.resultItemId,
            resultQuantity: recipe.resultQuantity,
            baseProfessionXp: recipe.xpAward,
            craftSeconds: recipe.craftSeconds,
            requiredSkill: recipe.requiredSkill,
            colorBreakpoints: recipe.colorBreakpoints,
            materials: recipe.materials,
            goldCost: recipe.goldCost,
          };
          const result = resolveMasteryCraftingOffline(
            activity.startedAt,
            now,
            recipeLike,
            prof.level,
            prof.xp,
            masteryState.level,
            masteryState.xp,
            maxSkillForUnlockedTier(prof.unlockedTier),
            inventory.items,
            character.gold
          );
          const levelUpNote = result.finalSkill !== prof.level ? ` Your ${recipe.profession} skill reached ${result.finalSkill}!` : '';
          setSummary(
            `While you were away, you crafted ${Math.floor(result.itemsCrafted)} ${recipe.name}.${levelUpNote}`
          );
        } else {
          const currentSkill = getProfessionState(character.professions, recipe.profession).level;
          const result = resolveCrafting(
            activity.startedAt,
            now,
            recipe,
            currentSkill,
            inventory.items,
            recipe.colorBreakpoints
          );
          setSummary(
            `While you were away, you crafted ${result.itemsCrafted} ${recipe.name}, gaining ${Math.floor(
              result.skillupsGained
            )} skill.`
          );
        }
      } else if (activity.type === 'fishing') {
        const hole = FISHING_HOLES[activity.targetId];
        const currentSkill = getProfessionState(character.professions, 'fishing').level;
        const result = resolveFishing(activity.startedAt, now, hole, currentSkill);
        const caughtDescription = result.catches
          .filter((c) => c.quantity >= 1)
          .map((c) => `${Math.floor(c.quantity)} ${ITEMS[c.itemId]?.name ?? c.itemId}`)
          .join(', ');
        setSummary(
          caughtDescription
            ? `While you were away, you caught ${caughtDescription}.`
            : 'While you were away, the fish weren’t biting.'
        );
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

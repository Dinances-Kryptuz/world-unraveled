import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { LIVE_SESSION_THRESHOLD_SECONDS } from '../gameData/activityEngine';
import { resolveCraftingOffline, type CraftingRecipeLike } from '../gameData/craftingEngine';
import { resolveGatheringOffline, type GatheringResourceLike } from '../gameData/gatheringEngine';
import { MONSTERS } from '../gameData/monsters';
import { GATHER_NODES, FISHING_HOLES } from '../gameData/zones';
import { RECIPES } from '../gameData/recipes';
import { ITEMS } from '../gameData/items';
import { resolveSpecDef, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { simulateOfflineCombat } from '../combatEngine/offlineCombat';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { getProfessionState, maxSkillForUnlockedTier, PROFESSION_CATEGORY } from '../gameData/professionTiers';
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
        // All 4 gathering professions (Mining/Herbalism/Skinning/Fishing's
        // own branch below) now share gatheringEngine.ts's 1-100 XP+Mastery
        // engine — no more branching on usesMasteryEngine here. Purely a
        // preview: nothing is persisted until the gathering screen itself
        // mounts and runs its own first autosave from this same anchor.
        const node = GATHER_NODES[activity.targetId];
        const itemName = ITEMS[node.itemId]?.name ?? node.itemId;
        const prof = getProfessionState(character.professions, node.profession);
        const masteryState = prof.mastery?.[node.id] ?? { level: 0, xp: 0 };
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
          maxSkillForUnlockedTier(node.profession, prof.unlockedTier)
        );
        const levelUpNote = result.finalSkill !== prof.level ? ` Your ${node.profession} level reached ${result.finalSkill}!` : '';
        setSummary(
          `While you were away, you gathered ${Math.floor(result.quantityGained)} ${itemName}.${levelUpNote}`
        );
      } else if (activity.type === 'crafting') {
        // All 6 crafting professions now share craftingEngine.ts's 1-100
        // XP+Mastery engine — Mining's Smelting recipes land here too
        // (tagged to a gathering-category profession) but never earn
        // Mining XP/Mastery of their own, per the same earnsProfessionXp
        // split CraftingScreen uses. Purely a preview: nothing is persisted
        // until the crafting screen itself mounts and runs its own first
        // autosave from this same anchor.
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
        const result = resolveCraftingOffline(
          activity.startedAt,
          now,
          recipeLike,
          prof.level,
          prof.xp,
          masteryState.level,
          masteryState.xp,
          maxSkillForUnlockedTier(recipe.profession, prof.unlockedTier),
          inventory.items,
          character.gold
        );
        const earnsProfessionXp = PROFESSION_CATEGORY[recipe.profession] === 'production';
        const levelUpNote =
          earnsProfessionXp && result.finalSkill !== prof.level
            ? ` Your ${recipe.profession} level reached ${result.finalSkill}!`
            : '';
        setSummary(
          `While you were away, you crafted ${Math.floor(result.itemsCrafted)} ${recipe.name}.${levelUpNote}`
        );
      } else if (activity.type === 'fishing') {
        // Fishing shares gatheringEngine.ts's engine with Mining/Herbalism/
        // Skinning — see the gathering branch above for the same preview
        // pattern, with the hole's catchChance baked into the resolver.
        const hole = FISHING_HOLES[activity.targetId];
        const itemName = ITEMS[hole.itemId]?.name ?? hole.itemId;
        const prof = getProfessionState(character.professions, 'fishing');
        const masteryState = prof.mastery?.[hole.id] ?? { level: 0, xp: 0 };
        const holeLike: GatheringResourceLike = {
          itemId: hole.itemId,
          baseXp: hole.baseXp,
          secondsPerAction: hole.secondsPerAction,
          requiredLevel: hole.requiredLevel,
          catchChance: hole.catchChance,
        };
        const result = resolveGatheringOffline(
          activity.startedAt,
          now,
          holeLike,
          prof.level,
          prof.xp,
          masteryState.level,
          masteryState.xp,
          maxSkillForUnlockedTier('fishing', prof.unlockedTier)
        );
        const levelUpNote = result.finalSkill !== prof.level ? ` Your Fishing level reached ${result.finalSkill}!` : '';
        setSummary(
          result.quantityGained >= 1
            ? `While you were away, you caught ${Math.floor(result.quantityGained)} ${itemName}.${levelUpNote}`
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

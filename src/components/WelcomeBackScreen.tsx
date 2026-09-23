import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resolveGathering, resolveCrafting, LIVE_SESSION_THRESHOLD_SECONDS } from '../gameData/activityEngine';
import { MONSTERS } from '../gameData/monsters';
import { GATHER_NODES } from '../gameData/zones';
import { RECIPES } from '../gameData/recipes';
import { ITEMS } from '../gameData/items';
import { resolveSpecDef, computeFullCombatProfile, getExtraDamageTakenPct } from '../gameData/combatProfileWithTalents';
import { resolveCombatEncounter } from '../gameData/combatResolver';
import { evaluateTalents, EMPTY_TALENT_TOTALS } from '../utils/talentEvaluator';
import { maxHp, resolveCurrentHp } from '../gameData/combatFormulas';
import { getEquipmentStatBonuses } from '../gameData/equipmentStats';
import { getInventory } from '../firebase/inventory';
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
        const extraDmgTaken = getExtraDamageTakenPct(character.spec, character.talentPicks);
        const equipBonuses = getEquipmentStatBonuses(character.equipment);
        const profile = computeFullCombatProfile(
          character.class,
          specDef,
          character.level,
          monster.level,
          talentTotals,
          extraDmgTaken,
          equipBonuses
        );
        const charMaxHp = maxHp(character.class, character.level, equipBonuses);
        const startingHp = resolveCurrentHp(character.currentHp, charMaxHp, character.hpCheckpointAt, activity.startedAt);
        const result = resolveCombatEncounter(activity.startedAt, now, startingHp, profile, monster);
        const retreatNote = result.forcedRetreat ? ' You were forced to retreat before your time was up.' : '';
        setSummary(
          `While you were away, you defeated ${result.monstersDefeated} ${monster.name}${
            result.monstersDefeated === 1 ? '' : 's'
          }, earning ${Math.round(result.xpGained)} XP and ${Math.round(result.goldGained)} gold.${retreatNote}`
        );
      } else if (activity.type === 'gathering') {
        const node = GATHER_NODES[activity.targetId];
        const currentSkill = character.professions[node.profession].level;
        const result = resolveGathering(activity.startedAt, now, node, currentSkill);
        const itemName = ITEMS[node.itemId]?.name ?? node.itemId;
        setSummary(
          `While you were away, you gathered ${Math.floor(result.quantityGained)} ${itemName}, earning ${Math.round(
            result.xpGained
          )} XP.`
        );
      } else if (activity.type === 'crafting') {
        const recipe = RECIPES[activity.targetId];
        const currentSkill = character.professions[recipe.profession].level;
        const inventory = user ? await getInventory(user.uid) : { items: {} };
        const result = resolveCrafting(
          activity.startedAt,
          now,
          recipe,
          currentSkill,
          inventory.items,
          recipe.colorBreakpoints
        );
        setSummary(
          `While you were away, you crafted ${result.itemsCrafted} ${recipe.name}, earning ${result.xpGained} XP.`
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

  return (
    <div className="welcome-back-screen">
      <h2>Welcome Back</h2>
      <p>{summary ?? 'Calculating what happened while you were away…'}</p>
      <button onClick={onContinue} disabled={summary === null}>
        Continue
      </button>
    </div>
  );
}

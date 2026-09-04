import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resolveCombat, resolveGathering, resolveCrafting, LIVE_SESSION_THRESHOLD_SECONDS } from '../gameData/activityEngine';
import { MONSTERS } from '../gameData/monsters';
import { GATHER_NODES } from '../gameData/zones';
import { RECIPES } from '../gameData/recipes';
import { ITEMS } from '../gameData/items';
import { derivePlayerCombatStats } from '../utils/playerStats';
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
        const { attackPower, attackIntervalSeconds } = derivePlayerCombatStats(character);
        const result = resolveCombat(activity.startedAt, now, monster, attackPower, attackIntervalSeconds);
        setSummary(
          `While you were away, you defeated ${result.monstersDefeated} ${monster.name}${
            result.monstersDefeated === 1 ? '' : 's'
          }, earning ${result.xpGained} XP and ${result.goldGained} gold.`
        );
      } else if (activity.type === 'gathering') {
        const node = GATHER_NODES[activity.targetId];
        const currentSkill = character.professions[node.profession].level;
        const result = resolveGathering(activity.startedAt, now, node, currentSkill);
        const itemName = ITEMS[node.itemId]?.name ?? node.itemId;
        setSummary(
          `While you were away, you gathered ${result.quantityGained} ${itemName}, earning ${result.xpGained} XP.`
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
    compute();
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

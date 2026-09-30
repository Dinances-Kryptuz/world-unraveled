import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { refreshQuestBoard } from '../firebase/character';
import { QUESTS, type QuestCategory, type QuestDef, type QuestObjective } from '../gameData/quests';
import { MONSTERS } from '../gameData/monsters';
import { ITEMS } from '../gameData/items';
import { abilitiesById } from '../combatEngine/engine';

const CATEGORY_LABELS: Record<QuestCategory, string> = {
  zone: 'Zone',
  class: 'Class',
  profession: 'Profession',
  daily: 'Daily',
};

function describeObjective(obj: QuestObjective): string {
  switch (obj.type) {
    case 'kill': {
      if (obj.monsterId) return `Defeat ${MONSTERS[obj.monsterId]?.name ?? obj.monsterId}`;
      if (obj.bossOnly) return 'Defeat a boss';
      return 'Defeat enemies';
    }
    case 'gather':
      return obj.itemId ? `Gather ${ITEMS[obj.itemId]?.name ?? obj.itemId}` : 'Gather materials';
    case 'craft':
      return obj.itemId ? `Craft ${ITEMS[obj.itemId]?.name ?? obj.itemId}` : 'Craft items';
    case 'use_ability': {
      const abilities = abilitiesById();
      const names = obj.abilityIds.map((id) => abilities[id]?.name ?? id).join(' or ');
      return `Use ${names}`;
    }
    case 'heal_amount':
      return 'Restore health';
  }
}

function describeReward(quest: QuestDef): string {
  const parts: string[] = [];
  if (quest.rewards.xp) parts.push(`${quest.rewards.xp.toLocaleString()} XP`);
  if (quest.rewards.gold) parts.push(`${quest.rewards.gold} gold`);
  if (quest.rewards.itemId && quest.rewards.itemQuantity) {
    parts.push(`${quest.rewards.itemQuantity}x ${ITEMS[quest.rewards.itemId]?.name ?? quest.rewards.itemId}`);
  }
  return parts.join(', ');
}

export function QuestLog() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [refreshing, setRefreshing] = useState(false);

  if (!character) return null;

  const activeQuests = Object.entries(character.quests.active)
    .map(([questId, progress]) => ({ quest: QUESTS[questId], progress }))
    .filter((q): q is { quest: QuestDef; progress: number[] } => !!q.quest)
    .sort((a, b) => {
      const order: Record<QuestCategory, number> = { zone: 0, class: 1, profession: 2, daily: 3 };
      return order[a.quest.category] - order[b.quest.category];
    });

  async function handleRefresh() {
    if (!user) return;
    setRefreshing(true);
    try {
      await refreshQuestBoard(user.uid);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="quest-log">
      <h2>
        Quests ({activeQuests.length} / 8)
        <button onClick={handleRefresh} disabled={refreshing} style={{ marginLeft: 8 }}>
          {refreshing ? 'Checking…' : 'Check for new quests'}
        </button>
      </h2>
      {activeQuests.length === 0 ? (
        <p>No active quests right now — check back after leveling up or finishing what you have.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {activeQuests.map(({ quest, progress }) => (
            <li key={quest.id} style={{ marginBottom: 10 }}>
              <div>
                <strong>{quest.name}</strong> <small>({CATEGORY_LABELS[quest.category]})</small>
              </div>
              <div>{quest.description}</div>
              <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
                {quest.objectives.map((obj, i) => (
                  <li key={i}>
                    {describeObjective(obj)}: {Math.min(progress[i], obj.count)} / {obj.count}
                  </li>
                ))}
              </ul>
              <small>Reward: {describeReward(quest)}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

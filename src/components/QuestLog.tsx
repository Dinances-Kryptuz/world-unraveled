import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { completeQuest, acceptQuest } from '../firebase/character';
import { availableQuests, isQuestReadyToComplete } from '../gameData/questEngine';
import { QUESTS, MAX_ACTIVE_QUESTS, type QuestCategory, type QuestDef, type QuestObjective } from '../gameData/quests';
import { MONSTERS } from '../gameData/monsters';
import { ITEMS } from '../gameData/items';
import { abilitiesById } from '../combatEngine/engine';

const CATEGORY_LABELS: Record<QuestCategory, string> = {
  zone: 'Zone',
  class: 'Class',
  profession: 'Profession',
  daily: 'Daily',
};

// A stable tiebreaker for quests that land in the same category — see its
// one use below. Needed because character.quests.active is a Firestore map
// field: Object.entries() on it isn't guaranteed to return the same key
// order on every read (the SDK just reflects whatever order the server's
// wire format delivered), so two same-category active quests could swap
// visible positions on every refetch (which happens after nearly every
// action — a combat autosave, accepting/completing a quest, …) without this.
// QUESTS' own declaration order is fixed at build time and never changes.
const QUEST_DECLARATION_ORDER: Record<string, number> = Object.fromEntries(
  Object.keys(QUESTS).map((id, index) => [id, index])
);

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
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!character) return null;

  const activeQuests = Object.entries(character.quests.active)
    .map(([questId, progress]) => ({ quest: QUESTS[questId], progress }))
    .filter((q): q is { quest: QuestDef; progress: number[] } => !!q.quest)
    .sort((a, b) => {
      const order: Record<QuestCategory, number> = { zone: 0, class: 1, profession: 2, daily: 3 };
      const categoryDiff = order[a.quest.category] - order[b.quest.category];
      if (categoryDiff !== 0) return categoryDiff;
      return QUEST_DECLARATION_ORDER[a.quest.id] - QUEST_DECLARATION_ORDER[b.quest.id];
    });

  const available = availableQuests(character, new Date());
  const atCap = activeQuests.length >= MAX_ACTIVE_QUESTS;

  async function handleComplete(questId: string) {
    if (!user) return;
    setBusyId(questId);
    try {
      await completeQuest(user.uid, questId);
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccept(questId: string) {
    if (!user) return;
    setBusyId(questId);
    try {
      await acceptQuest(user.uid, questId);
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="quest-log">
      <h2>
        Quests ({activeQuests.length} / {MAX_ACTIVE_QUESTS})
      </h2>
      {activeQuests.length === 0 ? (
        <p>No active quests right now — accept one below.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {activeQuests.map(({ quest, progress }) => {
            const ready = isQuestReadyToComplete(quest, progress);
            return (
              <li key={quest.id} style={{ marginBottom: 10 }}>
                <div>
                  <strong>{quest.name}</strong> <small>({CATEGORY_LABELS[quest.category]})</small>
                  {ready && (
                    <button onClick={() => handleComplete(quest.id)} disabled={busyId !== null} style={{ marginLeft: 8 }}>
                      {busyId === quest.id ? 'Completing…' : 'Complete Quest'}
                    </button>
                  )}
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
            );
          })}
        </ul>
      )}

      <h3>Available</h3>
      {available.length === 0 ? (
        <p>Nothing new to accept right now — check back after leveling up, learning a profession, or finishing what you have.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {available.map((quest) => (
            <li key={quest.id} style={{ marginBottom: 10, opacity: atCap ? 0.6 : 1 }}>
              <div>
                <strong>{quest.name}</strong> <small>({CATEGORY_LABELS[quest.category]})</small>
                <button onClick={() => handleAccept(quest.id)} disabled={busyId !== null || atCap} style={{ marginLeft: 8 }}>
                  {busyId === quest.id ? 'Accepting…' : atCap ? 'Board full' : 'Accept'}
                </button>
              </div>
              <div>{quest.description}</div>
              <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
                {quest.objectives.map((obj, i) => (
                  <li key={i}>{describeObjective(obj)}: 0 / {obj.count}</li>
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

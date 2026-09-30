// Pure quest logic — no Firestore, no React. Mirrors the rest of this
// codebase's convention (activityEngine.ts, combatEngine/engine.ts): given
// state and an event, compute the next state; callers decide when to
// persist it. See firebase/quests.ts for the Firestore-writing wrapper.
import type { Character, QuestState } from '../types/character';
import { QUESTS, MAX_ACTIVE_QUESTS, type QuestDef, type QuestObjective } from './quests';
import { ZONES } from './zones';
import { MONSTERS } from './monsters';

export type QuestEvent =
  | { type: 'kill'; monsterId: string; count: number }
  | { type: 'gather'; itemId: string; count: number }
  | { type: 'craft'; itemId: string; count: number }
  | { type: 'use_ability'; abilityId: string; count: number }
  | { type: 'heal_amount'; amount: number };

function isZoneUnlockedForQuests(zoneId: string, characterLevel: number): boolean {
  const zone = ZONES[zoneId];
  if (!zone) return false;
  return zone.unlockRequirement.type === 'none' || characterLevel >= zone.unlockRequirement.level;
}

function isQuestAvailable(quest: QuestDef, character: Pick<Character, 'class' | 'spec' | 'level' | 'quests'>, now: Date): boolean {
  if (quest.classId && quest.classId !== character.class) return false;
  if (quest.requiredSpecs && (!character.spec || !quest.requiredSpecs.includes(character.spec))) return false;
  if (quest.requiredLevel && character.level < quest.requiredLevel) return false;
  if (quest.zoneId && !isZoneUnlockedForQuests(quest.zoneId, character.level)) return false;
  if (quest.prerequisiteQuestId && !character.quests.completedIds.includes(quest.prerequisiteQuestId)) return false;
  if (quest.id in character.quests.active) return false;

  if (quest.repeatable) {
    const lastCompleted = character.quests.dailyCompletedAt[quest.id];
    if (!lastCompleted) return true;
    const hoursSince = (now.getTime() - lastCompleted.getTime()) / 3_600_000;
    return hoursSince >= (quest.cooldownHours ?? 20);
  }
  return !character.quests.completedIds.includes(quest.id);
}

// Priority order for filling empty active-quest slots: zone chains first
// (the primary "what do I do next" signal for a new player), then class,
// then profession, then daily — dailies only show up once there's room.
const CATEGORY_PRIORITY: Record<QuestDef['category'], number> = { zone: 0, class: 1, profession: 2, daily: 3 };

export function refillActiveQuests(
  character: Pick<Character, 'class' | 'spec' | 'level' | 'quests'>,
  now: Date
): Record<string, number[]> {
  const active = { ...character.quests.active };
  let slotsLeft = MAX_ACTIVE_QUESTS - Object.keys(active).length;
  if (slotsLeft <= 0) return active;

  const candidates = Object.values(QUESTS)
    .filter((q) => isQuestAvailable(q, character, now))
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]);

  for (const q of candidates) {
    if (slotsLeft <= 0) break;
    active[q.id] = q.objectives.map(() => 0);
    slotsLeft--;
  }
  return active;
}

function objectiveProgressDelta(obj: QuestObjective, event: QuestEvent): number {
  switch (obj.type) {
    case 'kill': {
      if (event.type !== 'kill') return 0;
      if (obj.monsterId && obj.monsterId !== event.monsterId) return 0;
      if (obj.bossOnly && !MONSTERS[event.monsterId]?.isBoss) return 0;
      if (obj.zoneId && !MONSTERS[event.monsterId]?.zoneIds.includes(obj.zoneId)) return 0;
      return event.count;
    }
    case 'gather':
      if (event.type !== 'gather') return 0;
      if (obj.itemId && obj.itemId !== event.itemId) return 0;
      return event.count;
    case 'craft':
      if (event.type !== 'craft') return 0;
      if (obj.itemId && obj.itemId !== event.itemId) return 0;
      return event.count;
    case 'use_ability':
      if (event.type !== 'use_ability') return 0;
      if (!obj.abilityIds.includes(event.abilityId)) return 0;
      return event.count;
    case 'heal_amount':
      return event.type === 'heal_amount' ? event.amount : 0;
    default:
      return 0;
  }
}

export interface QuestApplyResult {
  quests: QuestState;
  rewards: { xp: number; gold: number; items: { itemId: string; quantity: number }[] };
  completedQuestNames: string[];
}

// Applies a batch of progress events to every active quest, completing any
// that reach all their objective targets, granting rewards, and refilling
// freed-up slots (which can immediately pull in a just-unlocked chain
// successor) — all in one pass. Doesn't touch Firestore; see
// firebase/quests.ts.
export function applyQuestEvents(
  character: Pick<Character, 'class' | 'spec' | 'level' | 'quests'>,
  events: QuestEvent[],
  now: Date
): QuestApplyResult {
  const active: Record<string, number[]> = {};
  for (const [id, progress] of Object.entries(character.quests.active)) active[id] = [...progress];
  const completedIds = [...character.quests.completedIds];
  const dailyCompletedAt = { ...character.quests.dailyCompletedAt };
  let xp = 0;
  let gold = 0;
  const items: { itemId: string; quantity: number }[] = [];
  const completedQuestNames: string[] = [];

  if (events.length > 0) {
    for (const questId of Object.keys(active)) {
      const quest = QUESTS[questId];
      const progress = active[questId];
      if (!quest) {
        delete active[questId];
        continue;
      }
      for (const event of events) {
        quest.objectives.forEach((obj, i) => {
          progress[i] = Math.min(obj.count, progress[i] + objectiveProgressDelta(obj, event));
        });
      }
      const isComplete = quest.objectives.every((obj, i) => progress[i] >= obj.count);
      if (isComplete) {
        delete active[questId];
        if (!completedIds.includes(questId)) completedIds.push(questId);
        if (quest.repeatable) dailyCompletedAt[questId] = now;
        xp += quest.rewards.xp ?? 0;
        gold += quest.rewards.gold ?? 0;
        if (quest.rewards.itemId && quest.rewards.itemQuantity) {
          items.push({ itemId: quest.rewards.itemId, quantity: quest.rewards.itemQuantity });
        }
        completedQuestNames.push(quest.name);
      }
    }
  }

  // Always top up the active board after processing events — covers not
  // just a newly-completed quest's chain successor, but also e.g. a zone
  // that became unlocked by a level-up moments earlier. A freshly-added
  // quest starts at 0 and only progresses on the NEXT event batch, never
  // retroactively from this one.
  const refilled = refillActiveQuests({ ...character, quests: { active, completedIds, dailyCompletedAt } }, now);
  for (const [id, progress] of Object.entries(refilled)) {
    if (!(id in active)) active[id] = progress;
  }

  return {
    quests: { active, completedIds, dailyCompletedAt },
    rewards: { xp, gold, items },
    completedQuestNames,
  };
}

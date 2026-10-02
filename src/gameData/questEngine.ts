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

export function isQuestAvailable(
  quest: QuestDef,
  character: Pick<Character, 'class' | 'spec' | 'level' | 'quests' | 'professions'>,
  now: Date
): boolean {
  if (quest.classId && quest.classId !== character.class) return false;
  if (quest.requiredSpecs && (!character.spec || !quest.requiredSpecs.includes(character.spec))) return false;
  if (quest.requiredLevel && character.level < quest.requiredLevel) return false;
  if (quest.zoneId && !isZoneUnlockedForQuests(quest.zoneId, character.level)) return false;
  // A profession-category quest with a declared `profession` is only ever
  // offered to a character who actually knows it — professions stopped
  // being auto-granted once learning became a real, trainer-gated choice
  // (see firebase/professions.ts), so an ungated profession quest could
  // otherwise be handed to someone who can never complete it.
  if (quest.profession && !character.professions[quest.profession]) return false;
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

// Priority order for listing available quests: zone chains first (the
// primary "what do I do next" signal for a new player), then class, then
// profession, then daily.
const CATEGORY_PRIORITY: Record<QuestDef['category'], number> = { zone: 0, class: 1, profession: 2, daily: 3 };

// Used ONCE, to seed a brand-new character's starting board (see
// firebase/character.ts's createCharacter) — auto-filling makes sense there
// since there's no "quest giver" screen to visit first. After creation, a
// freed active slot stays empty until the player explicitly accepts
// something (see acceptQuestInState below) rather than auto-refilling,
// per explicit design direction: completing a quest should never silently
// hand you the next one.
export function refillActiveQuests(
  character: Pick<Character, 'class' | 'spec' | 'level' | 'quests' | 'professions'>,
  now: Date
): Record<string, number[]> {
  const active = { ...character.quests.active };
  let slotsLeft = MAX_ACTIVE_QUESTS - Object.keys(active).length;
  if (slotsLeft <= 0) return active;

  const candidates = availableQuests(character, now);

  for (const q of candidates) {
    if (slotsLeft <= 0) break;
    active[q.id] = q.objectives.map(() => 0);
    slotsLeft--;
  }
  return active;
}

// Every quest the player COULD accept right now (not already active, meets
// level/class/spec/zone/profession/prerequisite/cooldown gates) — what the
// Quest Log's "Available" list offers, one Accept click at a time, instead
// of the old auto-fill. Pure and client-computable; no Firestore round trip
// needed just to see what's available.
export function availableQuests(
  character: Pick<Character, 'class' | 'spec' | 'level' | 'quests' | 'professions'>,
  now: Date
): QuestDef[] {
  return Object.values(QUESTS)
    .filter((q) => isQuestAvailable(q, character, now))
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]);
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

// Bumps progress on every active quest for a batch of events, clamped at
// each objective's target. Does NOT complete a quest on its own, even once
// every objective is met — see isQuestReadyToComplete/completeQuestInState
// below. Completion is now an explicit player action (clicking "Complete
// Quest" in the Quest Log), per explicit design direction: a quest reaching
// its target shouldn't silently grant rewards and vanish from the board.
export function applyQuestEvents(
  character: Pick<Character, 'quests'>,
  events: QuestEvent[]
): Record<string, number[]> {
  const active: Record<string, number[]> = {};
  for (const [id, progress] of Object.entries(character.quests.active)) active[id] = [...progress];

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
    }
  }

  return active;
}

export function isQuestReadyToComplete(quest: QuestDef, progress: number[]): boolean {
  return quest.objectives.every((obj, i) => progress[i] >= obj.count);
}

export interface CompleteQuestResult {
  quests: QuestState;
  rewards: { xp: number; gold: number; items: { itemId: string; quantity: number }[] };
  questName: string;
}

// The player's explicit "Complete Quest" action — validates the quest is
// actually active and every objective is met (never trust the client alone;
// same posture as every other gated write in firebase/*.ts), then grants
// rewards and moves it to completedIds. Returns null on any invalid attempt
// (unknown quest, not active, or not actually finished yet) for the caller
// to turn into a no-op.
export function completeQuestInState(
  character: Pick<Character, 'quests'>,
  questId: string,
  now: Date
): CompleteQuestResult | null {
  const quest = QUESTS[questId];
  const progress = character.quests.active[questId];
  if (!quest || !progress || !isQuestReadyToComplete(quest, progress)) return null;

  const active = { ...character.quests.active };
  delete active[questId];
  const completedIds = character.quests.completedIds.includes(questId)
    ? character.quests.completedIds
    : [...character.quests.completedIds, questId];
  const dailyCompletedAt = { ...character.quests.dailyCompletedAt };
  if (quest.repeatable) dailyCompletedAt[questId] = now;

  return {
    quests: { active, completedIds, dailyCompletedAt },
    rewards: {
      xp: quest.rewards.xp ?? 0,
      gold: quest.rewards.gold ?? 0,
      items:
        quest.rewards.itemId && quest.rewards.itemQuantity
          ? [{ itemId: quest.rewards.itemId, quantity: quest.rewards.itemQuantity }]
          : [],
    },
    questName: quest.name,
  };
}

// The player's explicit "Accept Quest" action — adds one specific quest to
// the active board (if there's a free slot and it's actually available to
// this character right now). Returns null on any invalid attempt for the
// caller to turn into a no-op, same posture as completeQuestInState.
export function acceptQuestInState(
  character: Pick<Character, 'class' | 'spec' | 'level' | 'quests' | 'professions'>,
  questId: string,
  now: Date
): QuestState | null {
  if (Object.keys(character.quests.active).length >= MAX_ACTIVE_QUESTS) return null;
  const quest = QUESTS[questId];
  if (!quest || !isQuestAvailable(quest, character, now)) return null;

  return {
    ...character.quests,
    active: { ...character.quests.active, [questId]: quest.objectives.map(() => 0) },
  };
}

import type { EquipmentSlot, ProfessionId, ActivityType, ProfessionTierName } from '../gameData/types';

export interface ProfessionState {
  level: number;
  xp: number;
  unlockedTier: ProfessionTierName;
}

export interface CurrentActivity {
  type: ActivityType | null;
  targetId: string | null; // monsterId, resourceNodeId (or skinning target), or recipeId
  zoneId: string | null;
  startedAt: Date | null;
  recipeQueue?: { recipeId: string; quantity: number }[];
}

export interface Character {
  name: string;
  createdAt: Date;
  level: number;
  xp: number;
  gold: number;
  voidShards: number; // always 0 in V1, reserved for later
  equipment: Record<EquipmentSlot, string | null>;
  professions: Record<ProfessionId, ProfessionState>;
  currentActivity: CurrentActivity;
}

export interface Inventory {
  items: Record<string, number>; // itemDefId -> quantity
}

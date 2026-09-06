import type { EquipmentSlot, ProfessionId, ActivityType, ProfessionTierName } from '../gameData/types';
import type { ClassId, SpecId } from '../gameData/classStats';

export interface ProfessionState {
  level: number;
  xp: number;
  unlockedTier: ProfessionTierName;
}

export interface CurrentActivity {
  type: ActivityType | null;
  targetId: string | null;
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
  voidShards: number;
  class: ClassId;
  spec: SpecId | null;
  equipment: Record<EquipmentSlot, string | null>;
  professions: Record<ProfessionId, ProfessionState>;
  currentActivity: CurrentActivity;
}

export interface Inventory {
  items: Record<string, number>;
}

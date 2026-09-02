// Shared types for all static game data (zones, monsters, items, recipes, etc.)
// This file has no dependencies — everything else imports from here.

export type ProfessionId = 'skinning' | 'mining' | 'herbalism' | 'leatherworking';

export type ActivityType = 'combat' | 'gathering' | 'crafting';

export type EquipmentSlot =
  | 'weapon'
  | 'chest'
  | 'helmet'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'ring';

export type ItemType = 'material' | 'equipment';

export type ProfessionTierName =
  | 'apprentice'
  | 'journeyman'
  | 'expert'
  | 'artisan'
  | 'master';

export interface LootDrop {
  itemId: string;
  chance: number; // 0–1
  minQty: number;
  maxQty: number;
}

export interface SkinningYield {
  requiredSkinningLevel: number;
  itemId: string;
  chance: number; // 0–1
  minQty: number;
  maxQty: number;
  actionSeconds: number; // time spent skinning the corpse, post-kill
}

export interface SpecialAbility {
  name: string;
  description: string;
  // V1 combat is a simple auto-attack loop. Abilities are stored now so
  // flavor/tooltips can show them, but none are mechanically active yet.
  implemented: false;
}

export interface Monster {
  id: string;
  name: string;
  zoneIds: string[];
  levelRange: [number, number];
  hp: number;
  attackPower: number;
  defense: number;
  attackIntervalSeconds: number;
  xpReward: number;
  goldMin: number;
  goldMax: number;
  lootTable: LootDrop[];
  skinnable: boolean;
  skinningYield?: SkinningYield;
  specialAbility?: SpecialAbility;
}

export interface GatherNode {
  id: string;
  name: string;
  profession: ProfessionId;
  zoneId: string;
  requiredLevel: number;
  itemId: string;
  xpPerAction: number;
  secondsPerAction: number;
  rareBonus?: {
    itemId: string;
    chance: number; // 0–1, checked per action in addition to the guaranteed yield
  };
}

export type UnlockRequirement =
  | { type: 'none' }
  | { type: 'characterLevel'; level: number };

export interface Zone {
  id: string;
  name: string;
  description: string;
  levelRange: [number, number];
  unlockRequirement: UnlockRequirement;
  monsterIds: string[];
  gatherNodeIds: string[];
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  stackable: boolean;
  equipSlot?: EquipmentSlot; // only present when type === 'equipment'
  statBonuses?: Partial<{
    attack: number;
    defense: number;
    maxHp: number;
  }>;
  sellValue: number;
}

export interface Recipe {
  id: string;
  name: string;
  profession: ProfessionId;
  requiredSkill: number;
  resultItemId: string;
  resultQuantity: number;
  materials: { itemId: string; quantity: number }[];
  craftSeconds: number;
  xpAward: number;
  // Skill at/below orangeUntil = 100% XP, up to yellowUntil = 75%,
  // up to greenUntil = 35%, above that = 0% (gray).
  colorBreakpoints: {
    orangeUntil: number;
    yellowUntil: number;
    greenUntil: number;
  };
}

export interface ProfessionTierDef {
  tier: ProfessionTierName;
  minSkill: number;
  maxSkill: number;
  unlockRequirement:
    | { type: 'free' }
    | { type: 'trainer'; goldCost: number; requiredSkill: number }
    | { type: 'quest'; questId: string; requiredSkill: number };
}

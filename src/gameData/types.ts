// Shared types for all static game data (zones, monsters, items, recipes, etc.)
// This file has no dependencies — everything else imports from here.

export type ProfessionId = 'skinning' | 'mining' | 'herbalism' | 'leatherworking' | 'smithing' | 'tailoring';

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

// Which classes can equip a given piece of armor — see classStats.ts's
// ALLOWED_ARMOR_TYPES. Only relevant for armor (chest/helmet/gloves/legs/
// boots); weapons and rings have no armorType and are unrestricted.
export type ArmorType = 'cloth' | 'leather' | 'mail' | 'plate';

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
  level: number; // canonical single level used by the new formula-driven combat system
  goldMin: number;
  goldMax: number;
  lootTable: LootDrop[];
  specialAbility?: SpecialAbility;
  // Ability ids from combatEngine/monsterAbilities.ts, priority-ordered
  // (highest first) — the same priority walk player combatants use. Absent
  // (every non-boss monster) means auto-attack only, unchanged from before
  // this field existed. Only dungeon bosses (Phase 8) set this.
  equippedAbilityIds?: string[];
  isBoss?: boolean;
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  levelRange: [number, number];
  // Ordered monster ids the player fights in sequence; the last one is the
  // boss. Clearing it loops back to the first stage — same "repeatable
  // content" convention as an open-world monster, just as a fixed gauntlet
  // instead of one monster respawning as itself.
  stages: string[];
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
  armorType?: ArmorType; // only present on armor (not weapons/rings) — gates which classes can equip it
  // Equipment stat bonuses are raw STR/STA/INT/SPI points — the same
  // currency the class-growth system already uses (see classStats.ts).
  statBonuses?: Partial<Record<import('./classStats').BaseStat, number>>;
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
  // Skill at/below orangeUntil = 100% XP, up to yellowUntil = 80%,
  // up to greenUntil = 30%, above that = 10% (gray). See
  // activityEngine.ts's craftingColorTier/CRAFT_XP_MULTIPLIER_BY_TIER.
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

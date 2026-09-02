import type { Recipe } from './types';

export const RECIPES: Record<string, Recipe> = {
  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    profession: 'leatherworking',
    requiredSkill: 1,
    resultItemId: 'leather_boots',
    resultQuantity: 1,
    materials: [{ itemId: 'light_leather', quantity: 4 }],
    craftSeconds: 8,
    xpAward: 12,
    colorBreakpoints: { orangeUntil: 9, yellowUntil: 14, greenUntil: 24 },
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'Leather Gloves',
    profession: 'leatherworking',
    requiredSkill: 5,
    resultItemId: 'leather_gloves',
    resultQuantity: 1,
    materials: [
      { itemId: 'light_leather', quantity: 5 },
      { itemId: 'linen_cloth', quantity: 2 },
    ],
    craftSeconds: 10,
    xpAward: 16,
    colorBreakpoints: { orangeUntil: 14, yellowUntil: 19, greenUntil: 29 },
  },
  leather_cap: {
    id: 'leather_cap',
    name: 'Leather Cap',
    profession: 'leatherworking',
    requiredSkill: 10,
    resultItemId: 'leather_cap',
    resultQuantity: 1,
    materials: [
      { itemId: 'light_leather', quantity: 6 },
      { itemId: 'linen_cloth', quantity: 3 },
    ],
    craftSeconds: 14,
    xpAward: 22,
    colorBreakpoints: { orangeUntil: 19, yellowUntil: 24, greenUntil: 34 },
  },
};

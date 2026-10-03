import type { ClassId, SpecId } from './classStats';

// Player-facing class/spec flavor — icons (emoji, see the comment atop
// itemIcons.ts for why: no art/image pipeline exists in this environment)
// and short blurbs, shared by the character-creation showcase, the login
// screen's class preview, and SpecSelectionScreen so all three describe the
// same specs identically instead of three hand-copied strings drifting.
//
// 'mage' is intentionally excluded from CLASS_SHOWCASE below — see
// classStats.ts's ClassId comment, it's companion-only and no player
// character is ever created with it.

export const CLASS_ICONS: Record<ClassId, string> = {
  warrior: '⚔️',
  priest: '✝️',
  paladin: '🔰',
  mage: '🔥',
};

export const SPEC_ICONS: Record<SpecId, string> = {
  warrior_dps: '🗡️',
  warrior_tank: '🛡️',
  shadow_priest: '🌑',
  holy_priest: '✨',
  prot_paladin: '🔨',
  holy_paladin: '🌟',
  mage_fire: '🔥',
  mage_frost: '❄️',
};

export const SPEC_INFO: Record<SpecId, { label: string; blurb: string }> = {
  warrior_dps: { label: 'Melee DPS', blurb: 'Highest sustained damage. Fast kills, moderate durability.' },
  warrior_tank: { label: 'Tank', blurb: 'Slower kills, but the safest spec in the game.' },
  shadow_priest: { label: 'Shadow', blurb: 'Ranged damage with self-sustain from the damage you deal.' },
  holy_priest: { label: 'Holy', blurb: 'The best pure healer. Low damage, extremely hard to kill.' },
  prot_paladin: { label: 'Protection', blurb: 'A hybrid tank — less durable than a Warrior Tank, but hits harder.' },
  holy_paladin: { label: 'Holy', blurb: 'A battle healer — more durable and offensive than Holy Priest.' },
  // Present only so SPEC_INFO stays a true Record over every SpecId — Mage
  // is companion-only, see the module comment above.
  mage_fire: { label: 'Fire', blurb: 'Single-target burst damage.' },
  mage_frost: { label: 'Frost', blurb: 'Sustained, spread-out damage.' },
};

export interface ClassShowcaseEntry {
  id: ClassId;
  name: string;
  blurb: string;
  specs: SpecId[];
}

// The 3 classes an actual player character can be created as, in
// CharacterCreationScreen's own display order.
export const CLASS_SHOWCASE: ClassShowcaseEntry[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    blurb: 'Melee damage or tank. High strength and stamina.',
    specs: ['warrior_dps', 'warrior_tank'],
  },
  {
    id: 'priest',
    name: 'Priest',
    blurb: 'Shadow damage or holy healer. High intellect and spirit.',
    specs: ['shadow_priest', 'holy_priest'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    blurb: 'Tank or holy healer. Balanced across all stats.',
    specs: ['prot_paladin', 'holy_paladin'],
  },
];

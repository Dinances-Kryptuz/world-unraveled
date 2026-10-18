import type { ClassId, SpecId } from './classStats';

// Player-facing class/spec flavor — icons (emoji; see
// CharacterCreationScreen.tsx's ClassStorybookArt for the one place real
// artwork DOES exist, public/class-art/) and short blurbs, shared by the
// character-creation storybook and the login screen's class preview so both
// describe the same specs identically instead of two hand-copied strings
// drifting.
//
// 'mage' is intentionally excluded from CLASS_SHOWCASE below — see
// classStats.ts's ClassId comment, it's companion-only and no player
// character is ever created with it.

export const CLASS_ICONS: Record<ClassId, string> = {
  warrior: '⚔️',
  priest: '✝️',
  paladin: '🔰',
  mage: '🔥',
  rogue: '🥷',
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
  rogue_poison: '🧪',
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
  // Rogue is also companion-only (see classStats.ts's ClassId comment).
  rogue_poison: { label: 'Poisons', blurb: 'Excels at single-target, long fights — stacking poisons that cripple and wear a target down.' },
};

// Colors AND art-side for the storybook art's overlaid "Select" buttons
// (see CharacterCreationScreen.tsx) — one per player-facing spec, picked to
// match that spec's half of its class's dual-portrait artwork
// (public/class-art/) so the button sits over the right half and reads as
// part of that side's palette, rather than a generic UI color. `side` is
// NOT the same as this spec's position in ClassShowcaseEntry.specs below —
// the artwork's own left/right order doesn't follow that array order for
// every class (Warrior and Priest both put their SECOND-listed spec on the
// LEFT), so it's recorded explicitly here instead of assumed from index.
// Only the 6 real player specs need entries; mage/rogue are companion-only
// (see this file's own module comment) and never reach this screen.
export const SPEC_THEME: Partial<Record<SpecId, { bg: string; border: string; text: string; side: 'left' | 'right' }>> = {
  warrior_tank: { bg: '#15263f', border: '#d8b35a', text: '#f3e3b9', side: 'left' },
  warrior_dps: { bg: '#2b0a0a', border: '#b2472f', text: '#f3e3b9', side: 'right' },
  prot_paladin: { bg: '#2c3e5c', border: '#e0c17a', text: '#f6ecce', side: 'left' },
  holy_paladin: { bg: '#f7ecd0', border: '#c9a227', text: '#4a3a12', side: 'right' },
  holy_priest: { bg: '#f7ecd0', border: '#c9a227', text: '#4a3a12', side: 'left' },
  shadow_priest: { bg: '#1f1030', border: '#9b59b6', text: '#e6d1f5', side: 'right' },
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

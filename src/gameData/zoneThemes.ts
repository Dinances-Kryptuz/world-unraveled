// Per-zone color accents — applied as CSS custom properties on the app
// shell (see App.tsx) whenever the player's selected zone changes, so
// navigating from the grassy Greenhollow Fields into the molten Cinderheart
// Crater visibly shifts the UI's accent color and banner, not just the
// zone description text. Deliberately just a palette, not a full skin —
// every screen still shares the same layout/typography, only the accent
// (sidebar highlight, banner, primary buttons) retints per zone.
//
// Also drives the full-viewport illustrated backdrop (see
// components/ZoneBackdrop.tsx) — a sky gradient, a sun/fire glow, three
// parallax silhouette layers, and a drifting-particle color, all built from
// flat CSS (gradients + clip-path), since no art/image pipeline exists in
// this environment. It's a deliberate substitute for real zone artwork —
// same "flat heuristic over real assets" tradeoff as gameData/itemIcons.ts
// — tuned per zone to read as a distinct Warcraft-style vista (Elwynn-ish
// farmland, Redridge-ish highlands, Badlands/Molten Core-ish volcanic
// rifts) rather than just a recolored box.
export interface ZoneTheme {
  primary: string;
  primaryDark: string;
  accent: string;
  bgFrom: string;
  bgTo: string;
  skyTop: string;
  skyBottom: string;
  glow: string;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  particle: string;
  terrain: 'hills' | 'mountains' | 'rift';
}

export const ZONE_THEMES: Record<string, ZoneTheme> = {
  greenhollow_fields: {
    primary: '#4a7c3f',
    primaryDark: '#375d2e',
    accent: '#8fae6a',
    bgFrom: '#eef3e6',
    bgTo: '#dce8cc',
    skyTop: '#7ec1e6',
    skyBottom: '#e3f1d4',
    glow: 'rgba(255, 250, 210, 0.6)',
    hillFar: '#9dbb7c',
    hillMid: '#749c57',
    hillNear: '#4a7c3f',
    particle: '#f3ffc9',
    terrain: 'hills',
  },
  stonecrag_foothills: {
    primary: '#6b6b63',
    primaryDark: '#4f4f49',
    accent: '#a69d8a',
    bgFrom: '#ece9e3',
    bgTo: '#d8d2c6',
    skyTop: '#8d99a3',
    skyBottom: '#d2c9b4',
    glow: 'rgba(255, 255, 255, 0.3)',
    hillFar: '#aca290',
    hillMid: '#857c6a',
    hillNear: '#5c564c',
    particle: '#e4ddcc',
    terrain: 'mountains',
  },
  emberfall_ridge: {
    primary: '#c1572b',
    primaryDark: '#953f1d',
    accent: '#e08a3e',
    bgFrom: '#f6e6da',
    bgTo: '#edcbaf',
    skyTop: '#dd9a56',
    skyBottom: '#f6d49e',
    glow: 'rgba(255, 140, 40, 0.55)',
    hillFar: '#e08a3e',
    hillMid: '#c1572b',
    hillNear: '#7d3418',
    particle: '#ffb060',
    terrain: 'mountains',
  },
  cinderfall_depths: {
    primary: '#5c4a6b',
    primaryDark: '#40334d',
    accent: '#8a7396',
    bgFrom: '#e9e3ed',
    bgTo: '#d3c6db',
    skyTop: '#443a54',
    skyBottom: '#6e5c7e',
    glow: 'rgba(190, 150, 230, 0.35)',
    hillFar: '#8a7396',
    hillMid: '#5c4a6b',
    hillNear: '#352a40',
    particle: '#d2c0e0',
    terrain: 'mountains',
  },
  molten_scar: {
    primary: '#a1281f',
    primaryDark: '#781c15',
    accent: '#d9532a',
    bgFrom: '#f1dcd4',
    bgTo: '#e3b7a8',
    skyTop: '#34140d',
    skyBottom: '#7a2f1a',
    glow: 'rgba(255, 90, 30, 0.6)',
    hillFar: '#c1431f',
    hillMid: '#8f2417',
    hillNear: '#4a140d',
    particle: '#ff7a33',
    terrain: 'rift',
  },
  cinderheart_crater: {
    primary: '#7a1414',
    primaryDark: '#520d0d',
    accent: '#d4a017',
    bgFrom: '#ece0c8',
    bgTo: '#dcc08a',
    skyTop: '#240a0a',
    skyBottom: '#5c1414',
    glow: 'rgba(212, 160, 23, 0.55)',
    hillFar: '#8a2a2a',
    hillMid: '#5c1414',
    hillNear: '#2e0a0a',
    particle: '#f0c040',
    terrain: 'rift',
  },
};

export const DEFAULT_ZONE_THEME: ZoneTheme = ZONE_THEMES.greenhollow_fields;

export function zoneThemeStyle(zoneId: string): Record<string, string> {
  const theme = ZONE_THEMES[zoneId] ?? DEFAULT_ZONE_THEME;
  return {
    '--zone-primary': theme.primary,
    '--zone-primary-dark': theme.primaryDark,
    '--zone-accent': theme.accent,
    '--zone-bg-from': theme.bgFrom,
    '--zone-bg-to': theme.bgTo,
    '--zone-sky-top': theme.skyTop,
    '--zone-sky-bottom': theme.skyBottom,
    '--zone-glow': theme.glow,
    '--zone-hill-far': theme.hillFar,
    '--zone-hill-mid': theme.hillMid,
    '--zone-hill-near': theme.hillNear,
    '--zone-particle': theme.particle,
  };
}

export function zoneTerrain(zoneId: string): ZoneTheme['terrain'] {
  return (ZONE_THEMES[zoneId] ?? DEFAULT_ZONE_THEME).terrain;
}

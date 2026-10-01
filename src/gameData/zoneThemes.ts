// Per-zone color accents — applied as CSS custom properties on the app
// shell (see App.tsx) whenever the player's selected zone changes, so
// navigating from the grassy Greenhollow Fields into the molten Cinderheart
// Crater visibly shifts the UI's accent color and banner, not just the
// zone description text. Deliberately just a palette, not a full skin —
// every screen still shares the same layout/typography, only the accent
// (sidebar highlight, banner, primary buttons) retints per zone.
export interface ZoneTheme {
  primary: string;
  primaryDark: string;
  accent: string;
  bgFrom: string;
  bgTo: string;
}

export const ZONE_THEMES: Record<string, ZoneTheme> = {
  greenhollow_fields: {
    primary: '#4a7c3f',
    primaryDark: '#375d2e',
    accent: '#8fae6a',
    bgFrom: '#eef3e6',
    bgTo: '#dce8cc',
  },
  stonecrag_foothills: {
    primary: '#6b6b63',
    primaryDark: '#4f4f49',
    accent: '#a69d8a',
    bgFrom: '#ece9e3',
    bgTo: '#d8d2c6',
  },
  emberfall_ridge: {
    primary: '#c1572b',
    primaryDark: '#953f1d',
    accent: '#e08a3e',
    bgFrom: '#f6e6da',
    bgTo: '#edcbaf',
  },
  cinderfall_depths: {
    primary: '#5c4a6b',
    primaryDark: '#40334d',
    accent: '#8a7396',
    bgFrom: '#e9e3ed',
    bgTo: '#d3c6db',
  },
  molten_scar: {
    primary: '#a1281f',
    primaryDark: '#781c15',
    accent: '#d9532a',
    bgFrom: '#f1dcd4',
    bgTo: '#e3b7a8',
  },
  cinderheart_crater: {
    primary: '#7a1414',
    primaryDark: '#520d0d',
    accent: '#d4a017',
    bgFrom: '#ece0c8',
    bgTo: '#dcc08a',
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
  };
}

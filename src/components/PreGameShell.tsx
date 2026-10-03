import type { CSSProperties, ReactNode } from 'react';
import { zoneThemeStyle } from '../gameData/zoneThemes';
import { DEFAULT_ZONE_ID } from '../gameData/zones';
import { ZoneBackdrop } from './ZoneBackdrop';

// Shared illustrated-scene wrapper for every screen a player sees before
// (or between) having a live character in the main app shell — login,
// character creation, spec selection. Reuses the same ZoneBackdrop the main
// AppShell renders behind the sidebar (see App.tsx) so the very first thing
// a new player sees already has the game's atmosphere instead of a blank
// page, defaulting to Greenhollow Fields (the zone every new character
// actually starts in) unless a specific zone is passed in.
export function PreGameShell({ zoneId = DEFAULT_ZONE_ID, children }: { zoneId?: string; children: ReactNode }) {
  return (
    <div className="pregame-shell" style={zoneThemeStyle(zoneId) as CSSProperties}>
      <ZoneBackdrop zoneId={zoneId} />
      <div className="pregame-content">{children}</div>
    </div>
  );
}

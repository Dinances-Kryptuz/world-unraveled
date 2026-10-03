// A minimal module-level pub/sub, not a React context — the emitters
// (CombatScreen/DungeonScreen on a kill, Gathering/Fishing/CraftingScreen on
// a finished item) live deep in per-activity components that come and go
// independently of whatever's mounted the single <NotificationToasts />
// display (see App.tsx); a context would need every emitter wrapped in the
// same provider tree, which a module-level subscriber list sidesteps.
export interface GameNotification {
  id: string;
  title: string;
  lines: string[];
}

type Listener = (notification: GameNotification) => void;

const listeners = new Set<Listener>();

export function notify(title: string, lines: string[]): void {
  const notification: GameNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    lines,
  };
  for (const listener of listeners) listener(notification);
}

export function subscribeToNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

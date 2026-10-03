import { useEffect, useState } from 'react';
import { subscribeToNotifications, type GameNotification } from '../utils/notifications';

const DISPLAY_MS = 4500;

// Mounted once at the app root (see App.tsx) — a fixed stack of toast cards
// fed by utils/notifications.ts's notify(), used for combat kills (loot +
// XP) and finished gathering/crafting. Call sites are responsible for
// checking character.notificationsEnabled before calling notify() at all,
// so this component itself doesn't need character context.
export function NotificationToasts() {
  const [toasts, setToasts] = useState<GameNotification[]>([]);

  useEffect(() => {
    return subscribeToNotifications((notification) => {
      setToasts((prev) => [...prev, notification]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== notification.id));
      }, DISPLAY_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="notification-toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="notification-toast">
          <strong className="notification-toast-title">{t.title}</strong>
          {t.lines.map((line, i) => (
            <div key={i} className="notification-toast-line">
              {line}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

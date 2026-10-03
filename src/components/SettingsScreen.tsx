import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { setNotificationsEnabled } from '../firebase/character';
import { CombatSetupScreen } from './CombatSetupScreen';

// A home for account/gameplay preferences that don't belong on any one
// gameplay screen — starts with Combat (relocated from its own top-level
// sidebar entry, since auto/manual-cast is a "set it up once" preference
// more than a thing you tune mid-adventure) and Notifications, with more
// tabs expected to land here over time rather than each getting its own
// sidebar slot.
export function SettingsScreen() {
  const { user } = useAuth();
  const { character, applyOptimisticUpdate } = useCharacter();
  const [tab, setTab] = useState<'combat' | 'notifications'>('combat');

  if (!character) return null;

  async function handleToggleNotifications(enabled: boolean) {
    if (!user) return;
    applyOptimisticUpdate((c) => ({ ...c, notificationsEnabled: enabled }));
    await setNotificationsEnabled(user.uid, enabled);
  }

  return (
    <div className="settings-screen">
      <h2>Settings</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab('combat')} style={tab === 'combat' ? { fontWeight: 'bold' } : undefined}>
          Combat
        </button>
        <button onClick={() => setTab('notifications')} style={tab === 'notifications' ? { fontWeight: 'bold' } : undefined}>
          Notifications
        </button>
      </div>

      {tab === 'combat' ? (
        <CombatSetupScreen />
      ) : (
        <div className="settings-section">
          <h3>Pop-up notifications</h3>
          <label className="settings-checkbox-row">
            <input
              type="checkbox"
              checked={character.notificationsEnabled}
              onChange={(e) => void handleToggleNotifications(e.target.checked)}
            />
            <span>
              Show pop-ups for loot, XP, and finished crafting/gathering
              <small>When on, you'll see a brief notification whenever you defeat an enemy (loot + XP) or finish gathering/crafting an item.</small>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

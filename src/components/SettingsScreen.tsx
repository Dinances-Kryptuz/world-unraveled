import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { setNotificationsEnabled } from '../firebase/character';

// A home for account preferences that don't belong on any one gameplay
// screen. Combat Set Up used to live here too — it's since moved to the
// Class Trainer (see ClassTrainerScreen.tsx) alongside Spells & Abilities
// and Talents, since all three are "how does this character fight"
// concerns that belong together rather than in general Settings.
export function SettingsScreen() {
  const { user } = useAuth();
  const { character, applyOptimisticUpdate } = useCharacter();

  if (!character) return null;

  async function handleToggleNotifications(enabled: boolean) {
    if (!user) return;
    applyOptimisticUpdate((c) => ({ ...c, notificationsEnabled: enabled }));
    await setNotificationsEnabled(user.uid, enabled);
  }

  return (
    <div className="settings-screen">
      <h2>Settings</h2>
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
    </div>
  );
}

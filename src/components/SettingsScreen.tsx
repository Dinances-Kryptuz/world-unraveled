import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { setNotificationsEnabled, setSkillXpNotificationsEnabled, setMasteryXpNotificationsEnabled } from '../firebase/character';

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

  async function handleToggleSkillXpNotifications(enabled: boolean) {
    if (!user) return;
    applyOptimisticUpdate((c) => ({ ...c, skillXpNotificationsEnabled: enabled }));
    await setSkillXpNotificationsEnabled(user.uid, enabled);
  }

  async function handleToggleMasteryXpNotifications(enabled: boolean) {
    if (!user) return;
    applyOptimisticUpdate((c) => ({ ...c, masteryXpNotificationsEnabled: enabled }));
    await setMasteryXpNotificationsEnabled(user.uid, enabled);
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
        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={character.skillXpNotificationsEnabled}
            onChange={(e) => void handleToggleSkillXpNotifications(e.target.checked)}
          />
          <span>
            Show pop-ups for profession skill XP gained
            <small>When on, you'll see a notification each time you gain skill XP while gathering, fishing, crafting, or disenchanting.</small>
          </span>
        </label>
        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={character.masteryXpNotificationsEnabled}
            onChange={(e) => void handleToggleMasteryXpNotifications(e.target.checked)}
          />
          <span>
            Show pop-ups for Mastery XP gained
            <small>When on, you'll see a notification each time you gain Mastery XP (per-recipe or per-material) while gathering, fishing, or crafting.</small>
          </span>
        </label>
      </div>
    </div>
  );
}

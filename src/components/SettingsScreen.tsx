import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { setNotificationsEnabled, setSkillXpNotificationsEnabled, setMasteryXpNotificationsEnabled } from '../firebase/character';
import { setConsumableAutomation } from '../firebase/consumables';
import { ITEMS } from '../gameData/items';
import type { ConsumableAutomationSettings } from '../types/character';

// Herbalism/Alchemy overhaul's Part 8 automation defaults — absence on the
// character (every character before this field existed) means every
// category is off, matching today's fully-manual behavior exactly; this is
// only the in-memory shape used to seed the form/optimistic update the
// first time a player touches one of these controls.
const DEFAULT_AUTOMATION: ConsumableAutomationSettings = {
  offensiveItemId: null,
  defensiveItemId: null,
  healingItemId: null,
  manaItemId: null,
  healingThresholdPct: 50,
  manaThresholdPct: 50,
  autoOffensiveEnabled: false,
  autoDefensiveEnabled: false,
  autoHealingEnabled: false,
  autoManaEnabled: false,
};

// The catalog each select offers — every item of the right shape in ITEMS,
// not just ones currently owned (a persistent preference the player sets up
// once, same spirit as equippedAbilityIds/combatPresets letting you choose
// something before you've necessarily got it slotted). Offensive/defensive
// potions are identified by their BuffEffect category (gameData/types.ts);
// resource potions have no buff at all, so healing/mana are identified by
// which instant-effect field they carry instead.
const OFFENSIVE_POTIONS = Object.values(ITEMS)
  .filter((i) => i.consumableEffect?.buff?.category === 'offensive_potion')
  .sort((a, b) => a.name.localeCompare(b.name));
const DEFENSIVE_POTIONS = Object.values(ITEMS)
  .filter((i) => i.consumableEffect?.buff?.category === 'defensive_potion')
  .sort((a, b) => a.name.localeCompare(b.name));
const HEALING_POTIONS = Object.values(ITEMS)
  .filter((i) => i.consumableEffect?.healAmount !== undefined || i.consumableEffect?.healPctMax !== undefined)
  .sort((a, b) => a.name.localeCompare(b.name));
const MANA_POTIONS = Object.values(ITEMS)
  .filter((i) => i.consumableEffect?.manaAmount !== undefined || i.consumableEffect?.manaPctMax !== undefined)
  .sort((a, b) => a.name.localeCompare(b.name));

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

  // Herbalism/Alchemy overhaul's Part 8 automation — one write merges the
  // whole settings object (setConsumableAutomation replaces it outright, so
  // every call must carry the full current state, not just the changed
  // field), read by combat (online and offline) through
  // gameData/consumableAutomation.ts's buildConsumableAutomationState.
  async function handleAutomationChange(partial: Partial<ConsumableAutomationSettings>) {
    if (!user || !character) return;
    const next: ConsumableAutomationSettings = { ...(character.consumableAutomation ?? DEFAULT_AUTOMATION), ...partial };
    applyOptimisticUpdate((c) => ({ ...c, consumableAutomation: next }));
    await setConsumableAutomation(user.uid, next);
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

      <div className="settings-section">
        <h3>Potion automation</h3>
        <p>
          <small>
            Automatically use a chosen potion during combat, online or offline — the same rules apply either way. Offensive/
            defensive potions use whatever charges you currently own; healing/mana potions trigger once your HP/mana falls to
            or below the chosen threshold, respecting that potion's own cooldown.
          </small>
        </p>

        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={character.consumableAutomation?.autoOffensiveEnabled ?? false}
            onChange={(e) => void handleAutomationChange({ autoOffensiveEnabled: e.target.checked })}
          />
          <span>Auto-use offensive potion</span>
        </label>
        <select
          value={character.consumableAutomation?.offensiveItemId ?? ''}
          onChange={(e) => void handleAutomationChange({ offensiveItemId: e.target.value || null })}
        >
          <option value="">— None selected —</option>
          {OFFENSIVE_POTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={character.consumableAutomation?.autoDefensiveEnabled ?? false}
            onChange={(e) => void handleAutomationChange({ autoDefensiveEnabled: e.target.checked })}
          />
          <span>Auto-use defensive potion</span>
        </label>
        <select
          value={character.consumableAutomation?.defensiveItemId ?? ''}
          onChange={(e) => void handleAutomationChange({ defensiveItemId: e.target.value || null })}
        >
          <option value="">— None selected —</option>
          {DEFENSIVE_POTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={character.consumableAutomation?.autoHealingEnabled ?? false}
            onChange={(e) => void handleAutomationChange({ autoHealingEnabled: e.target.checked })}
          />
          <span>Auto-use healing potion below</span>
          <input
            type="number"
            min={1}
            max={99}
            value={character.consumableAutomation?.healingThresholdPct ?? DEFAULT_AUTOMATION.healingThresholdPct}
            onChange={(e) => void handleAutomationChange({ healingThresholdPct: Number(e.target.value) })}
          />
          <span>% HP</span>
        </label>
        <select
          value={character.consumableAutomation?.healingItemId ?? ''}
          onChange={(e) => void handleAutomationChange({ healingItemId: e.target.value || null })}
        >
          <option value="">— None selected —</option>
          {HEALING_POTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={character.consumableAutomation?.autoManaEnabled ?? false}
            onChange={(e) => void handleAutomationChange({ autoManaEnabled: e.target.checked })}
          />
          <span>Auto-use mana potion below</span>
          <input
            type="number"
            min={1}
            max={99}
            value={character.consumableAutomation?.manaThresholdPct ?? DEFAULT_AUTOMATION.manaThresholdPct}
            onChange={(e) => void handleAutomationChange({ manaThresholdPct: Number(e.target.value) })}
          />
          <span>% mana</span>
        </label>
        <select
          value={character.consumableAutomation?.manaItemId ?? ''}
          onChange={(e) => void handleAutomationChange({ manaItemId: e.target.value || null })}
        >
          <option value="">— None selected —</option>
          {MANA_POTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

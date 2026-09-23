import { AuthProvider, useAuth } from './hooks/useAuth';
import { CharacterProvider, useCharacter } from './hooks/useCharacter';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreationScreen } from './components/CharacterCreationScreen';
import { ZoneScreen } from './components/ZoneScreen';
import { EquipmentScreen } from './components/EquipmentScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { TalentScreen } from './components/TalentScreen';
import { signOut } from './firebase/auth';
import { CLASS_LABELS, SPEC_LABELS } from './gameData/classStats';
import { maxHp, resolveCurrentHp } from './gameData/combatFormulas';
import { getEquipmentStatBonuses } from './gameData/equipmentStats';
import { characterXpForLevelV2 } from './gameData/xpTables';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { character, loading: characterLoading } = useCharacter();

  if (authLoading) {
    return <div className="loading-screen">Loading…</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (characterLoading) {
    return <div className="loading-screen">Loading your character…</div>;
  }

  if (!character) {
    return <CharacterCreationScreen />;
  }

  const equipBonuses = getEquipmentStatBonuses(character.equipment);
  const characterMaxHp = maxHp(character.class, character.level, equipBonuses);
  const currentHp = resolveCurrentHp(character.currentHp, characterMaxHp, character.hpCheckpointAt, new Date());

  const currentLevelXp = characterXpForLevelV2(character.level);
  const nextLevelXp = characterXpForLevelV2(character.level + 1);
  const xpIntoLevel = Math.max(0, character.xp - currentLevelXp);
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const xpProgressPct = Math.max(0, Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100));

  return (
    <div>
      <div className="app-header">
        <p>
          <strong>{character.name}</strong> — {CLASS_LABELS[character.class]}
          {character.spec ? ` (${SPEC_LABELS[character.spec]})` : ''} — Level {character.level} —{' '}
          {Math.round(character.gold)} gold
        </p>
        <p>
          HP: {Math.round(currentHp)} / {Math.round(characterMaxHp)}
        </p>
        <div>
          <div style={{ background: '#e2d9c8', borderRadius: 4, height: 10, width: '100%', overflow: 'hidden' }}>
            <div
              style={{
                background: '#6b4f2a',
                height: '100%',
                width: `${xpProgressPct}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <small>
            {Math.round(xpIntoLevel).toLocaleString()} / {Math.round(xpNeededForLevel).toLocaleString()} XP to level{' '}
            {character.level + 1} ({xpProgressPct.toFixed(1)}%)
          </small>
        </div>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
      <ZoneScreen />
      <EquipmentScreen />
      <InventoryScreen />
      {character.spec && <TalentScreen />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CharacterProvider>
        <AppContent />
      </CharacterProvider>
    </AuthProvider>
  );
}

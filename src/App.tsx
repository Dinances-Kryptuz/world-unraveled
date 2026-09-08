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

  const characterMaxHp = maxHp(character.class, character.level);
  const currentHp = resolveCurrentHp(character.currentHp, characterMaxHp, character.hpCheckpointAt, new Date());

  return (
    <div>
      <div className="app-header">
        <p>
          <strong>{character.name}</strong> — {CLASS_LABELS[character.class]}
          {character.spec ? ` (${SPEC_LABELS[character.spec]})` : ''} — Level {character.level} —{' '}
          {character.gold} gold, {character.xp} XP
        </p>
        <p>
          HP: {Math.round(currentHp)} / {Math.round(characterMaxHp)}
        </p>
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

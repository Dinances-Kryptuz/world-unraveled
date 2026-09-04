import { AuthProvider, useAuth } from './hooks/useAuth';
import { CharacterProvider, useCharacter } from './hooks/useCharacter';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreationScreen } from './components/CharacterCreationScreen';
import { ZoneScreen } from './components/ZoneScreen';
import { signOut } from './firebase/auth';
import { InventoryScreen } from './components/InventoryScreen';
import { EquipmentScreen } from './components/EquipmentScreen';

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

  return (
    <div>
           <p>
        Welcome back, {character.name}! Level {character.level} — {character.gold} gold, {character.xp} XP.
      </p>
      <button onClick={() => signOut()}>Sign out</button>
      <ZoneScreen />
      <EquipmentScreen />
      <InventoryScreen />
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

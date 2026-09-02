import { AuthProvider, useAuth } from './hooks/useAuth';
import { CharacterProvider, useCharacter } from './hooks/useCharacter';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreationScreen } from './components/CharacterCreationScreen';
import { signOut } from './firebase/auth';

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

  // Step 4+ (activity engine wiring, combat, gathering, crafting, equipment,
  // and the real UI) replaces this placeholder.
  return (
    <div>
      <p>
        Welcome back, {character.name}! Level {character.level}.
      </p>
      <button onClick={() => signOut()}>Sign out</button>
      <p>[Main game screen goes here — Step 4+]</p>
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

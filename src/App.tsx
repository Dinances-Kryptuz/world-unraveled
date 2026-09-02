import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/LoginScreen';
import { signOut } from './firebase/auth';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    // Firebase hasn't reported initial auth state yet — avoid flashing the
    // login screen for a logged-in user on refresh.
    return <div className="loading-screen">Loading…</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Step 3 (character creation) replaces this placeholder: it will check
  // whether characters/{uid} exists and route to either character creation
  // or the main game accordingly.
  return (
    <div>
      <p>Signed in as {user.displayName ?? user.email}</p>
      <button onClick={() => signOut()}>Sign out</button>
      <p>[Character creation goes here — Step 3]</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

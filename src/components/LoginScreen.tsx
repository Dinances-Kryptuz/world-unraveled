import { useState } from 'react';
import { signInWithGoogle, signInAnonymouslyForTesting } from '../firebase/auth';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn(method: () => Promise<unknown>) {
    setError(null);
    setSigningIn(true);
    try {
      await method();
      // No navigation needed here — App.tsx watches auth state via useAuth()
      // and re-renders into the game once `user` is set.
    } catch (err) {
      console.error('Sign-in failed:', err);
      setError('Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="login-screen">
      <h1>A World Unraveled</h1>
      <p>Explore a vast and ever-changing world, and uncover why it's coming apart.</p>
      <button onClick={() => handleSignIn(signInWithGoogle)} disabled={signingIn}>
        {signingIn ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {useEmulators && (
        <button onClick={() => handleSignIn(signInAnonymouslyForTesting)} disabled={signingIn}>
          Sign in anonymously (dev/test)
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

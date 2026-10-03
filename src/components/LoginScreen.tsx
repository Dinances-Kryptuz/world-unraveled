import { useState } from 'react';
import { signInWithGoogle, signInAnonymouslyForTesting } from '../firebase/auth';
import { LOGIN_ART_URL } from '../gameData/zoneThemes';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

// Full-bleed title screen: just the hero art (logo baked into the image
// itself) and a sign-in card. Class/spec selection intentionally doesn't
// live here anymore — it shows up right after sign-in, as part of
// CharacterCreationScreen, instead of being previewed before anyone's
// actually signed in.
export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn(method: () => Promise<unknown>) {
    setError(null);
    setSigningIn(true);
    try {
      await method();
      // No navigation needed here — App.tsx watches auth state via useAuth()
      // and re-renders into character creation once `user` is set.
    } catch (err) {
      console.error('Sign-in failed:', err);
      setError('Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="title-screen" style={{ backgroundImage: `url(${LOGIN_ART_URL})` }}>
      <div className="title-screen-card">
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
    </div>
  );
}

import { useState } from 'react';
import { signInWithGoogle, signInAnonymouslyForTesting } from '../firebase/auth';
import { PreGameShell } from './PreGameShell';
import { CLASS_SHOWCASE, CLASS_ICONS, SPEC_ICONS, SPEC_INFO } from '../gameData/classInfo';
import { LOGIN_ART_URL } from '../gameData/zoneThemes';

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
    <PreGameShell>
      <div className="login-hero">
        {/* The game logo is already baked into this artwork, so there's no
            separate <h1> title here — just the image, then the sign-in
            card below it. */}
        <img className="login-hero-image" src={LOGIN_ART_URL} alt="A World Unraveled" />
        <div className="login-hero-card">
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
      </div>

      <div className="class-showcase">
        <h2>Choose Your Path</h2>
        <p className="class-showcase-sub">Three classes, six specializations — pick one when you sign up.</p>
        <div className="class-showcase-grid">
          {CLASS_SHOWCASE.map((cls) => (
            <div key={cls.id} className="class-card">
              <div className="class-card-header">
                <span className="class-card-icon">{CLASS_ICONS[cls.id]}</span>
                <strong>{cls.name}</strong>
              </div>
              <p className="class-card-blurb">{cls.blurb}</p>
              <div className="class-card-specs">
                {cls.specs.map((specId) => (
                  <div key={specId} className="spec-chip" title={SPEC_INFO[specId].blurb}>
                    <span className="spec-chip-icon">{SPEC_ICONS[specId]}</span>
                    <span>
                      <strong>{SPEC_INFO[specId].label}</strong>
                      <small>{SPEC_INFO[specId].blurb}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreGameShell>
  );
}

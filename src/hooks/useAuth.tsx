import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { handleAuthRedirectResult } from '../firebase/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean; // true until Firebase has reported the initial auth state
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resolves a pending signInWithGoogle redirect (if this load is the
    // bounce-back from one) and creates/touches the users/{uid} doc — see
    // firebase/auth.ts's handleAuthRedirectResult doc comment. A failure
    // here (e.g. the user closed/cancelled the Google side) shouldn't crash
    // the app; onAuthStateChanged below is still the source of truth for
    // whether anyone ends up signed in.
    void handleAuthRedirectResult().catch((err) => console.error('Google redirect sign-in failed:', err));

    // onAuthStateChanged fires once immediately with the current state (or
    // null), then again on every sign-in/sign-out. This is the single source
    // of truth for "is someone logged in" throughout the app.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

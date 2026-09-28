import {
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';

async function ensureUserDoc(user: User): Promise<void> {
  const userDocRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userDocRef);

  if (!existing.exists()) {
    await setDoc(userDocRef, {
      email: user.email,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    // Only touch lastLoginAt on return visits — don't rewrite the whole doc.
    await setDoc(userDocRef, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}

/**
 * Signs the player in with Google. If this is their first time, creates
 * their users/{uid} account doc. Does NOT create characters/{uid} — that
 * happens during character creation (step 3), since a signed-in user with
 * no character yet is a valid, expected state (routes to char-creation screen).
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(result.user);
  return result.user;
}

/**
 * Dev/test-only sign-in against the local Firebase emulators — no real
 * Google account, no network calls beyond localhost. LoginScreen only shows
 * this when VITE_USE_FIREBASE_EMULATORS is set, so it can never appear (or
 * be called) against a real Firebase project.
 */
export async function signInAnonymouslyForTesting(): Promise<User> {
  const result = await signInAnonymously(auth);
  await ensureUserDoc(result.user);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

import {
  signInWithRedirect,
  getRedirectResult,
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
 * Signs the player in with Google via a full-page redirect (not a popup).
 * Firefox's Enhanced Tracking Protection and Safari's ITP both partition
 * storage for the third-party auth iframe/popup signInWithPopup relies on
 * — in practice this doesn't fail the sign-in UP FRONT, it leaves the
 * client looking signed in while the Firestore auth context is actually
 * invalid, surfacing later as a generic "Missing or insufficient
 * permissions" error on the first write. A redirect navigates the whole
 * page to accounts.google.com and back, so there's no third-party storage
 * context to partition. The page unloads immediately after this call;
 * see handleAuthRedirectResult below for what happens after it returns.
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Call once on app load to resolve a pending signInWithGoogle redirect, if
 * any — this is where the users/{uid} doc actually gets created/touched
 * now (signInWithGoogle itself can't do it, since the page navigates away
 * before that would run). A no-op (returns null) on every load that isn't
 * the bounce-back from a redirect sign-in. onAuthStateChanged still fires
 * with the resolved user right after this resolves, same as it would for
 * any other sign-in method — the hook just also needs to await this once
 * to actually write ensureUserDoc.
 */
export async function handleAuthRedirectResult(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;
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

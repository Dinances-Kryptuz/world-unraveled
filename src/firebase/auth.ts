import {
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';

/**
 * Signs the player in with Google. If this is their first time, creates
 * their users/{uid} account doc. Does NOT create characters/{uid} — that
 * happens during character creation (step 3), since a signed-in user with
 * no character yet is a valid, expected state (routes to char-creation screen).
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

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

  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

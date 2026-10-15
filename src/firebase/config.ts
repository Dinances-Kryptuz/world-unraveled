import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Real Firebase config values come from environment variables so the real
// keys never get committed. Copy .env.example to .env.local and fill these
// in from your Firebase project settings (Project Settings > General > Your
// apps) — but when VITE_USE_FIREBASE_EMULATORS is set, none of that matters:
// the emulators don't validate this config against a real project at all,
// so a fixed placeholder is used instead and nothing ever leaves localhost.
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const firebaseConfig = useEmulators
  ? {
      apiKey: 'demo-api-key',
      authDomain: 'localhost',
      // Must match .firebaserc's project id exactly — the Functions
      // emulator's callable HTTP endpoints are served under that real
      // project id's path (/world-unraveled/us-central1/<fn>), unlike the
      // Auth/Firestore emulators which accept any project id in
      // singleProjectMode. A mismatched placeholder here 404s every
      // httpsCallable() from the client even though Auth/Firestore work
      // fine.
      projectId: 'world-unraveled',
      storageBucket: 'world-unraveled.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:0000000000000000000000',
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Guild System's Cloud Functions (functions/src/guilds.ts) — the one place
// this game needs genuine server-side authority instead of client-trusted
// writes validated by firestore.rules alone (see guilds.ts's module
// comment). Everything else in this app still talks to Firestore directly.
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

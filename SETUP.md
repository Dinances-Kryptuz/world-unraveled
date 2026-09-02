# Setup — Step 2 (Firebase project + Google Auth)

These are the console steps I can't do for you — everything else in the repo
is already wired to expect them.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project**.
2. Name it (e.g. "world-unraveled"). Google Analytics is optional, skip it for V1.
3. Once created, confirm you're on the **Spark (free) plan** under
   Project Settings → Usage and billing — this should be the default for a
   new project, but worth a glance since Spark is a hard V1 constraint.

## 2. Register a web app
1. In Project Settings → General → "Your apps", click the **</>** (web) icon.
2. Nickname it anything. You do **not** need Firebase Hosting set up right now.
3. Firebase will show you a `firebaseConfig` object with your actual keys —
   copy `.env.example` to `.env.local` and fill in the six values from that
   object (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
   `.env.local` is gitignored — never commit real keys.

## 3. Enable Google Sign-In
1. Build → Authentication → **Get started**.
2. Sign-in method tab → **Google** → Enable → set a support email → Save.

## 4. Create the Firestore database
1. Build → Firestore Database → **Create database**.
2. Start in **production mode** (not test mode) — we already have real rules
   in `firestore.rules` to deploy, so there's no reason to open it up first.
3. Pick any region close to you; it can't be changed later, but for V1 scale
   this won't matter noticeably.

## 5. Deploy the security rules
Requires the Firebase CLI (`npm install -g firebase-tools` once, globally):
```
firebase login
firebase init firestore     # point it at this project, use existing firestore.rules
firebase deploy --only firestore:rules
```

## 6. Run it
```
npm install
npm run dev
```
You should see the "A World Unraveled" login screen. Clicking **Sign in with
Google** should pop the Google account chooser, and after signing in you
should see "Signed in as [your name]" with a sign-out button — that
placeholder text is exactly where Step 3 (character creation) plugs in next.

If the popup gets blocked or sign-in silently fails, check the browser
console — the most common first-run issue is the authorized domain list
(Authentication → Settings → Authorized domains) not yet including
`localhost`, though Firebase adds that by default.

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// Create-only from the client (see firestore.rules's bugReports match) — a
// player can submit a report but never read, edit, or list them back; the
// only way to see submitted reports is the Firebase console.
export async function submitBugReport(params: {
  uid: string | null;
  email?: string | null;
  message: string;
  page: string;
}): Promise<void> {
  await addDoc(collection(db, 'bugReports'), {
    uid: params.uid,
    email: params.email ?? null,
    message: params.message.trim().slice(0, 2000),
    page: params.page.slice(0, 100),
    userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent.slice(0, 300),
    createdAt: serverTimestamp(),
  });
}

// Sets up the connection to your Firebase project. You should not need to touch
// this file — all your settings live in ../config.js.

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from '../config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Keep a copy of the data on the device so the app works with no signal and
// syncs back up later. If that fails (e.g. private browsing), fall back to a
// plain online-only connection so the app still loads.
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  console.warn('Offline cache unavailable, using online-only Firestore:', e);
  firestore = getFirestore(app);
}
export const db = firestore;

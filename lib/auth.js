// Google sign-in and the "only us two" check.

import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';
import { ALLOWED_EMAILS } from '../config.js';

const allowed = ALLOWED_EMAILS.map((e) => e.trim().toLowerCase());

export function isAllowed(email) {
  return !!email && allowed.includes(email.toLowerCase());
}

// Calls cb(user) whenever sign-in state changes. user is null when signed out.
export function onAuthChange(cb) {
  return onAuthStateChanged(auth, (u) => {
    cb(u ? { email: u.email || '', name: u.displayName || '' } : null);
  });
}

export async function signIn() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (!/popup-closed-by-user|cancelled-popup-request/.test(msg)) {
      alert('Sign-in failed:\n' + msg);
    }
  }
}

export function signOutUser() {
  return signOut(auth);
}

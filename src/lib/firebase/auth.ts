import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleAuthProvider } from './config';

export interface PlanUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function formatAuthUser(user: User | null): PlanUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Planner',
    photoURL: user.photoURL,
  };
}

/**
 * Initiates Google OAuth popup sign-in.
 */
export async function signInWithGoogle(): Promise<PlanUser> {
  const auth = getFirebaseAuth();
  const provider = getGoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const formatted = formatAuthUser(result.user);
  if (!formatted) {
    throw new Error('Google sign-in completed but user profile was empty');
  }
  return formatted;
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}

/**
 * Subscribes to Firebase Auth state changes.
 */
export function subscribeToAuth(callback: (user: PlanUser | null) => void): () => void {
  try {
    const auth = getFirebaseAuth();
    return fbOnAuthStateChanged(auth, (user) => {
      callback(formatAuthUser(user));
    });
  } catch {
    callback(null);
    return () => {};
  }
}

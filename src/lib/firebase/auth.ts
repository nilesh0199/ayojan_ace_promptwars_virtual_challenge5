import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  User,
  GoogleAuthProvider,
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
 * Maps Firebase Auth error codes to friendly, accessible messages with clear instructions.
 */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : String(error || '');

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Please add this deployment domain (or localhost) to Firebase Console under Authentication > Settings > Authorized domains.';
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please allow popups for this site or try again to use redirect sign-in.';
    case 'auth/popup-closed-by-user':
      return 'The sign-in window was closed before completing. Please try signing in again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup request was cancelled. Please try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Console. Please enable Google under Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network connection issue while communicating with Firebase. Please check your internet connection and try again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Please check NEXT_PUBLIC_FIREBASE_API_KEY environment variable.';
    case 'auth/app-not-authorized':
      return 'This web application is not authorized to use Firebase Authentication with the configured API key.';
    default:
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const msg = String((error as { message: unknown }).message);
        if (msg.includes('unauthorized domain')) {
          return 'This domain is not authorized in Firebase. Please add this domain under Firebase Console > Authentication > Settings > Authorized domains.';
        }
      }
      return 'Unable to complete sign-in. Please verify your network and Firebase configuration, then try again.';
  }
}

/**
 * Checks whether the current browser is running on a mobile device.
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

/**
 * Initiates Google OAuth sign-in.
 * Uses popup by default, with automatic fallback to redirect on mobile or popup-blocked.
 */
export async function signInWithGoogle(): Promise<PlanUser> {
  const auth = getFirebaseAuth();
  const provider = getGoogleAuthProvider();

  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch {
    // Ignore persistence errors in test or SSR environments
  }

  if (isMobileBrowser()) {
    try {
      await signInWithRedirect(auth, provider);
      // Returns a placeholder while redirect happens
      return {
        uid: 'pending-redirect',
        email: null,
        displayName: 'Signing in...',
        photoURL: null,
      };
    } catch (redirectErr) {
      throw new Error(getFriendlyAuthErrorMessage(redirectErr));
    }
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const formatted = formatAuthUser(result.user);
    if (!formatted) {
      throw new Error('Google sign-in completed but user profile was empty');
    }
    return formatted;
  } catch (popupErr: unknown) {
    const code =
      typeof popupErr === 'object' && popupErr !== null && 'code' in popupErr
        ? String((popupErr as { code: unknown }).code)
        : '';

    // If popup was blocked, fall back to redirect
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return {
        uid: 'pending-redirect',
        email: null,
        displayName: 'Redirecting to Google...',
        photoURL: null,
      };
    }

    throw new Error(getFriendlyAuthErrorMessage(popupErr));
  }
}

/**
 * Checks if returning from a signInWithRedirect.
 */
export async function handleRedirectAuthResult(): Promise<PlanUser | null> {
  try {
    const auth = getFirebaseAuth();
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return formatAuthUser(result.user);
    }
    return null;
  } catch (err) {
    throw new Error(getFriendlyAuthErrorMessage(err));
  }
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
  clearCalendarAccessToken();
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

// ---------------------------------------------------------
// IN-MEMORY GOOGLE CALENDAR ACCESS TOKEN (Strictly non-persistent)
// Never stored in localStorage, Firestore, cookies, or logs.
// ---------------------------------------------------------

let inMemoryCalendarToken: string | null = null;
let calendarTokenExpiryEpoch: number = 0;

export function setCalendarAccessToken(token: string | null, expiresInSeconds = 3600): void {
  inMemoryCalendarToken = token;
  calendarTokenExpiryEpoch = token ? Date.now() + expiresInSeconds * 1000 : 0;
}

export function getCalendarAccessToken(): string | null {
  if (!inMemoryCalendarToken) return null;
  // If expired with 60-second safety window, discard
  if (Date.now() >= calendarTokenExpiryEpoch - 60000) {
    inMemoryCalendarToken = null;
    calendarTokenExpiryEpoch = 0;
    return null;
  }
  return inMemoryCalendarToken;
}

export function clearCalendarAccessToken(): void {
  inMemoryCalendarToken = null;
  calendarTokenExpiryEpoch = 0;
}

/**
 * Requests Google Calendar events scope (https://www.googleapis.com/auth/calendar.events)
 * via GoogleAuthProvider and securely stores the token in memory ONLY.
 * Includes granted scopes and passes login_hint to reduce repeated prompt friction.
 */
export async function requestGoogleCalendarAccess(loginHint?: string): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  const customParams: Record<string, string> = {
    prompt: 'consent',
    include_granted_scopes: 'true',
  };
  const effectiveHint = loginHint || auth.currentUser?.email;
  if (effectiveHint) {
    customParams.login_hint = effectiveHint;
  }
  provider.setCustomParameters(customParams);

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error(
        'Google Calendar permission was not granted. Please approve calendar permissions when prompted.'
      );
    }

    setCalendarAccessToken(token, 3600);
    return token;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code: unknown }).code)
        : '';

    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Google Calendar consent window was closed before finishing.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Calendar permission popup was blocked by your browser. Please allow popups.');
    }
    throw new Error(getFriendlyAuthErrorMessage(err));
  }
}

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface ClientFirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export const REQUIRED_FIREBASE_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export const FIREBASE_VAR_NAME_MAP: Record<keyof ClientFirebaseConfig, string> = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
};

/**
 * Literal property accesses for all six NEXT_PUBLIC_FIREBASE_* variables.
 * Next.js strictly requires literal property accesses (process.env.NEXT_PUBLIC_*)
 * so that bundlers can inline the values into client JavaScript at build time.
 * Dynamic access (e.g. process.env[name]) returns undefined in the browser.
 */
export const clientFirebaseEnv: ClientFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Detects empty strings, whitespace-only values, or obvious placeholder templates.
 */
export function isPlaceholderOrMissing(val: string | undefined | null): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  if (trimmed.length === 0) return true;
  const lower = trimmed.toLowerCase();

  return (
    lower.startsWith('<') ||
    lower.startsWith('your_') ||
    lower.startsWith('your-') ||
    lower.startsWith('your ') ||
    lower.startsWith('insert_') ||
    lower.startsWith('replace_') ||
    lower.includes('placeholder') ||
    lower === 'mock-api-key' ||
    lower === 'aayojan-ace-app' ||
    lower === 'aayojan-ace-app.firebaseapp.com' ||
    lower === 'aayojan-ace-app.appspot.com' ||
    lower === '123456789012' ||
    lower === '1:123456789012:web:abcdef' ||
    lower === 'undefined' ||
    lower === 'null'
  );
}

/**
 * Type guard for ClientFirebaseConfig.
 */
export function isClientFirebaseConfig(
  input: ClientFirebaseConfig | Record<string, string | undefined>
): input is ClientFirebaseConfig {
  return (
    'apiKey' in input ||
    'authDomain' in input ||
    'projectId' in input ||
    'storageBucket' in input ||
    'messagingSenderId' in input ||
    'appId' in input
  );
}

/**
 * Normalizes either a typed ClientFirebaseConfig or a raw env record.
 */
export function normalizeFirebaseConfig(
  input?: ClientFirebaseConfig | Record<string, string | undefined>
): ClientFirebaseConfig {
  if (!input) return clientFirebaseEnv;
  if (isClientFirebaseConfig(input)) {
    return input;
  }
  const raw = input as Record<string, string | undefined>;
  return {
    apiKey: raw.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: raw.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: raw.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: raw.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: raw.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: raw.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

/**
 * Checks for missing or placeholder Firebase environment variables.
 * Returns an array of missing variable names (never values or secrets).
 */
export function getMissingFirebaseConfigVars(
  input?: ClientFirebaseConfig | Record<string, string | undefined>
): string[] {
  const config = normalizeFirebaseConfig(input);
  const missing: string[] = [];

  const keys: Array<keyof ClientFirebaseConfig> = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  for (const key of keys) {
    if (isPlaceholderOrMissing(config[key])) {
      missing.push(FIREBASE_VAR_NAME_MAP[key]);
    }
  }

  return missing;
}

export function isFirebaseConfigured(
  input?: ClientFirebaseConfig | Record<string, string | undefined>
): boolean {
  return getMissingFirebaseConfigVars(input).length === 0;
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'aayojan-ace-app.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'aayojan-ace-app',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'aayojan-ace-app.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef',
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let googleProvider: GoogleAuthProvider | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    // Server environment or SSR
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    return app;
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const fbApp = getFirebaseApp();
    auth = getAuth(fbApp);
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    const fbApp = getFirebaseApp();
    db = getFirestore(fbApp);
  }
  return db;
}

export function getGoogleAuthProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
  return googleProvider;
}

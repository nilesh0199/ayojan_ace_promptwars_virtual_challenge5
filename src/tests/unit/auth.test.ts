import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFriendlyAuthErrorMessage,
  formatAuthUser,
  setCalendarAccessToken,
  getCalendarAccessToken,
  clearCalendarAccessToken,
  isMobileBrowser,
} from '@/lib/firebase/auth';
import {
  getMissingFirebaseConfigVars,
  isFirebaseConfigured,
  isPlaceholderOrMissing,
  ClientFirebaseConfig,
} from '@/lib/firebase/config';
import { User } from 'firebase/auth';

describe('Firebase Auth Utilities & Error Mapping', () => {
  describe('getFriendlyAuthErrorMessage', () => {
    it('maps auth/unauthorized-domain with explicit instructions to configure Firebase Authorized domains', () => {
      const msg = getFriendlyAuthErrorMessage({ code: 'auth/unauthorized-domain' });
      expect(msg).toContain('This domain is not authorized in Firebase');
      expect(msg).toContain('Authorized domains');
    });

    it('maps auth/popup-blocked with clear guidance', () => {
      const msg = getFriendlyAuthErrorMessage({ code: 'auth/popup-blocked' });
      expect(msg).toContain('popup was blocked');
    });

    it('maps auth/popup-closed-by-user gracefully', () => {
      const msg = getFriendlyAuthErrorMessage({ code: 'auth/popup-closed-by-user' });
      expect(msg).toContain('window was closed');
    });

    it('maps auth/operation-not-allowed explaining Google provider must be enabled', () => {
      const msg = getFriendlyAuthErrorMessage({ code: 'auth/operation-not-allowed' });
      expect(msg).toContain('Google sign-in is not enabled in Firebase Console');
    });

    it('maps auth/network-request-failed friendly message', () => {
      const msg = getFriendlyAuthErrorMessage({ code: 'auth/network-request-failed' });
      expect(msg).toContain('Network connection issue');
    });

    it('handles unexpected error codes with safe fallback', () => {
      const msg = getFriendlyAuthErrorMessage({ code: 'auth/unknown-error' });
      expect(msg).toContain('Unable to complete sign-in');
    });
  });

  describe('formatAuthUser', () => {
    it('returns null when user is null', () => {
      expect(formatAuthUser(null)).toBeNull();
    });

    it('formats user profile extracting displayName or email prefix', () => {
      const mockUser = {
        uid: 'user-123',
        email: 'celebration@example.com',
        displayName: 'Aarav Sharma',
        photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
      } as User;

      const formatted = formatAuthUser(mockUser);
      expect(formatted).toEqual({
        uid: 'user-123',
        email: 'celebration@example.com',
        displayName: 'Aarav Sharma',
        photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
      });
    });

    it('falls back to email username if displayName is missing', () => {
      const mockUser = {
        uid: 'user-456',
        email: 'ananya@domain.com',
        displayName: null,
        photoURL: null,
      } as User;

      const formatted = formatAuthUser(mockUser);
      expect(formatted?.displayName).toBe('ananya');
    });
  });

  describe('getMissingFirebaseConfigVars (Startup Environment Check)', () => {
    it('verifies that no source file under src/ uses dynamic process.env[...] lookup for NEXT_PUBLIC variables', () => {
      const srcDir = path.resolve(process.cwd(), 'src');

      function scanDir(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            results = results.concat(scanDir(filePath));
          } else if (/\.(ts|tsx)$/.test(file)) {
            results.push(filePath);
          }
        }
        return results;
      }

      const files = scanDir(srcDir);
      const dynamicAccessPattern = /process\.env\s*\[\s*['"`]?NEXT_PUBLIC/i;
      const genericDynamicPattern = /process\.env\s*\[\s*[a-zA-Z0-9_]+\s*\]/i;

      const violatingFiles: string[] = [];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        // Exclude this test file itself from the scan
        if (file.endsWith('auth.test.ts')) continue;

        // Strip comments before checking for code usage of process.env[...]
        const codeOnly = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');

        if (dynamicAccessPattern.test(codeOnly) || genericDynamicPattern.test(codeOnly)) {
          violatingFiles.push(file);
        }
      }

      expect(violatingFiles).toEqual([]);
    });

    it('identifies missing or placeholder variables by name without revealing values', () => {
      const mockConfig: ClientFirebaseConfig = {
        apiKey: 'mock-api-key',
        authDomain: '',
        projectId: 'aayojan-ace-app', // default placeholder
        storageBucket: undefined,
        messagingSenderId: '123456789012',
        appId: '1:123456789012:web:abcdef',
      };

      const missing = getMissingFirebaseConfigVars(mockConfig);
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_APP_ID');
      expect(isFirebaseConfigured(mockConfig)).toBe(false);

      // Verify that values are NEVER in the missing list
      expect(missing).not.toContain('mock-api-key');
      expect(missing).not.toContain('123456789012');
    });

    it('treats empty strings, whitespace, and obvious placeholder text as missing', () => {
      expect(isPlaceholderOrMissing('')).toBe(true);
      expect(isPlaceholderOrMissing('   ')).toBe(true);
      expect(isPlaceholderOrMissing(undefined)).toBe(true);
      expect(isPlaceholderOrMissing(null)).toBe(true);
      expect(isPlaceholderOrMissing('<your-api-key>')).toBe(true);
      expect(isPlaceholderOrMissing('your_project_id_here')).toBe(true);
      expect(isPlaceholderOrMissing('your-app-id')).toBe(true);
      expect(isPlaceholderOrMissing('insert_sender_id')).toBe(true);
      expect(isPlaceholderOrMissing('replace_with_key')).toBe(true);
      expect(isPlaceholderOrMissing('placeholder_value')).toBe(true);
      expect(isPlaceholderOrMissing('mock-api-key')).toBe(true);
      expect(isPlaceholderOrMissing('aayojan-ace-app.firebaseapp.com')).toBe(true);
      expect(isPlaceholderOrMissing('123456789012')).toBe(true);

      // Real values must return false
      expect(isPlaceholderOrMissing('AIzaSyA_real_production_key_12345')).toBe(false);
      expect(isPlaceholderOrMissing('my-live-project.firebaseapp.com')).toBe(false);
      expect(isPlaceholderOrMissing('custom-production-project')).toBe(false);
    });

    it('returns empty array when all actual production values are supplied', () => {
      const validConfig: ClientFirebaseConfig = {
        apiKey: 'AIzaSyA_real_production_key',
        authDomain: 'my-custom-prod.firebaseapp.com',
        projectId: 'my-custom-prod',
        storageBucket: 'my-custom-prod.appspot.com',
        messagingSenderId: '987654321098',
        appId: '1:987654321098:web:xyz123',
      };

      const missing = getMissingFirebaseConfigVars(validConfig);
      expect(missing).toHaveLength(0);
      expect(isFirebaseConfigured(validConfig)).toBe(true);
    });

    it('handles partially configured environment gracefully', () => {
      const partialConfig: ClientFirebaseConfig = {
        apiKey: 'AIzaSyRealApiKey123',
        authDomain: 'my-custom-project.firebaseapp.com',
        projectId: '   ', // whitespace
        storageBucket: undefined,
        messagingSenderId: '<sender-id>',
        appId: 'your_app_id',
      };

      const missing = getMissingFirebaseConfigVars(partialConfig);
      expect(missing).not.toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(missing).not.toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_APP_ID');
      expect(missing).toHaveLength(4);
    });
  });

  describe('In-Memory Calendar OAuth Access Token Store', () => {
    beforeEach(() => {
      clearCalendarAccessToken();
    });

    it('stores token in runtime memory and retrieves valid token', () => {
      setCalendarAccessToken('oauth-token-abc', 3600);
      expect(getCalendarAccessToken()).toBe('oauth-token-abc');
    });

    it('clears token immediately when requested', () => {
      setCalendarAccessToken('oauth-token-abc', 3600);
      clearCalendarAccessToken();
      expect(getCalendarAccessToken()).toBeNull();
    });

    it('discards expired token automatically', () => {
      vi.useFakeTimers();
      setCalendarAccessToken('expiring-token', 120); // 2 minutes

      // Advance clock by 3 minutes
      vi.advanceTimersByTime(180 * 1000);
      expect(getCalendarAccessToken()).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('isMobileBrowser', () => {
    const originalNavigator = window.navigator;

    afterEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('detects desktop vs mobile user agent strings', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
        writable: true,
      });
      expect(isMobileBrowser()).toBe(true);

      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true,
      });
      expect(isMobileBrowser()).toBe(false);
    });
  });
});

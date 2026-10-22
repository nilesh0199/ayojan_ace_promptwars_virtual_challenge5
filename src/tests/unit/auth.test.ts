import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFriendlyAuthErrorMessage,
  formatAuthUser,
  setCalendarAccessToken,
  getCalendarAccessToken,
  clearCalendarAccessToken,
  isMobileBrowser,
} from '@/lib/firebase/auth';
import { getMissingFirebaseConfigVars, isFirebaseConfigured } from '@/lib/firebase/config';
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
    it('identifies missing or placeholder variables by name without revealing values', () => {
      const mockEnv: Record<string, string | undefined> = {
        NEXT_PUBLIC_FIREBASE_API_KEY: 'mock-api-key',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'aayojan-ace-app', // default placeholder
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: undefined,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
        NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789012:web:abcdef',
      };

      const missing = getMissingFirebaseConfigVars(mockEnv);
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
      expect(missing).toContain('NEXT_PUBLIC_FIREBASE_APP_ID');
      expect(isFirebaseConfigured(mockEnv)).toBe(false);
    });

    it('returns empty array when all actual production values are supplied', () => {
      const validEnv = {
        NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyA_real_production_key',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'my-custom-prod.firebaseapp.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'my-custom-prod',
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'my-custom-prod.appspot.com',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '987654321098',
        NEXT_PUBLIC_FIREBASE_APP_ID: '1:987654321098:web:xyz123',
      };

      const missing = getMissingFirebaseConfigVars(validEnv);
      expect(missing).toHaveLength(0);
      expect(isFirebaseConfigured(validEnv)).toBe(true);
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

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  PlanUser,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  handleRedirectAuthResult,
} from '@/lib/firebase/auth';
import { getMissingFirebaseConfigVars } from '@/lib/firebase/config';

interface AuthContextType {
  user: PlanUser | null;
  loading: boolean;
  authError: string | null;
  missingConfigVars: string[];
  clearAuthError: () => void;
  signIn: (returnUrl?: string | unknown) => Promise<PlanUser | null>;
  signOut: () => Promise<void>;
  isSaveModalOpen: boolean;
  openSaveModal: () => void;
  closeSaveModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlanUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [missingConfigVars, setMissingConfigVars] = useState<string[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Check missing environment variables on client mount
  useEffect(() => {
    const missing = getMissingFirebaseConfigVars();
    setMissingConfigVars(missing);
  }, []);

  // Handle redirect auth result and subscribe to auth state
  useEffect(() => {
    let isMounted = true;

    // Check if returning from redirect
    handleRedirectAuthResult()
      .then((redirectUser) => {
        if (redirectUser && isMounted) {
          setUser(redirectUser);
          if (typeof window !== 'undefined') {
            try {
              const returnUrl = window.sessionStorage.getItem('aayojan_auth_return_url');
              if (returnUrl) {
                window.sessionStorage.removeItem('aayojan_auth_return_url');
                window.location.assign(returnUrl);
              }
            } catch {
              // Ignore session storage errors
            }
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAuthError(err instanceof Error ? err.message : 'Redirect sign-in error');
        }
      });

    const unsubscribe = subscribeToAuth((authUser) => {
      if (isMounted) {
        setUser(authUser);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signIn = async (returnUrl?: string | unknown): Promise<PlanUser | null> => {
    clearAuthError();

    const targetUrl = typeof returnUrl === 'string' ? returnUrl : undefined;

    if (targetUrl && typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('aayojan_auth_return_url', targetUrl);
      } catch {
        // Ignore session storage errors
      }
    }

    if (missingConfigVars.length > 0) {
      const err = `Firebase configuration incomplete. Missing environment variable(s): ${missingConfigVars.join(', ')}`;
      setAuthError(err);
      return null;
    }

    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser && loggedUser.uid !== 'pending-redirect') {
        setUser(loggedUser);
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.removeItem('aayojan_auth_return_url');
          } catch {
            // Ignore session storage errors
          }
        }
      }
      setIsSaveModalOpen(false);
      return loggedUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete Google sign-in';
      setAuthError(msg);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await signOutUser();
    } finally {
      setUser(null);
      clearAuthError();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        missingConfigVars,
        clearAuthError,
        signIn,
        signOut,
        isSaveModalOpen,
        openSaveModal: () => setIsSaveModalOpen(true),
        closeSaveModal: () => setIsSaveModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

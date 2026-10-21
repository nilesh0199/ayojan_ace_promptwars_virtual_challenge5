'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PlanUser, signInWithGoogle, signOutUser, subscribeToAuth } from '@/lib/firebase/auth';

interface AuthContextType {
  user: PlanUser | null;
  loading: boolean;
  signIn: () => Promise<PlanUser>;
  signOut: () => Promise<void>;
  isSaveModalOpen: boolean;
  openSaveModal: () => void;
  closeSaveModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PlanUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const loggedUser = await signInWithGoogle();
    setUser(loggedUser);
    setIsSaveModalOpen(false);
    return loggedUser;
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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

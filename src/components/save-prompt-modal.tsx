'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { Lock, X } from 'lucide-react';
import { GoogleSignInButton } from './google-sign-in-button';

interface SavePromptModalProps {
  onSuccess?: () => void;
}

export function SavePromptModal({ onSuccess }: SavePromptModalProps) {
  const { isSaveModalOpen, closeSaveModal, signIn } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isSaveModalOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      // Focus first actionable element inside modal
      const firstButton = dialogRef.current?.querySelector('button');
      firstButton?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeSaveModal();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isSaveModalOpen, closeSaveModal]);

  if (!isSaveModalOpen) return null;

  const handleSignIn = async () => {
    try {
      await signIn();
      if (onSuccess) onSuccess();
    } catch {
      // Error handled inside auth
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={closeSaveModal}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
        aria-describedby="save-modal-description"
        className="relative w-full max-w-md rounded-2xl border border-rule bg-paper-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeSaveModal}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-paper-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-accent mb-4">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 id="save-modal-title" className="font-serif text-2xl font-bold text-ink mb-2">
          Save Your Celebration Plan
        </h2>

        <p id="save-modal-description" className="text-sm text-ink-muted leading-relaxed mb-6">
          You are currently in <strong>Guest Mode</strong>. Your plan is stored in local browser memory.
          Sign in with Google to securely save your plan to Firestore, sync across devices, reopen past plans, and track version history.
        </p>

        <div className="flex flex-col gap-3">
          <GoogleSignInButton onClick={handleSignIn} />

          <button
            type="button"
            onClick={closeSaveModal}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-rule px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper-subtle transition-colors focus-visible:ring-2 focus-visible:ring-accent"
          >
            Keep Editing in Guest Mode
          </button>
        </div>
      </div>
    </div>
  );
}

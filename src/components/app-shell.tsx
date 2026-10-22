'use client';

import React from 'react';
import Link from 'next/link';
import { DesktopNavRail, MobileNavBar } from './navigation';
import { SavePromptModal } from './save-prompt-modal';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from './auth-context';
import { usePlan } from './plan-context';
import { LogIn, LogOut, AlertTriangle, AlertCircle, Sparkles, X } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signIn, signOut, loading, authError, clearAuthError, missingConfigVars } = useAuth();
  const { guestPlanPrompt, importGuestPlan, dismissGuestImport } = usePlan();

  return (
    <div className="flex min-h-screen md:h-screen md:overflow-hidden w-full bg-paper text-ink">
      {/* Desktop Navigation Rail */}
      <DesktopNavRail />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 w-full md:h-full md:overflow-y-auto">
        {/* Startup Alert: Missing Firebase Config Banner */}
        {missingConfigVars.length > 0 && (
          <div
            role="alert"
            className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>Firebase Setup Incomplete:</strong> Missing environment variables:{' '}
                <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-[11px]">
                  {missingConfigVars.join(', ')}
                </code>
                . Cloud sign-in and sync are paused until configured.
              </span>
            </div>
          </div>
        )}

        {/* Global Auth Error Alert */}
        {authError && (
          <div
            role="alert"
            className="bg-state-error-subtle border-b border-state-error text-state-error px-4 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{authError}</span>
            </div>
            <button
              type="button"
              onClick={clearAuthError}
              aria-label="Dismiss sign-in alert"
              className="p-1 rounded hover:bg-state-error/10 text-state-error shrink-0"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Guest Plan Import Banner */}
        {guestPlanPrompt && user && (
          <div
            role="region"
            aria-label="Guest plan import prompt"
            className="bg-accent-subtle border-b border-accent/40 text-accent px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs shrink-0"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
              <span>
                <strong>Import your guest plan to your account?</strong> We found your plan &ldquo;{guestPlanPrompt.title}&rdquo; from this session.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={importGuestPlan}
                className="bg-accent text-accent-text px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-accent-hover transition-colors shadow-xs"
              >
                Import to Account
              </button>
              <button
                type="button"
                onClick={dismissGuestImport}
                className="border border-accent/40 text-accent px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent/10 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-rule bg-paper-card sticky top-0 z-30 shrink-0">
          <Link href="/" className="flex items-center gap-2" aria-label="Aayojan Ace Home">
            <div
              className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-text font-serif font-black text-base"
              aria-label="Aayojan Ace Brand Emblem"
            >
              A
            </div>
            <span className="font-serif font-bold text-lg text-ink" aria-label="Aayojan Ace">
              Aayojan <span className="text-accent">Ace</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!loading && !user && (
              <button
                type="button"
                onClick={signIn}
                className="flex items-center gap-1.5 text-xs font-semibold bg-accent text-accent-text px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign in</span>
              </button>
            )}
            {!loading && user && (
              <div className="flex items-center gap-1.5">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="h-8 w-8 rounded-full border border-rule object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-xs font-bold border border-rule">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1.5 rounded-md text-ink-muted hover:text-state-error hover:bg-paper-subtle transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Primary Page Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 focus:outline-hidden"
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNavBar />

        {/* Global Save Prompt Dialog */}
        <SavePromptModal />
      </div>
    </div>
  );
}

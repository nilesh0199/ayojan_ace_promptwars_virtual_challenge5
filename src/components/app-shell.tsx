'use client';

import React from 'react';
import Link from 'next/link';
import { DesktopNavRail, MobileNavBar } from './navigation';
import { SavePromptModal } from './save-prompt-modal';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from './auth-context';
import { LogIn } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signIn, loading } = useAuth();

  return (
    <div className="flex min-h-screen md:h-screen md:overflow-hidden w-full bg-paper text-ink">
      {/* Desktop Navigation Rail */}
      <DesktopNavRail />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 w-full md:h-full md:overflow-y-auto">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-rule bg-paper-card sticky top-0 z-30">
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
                className="flex items-center gap-1.5 text-xs font-medium bg-accent text-accent-text px-2.5 py-1.5 rounded-md"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign in</span>
              </button>
            )}
            {!loading && user && (
              <div className="h-8 w-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-xs font-bold">
                {user.displayName?.[0] || 'U'}
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

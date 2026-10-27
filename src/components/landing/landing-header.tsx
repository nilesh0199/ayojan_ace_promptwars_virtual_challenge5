'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export function LandingHeader() {
  const router = useRouter();
  const { user, signIn, signOut, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      const loggedUser = await signIn('/plan');
      if (loggedUser && loggedUser.uid !== 'pending-redirect') {
        router.push('/plan');
      }
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#300D26]/10 dark:border-[#FAF6EE]/10 bg-[#FDFBF7]/90 dark:bg-[#140A13]/90 backdrop-blur-md transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7E1333] rounded-xl p-1"
          aria-label="Aayojan Ace Home"
        >
          <div
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#7E1333] to-[#300D26] dark:from-[#96193E] dark:to-[#421535] flex items-center justify-center text-white font-serif font-black text-xl shadow-xs group-hover:scale-105 transition-transform"
            aria-label="Aayojan Ace Brand Emblem"
          >
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-[#300D26] dark:text-[#FAF6EE] leading-none">
              Aayojan <span className="text-[#7E1333] dark:text-[#F26D8E]">Ace</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans text-[#5C3852] dark:text-[#D6BDCE] tracking-wider uppercase mt-1">
              Celebration Planner
            </span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User / Sign-In */}
          {!loading && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#300D26]/5 dark:bg-[#FAF6EE]/10 border border-[#300D26]/10 dark:border-[#FAF6EE]/15">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User profile'}
                    className="h-7 w-7 rounded-full object-cover border border-[#300D26]/20 dark:border-[#FAF6EE]/20"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-[#7E1333] text-white flex items-center justify-center text-xs font-bold">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-[#300D26] dark:text-[#FAF6EE] max-w-[120px] truncate">
                  {user.displayName || 'Account'}
                </span>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[#5C3852] dark:text-[#D6BDCE] hover:text-[#7E1333] dark:hover:text-[#F26D8E] hover:bg-[#300D26]/5 dark:hover:bg-[#FAF6EE]/5 transition-colors flex items-center justify-center"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border border-[#300D26]/20 dark:border-[#FAF6EE]/20 bg-[#FDFBF7] dark:bg-[#140A13] text-xs sm:text-sm font-semibold text-[#300D26] dark:text-[#FAF6EE] hover:bg-[#300D26]/5 dark:hover:bg-[#FAF6EE]/5 transition-colors shadow-2xs"
            >
              <LogIn className="h-3.5 w-3.5 text-[#7E1333] dark:text-[#F26D8E]" aria-hidden="true" />
              <span>Sign up / Login</span>
            </button>
          )}

          {/* Constant "Start plan" Button */}
          <Link
            href="/plan"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-[#7E1333] to-[#96193E] dark:from-[#96193E] dark:to-[#B31D4A] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all border-t border-white/30"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Start plan</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

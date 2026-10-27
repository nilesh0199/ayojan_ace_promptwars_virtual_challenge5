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
    <header className="sticky top-0 z-50 w-full bg-transparent transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6D28D9] dark:focus-visible:ring-[#C4A5F5] rounded-xl p-1"
          aria-label="Aayojan Ace Home"
        >
          <div
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#B91C3C] to-[#4A1D7A] dark:from-[#D6203F] dark:to-[#6D28D9] border-t border-white/30 flex items-center justify-center text-white font-serif font-black text-xl shadow-xs group-hover:scale-105 transition-transform"
            aria-label="Aayojan Ace Brand Emblem"
          >
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-[#4A1D7A] dark:text-[#F8EEDC] leading-[1.2] descender-safe">
              Aayojan <span className="text-[#B91C3C] dark:text-[#FF6B81]">Ace</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans text-[#4A1D7A]/75 dark:text-[#DAC7E8] tracking-wider uppercase mt-0.5">
              Celebration Planner
            </span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User / Sign-In */}
          {!loading && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#4A1D7A]/5 dark:bg-[#F8EEDC]/10 border border-[#4A1D7A]/10 dark:border-[#F8EEDC]/15">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User profile'}
                    className="h-7 w-7 rounded-full object-cover border border-[#4A1D7A]/20 dark:border-[#F8EEDC]/20"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-[#B91C3C] text-white flex items-center justify-center text-xs font-bold">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-[#4A1D7A] dark:text-[#F8EEDC] max-w-[120px] truncate">
                  {user.displayName || 'Account'}
                </span>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[#4A1D7A]/70 dark:text-[#DAC7E8] hover:text-[#B91C3C] dark:hover:text-[#FF6B81] hover:bg-[#4A1D7A]/5 dark:hover:bg-[#F8EEDC]/5 transition-colors flex items-center justify-center"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border border-[#6D28D9]/40 dark:border-[#C4A5F5]/40 bg-[#6D28D9]/10 dark:bg-[#C4A5F5]/15 text-xs sm:text-sm font-semibold text-[#4A1D7A] dark:text-[#F8EEDC] hover:bg-[#6D28D9]/15 dark:hover:bg-[#C4A5F5]/25 transition-colors shadow-2xs"
            >
              <LogIn className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#C4A5F5]" aria-hidden="true" />
              <span>Sign up / Login</span>
            </button>
          )}

          {/* Constant "Start plan" Button */}
          <Link
            href="/plan"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-[#B91C3C] to-[#D6203F] text-[#FFF9EE] text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(185,28,60,0.35)] hover:shadow-[0_6px_20px_rgba(185,28,60,0.45)] hover:brightness-105 active:scale-[0.98] transition-all border-t border-white/30 dark:border-white/10 dark:shadow-[0_4px_14px_rgba(185,28,60,0.2)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6D28D9] dark:focus-visible:ring-[#C4A5F5]"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
            <span>Start plan</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle variant="landing" />
        </div>
      </div>
    </header>
  );
}

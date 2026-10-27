'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, LogIn, LogOut, User as UserIcon, X, AlertCircle } from 'lucide-react';

export function LandingHeader() {
  const router = useRouter();
  const { user, signIn, signOut, loading, authError, clearAuthError } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeError = localError || authError;

  const closeModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setLocalError(null);
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeModal]);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSigningIn(true);
    try {
      const loggedUser = await signIn('/plan');
      if (loggedUser && loggedUser.uid !== 'pending-redirect') {
        setIsAuthModalOpen(false);
        router.push('/plan');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-transparent transition-colors">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand / Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48] dark:focus-visible:ring-[#FB7185] rounded-xl p-1"
            aria-label="Aayojan Ace Home"
          >
            <div
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#E11D48] via-[#D11138] to-[#9F1239] border-t border-white/30 flex items-center justify-center text-white font-serif font-black text-xl shadow-xs group-hover:scale-105 transition-transform"
              aria-label="Aayojan Ace Brand Emblem"
            >
              A
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] descender-safe">
                Aayojan <span className="text-[#E11D48] dark:text-[#FB7185]">Ace</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-sans text-[#0F172A]/75 dark:text-[#94A3B8] tracking-wider uppercase mt-0.5">
                Celebration Planner
              </span>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* User / Sign-In */}
            {!loading && user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 border border-[#0F172A]/10 dark:border-[#F8FAFC]/15">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User profile'}
                      className="h-7 w-7 rounded-full object-cover border border-[#0F172A]/20 dark:border-[#F8FAFC]/20"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-xs font-bold">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] max-w-[120px] truncate">
                    {user.displayName || 'Account'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[#0F172A]/70 dark:text-[#94A3B8] hover:text-[#E11D48] dark:hover:text-[#FB7185] hover:bg-[#0F172A]/5 dark:hover:bg-[#F8FAFC]/5 transition-colors flex items-center justify-center"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  clearAuthError();
                  setIsAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border border-[#0F172A]/20 dark:border-[#F8FAFC]/20 bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#0F172A]/10 dark:hover:bg-[#F8FAFC]/15 transition-colors shadow-2xs"
              >
                <LogIn className="h-3.5 w-3.5 text-[#E11D48] dark:text-[#FB7185]" aria-hidden="true" />
                <span>Sign up / Login</span>
              </button>
            )}

            {/* Constant "Start plan" Button */}
            <Link
              href="/plan"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-[#E11D48] to-[#BE123C] text-white text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(225,29,72,0.35)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)] hover:brightness-105 active:scale-[0.98] transition-all border-t border-white/30 dark:border-white/10 dark:shadow-[0_4px_14px_rgba(225,29,72,0.2)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48] dark:focus-visible:ring-[#FB7185]"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
              <span>Start plan</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle variant="landing" />
          </div>
        </div>
      </header>

      {/* Auth Modal / Window triggered by Sign up / Login */}
      {isAuthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          data-lenis-prevent
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-sm sm:max-w-md rounded-3xl border border-[#0F172A]/15 dark:border-[#F8FAFC]/15 bg-[#FFFFFF] dark:bg-[#111C3A] p-6 sm:p-7 shadow-2xl space-y-5 text-[#1E293B] dark:text-[#F8FAFC] relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[#0F172A]/60 dark:text-[#94A3B8] hover:text-[#E11D48] dark:hover:text-[#FB7185] hover:bg-[#0F172A]/5 dark:hover:bg-[#F8FAFC]/10 transition-colors flex items-center justify-center"
              aria-label="Close sign-in window"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Brand Emblem & Header */}
            <div className="text-center pt-2">
              <div
                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E11D48] via-[#D11138] to-[#9F1239] border-t border-white/30 flex items-center justify-center text-white font-serif font-black text-2xl shadow-xs mx-auto mb-3"
                aria-hidden="true"
              >
                A
              </div>
              <h2 id="auth-modal-title" className="font-serif font-bold text-2xl tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                Sign up or Log in
              </h2>
              <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] mt-1.5 max-w-xs mx-auto leading-relaxed">
                Continue with Google to sync, save, and access your celebration plans across devices.
              </p>
            </div>

            {/* Error Alert */}
            {activeError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <span>{activeError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    clearAuthError();
                  }}
                  aria-label="Dismiss error"
                  className="p-0.5 rounded hover:bg-red-500/20 text-red-700 dark:text-red-300"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Actions: Continue with Google & Try as Guest */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || isSigningIn}
                className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-white dark:bg-white border border-[#dadce0] hover:border-[#E11D48] text-[#3c4043] text-sm sm:text-base font-bold shadow-xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48]"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#0F172A]/15 dark:border-[#F8FAFC]/15" />
                </div>
                <span className="relative px-3 bg-[#FFFFFF] dark:bg-[#111C3A] text-[10px] uppercase tracking-wider text-[#0F172A]/60 dark:text-[#94A3B8] font-semibold">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  closeModal();
                  router.push('/plan');
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#0F172A]/20 dark:border-[#F8FAFC]/20 bg-transparent hover:bg-[#0F172A]/5 dark:hover:bg-[#F8FAFC]/5 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-[#E11D48] dark:text-[#FB7185]" aria-hidden="true" />
                <span>Try as Guest (no sign-in)</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-[#0F172A]/65 dark:text-[#94A3B8] leading-normal">
              By continuing, you agree to our{' '}
              <Link href="/terms" onClick={closeModal} className="underline hover:text-[#E11D48] dark:hover:text-[#FB7185]">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" onClick={closeModal} className="underline hover:text-[#E11D48] dark:hover:text-[#FB7185]">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </>
  );
}

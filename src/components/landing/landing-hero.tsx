'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { ArrowRight, Sparkles, UserCheck, AlertCircle, X } from 'lucide-react';

export function LandingHero() {
  const router = useRouter();
  const { user, signIn, loading, authError, clearAuthError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSigningIn(true);
    try {
      const loggedUser = await signIn('/plan');
      if (loggedUser && loggedUser.uid !== 'pending-redirect') {
        router.push('/plan');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestEnter = () => {
    router.push('/plan');
  };

  const activeError = localError || authError;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative w-full min-h-[calc(100vh-5rem)] flex items-center py-12 lg:py-20 overflow-hidden"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left 60% (7 cols out of 12) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 sm:space-y-8 hero-content-left">
            {/* Project Category Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-widest w-fit border border-[#0F172A]/15 dark:border-[#F8FAFC]/20 shadow-2xs hero-badge">
              <Sparkles className="h-3.5 w-3.5 text-[#E11D48] dark:text-[#FB7185]" aria-hidden="true" />
              <span>PromptWars Challenge 5 · Intelligent Event Architecture</span>
            </div>

            {/* Display Heading with Specular Glossy Highlight */}
            <div className="relative py-1 hero-title-wrapper reveal-mask-safe">
              <h1
                id="hero-title"
                aria-label="Aayojan Ace"
                className="font-serif font-black tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.2] select-none descender-safe"
              >
                <span
                  aria-hidden="true"
                  className="relative inline-block hero-heading-text descender-safe-clip glossy-heading-text"
                >
                  Aayojan Ace
                </span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] hero-tagline descender-safe">
              Your celebration, <span className="text-[#E11D48] dark:text-[#FB7185] italic font-normal descender-safe-italic">perfectly planned.</span>
            </p>

            {/* Narrative description */}
            <p className="text-base sm:text-lg text-[#334155] dark:text-[#CBD5E1] max-w-xl leading-relaxed hero-desc">
              From grand Indian weddings to intimate poojas and cultural evenings, Aayojan Ace combines mathematical budget discipline, phased ritual timelines, and multi-tier Gemini AI to architect error-free celebrations.
            </p>
          </div>

          {/* Right 40% (5 cols out of 12) - Vertically Centered Panel */}
          <div className="lg:col-span-5 flex flex-col justify-center hero-content-right">
            <div className="rounded-3xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#FFFFFF]/95 dark:bg-[#111C3A]/95 backdrop-blur-xl p-6 sm:p-8 md:p-10 shadow-xl space-y-6">
              <div className="space-y-2 border-b border-[#0F172A]/10 dark:border-[#F8FAFC]/10 pb-5">
                <span className="font-mono text-xs font-bold text-[#E11D48] dark:text-[#FB7185] uppercase tracking-wider block">
                  Quick Access Workspace
                </span>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] descender-safe">
                  {user ? 'Welcome Back, Planner' : 'Start Planning in Seconds'}
                </h2>
                <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1]">
                  {user
                    ? `Signed in as ${user.displayName || user.email}. Open your celebration blueprint directly.`
                    : 'Design your celebration plan with zero setup or sign-in friction.'}
                </p>
              </div>

              {/* Inline Sign-In Error (if any) */}
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
                    aria-label="Dismiss sign-in error"
                    className="p-0.5 rounded hover:bg-red-500/20 text-red-700 dark:text-red-300"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3.5">
                {user ? (
                  /* Signed-In: Open Planner Button */
                  <Link
                    href="/plan"
                    className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-[#E11D48] to-[#BE123C] text-white text-base font-bold shadow-[0_4px_14px_rgba(225,29,72,0.35)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.45)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border-t border-white/30 dark:border-white/10 dark:shadow-[0_4px_14px_rgba(225,29,72,0.2)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48] dark:focus-visible:ring-[#FB7185]"
                  >
                    <UserCheck className="h-5 w-5" aria-hidden="true" />
                    <span>Open planner</span>
                    <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    {/* Google-branded "Get started with Google" button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading || isSigningIn}
                      className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-white dark:bg-white border border-[#dadce0] hover:border-[#E11D48] text-[#3c4043] dark:text-[#3c4043] text-sm sm:text-base font-bold shadow-xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48]"
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
                      <span>{isSigningIn ? 'Connecting to Google...' : 'Get started with Google'}</span>
                    </button>

                    {/* "Try as Guest" button */}
                    <button
                      type="button"
                      onClick={handleGuestEnter}
                      className="w-full min-h-[48px] px-6 py-3 rounded-2xl border border-[#0F172A]/20 dark:border-[#F8FAFC]/20 bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 hover:bg-[#0F172A]/10 dark:hover:bg-[#F8FAFC]/15 text-[#0F172A] dark:text-[#F8FAFC] text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48] dark:focus-visible:ring-[#FB7185]"
                    >
                      <Sparkles className="h-4 w-4 text-[#E11D48] dark:text-[#FB7185]" aria-hidden="true" />
                      <span>Try as Guest</span>
                    </button>
                  </>
                )}
              </div>

              {/* Helper Text */}
              <p className="text-center text-xs text-[#0F172A]/70 dark:text-[#94A3B8] leading-relaxed pt-1">
                Sign in to save plans across devices, or guests can try everything without creating an account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

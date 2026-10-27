'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { Sparkles, ArrowRight, UserCheck, AlertCircle, X } from 'lucide-react';

export function LandingCta() {
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
      id="cta-section"
      aria-labelledby="cta-heading"
      className="w-full py-20 sm:py-28 border-t border-[#300D26]/10 dark:border-[#FAF6EE]/10 bg-gradient-to-b from-transparent via-[#7E1333]/5 to-[#7E1333]/10 dark:via-[#F26D8E]/5 dark:to-[#F26D8E]/10 overflow-hidden text-center"
    >
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 cta-container">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7E1333]/10 dark:bg-[#F26D8E]/15 text-[#7E1333] dark:text-[#F26D8E] text-xs font-bold uppercase tracking-widest border border-[#7E1333]/20 dark:border-[#F26D8E]/30">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Begin Your Celebration Plan</span>
        </div>

        {/* CTA Heading that scales in */}
        <h2
          id="cta-heading"
          className="font-serif font-black text-4xl sm:text-5xl md:text-6xl text-[#300D26] dark:text-[#FAF6EE] tracking-tight leading-tight cta-title"
        >
          Your celebration, perfectly planned from the first muhurat.
        </h2>

        <p className="text-base sm:text-lg text-[#5C3852] dark:text-[#D6BDCE] max-w-2xl mx-auto leading-relaxed cta-desc">
          Ready to experience mathematical budget fitting, phased ritual timelines, and cultural vendor checklists? Launch your plan now.
        </p>

        {/* Inline Sign-In Error (if any) */}
        {activeError && (
          <div
            role="alert"
            className="max-w-md mx-auto p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-md mx-auto cta-buttons">
          {user ? (
            <Link
              href="/plan"
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#7E1333] to-[#96193E] dark:from-[#96193E] dark:to-[#B31D4A] text-white text-base font-bold shadow-lg hover:shadow-xl hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border-t border-white/30"
            >
              <UserCheck className="h-5 w-5" aria-hidden="true" />
              <span>Open planner</span>
              <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Link>
          ) : (
            <>
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || isSigningIn}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-white dark:bg-[#140A13] border border-[#300D26]/20 dark:border-[#FAF6EE]/20 hover:border-[#7E1333] dark:hover:border-[#F26D8E] text-[#300D26] dark:text-[#FAF6EE] text-sm sm:text-base font-bold shadow-xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 group"
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
                <span>{isSigningIn ? 'Connecting...' : 'Get started with Google'}</span>
              </button>

              {/* Guest Button */}
              <button
                type="button"
                onClick={handleGuestEnter}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-[#7E1333]/10 dark:bg-[#F26D8E]/15 hover:bg-[#7E1333]/20 dark:hover:bg-[#F26D8E]/25 text-[#7E1333] dark:text-[#F26D8E] text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 border border-[#7E1333]/25 dark:border-[#F26D8E]/30"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Try as Guest</span>
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-[#5C3852] dark:text-[#D6BDCE]">
          Sign in to save plans across devices, or guests can try everything instantly.
        </p>
      </div>
    </section>
  );
}

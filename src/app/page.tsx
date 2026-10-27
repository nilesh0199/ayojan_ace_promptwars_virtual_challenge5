import React from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingWordBand } from '@/components/landing/landing-word-band';
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works';
import { LandingAbout } from '@/components/landing/landing-about';
import { LandingPrivacyTerms } from '@/components/landing/landing-privacy-terms';
import { LandingCta } from '@/components/landing/landing-cta';
import { LandingFooter } from '@/components/landing/landing-footer';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

// Dynamic import for client scroll and motion effects
const LandingScrollEffects = dynamic(
  () =>
    import('@/components/landing/landing-scroll-effects').then(
      (mod) => mod.LandingScrollEffects
    ),
  { ssr: false }
);

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    'Intelligent celebration and event planning companion tailored for Indian and multicultural festivities with mathematical budget discipline, phased ritual timelines, and multi-tier Gemini AI.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] dark:bg-[#140A13] text-[#300D26] dark:text-[#FAF6EE] flex flex-col selection:bg-[#7E1333]/20 selection:text-[#7E1333] dark:selection:bg-[#F26D8E]/30 dark:selection:text-[#F26D8E] transition-colors">
      {/* Dynamic Scroll & Motion Controller (GSAP + Lenis) */}
      <LandingScrollEffects />

      {/* Sticky Header with Wordmark, Auth / Avatar, Start Plan button, and Theme Toggle */}
      <LandingHeader />

      {/* Semantic Main Landmark with Skip Link target */}
      <main id="main-content" className="flex-1 w-full focus:outline-hidden">
        {/* Hero Section (60/40 Grid on Desktop, Stacked on Mobile) */}
        <LandingHero />

        {/* Moving Horizontal Words Band */}
        <LandingWordBand />

        {/* How It Works Sequence */}
        <LandingHowItWorks />

        {/* About Section */}
        <LandingAbout />

        {/* Privacy & Terms Sections (In That Order) */}
        <LandingPrivacyTerms />

        {/* Closing Call-to-Action Band */}
        <LandingCta />
      </main>

      {/* Semantic Site Footer */}
      <LandingFooter />
    </div>
  );
}

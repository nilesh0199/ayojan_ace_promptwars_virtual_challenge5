'use client';

import React from 'react';
import Link from 'next/link';
import { ABOUT_PROJECT } from '@/data/aboutContent';
import { Sparkles, Heart, HelpCircle, ShieldCheck, ArrowRight, Code2 } from 'lucide-react';

export function LandingAbout() {
  const { whyTheName, whatItIs, whyItWasMade, builtWith, responsibleAi } = ABOUT_PROJECT;

  return (
    <section
      id="about-section"
      aria-labelledby="about-section-title"
      className="w-full py-16 sm:py-24 border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10 bg-[#F4F1EA] dark:bg-[#0A1128]"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wider border border-[#0F172A]/15 dark:border-[#F8FAFC]/20">
            <Heart className="h-3.5 w-3.5 text-[#E11D48] dark:text-[#FB7185]" aria-hidden="true" />
            <span>Story &amp; Philosophy</span>
          </div>
          <h2
            id="about-section-title"
            className="font-serif font-black text-3xl sm:text-5xl text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-[1.2] section-title descender-safe"
          >
            About Aayojan Ace
          </h2>
          <p className="text-base sm:text-lg text-[#334155] dark:text-[#CBD5E1] leading-relaxed section-desc">
            Created for the PromptWars Challenge 5 to bridge ancient cultural nuance and modern engineering rigor.
          </p>
        </div>

        {/* Why the name Aayojan Ace? */}
        <div className="rounded-3xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#FFFFFF] dark:bg-[#162347] backdrop-blur-md p-6 sm:p-10 shadow-xs space-y-8">
          <div className="flex items-center gap-2.5 text-[#E11D48] dark:text-[#FB7185]">
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
            <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] descender-safe">
              {whyTheName.heading}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {whyTheName.cards.map((card) => (
              <div
                key={card.badge}
                className="p-6 rounded-2xl bg-[#F4F1EA] dark:bg-[#111C3A] border border-[#0F172A]/10 dark:border-[#F8FAFC]/10 space-y-3 shadow-2xs"
              >
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold tracking-wide border border-[#0F172A]/15 dark:border-[#F8FAFC]/20">
                  {card.badge}
                </span>
                <h4 className="font-serif font-bold text-lg text-[#0F172A] dark:text-[#F8FAFC]">
                  {card.title}
                </h4>
                <p className="text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm sm:text-base font-medium text-[#0F172A] dark:text-[#F8FAFC] pt-4 border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10 leading-relaxed">
            {whyTheName.summary}
          </p>
        </div>

        {/* What It Is & Why Made (2 Column Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* What Aayojan Ace Is */}
          <div className="rounded-3xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#FFFFFF] dark:bg-[#162347] backdrop-blur-md p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-[#E11D48] dark:text-[#FB7185]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#0F172A] dark:text-[#F8FAFC]">
                {whatItIs.heading}
              </h3>
            </div>
            <p className="text-sm sm:text-base text-[#1E293B] dark:text-[#F8FAFC] leading-relaxed">
              {whatItIs.lead}
            </p>
            <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
              {whatItIs.body}
            </p>
          </div>

          {/* Why It Was Made & 3 Pillars */}
          <div className="rounded-3xl border-2 border-[#E11D48]/30 dark:border-[#FB7185]/30 bg-[#E11D48]/5 dark:bg-[#FB7185]/5 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-[#E11D48] dark:text-[#FB7185]">
              <Code2 className="h-5 w-5" aria-hidden="true" />
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#0F172A] dark:text-[#F8FAFC]">
                {whyItWasMade.heading}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#1E293B] dark:text-[#F8FAFC] leading-relaxed">
              {whyItWasMade.lead}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {whyItWasMade.pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="p-3.5 rounded-xl bg-[#FFFFFF] dark:bg-[#111C3A] border border-[#0F172A]/10 dark:border-[#F8FAFC]/10 space-y-1"
                >
                  <span className="font-mono text-xs font-bold text-[#E11D48] dark:text-[#FB7185] uppercase block">
                    {pillar.title}
                  </span>
                  <p className="text-[11px] text-[#334155] dark:text-[#CBD5E1] leading-snug">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Built With Technology Grid */}
        <div className="rounded-3xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#FFFFFF] dark:bg-[#162347] backdrop-blur-md p-6 sm:p-8 space-y-5 shadow-xs">
          <h3 className="font-serif font-bold text-xl text-[#0F172A] dark:text-[#F8FAFC]">
            Technology Stack &amp; Foundations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {builtWith.map((tech) => (
              <div
                key={tech.name}
                className="p-4 rounded-2xl bg-[#F4F1EA] dark:bg-[#111C3A] border border-[#0F172A]/10 dark:border-[#F8FAFC]/10 flex flex-col justify-between"
              >
                <span className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                  {tech.name}
                </span>
                <span className="text-xs text-[#334155] dark:text-[#CBD5E1] mt-1">
                  {tech.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible AI Disclaimer Banner */}
        <div className="rounded-2xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#EAE6DC]/60 dark:bg-[#111C3A]/60 p-5 sm:p-6 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-[#E11D48] dark:text-[#FB7185] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1.5">
            <h4 className="font-serif font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
              {responsibleAi.heading}
            </h4>
            <p className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
              {responsibleAi.text}
            </p>
          </div>
        </div>

        {/* Link to Full About Page */}
        <div className="text-center pt-2">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#E11D48] dark:text-[#FB7185] hover:text-[#BE123C] dark:hover:text-[#FDA4AF] hover:underline underline-offset-4 group min-h-[44px] px-4"
          >
            <span>Explore the full story on the About Page</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

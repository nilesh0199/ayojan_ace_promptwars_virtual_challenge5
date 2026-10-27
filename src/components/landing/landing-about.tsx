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
      className="w-full py-16 sm:py-24 border-t border-[#300D26]/10 dark:border-[#FAF6EE]/10"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7E1333]/10 dark:bg-[#F26D8E]/15 text-[#7E1333] dark:text-[#F26D8E] text-xs font-bold uppercase tracking-wider">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Story &amp; Philosophy</span>
          </div>
          <h2
            id="about-section-title"
            className="font-serif font-black text-3xl sm:text-5xl text-[#300D26] dark:text-[#FAF6EE] tracking-tight section-title"
          >
            About Aayojan Ace
          </h2>
          <p className="text-base sm:text-lg text-[#5C3852] dark:text-[#D6BDCE] leading-relaxed section-desc">
            Created for the PromptWars Challenge 5 to bridge ancient cultural nuance and modern engineering rigor.
          </p>
        </div>

        {/* Why the name Aayojan Ace? */}
        <div className="rounded-3xl border border-[#300D26]/15 dark:border-[#FAF6EE]/15 bg-white/70 dark:bg-[#1E111D]/70 backdrop-blur-md p-6 sm:p-10 shadow-xs space-y-8">
          <div className="flex items-center gap-2.5 text-[#7E1333] dark:text-[#F26D8E]">
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
            <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#300D26] dark:text-[#FAF6EE]">
              {whyTheName.heading}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {whyTheName.cards.map((card) => (
              <div
                key={card.badge}
                className="p-6 rounded-2xl bg-[#FDFBF7] dark:bg-[#140A13] border border-[#300D26]/10 dark:border-[#FAF6EE]/10 space-y-3 shadow-2xs"
              >
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#7E1333]/10 dark:bg-[#F26D8E]/15 text-[#7E1333] dark:text-[#F26D8E] text-xs font-bold tracking-wide">
                  {card.badge}
                </span>
                <h4 className="font-serif font-bold text-lg text-[#300D26] dark:text-[#FAF6EE]">
                  {card.title}
                </h4>
                <p className="text-sm text-[#5C3852] dark:text-[#D6BDCE] leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm sm:text-base font-medium text-[#300D26] dark:text-[#FAF6EE] pt-4 border-t border-[#300D26]/10 dark:border-[#FAF6EE]/10 leading-relaxed">
            {whyTheName.summary}
          </p>
        </div>

        {/* What It Is & Why Made (2 Column Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* What Aayojan Ace Is */}
          <div className="rounded-3xl border border-[#300D26]/15 dark:border-[#FAF6EE]/15 bg-white/70 dark:bg-[#1E111D]/70 backdrop-blur-md p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-[#7E1333] dark:text-[#F26D8E]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#300D26] dark:text-[#FAF6EE]">
                {whatItIs.heading}
              </h3>
            </div>
            <p className="text-sm sm:text-base text-[#300D26] dark:text-[#FAF6EE] leading-relaxed">
              {whatItIs.lead}
            </p>
            <p className="text-xs sm:text-sm text-[#5C3852] dark:text-[#D6BDCE] leading-relaxed">
              {whatItIs.body}
            </p>
          </div>

          {/* Why It Was Made & 3 Pillars */}
          <div className="rounded-3xl border-2 border-[#7E1333]/30 dark:border-[#F26D8E]/30 bg-[#7E1333]/5 dark:bg-[#F26D8E]/5 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-[#7E1333] dark:text-[#F26D8E]">
              <Code2 className="h-5 w-5" aria-hidden="true" />
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#300D26] dark:text-[#FAF6EE]">
                {whyItWasMade.heading}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#300D26] dark:text-[#FAF6EE] leading-relaxed">
              {whyItWasMade.lead}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {whyItWasMade.pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="p-3.5 rounded-xl bg-white/90 dark:bg-[#140A13]/90 border border-[#300D26]/10 dark:border-[#FAF6EE]/10 space-y-1"
                >
                  <span className="font-mono text-xs font-bold text-[#7E1333] dark:text-[#F26D8E] uppercase block">
                    {pillar.title}
                  </span>
                  <p className="text-[11px] text-[#5C3852] dark:text-[#D6BDCE] leading-snug">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Built With Technology Grid */}
        <div className="rounded-3xl border border-[#300D26]/15 dark:border-[#FAF6EE]/15 bg-white/70 dark:bg-[#1E111D]/70 backdrop-blur-md p-6 sm:p-8 space-y-5 shadow-xs">
          <h3 className="font-serif font-bold text-xl text-[#300D26] dark:text-[#FAF6EE]">
            Technology Stack &amp; Foundations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {builtWith.map((tech) => (
              <div
                key={tech.name}
                className="p-4 rounded-2xl bg-[#FDFBF7] dark:bg-[#140A13] border border-[#300D26]/10 dark:border-[#FAF6EE]/10 flex flex-col justify-between"
              >
                <span className="font-bold text-sm text-[#300D26] dark:text-[#FAF6EE]">
                  {tech.name}
                </span>
                <span className="text-xs text-[#5C3852] dark:text-[#D6BDCE] mt-1">
                  {tech.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible AI Disclaimer Banner */}
        <div className="rounded-2xl border border-[#300D26]/15 dark:border-[#FAF6EE]/15 bg-[#300D26]/5 dark:bg-[#FAF6EE]/5 p-5 sm:p-6 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-[#7E1333] dark:text-[#F26D8E] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1.5">
            <h4 className="font-serif font-bold text-base text-[#300D26] dark:text-[#FAF6EE]">
              {responsibleAi.heading}
            </h4>
            <p className="text-xs sm:text-sm text-[#5C3852] dark:text-[#D6BDCE] leading-relaxed">
              {responsibleAi.text}
            </p>
          </div>
        </div>

        {/* Link to Full About Page */}
        <div className="text-center pt-2">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#7E1333] dark:text-[#F26D8E] hover:underline underline-offset-4 group min-h-[44px] px-4"
          >
            <span>Explore the full story on the About Page</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

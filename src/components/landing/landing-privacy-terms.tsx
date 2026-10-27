'use client';

import React from 'react';
import Link from 'next/link';
import { ABOUT_PROJECT } from '@/data/aboutContent';
import { ShieldAlert, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export function LandingPrivacyTerms() {
  const { privacySummary, termsSummary } = ABOUT_PROJECT;

  return (
    <section
      id="policies-section"
      aria-label="Privacy Governance and Terms of Service"
      className="w-full py-16 sm:py-24 border-t border-[#300D26]/10 dark:border-[#FAF6EE]/10"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7E1333]/10 dark:bg-[#F26D8E]/15 text-[#7E1333] dark:text-[#F26D8E] text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Transparency &amp; Governance</span>
          </div>
          <h2 className="font-serif font-black text-3xl sm:text-5xl text-[#300D26] dark:text-[#FAF6EE] tracking-tight section-title">
            Privacy &amp; Terms
          </h2>
          <p className="text-base sm:text-lg text-[#5C3852] dark:text-[#D6BDCE] leading-relaxed section-desc">
            Plain language boundaries designed to protect your celebration data and set clear expectations.
          </p>
        </div>

        {/* 2 Cards Grid: Privacy First, then Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Privacy Section (First) */}
          <section
            aria-labelledby="privacy-summary-heading"
            className="rounded-3xl border border-[#300D26]/15 dark:border-[#FAF6EE]/15 bg-white/70 dark:bg-[#1E111D]/70 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xs space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#7E1333] dark:text-[#F26D8E]">
                <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                <h3 id="privacy-summary-heading" className="font-serif font-bold text-xl sm:text-2xl text-[#300D26] dark:text-[#FAF6EE]">
                  {privacySummary.heading}
                </h3>
              </div>
              <p className="text-sm text-[#300D26] dark:text-[#FAF6EE] leading-relaxed">
                {privacySummary.lead}
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#5C3852] dark:text-[#D6BDCE]">
                {privacySummary.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#7E1333] dark:text-[#F26D8E] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#300D26]/10 dark:border-[#FAF6EE]/10">
              <Link
                href={privacySummary.linkHref}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#7E1333] dark:text-[#F26D8E] hover:underline underline-offset-4 group min-h-[44px]"
              >
                <span>{privacySummary.linkText}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* Terms Section (Second) */}
          <section
            aria-labelledby="terms-summary-heading"
            className="rounded-3xl border border-[#300D26]/15 dark:border-[#FAF6EE]/15 bg-white/70 dark:bg-[#1E111D]/70 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xs space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#7E1333] dark:text-[#F26D8E]">
                <FileText className="h-6 w-6" aria-hidden="true" />
                <h3 id="terms-summary-heading" className="font-serif font-bold text-xl sm:text-2xl text-[#300D26] dark:text-[#FAF6EE]">
                  {termsSummary.heading}
                </h3>
              </div>
              <p className="text-sm text-[#300D26] dark:text-[#FAF6EE] leading-relaxed">
                {termsSummary.lead}
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#5C3852] dark:text-[#D6BDCE]">
                {termsSummary.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#7E1333] dark:text-[#F26D8E] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#300D26]/10 dark:border-[#FAF6EE]/10">
              <Link
                href={termsSummary.linkHref}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#7E1333] dark:text-[#F26D8E] hover:underline underline-offset-4 group min-h-[44px]"
              >
                <span>{termsSummary.linkText}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

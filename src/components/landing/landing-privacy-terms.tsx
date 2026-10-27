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
      className="w-full py-16 sm:py-24 border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10 bg-[#EAE6DC] dark:bg-[#111C3A]"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F172A]/5 dark:bg-[#F8FAFC]/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wider border border-[#0F172A]/15 dark:border-[#F8FAFC]/20">
            <ShieldAlert className="h-3.5 w-3.5 text-[#E11D48] dark:text-[#FB7185]" aria-hidden="true" />
            <span>Transparency &amp; Governance</span>
          </div>
          <h2
            id="privacy-terms-title"
            className="font-serif font-black text-3xl sm:text-5xl text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-[1.2] section-title descender-safe"
          >
            Privacy &amp; Terms
          </h2>
          <p className="text-base sm:text-lg text-[#334155] dark:text-[#CBD5E1] leading-relaxed section-desc">
            Plain language boundaries designed to protect your celebration data and set clear expectations.
          </p>
        </div>

        {/* 2 Cards Grid: Privacy First, then Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Privacy Section (First) */}
          <section
            aria-labelledby="privacy-summary-heading"
            className="rounded-3xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#FFFFFF] dark:bg-[#162347] p-6 sm:p-8 flex flex-col justify-between shadow-xs space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#E11D48] dark:text-[#FB7185]">
                <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                <h3 id="privacy-summary-heading" className="font-serif font-bold text-xl sm:text-2xl text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] descender-safe">
                  {privacySummary.heading}
                </h3>
              </div>
              <p className="text-sm text-[#1E293B] dark:text-[#F8FAFC] leading-relaxed">
                {privacySummary.lead}
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1]">
                {privacySummary.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#E11D48] dark:text-[#FB7185] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10">
              <Link
                href={privacySummary.linkHref}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#E11D48] dark:text-[#FB7185] hover:text-[#BE123C] dark:hover:text-[#FDA4AF] hover:underline underline-offset-4 group min-h-[44px]"
              >
                <span>{privacySummary.linkText}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* Terms Section (Second) */}
          <section
            aria-labelledby="terms-summary-heading"
            className="rounded-3xl border border-[#0F172A]/12 dark:border-[#F8FAFC]/12 bg-[#FFFFFF] dark:bg-[#162347] p-6 sm:p-8 flex flex-col justify-between shadow-xs space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#E11D48] dark:text-[#FB7185]">
                <FileText className="h-6 w-6" aria-hidden="true" />
                <h3 id="terms-summary-heading" className="font-serif font-bold text-xl sm:text-2xl text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2] descender-safe">
                  {termsSummary.heading}
                </h3>
              </div>
              <p className="text-sm text-[#1E293B] dark:text-[#F8FAFC] leading-relaxed">
                {termsSummary.lead}
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1]">
                {termsSummary.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#E11D48] dark:text-[#FB7185] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#0F172A]/10 dark:border-[#F8FAFC]/10">
              <Link
                href={termsSummary.linkHref}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#E11D48] dark:text-[#FB7185] hover:text-[#BE123C] dark:hover:text-[#FDA4AF] hover:underline underline-offset-4 group min-h-[44px]"
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

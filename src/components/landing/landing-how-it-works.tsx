'use client';

import React from 'react';
import { ABOUT_PROJECT } from '@/data/aboutContent';
import { Sparkles, Cpu, Calculator, Calendar } from 'lucide-react';

const STEP_ICONS = [Sparkles, Cpu, Calculator, Calendar];

export function LandingHowItWorks() {
  const steps = ABOUT_PROJECT.howItWorksSteps;

  return (
    <section
      id="how-it-works-section"
      aria-labelledby="how-it-works-title"
      className="w-full py-16 sm:py-24 relative overflow-hidden bg-[#F3E4CB] dark:bg-[#20122E] border-t border-[#4A1D7A]/10 dark:border-[#F8EEDC]/10"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6D28D9]/10 dark:bg-[#C4A5F5]/15 text-[#4A1D7A] dark:text-[#C4A5F5] text-xs font-bold uppercase tracking-wider border border-[#6D28D9]/20 dark:border-[#C4A5F5]/30">
            <Cpu className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#C4A5F5]" aria-hidden="true" />
            <span>Workflow &amp; Orchestration</span>
          </div>
          <h2
            id="how-it-works-title"
            className="font-serif font-black text-3xl sm:text-5xl text-[#4A1D7A] dark:text-[#F8EEDC] tracking-tight leading-[1.2] section-title descender-safe"
          >
            How Aayojan <span className="text-[#B91C3C] dark:text-[#FF6B81] inline-block descender-safe">Ace</span> Works
          </h2>
          <p className="text-base sm:text-lg text-[#2A1A3A] dark:text-[#DAC7E8] leading-relaxed section-desc">
            Four disciplined steps connect your celebration vision to mathematical precision, cultural accuracy, and complete execution control.
          </p>
        </div>

        {/* Steps Display */}
        <div id="how-it-works-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[idx % STEP_ICONS.length];
            return (
              <div
                key={step.step}
                className="how-it-works-card rounded-3xl border border-[#4A1D7A]/15 dark:border-[#F8EEDC]/15 bg-[#FFF9EE] dark:bg-[#261636] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                {/* Step number badge */}
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-[#6D28D9]/10 dark:bg-[#C4A5F5]/15 text-[#6D28D9] dark:text-[#C4A5F5] flex items-center justify-center font-serif font-bold text-lg group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#B91C3C] dark:text-[#FF6B81] tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#B91C3C]/10 dark:bg-[#FF6B81]/15">
                    Step 0{step.step}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-xl text-[#4A1D7A] dark:text-[#F8EEDC] group-hover:text-[#6D28D9] dark:group-hover:text-[#C4A5F5] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#B91C3C] dark:text-[#FF6B81]">
                    {step.summary}
                  </p>
                  <p className="text-xs sm:text-sm text-[#2A1A3A] dark:text-[#DAC7E8] leading-relaxed">
                    {step.detail}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#4A1D7A]/10 dark:border-[#F8EEDC]/10 flex items-center justify-between text-[11px] font-mono text-[#2A1A3A]/80 dark:text-[#DAC7E8]">
                  <span>Phase {step.step} of 4</span>
                  <span className="text-[#B91C3C] dark:text-[#FF6B81]">Ready</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

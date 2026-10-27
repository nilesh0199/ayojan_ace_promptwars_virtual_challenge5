'use client';

import React from 'react';

const WORDS = [
  'Budgets',
  'Timelines',
  'Vendors',
  'Ideas',
  'Guests',
  'Ceremony times',
  'Reminders',
];

export function LandingWordBand() {
  return (
    <section
      aria-label="Core Planning Capabilities"
      className="w-full py-8 sm:py-12 border-y border-[#0F172A]/10 dark:border-[#F8FAFC]/10 bg-[#EAE6DC] dark:bg-[#111C3A] overflow-hidden select-none"
    >
      <div className="relative w-full overflow-hidden flex items-center py-2">
        <div
          id="word-band-track"
          className="flex items-center gap-6 sm:gap-10 whitespace-nowrap will-change-transform text-2xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-[1.2]"
        >
          {/* First iteration */}
          {WORDS.map((word, idx) => (
            <React.Fragment key={`word-1-${idx}`}>
              <span className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors descender-safe">
                {word}
              </span>
              <span className="text-[#E11D48] dark:text-[#FB7185] text-xl sm:text-2xl opacity-90 inline-block align-middle" aria-hidden="true">
                ✦
              </span>
            </React.Fragment>
          ))}
          {/* Second iteration for wrap-around continuity */}
          {WORDS.map((word, idx) => (
            <React.Fragment key={`word-2-${idx}`}>
              <span className="hover:text-[#E11D48] dark:hover:text-[#FB7185] transition-colors descender-safe">
                {word}
              </span>
              <span className="text-[#E11D48] dark:text-[#FB7185] text-xl sm:text-2xl opacity-90 inline-block align-middle" aria-hidden="true">
                ✦
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

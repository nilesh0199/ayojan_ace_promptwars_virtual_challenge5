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
      className="w-full py-8 sm:py-12 border-y border-[#C28A1A]/30 dark:border-[#C4A5F5]/20 bg-[#F3E4CB] dark:bg-[#20122E] overflow-hidden select-none"
    >
      <div className="relative w-full overflow-hidden flex items-center py-2">
        <div
          id="word-band-track"
          className="flex items-center gap-6 sm:gap-10 whitespace-nowrap will-change-transform text-2xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-[#4A1D7A] dark:text-[#F8EEDC] leading-[1.2]"
        >
          {/* First iteration */}
          {WORDS.map((word, idx) => (
            <React.Fragment key={`word-1-${idx}`}>
              <span className="hover:text-[#6D28D9] dark:hover:text-[#C4A5F5] transition-colors descender-safe">
                {word}
              </span>
              <span className="text-[#B91C3C] dark:text-[#FF6B81] text-xl sm:text-2xl opacity-90 inline-block align-middle" aria-hidden="true">
                ✦
              </span>
            </React.Fragment>
          ))}
          {/* Second iteration for wrap-around continuity */}
          {WORDS.map((word, idx) => (
            <React.Fragment key={`word-2-${idx}`}>
              <span className="hover:text-[#6D28D9] dark:hover:text-[#C4A5F5] transition-colors descender-safe">
                {word}
              </span>
              <span className="text-[#B91C3C] dark:text-[#FF6B81] text-xl sm:text-2xl opacity-90 inline-block align-middle" aria-hidden="true">
                ✦
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

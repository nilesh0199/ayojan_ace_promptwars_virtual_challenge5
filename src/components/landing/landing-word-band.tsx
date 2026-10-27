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
      className="w-full py-8 sm:py-12 border-y border-[#300D26]/10 dark:border-[#FAF6EE]/10 bg-[#300D26]/5 dark:bg-[#FAF6EE]/5 overflow-hidden select-none"
    >
      <div className="relative w-full overflow-hidden flex items-center">
        <div
          id="word-band-track"
          className="flex items-center gap-6 sm:gap-10 whitespace-nowrap will-change-transform text-2xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-[#300D26]/80 dark:text-[#FAF6EE]/80"
        >
          {/* First iteration */}
          {WORDS.map((word, idx) => (
            <React.Fragment key={`word-1-${idx}`}>
              <span className="hover:text-[#7E1333] dark:hover:text-[#F26D8E] transition-colors">
                {word}
              </span>
              <span className="text-[#7E1333] dark:text-[#F26D8E] text-xl sm:text-2xl opacity-60" aria-hidden="true">
                ✦
              </span>
            </React.Fragment>
          ))}
          {/* Second iteration for wrap-around continuity */}
          {WORDS.map((word, idx) => (
            <React.Fragment key={`word-2-${idx}`}>
              <span className="hover:text-[#7E1333] dark:hover:text-[#F26D8E] transition-colors">
                {word}
              </span>
              <span className="text-[#7E1333] dark:text-[#F26D8E] text-xl sm:text-2xl opacity-60" aria-hidden="true">
                ✦
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

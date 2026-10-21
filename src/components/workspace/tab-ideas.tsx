'use client';

import React from 'react';
import { usePlan } from '../plan-context';
import { Sparkles, Utensils, PartyPopper, Palette } from 'lucide-react';

export function TabIdeas() {
  const { activePlan } = usePlan();

  if (!activePlan) return null;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <h2 className="font-serif font-bold text-xl text-ink">
          Personalized Creative Concepts &amp; Dietary Guidelines
        </h2>
        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
          Tailored to your celebration style: <strong>&ldquo;{activePlan.styleCulture}&rdquo;</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Themes */}
        <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 text-accent">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <h3 className="font-serif font-bold text-lg text-ink">Themes &amp; Aesthetics</h3>
          </div>
          <ul className="space-y-3">
            {activePlan.ideas.themes.map((theme, i) => (
              <li
                key={i}
                className="p-3.5 rounded-xl border border-rule/70 bg-paper-subtle/50 text-xs sm:text-sm text-ink leading-relaxed"
              >
                {theme}
              </li>
            ))}
          </ul>
        </div>

        {/* Dietary Notes */}
        <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 text-emerald-600 dark:text-emerald-400">
            <Utensils className="h-5 w-5" aria-hidden="true" />
            <h3 className="font-serif font-bold text-lg text-ink">
              Dietary Safeguards &amp; Menu Notes
            </h3>
          </div>
          <ul className="space-y-3">
            {activePlan.ideas.dietaryNotes.map((note, i) => (
              <li
                key={i}
                className="p-3.5 rounded-xl border border-rule/70 bg-paper-subtle/50 text-xs sm:text-sm text-ink leading-relaxed"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Guest Activities */}
        <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 text-marigold">
            <PartyPopper className="h-5 w-5" aria-hidden="true" />
            <h3 className="font-serif font-bold text-lg text-ink">
              Interactive Guest Rituals &amp; Activities
            </h3>
          </div>
          <ul className="space-y-3">
            {activePlan.ideas.activities.map((activity, i) => (
              <li
                key={i}
                className="p-3.5 rounded-xl border border-rule/70 bg-paper-subtle/50 text-xs sm:text-sm text-ink leading-relaxed"
              >
                {activity}
              </li>
            ))}
          </ul>
        </div>

        {/* Decor */}
        <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 text-indigo-600 dark:text-indigo-400">
            <Palette className="h-5 w-5" aria-hidden="true" />
            <h3 className="font-serif font-bold text-lg text-ink">
              Decor Accents &amp; Materiality
            </h3>
          </div>
          <ul className="space-y-3">
            {activePlan.ideas.decor.map((item, i) => (
              <li
                key={i}
                className="p-3.5 rounded-xl border border-rule/70 bg-paper-subtle/50 text-xs sm:text-sm text-ink leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

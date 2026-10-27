import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { SmoothScroll } from '@/components/smooth-scroll';
import { APP_NAME, APP_TAGLINE, AUTHOR_NAME, CONTACT_LINKS } from '@/lib/constants';
import { ABOUT_PROJECT } from '@/data/aboutContent';
import {
  Sparkles,
  Heart,
  Code2,
  Cpu,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
  FileText,
  HelpCircle,
} from 'lucide-react';

export const metadata = {
  title: `About · ${APP_NAME}`,
  description: `Learn about ${APP_NAME}, its creator ${AUTHOR_NAME}, why it was built for PromptWars Challenge 5, and the technology powering it.`,
};

export default function AboutPage() {
  return (
    <AppShell>
      <SmoothScroll />
      <div className="w-full max-w-4xl mx-auto space-y-10 pb-16">
        {/* Header Hero */}
        <div className="border-b border-rule pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>About The Project</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-ink tracking-tight">
            Aayojan <span className="text-accent">Ace</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-ink-muted leading-relaxed font-serif italic">
            &ldquo;{APP_TAGLINE}&rdquo;
          </p>
        </div>

        {/* Why the name Aayojan Ace? */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-5"
          aria-labelledby="heading-why-name"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-why-name" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              {ABOUT_PROJECT.whyTheName.heading}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {ABOUT_PROJECT.whyTheName.cards.map((card) => (
              <article
                key={card.badge}
                className="p-5 rounded-xl bg-paper border border-rule flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-semibold tracking-wide">
                    {card.badge}
                  </span>
                  <p className="text-sm text-ink leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <p className="text-sm text-ink-muted leading-relaxed pt-2 border-t border-rule font-medium">
            {ABOUT_PROJECT.whyTheName.summary}
          </p>
        </section>

        {/* What Aayojan Ace Is */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-what-is"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Heart className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-what-is" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              {ABOUT_PROJECT.whatItIs.heading}
            </h2>
          </div>
          <p className="text-ink text-sm sm:text-base leading-relaxed">
            {ABOUT_PROJECT.whatItIs.lead}
          </p>
          <p className="text-ink-muted text-sm leading-relaxed">
            {ABOUT_PROJECT.whatItIs.body}
          </p>
        </section>

        {/* Why It Was Made (PromptWars Challenge 5) */}
        <section
          className="rounded-2xl border-2 border-accent/30 bg-accent-subtle/20 p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-why-made"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-why-made" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              {ABOUT_PROJECT.whyItWasMade.heading}
            </h2>
          </div>
          <p className="text-ink text-sm sm:text-base leading-relaxed">
            {ABOUT_PROJECT.whyItWasMade.lead}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {ABOUT_PROJECT.whyItWasMade.pillars.map((pillar) => (
              <div key={pillar.title} className="p-4 rounded-xl bg-paper border border-rule space-y-1.5">
                <span className="font-mono text-xs font-bold text-accent uppercase block">
                  {pillar.title}
                </span>
                <p className="text-xs text-ink-muted">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Creator & Contact */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-6"
          aria-labelledby="heading-creator"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Code2 className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-creator" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              Who Made It
            </h2>
          </div>
          <div className="space-y-3 text-sm text-ink leading-relaxed">
            <p>
              Designed and engineered by <strong>{AUTHOR_NAME}</strong> as a modern full-stack web application
              combining modern AI orchestration with production-grade engineering principles.
            </p>
            <p className="text-ink-muted">
              Connect or explore the codebase on GitHub:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            {/* LinkedIn Link */}
            <a
              href={CONTACT_LINKS.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Connect with ${AUTHOR_NAME} on LinkedIn (opens in a new tab)`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rule bg-paper hover:bg-paper-subtle text-ink font-medium text-sm transition-colors shadow-2xs hover:border-accent min-h-[44px]"
            >
              <svg
                className="h-4 w-4 fill-current text-[#0A66C2] shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
              </svg>
              <span>LinkedIn Profile</span>
              <ExternalLink className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            </a>

            {/* GitHub Repository Link */}
            <a
              href={CONTACT_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository: View Aayojan Ace source repository on GitHub (opens in a new tab)"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rule bg-paper hover:bg-paper-subtle text-ink font-medium text-sm transition-colors shadow-2xs hover:border-accent min-h-[44px]"
            >
              <svg
                className="h-4 w-4 fill-current text-ink shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub Repository</span>
              <ExternalLink className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* How It Works & Built With */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-6"
          aria-labelledby="heading-built-with"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Cpu className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-built-with" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              How It Works &amp; Built With
            </h2>
          </div>

          <div className="space-y-4 text-sm text-ink leading-relaxed">
            <h3 className="font-semibold text-base text-ink">How It Works</h3>
            <ol className="list-decimal list-inside space-y-2 text-ink-muted pl-1">
              {ABOUT_PROJECT.howItWorksSteps.map((step) => (
                <li key={step.step}>
                  <strong className="text-ink">{step.title}:</strong> {step.detail}
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-4 border-t border-rule space-y-3">
            <h3 className="font-semibold text-base text-ink">Built With</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {ABOUT_PROJECT.builtWith.map((item) => (
                <div key={item.name} className="p-3 rounded-xl bg-paper border border-rule flex flex-col justify-between">
                  <span className="font-semibold text-ink">{item.name}</span>
                  <span className="text-ink-muted mt-1">{item.role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Application Routes, Landing Page & Motion Architecture */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-routes-motion"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-routes-motion" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              Application Routes &amp; Motion Architecture
            </h2>
          </div>
          <div className="space-y-3 text-sm text-ink leading-relaxed">
            <p>
              Aayojan Ace is organized into clear functional routes: our professional <strong>Landing Page</strong> lives at <code className="font-mono text-xs bg-paper-subtle px-1.5 py-0.5 rounded border border-rule">/</code>, while the interactive <strong>Plan Creator</strong> intake is located at <code className="font-mono text-xs bg-paper-subtle px-1.5 py-0.5 rounded border border-rule">/plan</code>. Active celebrations are managed within <code className="font-mono text-xs bg-paper-subtle px-1.5 py-0.5 rounded border border-rule">/workspace</code>, and saved history resides at <code className="font-mono text-xs bg-paper-subtle px-1.5 py-0.5 rounded border border-rule">/saved</code>.
            </p>
            <p className="text-ink-muted text-xs sm:text-sm">
              Fluid motion on the landing page and narrative pages is powered by <strong>GSAP (with ScrollTrigger and @gsap/react)</strong> and <strong>Lenis</strong> smooth scrolling. To honor digital accessibility standards, all animations and smooth scrolling are completely bypassed whenever <code className="font-mono text-xs bg-paper-subtle px-1 py-0.5 rounded">prefers-reduced-motion: reduce</code> is active, on touch devices, and during print, rendering all content statically and immediately.
            </p>
          </div>
        </section>

        {/* Responsible AI & Disclaimer */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-3"
          aria-labelledby="heading-responsible-ai"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-responsible-ai" className="font-serif font-bold text-lg sm:text-xl text-ink">
              {ABOUT_PROJECT.responsibleAi.heading}
            </h2>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            {ABOUT_PROJECT.responsibleAi.text}
          </p>
        </section>

        {/* Legal & Policy Navigation Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rule text-xs text-ink-muted">
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 hover:text-accent underline underline-offset-4 min-h-[36px]"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Privacy Policy</span>
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 hover:text-accent underline underline-offset-4 min-h-[36px]"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Terms of Service</span>
            </Link>
          </div>
          <p>© {new Date().getFullYear()} {APP_NAME} · Crafted with pride by {AUTHOR_NAME}.</p>
        </div>
      </div>
    </AppShell>
  );
}

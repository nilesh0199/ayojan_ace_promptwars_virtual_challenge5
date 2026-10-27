import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { SmoothScroll } from '@/components/smooth-scroll';
import { APP_NAME, AUTHOR_NAME } from '@/lib/constants';
import {
  ShieldAlert,
  Lock,
  Eye,
  Database,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  FileText,
} from 'lucide-react';

export const metadata = {
  title: `Privacy Policy · ${APP_NAME}`,
  description: 'Plain language privacy policy and data governance disclosure.',
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <SmoothScroll />
      <div className="w-full max-w-4xl mx-auto space-y-10 pb-16">
        {/* Header Hero */}
        <div className="border-b border-rule pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Data Transparency</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-ink tracking-tight">
            Privacy <span className="text-accent">Policy</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-ink-muted leading-relaxed font-serif italic">
            &ldquo;Written in plain, straightforward language for {APP_NAME} users. Last updated October 2026.&rdquo;
          </p>
        </div>

        {/* What Information We Collect */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-info-collect"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Eye className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-info-collect" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              What Information We Collect
            </h2>
          </div>
          <p className="text-ink text-sm sm:text-base leading-relaxed">
            {APP_NAME} collects only the event planning parameters you enter directly into our intake and replanning forms: event type, celebration date, guest count, city, budget amounts, style or cultural description, and non-negotiables.
          </p>
          <div className="p-4 sm:p-5 rounded-xl bg-paper border border-rule flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm sm:text-base font-medium text-ink leading-relaxed">
              We never ask for or require credit card details, bank credentials, home addresses, or government identification.
            </p>
          </div>
        </section>

        {/* Use of Generative AI Services & Backup Provider Window */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-5"
          aria-labelledby="heading-ai-services"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Lock className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-ai-services" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              Use of Generative AI Services &amp; Backup Provider Window
            </h2>
          </div>
          <p className="text-ink text-sm sm:text-base leading-relaxed">
            To generate realistic budgets, phased timelines, and creative event concepts, your planning input is securely processed from our server. We utilize Google&apos;s Gemini API as our primary AI engine. If Google Gemini experiences high demand, rate limits, or transient downtime, your planning request may be securely routed to Groq as an optional backup AI provider. If all AI services are unavailable, our built-in deterministic template planner generates your celebration plan entirely without external network transmission.
          </p>

          <div className="p-4 sm:p-5 rounded-xl bg-paper border border-rule space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-semibold tracking-wide">
              Demo Key Availability Window
            </span>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              This application was built for the PromptWars Challenge 5. The optional Groq backup AI key includes a configured expiration date (<code className="px-1.5 py-0.5 rounded-md bg-paper-subtle border border-rule font-mono text-xs">GROQ_KEY_EXPIRES_ON</code>) corresponding to the ~2-month competition evaluation lifecycle. If the backup demo key reaches its expiration date or is rejected (401/403), the server disables the backup provider for the remainder of the session to prevent repeated network overhead. When this occurs, planning continues uninterrupted using the main Gemini AI and the built-in planner, accompanied by a calm, accessible notification.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-xl border border-rule bg-paper space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <p className="font-semibold text-sm sm:text-base text-ink">Important Security &amp; Privacy Guidelines:</p>
            </div>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-ink-muted">
              <li>Because planning text is evaluated by AI models, <strong>never enter sensitive personal secrets, bank credentials, private passwords, or confidential identity documents</strong> in the intake form or non-negotiables box.</li>
              <li>All user input is wrapped strictly as untrusted passive data parameters within explicit delimiters to prevent prompt injection attacks.</li>
              <li>No planning data is ever sold or utilized for third-party advertising.</li>
            </ul>
          </div>
        </section>

        {/* Guest Mode vs. Firebase Auth */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-guest-vs-auth"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <Database className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-guest-vs-auth" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              Guest Mode vs. Firebase Cloud Storage
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <article className="p-5 rounded-xl bg-paper border border-rule flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-semibold tracking-wide">
                  Guest Mode
                </span>
                <p className="text-sm text-ink leading-relaxed">
                  Plan, rebalance, and print celebration plans without creating an account. In Guest Mode, your data remains solely in your browser&apos;s local storage and is never written to an external database.
                </p>
              </div>
            </article>

            <article className="p-5 rounded-xl bg-paper border border-rule flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-semibold tracking-wide">
                  Google Sign-in
                </span>
                <p className="text-sm text-ink leading-relaxed">
                  If you choose to sign in with Google to save plans across devices, Firebase Authentication stores your name and email. Your plans are saved to Firestore in an isolated document tree accessible strictly by your own authenticated user identifier.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Google Sign-in & Calendar Integrations */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-calendar-integrations"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-calendar-integrations" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              Google Sign-in &amp; Calendar Integrations
            </h2>
          </div>
          <p className="text-ink text-sm sm:text-base leading-relaxed">
            {APP_NAME} provides two distinct pathways for saving plans and managing milestone schedules:
          </p>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="p-4 sm:p-5 rounded-xl border border-rule bg-paper space-y-2">
              <p className="font-bold text-ink text-sm sm:text-base">1. Warning-Free Default Calendar Integration (Zero OAuth Required)</p>
              <p className="text-ink-muted leading-relaxed">
                Each milestone in your timeline provides a direct &ldquo;Add to Google Calendar&rdquo; link that launches Google Calendar&apos;s standard event template in a new browser tab. You can also click &ldquo;Download all as .ics&rdquo; to import the complete celebration schedule into any calendar app (Apple Calendar, Outlook, Google Calendar) with automatic 1-day advance notifications (VALARM).
              </p>
              <p className="font-medium text-accent pt-1">
                These default options require no sign-in, no OAuth permissions, and zero third-party access to your calendar. Reminders follow your personal calendar notification settings.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl border border-rule bg-paper space-y-2">
              <p className="font-bold text-ink text-sm sm:text-base">2. Advanced OAuth Calendar Auto-Sync</p>
              <p className="text-ink-muted leading-relaxed">
                For users wanting direct automated sync with popup and email reminders directly from the workspace, an optional OAuth connection is available under the Advanced section:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-ink-muted pt-1">
                <li>
                  <strong>Unverified App Screen:</strong> Because {APP_NAME} is an independent competition project, Google may display a standard &ldquo;Google hasn&apos;t verified this app&rdquo; notice. Choosing Advanced &rarr; Continue connects solely the selected event creation scope.
                </li>
                <li>
                  <strong>Narrow Permission:</strong> We request strictly <code className="px-1.5 py-0.5 rounded-md bg-paper-subtle border border-rule font-mono text-xs">https://www.googleapis.com/auth/calendar.events</code> solely to write and manage the specific milestones you select.
                </li>
                <li>
                  <strong>Session-Only In-Memory Storage:</strong> OAuth access tokens are stored strictly in browser memory for the active session. They are never written to Firestore, localStorage, cookies, or server logs, and are immediately purged on sign-out or session end.
                </li>
                <li>
                  <strong>No Reading of Personal Calendars:</strong> We never read your calendar entries, never inspect contacts, and never run background jobs.
                </li>
              </ul>
            </div>

            <div className="p-4 sm:p-5 rounded-xl border border-rule bg-paper space-y-2">
              <p className="font-bold text-ink text-sm sm:text-base">3. Firebase Authentication &amp; Session Lifecycle</p>
              <p className="text-ink-muted leading-relaxed">
                Google Sign-in uses browser session persistence (<code className="px-1.5 py-0.5 rounded-md bg-paper-subtle border border-rule font-mono text-xs">browserSessionPersistence</code>). When you sign out, all local cached plan data, user identifiers, and in-memory tokens are completely cleared from screen and memory.
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention and Deletion */}
        <section
          className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs space-y-4"
          aria-labelledby="heading-data-retention"
        >
          <div className="flex items-center gap-2.5 text-accent">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h2 id="heading-data-retention" className="font-serif font-bold text-xl sm:text-2xl text-ink">
              Data Retention and Deletion
            </h2>
          </div>
          <p className="text-ink text-sm sm:text-base leading-relaxed">
            You maintain total control over your celebration plans. You can rename or permanently delete any saved plan at any time from the Saved Plans screen. Deleting a plan completely purges its records from Firestore.
          </p>
        </section>

        {/* Legal & Policy Navigation Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-rule text-xs text-ink-muted">
          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 hover:text-accent underline underline-offset-4 min-h-[36px]"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>About The Project</span>
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

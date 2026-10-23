import React from 'react';
import { AppShell } from '@/components/app-shell';
import { APP_NAME } from '@/lib/constants';
import { ShieldAlert, Lock, Eye, Database } from 'lucide-react';

export const metadata = {
  title: `Privacy Policy · ${APP_NAME}`,
  description: 'Plain language privacy policy and data governance disclosure.',
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="border-b border-rule pb-6">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase text-accent mb-2">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <span>Data Transparency</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
            Written in plain, straightforward language for {APP_NAME} users. Last updated October 2026.
          </p>
        </div>

        <div className="space-y-6 text-sm text-ink-muted leading-relaxed">
          <section className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Eye className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-serif font-bold text-lg text-ink">What Information We Collect</h2>
            </div>
            <p>
              {APP_NAME} collects only the event planning parameters you enter directly into our intake and replanning forms: event type, celebration date, guest count, city, budget amounts, style or cultural description, and non-negotiables.
            </p>
            <p className="font-medium text-ink">
              We never ask for or require credit card details, bank credentials, home addresses, or government identification.
            </p>
          </section>

          <section className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Lock className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-serif font-bold text-lg text-ink">Use of Generative AI Services &amp; Backup Provider Availability Window</h2>
            </div>
            <p>
              To generate realistic budgets, phased timelines, and creative event concepts, your planning input is securely processed from our server. We utilize Google&apos;s Gemini API as our primary AI engine. If Google Gemini experiences high demand, rate limits, or transient downtime, your planning request may be securely routed to Groq as an optional backup AI provider. If all AI services are unavailable, our built-in deterministic template planner generates your celebration plan entirely without external network transmission.
            </p>
            <p className="text-xs text-ink-muted leading-relaxed">
              <strong>Demo Key Availability Window:</strong> This application was built for the PromptWars Challenge 5. The optional Groq backup AI key includes a configured expiration date (<code>GROQ_KEY_EXPIRES_ON</code>) corresponding to the ~2-month competition evaluation lifecycle. If the backup demo key reaches its expiration date or is rejected (401/403), the server disables the backup provider for the remainder of the session to prevent repeated network overhead. When this occurs, planning continues uninterrupted using the main Gemini AI and the built-in planner, accompanied by a calm, accessible notification.
            </p>
            <div className="p-4 rounded-xl border border-rule bg-paper-subtle text-xs text-ink space-y-2">
              <p className="font-semibold text-accent">Important Security &amp; Privacy Guidelines:</p>
              <ul className="list-disc list-inside space-y-1 text-ink-muted">
                <li>Because planning text is evaluated by AI models, <strong>never enter sensitive personal secrets, bank credentials, private passwords, or confidential identity documents</strong> in the intake form or non-negotiables box.</li>
                <li>All user input is wrapped strictly as untrusted passive data parameters within explicit delimiters to prevent prompt injection attacks.</li>
                <li>No planning data is ever sold or utilized for third-party advertising.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Database className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-serif font-bold text-lg text-ink">Guest Mode vs. Firebase Auth</h2>
            </div>
            <p>
              <strong>Guest Mode:</strong> You can plan, rebalance, and print plans without creating an account. In Guest Mode, your data remains solely in your browser&apos;s local storage and is never written to a cloud database.
            </p>
            <p>
              <strong>Google Sign-in:</strong> If you choose to sign in with Google to save plans across devices, Firebase Authentication stores your name and email. Your plans are saved to Firestore in an isolated document tree accessible strictly by your own authenticated user identifier.
            </p>
          </section>

          <section className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Lock className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-serif font-bold text-lg text-ink">Google Sign-in &amp; Calendar Integrations</h2>
            </div>
            <p>
              {APP_NAME} provides two distinct pathways for saving plans and managing milestone schedules:
            </p>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-rule bg-paper-subtle space-y-1.5">
                <p className="font-bold text-ink">1. Warning-Free Default Calendar Integration (Zero OAuth Required)</p>
                <p className="text-ink-muted">
                  Each milestone in your timeline provides a direct &ldquo;Add to Google Calendar&rdquo; link that launches Google Calendar&apos;s standard event template in a new browser tab. You can also click &ldquo;Download all as .ics&rdquo; to import the complete celebration schedule into any calendar app (Apple Calendar, Outlook, Google Calendar) with automatic 1-day advance notifications (VALARM).
                </p>
                <p className="font-medium text-accent">
                  These default options require no sign-in, no OAuth permissions, and zero third-party access to your calendar. Reminders follow your personal calendar notification settings.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-rule bg-paper-subtle space-y-1.5">
                <p className="font-bold text-ink">2. Advanced OAuth Calendar Auto-Sync</p>
                <p className="text-ink-muted">
                  For users wanting direct automated sync with popup and email reminders directly from the workspace, an optional OAuth connection is available under the Advanced section:
                </p>
                <ul className="list-disc list-inside space-y-1 text-ink-muted">
                  <li>
                    <strong>Unverified App Screen:</strong> Because {APP_NAME} is an independent competition project, Google may display a standard &ldquo;Google hasn&apos;t verified this app&rdquo; notice. Choosing Advanced &rarr; Continue connects solely the selected event creation scope.
                  </li>
                  <li>
                    <strong>Narrow Permission:</strong> We request strictly <code>https://www.googleapis.com/auth/calendar.events</code> solely to write and manage the specific milestones you select.
                  </li>
                  <li>
                    <strong>Session-Only In-Memory Storage:</strong> OAuth access tokens are stored strictly in browser memory for the active session. They are never written to Firestore, localStorage, cookies, or server logs, and are immediately purged on sign-out or session end.
                  </li>
                  <li>
                    <strong>No Reading of Personal Calendars:</strong> We never read your calendar entries, never inspect contacts, and never run background jobs.
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl border border-rule bg-paper-subtle space-y-1.5">
                <p className="font-bold text-ink">3. Firebase Authentication &amp; Session Lifecycle</p>
                <p className="text-ink-muted">
                  Google Sign-in uses browser session persistence (<code>browserSessionPersistence</code>). When you sign out, all local cached plan data, user identifiers, and in-memory tokens are completely cleared from screen and memory.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs space-y-3">
            <h2 className="font-serif font-bold text-lg text-ink">Data Retention and Deletion</h2>
            <p>
              You maintain total control over your celebration plans. You can rename or permanently delete any saved plan at any time from the Saved Plans screen. Deleting a plan completely purges its records from Firestore.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

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
              <h2 className="font-serif font-bold text-lg text-ink">Use of Google Gemini AI API</h2>
            </div>
            <p>
              To generate realistic budgets, phased timelines, and creative event concepts, your planning input is securely sent from our server to Google&apos;s Gemini API.
            </p>
            <div className="p-4 rounded-xl border border-rule bg-paper-subtle text-xs text-ink space-y-2">
              <p className="font-semibold text-accent">Important Security Guidelines:</p>
              <ul className="list-disc list-inside space-y-1 text-ink-muted">
                <li>Because planning text is evaluated by Google Gemini, do not enter sensitive personal secrets, private passwords, or confidential identity documents in the non-negotiables box.</li>
                <li>All input is wrapped as untrusted passive data parameters to prevent prompt injection.</li>
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
              <h2 className="font-serif font-bold text-lg text-ink">Google Sign-in &amp; Optional Google Calendar Integration</h2>
            </div>
            <p>
              {APP_NAME} provides an optional integration with Google Calendar to help you stay on schedule with milestone deadlines:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs">
              <li>
                <strong>Requested Scopes:</strong> When you connect your calendar, we request the narrow <code>https://www.googleapis.com/auth/calendar.events</code> permission, allowing the app solely to create and manage the specific milestone events you select.
              </li>
              <li>
                <strong>In-Memory Token Storage ONLY:</strong> OAuth access tokens are stored strictly in client runtime memory and expire naturally. We <em>never</em> persist Google OAuth access tokens or refresh tokens in Firestore, localStorage, session cookies, or server logs.
              </li>
              <li>
                <strong>No Background Calendar Access:</strong> We never read your existing personal calendar events, never inspect other calendars, and never access your calendar in the background without explicit user interaction.
              </li>
              <li>
                <strong>Revocation &amp; Removal:</strong> You can delete all synced reminder events anytime with one click using the &ldquo;Remove Reminders&rdquo; control in the Timeline tab, or revoke permission at any time through your Google Account security permissions.
              </li>
            </ul>
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

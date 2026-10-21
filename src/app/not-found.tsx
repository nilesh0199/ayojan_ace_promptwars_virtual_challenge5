import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <AppShell>
      <div className="w-full max-w-xl mx-auto my-16 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-accent-subtle text-accent mx-auto flex items-center justify-center">
          <Compass className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-ink">
          404 &ndash; Page Not Found
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          The celebration planning page you requested does not exist or has been moved to a different milestone.
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-accent text-accent-text text-sm font-semibold hover:bg-accent-hover transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Return to Plan Creator</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

import React from 'react';
import { AppShell } from '@/components/app-shell';
import { IntakeForm } from '@/components/intake-form';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export const metadata = {
  title: `Plan Creator · ${APP_NAME}`,
  description: `Design and customize your event celebration plan with ${APP_NAME} — ${APP_TAGLINE}`,
};

export default function PlanPage() {
  return (
    <AppShell>
      <div className="w-full py-4">
        <IntakeForm />
      </div>
    </AppShell>
  );
}

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-context';
import { PlanProvider, usePlan } from '@/components/plan-context';
import SavedPlansPage from '@/app/saved/page';
import { TabTimeline } from '@/components/workspace/tab-timeline';
import { SAVED_EXAMPLES } from '@/data/savedExamples';

// Mock navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/saved',
}));

// Component to preload active plan for TabTimeline test
function TimelineWrapper() {
  const { setActivePlan } = usePlan();
  React.useEffect(() => {
    setActivePlan(SAVED_EXAMPLES.wedding);
  }, [setActivePlan]);

  return <TabTimeline />;
}

describe('Saved Plans & Reminders Accessibility (jest-axe)', () => {
  afterEach(() => {
    cleanup();
  });

  const renderWithProviders = (ui: React.ReactElement, isDark = false) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider>{ui}</PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  it('Saved Plans page has no accessibility violations in Light theme', async () => {
    const { container } = renderWithProviders(<SavedPlansPage />, false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Saved Plans page has no accessibility violations in Dark theme', async () => {
    const { container } = renderWithProviders(<SavedPlansPage />, true);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Timeline with Google Calendar Reminders panel has no accessibility violations', async () => {
    const { container } = renderWithProviders(<TimelineWrapper />, false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

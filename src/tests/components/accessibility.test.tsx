import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-context';
import { PlanProvider } from '@/components/plan-context';
import HomePage from '@/app/page';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import NotFound from '@/app/not-found';
import { ThemeToggle } from '@/components/theme-toggle';

// Mock router for navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

describe('Accessibility (a11y) Verification with jest-axe', () => {
  afterEach(() => {
    cleanup();
  });

  const renderInTheme = (ui: React.ReactElement, isDark = false) => {
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

  it('Home / Intake screen has no accessibility violations in Light theme', async () => {
    const { container } = renderInTheme(<HomePage />, false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Home / Intake screen has no accessibility violations in Dark theme', async () => {
    const { container } = renderInTheme(<HomePage />, true);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Privacy screen has no accessibility violations in Light theme', async () => {
    const { container } = renderInTheme(<PrivacyPage />, false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Privacy screen has no accessibility violations in Dark theme', async () => {
    const { container } = renderInTheme(<PrivacyPage />, true);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Terms of Service screen has no accessibility violations', async () => {
    const { container } = renderInTheme(<TermsPage />, false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('404 Not Found screen has no accessibility violations', async () => {
    const { container } = renderInTheme(<NotFound />, false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ThemeToggle has no accessibility violations', async () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

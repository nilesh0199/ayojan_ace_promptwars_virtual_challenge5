import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TabRisks } from '@/components/workspace/tab-risks';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { PREPARED_PLANS, SAFEGUARDS_CHECK_DELAY_MS } from '@/data/preparedPlans';
import { SAVED_EXAMPLES } from '@/data/savedExamples';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/workspace',
}));

describe('TabRisks Safeguards Review & 4-Second Loading Motion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderTabRisks = (initialPlan = PREPARED_PLANS['indian-wedding'].plan) => {
    let result: ReturnType<typeof render> = {} as ReturnType<typeof render>;
    act(() => {
      result = render(
        <ThemeProvider>
          <AuthProvider>
            <PlanProvider initialPlan={initialPlan}>
              <TabRisks />
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      );
    });
    return result;
  };

  it('shows the 4-second safeguards loading screen when opening risks for a preset plan', () => {
    vi.useFakeTimers();
    renderTabRisks();

    // 1. Loading screen appears initially
    expect(screen.getByTestId('safeguards-loader')).toBeInTheDocument();
    expect(
      screen.getByText('Analyzing Operational Safeguards & Contingencies')
    ).toBeInTheDocument();

    // Button indicates analysis is running
    expect(screen.getByText('Analyzing Safeguards...')).toBeInTheDocument();

    // 2. Advance time by 3000ms (still within 4 seconds)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('safeguards-loader')).toBeInTheDocument();

    // 3. Advance the remaining 1000ms (total 4000ms = 4 seconds)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 4. Loader is gone and safeguards check cards are revealed
    expect(screen.queryByTestId('safeguards-loader')).not.toBeInTheDocument();
    expect(screen.getByText('Re-Run Safeguards Check')).toBeInTheDocument();
    expect(screen.getAllByText(/Mitigation Action:/i).length).toBeGreaterThan(0);
  });

  it('allows user to cancel the safeguards analysis by clicking the normal Cancel button', () => {
    vi.useFakeTimers();
    renderTabRisks();

    expect(screen.getByTestId('safeguards-loader')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByTestId('safeguards-loader')).not.toBeInTheDocument();
  });

  it('clicking "Re-Run Safeguards Check" runs the 4-second loading screen again without calling fetch', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const initialPlan = PREPARED_PLANS['indian-wedding'].plan;
    renderTabRisks(initialPlan);

    // Initial 4-second review completes
    act(() => {
      vi.advanceTimersByTime(SAFEGUARDS_CHECK_DELAY_MS);
    });

    expect(screen.queryByTestId('safeguards-loader')).not.toBeInTheDocument();
    const rerunBtn = screen.getByRole('button', { name: /Re-Run Safeguards Check/i });

    // Click Re-Run
    act(() => {
      fireEvent.click(rerunBtn);
    });

    // 4-second loader appears and no API call is made
    expect(screen.getByTestId('safeguards-loader')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Advance 4000ms
    act(() => {
      vi.advanceTimersByTime(SAFEGUARDS_CHECK_DELAY_MS);
    });

    expect(screen.queryByTestId('safeguards-loader')).not.toBeInTheDocument();
    expect(screen.getByText('Re-Run Safeguards Check')).toBeInTheDocument();
  });

  it('stores and restores safeguards in localStorage under aayojan_ace_active_risks', () => {
    const initialPlan = PREPARED_PLANS['indian-wedding'].plan;
    renderTabRisks(initialPlan);

    const stored = localStorage.getItem('aayojan_ace_active_risks');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.risks).toBeDefined();
    expect(parsed.risks.length).toBeGreaterThan(0);
  });

  it('passes jest-axe accessibility checks when safeguards are loaded', async () => {
    vi.useFakeTimers();
    const initialPlan = PREPARED_PLANS['indian-wedding'].plan;
    const { container } = renderTabRisks(initialPlan);

    act(() => {
      vi.advanceTimersByTime(SAFEGUARDS_CHECK_DELAY_MS);
    });

    vi.useRealTimers();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

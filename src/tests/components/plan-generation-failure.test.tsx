import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { IntakeForm } from '@/components/intake-form';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import WorkspacePage from '@/app/workspace/page';
import { getFriendlyAiError, GeminiErrorCode } from '@/lib/gemini';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/workspace',
}));

describe('Task B: Plan Generation Failure & Navigation Rules', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const renderIntake = () => {
    return render(
      <AuthProvider>
        <PlanProvider>
          <IntakeForm />
        </PlanProvider>
      </AuthProvider>
    );
  };

  describe('Navigation Rules on Failure vs Success', () => {
    it('does NOT navigate to /workspace on generation failure and preserves all form inputs', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/plan/followup')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Followup internal error' }),
          });
        }
        if (url.includes('/api/plan/generate')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({
              code: 'AI_BUSY',
              error: 'Service Unavailable',
              message: 'Gemini AI is currently experiencing high demand.',
            }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderIntake();

      const cityInput = screen.getByLabelText(/City \/ Location/i) as HTMLInputElement;
      fireEvent.change(cityInput, { target: { value: 'Udaipur' } });

      const budgetInput = screen.getByLabelText(/Total Budget/i) as HTMLInputElement;
      fireEvent.change(budgetInput, { target: { value: '1800000' } });

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Navigation was NOT called
      expect(mockPush).not.toHaveBeenCalled();

      // Form inputs were preserved
      expect(cityInput.value).toBe('Udaipur');
      expect(budgetInput.value).toBe('1800000');

      // Local storage remains empty of created plans
      expect(localStorage.getItem('aayojan_ace_active_plan')).toBeNull();
    });

    it('navigates to /workspace on successful plan generation', async () => {
      const mockPlan = {
        id: 'plan_123',
        title: 'Udaipur Wedding',
        eventType: 'Wedding',
        city: 'Udaipur',
        date: '2026-11-20',
        guestCount: 200,
        totalBudget: 1500000,
        currency: 'INR',
        styleCulture: 'Royal Rajasthani',
        nonNegotiables: ['Heritage Venue'],
        budget: { total: 1500000, currency: 'INR', categories: [] },
        timeline: [],
        vendors: [],
        ideas: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        generationSource: 'primary',
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/plan/followup')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: async () => ({ needsFollowUp: false }),
          });
        }
        if (url.includes('/api/plan/generate')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockPlan,
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderIntake();

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspace');
      });
    });

    it('navigates to /workspace when fallback template plan is generated', async () => {
      const mockTemplatePlan = {
        id: 'plan_template_123',
        title: 'Built-in Template Wedding',
        eventType: 'Wedding',
        city: 'Jaipur',
        date: '2026-11-20',
        guestCount: 150,
        totalBudget: 1000000,
        currency: 'INR',
        styleCulture: 'Classic Indian',
        nonNegotiables: [],
        budget: { total: 1000000, currency: 'INR', categories: [] },
        timeline: [],
        vendors: [],
        ideas: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        generationSource: 'template',
        generationErrorCode: 'AI_BUSY',
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/plan/followup')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ needsFollowUp: false }),
          });
        }
        if (url.includes('/api/plan/generate')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockTemplatePlan,
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderIntake();

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspace');
      });
    });
  });

  describe('Form Validation Error Banner', () => {
    it('displays an accessible alert listing invalid fields when validation fails, without navigating', async () => {
      renderIntake();

      // Set empty city to trigger validation error
      const cityInput = screen.getByLabelText(/City \/ Location/i);
      fireEvent.change(cityInput, { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/Incomplete Celebration Details/i);
        expect(alert).toHaveTextContent(/City/i);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Typed Error Messages and Retry Button Styling', () => {
    const errorCodes: GeminiErrorCode[] = [
      'AI_BUSY',
      'AI_TIMEOUT',
      'AI_INVALID_KEY',
      'AI_MODEL_NOT_FOUND',
      'AI_VALIDATION_FAILED',
      'AI_NETWORK_ERROR',
      'HOSTING_TIMEOUT',
    ];

    errorCodes.forEach((code) => {
      it(`renders distinct plain friendly explanation for ${code}`, () => {
        const info = getFriendlyAiError(code);
        expect(info.title).toBeTruthy();
        expect(info.message).toBeTruthy();
        expect(info.actionHint).toBeTruthy();
        // Does not show raw tech jargon
        expect(info.message).not.toContain('undefined');
        expect(info.message).not.toContain('null');
        expect(info.message).not.toContain('stack');
      });
    });

    it('renders rate limit message with exact seconds to wait when provided', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/plan/followup')) {
          return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
        }
        if (url.includes('/api/plan/generate')) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit reached. Please wait 15 seconds before trying again.',
              retryAfterSeconds: 15,
            }),
          });
        }
        return Promise.reject(new Error('Unknown'));
      });

      renderIntake();

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/wait 15 seconds/i);
      });
    });

    it('Retry button in error alert uses accessible bg-accent and text-accent-text classes', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/plan/followup')) {
          return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
        }
        if (url.includes('/api/plan/generate')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({
              code: 'AI_BUSY',
              message: 'Gemini AI is currently experiencing high demand.',
            }),
          });
        }
        return Promise.reject(new Error('Unknown'));
      });

      renderIntake();

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        const retryBtn = screen.getByRole('button', { name: /Retry celebration planning/i });
        expect(retryBtn).toBeInTheDocument();
        expect(retryBtn.className).toContain('bg-accent');
        expect(retryBtn.className).toContain('text-accent-text');
        // Ensure old incorrect text-accent-contrast is gone
        expect(retryBtn.className).not.toContain('text-accent-contrast');
      });
    });
  });

  describe('Workspace Empty State', () => {
    it('shows friendly empty state with "Create a plan" and "Open Saved Plans" links when no active plan exists', () => {
      render(
        <ThemeProvider>
          <AuthProvider>
            <PlanProvider initialPlan={null}>
              <WorkspacePage />
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      );

      expect(screen.getByText(/No Active Plan Loaded/i)).toBeInTheDocument();

      const createLink = screen.getByRole('link', { name: /Create a plan/i });
      expect(createLink).toBeInTheDocument();
      expect(createLink).toHaveAttribute('href', '/');

      const savedLink = screen.getByRole('link', { name: /Open Saved Plans/i });
      expect(savedLink).toBeInTheDocument();
      expect(savedLink).toHaveAttribute('href', '/saved');
    });

    it('has no accessibility violations in Workspace empty state (jest-axe)', async () => {
      const { container } = render(
        <ThemeProvider>
          <AuthProvider>
            <PlanProvider initialPlan={null}>
              <div data-theme="light">
                <WorkspacePage />
              </div>
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in Workspace empty state in Dark theme (jest-axe)', async () => {
      const { container } = render(
        <ThemeProvider>
          <AuthProvider>
            <PlanProvider initialPlan={null}>
              <div data-theme="dark" className="dark">
                <WorkspacePage />
              </div>
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

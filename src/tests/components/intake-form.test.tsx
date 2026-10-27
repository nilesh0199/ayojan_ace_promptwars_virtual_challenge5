import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntakeForm } from '@/components/intake-form';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('IntakeForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <PlanProvider>
          <IntakeForm />
        </PlanProvider>
      </AuthProvider>
    );
  };

  it('renders intake fields with proper accessible labels', () => {
    renderComponent();

    expect(screen.getByLabelText(/Event Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City \/ Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Guest Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Style, Theme & Culture/i)).toBeInTheDocument();
  });

  it('populates fields when a preset button is clicked', () => {
    renderComponent();

    const housewarmingButton = screen.getByRole('button', {
      name: /Griha Pravesh \/ Housewarming/i,
    });
    fireEvent.click(housewarmingButton);

    const cityInput = screen.getByLabelText(/City \/ Location/i) as HTMLInputElement;
    expect(cityInput.value).toBe('Bengaluru');

    const guestInput = screen.getByLabelText(/Guest Count/i) as HTMLInputElement;
    expect(guestInput.value).toBe('60');
  });

  it('displays validation errors when mandatory inputs are invalid', async () => {
    renderComponent();

    // Clear city input
    const cityInput = screen.getByLabelText(/City \/ Location/i);
    fireEvent.change(cityInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/City name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('renders friendly positive error banner with Retry and Load Saved Example buttons on AI failure', async () => {
    // Mock global fetch to return 503 AI_BUSY
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'AI Planning Service Alert',
        code: 'AI_BUSY',
        message: 'Gemini AI is currently experiencing high demand. Please click Retry in a few moments, or explore a pre-built celebration plan.',
      }),
    } as unknown as Response);

    try {
      renderComponent();

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/High Demand on AI Services/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry celebration planning/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Load pre-built saved example celebration plan/i })).toBeInTheDocument();
      });

      // Verify no raw upstream JSON or stack traces in UI
      const alert = screen.getByRole('alert');
      expect(alert.textContent).not.toContain('{"');
      expect(alert.textContent).not.toContain('stack');
      expect(alert.textContent).not.toContain('fatal');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('scrolls user to the top of the page when generation starts so they see the animated loader', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo');
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/plan/followup')) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
      }
      return new Promise(() => {}); // Keep in loading state
    });

    try {
      renderComponent();

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
        expect(screen.getByTestId('ai-loader')).toBeInTheDocument();
      });
    } finally {
      global.fetch = originalFetch;
      scrollToSpy.mockRestore();
    }
  });
});

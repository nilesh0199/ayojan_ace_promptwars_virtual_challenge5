import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { IntakeForm } from '@/components/intake-form';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';

expect.extend(toHaveNoViolations);

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Prepared Plans UI and Loading Motion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('renders the short explanatory note under the preset tiles', () => {
    renderComponent();

    expect(
      screen.getByText('Presets open a prepared plan. Change any detail and AI builds a fresh one.')
    ).toBeInTheDocument();
  });

  it('triggers prepared plan flow with honest wording and 3000ms delay when unchanged preset is submitted', () => {
    vi.useFakeTimers();
    renderComponent();

    // Click Griha Pravesh preset
    const housewarmingPreset = screen.getByRole('button', {
      name: /Griha Pravesh \/ Housewarming/i,
    });
    fireEvent.click(housewarmingPreset);

    // Submit without changing any fields
    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
    fireEvent.click(submitBtn);

    // Rotating loader appears with honest wording
    expect(screen.getByTestId('prepared-plan-loader')).toBeInTheDocument();
    expect(screen.getByText('Opening Prepared Plan')).toBeInTheDocument();
    expect(screen.getByText('Opening your prepared plan...')).toBeInTheDocument();

    // Verify Cancel button exists and says "Cancel"
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Double submits are prevented: submit button is disabled
    expect(submitBtn).toBeDisabled();

    // Before 3000ms, router.push is not called
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // After 3000ms completes, router.push('/workspace') is called
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockPush).toHaveBeenCalledWith('/workspace');
  });

  it('uses 1000ms delay when prefers-reduced-motion is active', () => {
    vi.useFakeTimers();

    // Mock matchMedia for prefers-reduced-motion
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      renderComponent();

      // Click Diwali preset
      const diwaliPreset = screen.getByRole('button', {
        name: /Diwali \/ Festival Gathering/i,
      });
      fireEvent.click(diwaliPreset);

      const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
      fireEvent.click(submitBtn);

      expect(screen.getByTestId('prepared-plan-loader')).toBeInTheDocument();

      // At 500ms, not navigated yet
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mockPush).not.toHaveBeenCalled();

      // At 1000ms, completes!
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mockPush).toHaveBeenCalledWith('/workspace');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('allows user to Cancel during the loading delay', () => {
    vi.useFakeTimers();
    renderComponent();

    // Click Indian Wedding preset
    const weddingPreset = screen.getByRole('button', {
      name: /Indian Wedding/i,
    });
    fireEvent.click(weddingPreset);

    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('prepared-plan-loader')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // User clicks Cancel
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    // Loader is removed and state is reset
    expect(screen.queryByTestId('prepared-plan-loader')).not.toBeInTheDocument();

    // Advancing past 3000ms does NOT navigate to /workspace
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // Form inputs remain intact
    const cityInput = screen.getByLabelText(/City \/ Location/i) as HTMLInputElement;
    expect(cityInput.value).toBe('Jaipur');
  });

  it('runs normal AI generation flow if any detail is changed from the preset defaults', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ai-gen-plan-1',
        title: 'Custom Destination Wedding',
        eventType: 'Wedding',
        city: 'Udaipur',
        date: '2027-03-15',
        guestCount: 350,
        totalBudget: 2500000,
        currency: 'INR',
        styleCulture: 'Traditional Royal Rajasthani with Sangeet & Mehendi',
        nonNegotiables: 'Authentic regional catering (strict Jain counter), live Shehnai, venue with open lawn',
        budget: {
          categories: [
            { id: 'c1', name: 'Venue', minEstimate: 500000, maxEstimate: 700000, targetEstimate: 600000, notes: '' },
            { id: 'c2', name: 'Catering', minEstimate: 800000, maxEstimate: 1000000, targetEstimate: 900000, notes: '' },
            { id: 'c3', name: 'Decor', minEstimate: 300000, maxEstimate: 400000, targetEstimate: 350000, notes: '' },
          ],
          contingencyPercent: 10,
          taxServiceChargePercent: 5,
          statedAssumptions: ['Assumptions'],
        },
        timeline: [
          { id: 't1', phase: 'Now', title: 'Task 1', description: '', dueDate: '2027-01-01', owner: 'Host', completed: false, daysBeforeEvent: 73 },
          { id: 't2', phase: 'Next 30 days', title: 'Task 2', description: '', dueDate: '2027-02-01', owner: 'Host', completed: false, daysBeforeEvent: 42 },
          { id: 't3', phase: 'Event week', title: 'Task 3', description: '', dueDate: '2027-03-10', owner: 'Host', completed: false, daysBeforeEvent: 5 },
          { id: 't4', phase: 'Event day', title: 'Task 4', description: '', dueDate: '2027-03-15', owner: 'Host', completed: false, daysBeforeEvent: 0 },
        ],
        vendors: [
          { id: 'v1', categoryName: 'Venue', vendorTypeDescription: 'Palace', status: 'Quoted', questionsToAsk: ['Q1', 'Q2', 'Q3'], verifyWithVendorNotice: 'Verify with the vendor' },
          { id: 'v2', categoryName: 'Caterer', vendorTypeDescription: 'Catering', status: 'Quoted', questionsToAsk: ['Q1', 'Q2', 'Q3'], verifyWithVendorNotice: 'Verify with the vendor' },
          { id: 'v3', categoryName: 'Photo', vendorTypeDescription: 'Photo', status: 'Quoted', questionsToAsk: ['Q1', 'Q2', 'Q3'], verifyWithVendorNotice: 'Verify with the vendor' },
        ],
        ideas: {
          themes: ['Theme 1'],
          dietaryNotes: ['Dietary 1'],
          activities: ['Activity 1'],
          decor: ['Decor 1'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isSavedExample: false,
      }),
    });
    global.fetch = fetchSpy;

    renderComponent();

    // Apply wedding preset
    const weddingPreset = screen.getByRole('button', {
      name: /Indian Wedding/i,
    });
    fireEvent.click(weddingPreset);

    // Modify the city from Jaipur to Udaipur
    const cityInput = screen.getByLabelText(/City \/ Location/i);
    fireEvent.change(cityInput, { target: { value: 'Udaipur' } });

    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
    fireEvent.click(submitBtn);

    // Prepared plan loader should NOT appear; normal AI generation runs
    expect(screen.queryByTestId('prepared-plan-loader')).not.toBeInTheDocument();

    await waitFor(() => {
      // Must have called AI endpoints
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it('runs animated prepared plan flow when clicking example buttons ("Wedding Example", "Birthday Example", "Community Event Example")', () => {
    vi.useFakeTimers();
    renderComponent();

    // Click "Birthday Example" button
    const birthdayExampleBtn = screen.getByRole('button', { name: /Birthday Example/i });
    fireEvent.click(birthdayExampleBtn);

    // Rotating loader appears with honest wording
    expect(screen.getByTestId('prepared-plan-loader')).toBeInTheDocument();
    expect(screen.getByText('Opening Prepared Plan')).toBeInTheDocument();

    // Double submits prevented: button is disabled
    expect(birthdayExampleBtn).toBeDisabled();

    // Advance 3000ms
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockPush).toHaveBeenCalledWith('/workspace');
  });

  it('triggers prepared plan flow when submitting unchanged Nikah & Walima preset', () => {
    vi.useFakeTimers();
    renderComponent();

    const nikahPreset = screen.getByRole('button', {
      name: /Nikah & Walima/i,
    });
    fireEvent.click(nikahPreset);

    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('prepared-plan-loader')).toBeInTheDocument();
    expect(screen.getByText('Opening Prepared Plan')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockPush).toHaveBeenCalledWith('/workspace');
  });

  it('triggers prepared plan flow when submitting unchanged Church Wedding preset', () => {
    vi.useFakeTimers();
    renderComponent();

    const churchPreset = screen.getByRole('button', {
      name: /Church Wedding & Reception/i,
    });
    fireEvent.click(churchPreset);

    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Plan/i });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('prepared-plan-loader')).toBeInTheDocument();
    expect(screen.getByText('Opening Prepared Plan')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockPush).toHaveBeenCalledWith('/workspace');
  });

  it('passes accessibility validation (jest-axe)', async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

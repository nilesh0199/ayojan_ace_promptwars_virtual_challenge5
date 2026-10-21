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
});

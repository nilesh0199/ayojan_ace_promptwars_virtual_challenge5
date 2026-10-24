import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntakeForm } from '@/components/intake-form';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

describe('IntakeForm Idea Chips & Muhurat Timing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider>
            <IntakeForm />
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );

  it('replaces city input when a popular Indian city chip is clicked', () => {
    renderComponent();

    const cityInput = screen.getByLabelText(/City \/ Location/i) as HTMLInputElement;
    expect(cityInput.value).toBe('Jaipur');

    const mumbaiChip = screen.getByRole('button', { name: 'Mumbai' });
    fireEvent.click(mumbaiChip);

    expect(cityInput.value).toBe('Mumbai');
  });

  it('replaces guest count when a quick pick chip is clicked', () => {
    renderComponent();

    const guestInput = screen.getByLabelText(/Guest Count/i) as HTMLInputElement;
    const chip500 = screen.getByRole('button', { name: '500' });
    fireEvent.click(chip500);

    expect(guestInput.value).toBe('500');
  });

  it('replaces budget amount when a budget tier chip is clicked', () => {
    renderComponent();

    const budgetInput = screen.getByLabelText(/Total Budget/i) as HTMLInputElement;
    const tierChip = screen.getByRole('button', { name: '₹35 Lakh' });
    fireEvent.click(tierChip);

    expect(budgetInput.value).toBe('3500000');
  });

  it('appends style chip to styleCulture input without duplicate', () => {
    renderComponent();

    const styleInput = screen.getByLabelText(/Style, Theme & Culture/i) as HTMLInputElement;
    const initialStyle = styleInput.value;

    const chip = screen.getByRole('button', { name: '+ Minimalist Elegant' });
    fireEvent.click(chip);

    expect(styleInput.value).toBe(`${initialStyle}, Minimalist Elegant`);

    // Clicking again should not duplicate
    fireEvent.click(chip);
    expect(styleInput.value).toBe(`${initialStyle}, Minimalist Elegant`);
  });

  it('shows Muhurat time input by default for Wedding celebrations', () => {
    renderComponent();

    const timeInput = screen.getByLabelText(/Auspicious Muhurat \/ Ritual Time/i);
    expect(timeInput).toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { IntakeForm } from '@/components/intake-form';

expect.extend(toHaveNoViolations);
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

  it('shows Ceremony / muhurat time input by default for Wedding celebrations with new label', () => {
    renderComponent();

    const timeInput = screen.getByLabelText(/Ceremony \/ muhurat time \(as advised by your priest, pandit, imam or pastor\)/i);
    expect(timeInput).toBeInTheDocument();
  });

  it('renders all six presets and loads Nikah & Walima and Church Wedding properly', () => {
    renderComponent();

    const nikahPresetBtn = screen.getByRole('button', { name: /Nikah & Walima/i });
    expect(nikahPresetBtn).toBeInTheDocument();
    fireEvent.click(nikahPresetBtn);

    const cityInput = screen.getByLabelText(/City \/ Location/i) as HTMLInputElement;
    expect(cityInput.value).toBe('Hyderabad');
    const guestInput = screen.getByLabelText(/Guest Count/i) as HTMLInputElement;
    expect(guestInput.value).toBe('250');
    const budgetInput = screen.getByLabelText(/Total Budget/i) as HTMLInputElement;
    expect(budgetInput.value).toBe('1200000');

    const churchPresetBtn = screen.getByRole('button', { name: /Church Wedding & Reception/i });
    expect(churchPresetBtn).toBeInTheDocument();
    fireEvent.click(churchPresetBtn);

    expect(cityInput.value).toBe('Kochi');
    expect(guestInput.value).toBe('200');
    expect(budgetInput.value).toBe('1000000');
  });

  it('renders inclusive Muslim and Christian example celebration name chips across event types', () => {
    renderComponent();

    // 1. Wedding (default)
    expect(screen.getByRole('button', { name: /Faizan & Ayesha’s Royal Nikah/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Joshua & Maria’s Church Nuptials/i })).toBeInTheDocument();

    // Clicking a chip updates the Celebration Name input
    const nikahChip = screen.getByRole('button', { name: /Faizan & Ayesha’s Royal Nikah/i });
    fireEvent.click(nikahChip);
    const nameInput = screen.getByLabelText(/Celebration Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Faizan & Ayesha’s Royal Nikah');

    // 2. Birthday
    const eventTypeSelect = screen.getByLabelText(/Event Type/i);
    fireEvent.change(eventTypeSelect, { target: { value: 'Birthday' } });
    expect(screen.getByRole('button', { name: /Amina’s 25th Garden Dawat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /David’s 50th Jubilee Banquet/i })).toBeInTheDocument();

    // 3. Community Event
    fireEvent.change(eventTypeSelect, { target: { value: 'Community Event' } });
    expect(screen.getByRole('button', { name: /Grand Eid Milan Community Dawat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /St. Jude’s Annual Christmas Carnival/i })).toBeInTheDocument();
  });

  it('IntakeForm with 6 presets and ceremony time field has no axe violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

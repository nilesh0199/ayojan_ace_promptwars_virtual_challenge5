import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabAskAi } from '@/components/workspace/tab-ask-ai';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { SAVED_EXAMPLES } from '@/data/savedExamples';

describe('TabAskAi Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider initialPlan={SAVED_EXAMPLES.wedding}>
            <TabAskAi />
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );

  it('renders starter questions for the current celebration type', () => {
    renderComponent();

    expect(screen.getByText(/Ask AI About Your Celebration/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Suggested Questions for Wedding/i)
    ).toBeInTheDocument();
  });

  it('submits a user question and renders AI response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: 'We advise scheduling pheras right at 11:30 AM to honor the auspicious muhurat.',
      }),
    });

    renderComponent();

    const input = screen.getByLabelText(/Ask a celebration doubt or question/i);
    fireEvent.change(input, { target: { value: 'What is the best timing for pheras?' } });

    const submitBtn = screen.getByRole('button', { name: /Send celebration inquiry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/We advise scheduling pheras right at 11:30 AM/i)
      ).toBeInTheDocument();
    });
  });
});

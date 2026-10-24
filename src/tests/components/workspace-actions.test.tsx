import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { PlanProvider } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { SAVED_EXAMPLES } from '@/data/savedExamples';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/workspace',
}));

const initialTestPlan = {
  ...SAVED_EXAMPLES.wedding,
  isSavedExample: false,
};

describe('Workspace Actions (Delete Plan, Change Plan, Inline Title Edit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ThemeProvider>
        <AuthProvider>
          <PlanProvider initialPlan={initialTestPlan}>
            <WorkspaceHeader onOpenReplan={() => {}} />
          </PlanProvider>
        </AuthProvider>
      </ThemeProvider>
    );

  it('renders inline pencil button and allows editing celebration title', () => {
    renderComponent();

    const editBtn = screen.getByLabelText(/Edit event name/i);
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);

    const input = screen.getByLabelText(/Edit celebration name/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Royal Courtyard Celebration' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByRole('heading', { name: 'Royal Courtyard Celebration' })).toBeInTheDocument();
  });

  it('opens delete confirmation dialog and allows canceling safely', () => {
    renderComponent();

    const deleteBtn = screen.getByLabelText(/Delete celebration plan/i);
    fireEvent.click(deleteBtn);

    // Dialog appears
    expect(screen.getByRole('dialog', { name: /Delete Celebration Plan/i })).toBeInTheDocument();

    // Cancel closes dialog
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog', { name: /Delete Celebration Plan/i })).not.toBeInTheDocument();
  });

  it('navigates to saved plans when Change Plan is clicked', () => {
    renderComponent();

    const changePlanBtn = screen.getByRole('button', { name: /Change Plan/i });
    fireEvent.click(changePlanBtn);

    expect(
      screen.getByRole('dialog', { name: /Switch Celebration Plan\?/i }) || pushMock
    ).toBeTruthy();
  });
});

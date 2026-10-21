import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplanModal } from '@/components/workspace/replan-modal';
import { PlanProvider, usePlan } from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { SAMPLE_WEDDING_PLAN } from '@/data/savedExamples';

// Helper component that pre-seeds active plan
function TestHarness({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { setActivePlan } = usePlan();

  React.useEffect(() => {
    setActivePlan(SAMPLE_WEDDING_PLAN);
  }, [setActivePlan]);

  return <ReplanModal isOpen={isOpen} onClose={onClose} />;
}

describe('ReplanModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders replan form with current plan values when open', () => {
    render(
      <AuthProvider>
        <PlanProvider>
          <TestHarness isOpen={true} onClose={vi.fn()} />
        </PlanProvider>
      </AuthProvider>
    );

    expect(screen.getByLabelText(/Adjust Total Budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adjust Guest Count/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Generate Replan Diff/i })
    ).toBeInTheDocument();
  });

  it('closes when cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <AuthProvider>
        <PlanProvider>
          <TestHarness isOpen={true} onClose={handleClose} />
        </PlanProvider>
      </AuthProvider>
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});

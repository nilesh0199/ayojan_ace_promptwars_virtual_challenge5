import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AiLoader } from '@/components/ai-loader';

expect.extend(toHaveNoViolations);

describe('AiLoader Component', () => {
  it('renders with stable accessible announcement and default status message', () => {
    render(<AiLoader />);

    // Screen reader announcement should exist and have role="status"
    const srStatus = screen.getByRole('status');
    expect(srStatus).toBeInTheDocument();
    expect(srStatus).toHaveTextContent(/Working on your request, please wait/i);

    // Initial visual cycling message
    expect(screen.getByText('Gathering cultural nuances...')).toBeInTheDocument();
  });

  it('cycles through messages every ~2.5 seconds', () => {
    vi.useFakeTimers();
    try {
      const customMessages = ['Step 1: Analyzing...', 'Step 2: Calculating...', 'Step 3: Finalizing...'];
      render(<AiLoader messages={customMessages} />);

      expect(screen.getByText('Step 1: Analyzing...')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.getByText('Step 2: Calculating...')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.getByText('Step 3: Finalizing...')).toBeInTheDocument();

      // Loops back to first
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.getByText('Step 1: Analyzing...')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('displays extended patience notice after 10 seconds of processing', () => {
    vi.useFakeTimers();
    try {
      render(<AiLoader />);

      expect(screen.queryByTestId('patience-notice')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByTestId('patience-notice')).toBeInTheDocument();
      expect(screen.getByText(/Crafting a comprehensive plan can take a moment/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('invokes onCancel callback when Cancel button is clicked', () => {
    const onCancelMock = vi.fn();
    render(<AiLoader onCancel={onCancelMock} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel generation/i });
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations (jest-axe)', async () => {
    const { container } = render(<AiLoader onCancel={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

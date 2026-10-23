import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PrintModal } from '@/components/workspace/print-modal';
import { FullEventReport } from '@/components/workspace/full-event-report';
import { SAVED_EXAMPLES } from '@/data/savedExamples';
import { RiskRegister } from '@/lib/schemas';

expect.extend(toHaveNoViolations);

describe('Print / PDF Export & Dedicated Report', () => {
  const originalPrint = window.print;

  beforeEach(() => {
    window.print = vi.fn();
    document.body.removeAttribute('data-print-scope');
  });

  afterEach(() => {
    window.print = originalPrint;
    document.body.removeAttribute('data-print-scope');
  });

  describe('PrintModal Accessibility and Scope Selection', () => {
    it('has no accessibility violations (jest-axe)', async () => {
      const { container } = render(
        <PrintModal
          isOpen={true}
          onClose={vi.fn()}
          activeTabName="Budget"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('defaults to "full" event report scope and executes print with data-print-scope="full"', async () => {
      const onClose = vi.fn();
      render(
        <PrintModal
          isOpen={true}
          onClose={onClose}
          activeTabName="Budget"
        />
      );

      const fullRadio = screen.getByLabelText(/Full Event Report/i) as HTMLInputElement;
      expect(fullRadio.checked).toBe(true);

      const printButton = screen.getByRole('button', { name: /Open Print Dialog/i });
      fireEvent.click(printButton);

      expect(document.body.getAttribute('data-print-scope')).toBe('full');
      expect(onClose).toHaveBeenCalled();

      // Dispatch afterprint event to verify attribute cleanup
      window.dispatchEvent(new Event('afterprint'));
      expect(document.body.getAttribute('data-print-scope')).toBeNull();
    });

    it('allows selecting "tab" scope and sets data-print-scope="tab"', async () => {
      const onClose = vi.fn();
      render(
        <PrintModal
          isOpen={true}
          onClose={onClose}
          activeTabName="Vendors"
        />
      );

      const tabRadio = screen.getByLabelText(/Current Tab Only/i);
      fireEvent.click(tabRadio);

      const printButton = screen.getByRole('button', { name: /Open Print Dialog/i });
      fireEvent.click(printButton);

      expect(document.body.getAttribute('data-print-scope')).toBe('tab');

      window.dispatchEvent(new Event('afterprint'));
      expect(document.body.getAttribute('data-print-scope')).toBeNull();
    });

    it('closes dialog on Escape key press', () => {
      const onClose = vi.fn();
      render(
        <PrintModal
          isOpen={true}
          onClose={onClose}
          activeTabName="Budget"
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('FullEventReport Content Verification', () => {
    const mockRisks: RiskRegister = {
      risks: [
        {
          id: 'risk-1',
          category: 'Weather & Season',
          severity: 'High',
          potentialIssue: 'Monsoon sudden rainfall',
          rootCause: 'Open lawn venue selected during monsoon transition period',
          mitigationTask: 'Prepare waterproof German hangar tent structure on secondary lawn.',
        },
      ],
      assessedAt: '2026-10-23T10:00:00.000Z',
    };

    it('renders all required sections: summary, budget ledger, full timeline, vendors, ideas, and risks', () => {
      const plan = SAVED_EXAMPLES.wedding;
      const { container } = render(<FullEventReport plan={plan} risks={mockRisks} />);

      // 1. Header & Summary
      expect(screen.getByText(/Celebration & Event Master Report/i)).toBeDefined();
      expect(screen.getByText(plan.title)).toBeDefined();
      expect(screen.getByText(/Generated on:/i)).toBeDefined();
      expect(screen.getByText(/Plan Version:/i)).toBeDefined();

      // 2. Comprehensive Budget Ledger
      expect(screen.getByText(/1. Comprehensive Budget & Financial Ledger/i)).toBeDefined();
      expect(screen.getByText(/Categories Target Subtotal:/i)).toBeDefined();
      expect(screen.getByText(/Contingency Reserve/i)).toBeDefined();
      expect(screen.getByText(/Taxes & Service Charges/i)).toBeDefined();
      expect(screen.getByText(/Stated Budget Assumptions:/i)).toBeDefined();

      // 3. Master Timeline
      expect(
        screen.getByText(/2. Master Action Timeline & Guest Communication Milestones/i)
      ).toBeDefined();
      expect(screen.getAllByText(/Task Milestone/i).length).toBeGreaterThanOrEqual(1);

      // 4. Vendors Checklist
      expect(
        screen.getByText(/3. Verified Vendor Category Checklist & Interview Questions/i)
      ).toBeDefined();
      expect(screen.getAllByText(/Screening Questions to Ask:/i).length).toBeGreaterThanOrEqual(1);

      // 5. Personalized Ideas
      expect(
        screen.getByText(/4. Personalized Creative Ideas & Cultural Notes/i)
      ).toBeDefined();
      expect(screen.getByText(/Themes & Ambiance:/i)).toBeDefined();
      expect(screen.getByText(/Culinary & Dietary Notes:/i)).toBeDefined();

      // 6. Operational Risk Register
      expect(
        screen.getByText(/5. Operational Safeguards & Risk Register/i)
      ).toBeDefined();
      expect(screen.getByText('Monsoon sudden rainfall')).toBeDefined();
      expect(screen.getByText('[High]')).toBeDefined();

      // 7. Footer
      expect(screen.getByText(/Planning Disclaimer:/i)).toBeDefined();
      expect(screen.getByText(new RegExp(plan.id, 'i'))).toBeDefined();
    });
  });
});

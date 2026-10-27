import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TimePicker12h } from '@/components/time-picker-12h';

expect.extend(toHaveNoViolations);

describe('TimePicker12h Component', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  const renderPicker = (value = '', label?: string) => {
    return render(
      <TimePicker12h value={value} onChange={onChange} label={label} />
    );
  };

  describe('Empty / Initial State', () => {
    it('renders hour, minute selects and AM/PM toggle in empty state', () => {
      renderPicker();

      expect(screen.getByRole('combobox', { name: /Hour/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /Minute/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /AM/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PM/i })).toBeInTheDocument();
    });

    it('renders default legend with new inclusive label', () => {
      renderPicker();

      expect(
        screen.getByText('Ceremony / muhurat time (as advised by your priest, pandit, imam or pastor)')
      ).toBeInTheDocument();
    });

    it('shows "No ritual time selected" preview when empty', () => {
      renderPicker();

      const preview = screen.getByTestId('time-picker-preview');
      expect(preview.textContent).toContain('No ritual time selected');
    });

    it('does not show Clear button when empty', () => {
      renderPicker();

      expect(screen.queryByRole('button', { name: /Clear time/i })).not.toBeInTheDocument();
    });
  });

  describe('Selecting a Time', () => {
    it('calls onChange with "01:00" when hour 1 is selected from empty state', () => {
      renderPicker();

      fireEvent.change(screen.getByRole('combobox', { name: /Hour/i }), {
        target: { value: '1' },
      });

      expect(onChange).toHaveBeenCalledWith('01:00');
    });

    it('calls onChange with "00:30" when value is "00:00" and minute changed to 30', () => {
      renderPicker('00:00');

      fireEvent.change(screen.getByRole('combobox', { name: /Minute/i }), {
        target: { value: '30' },
      });

      expect(onChange).toHaveBeenCalledWith('00:30');
    });

    it('toggles AM/PM and calls onChange with updated 24h value', () => {
      renderPicker('10:30'); // 10:30 AM

      fireEvent.click(screen.getByRole('button', { name: /PM/i }));

      expect(onChange).toHaveBeenCalledWith('22:30');
    });
  });

  describe('Displaying Existing Value', () => {
    it('shows "Selected: 10:30 AM" preview for value "10:30"', () => {
      renderPicker('10:30');

      const preview = screen.getByTestId('time-picker-preview');
      expect(preview.textContent).toContain('Selected: 10:30 AM');
    });

    it('shows "Selected: 12:00 AM" preview for value "00:00"', () => {
      renderPicker('00:00');

      const preview = screen.getByTestId('time-picker-preview');
      expect(preview.textContent).toContain('Selected: 12:00 AM');
    });

    it('shows "Selected: 12:00 PM" preview for value "12:00"', () => {
      renderPicker('12:00');

      const preview = screen.getByTestId('time-picker-preview');
      expect(preview.textContent).toContain('Selected: 12:00 PM');
    });

    it('shows "Selected: 11:45 PM" preview for value "23:45"', () => {
      renderPicker('23:45');

      const preview = screen.getByTestId('time-picker-preview');
      expect(preview.textContent).toContain('Selected: 11:45 PM');
    });

    it('shows Clear button when value is set', () => {
      renderPicker('10:30');

      expect(screen.getByRole('button', { name: /Clear time/i })).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('calls onChange with empty string and hides Clear button', () => {
      renderPicker('14:00');

      fireEvent.click(screen.getByRole('button', { name: /Clear time/i }));

      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('AM/PM Toggle Aria', () => {
    it('has aria-pressed="true" on AM when period is AM', () => {
      renderPicker('10:30');

      expect(screen.getByRole('button', { name: /AM/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /PM/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('has aria-pressed="true" on PM when period is PM', () => {
      renderPicker('14:30');

      expect(screen.getByRole('button', { name: /PM/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /AM/i })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Keyboard Navigation', () => {
    it('hour select is focusable and navigable by keyboard', () => {
      renderPicker();

      const hourSelect = screen.getByRole('combobox', { name: /Hour/i });
      hourSelect.focus();
      expect(document.activeElement).toBe(hourSelect);
    });

    it('minute select is focusable and navigable by keyboard', () => {
      renderPicker();

      const minuteSelect = screen.getByRole('combobox', { name: /Minute/i });
      minuteSelect.focus();
      expect(document.activeElement).toBe(minuteSelect);
    });

    it('AM/PM buttons are focusable by keyboard', () => {
      renderPicker();

      const amBtn = screen.getByRole('button', { name: /AM/i });
      amBtn.focus();
      expect(document.activeElement).toBe(amBtn);
    });
  });

  describe('Live Preview Region', () => {
    it('has aria-live="polite" and aria-atomic="true"', () => {
      renderPicker();

      const preview = screen.getByTestId('time-picker-preview');
      expect(preview).toHaveAttribute('aria-live', 'polite');
      expect(preview).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Accessibility (jest-axe)', () => {
    it('has no accessibility violations in Light theme', async () => {
      const { container } = renderPicker('10:30');
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in Dark theme', async () => {
      const { container } = render(
        <div data-theme="dark" className="dark">
          <TimePicker12h value="14:00" onChange={onChange} />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in empty state', async () => {
      const { container } = renderPicker();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

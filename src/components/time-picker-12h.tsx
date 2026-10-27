'use client';

import React, { useId, useState, useEffect } from 'react';
import { parse24hTo12h, format12hTo24h, formatTime12h, AmPm } from '@/lib/time';
import { X, Clock } from 'lucide-react';

export interface TimePicker12hProps {
  id?: string;
  value?: string; // 24-hour format "HH:mm" or ""
  onChange: (value24: string) => void;
  label?: string;
  legendClassName?: string;
  className?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/**
 * Reusable 12-hour AM/PM Time Picker component.
 * - Stores data strictly in 24-hour "HH:mm" format.
 * - Native <select> for Hour (1-12) and Minute (00-59) to trigger mobile native wheel pickers.
 * - Real button segmented toggle for AM/PM with aria-pressed semantics.
 * - 44px minimum touch targets and visible focus rings.
 * - Fully responsive, works smoothly down to 320px screen width without overlapping.
 * - Live polite preview for assistive tech.
 */
export function TimePicker12h({
  id: externalId,
  value = '',
  onChange,
  label = 'Ceremony / muhurat time (as advised by your priest, pandit, imam or pastor)',
  legendClassName = 'block text-sm font-medium text-ink mb-1.5',
  className = '',
  disabled = false,
}: TimePicker12hProps) {
  const generatedId = useId();
  const baseId = externalId || `time-picker-${generatedId.replace(/:/g, '')}`;

  const parts = parse24hTo12h(value);

  // Local draft defaults for minute and period when hour is chosen from empty
  const [draftMinute, setDraftMinute] = useState<string>('00');
  const [draftPeriod, setDraftPeriod] = useState<AmPm>('AM');

  useEffect(() => {
    if (parts) {
      setDraftMinute(parts.minute);
      setDraftPeriod(parts.period);
    } else {
      setDraftMinute('00');
      setDraftPeriod('AM');
    }
  }, [value, parts]);

  const currentHour = parts ? parts.hour : '';
  const currentMinute = parts ? parts.minute : '';
  const currentPeriod = parts ? parts.period : draftPeriod;

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    if (!newHour) {
      onChange('');
      return;
    }

    // When an hour is chosen from empty, minute defaults to 00 and period defaults to AM
    const minuteToUse = currentMinute || draftMinute || '00';
    const periodToUse = parts ? parts.period : draftPeriod || 'AM';

    const time24 = format12hTo24h(newHour, minuteToUse, periodToUse);
    onChange(time24);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setDraftMinute(newMinute);

    if (currentHour) {
      const time24 = format12hTo24h(currentHour, newMinute || '00', currentPeriod);
      onChange(time24);
    }
  };

  const handlePeriodChange = (newPeriod: AmPm) => {
    setDraftPeriod(newPeriod);

    if (currentHour) {
      const time24 = format12hTo24h(currentHour, currentMinute || '00', newPeriod);
      onChange(time24);
    }
  };

  const handleClear = () => {
    onChange('');
    setDraftMinute('00');
    setDraftPeriod('AM');
  };

  const previewText = value ? `Selected: ${formatTime12h(value)}` : 'No ritual time selected';

  return (
    <fieldset
      id={baseId}
      role="group"
      aria-label={label}
      aria-labelledby={`${baseId}-legend`}
      className={`border-0 p-0 m-0 ${className}`}
    >
      {label && (
        <legend id={`${baseId}-legend`} className={legendClassName}>
          {label}
        </legend>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Hour Select */}
        <div className="relative min-w-[76px] flex-1 sm:flex-initial">
          <label htmlFor={`${baseId}-hour`} className="sr-only">
            Hour
          </label>
          <select
            id={`${baseId}-hour`}
            name={`${baseId}-hour`}
            value={currentHour}
            disabled={disabled}
            onChange={handleHourChange}
            aria-label="Hour (1 to 12)"
            className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink font-medium transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Hour</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <span className="text-ink-muted font-bold text-sm select-none" aria-hidden="true">
          :
        </span>

        {/* Minute Select */}
        <div className="relative min-w-[76px] flex-1 sm:flex-initial">
          <label htmlFor={`${baseId}-minute`} className="sr-only">
            Minute
          </label>
          <select
            id={`${baseId}-minute`}
            name={`${baseId}-minute`}
            value={currentMinute}
            disabled={disabled}
            onChange={handleMinuteChange}
            aria-label="Minute (00 to 59)"
            className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink font-medium transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Min</option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* AM / PM Segmented Toggle */}
        <div
          role="group"
          aria-label="Time period AM or PM"
          className="inline-flex rounded-lg border border-rule bg-paper-subtle p-0.5 shrink-0"
        >
          <button
            type="button"
            id={`${baseId}-am`}
            disabled={disabled}
            aria-pressed={currentPeriod === 'AM'}
            onClick={() => handlePeriodChange('AM')}
            className={`min-h-[40px] min-w-[44px] px-3 py-1.5 rounded-md text-xs font-bold transition-all focus:ring-2 focus:ring-accent focus:outline-hidden ${
              currentPeriod === 'AM'
                ? 'bg-accent text-accent-text shadow-xs'
                : 'text-ink-muted hover:text-ink'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            AM
          </button>
          <button
            type="button"
            id={`${baseId}-pm`}
            disabled={disabled}
            aria-pressed={currentPeriod === 'PM'}
            onClick={() => handlePeriodChange('PM')}
            className={`min-h-[40px] min-w-[44px] px-3 py-1.5 rounded-md text-xs font-bold transition-all focus:ring-2 focus:ring-accent focus:outline-hidden ${
              currentPeriod === 'PM'
                ? 'bg-accent text-accent-text shadow-xs'
                : 'text-ink-muted hover:text-ink'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            PM
          </button>
        </div>

        {/* Clear Button */}
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear time"
            className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg border border-rule bg-paper hover:bg-paper-subtle text-ink-muted hover:text-state-error text-xs font-medium transition-colors focus:ring-2 focus:ring-accent focus:outline-hidden shrink-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        ) : null}
      </div>

      {/* Live Preview in polite live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="time-picker-preview"
        className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted"
      >
        <Clock className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />
        <span className={value ? 'font-medium text-ink' : 'italic'}>{previewText}</span>
      </div>
    </fieldset>
  );
}

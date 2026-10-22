'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EVENT_TYPES,
  EVENT_PRESETS,
  SUPPORTED_CURRENCIES,
  CurrencyCode,
  EventType,
  PLANNER_DISCLAIMER,
} from '@/lib/constants';
import { intakeFormSchema } from '@/lib/schemas';
import { getFriendlyAiError } from '@/lib/gemini';
import { usePlan } from './plan-context';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Info,
  HelpCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export function IntakeForm() {
  const router = useRouter();
  const {
    startPlanGeneration,
    loadSavedExample,
    isLoading,
    error,
    errorCode,
    retryLastAction,
    followUp,
    submitFollowUp,
    skipFollowUp,
  } = usePlan();

  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [city, setCity] = useState('Jaipur');
  const [date, setDate] = useState(() => {
    // Default to ~4 months in future
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  });
  const [guestCount, setGuestCount] = useState<number | string>(300);
  const [totalBudget, setTotalBudget] = useState<number | string>(2000000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [styleCulture, setStyleCulture] = useState(
    'Traditional Royal Rajasthani with Mehendi and Sangeet'
  );
  const [nonNegotiables, setNonNegotiables] = useState(
    'Strict Jain catering counter with separate kitchen, live Shehnai, venue with open lawn'
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  const applyPreset = (presetId: string) => {
    const preset = EVENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setEventType(preset.eventType);
    setCity(preset.defaultCity);
    setGuestCount(preset.suggestedGuests);
    setTotalBudget(preset.suggestedBudget);
    setStyleCulture(preset.styleCulture);
    setNonNegotiables(preset.nonNegotiables);
    setFormErrors({});
  };

  const handleQuickLoad = (key: string) => {
    loadSavedExample(key);
    router.push('/workspace');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const rawData = {
      eventType,
      city,
      date,
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      styleCulture,
      nonNegotiables,
    };

    const validation = intakeFormSchema.safeParse(rawData);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0]) {
          errMap[issue.path[0].toString()] = issue.message;
        }
      }
      setFormErrors(errMap);
      return;
    }

    await startPlanGeneration(validation.data);
    router.push('/workspace');
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpAnswer.trim()) return;
    await submitFollowUp(followUpAnswer.trim());
    setFollowUpAnswer('');
    router.push('/workspace');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Live region for accessibility announcements */}
      <div aria-live="polite" className="sr-only">
        {isLoading && 'Building celebration plan using Google Gemini AI...'}
        {error && `Error: ${error}`}
        {followUp && `Clarification question: ${followUp.questionText}`}
      </div>

      {/* Hero Header */}
      <div className="text-center md:text-left mb-8 pb-6 border-b border-rule">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>PromptWars Challenge 5 · Celebration Planner</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight">
          Create Your Celebration Plan
        </h1>
        <p className="mt-2 font-serif text-lg sm:text-xl font-medium text-accent">
          Your celebration, perfectly planned.
        </p>
        <p className="mt-2 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl">
          Tell Aayojan Ace your celebration, budget, city and culture. It crafts a realistic budget, phased timeline, and verified vendor discovery checklists. Change the budget, date or guest list and your plan updates itself.
        </p>

        {/* Saved Examples Direct Jump */}
        <div className="mt-6 p-4 rounded-xl border border-rule bg-paper-card/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-ink-muted">
            <BookOpen className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
            <span>
              <strong>Zero-latency demo:</strong> Load curated plans without calling AI:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickLoad('wedding')}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-rule bg-paper-subtle hover:bg-paper-card hover:border-accent transition-colors"
            >
              Wedding Example
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoad('birthday')}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-rule bg-paper-subtle hover:bg-paper-card hover:border-accent transition-colors"
            >
              Birthday Example
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoad('community')}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-rule bg-paper-subtle hover:bg-paper-card hover:border-accent transition-colors"
            >
              Community Event Example
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner with Retry and Saved Example */}
      {error && (
        <div
          role="alert"
          className="mb-8 rounded-xl border border-state-error bg-state-error-subtle p-4 text-state-error"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="font-serif font-bold text-base">
                {getFriendlyAiError(errorCode).title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed">{error}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (retryLastAction) {
                      retryLastAction();
                    } else {
                      handleSubmit(new Event('submit') as unknown as React.FormEvent);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
                  aria-label="Retry celebration planning"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLoad('wedding')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-paper-card text-ink border border-rule hover:bg-paper-subtle transition-colors"
                  aria-label="Load pre-built saved example celebration plan"
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Load saved example
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adaptive Follow-up Question Card */}
      {followUp && (
        <div
          role="region"
          aria-labelledby="followup-title"
          className="mb-8 rounded-2xl border-2 border-accent bg-accent-subtle/50 p-6 shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <HelpCircle className="h-6 w-6 text-accent shrink-0 mt-1" aria-hidden="true" />
            <div className="flex-1">
              <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider block">
                Aayojan Ace Clarification Check
              </span>
              <h2 id="followup-title" className="font-serif text-xl font-bold text-ink mt-1">
                {followUp.questionText}
              </h2>
              {followUp.reason && (
                <p className="text-xs text-ink-muted mt-1 italic">
                  Why we ask: {followUp.reason}
                </p>
              )}

              <form onSubmit={handleFollowUpSubmit} className="mt-4 flex flex-col gap-3">
                <div>
                  <label htmlFor="followup-input" className="sr-only">
                    Your clarification answer
                  </label>
                  <input
                    id="followup-input"
                    type="text"
                    value={followUpAnswer}
                    onChange={(e) => setFollowUpAnswer(e.target.value)}
                    placeholder="Enter your clarification..."
                    className="w-full min-h-[44px] rounded-lg border border-rule bg-paper-card px-4 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoading || !followUpAnswer.trim()}
                    className="min-h-[44px] px-5 py-2 rounded-lg bg-accent text-accent-text font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving Clarification...' : 'Submit & Build Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={skipFollowUp}
                    disabled={isLoading}
                    className="min-h-[44px] px-4 py-2 rounded-lg border border-rule text-sm text-ink-muted hover:bg-paper-card transition-colors"
                  >
                    Skip &amp; Proceed with Best Assumptions
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preset Pickers */}
      <div className="mb-6">
        <label className="block text-xs font-mono text-ink-muted uppercase tracking-wider mb-2">
          Start from an editable preset
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EVENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="text-left p-3 rounded-xl border border-rule bg-paper-card hover:border-accent hover:bg-paper-subtle transition-all group min-h-[44px]"
            >
              <span className="font-serif font-bold text-sm text-ink block group-hover:text-accent">
                {preset.title}
              </span>
              <span className="text-[11px] text-ink-faint block mt-0.5">
                {preset.defaultCity} · {preset.suggestedGuests} guests
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Minimal Intake Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Event Type */}
          <div>
            <label
              htmlFor="event-type"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Event Type <span className="text-state-error">*</span>
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              aria-describedby={formErrors.eventType ? 'event-type-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {formErrors.eventType && (
              <p id="event-type-err" className="mt-1 text-xs text-state-error">
                {formErrors.eventType}
              </p>
            )}
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-ink mb-1.5">
              City / Location <span className="text-state-error">*</span>
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jaipur, Bengaluru, Delhi"
              aria-describedby={formErrors.city ? 'city-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.city && (
              <p id="city-err" className="mt-1 text-xs text-state-error">
                {formErrors.city}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-ink mb-1.5">
              Event Date <span className="text-state-error">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-describedby={formErrors.date ? 'date-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.date && (
              <p id="date-err" className="mt-1 text-xs text-state-error">
                {formErrors.date}
              </p>
            )}
          </div>

          {/* Guest Count */}
          <div>
            <label
              htmlFor="guest-count"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Guest Count <span className="text-state-error">*</span>
            </label>
            <input
              id="guest-count"
              type="number"
              min={2}
              max={50000}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              aria-describedby={formErrors.guestCount ? 'guest-count-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.guestCount && (
              <p id="guest-count-err" className="mt-1 text-xs text-state-error">
                {formErrors.guestCount}
              </p>
            )}
          </div>

          {/* Total Budget */}
          <div>
            <label
              htmlFor="total-budget"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Total Budget <span className="text-state-error">*</span>
            </label>
            <div className="flex gap-2">
              <select
                id="currency-select"
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-24 shrink-0 min-h-[44px] rounded-lg border border-rule bg-paper px-2 py-2 text-sm text-ink focus:border-accent focus:outline-hidden font-mono"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
              <input
                id="total-budget"
                type="number"
                min={100}
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="Budget amount"
                aria-describedby={formErrors.totalBudget ? 'total-budget-err' : undefined}
                className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
              />
            </div>
            {formErrors.totalBudget && (
              <p id="total-budget-err" className="mt-1 text-xs text-state-error">
                {formErrors.totalBudget}
              </p>
            )}
          </div>

          {/* Style / Culture */}
          <div className="sm:col-span-2">
            <label
              htmlFor="style-culture"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Style, Theme &amp; Culture <span className="text-state-error">*</span>
            </label>
            <input
              id="style-culture"
              type="text"
              value={styleCulture}
              onChange={(e) => setStyleCulture(e.target.value)}
              placeholder="e.g. Royal Rajasthani with Mehendi, Boho garden, Coastal South Indian"
              aria-describedby={formErrors.styleCulture ? 'style-culture-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.styleCulture && (
              <p id="style-culture-err" className="mt-1 text-xs text-state-error">
                {formErrors.styleCulture}
              </p>
            )}
          </div>

          {/* Non-negotiables */}
          <div className="sm:col-span-2">
            <label
              htmlFor="non-negotiables"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Non-Negotiables &amp; Specific Constraints
            </label>
            <textarea
              id="non-negotiables"
              rows={3}
              value={nonNegotiables}
              onChange={(e) => setNonNegotiables(e.target.value)}
              placeholder="e.g. Dedicated Jain catering kitchen, outdoor lawn, wheelchair accessible ramps, 10 PM sound cutoff"
              aria-describedby={formErrors.nonNegotiables ? 'non-negotiables-err' : undefined}
              className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.nonNegotiables && (
              <p id="non-negotiables-err" className="mt-1 text-xs text-state-error">
                {formErrors.nonNegotiables}
              </p>
            )}
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="mt-6 flex items-start gap-2.5 p-3 rounded-lg bg-paper-subtle text-ink-muted text-xs leading-relaxed border border-rule">
          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p>{PLANNER_DISCLAIMER}</p>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-rule">
          <span className="text-xs text-ink-faint">
            Generates realistic budget ledger, timeline track, and vendor checklist
          </span>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-accent text-accent-text font-serif font-bold text-base hover:bg-accent-hover transition-all shadow-sm flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Designing Plan with Gemini...</span>
              </>
            ) : (
              <>
                <span>Generate Celebration Plan</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

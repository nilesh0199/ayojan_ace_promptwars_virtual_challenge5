'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  EVENT_TYPES,
  EVENT_PRESETS,
  SUPPORTED_CURRENCIES,
  CurrencyCode,
  EventType,
  PLANNER_DISCLAIMER,
  POPULAR_INDIAN_CITIES,
  QUICK_GUEST_PICKS,
  QUICK_BUDGET_PICKS,
  STYLE_CULTURE_CHIPS,
  NON_NEGOTIABLE_CHIPS,
  EVENT_NAME_EXAMPLES,
} from '@/lib/constants';
import { intakeFormSchema } from '@/lib/schemas';
import {
  findMatchingPreset,
  getPreparedPlan,
  PREPARED_PLAN_DELAY_MS,
  PREPARED_PLAN_REDUCED_MOTION_DELAY_MS,
  PREPARED_PLAN_LOADING_MESSAGES,
} from '@/data/preparedPlans';
import { getFriendlyAiError } from '@/lib/gemini';
import { usePlan } from './plan-context';
import { AiLoader } from './ai-loader';
import { TimePicker12h } from './time-picker-12h';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Info,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Plus,
  X,
  Check,
  Loader2,
} from 'lucide-react';

export function IntakeForm() {
  const router = useRouter();
  const {
    startPlanGeneration,
    loadSavedExample,
    loadPreparedPlan,
    isLoading,
    error,
    errorCode,
    retryLastAction,
    followUp,
    submitFollowUp,
    skipFollowUp,
    cancelGeneration,
  } = usePlan();

  const [isOpeningPreparedPlan, setIsOpeningPreparedPlan] = useState(false);
  const preparedPlanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (preparedPlanTimeoutRef.current) {
        clearTimeout(preparedPlanTimeoutRef.current);
      }
    };
  }, []);

  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [eventName, setEventName] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [date, setDate] = useState(() => {
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

  // Muhurat fields
  const [muhuratTime, setMuhuratTime] = useState('');
  const [muhuratLabel, setMuhuratLabel] = useState('');
  const [showMuhuratCustom, setShowMuhuratCustom] = useState(false);

  // Accessible live announcements for chips
  const [chipAnnouncement, setChipAnnouncement] = useState('');

  // AI Name Suggestion state
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [isFetchingNames, setIsFetchingNames] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formErrorAlert, setFormErrorAlert] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  // Ref for the error alert — auto-scroll and focus on generation or validation failure
  const errorAlertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((error || formErrorAlert) && errorAlertRef.current) {
      errorAlertRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      errorAlertRef.current.focus?.({ preventScroll: true });
    }
  }, [error, formErrorAlert]);

  // Ref for the loader container — auto-scroll to top when generation starts so user sees the animated loader
  const loaderContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isLoading && !followUp) {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      loaderContainerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [isLoading, followUp]);

  // Whether muhurat fields should display by default
  const isMuhuratDefault =
    eventType === 'Wedding' ||
    styleCulture.toLowerCase().includes('pooja') ||
    styleCulture.toLowerCase().includes('diwali') ||
    styleCulture.toLowerCase().includes('festival') ||
    styleCulture.toLowerCase().includes('griha pravesh');

  const shouldShowMuhurat = isMuhuratDefault || showMuhuratCustom || Boolean(muhuratTime);

  const handleCancelPreparedPlan = () => {
    if (preparedPlanTimeoutRef.current) {
      clearTimeout(preparedPlanTimeoutRef.current);
      preparedPlanTimeoutRef.current = null;
    }
    setIsOpeningPreparedPlan(false);
  };

  const startPreparedPlanFlow = (presetIdOrKey: string, userDate?: string, customEventName?: string) => {
    if (isLoading || isOpeningPreparedPlan) return;
    setIsOpeningPreparedPlan(true);
    setFormErrors({});
    setFormErrorAlert(null);

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loaderContainerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delayMs = prefersReducedMotion
      ? PREPARED_PLAN_REDUCED_MOTION_DELAY_MS
      : PREPARED_PLAN_DELAY_MS;

    preparedPlanTimeoutRef.current = setTimeout(() => {
      const prepared = getPreparedPlan(presetIdOrKey, userDate, undefined, customEventName);
      if (prepared) {
        loadPreparedPlan(prepared.plan, prepared.risks);
      }
      setIsOpeningPreparedPlan(false);
      router.push('/workspace');
    }, delayMs);
  };

  const applyPreset = (presetId: string) => {
    const preset = EVENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setEventType(preset.eventType);
    setCity(preset.defaultCity);
    setGuestCount(preset.suggestedGuests);
    setTotalBudget(preset.suggestedBudget);
    setStyleCulture(preset.styleCulture);
    setNonNegotiables(preset.nonNegotiables);
    // Keep user's custom event name if already typed, or start clean
    if (!eventName.trim()) {
      setEventName('');
    }
    setMuhuratTime('');
    setMuhuratLabel('');
    setCurrency('INR');
    setFormErrors({});
    setFormErrorAlert(null);
    setChipAnnouncement(`Loaded ${preset.title} preset`);
  };

  const handleQuickLoad = (key: string) => {
    startPreparedPlanFlow(key, date || undefined, eventName.trim() || undefined);
  };

  // Chip Pick Handlers
  const handlePickName = (name: string) => {
    setEventName(name);
    setChipAnnouncement(`Selected event name: ${name}`);
  };

  const handlePickCity = (cityName: string) => {
    setCity(cityName);
    setChipAnnouncement(`Selected city: ${cityName}`);
  };

  const handlePickGuests = (count: number) => {
    setGuestCount(count);
    setChipAnnouncement(`Selected guest count: ${count}`);
  };

  const handlePickBudget = (val: number, label: string) => {
    setTotalBudget(val);
    setChipAnnouncement(`Selected budget: ${label}`);
  };

  const handleAppendStyle = (chip: string) => {
    const existing = styleCulture
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (existing.includes(chip.toLowerCase())) {
      setChipAnnouncement(`"${chip}" is already added to style`);
      return;
    }
    const updated = styleCulture.trim() ? `${styleCulture.trim()}, ${chip}` : chip;
    setStyleCulture(updated);
    setChipAnnouncement(`Added "${chip}" to style & culture`);
  };

  const handleAppendNonNegotiable = (chip: string) => {
    const existing = nonNegotiables
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (existing.includes(chip.toLowerCase())) {
      setChipAnnouncement(`"${chip}" is already added to non-negotiables`);
      return;
    }
    const updated = nonNegotiables.trim() ? `${nonNegotiables.trim()}, ${chip}` : chip;
    setNonNegotiables(updated);
    setChipAnnouncement(`Added "${chip}" to non-negotiables`);
  };

  // AI Name Suggestions Fetcher
  const handleOpenSuggestModal = async () => {
    setIsSuggestModalOpen(true);
    setIsFetchingNames(true);
    setSuggestedNames([]);

    try {
      const res = await fetch('/api/plan/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          city: city.trim() || 'Mumbai',
          styleCulture: styleCulture.trim() || 'Festive Celebration',
          guestCount: Number(guestCount) || 100,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestedNames(data.suggestions || []);
      }
    } catch {
      // Fallback to static examples
      setSuggestedNames(EVENT_NAME_EXAMPLES[eventType] || EVENT_NAME_EXAMPLES.Wedding);
    } finally {
      setIsFetchingNames(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setFormErrorAlert(null);

    const rawData = {
      eventName: eventName.trim() || undefined,
      eventType,
      city,
      date,
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      styleCulture,
      nonNegotiables,
      muhuratTime: muhuratTime.trim() || undefined,
      muhuratLabel: muhuratLabel.trim() || undefined,
    };

    const validation = intakeFormSchema.safeParse(rawData);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      const fieldLabels: Record<string, string> = {
        city: 'City',
        date: 'Event Date',
        guestCount: 'Guest Count',
        totalBudget: 'Total Budget',
        styleCulture: 'Celebration Style / Culture',
        eventType: 'Event Type',
        muhuratTime: 'Muhurat Time',
        nonNegotiables: 'Must-haves',
      };
      const invalidFields: string[] = [];
      for (const issue of validation.error.issues) {
        if (issue.path[0]) {
          const key = issue.path[0].toString();
          errMap[key] = issue.message;
          const label = fieldLabels[key] || key;
          if (!invalidFields.includes(label)) {
            invalidFields.push(label);
          }
        }
      }
      setFormErrors(errMap);
      setFormErrorAlert(
        `Please correct the required fields: ${invalidFields.join(', ')}. Review the highlighted inputs below to generate your plan.`
      );
      return;
    }

    // Check if every field still equals a preset's default values, ignoring the date and custom name
    const matchingPreset = findMatchingPreset(rawData);
    if (matchingPreset) {
      startPreparedPlanFlow(matchingPreset.id, rawData.date, rawData.eventName);
      return;
    }

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const success = await startPlanGeneration(validation.data);
    if (success) router.push('/workspace');
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpAnswer.trim()) return;
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const success = await submitFollowUp(followUpAnswer.trim());
    setFollowUpAnswer('');
    if (success) router.push('/workspace');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Live region for accessibility announcements and chip feedback */}
      <div aria-live="polite" className="sr-only">
        {chipAnnouncement}
        {isLoading && 'Building celebration plan using Google Gemini AI...'}
        {error && `Error: ${error}`}
        {followUp && `Clarification question: ${followUp.questionText}`}
      </div>

      {/* Hero Header */}
      <div className="text-center md:text-left mb-8 pb-6 border-b border-rule">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>AI Celebration &amp; Event Planner</span>
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
              disabled={isLoading || isOpeningPreparedPlan}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-rule bg-paper-subtle hover:bg-paper-card hover:border-accent transition-colors min-h-[36px] disabled:opacity-50"
            >
              Wedding Example
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoad('birthday')}
              disabled={isLoading || isOpeningPreparedPlan}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-rule bg-paper-subtle hover:bg-paper-card hover:border-accent transition-colors min-h-[36px] disabled:opacity-50"
            >
              Birthday Example
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoad('community')}
              disabled={isLoading || isOpeningPreparedPlan}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-rule bg-paper-subtle hover:bg-paper-card hover:border-accent transition-colors min-h-[36px] disabled:opacity-50"
            >
              Community Event Example
            </button>
          </div>
        </div>
      </div>

      {/* Form Validation Error Banner */}
      {formErrorAlert && (
        <div
          ref={errorAlertRef}
          role="alert"
          tabIndex={-1}
          className="mb-8 rounded-xl border border-state-error bg-state-error-subtle p-4 text-state-error focus:outline-2 focus:outline-state-error"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-serif font-bold text-base">
                Incomplete Celebration Details
              </h2>
              <p className="mt-1 text-sm leading-relaxed">{formErrorAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner with Retry and Saved Example */}
      {error && !formErrorAlert && (
        <div
          ref={errorAlertRef}
          role="alert"
          tabIndex={-1}
          className="mb-8 rounded-xl border border-state-error bg-state-error-subtle p-4 text-state-error focus:outline-2 focus:outline-state-error"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-serif font-bold text-base">
                {getFriendlyAiError(errorCode).title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed">{error}</p>
              <p className="mt-1.5 text-[11px] font-mono text-state-error/80 tracking-wide" data-testid="error-reference">
                Reference: {errorCode || 'AI_ERROR'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {errorCode === 'AI_QUOTA_EXHAUSTED' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleQuickLoad('wedding')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-accent text-accent-text hover:bg-accent-hover transition-colors min-h-[36px]"
                      aria-label="Load a prepared plan"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Load a prepared plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        if (retryLastAction) {
                          retryLastAction();
                        } else {
                          handleSubmit(new Event('submit') as unknown as React.FormEvent);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-paper-card text-ink border border-rule hover:bg-paper-subtle transition-colors min-h-[36px]"
                      aria-label="Retry later"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retry later
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        if (retryLastAction) {
                          retryLastAction();
                        } else {
                          handleSubmit(new Event('submit') as unknown as React.FormEvent);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-accent text-accent-text hover:bg-accent-hover transition-colors min-h-[36px]"
                      aria-label="Retry celebration planning"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLoad('wedding')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-paper-card text-ink border border-rule hover:bg-paper-subtle transition-colors min-h-[36px]"
                      aria-label="Load pre-built saved example celebration plan"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Load saved example
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prepared Plan Honest Rotating Loader */}
      {isOpeningPreparedPlan && (
        <div ref={loaderContainerRef} className="mb-8" data-testid="prepared-plan-loader">
          <AiLoader
            title="Opening Prepared Plan"
            messages={[...PREPARED_PLAN_LOADING_MESSAGES]}
            messageIntervalMs={900}
            onCancel={handleCancelPreparedPlan}
            cancelLabel="Cancel"
          />
        </div>
      )}

      {/* Reusable AiLoader when generating */}
      {isLoading && !followUp && !isOpeningPreparedPlan && (
        <div ref={loaderContainerRef} className="mb-8">
          <AiLoader onCancel={cancelGeneration} />
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
                    onClick={async () => {
                      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                      const success = await skipFollowUp();
                      if (success) router.push('/workspace');
                    }}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {EVENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              disabled={isLoading || isOpeningPreparedPlan}
              className="text-left p-3 rounded-xl border border-rule bg-paper-card hover:border-accent hover:bg-paper-subtle transition-all group min-h-[44px] disabled:opacity-50"
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
        <p className="text-xs text-ink-muted mt-2">
          Presets open a prepared plan. Change any detail and AI builds a fresh one.
        </p>
      </div>

      {/* Main Intake Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 1. Optional Celebration / Event Name */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="event-name" className="block text-sm font-medium text-ink">
                Celebration Name <span className="text-xs text-ink-faint font-normal">(Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleOpenSuggestModal}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Suggest names</span>
              </button>
            </div>
            <input
              id="event-name"
              type="text"
              maxLength={80}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Aarav & Diya’s Royal Pheras, Faizan & Ayesha’s Nikah, Joshua & Maria’s Nuptials"
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {/* Idea Chips for Event Name */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Name suggestions">
              <span className="text-[11px] text-ink-muted mr-1">Examples:</span>
              {(EVENT_NAME_EXAMPLES[eventType] || EVENT_NAME_EXAMPLES.Wedding).map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => handlePickName(sample)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-rule bg-paper-subtle hover:bg-paper hover:border-accent text-ink transition-colors min-h-[30px]"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Event Type */}
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

          {/* 3. City / Location with Popular Indian Cities Chips */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-ink mb-1.5">
              City / Location <span className="text-state-error">*</span>
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jaipur, Bengaluru, Delhi NCR"
              aria-describedby={formErrors.city ? 'city-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.city && (
              <p id="city-err" className="mt-1 text-xs text-state-error">
                {formErrors.city}
              </p>
            )}
            {/* Popular Cities Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="City suggestions">
              <span className="text-[11px] text-ink-muted mr-1">Popular:</span>
              {POPULAR_INDIAN_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePickCity(c)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors min-h-[28px] ${
                    city.toLowerCase() === c.toLowerCase()
                      ? 'border-accent bg-accent-subtle text-accent font-semibold'
                      : 'border-rule bg-paper-subtle hover:bg-paper hover:border-accent text-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Event Date */}
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

          {/* 5. Ceremony / Muhurat Time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="muhurat-time" className="block text-sm font-medium text-ink">
                Ceremony / muhurat time (as advised by your priest, pandit, imam or pastor)
              </label>
              {!shouldShowMuhurat && (
                <button
                  type="button"
                  onClick={() => setShowMuhuratCustom(true)}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add ceremony / muhurat time</span>
                </button>
              )}
            </div>

            {shouldShowMuhurat ? (
              <div className="space-y-3">
                <TimePicker12h
                  id="muhurat-time"
                  value={muhuratTime}
                  onChange={setMuhuratTime}
                  label="Ceremony / muhurat time (as advised by your priest, pandit, imam or pastor)"
                  legendClassName="sr-only"
                />
                <div>
                  <label htmlFor="muhurat-label" className="sr-only">
                    Ceremony / Ritual Label
                  </label>
                  <input
                    id="muhurat-label"
                    type="text"
                    maxLength={40}
                    placeholder="Label (e.g. Nikah, Nuptial Mass, Pheras, Pooja)"
                    value={muhuratLabel}
                    onChange={(e) => setMuhuratLabel(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-ink-muted">
                  Ceremony or auspicious timing as advised by your priest, pandit, imam or pastor. Automatically schedules the event day milestone and calendar export.
                </p>
              </div>
            ) : (
              <div className="min-h-[44px] flex items-center p-2 rounded-lg border border-dashed border-rule bg-paper-subtle/50 text-xs text-ink-muted">
                <span>Optional for this celebration type. Click &ldquo;Add ceremony / muhurat time&rdquo; to specify.</span>
              </div>
            )}
          </div>

          {/* 6. Guest Count with Quick Picks */}
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
            {/* Quick Guest Picks */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Suggested guest tiers">
              <span className="text-[11px] text-ink-muted mr-1">Quick picks:</span>
              {QUICK_GUEST_PICKS.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePickGuests(num)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors min-h-[28px] ${
                    Number(guestCount) === num
                      ? 'border-accent bg-accent-subtle text-accent font-semibold'
                      : 'border-rule bg-paper-subtle hover:bg-paper hover:border-accent text-ink'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Total Budget with Common Indian Tiers */}
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
            {/* Common Budget Tiers Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Budget suggestions">
              <span className="text-[11px] text-ink-muted mr-1">Tiers:</span>
              {QUICK_BUDGET_PICKS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => handlePickBudget(tier.value, tier.label)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors min-h-[28px] ${
                    Number(totalBudget) === tier.value
                      ? 'border-accent bg-accent-subtle text-accent font-semibold'
                      : 'border-rule bg-paper-subtle hover:bg-paper hover:border-accent text-ink'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* 8. Style / Culture with Multi-Select Idea Chips */}
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
              placeholder="e.g. Royal Rajasthani with Mehendi, Boho garden, Classical South Indian"
              aria-describedby={formErrors.styleCulture ? 'style-culture-err' : undefined}
              className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.styleCulture && (
              <p id="style-culture-err" className="mt-1 text-xs text-state-error">
                {formErrors.styleCulture}
              </p>
            )}
            {/* Style Idea Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Style suggestions">
              <span className="text-[11px] text-ink-muted mr-1">Tap to add:</span>
              {(STYLE_CULTURE_CHIPS[eventType] || STYLE_CULTURE_CHIPS.Wedding).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAppendStyle(chip)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-rule bg-paper-subtle hover:bg-paper hover:border-accent text-ink transition-colors min-h-[30px]"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 9. Non-negotiables with Multi-Select Idea Chips */}
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
              placeholder="e.g. Pure vegetarian menu, dedicated Jain counter, wheelchair ramp, 10 PM sound cutoff"
              aria-describedby={formErrors.nonNegotiables ? 'non-negotiables-err' : undefined}
              className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
            />
            {formErrors.nonNegotiables && (
              <p id="non-negotiables-err" className="mt-1 text-xs text-state-error">
                {formErrors.nonNegotiables}
              </p>
            )}
            {/* Non-Negotiable Idea Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Constraint suggestions">
              <span className="text-[11px] text-ink-muted mr-1">Tap to add:</span>
              {(NON_NEGOTIABLE_CHIPS[eventType] || NON_NEGOTIABLE_CHIPS.Wedding).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAppendNonNegotiable(chip)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-rule bg-paper-subtle hover:bg-paper hover:border-accent text-ink transition-colors min-h-[30px]"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-paper-subtle text-ink-muted text-xs leading-relaxed border border-rule">
          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p>{PLANNER_DISCLAIMER}</p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-rule">
          <span className="text-xs text-ink-faint">
            Generates hard budget ceiling, timeline track, and vendor checklist
          </span>
          <button
            type="submit"
            disabled={isLoading || isOpeningPreparedPlan}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-accent text-accent-text font-serif font-bold text-base hover:bg-accent-hover transition-all shadow-sm flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            {isOpeningPreparedPlan ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Opening Prepared Plan...</span>
              </>
            ) : isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Designing Plan with AI...</span>
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

      {/* Suggest Names Modal from Planner Form */}
      {isSuggestModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsSuggestModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-suggest-dialog-title"
            className="relative w-full max-w-md rounded-2xl border border-rule bg-paper-card p-6 shadow-xl text-ink space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                <h2 id="form-suggest-dialog-title" className="font-serif font-bold text-lg text-ink">
                  Celebration Name Ideas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink"
                aria-label="Close suggestions dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-ink-muted">
              AI-generated names tailored for your {city || 'selected city'} {eventType}. Click any to use:
            </p>

            {isFetchingNames ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" aria-hidden="true" />
                <p className="text-xs text-ink-muted">Synthesizing creative titles...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto" data-lenis-prevent>
                {suggestedNames.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEventName(suggestion);
                      setChipAnnouncement(`Selected ${suggestion}`);
                      setIsSuggestModalOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-rule bg-paper hover:bg-paper-subtle hover:border-accent text-sm font-medium text-ink transition-colors flex items-center justify-between group"
                  >
                    <span>{suggestion}</span>
                    <Check className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-rule flex justify-end">
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-rule hover:bg-paper"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

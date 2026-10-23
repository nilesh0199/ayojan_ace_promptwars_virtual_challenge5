'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePlan } from '../plan-context';
import { formatCurrency } from '@/lib/budget';
import { triggerIcsDownload, generateTimelineIcs } from '@/lib/ics';
import { PrintModal } from './print-modal';
import { IntakeFormData } from '@/lib/schemas';
import {
  Calendar,
  MapPin,
  Users,
  Coins,
  Printer,
  CalendarCheck,
  CloudUpload,
  SlidersHorizontal,
  BookmarkCheck,
  History,
  CheckCircle,
  X,
  Cpu,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';

interface WorkspaceHeaderProps {
  onOpenReplan: () => void;
  activeTabName?: string;
}

export function WorkspaceHeader({ onOpenReplan, activeTabName = 'Overview' }: WorkspaceHeaderProps) {
  const {
    activePlan,
    planHistory,
    undoReplan,
    saveToCloud,
    saveSuccessNotice,
    clearSaveSuccessNotice,
    startPlanGeneration,
    isLoading,
  } = usePlan();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  if (!activePlan) return null;

  const handleExportIcs = () => {
    const icsContent = generateTimelineIcs(activePlan.title, activePlan.timeline);
    triggerIcsDownload(`${activePlan.title.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`, icsContent);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleSave = async () => {
    const success = await saveToCloud();
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleRetryWithAi = async () => {
    if (!activePlan) return;
    const intakeData: IntakeFormData = {
      eventType: activePlan.eventType,
      city: activePlan.city,
      date: activePlan.date,
      guestCount: activePlan.guestCount,
      totalBudget: activePlan.totalBudget,
      currency: activePlan.currency,
      styleCulture: activePlan.styleCulture,
      nonNegotiables: activePlan.nonNegotiables,
    };
    await startPlanGeneration(intakeData);
  };

  return (
    <div className="border-b border-rule bg-paper-card p-6 sm:p-8 rounded-2xl shadow-xs mb-8">
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rule/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-xs font-semibold">
            {activePlan.eventType}
          </span>
          {activePlan.isSavedExample && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-marigold-subtle text-marigold-text text-xs font-semibold">
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Saved Example
            </span>
          )}
          {activePlan.generationSource === 'backup' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs font-medium border border-blue-200 dark:border-blue-800">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              Backup AI
            </span>
          )}
          {activePlan.generationSource === 'template' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-medium border border-amber-200 dark:border-amber-800">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Built-in Template
            </span>
          )}
          <span className="text-xs font-mono text-ink-muted">
            Version {activePlan.version}
          </span>
        </div>

        {/* Undo Replanning if history exists */}
        {planHistory.length > 0 && (
          <button
            type="button"
            onClick={undoReplan}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover bg-accent-subtle px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Undo to Version {planHistory[planHistory.length - 1].version}</span>
          </button>
        )}
      </div>

      {/* Calm, dismissible, accessible notice when backup or main provider is inactive/expired */}
      {!isNoticeDismissed && activePlan.providerNotice && (
        <div
          role="status"
          aria-live="polite"
          data-testid="provider-notice"
          className="mt-4 flex items-start justify-between gap-3 p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-sm shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-bold text-sm">
                Provider Availability Notice
              </p>
              <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                {activePlan.providerNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNoticeDismissed(true)}
            className="p-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors shrink-0"
            aria-label="Dismiss provider notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Non-Primary AI Generation Alert Banner with "Try again with AI" action */}
      {activePlan.generationSource && activePlan.generationSource !== 'primary' && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
            activePlan.generationSource === 'backup'
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200'
              : 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            {activePlan.generationSource === 'backup' ? (
              <Cpu className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-0" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" aria-hidden="true" />
            )}
            <div>
              <p className="font-bold text-sm">
                {activePlan.generationSource === 'backup'
                  ? 'Generated by a backup AI provider'
                  : 'Built-in template plan (AI is busy)'}
              </p>
              <p className="opacity-90 mt-0.5">
                {activePlan.generationSource === 'backup'
                  ? 'Primary AI experienced high traffic; this draft was generated via our backup AI provider.'
                  : 'Generated immediately by our deterministic offline planner. You can customize all details now.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryWithAi}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-text font-medium hover:bg-accent-hover transition-colors shadow-xs min-h-[36px]"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isLoading ? 'Connecting to AI...' : 'Try again with AI'}</span>
          </button>
        </div>
      )}

      {/* Main Title & Action Bar */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-ink tracking-tight">
            {activePlan.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
              {activePlan.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-accent" aria-hidden="true" />
              {activePlan.date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-accent" aria-hidden="true" />
              {activePlan.guestCount} Guests
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Coins className="h-4 w-4 text-accent" aria-hidden="true" />
              Budget: {formatCurrency(activePlan.totalBudget, activePlan.currency)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={onOpenReplan}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text font-medium text-sm hover:bg-accent-hover transition-colors shadow-xs"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Replan &amp; Adjust</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule bg-paper text-ink font-medium text-sm hover:bg-paper-subtle transition-colors"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 text-state-success" aria-hidden="true" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                <span>Save to Cloud</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportIcs}
            title="Download .ics calendar file"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule bg-paper text-ink font-medium text-sm hover:bg-paper-subtle transition-colors"
          >
            <CalendarCheck className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print or Save as PDF"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-rule bg-paper text-ink font-medium text-sm hover:bg-paper-subtle transition-colors"
          >
            <Printer className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Save to Cloud Success Alert */}
      {saveSuccessNotice && (
        <div
          role="region"
          aria-label="Cloud Save Confirmation"
          className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{saveSuccessNotice.message}</span>
            {saveSuccessNotice.link && (
              <Link
                href={saveSuccessNotice.link}
                className="font-semibold underline hover:text-emerald-950 dark:hover:text-emerald-100 ml-1.5"
              >
                View Saved Plans
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={clearSaveSuccessNotice}
            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            aria-label="Dismiss save confirmation alert"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Accessible Print & PDF Scope Dialog */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        activeTabName={activeTabName}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { usePlan } from '../plan-context';
import { formatCurrency } from '@/lib/budget';
import { triggerIcsDownload, generateTimelineIcs } from '@/lib/ics';
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
} from 'lucide-react';

interface WorkspaceHeaderProps {
  onOpenReplan: () => void;
}

export function WorkspaceHeader({ onOpenReplan }: WorkspaceHeaderProps) {
  const { activePlan, planHistory, undoReplan, saveToCloud } = usePlan();
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!activePlan) return null;

  const handleExportIcs = () => {
    const icsContent = generateTimelineIcs(activePlan.title, activePlan.timeline);
    triggerIcsDownload(`${activePlan.title.toLowerCase().replace(/\s+/g, '-')}-timeline.ics`, icsContent);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    const success = await saveToCloud();
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="border-b border-rule bg-paper-card p-6 sm:p-8 rounded-2xl shadow-xs mb-8">
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rule/60">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-xs font-semibold">
            {activePlan.eventType}
          </span>
          {activePlan.isSavedExample && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-marigold-subtle text-marigold-text text-xs font-semibold">
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Saved Example
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
    </div>
  );
}

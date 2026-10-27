'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, FileText, Layout } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTabName: string;
}

export type PrintScope = 'full' | 'tab';

export function PrintModal({ isOpen, onClose, activeTabName }: PrintModalProps) {
  const [selectedScope, setSelectedScope] = useState<PrintScope>('full');
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Accessible focus trap & Escape handling
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      const firstRadio = dialogRef.current?.querySelector('input[type="radio"]') as HTMLElement | null;
      firstRadio?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecutePrint = () => {
    // Set the print-scope attribute on body
    document.body.setAttribute('data-print-scope', selectedScope);

    const cleanup = () => {
      document.body.removeAttribute('data-print-scope');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    onClose();

    // Small delay to ensure modal unmount and attribute paint before triggering print dialog
    setTimeout(() => {
      try {
        window.print();
      } catch {
        // Safe fallback for test environments (e.g. JSDOM) where window.print is not implemented
      }
    }, 120);
  };

  return (
    <div
      role="presentation"
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        aria-describedby="print-dialog-description"
        className="relative w-full max-w-md rounded-2xl border border-rule bg-paper-card p-6 shadow-xl text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-paper-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Close print options dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-rule">
          <div className="h-10 w-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
            <Printer className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="print-dialog-title" className="font-serif text-xl font-bold text-ink">
              Print / Save as PDF
            </h2>
            <p id="print-dialog-description" className="text-xs text-ink-muted">
              Choose your export scope for high-contrast, black-and-white print styling.
            </p>
          </div>
        </div>

        {/* Scope Options */}
        <fieldset className="mt-5 space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
            Select Export Scope
          </legend>

          {/* Option 1: Full event report (Default) */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
              selectedScope === 'full'
                ? 'border-accent bg-accent-subtle/40 ring-1 ring-accent'
                : 'border-rule bg-paper hover:bg-paper-subtle'
            }`}
          >
            <input
              type="radio"
              name="print-scope"
              value="full"
              checked={selectedScope === 'full'}
              onChange={() => setSelectedScope('full')}
              className="mt-0.5 text-accent focus:ring-accent h-4 w-4"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="text-sm font-semibold text-ink">Full Event Report (Recommended)</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Includes executive summary with ceremony / muhurat timing (as advised by your priest, pandit, imam or pastor), full budget ledger, complete timeline with guest milestones, vendor checklist, ideas, and risk register.
              </p>
            </div>
          </label>

          {/* Option 2: Current tab only */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
              selectedScope === 'tab'
                ? 'border-accent bg-accent-subtle/40 ring-1 ring-accent'
                : 'border-rule bg-paper hover:bg-paper-subtle'
            }`}
          >
            <input
              type="radio"
              name="print-scope"
              value="tab"
              checked={selectedScope === 'tab'}
              onChange={() => setSelectedScope('tab')}
              className="mt-0.5 text-accent focus:ring-accent h-4 w-4"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Layout className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="text-sm font-semibold text-ink">Current Tab Only ({activeTabName})</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Prints only the currently visible workspace tab view without other sections.
              </p>
            </div>
          </label>
        </fieldset>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-rule">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-rule text-xs font-semibold text-ink hover:bg-paper-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecutePrint}
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Open Print Dialog</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { usePlan } from '../plan-context';
import { RiskSeverity } from '@/lib/constants';
import { getFriendlyAiError } from '@/lib/gemini';
import {
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
  BookOpen,
} from 'lucide-react';

const SEVERITY_BADGES: Record<RiskSeverity, { bg: string; text: string }> = {
  Critical: { bg: 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800', text: 'text-red-800 dark:text-red-200' },
  High: { bg: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-200' },
  Medium: { bg: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-200' },
  Low: { bg: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200' },
};

export function TabRisks() {
  const {
    activePlan,
    activeRisks,
    generateRisks,
    isLoadingRisks,
    error,
    errorCode,
    retryLastAction,
    loadSavedExample,
  } = usePlan();

  if (!activePlan) return null;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-serif font-bold text-xl text-ink">
              Operational Safeguards &amp; Contingency Protection
            </h2>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
            Proactive planning for a flawless celebration: evaluates seasonal weather in {activePlan.city}, sound cutoffs, dependency handoffs, dietary protocol assurance, and key milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={generateRisks}
          disabled={isLoadingRisks}
          className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-accent text-accent-text text-sm font-semibold hover:bg-accent-hover transition-colors shadow-xs disabled:opacity-50 shrink-0"
        >
          {isLoadingRisks ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Analyzing Safeguards...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>{activeRisks ? 'Re-Run Safeguards Check' : 'Run Safeguards Review'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-state-error bg-state-error-subtle text-xs text-state-error flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-state-error" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-serif font-bold text-sm text-state-error">
              {getFriendlyAiError(errorCode).title}
            </h4>
            <p className="mt-1 leading-relaxed text-state-error">{error}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (retryLastAction) {
                    retryLastAction();
                  } else {
                    generateRisks();
                  }
                }}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-md bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 transition-opacity"
                aria-label="Retry safeguards assessment"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </button>
              <button
                type="button"
                onClick={() => loadSavedExample('wedding')}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-md bg-paper-card text-ink border border-rule text-xs font-semibold hover:bg-paper-subtle transition-colors"
                aria-label="Load pre-built saved example celebration plan"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Load saved example
              </button>
            </div>
          </div>
        </div>
      )}

      {/* When no risks generated yet */}
      {!activeRisks && !isLoadingRisks && (
        <div className="rounded-2xl border border-dashed border-rule bg-paper-card p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-marigold mx-auto mb-3" aria-hidden="true" />
          <h3 className="font-serif font-bold text-lg text-ink">
            No Safeguards Review Conducted Yet
          </h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto mt-1 leading-relaxed">
            Click &ldquo;Run Safeguards Review&rdquo; to prompt Gemini to stress-test your date, budget, venue logistics, and municipal considerations.
          </p>
        </div>
      )}

      {/* Display Risk Register Cards */}
      {activeRisks && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRisks.risks.map((risk) => {
            const badgeStyle = SEVERITY_BADGES[risk.severity] || SEVERITY_BADGES.Medium;
            return (
              <div
                key={risk.id}
                className="rounded-2xl border border-rule bg-paper-card p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                      {risk.category}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${badgeStyle.bg} ${badgeStyle.text}`}
                    >
                      {risk.severity} Severity
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-ink mb-1">
                    {risk.potentialIssue}
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed mb-3">
                    <strong>Root Cause:</strong> {risk.rootCause}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-rule bg-paper-subtle/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-wider block mb-1">
                    Mitigation Action:
                  </span>
                  <p className="text-xs text-ink leading-relaxed">
                    {risk.mitigationTask}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

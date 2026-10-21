'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlan } from '../plan-context';
import { formatCurrency } from '@/lib/budget';
import {
  X,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface ReplanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReplanModal({ isOpen, onClose }: ReplanModalProps) {
  const {
    activePlan,
    pendingDiff,
    requestReplan,
    acceptReplan,
    rejectReplan,
    isReplanning,
    error,
  } = usePlan();

  const [editBudget, setEditBudget] = useState<number | string>('');
  const [editGuests, setEditGuests] = useState<number | string>('');
  const [editDate, setEditDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryCost, setCategoryCost] = useState<number | string>('');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePlan && isOpen) {
      setEditBudget(activePlan.totalBudget);
      setEditGuests(activePlan.guestCount);
      setEditDate(activePlan.date);
      if (activePlan.budget.categories.length > 0) {
        setSelectedCategoryId(activePlan.budget.categories[0].id);
        setCategoryCost(activePlan.budget.categories[0].targetEstimate);
      }
    }
  }, [activePlan, isOpen]);

  // Handle category selection change
  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    const cat = activePlan?.budget.categories.find((c) => c.id === id);
    if (cat) {
      setCategoryCost(cat.targetEstimate);
    }
  };

  const handleStartReplan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan) return;

    const changes: Parameters<typeof requestReplan>[0] = {};

    if (Number(editBudget) !== activePlan.totalBudget) {
      changes.totalBudget = Number(editBudget);
    }
    if (Number(editGuests) !== activePlan.guestCount) {
      changes.guestCount = Number(editGuests);
    }
    if (editDate !== activePlan.date) {
      changes.eventDate = editDate;
    }

    if (selectedCategoryId && categoryCost !== '') {
      const originalCat = activePlan.budget.categories.find(
        (c) => c.id === selectedCategoryId
      );
      if (originalCat && Number(categoryCost) !== originalCat.targetEstimate) {
        changes.modifiedCategory = {
          categoryId: selectedCategoryId,
          newTargetEstimate: Number(categoryCost),
        };
      }
    }

    await requestReplan(changes);
  };

  const handleAccept = () => {
    acceptReplan();
    onClose();
  };

  const handleReject = () => {
    rejectReplan();
    onClose();
  };

  if (!isOpen || !activePlan) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="replan-modal-title"
        className="relative w-full max-w-2xl rounded-2xl border border-rule bg-paper-card p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-muted hover:bg-paper-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Close replan dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="replan-modal-title" className="font-serif text-2xl font-bold text-ink">
              {pendingDiff ? 'Review Replan Proposal' : 'Budget-Aware Replanning'}
            </h2>
            <p className="text-xs text-ink-muted">
              {pendingDiff
                ? 'Review AI-suggested trade-offs before accepting into your active plan'
                : 'Change the budget, date or guest list and your plan updates itself seamlessly'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-state-error bg-state-error-subtle p-3 text-xs text-state-error flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* State 1: Input Form */}
        {!pendingDiff ? (
          <form onSubmit={handleStartReplan} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-budget"
                  className="block text-xs font-medium text-ink mb-1"
                >
                  Adjust Total Budget ({activePlan.currency})
                </label>
                <input
                  id="edit-budget"
                  type="number"
                  min={100}
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-guests"
                  className="block text-xs font-medium text-ink mb-1"
                >
                  Adjust Guest Count
                </label>
                <input
                  id="edit-guests"
                  type="number"
                  min={2}
                  max={50000}
                  value={editGuests}
                  onChange={(e) => setEditGuests(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-date"
                  className="block text-xs font-medium text-ink mb-1"
                >
                  Adjust Event Date
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="select-category"
                  className="block text-xs font-medium text-ink mb-1"
                >
                  Or Adjust Single Category Cost
                </label>
                <select
                  id="select-category"
                  value={selectedCategoryId}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
                >
                  {activePlan.budget.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCategoryId && (
              <div className="p-4 rounded-xl border border-rule bg-paper-subtle">
                <label
                  htmlFor="category-cost"
                  className="block text-xs font-medium text-ink mb-1"
                >
                  New Target Estimate for Category
                </label>
                <input
                  id="category-cost"
                  type="number"
                  min={0}
                  value={categoryCost}
                  onChange={(e) => setCategoryCost(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-rule bg-paper-card px-3 py-2 text-sm text-ink focus:border-accent focus:outline-hidden"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-rule text-sm font-medium text-ink-muted hover:bg-paper-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReplanning}
                className="min-h-[44px] px-6 py-2 rounded-lg bg-accent text-accent-text text-sm font-medium hover:bg-accent-hover transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {isReplanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Rebalancing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Replan Diff</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* State 2: Diff Review */
          <div className="space-y-6">
            {/* Summary & Why */}
            <div className="rounded-xl border border-rule bg-paper-subtle p-4 space-y-3">
              <div>
                <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider block">
                  What Changed
                </span>
                <p className="font-serif font-bold text-base text-ink mt-0.5">
                  {pendingDiff.summaryOfChanges}
                </p>
              </div>
              <div>
                <span className="text-xs font-mono font-semibold text-ink-muted uppercase tracking-wider block">
                  Strategic Trade-off Rationale
                </span>
                <p className="text-sm text-ink-muted leading-relaxed mt-0.5">
                  {pendingDiff.why}
                </p>
              </div>
            </div>

            {/* Trade-off Options */}
            {pendingDiff.tradeOffOptions.length > 0 && (
              <div className="p-4 rounded-xl border border-rule bg-paper-card">
                <h4 className="font-serif font-bold text-sm text-ink mb-2">
                  Trade-off Options Evaluated:
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-ink-muted leading-relaxed">
                  {pendingDiff.tradeOffOptions.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Affected Categories Diff */}
            {pendingDiff.categoryDiffs.length > 0 && (
              <div>
                <h4 className="font-serif font-bold text-sm text-ink mb-2">
                  Affected Budget Lines ({pendingDiff.categoryDiffs.length}):
                </h4>
                <div className="space-y-2">
                  {pendingDiff.categoryDiffs.map((diff) => (
                    <div
                      key={diff.id}
                      className="p-3 rounded-lg border border-rule bg-paper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="font-medium text-ink">{diff.name}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-ink-muted line-through">
                          {formatCurrency(diff.oldTarget, activePlan.currency)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                        <span className="font-bold text-ink">
                          {formatCurrency(diff.newTarget, activePlan.currency)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-mono font-semibold ${
                            diff.delta > 0
                              ? 'text-state-warning bg-marigold-subtle'
                              : 'text-state-success bg-state-success-subtle'
                          }`}
                        >
                          {diff.delta > 0 ? (
                            <TrendingUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <TrendingDown className="h-3 w-3" aria-hidden="true" />
                          )}
                          {diff.delta > 0 ? '+' : ''}
                          {formatCurrency(diff.delta, activePlan.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accept / Reject Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
              <button
                type="button"
                onClick={handleReject}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-rule text-sm font-medium text-ink-muted hover:bg-paper-subtle transition-colors"
              >
                Reject / Discard
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="min-h-[44px] px-6 py-2 rounded-lg bg-accent text-accent-text text-sm font-medium hover:bg-accent-hover transition-colors shadow-xs flex items-center gap-2"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Accept Replan (Creates Version {activePlan.version + 1})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

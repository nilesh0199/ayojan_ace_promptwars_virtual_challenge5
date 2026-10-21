'use client';

import React from 'react';
import { usePlan } from '../plan-context';
import { formatCurrency } from '@/lib/budget';
import { History, Undo2, Calendar, Coins, Users } from 'lucide-react';

export function TabHistory() {
  const { activePlan, planHistory, setActivePlan } = usePlan();

  if (!activePlan) return null;

  const handleRevertTo = (historicPlan: typeof activePlan) => {
    setActivePlan(historicPlan);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <History className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 className="font-serif font-bold text-xl text-ink">
            Session Version History &amp; Audit Trail
          </h2>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Every accepted replanning adjustment generates an immutable snapshot. You can safely inspect or revert to previous versions at any time.
        </p>
      </div>

      {/* Current Active Version Card */}
      <div className="rounded-2xl border-2 border-accent bg-accent-subtle/30 p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
            Active Version {activePlan.version}
          </span>
          <span className="text-xs text-ink-muted font-mono">
            Updated: {new Date(activePlan.updatedAt).toLocaleTimeString()}
          </span>
        </div>
        <h3 className="font-serif font-bold text-lg text-ink">
          {activePlan.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {formatCurrency(activePlan.totalBudget, activePlan.currency)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {activePlan.date}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {activePlan.guestCount} guests
          </span>
        </div>
      </div>

      {/* Prior History Stack */}
      {planHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule bg-paper-card p-8 text-center text-xs text-ink-muted">
          No previous replan versions yet. Modify parameters using &ldquo;Replan &amp; Adjust&rdquo; to build a version history.
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-sm text-ink px-1">
            Previous Snapshots ({planHistory.length}):
          </h3>
          {planHistory
            .slice()
            .reverse()
            .map((item, idx) => (
              <div
                key={`${item.id}-v${item.version}-${idx}`}
                className="rounded-xl border border-rule bg-paper-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-accent transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-ink">
                      Version {item.version}
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {new Date(item.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                    <span>{formatCurrency(item.totalBudget, item.currency)}</span>
                    <span>&bull;</span>
                    <span>{item.date}</span>
                    <span>&bull;</span>
                    <span>{item.guestCount} guests</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevertTo(item)}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-rule bg-paper text-xs font-semibold text-ink hover:bg-paper-subtle transition-colors"
                >
                  <Undo2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  <span>Revert to v{item.version}</span>
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

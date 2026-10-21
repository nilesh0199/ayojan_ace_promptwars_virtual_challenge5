'use client';

import React, { useMemo } from 'react';
import { usePlan } from '../plan-context';
import { calculateBudgetSummary, formatCurrency } from '@/lib/budget';
import {
  AlertTriangle,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Receipt,
} from 'lucide-react';

interface TabBudgetProps {
  onOpenReplan: () => void;
}

// Distinct accessible hues for the stacked horizontal budget bar
const BAR_COLORS = [
  'bg-emerald-600 dark:bg-emerald-500',
  'bg-teal-600 dark:bg-teal-400',
  'bg-amber-600 dark:bg-amber-500',
  'bg-cyan-600 dark:bg-cyan-400',
  'bg-indigo-600 dark:bg-indigo-400',
  'bg-orange-600 dark:bg-orange-400',
  'bg-blue-600 dark:bg-blue-400',
  'bg-rose-600 dark:bg-rose-400',
];

export function TabBudget({ onOpenReplan }: TabBudgetProps) {
  const { activePlan } = usePlan();

  // Pure deterministic budget math performed strictly in code (memoized)
  const summary = useMemo(() => {
    if (!activePlan) return null;
    return calculateBudgetSummary(activePlan.budget, activePlan.totalBudget);
  }, [activePlan]);

  if (!activePlan || !summary) return null;

  return (
    <div className="space-y-8">
      {/* Over-budget Warning Announcement */}
      {summary.isOverBudget && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-state-error bg-state-error-subtle p-5 text-state-error"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="font-serif font-bold text-lg">
                  Budget Overrun Alert
                </h2>
                <p className="mt-1 text-sm text-state-error/90 leading-relaxed">
                  Total committed allocations ({formatCurrency(summary.totalCommitted, activePlan.currency)}) exceed your declared budget ({formatCurrency(summary.totalBudget, activePlan.currency)}) by <strong>{formatCurrency(summary.overBudgetAmount, activePlan.currency)}</strong>. Use the Budget-Aware Rebalancer to adjust allocations.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenReplan}
              className="shrink-0 min-h-[44px] px-4 py-2 rounded-xl bg-state-error text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Rebalance Budget
            </button>
          </div>
        </div>
      )}

      {/* Ledger Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-rule bg-paper-card p-5">
          <span className="text-xs font-mono uppercase text-ink-muted block mb-1">
            Total Budget Envelope
          </span>
          <div className="font-serif text-2xl font-bold text-ink">
            {formatCurrency(summary.totalBudget, activePlan.currency)}
          </div>
          <span className="text-xs text-ink-faint mt-1 block">Declared by host</span>
        </div>

        <div className="rounded-2xl border border-rule bg-paper-card p-5">
          <span className="text-xs font-mono uppercase text-ink-muted block mb-1">
            Direct Category Subtotal
          </span>
          <div className="font-serif text-2xl font-bold text-ink">
            {formatCurrency(summary.subtotalTarget, activePlan.currency)}
          </div>
          <span className="text-xs text-ink-faint mt-1 block">
            Range: {formatCurrency(summary.subtotalMin, activePlan.currency)} – {formatCurrency(summary.subtotalMax, activePlan.currency)}
          </span>
        </div>

        <div className="rounded-2xl border border-rule bg-paper-card p-5">
          <span className="text-xs font-mono uppercase text-ink-muted block mb-1">
            Contingency Buffer ({summary.contingencyPercent}%)
          </span>
          <div className="font-serif text-2xl font-bold text-ink">
            {formatCurrency(summary.contingencyAmount, activePlan.currency)}
          </div>
          <span className="text-xs text-ink-faint mt-1 block">Emergency variance safety</span>
        </div>

        <div className="rounded-2xl border border-rule bg-paper-card p-5">
          <span className="text-xs font-mono uppercase text-ink-muted block mb-1">
            Taxes &amp; Service ({summary.taxServiceChargePercent}%)
          </span>
          <div className="font-serif text-2xl font-bold text-ink">
            {formatCurrency(summary.taxServiceChargeAmount, activePlan.currency)}
          </div>
          <span className="text-xs text-ink-faint mt-1 block">Statutory GST &amp; fees</span>
        </div>
      </div>

      {/* Horizontal Stacked Bar Visualization */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif font-bold text-lg text-ink">
            Allocation Distribution (Stacked Ledger Bar)
          </h2>
          <span className="text-xs text-ink-muted font-mono">
            {summary.isOverBudget ? (
              <span className="text-state-error font-semibold">100%+ Committed</span>
            ) : (
              <span className="text-state-success font-semibold">
                {Math.round((summary.totalCommitted / summary.totalBudget) * 100)}% Committed
              </span>
            )}
          </span>
        </div>

        {/* Stacked Bar */}
        <div
          role="progressbar"
          aria-label="Category allocation distribution bar"
          aria-valuenow={Math.round((summary.totalCommitted / summary.totalBudget) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-6 w-full rounded-full bg-paper-subtle overflow-hidden flex shadow-inner"
        >
          {summary.categoryBreakdowns.map((item, idx) => {
            const width = Math.min(100, Math.max(0, item.percentOfBudget));
            if (width <= 0) return null;
            return (
              <div
                key={item.id}
                style={{ width: `${width}%` }}
                title={`${item.name}: ${item.percentOfBudget}% (${formatCurrency(item.targetEstimate, activePlan.currency)})`}
                className={`${BAR_COLORS[idx % BAR_COLORS.length]} h-full transition-all hover:opacity-80`}
              />
            );
          })}
          {/* Contingency segment */}
          <div
            style={{
              width: `${Math.min(100, (summary.contingencyAmount / summary.totalBudget) * 100)}%`,
            }}
            title={`Contingency Buffer: ${formatCurrency(summary.contingencyAmount, activePlan.currency)}`}
            className="bg-zinc-400 dark:bg-zinc-600 h-full hover:opacity-80"
          />
          {/* Tax segment */}
          <div
            style={{
              width: `${Math.min(100, (summary.taxServiceChargeAmount / summary.totalBudget) * 100)}%`,
            }}
            title={`Taxes & Fees: ${formatCurrency(summary.taxServiceChargeAmount, activePlan.currency)}`}
            className="bg-zinc-500 dark:bg-zinc-700 h-full hover:opacity-80"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
          {summary.categoryBreakdowns.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                aria-hidden="true"
              />
              <span className="font-medium text-ink">{item.name}</span>
              <span className="text-ink-faint">({item.percentOfBudget}%)</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" aria-hidden="true" />
            <span>Contingency ({summary.contingencyPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-500 dark:bg-zinc-700" aria-hidden="true" />
            <span>Taxes &amp; Fees ({summary.taxServiceChargePercent}%)</span>
          </div>
        </div>
      </div>

      {/* Clean Ledger Table */}
      <div className="rounded-2xl border border-rule bg-paper-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif font-bold text-xl text-ink">
              Detailed Ledger Breakdown
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Realistic planning ranges with stated assumptions. Code validated.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenReplan}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Adjust Category Allocations</span>
          </button>
        </div>

        {/* Responsive Table / Stacked Card Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-paper-subtle/70 text-ink-muted uppercase font-mono text-[11px] border-b border-rule">
              <tr>
                <th scope="col" className="p-4">Category</th>
                <th scope="col" className="p-4 text-right">Min Estimate</th>
                <th scope="col" className="p-4 text-right">Target Estimate</th>
                <th scope="col" className="p-4 text-right">Max Estimate</th>
                <th scope="col" className="p-4 text-right">% of Budget</th>
                <th scope="col" className="p-4">Notes &amp; Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-ink">
              {summary.categoryBreakdowns.map((cat) => (
                <tr key={cat.id} className="hover:bg-paper-subtle/40 transition-colors">
                  <td className="p-4 font-medium text-ink flex items-center gap-2">
                    {cat.name}
                  </td>
                  <td className="p-4 text-right text-ink-muted font-mono">
                    {formatCurrency(cat.minEstimate, activePlan.currency)}
                  </td>
                  <td className="p-4 text-right font-bold text-ink font-mono">
                    {formatCurrency(cat.targetEstimate, activePlan.currency)}
                  </td>
                  <td className="p-4 text-right text-ink-muted font-mono">
                    {formatCurrency(cat.maxEstimate, activePlan.currency)}
                  </td>
                  <td className="p-4 text-right font-mono text-ink-muted">
                    {cat.percentOfBudget}%
                  </td>
                  <td className="p-4 text-xs text-ink-muted max-w-xs leading-relaxed">
                    {activePlan.budget.categories.find((c) => c.id === cat.id)?.notes || '—'}
                  </td>
                </tr>
              ))}

              {/* Contingency Line */}
              <tr className="bg-paper-subtle/30 font-medium">
                <td className="p-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <span>Contingency Reserve ({summary.contingencyPercent}%)</span>
                </td>
                <td className="p-4 text-right text-ink-muted">—</td>
                <td className="p-4 text-right font-mono font-bold">
                  {formatCurrency(summary.contingencyAmount, activePlan.currency)}
                </td>
                <td className="p-4 text-right text-ink-muted">—</td>
                <td className="p-4 text-right font-mono text-ink-muted">
                  {summary.contingencyPercent}%
                </td>
                <td className="p-4 text-xs text-ink-muted">
                  Emergency buffer for unforeseen weather, logistics, or vendor overtime.
                </td>
              </tr>

              {/* Tax & Service Allowance Line */}
              <tr className="bg-paper-subtle/30 font-medium">
                <td className="p-4 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <span>Statutory Taxes &amp; Service ({summary.taxServiceChargePercent}%)</span>
                </td>
                <td className="p-4 text-right text-ink-muted">—</td>
                <td className="p-4 text-right font-mono font-bold">
                  {formatCurrency(summary.taxServiceChargeAmount, activePlan.currency)}
                </td>
                <td className="p-4 text-right text-ink-muted">—</td>
                <td className="p-4 text-right font-mono text-ink-muted">
                  {summary.taxServiceChargePercent}%
                </td>
                <td className="p-4 text-xs text-ink-muted">
                  Statutory GST, venue hospitality charges, and local licensing permits.
                </td>
              </tr>

              {/* Grand Total Row */}
              <tr className="bg-paper-subtle font-bold border-t-2 border-rule">
                <td className="p-4 text-base font-serif">Total Committed Budget</td>
                <td className="p-4 text-right font-mono text-ink-muted">
                  {formatCurrency(summary.subtotalMin, activePlan.currency)}
                </td>
                <td className="p-4 text-right font-mono text-base text-accent">
                  {formatCurrency(summary.totalCommitted, activePlan.currency)}
                </td>
                <td className="p-4 text-right font-mono text-ink-muted">
                  {formatCurrency(summary.subtotalMax, activePlan.currency)}
                </td>
                <td className="p-4 text-right font-mono">
                  {Math.round((summary.totalCommitted / summary.totalBudget) * 100)}%
                </td>
                <td className="p-4 text-xs font-normal text-ink-muted">
                  Remaining Envelope:{' '}
                  <strong
                    className={
                      summary.isOverBudget ? 'text-state-error' : 'text-state-success'
                    }
                  >
                    {formatCurrency(summary.remainingBudget, activePlan.currency)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Stated Assumptions Section */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="font-serif font-bold text-lg text-ink">Stated Planning Assumptions</h2>
        </div>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
          {activePlan.budget.statedAssumptions.map((assumption, i) => (
            <li key={i}>{assumption}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

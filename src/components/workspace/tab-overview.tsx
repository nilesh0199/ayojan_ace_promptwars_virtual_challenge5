'use client';

import React, { useState } from 'react';
import { usePlan } from '../plan-context';
import { calculateBudgetSummary, formatCurrency, calculateBudgetTotals } from '@/lib/budget';
import {
  Coins,
  CheckCircle2,
  Users,
  Compass,
  AlertOctagon,
  Sparkles,
  Clock,
  Pencil,
  Check,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TabOverviewProps {
  onSelectTab: (tabId: string) => void;
}

export function TabOverview({ onSelectTab }: TabOverviewProps) {
  const { activePlan, setActivePlan } = usePlan();
  const [isEditingMuhurat, setIsEditingMuhurat] = useState(false);
  const [tempTime, setTempTime] = useState(activePlan?.muhuratTime || '');
  const [tempLabel, setTempLabel] = useState(activePlan?.muhuratLabel || '');
  const [isMasterReportOpen, setIsMasterReportOpen] = useState(true);

  if (!activePlan) return null;

  const budgetSummary = calculateBudgetSummary(activePlan.budget, activePlan.totalBudget);
  const budgetTotals = calculateBudgetTotals(
    activePlan.budget.categories,
    activePlan.budget.contingencyPercent,
    activePlan.budget.taxServiceChargePercent,
    activePlan.totalBudget
  );
  const completedTasks = activePlan.timeline.filter((t) => t.completed).length;
  const totalTasks = activePlan.timeline.length;
  const bookedVendors = activePlan.vendors.filter((v) => v.status === 'Booked').length;

  const handleSaveMuhurat = () => {
    const updated = {
      ...activePlan,
      muhuratTime: tempTime.trim() || undefined,
      muhuratLabel: tempLabel.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    setActivePlan(updated);
    setIsEditingMuhurat(false);
  };

  const handleCancelMuhurat = () => {
    setTempTime(activePlan.muhuratTime || '');
    setTempLabel(activePlan.muhuratLabel || '');
    setIsEditingMuhurat(false);
  };

  return (
    <div className="space-y-8">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Status Card */}
        <div className="rounded-2xl border border-rule bg-paper-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Committed Budget</span>
            <Coins className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {formatCurrency(budgetSummary.totalCommitted, activePlan.currency)}
          </div>
          <div className="mt-2 text-xs flex items-center justify-between">
            <span className="text-ink-muted">
              of {formatCurrency(activePlan.totalBudget, activePlan.currency)} total
            </span>
            <span
              className={`font-semibold ${
                budgetSummary.isOverBudget ? 'text-state-error' : 'text-state-success'
              }`}
            >
              {budgetSummary.isOverBudget
                ? `Over by ${formatCurrency(budgetSummary.overBudgetAmount, activePlan.currency)}`
                : `${formatCurrency(budgetSummary.remainingBudget, activePlan.currency)} left`}
            </span>
          </div>
        </div>

        {/* Timeline Progress Card */}
        <div className="rounded-2xl border border-rule bg-paper-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Milestones Done</span>
            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {completedTasks} / {totalTasks}
          </div>
          <div className="mt-2 text-xs text-ink-muted">
            {totalTasks - completedTasks} milestones remaining before event day
          </div>
        </div>

        {/* Vendors Status Card */}
        <div className="rounded-2xl border border-rule bg-paper-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Vendor Categories</span>
            <Compass className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {bookedVendors} Booked
          </div>
          <div className="mt-2 text-xs text-ink-muted">
            {activePlan.vendors.length} types with verified discovery questions
          </div>
        </div>

        {/* Event Vibe Card */}
        <div className="rounded-2xl border border-rule bg-paper-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Gathering Scale</span>
            <Users className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="font-serif text-2xl font-bold text-ink">
            {activePlan.guestCount} Guests
          </div>
          <div className="mt-2 text-xs text-ink-muted truncate">
            {activePlan.city} · {activePlan.eventType}
          </div>
        </div>
      </div>

      {/* Auspicious Muhurat Time Highlight / Inline Edit Card */}
      <div className="rounded-2xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-amber-900 dark:text-amber-300">
                  Auspicious Muhurat / Ritual Timing
                </span>
                {!isEditingMuhurat && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempTime(activePlan.muhuratTime || '');
                      setTempLabel(activePlan.muhuratLabel || '');
                      setIsEditingMuhurat(true);
                    }}
                    className="p-1 rounded-md text-amber-800 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
                    aria-label="Edit auspicious muhurat time"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {!isEditingMuhurat ? (
                <div className="mt-1">
                  {activePlan.muhuratTime ? (
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-serif font-bold text-xl text-ink">
                        {activePlan.muhuratTime}
                      </span>
                      {activePlan.muhuratLabel && (
                        <span className="text-xs font-medium text-amber-900 dark:text-amber-300">
                          ({activePlan.muhuratLabel})
                        </span>
                      )}
                      <span className="text-xs text-ink-muted ml-2">
                        · Event day timeline &amp; calendar export synchronised
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      No auspicious muhurat time set yet. Click the pencil to add ritual timing for your celebration.
                    </p>
                  )}
                </div>
              ) : (
                /* Inline Edit Inputs */
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div>
                    <label htmlFor="edit-muhurat-time" className="sr-only">
                      Muhurat Time
                    </label>
                    <input
                      id="edit-muhurat-time"
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-amber-400 bg-paper text-sm text-ink focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-muhurat-label" className="sr-only">
                      Ritual Label
                    </label>
                    <input
                      id="edit-muhurat-label"
                      type="text"
                      maxLength={40}
                      placeholder="e.g. Pheras, Pooja"
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-amber-400 bg-paper text-sm text-ink placeholder:text-ink-muted focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSaveMuhurat}
                      aria-label="Save muhurat time"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover transition-colors min-h-[36px]"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelMuhurat}
                      aria-label="Cancel editing muhurat time"
                      className="p-1.5 rounded-lg border border-rule text-ink-muted hover:text-ink hover:bg-paper transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Style & Non-negotiables Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="font-serif font-bold text-lg text-ink">Style &amp; Cultural Vision</h2>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            {activePlan.styleCulture}
          </p>
          <div className="mt-4 pt-4 border-t border-rule flex items-center justify-between">
            <span className="text-xs text-ink-faint">
              {activePlan.ideas.themes.length} personalized concepts generated
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('ideas')}
              className="text-xs font-semibold text-accent hover:underline min-h-[36px] inline-flex items-center"
            >
              Explore Ideas &rarr;
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="h-4 w-4 text-marigold" aria-hidden="true" />
            <h2 className="font-serif font-bold text-lg text-ink">Non-Negotiable Constraints</h2>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            {activePlan.nonNegotiables || 'No specific constraints entered.'}
          </p>
          <div className="mt-4 pt-4 border-t border-rule flex items-center justify-between">
            <span className="text-xs text-ink-faint">
              Guards against operational oversights
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('risks')}
              className="text-xs font-semibold text-accent hover:underline min-h-[36px] inline-flex items-center"
            >
              View Risk Register &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Next Imminent Milestones Preview */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-lg text-ink">
            Immediate Action Items (Now &amp; Next 7 Days)
          </h2>
          <button
            type="button"
            onClick={() => onSelectTab('timeline')}
            className="text-xs font-semibold text-accent hover:underline min-h-[36px] inline-flex items-center"
          >
            Full Timeline Track &rarr;
          </button>
        </div>

        <div className="space-y-3">
          {activePlan.timeline
            .filter((t) => t.phase === 'Now' || t.phase === 'Next 7 days')
            .slice(0, 4)
            .map((task) => (
              <div
                key={task.id}
                className="flex items-start sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-rule/70 bg-paper-subtle/40"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full mt-1 sm:mt-0 ${
                      task.completed ? 'bg-state-success' : 'bg-marigold'
                    }`}
                  />
                  <div>
                    <h3 className="font-medium text-sm text-ink">{task.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{task.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-ink block">
                    {task.dueDate}
                  </span>
                  <span className="text-[10px] text-ink-faint block">
                    Owner: {task.owner || 'Unassigned'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* On-Screen Master Plan Executive Report (Exclusively presented here on screen) */}
      <section
        aria-labelledby="master-report-heading"
        className="rounded-2xl border border-rule bg-paper-card shadow-xs overflow-hidden"
      >
        <div
          className="p-6 border-b border-rule flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-paper-subtle/40 transition-colors"
          onClick={() => setIsMasterReportOpen((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="master-report-heading" className="font-serif text-xl font-bold text-ink">
                Master Plan Executive Report
              </h2>
              <p className="text-xs text-ink-muted">
                Complete overview of budget allocations, timeline phases, and vendor checklists.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={isMasterReportOpen}
            aria-label={isMasterReportOpen ? 'Collapse master report' : 'Expand master report'}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-subtle"
          >
            {isMasterReportOpen ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMasterReportOpen && (
          <div className="p-6 space-y-8 animate-fadeIn">
            {/* Fact Sheet Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-paper border border-rule text-xs">
              <div>
                <span className="font-mono text-ink-muted block uppercase text-[10px]">
                  Celebration
                </span>
                <span className="font-bold text-ink text-sm">{activePlan.title}</span>
              </div>
              <div>
                <span className="font-mono text-ink-muted block uppercase text-[10px]">
                  Location &amp; Type
                </span>
                <span className="font-medium text-ink">
                  {activePlan.city} · {activePlan.eventType}
                </span>
              </div>
              <div>
                <span className="font-mono text-ink-muted block uppercase text-[10px]">
                  Date &amp; Muhurat
                </span>
                <span className="font-bold text-ink">
                  {activePlan.date}
                  {activePlan.muhuratTime ? ` @ ${activePlan.muhuratTime}` : ''}
                </span>
              </div>
              <div>
                <span className="font-mono text-ink-muted block uppercase text-[10px]">
                  Budget &amp; Guests
                </span>
                <span className="font-bold text-ink">
                  {formatCurrency(activePlan.totalBudget, activePlan.currency)} · {activePlan.guestCount} Guests
                </span>
              </div>
            </div>

            {/* Budget Ledger Table */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-ink">
                Itemized Budget Allocations
              </h3>
              <div className="overflow-x-auto rounded-xl border border-rule">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper-subtle border-b border-rule font-semibold text-ink">
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Target Estimate</th>
                      <th className="p-3 text-right">Min - Max Range</th>
                      <th className="p-3">Planning Assumptions &amp; Trade-offs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule bg-paper">
                    {activePlan.budget.categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-paper-subtle/50">
                        <td className="p-3 font-medium text-ink">{cat.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-ink">
                          {formatCurrency(cat.targetEstimate, activePlan.currency)}
                        </td>
                        <td className="p-3 text-right font-mono text-ink-muted">
                          {formatCurrency(cat.minEstimate, activePlan.currency)} –{' '}
                          {formatCurrency(cat.maxEstimate, activePlan.currency)}
                        </td>
                        <td className="p-3 text-ink-muted">{cat.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-rule bg-paper-subtle font-semibold text-ink">
                    <tr>
                      <td className="p-3">Subtotal Target</td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(budgetTotals.categoriesSum, activePlan.currency)}
                      </td>
                      <td colSpan={2} className="p-3 text-ink-muted">
                        Categories base allocation
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        Contingency Buffer ({activePlan.budget.contingencyPercent}%)
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(budgetTotals.contingencyAmount, activePlan.currency)}
                      </td>
                      <td colSpan={2} className="p-3 text-ink-muted">
                        Reserved for unforeseen emergencies
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        Taxes &amp; Service Charges ({activePlan.budget.taxServiceChargePercent}%)
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(budgetTotals.taxAmount, activePlan.currency)}
                      </td>
                      <td colSpan={2} className="p-3 text-ink-muted">
                        Statutory charges and hospitality fees
                      </td>
                    </tr>
                    <tr className="border-t border-rule font-bold text-sm bg-accent-subtle/30 text-accent">
                      <td className="p-3">Total Committed Budget</td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(budgetTotals.totalAllocated, activePlan.currency)}
                      </td>
                      <td colSpan={2} className="p-3 text-ink">
                        Target Cap: {formatCurrency(activePlan.totalBudget, activePlan.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Timeline Breakdown */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-ink">
                Milestone Timeline ({activePlan.timeline.length} Milestones)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePlan.timeline.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-rule bg-paper flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-ink block">{task.title}</span>
                      <span className="text-[11px] text-ink-muted">{task.phase} · {task.description}</span>
                    </div>
                    <span className="font-mono text-ink font-bold shrink-0">{task.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

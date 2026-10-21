'use client';

import React from 'react';
import { usePlan } from '../plan-context';
import { calculateBudgetSummary, formatCurrency } from '@/lib/budget';
import {
  Coins,
  CheckCircle2,
  Users,
  Compass,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface TabOverviewProps {
  onSelectTab: (tabId: string) => void;
}

export function TabOverview({ onSelectTab }: TabOverviewProps) {
  const { activePlan } = usePlan();

  if (!activePlan) return null;

  const budgetSummary = calculateBudgetSummary(activePlan.budget, activePlan.totalBudget);
  const completedTasks = activePlan.timeline.filter((t) => t.completed).length;
  const totalTasks = activePlan.timeline.length;
  const bookedVendors = activePlan.vendors.filter((v) => v.status === 'Booked').length;

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
              className="text-xs font-semibold text-accent hover:underline"
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
              className="text-xs font-semibold text-accent hover:underline"
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
            className="text-xs font-semibold text-accent hover:underline"
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
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import { validateAndFitBudget, EVENT_BUDGET_BENCHMARKS } from '@/lib/budget-benchmarks';
import { calculateBudgetTotals } from '@/lib/budget';

describe('Budget Benchmarks & Hard Ceiling Fitting', () => {
  const sampleBudget = {
    categories: [
      {
        id: 'cat-1',
        name: 'Venue & Lawn',
        minEstimate: 500000,
        maxEstimate: 800000,
        targetEstimate: 650000,
        notes: 'Lawn rental',
      },
      {
        id: 'cat-2',
        name: 'Catering & Service',
        minEstimate: 600000,
        maxEstimate: 900000,
        targetEstimate: 750000,
        notes: 'Food and live counters',
      },
      {
        id: 'cat-3',
        name: 'Decor & Mandap',
        minEstimate: 300000,
        maxEstimate: 500000,
        targetEstimate: 400000,
        notes: 'Floral styling',
      },
      {
        id: 'cat-4',
        name: 'Photography & Media',
        minEstimate: 150000,
        maxEstimate: 250000,
        targetEstimate: 200000,
        notes: 'Candid and video',
      },
    ],
    contingencyPercent: 10,
    taxServiceChargePercent: 5,
    statedAssumptions: ['Initial draft estimates'],
  };

  it('guarantees that total allocated funds never exceed total budget cap', () => {
    const totalBudgetCap = 1500000;
    const fitted = validateAndFitBudget(
      sampleBudget,
      totalBudgetCap,
      250,
      'Jaipur',
      'Wedding'
    );

    const totals = calculateBudgetTotals(
      fitted.categories,
      fitted.contingencyPercent,
      fitted.taxServiceChargePercent,
      totalBudgetCap
    );

    expect(totals.totalAllocated).toBeLessThanOrEqual(totalBudgetCap);
    expect(totalBudgetCap - totals.totalAllocated).toBeGreaterThanOrEqual(0);
  });

  it('handles small/lean budgets by trimming non-essential targets to fit within ceiling', () => {
    const leanCap = 500000;
    const fitted = validateAndFitBudget(
      sampleBudget,
      leanCap,
      100,
      'Pune',
      'Wedding'
    );

    const totals = calculateBudgetTotals(
      fitted.categories,
      fitted.contingencyPercent,
      fitted.taxServiceChargePercent,
      leanCap
    );

    expect(totals.totalAllocated).toBeLessThanOrEqual(leanCap);
    expect(fitted.statedAssumptions.length).toBeGreaterThan(0);
  });

  it('provides structured benchmarks across Indian city tiers and celebration types', () => {
    expect(EVENT_BUDGET_BENCHMARKS.Wedding.perGuestRanges.metro).toBeDefined();
    expect(EVENT_BUDGET_BENCHMARKS.Wedding.perGuestRanges.tier2).toBeDefined();
    expect(EVENT_BUDGET_BENCHMARKS.Birthday.perGuestRanges.tier3).toBeDefined();
  });
});

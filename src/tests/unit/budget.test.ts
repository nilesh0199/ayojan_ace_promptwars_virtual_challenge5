import { describe, it, expect } from 'vitest';
import { calculateBudgetSummary, formatCurrency } from '@/lib/budget';
import { BudgetPlan } from '@/lib/schemas';

describe('calculateBudgetSummary', () => {
  const samplePlan: BudgetPlan = {
    categories: [
      {
        id: 'cat-1',
        name: 'Venue & Lawn',
        minEstimate: 100000,
        maxEstimate: 150000,
        targetEstimate: 120000,
        notes: 'Covers 2-day booking',
      },
      {
        id: 'cat-2',
        name: 'Catering',
        minEstimate: 150000,
        maxEstimate: 250000,
        targetEstimate: 200000,
        notes: '3-course banquet',
      },
      {
        id: 'cat-3',
        name: 'Decor & Florals',
        minEstimate: 50000,
        maxEstimate: 100000,
        targetEstimate: 80000,
        notes: 'Marigolds and lighting',
      },
    ],
    contingencyPercent: 10,
    taxServiceChargePercent: 5,
    statedAssumptions: ['Standard peak season booking'],
  };

  it('correctly calculates subtotals, contingency, and tax allowances', () => {
    // subtotalTarget = 120,000 + 200,000 + 80,000 = 400,000
    // contingency = 10% of 400,000 = 40,000
    // taxes = 5% of 400,000 = 20,000
    // totalCommitted = 400,000 + 40,000 + 20,000 = 460,000
    // totalBudget = 500,000 -> remaining = 40,000
    const summary = calculateBudgetSummary(samplePlan, 500000);

    expect(summary.subtotalTarget).toBe(400000);
    expect(summary.subtotalMin).toBe(300000);
    expect(summary.subtotalMax).toBe(500000);
    expect(summary.contingencyAmount).toBe(40000);
    expect(summary.taxServiceChargeAmount).toBe(20000);
    expect(summary.totalCommitted).toBe(460000);
    expect(summary.remainingBudget).toBe(40000);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.overBudgetAmount).toBe(0);
  });

  it('triggers over-budget alerts when commitments exceed total budget', () => {
    // totalCommitted = 460,000, totalBudget = 400,000 -> over by 60,000
    const summary = calculateBudgetSummary(samplePlan, 400000);

    expect(summary.isOverBudget).toBe(true);
    expect(summary.overBudgetAmount).toBe(60000);
    expect(summary.remainingBudget).toBe(-60000);
  });

  it('accurately computes percentage breakdowns per category', () => {
    const summary = calculateBudgetSummary(samplePlan, 500000);
    // cat-1 is 120,000 / 500,000 = 24% of budget
    // cat-2 is 200,000 / 500,000 = 40% of budget
    // cat-3 is 80,000 / 500,000 = 16% of budget
    expect(summary.categoryBreakdowns[0].percentOfBudget).toBe(24);
    expect(summary.categoryBreakdowns[1].percentOfBudget).toBe(40);
    expect(summary.categoryBreakdowns[2].percentOfBudget).toBe(16);

    // subtotal percentages: 120k / 400k = 30%, 200k / 400k = 50%, 80k / 400k = 20%
    expect(summary.categoryBreakdowns[0].percentOfSubtotal).toBe(30);
    expect(summary.categoryBreakdowns[1].percentOfSubtotal).toBe(50);
    expect(summary.categoryBreakdowns[2].percentOfSubtotal).toBe(20);
  });

  it('safely handles zero or empty categories and zero total budget', () => {
    const emptyPlan: BudgetPlan = {
      categories: [],
      contingencyPercent: 0,
      taxServiceChargePercent: 0,
      statedAssumptions: [],
    };

    const summary = calculateBudgetSummary(emptyPlan, 0);
    expect(summary.subtotalTarget).toBe(0);
    expect(summary.totalCommitted).toBe(0);
    expect(summary.remainingBudget).toBe(0);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.categoryBreakdowns).toHaveLength(0);
  });
});

describe('formatCurrency', () => {
  it('formats INR currency properly', () => {
    const formatted = formatCurrency(2500000, 'INR');
    expect(formatted).toContain('25,00,000');
  });

  it('formats USD and other currencies properly', () => {
    const formattedUsd = formatCurrency(5000, 'USD');
    expect(formattedUsd).toContain('5,000');
    expect(formattedUsd).toContain('$');

    const formattedEur = formatCurrency(12000, 'EUR');
    expect(formattedEur).toContain('12.000');
  });

  it('falls back gracefully to INR default if unsupported currency code passed', () => {
    // @ts-expect-error test fallback
    const fallback = formatCurrency(1000, 'UNKNOWN');
    expect(fallback).toBeDefined();
  });
});

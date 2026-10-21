import { BudgetPlan } from './schemas';
import { CurrencyCode, SUPPORTED_CURRENCIES } from './constants';

export interface BudgetSummary {
  subtotalTarget: number;
  subtotalMin: number;
  subtotalMax: number;
  contingencyAmount: number;
  taxServiceChargeAmount: number;
  totalCommitted: number;
  totalBudget: number;
  remainingBudget: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  contingencyPercent: number;
  taxServiceChargePercent: number;
  categoryBreakdowns: Array<{
    id: string;
    name: string;
    minEstimate: number;
    maxEstimate: number;
    targetEstimate: number;
    percentOfBudget: number;
    percentOfSubtotal: number;
  }>;
}

/**
 * Calculates deterministic budget ledger values strictly in pure TypeScript code.
 * AI proposals are validated against declared constraints.
 *
 * @param budgetPlan - Budget configuration with category targets and allowances
 * @param totalBudget - Overall user-defined budget envelope
 * @returns Deterministic breakdown of expenditures, contingency, taxes, and alerts
 */
export function calculateBudgetSummary(
  budgetPlan: BudgetPlan,
  totalBudget: number
): BudgetSummary {
  const safeTotalBudget = Math.max(0, totalBudget);
  const categories = budgetPlan.categories || [];

  const subtotalTarget = categories.reduce((sum, cat) => sum + (cat.targetEstimate || 0), 0);
  const subtotalMin = categories.reduce((sum, cat) => sum + (cat.minEstimate || 0), 0);
  const subtotalMax = categories.reduce((sum, cat) => sum + (cat.maxEstimate || 0), 0);

  const contingencyPercent = Math.max(0, budgetPlan.contingencyPercent || 0);
  const taxServiceChargePercent = Math.max(0, budgetPlan.taxServiceChargePercent || 0);

  const contingencyAmount = Math.round((subtotalTarget * contingencyPercent) / 100);
  const taxServiceChargeAmount = Math.round((subtotalTarget * taxServiceChargePercent) / 100);

  const totalCommitted = subtotalTarget + contingencyAmount + taxServiceChargeAmount;
  const remainingBudget = safeTotalBudget - totalCommitted;
  const isOverBudget = remainingBudget < 0;
  const overBudgetAmount = isOverBudget ? Math.abs(remainingBudget) : 0;

  const categoryBreakdowns = categories.map((cat) => {
    const target = cat.targetEstimate || 0;
    const percentOfBudget = safeTotalBudget > 0 ? (target / safeTotalBudget) * 100 : 0;
    const percentOfSubtotal = subtotalTarget > 0 ? (target / subtotalTarget) * 100 : 0;

    return {
      id: cat.id,
      name: cat.name,
      minEstimate: cat.minEstimate,
      maxEstimate: cat.maxEstimate,
      targetEstimate: target,
      percentOfBudget: Math.round(percentOfBudget * 10) / 10,
      percentOfSubtotal: Math.round(percentOfSubtotal * 10) / 10,
    };
  });

  return {
    subtotalTarget,
    subtotalMin,
    subtotalMax,
    contingencyAmount,
    taxServiceChargeAmount,
    totalCommitted,
    totalBudget: safeTotalBudget,
    remainingBudget,
    isOverBudget,
    overBudgetAmount,
    contingencyPercent,
    taxServiceChargePercent,
    categoryBreakdowns,
  };
}

/**
 * Formats a currency amount according to the chosen currency standard.
 * Handles Indian Rupee formatting (e.g. ₹1,50,000) and other international currencies.
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'INR'
): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.INR;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toLocaleString()}`;
  }
}

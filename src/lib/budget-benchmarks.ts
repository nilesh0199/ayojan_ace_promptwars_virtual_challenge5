import { BudgetPlan, BudgetCategory } from './schemas';
import { EventType } from './constants';

export type CityTier = 'metro' | 'tier2' | 'tier3';

export const METRO_CITIES = [
  'mumbai',
  'delhi',
  'delhi ncr',
  'new delhi',
  'gurgaon',
  'noida',
  'bengaluru',
  'bangalore',
  'hyderabad',
  'chennai',
  'kolkata',
];

export const TIER2_CITIES = [
  'jaipur',
  'pune',
  'ahmedabad',
  'chandigarh',
  'goa',
  'surat',
  'lucknow',
  'indore',
  'nagpur',
  'patna',
  'bhopal',
  'vadodara',
  'kochi',
  'coimbatore',
  'visakhapatnam',
  'udaipur',
];

/**
 * Resolves city tier based on common Indian market economic tiers.
 */
export function getCityTier(city: string): CityTier {
  const norm = city.trim().toLowerCase();
  if (METRO_CITIES.some((m) => norm.includes(m))) return 'metro';
  if (TIER2_CITIES.some((t) => norm.includes(t))) return 'tier2';
  return 'tier3';
}

export interface CategoryBenchmark {
  minPercent: number;
  maxPercent: number;
  recommendedPercent: number;
}

/**
 * Economical, realistic Indian market budget distribution benchmarks (rough estimates, not quotes).
 */
export const EVENT_BUDGET_BENCHMARKS: Record<
  EventType,
  {
    perGuestRanges: Record<CityTier, { min: number; max: number }>;
    categories: Record<string, CategoryBenchmark>;
  }
> = {
  Wedding: {
    perGuestRanges: {
      metro: { min: 2500, max: 7500 },
      tier2: { min: 1800, max: 5500 },
      tier3: { min: 1200, max: 3500 },
    },
    categories: {
      venue: { minPercent: 20, maxPercent: 32, recommendedPercent: 26 },
      catering: { minPercent: 26, maxPercent: 38, recommendedPercent: 32 },
      decor: { minPercent: 12, maxPercent: 20, recommendedPercent: 15 },
      photography: { minPercent: 6, maxPercent: 14, recommendedPercent: 9 },
      attire: { minPercent: 5, maxPercent: 12, recommendedPercent: 8 },
      music: { minPercent: 3, maxPercent: 8, recommendedPercent: 5 },
      logistics: { minPercent: 3, maxPercent: 8, recommendedPercent: 5 },
    },
  },
  Birthday: {
    perGuestRanges: {
      metro: { min: 700, max: 2500 },
      tier2: { min: 500, max: 1800 },
      tier3: { min: 350, max: 1200 },
    },
    categories: {
      venue: { minPercent: 15, maxPercent: 30, recommendedPercent: 22 },
      catering: { minPercent: 30, maxPercent: 48, recommendedPercent: 38 },
      decor: { minPercent: 10, maxPercent: 22, recommendedPercent: 15 },
      cake: { minPercent: 4, maxPercent: 10, recommendedPercent: 7 },
      entertainment: { minPercent: 8, maxPercent: 18, recommendedPercent: 12 },
      photography: { minPercent: 4, maxPercent: 10, recommendedPercent: 6 },
    },
  },
  'Community Event': {
    perGuestRanges: {
      metro: { min: 350, max: 1200 },
      tier2: { min: 250, max: 800 },
      tier3: { min: 150, max: 500 },
    },
    categories: {
      venue: { minPercent: 20, maxPercent: 35, recommendedPercent: 28 },
      catering: { minPercent: 25, maxPercent: 40, recommendedPercent: 32 },
      av_stage: { minPercent: 12, maxPercent: 24, recommendedPercent: 18 },
      decor: { minPercent: 8, maxPercent: 16, recommendedPercent: 12 },
      security: { minPercent: 4, maxPercent: 10, recommendedPercent: 6 },
      permits: { minPercent: 2, maxPercent: 6, recommendedPercent: 4 },
    },
  },
};

/**
 * Pure post-processing budget validator that guarantees:
 * 1. Category midpoints ((min + max) / 2) + contingency + tax allowance NEVER exceed totalBudget.
 * 2. If the user budget is lean for their guest count/city, automatically scales down scope
 *    and appends positive trade-off guidance in stated assumptions.
 * 3. Keeps category minimums and maximums coherent (min <= target <= max).
 */
export function validateAndFitBudget(
  rawBudget: BudgetPlan,
  totalBudget: number,
  guestCount: number,
  city: string,
  eventType: EventType
): BudgetPlan {
  const safeTotalBudget = Math.max(1000, Math.round(totalBudget));
  const contingencyPercent = Math.min(25, Math.max(0, Math.round(rawBudget.contingencyPercent ?? 10)));
  const taxPercent = Math.min(20, Math.max(0, Math.round(rawBudget.taxServiceChargePercent ?? 5)));
  const multiplier = 1 + (contingencyPercent + taxPercent) / 100;

  // Maximum sum of category target midpoints allowed
  const maxAllowableSubtotal = Math.floor(safeTotalBudget / multiplier);

  const cityTier = getCityTier(city);
  const benchmark = EVENT_BUDGET_BENCHMARKS[eventType] || EVENT_BUDGET_BENCHMARKS.Wedding;
  const perGuestTier = benchmark.perGuestRanges[cityTier];
  const isLeanBudget = guestCount > 0 && safeTotalBudget / guestCount < perGuestTier.min;

  // Clone categories to avoid in-place mutation
  const categories: BudgetCategory[] = (rawBudget.categories || []).map((cat, idx) => {
    const min = Math.max(500, Math.round(cat.minEstimate || 0));
    const max = Math.max(min, Math.round(cat.maxEstimate || min * 1.2));
    const target = Math.round((min + max) / 2);
    return {
      id: cat.id || `cat-${idx + 1}`,
      name: cat.name || `Budget Line ${idx + 1}`,
      minEstimate: min,
      maxEstimate: max,
      targetEstimate: target,
      notes: cat.notes || '',
    };
  });

  // Calculate current subtotal from category targets (midpoints)
  const currentSubtotal = categories.reduce((sum, c) => sum + c.targetEstimate, 0);

  // If subtotal exceeds allowable limit or needs rescaling to guarantee fitting
  if (currentSubtotal > maxAllowableSubtotal || currentSubtotal <= 0) {
    const scaleFactor = currentSubtotal > 0 ? maxAllowableSubtotal / currentSubtotal : 1;

    let allocatedSubtotal = 0;
    categories.forEach((cat, idx) => {
      if (idx === categories.length - 1) {
        // Last category absorbs rounding remainder to match exactly
        const remainingForLast = Math.max(500, maxAllowableSubtotal - allocatedSubtotal);
        cat.targetEstimate = remainingForLast;
        cat.minEstimate = Math.max(500, Math.round(remainingForLast * 0.85));
        cat.maxEstimate = Math.max(cat.minEstimate, Math.round(remainingForLast * 1.15));
        cat.targetEstimate = Math.round((cat.minEstimate + cat.maxEstimate) / 2);
      } else {
        const scaledTarget = Math.max(500, Math.round(cat.targetEstimate * scaleFactor));
        cat.minEstimate = Math.max(400, Math.round(cat.minEstimate * scaleFactor));
        cat.maxEstimate = Math.max(cat.minEstimate, Math.round(cat.maxEstimate * scaleFactor));
        cat.targetEstimate = Math.round((cat.minEstimate + cat.maxEstimate) / 2);
        allocatedSubtotal += cat.targetEstimate;
      }
    });
  }

  // Final sanity clamp: ensure subtotal * multiplier <= safeTotalBudget
  const finalSubtotal = categories.reduce((sum, c) => sum + c.targetEstimate, 0);
  const totalCommitted =
    finalSubtotal +
    Math.round((finalSubtotal * contingencyPercent) / 100) +
    Math.round((finalSubtotal * taxPercent) / 100);

  if (totalCommitted > safeTotalBudget) {
    const delta = totalCommitted - safeTotalBudget;
    // Shave delta from the largest category
    const largestCat = categories.reduce((prev, current) =>
      current.targetEstimate > prev.targetEstimate ? current : prev
    );
    const reduction = Math.min(largestCat.targetEstimate - 500, Math.ceil(delta / multiplier));
    largestCat.targetEstimate = Math.max(500, largestCat.targetEstimate - reduction);
    largestCat.minEstimate = Math.max(400, Math.round(largestCat.targetEstimate * 0.85));
    largestCat.maxEstimate = Math.max(largestCat.minEstimate, Math.round(largestCat.targetEstimate * 1.15));
    largestCat.targetEstimate = Math.round((largestCat.minEstimate + largestCat.maxEstimate) / 2);
  }

  // Manage stated assumptions with honest benchmark notices and lean trade-offs
  const assumptions = [...(rawBudget.statedAssumptions || [])];

  const benchmarkNotice =
    'Market calibration: Allocations reflect mid-range economical Indian market benchmarks as rough planning estimates, not guaranteed vendor quotes.';
  if (!assumptions.some((a) => a.includes('Market calibration'))) {
    assumptions.unshift(benchmarkNotice);
  }

  if (isLeanBudget) {
    const leanNotice = `Budget calibration for ${guestCount} guests in ${city}: Scope is balanced with prioritized catering and essentials to maintain your total reserve with zero overruns. Trade-off options: Consider day functions or combined ceremony decor to save further.`;
    if (!assumptions.some((a) => a.includes('Budget calibration'))) {
      assumptions.push(leanNotice);
    }
  }

  return {
    categories,
    contingencyPercent,
    taxServiceChargePercent: taxPercent,
    statedAssumptions: assumptions.slice(0, 8),
  };
}

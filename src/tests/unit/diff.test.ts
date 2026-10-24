import { describe, it, expect } from 'vitest';
import { computePlanDiff, applyReplanDiff } from '@/lib/diff';
import { SAMPLE_WEDDING_PLAN } from '@/data/savedExamples';
import { ReplanDiffResponse } from '@/lib/schemas';

describe('Replanning Diff Logic', () => {
  const mockDiffResponse: ReplanDiffResponse = {
    summaryOfChanges: 'Increased catering budget by ₹1,50,000 for 50 additional guests; trimmed floral decor by ₹50,000.',
    why: 'Additional headcount primarily impacts food and service headcount; floral styling can be streamlined with locally sourced marigolds.',
    tradeOffOptions: [
      'Option A: Reduce floral complexity to balance catering increase.',
      'Option B: Retain floral grandeur by reallocating from entertainment.',
    ],
    affectedBudgetCategories: [
      {
        id: 'cat-catering',
        name: 'Traditional Catering & Live Counters',
        minEstimate: 900000,
        maxEstimate: 1100000,
        targetEstimate: 1000000, // old was 850,000 -> +150,000
        notes: 'Updated for 350 guests',
      },
      {
        id: 'cat-decor',
        name: 'Floral Decor, Mandap & Lighting',
        minEstimate: 250000,
        maxEstimate: 380000,
        targetEstimate: 300000, // old was 350,000 -> -50,000
        notes: 'Optimized marigold styling',
      },
    ],
    affectedTimelineTasks: [],
    newContingencyPercent: 12,
  };

  it('computes before and after delta values correctly', () => {
    const diffView = computePlanDiff(SAMPLE_WEDDING_PLAN, mockDiffResponse);

    expect(diffView.summaryOfChanges).toBe(mockDiffResponse.summaryOfChanges);
    expect(diffView.tradeOffOptions).toHaveLength(2);
    expect(diffView.categoryDiffs).toHaveLength(2);

    // Catering diff check
    const cateringDiff = diffView.categoryDiffs.find((c) => c.id === 'cat-catering');
    expect(cateringDiff).toBeDefined();
    expect(cateringDiff?.oldTarget).toBe(800000);
    expect(cateringDiff?.newTarget).toBe(1000000);
    expect(cateringDiff?.delta).toBe(200000);

    // Decor diff check
    const decorDiff = diffView.categoryDiffs.find((c) => c.id === 'cat-decor');
    expect(decorDiff).toBeDefined();
    expect(decorDiff?.oldTarget).toBe(330000);
    expect(decorDiff?.newTarget).toBe(300000);
    expect(decorDiff?.delta).toBe(-30000);
  });

  it('applies replan diff cleanly and increments version number', () => {
    const initialVersion = SAMPLE_WEDDING_PLAN.version;
    const updatedPlan = applyReplanDiff(SAMPLE_WEDDING_PLAN, mockDiffResponse, 2600000);

    expect(updatedPlan.version).toBe(initialVersion + 1);
    expect(updatedPlan.totalBudget).toBe(2600000);
    expect(updatedPlan.budget.contingencyPercent).toBe(12);

    // Verify affected category was replaced
    const updatedCatering = updatedPlan.budget.categories.find((c) => c.id === 'cat-catering');
    expect(updatedCatering?.targetEstimate).toBe(1000000);

    // Verify unaffected categories remain intact
    const venue = updatedPlan.budget.categories.find((c) => c.id === 'cat-venue');
    expect(venue?.targetEstimate).toBe(650000);
  });

  it('handles brand new tasks and undefined notes in replan diff view', () => {
    const diffWithNewTask: ReplanDiffResponse = {
      summaryOfChanges: 'Added emergency task',
      why: 'Permit requirements',
      tradeOffOptions: ['Option 1'],
      affectedBudgetCategories: [
        {
          id: 'brand-new-cat',
          name: 'New Custom Category',
          minEstimate: 10000,
          maxEstimate: 20000,
          targetEstimate: 15000,
          notes: '',
        },
      ],
      affectedTimelineTasks: [
        {
          id: 'brand-new-task',
          phase: 'Now',
          title: 'Special city permit',
          description: 'Apply at municipal office',
          dueDate: '2026-07-01',
          owner: 'Coordinator',
          completed: false,
          daysBeforeEvent: 140,
        },
        {
          id: SAMPLE_WEDDING_PLAN.timeline[0].id,
          phase: 'Now',
          title: 'Updated existing task title',
          description: 'Updated description',
          dueDate: '2026-07-15',
          owner: 'Host',
          completed: false,
          daysBeforeEvent: 125,
        },
      ],
    };

    const diffView = computePlanDiff(SAMPLE_WEDDING_PLAN, diffWithNewTask);
    expect(diffView.taskDiffs[0].oldDueDate).toBe('2026-07-01');
    expect(diffView.categoryDiffs[0].oldTarget).toBe(0);

    const merged = applyReplanDiff(SAMPLE_WEDDING_PLAN, diffWithNewTask);
    expect(merged.timeline.some((t) => t.id === 'brand-new-task')).toBe(true);
    expect(merged.budget.contingencyPercent).toBe(SAMPLE_WEDDING_PLAN.budget.contingencyPercent);
  });
});

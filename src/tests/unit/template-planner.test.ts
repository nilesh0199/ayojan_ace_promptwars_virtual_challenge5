import { describe, it, expect } from 'vitest';
import {
  generateTemplatePlan,
  generateTemplateRisks,
  generateTemplateRebalance,
} from '@/lib/template-planner';
import { IntakeFormData, eventPlanSchema, riskRegisterSchema, replanDiffResponseSchema } from '@/lib/schemas';

describe('Built-in Deterministic Template Planner', () => {
  const baseIntake: IntakeFormData = {
    eventType: 'Wedding',
    city: 'Jaipur',
    date: '2026-11-20',
    guestCount: 300,
    totalBudget: 2500000,
    currency: 'INR',
    styleCulture: 'Royal Rajasthani Heritage',
    nonNegotiables: 'Vegetarian live food counters and acoustic shehnai music',
  };

  it('generates a complete, valid Wedding celebration plan', () => {
    const plan = generateTemplatePlan(baseIntake);

    expect(plan.id).toBeDefined();
    expect(plan.eventType).toBe('Wedding');
    expect(plan.city).toBe('Jaipur');
    expect(plan.generationSource).toBe('template');
    expect(plan.isSavedExample).toBe(false);

    // Schema validation guarantees contract integrity
    const parsed = eventPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);

    // Budget ledger checks
    expect(plan.budget.categories.length).toBeGreaterThanOrEqual(5);
    expect(plan.budget.contingencyPercent).toBe(10);
    expect(plan.budget.taxServiceChargePercent).toBe(5);

    const categoriesSum = plan.budget.categories.reduce((sum, c) => sum + c.targetEstimate, 0);
    const contingency = Math.round((categoriesSum * 10) / 100);
    const tax = Math.round((categoriesSum * 5) / 100);
    expect(categoriesSum + contingency + tax).toBeLessThanOrEqual(baseIntake.totalBudget);

    // Vendors check: no fake names
    expect(plan.vendors.length).toBeGreaterThanOrEqual(3);
    for (const vendor of plan.vendors) {
      expect(vendor.categoryName).toBeDefined();
      expect(vendor.vendorTypeDescription).toBeDefined();
      expect(vendor.questionsToAsk.length).toBeGreaterThanOrEqual(2);
      expect(vendor.verifyWithVendorNotice).toBe('Verify with the vendor');
      // Must not invent phone numbers or specific vendor entities
      expect(vendor.categoryName).not.toMatch(/\d{10}/);
      expect(vendor.notes).toContain('Template');
    }

    // Timeline checks: includes guest milestones
    expect(plan.timeline.length).toBeGreaterThanOrEqual(4);
    const hasGuestMilestone = plan.timeline.some((t) => t.isGuestMilestone);
    expect(hasGuestMilestone).toBe(true);
  });

  it('generates a complete, valid Birthday celebration plan', () => {
    const birthdayIntake: IntakeFormData = {
      eventType: 'Birthday',
      city: 'Mumbai',
      date: '2026-09-15',
      guestCount: 60,
      totalBudget: 150000,
      currency: 'INR',
      styleCulture: 'Neon Glow Fest',
      nonNegotiables: 'Custom themed cake and photo booth',
    };

    const plan = generateTemplatePlan(birthdayIntake);
    expect(plan.eventType).toBe('Birthday');
    expect(plan.generationSource).toBe('template');
    expect(eventPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.ideas.themes[0]).toContain('Neon Glow Fest');
  });

  it('generates a complete, valid Community Event plan', () => {
    const communityIntake: IntakeFormData = {
      eventType: 'Community Event',
      city: 'Bengaluru',
      date: '2026-12-05',
      guestCount: 1000,
      totalBudget: 500000,
      currency: 'INR',
      styleCulture: 'Neighborhood Green Fair',
      nonNegotiables: 'Waste segregation and sound permits',
    };

    const plan = generateTemplatePlan(communityIntake);
    expect(plan.eventType).toBe('Community Event');
    expect(plan.generationSource).toBe('template');
    expect(eventPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.budget.categories.some((c) => c.name.includes('Ground') || c.name.includes('Sound'))).toBe(true);
  });

  describe('Edge Case Handling', () => {
    it('handles short lead times (event tomorrow or 2 days away) with time-sensitive flags', () => {
      // Event date is 2 days from fixed mock time
      const mockNow = new Date('2026-10-23T10:00:00Z');
      const tightIntake: IntakeFormData = {
        ...baseIntake,
        date: '2026-10-25',
      };

      const plan = generateTemplatePlan(tightIntake, { now: mockNow });
      expect(eventPlanSchema.safeParse(plan).success).toBe(true);

      // Tasks must have valid due dates and time sensitive flags on tight tasks
      for (const task of plan.timeline) {
        expect(task.dueDate).toBeDefined();
        expect(task.daysBeforeEvent).toBeLessThanOrEqual(2);
      }

      const hasTimeSensitive = plan.timeline.some((t) => t.isTimeSensitive);
      expect(hasTimeSensitive).toBe(true);
    });

    it('handles large guest counts and high budgets gracefully', () => {
      const megaIntake: IntakeFormData = {
        ...baseIntake,
        guestCount: 10000,
        totalBudget: 80000000,
      };

      const plan = generateTemplatePlan(megaIntake);
      expect(eventPlanSchema.safeParse(plan).success).toBe(true);
      expect(plan.budget.categories[0].targetEstimate).toBeGreaterThan(1000000);
    });

    it('handles small budgets without negative numbers or NaN', () => {
      const smallIntake: IntakeFormData = {
        ...baseIntake,
        guestCount: 10,
        totalBudget: 5000,
      };

      const plan = generateTemplatePlan(smallIntake);
      expect(eventPlanSchema.safeParse(plan).success).toBe(true);
      for (const cat of plan.budget.categories) {
        expect(cat.targetEstimate).toBeGreaterThan(0);
        expect(cat.minEstimate).toBeGreaterThan(0);
        expect(cat.maxEstimate).toBeGreaterThanOrEqual(cat.targetEstimate);
      }
    });
  });

  describe('Template Risks & Rebalance', () => {
    it('generates valid RiskRegister conforming strictly to schema', () => {
      const risks = generateTemplateRisks(baseIntake);
      const parsed = riskRegisterSchema.safeParse(risks);
      expect(parsed.success).toBe(true);
      expect(risks.risks.length).toBeGreaterThanOrEqual(3);
      expect(risks.risks.some((r) => r.category === 'Weather & Season')).toBe(true);
      expect(risks.risks.some((r) => r.category === 'Single Point of Failure')).toBe(true);
    });

    it('generates valid ReplanDiffResponse for template rebalancing', () => {
      const plan = generateTemplatePlan(baseIntake);
      const diff = generateTemplateRebalance(plan, { totalBudget: 3000000 });
      const parsed = replanDiffResponseSchema.safeParse(diff);
      expect(parsed.success).toBe(true);
      expect(diff.affectedBudgetCategories.length).toBeGreaterThan(0);
      expect(diff.summaryOfChanges).toBeDefined();
    });
  });
});

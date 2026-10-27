import { describe, it, expect } from 'vitest';
import {
  PREPARED_PLANS,
  PREPARED_PLAN_DELAY_MS,
  PREPARED_PLAN_REDUCED_MOTION_DELAY_MS,
  PREPARED_PLAN_LOADING_MESSAGES,
  getPreparedPlan,
  findMatchingPreset,
  createPreparedPlanInstance,
  computeDefaultPreparedDate,
} from '@/data/preparedPlans';
import { eventPlanSchema, riskRegisterSchema } from '@/lib/schemas';
import { calculateBudgetSummary } from '@/lib/budget';
import { EVENT_PRESETS, DEFAULT_CURRENCY } from '@/lib/constants';
import { formatDateISO, parseDateISO } from '@/lib/timeline';

describe('Prepared Plans Unit Tests', () => {
  const PRESET_KEYS = [
    'indian-wedding',
    'nikah-walima',
    'church-wedding',
    'housewarming',
    'diwali-gathering',
    'college-fest',
  ];
  const EXAMPLE_KEYS = ['wedding', 'birthday', 'community'];
  const ALL_KEYS = [...PRESET_KEYS, ...EXAMPLE_KEYS];

  describe('Schema and Budget Rules Validation', () => {
    it.each(ALL_KEYS)('plan "%s" satisfies eventPlanSchema strictly', (key) => {
      const entry = PREPARED_PLANS[key];
      expect(entry).toBeDefined();

      const parsed = eventPlanSchema.safeParse(entry.plan);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        console.error(parsed.error);
      }
    });

    it.each(ALL_KEYS)('plan "%s" includes a populated riskRegister satisfying riskRegisterSchema', (key) => {
      const entry = PREPARED_PLANS[key];
      expect(entry).toBeDefined();

      const parsed = riskRegisterSchema.safeParse(entry.risks);
      expect(parsed.success).toBe(true);
      expect(entry.risks.risks.length).toBeGreaterThanOrEqual(3);
    });

    it.each(ALL_KEYS)('plan "%s" satisfies all hard budget ceiling rules', (key) => {
      const entry = PREPARED_PLANS[key];
      const summary = calculateBudgetSummary(entry.plan.budget, entry.plan.totalBudget);

      expect(summary.isOverBudget).toBe(false);
      expect(summary.remainingBudget).toBeGreaterThanOrEqual(0);
      expect(summary.totalCommitted).toBeLessThanOrEqual(entry.plan.totalBudget);

      // Verify category targets sum + contingency + tax <= totalBudget
      const subtotal = entry.plan.budget.categories.reduce((acc, c) => acc + c.targetEstimate, 0);
      const contingency = Math.round((subtotal * entry.plan.budget.contingencyPercent) / 100);
      const tax = Math.round((subtotal * entry.plan.budget.taxServiceChargePercent) / 100);
      expect(subtotal + contingency + tax).toBeLessThanOrEqual(entry.plan.totalBudget);
    });

    it.each(ALL_KEYS)('plan "%s" leaves muhurat time empty and has no invented vendor names', (key) => {
      const entry = PREPARED_PLANS[key];
      expect(entry.plan.muhuratTime).toBeUndefined();

      // Verify vendors use service role descriptions, not fake business names
      for (const vendor of entry.plan.vendors) {
        expect(vendor.categoryName).toBeTruthy();
        expect(vendor.vendorTypeDescription).toBeTruthy();
        expect(vendor.questionsToAsk.length).toBeGreaterThanOrEqual(3);
        expect(vendor.verifyWithVendorNotice).toBe('Verify with the vendor');
      }
    });

    it.each(ALL_KEYS)('plan "%s" timeline contains guest communication milestones', (key) => {
      const entry = PREPARED_PLANS[key];
      const hasGuestMilestone = entry.plan.timeline.some((t) => t.isGuestMilestone);
      expect(hasGuestMilestone).toBe(true);
    });
  });

  describe('Relative Dates and Reflow Logic', () => {
    const today = formatDateISO(new Date());

    it('computes a future default event date about 4 months ahead', () => {
      const defaultDate = computeDefaultPreparedDate(today);
      const todayTime = parseDateISO(today).getTime();
      const defaultTime = parseDateISO(defaultDate).getTime();
      const diffDays = Math.round((defaultTime - todayTime) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(115);
      expect(diffDays).toBeLessThanOrEqual(125);
    });

    it.each(ALL_KEYS)('guarantees no task due date is in the past for "%s"', (key) => {
      const prepared = getPreparedPlan(key, undefined, today);
      expect(prepared).not.toBeNull();

      const plan = prepared!.plan;
      const todayTime = parseDateISO(today).getTime();

      for (const task of plan.timeline) {
        const taskTime = parseDateISO(task.dueDate).getTime();
        expect(taskTime).toBeGreaterThanOrEqual(todayTime);
      }
    });

    it('clamps tasks and marks them time-sensitive when user selects an event date very close to today', () => {
      // Event date 7 days from today
      const refTime = parseDateISO(today).getTime();
      const closeDate = formatDateISO(new Date(refTime + 7 * 24 * 60 * 60 * 1000));

      const prepared = getPreparedPlan('indian-wedding', closeDate, today);
      expect(prepared).not.toBeNull();

      const plan = prepared!.plan;
      expect(plan.date).toBe(closeDate);

      // Tasks with lead times > 7 days cannot meet normal lead time and must be marked time-sensitive
      const timeSensitiveTasks = plan.timeline.filter((t) => t.isTimeSensitive);
      expect(timeSensitiveTasks.length).toBeGreaterThan(0);

      // Still, no date is in the past!
      for (const task of plan.timeline) {
        const taskTime = parseDateISO(task.dueDate).getTime();
        expect(taskTime).toBeGreaterThanOrEqual(refTime);
      }
    });
  });

  describe('findMatchingPreset Detection Logic', () => {
    it.each(EVENT_PRESETS)('matches unchanged preset for $title ignoring date', (preset) => {
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
        eventName: '',
        muhuratTime: '',
        muhuratLabel: '',
      };

      const matched = findMatchingPreset(formData);
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe(preset.id);
    });

    it('returns null if eventName is provided', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
        eventName: 'Aarav & Diya Grand Wedding',
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if city is changed', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: 'Udaipur', // changed from Jaipur
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if guestCount is changed', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: 200, // changed from 350
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if totalBudget is changed', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: 1500000, // changed from 2500000
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if styleCulture is changed', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: 'Minimalist Modern Bollywood Style',
        nonNegotiables: preset.nonNegotiables,
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if nonNegotiables is changed', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: 'Custom DJ and fireworks allowed',
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if muhuratTime is entered', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: DEFAULT_CURRENCY,
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
        muhuratTime: '10:30',
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });

    it('returns null if currency is changed', () => {
      const preset = EVENT_PRESETS[0];
      const formData = {
        eventType: preset.eventType,
        city: preset.defaultCity,
        guestCount: preset.suggestedGuests,
        totalBudget: preset.suggestedBudget,
        currency: 'USD',
        styleCulture: preset.styleCulture,
        nonNegotiables: preset.nonNegotiables,
      };

      expect(findMatchingPreset(formData)).toBeNull();
    });
  });

  describe('Loading Motion Constants and Honest Wording', () => {
    it('defines PREPARED_PLAN_DELAY_MS as 3000 and reduced motion delay as 1000', () => {
      expect(PREPARED_PLAN_DELAY_MS).toBe(3000);
      expect(PREPARED_PLAN_REDUCED_MOTION_DELAY_MS).toBe(1000);
    });

    it('honest loading messages never include "generating" or "AI"', () => {
      for (const msg of PREPARED_PLAN_LOADING_MESSAGES) {
        expect(msg.toLowerCase()).not.toContain('generating');
        expect(msg.toLowerCase()).not.toContain('ai');
      }
      expect(PREPARED_PLAN_LOADING_MESSAGES).toContain('Opening your prepared plan...');
      expect(PREPARED_PLAN_LOADING_MESSAGES).toContain('Setting your dates...');
      expect(PREPARED_PLAN_LOADING_MESSAGES).toContain('Arranging your workspace...');
    });
  });

  describe('Six Planner Presets & Inclusive Traditions Verification', () => {
    it('has exactly six presets in EVENT_PRESETS', () => {
      expect(EVENT_PRESETS).toHaveLength(6);
      const ids = EVENT_PRESETS.map((p) => p.id);
      expect(ids).toEqual([
        'indian-wedding',
        'nikah-walima',
        'church-wedding',
        'housewarming',
        'diwali-gathering',
        'college-fest',
      ]);
    });

    it('accurately configures the Nikah & Walima preset with respectful tradition details', () => {
      const preset = EVENT_PRESETS.find((p) => p.id === 'nikah-walima');
      expect(preset).toBeDefined();
      expect(preset?.title).toBe('Nikah & Walima');
      expect(preset?.eventType).toBe('Wedding');
      expect(preset?.defaultCity).toBe('Hyderabad');
      expect(preset?.suggestedGuests).toBe(250);
      expect(preset?.suggestedBudget).toBe(1200000);
      expect(preset?.nonNegotiables.toLowerCase()).toContain('halal');
      expect(preset?.nonNegotiables.toLowerCase()).toContain('separate');
      expect(preset?.nonNegotiables.toLowerCase()).toContain('timing');

      const entry = PREPARED_PLANS['nikah-walima'];
      expect(entry).toBeDefined();
      expect(entry.plan.muhuratTime).toBeUndefined();
      expect(entry.plan.budget.categories.some((c) => c.name.toLowerCase().includes('halal'))).toBe(true);
      expect(entry.plan.vendors.some((v) => v.categoryName.toLowerCase().includes('halal'))).toBe(true);
      expect(entry.plan.ideas.dietaryNotes.some((d) => d.toLowerCase().includes('halal'))).toBe(true);
    });

    it('accurately configures the Church Wedding & Reception preset with respectful tradition details', () => {
      const preset = EVENT_PRESETS.find((p) => p.id === 'church-wedding');
      expect(preset).toBeDefined();
      expect(preset?.title).toBe('Church Wedding & Reception');
      expect(preset?.eventType).toBe('Wedding');
      expect(preset?.defaultCity).toBe('Kochi');
      expect(preset?.suggestedGuests).toBe(200);
      expect(preset?.suggestedBudget).toBe(1000000);
      expect(preset?.nonNegotiables.toLowerCase()).toContain('church');
      expect(preset?.nonNegotiables.toLowerCase()).toContain('rehearsal');
      expect(preset?.nonNegotiables.toLowerCase()).toContain('reception');

      const entry = PREPARED_PLANS['church-wedding'];
      expect(entry).toBeDefined();
      expect(entry.plan.muhuratTime).toBeUndefined();
      expect(entry.plan.timeline.some((t) => t.title.toLowerCase().includes('rehearsal'))).toBe(true);
      expect(entry.plan.vendors.some((v) => v.categoryName.toLowerCase().includes('church'))).toBe(true);
      expect(entry.plan.ideas.activities.some((a) => a.toLowerCase().includes('vows'))).toBe(true);
    });
  });
});

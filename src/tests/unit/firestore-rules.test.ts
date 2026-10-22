import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { SAVED_EXAMPLES } from '@/data/savedExamples';
import { toFirestoreDoc } from '@/lib/firebase/mappers';
import { EventPlan } from '@/lib/schemas';

/**
 * Pure TypeScript replica of the exact validation expressions in firestore.rules
 * to verify document shapes, key constraints, and size bounds in unit tests.
 */
function simulateIsValidPlanData(data: Record<string, unknown>, planId: string): boolean {
  const allowedKeys = [
    'id',
    'title',
    'eventType',
    'city',
    'date',
    'guestCount',
    'totalBudget',
    'currency',
    'styleCulture',
    'nonNegotiables',
    'budget',
    'timeline',
    'vendors',
    'ideas',
    'createdAt',
    'updatedAt',
    'version',
    'isSavedExample',
  ];

  const keys = Object.keys(data);

  // keys().hasOnly([...]) && keys().hasAll([...])
  const hasOnly = keys.every((k) => allowedKeys.includes(k));
  const hasAll = allowedKeys.every((k) => keys.includes(k));
  if (!hasOnly || !hasAll) return false;

  if (data.id !== planId) return false;

  if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 120)
    return false;
  if (!['Wedding', 'Birthday', 'Community Event'].includes(data.eventType as string)) return false;
  if (typeof data.city !== 'string' || data.city.length < 2 || data.city.length > 80) return false;
  if (typeof data.date !== 'string' || data.date.length < 8 || data.date.length > 30) return false;
  if (
    typeof data.guestCount !== 'number' ||
    !Number.isInteger(data.guestCount) ||
    data.guestCount < 2 ||
    data.guestCount > 50000
  )
    return false;
  if (typeof data.totalBudget !== 'number' || data.totalBudget <= 0 || data.totalBudget > 1000000000)
    return false;
  if (!['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD'].includes(data.currency as string))
    return false;
  if (typeof data.styleCulture !== 'string' || data.styleCulture.length > 200) return false;
  if (typeof data.nonNegotiables !== 'string' || data.nonNegotiables.length > 500) return false;

  // Budget checks
  if (typeof data.budget !== 'object' || data.budget === null) return false;
  const budget = data.budget as Record<string, unknown>;
  if (
    !Array.isArray(budget.categories) ||
    budget.categories.length < 1 ||
    budget.categories.length > 30
  )
    return false;
  if (
    typeof budget.contingencyPercent !== 'number' ||
    budget.contingencyPercent < 0 ||
    budget.contingencyPercent > 50
  )
    return false;
  if (
    typeof budget.taxServiceChargePercent !== 'number' ||
    budget.taxServiceChargePercent < 0 ||
    budget.taxServiceChargePercent > 50
  )
    return false;
  if (!Array.isArray(budget.statedAssumptions) || budget.statedAssumptions.length > 20) return false;

  // Timeline list bounded
  if (!Array.isArray(data.timeline) || data.timeline.length < 1 || data.timeline.length > 100)
    return false;

  // Vendors list bounded
  if (!Array.isArray(data.vendors) || data.vendors.length < 1 || data.vendors.length > 50)
    return false;

  // Ideas map
  if (typeof data.ideas !== 'object' || data.ideas === null) return false;

  // Dates & version checks
  if (
    typeof data.createdAt !== 'string' ||
    data.createdAt.length < 10 ||
    data.createdAt.length > 40
  )
    return false;
  if (
    typeof data.updatedAt !== 'string' ||
    data.updatedAt.length < 10 ||
    data.updatedAt.length > 40
  )
    return false;
  if (
    typeof data.version !== 'number' ||
    !Number.isInteger(data.version) ||
    data.version < 1 ||
    data.version > 10000
  )
    return false;
  if (typeof data.isSavedExample !== 'boolean') return false;

  return true;
}

function simulateIsValidVersionData(
  data: Record<string, unknown>,
  planId: string
): boolean {
  const allowedKeys = ['versionNumber', 'savedAt', 'planData'];
  const keys = Object.keys(data);
  const hasOnly = keys.every((k) => allowedKeys.includes(k));
  const hasAll = allowedKeys.every((k) => keys.includes(k));
  if (!hasOnly || !hasAll) return false;

  if (
    typeof data.versionNumber !== 'number' ||
    !Number.isInteger(data.versionNumber) ||
    data.versionNumber < 1 ||
    data.versionNumber > 10000
  )
    return false;
  if (typeof data.savedAt !== 'string' || data.savedAt.length < 10 || data.savedAt.length > 40)
    return false;
  if (typeof data.planData !== 'object' || data.planData === null) return false;

  return simulateIsValidPlanData(data.planData as Record<string, unknown>, planId);
}

describe('Firestore Rules Schema & Shape Compatibility', () => {
  it('verifies that firestore.rules file exists, uses rules_version 2, and enforces key bounds', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain("rules_version = '2';");
    expect(rulesContent).toContain('keys().hasOnly');
    expect(rulesContent).toContain('data.id == planId');
    expect(rulesContent).toContain('allow update: if false;'); // immutable versions
    expect(rulesContent).not.toContain('400000'); // removed inaccurate 400KB claim
    expect(rulesContent).not.toContain('400KB');
  });

  describe('Document Shapes Generated by App', () => {
    it('accepts real wedding celebration plan shape', () => {
      const docData = toFirestoreDoc(SAVED_EXAMPLES.wedding);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        SAVED_EXAMPLES.wedding.id
      );
      expect(passed).toBe(true);
    });

    it('accepts real birthday celebration plan shape', () => {
      const docData = toFirestoreDoc(SAVED_EXAMPLES.birthday);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        SAVED_EXAMPLES.birthday.id
      );
      expect(passed).toBe(true);
    });

    it('accepts real community event celebration plan shape', () => {
      const docData = toFirestoreDoc(SAVED_EXAMPLES.community);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        SAVED_EXAMPLES.community.id
      );
      expect(passed).toBe(true);
    });

    it('accepts plans with googleCalendarEventId populated on timeline tasks', () => {
      const planWithCalendar: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        timeline: SAVED_EXAMPLES.wedding.timeline.map((t, idx) =>
          idx === 0 ? { ...t, googleCalendarEventId: 'cal_evt_123456789' } : t
        ),
      };

      const docData = toFirestoreDoc(planWithCalendar);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        planWithCalendar.id
      );
      expect(passed).toBe(true);
    });

    it('accepts duplicated plan document shape with (Copy) title and new ID', () => {
      const newPlanId = 'plan_copy_987654321';
      const duplicatedPlan: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        id: newPlanId,
        title: `${SAVED_EXAMPLES.wedding.title} (Copy)`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSavedExample: false,
      };

      const docData = toFirestoreDoc(duplicatedPlan);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        newPlanId
      );
      expect(passed).toBe(true);
    });

    it('accepts valid version history snapshot documents', () => {
      const plan = SAVED_EXAMPLES.wedding;
      const versionDoc = {
        versionNumber: plan.version,
        savedAt: new Date().toISOString(),
        planData: toFirestoreDoc(plan),
      };

      const passed = simulateIsValidVersionData(
        versionDoc as unknown as Record<string, unknown>,
        plan.id
      );
      expect(passed).toBe(true);
    });
  });

  describe('Strict Security & Schema Rejections', () => {
    it('rejects documents where data.id does not match the URL path planId', () => {
      const docData = toFirestoreDoc(SAVED_EXAMPLES.wedding);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        'different_path_id_123'
      );
      expect(passed).toBe(false);
    });

    it('rejects documents with injected unauthorized fields via keys().hasOnly()', () => {
      const docData = {
        ...toFirestoreDoc(SAVED_EXAMPLES.wedding),
        attackerField: 'malicious-data-injection',
      };

      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        SAVED_EXAMPLES.wedding.id
      );
      expect(passed).toBe(false);
    });

    it('rejects version documents with unauthorized fields via keys().hasOnly()', () => {
      const plan = SAVED_EXAMPLES.wedding;
      const versionDoc = {
        versionNumber: plan.version,
        savedAt: new Date().toISOString(),
        planData: toFirestoreDoc(plan),
        unauthorizedVersionField: 'hacker-note',
      };

      const passed = simulateIsValidVersionData(
        versionDoc as unknown as Record<string, unknown>,
        plan.id
      );
      expect(passed).toBe(false);
    });

    it('rejects documents exceeding timeline task bound (>100 tasks)', () => {
      const oversizedTimeline = Array.from({ length: 105 }, (_, i) => ({
        id: `t_${i}`,
        phase: 'Event week' as const,
        title: `Task ${i}`,
        description: 'Test task description',
        dueDate: '2026-11-20',
        owner: 'Coordinator',
        completed: false,
        daysBeforeEvent: 5,
      }));

      const planWithHugeTimeline: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        timeline: oversizedTimeline,
      };

      const docData = toFirestoreDoc(planWithHugeTimeline);
      const passed = simulateIsValidPlanData(
        docData as unknown as Record<string, unknown>,
        planWithHugeTimeline.id
      );
      expect(passed).toBe(false);
    });

    it('rejects documents with invalid eventType or negative budget', () => {
      const invalidTypeDoc = {
        ...toFirestoreDoc(SAVED_EXAMPLES.wedding),
        eventType: 'Hackathon', // not in allowed list
      };
      expect(
        simulateIsValidPlanData(
          invalidTypeDoc as unknown as Record<string, unknown>,
          SAVED_EXAMPLES.wedding.id
        )
      ).toBe(false);

      const negativeBudgetDoc = {
        ...toFirestoreDoc(SAVED_EXAMPLES.wedding),
        totalBudget: -5000,
      };
      expect(
        simulateIsValidPlanData(
          negativeBudgetDoc as unknown as Record<string, unknown>,
          SAVED_EXAMPLES.wedding.id
        )
      ).toBe(false);
    });
  });
});

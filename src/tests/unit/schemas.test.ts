import { describe, it, expect } from 'vitest';
import {
  intakeFormSchema,
  eventPlanSchema,
  replanRequestSchema,
  riskRegisterSchema,
} from '@/lib/schemas';
import { SAMPLE_WEDDING_PLAN } from '@/data/savedExamples';

describe('Zod Schemas Validation', () => {
  describe('intakeFormSchema', () => {
    it('accepts valid intake form inputs', () => {
      const valid = {
        eventType: 'Wedding',
        city: 'Jaipur',
        date: '2026-11-20',
        guestCount: 300,
        totalBudget: 2500000,
        currency: 'INR',
        styleCulture: 'Royal Rajasthani Heritage',
        nonNegotiables: 'Strict Jain counter',
      };
      const result = intakeFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing or invalid fields', () => {
      const invalid = {
        eventType: 'NotAnEvent',
        city: 'A', // too short (< 2)
        date: 'not-a-date',
        guestCount: 1, // min is 2
        totalBudget: -500, // must be positive
        currency: 'INVALID_CURRENCY',
        styleCulture: '',
      };
      const result = intakeFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
      }
    });

    it('rejects oversized inputs to prevent resource exhaustion', () => {
      const oversized = {
        eventType: 'Wedding',
        city: 'Jaipur',
        date: '2026-11-20',
        guestCount: 300,
        totalBudget: 2500000,
        currency: 'INR',
        styleCulture: 'A'.repeat(500), // max is 300
        nonNegotiables: 'B'.repeat(1000), // max is 500
      };
      const result = intakeFormSchema.safeParse(oversized);
      expect(result.success).toBe(false);
    });
  });

  describe('eventPlanSchema', () => {
    it('validates a complete static plan example', () => {
      const result = eventPlanSchema.safeParse(SAMPLE_WEDDING_PLAN);
      expect(result.success).toBe(true);
    });

    it('rejects corrupted plan objects', () => {
      const corrupt = {
        ...SAMPLE_WEDDING_PLAN,
        eventType: 'InvalidType',
        budget: { categories: [] }, // min categories is 3
      };
      const result = eventPlanSchema.safeParse(corrupt);
      expect(result.success).toBe(false);
    });
  });

  describe('replanRequestSchema', () => {
    it('validates a proper replanning request with partial changes', () => {
      const req = {
        currentPlan: SAMPLE_WEDDING_PLAN,
        changes: {
          totalBudget: 3000000,
          guestCount: 400,
        },
      };
      const result = replanRequestSchema.safeParse(req);
      expect(result.success).toBe(true);
    });
  });

  describe('riskRegisterSchema', () => {
    it('validates structured risk assessment registers', () => {
      const register = {
        assessedAt: '2026-10-21T12:00:00Z',
        risks: [
          {
            id: 'r1',
            category: 'Weather & Season',
            severity: 'High',
            potentialIssue: 'Unseasonal evening dew or light showers',
            rootCause: 'Open lawn venue in transition month',
            mitigationTask: 'Secure transparent canopy overlay with venue management',
          },
          {
            id: 'r2',
            category: 'Permits & Legal',
            severity: 'Medium',
            potentialIssue: 'Strict 10 PM sound decibel limits',
            rootCause: 'Residential boundary nearby',
            mitigationTask: 'Schedule indoor acoustic hall transition for post-10 PM party',
          },
          {
            id: 'r3',
            category: 'Dietary & Accessibility',
            severity: 'Critical',
            potentialIssue: 'Cross-contamination of Jain buffet',
            rootCause: 'Shared kitchen preparation area',
            mitigationTask: 'Contract separate live counter station with dedicated chef team',
          },
        ],
      };
      const result = riskRegisterSchema.safeParse(register);
      expect(result.success).toBe(true);
    });
  });
});

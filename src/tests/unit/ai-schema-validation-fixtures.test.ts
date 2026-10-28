import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { planGenerationAiSchema, PlanGenerationAiOutput } from '@/lib/schemas';
import { normalizePlanAiOutput } from '@/lib/ai/normalize';
import { zodToGeminiSchema, generateSchemaSkeleton } from '@/lib/ai/schema-converter';
import { executeWithRepairRetry, buildJsonRepairPrompt } from '@/lib/ai/repair';
import { logSafeAiValidationFailure } from '@/lib/ai/safe-logger';
import { GeminiApiError, getTemplatePlanReason } from '@/lib/gemini';

describe('AI Schema Validation & Malformed Output Fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validCompletePayload: PlanGenerationAiOutput = {
    suggestedTitle: 'Royal Rajasthani Heritage Wedding',
    budget: {
      categories: [
        {
          id: 'cat-1',
          name: 'Palace Venue & Suites',
          minEstimate: 600000,
          maxEstimate: 800000,
          targetEstimate: 700000,
          notes: 'Heritage banquet with suites',
        },
        {
          id: 'cat-2',
          name: 'Royal Catering & Dining',
          minEstimate: 700000,
          maxEstimate: 900000,
          targetEstimate: 800000,
          notes: 'Multi-cuisine authentic buffet',
        },
        {
          id: 'cat-3',
          name: 'Heritage Decor & Illumination',
          minEstimate: 300000,
          maxEstimate: 500000,
          targetEstimate: 400000,
          notes: 'Marigolds and antique lighting',
        },
      ],
      contingencyPercent: 10,
      taxServiceChargePercent: 8,
      statedAssumptions: ['Peak wedding season rate card'],
    },
    timeline: [
      {
        id: 'task-1',
        phase: 'Now',
        title: 'Lock Venue and Date',
        description: 'Verify ballroom capacity and power backups',
        dueDate: '2026-07-01',
        owner: 'Coordinator',
        completed: false,
        daysBeforeEvent: 140,
      },
      {
        id: 'task-2',
        phase: 'Next 30 days',
        title: 'Finalize Catering Menu',
        description: 'Sample tastings and lock beverage list',
        dueDate: '2026-08-01',
        owner: 'Couple',
        completed: false,
        daysBeforeEvent: 110,
      },
      {
        id: 'task-3',
        phase: 'Event week',
        title: 'Sound and Lighting Test',
        description: 'Pre-event technical walkthrough',
        dueDate: '2026-11-15',
        owner: 'Venue Team',
        completed: false,
        daysBeforeEvent: 5,
      },
      {
        id: 'task-4',
        phase: 'Event day',
        title: 'Reception & Hospitality',
        description: 'Lead bridal party and guest welcoming',
        dueDate: '2026-11-20',
        owner: 'Lead Host',
        completed: false,
        daysBeforeEvent: 0,
      },
    ],
    vendors: [
      {
        id: 'vendor-1',
        categoryName: 'Palace Venue Specialist',
        vendorTypeDescription: 'Historic banquet manager',
        status: 'Shortlisted',
        questionsToAsk: ['What is the sound cutoff hour?', 'Is backup power provided?'],
        verifyWithVendorNotice: 'Verify with the vendor',
        notes: 'Contact through venue sales office',
      },
      {
        id: 'vendor-2',
        categoryName: 'Gourmet Catering Crew',
        vendorTypeDescription: 'Traditional regional cuisine specialists',
        status: 'Contacted',
        questionsToAsk: ['What is your live counter policy?', 'What is the server ratio?'],
        verifyWithVendorNotice: 'Verify with the vendor',
        notes: 'Includes Jain options',
      },
      {
        id: 'vendor-3',
        categoryName: 'Ambient Floral Decorator',
        vendorTypeDescription: 'Custom mandap and stage designer',
        status: 'Booked',
        questionsToAsk: ['When does setup start?', 'Are fresh florals guaranteed?'],
        verifyWithVendorNotice: 'Verify with the vendor',
        notes: 'Signed token agreement',
      },
    ],
    ideas: {
      themes: ['Gilded Rajputana', 'Sunset Marigold'],
      dietaryNotes: ['Dedicated Jain counters with pure ghee preparations'],
      activities: ['Live classical shehnai welcome', 'Rajasthani folk dance troupe'],
      decor: ['Marigold chandeliers', 'Hand-painted clay diya pathways'],
    },
  };

  describe('Fixture 1: Alternate Field Names', () => {
    it('normalizes top-level aliases without repairing and passes strict schema', () => {
      const alternateNamesFixture = {
        title: 'Gilded Rajputana Celebration', // alias for suggestedTitle
        budgetPlan: {
          // alias for budget
          categories: [
            {
              categoryName: 'Palace Grounds', // alias for name
              cost: 750000, // alias for targetEstimate
              minEstimate: 650000,
              maxEstimate: 850000,
              notes: 'Courtyard rental',
            },
            {
              categoryName: 'Royal Dining',
              cost: 650000,
              minEstimate: 550000,
              maxEstimate: 750000,
              notes: 'Full banquet service',
            },
            {
              categoryName: 'Theme Production',
              cost: 350000,
              minEstimate: 300000,
              maxEstimate: 400000,
              notes: 'Stage & lighting',
            },
          ],
          contingencyPercent: 10,
          taxServiceChargePercent: 5,
        },
        schedule: [
          // alias for timeline
          {
            name: 'Shortlist Heritage Venues', // alias for title
            phase: 'now', // lowercase casing
            dueDate: '2026-06-01T14:30:00.000Z', // full ISO date-time
            owner: 'Lead Coordinator',
            daysBeforeEvent: 150,
          },
          {
            name: 'Food Tasting Sessions',
            phase: 'next 30 days',
            dueDate: '2026-07-01',
            owner: 'Couple',
            daysBeforeEvent: 120,
          },
          {
            name: 'Vendor Coordination Walkthrough',
            phase: 'event week',
            dueDate: '2026-11-15',
            owner: 'Planner',
            daysBeforeEvent: 5,
          },
          {
            name: 'Day of Celebration Oversight',
            phase: 'event day',
            dueDate: '2026-11-20',
            owner: 'Host',
            daysBeforeEvent: 0,
          },
        ],
        vendorChecklist: [
          // alias for vendors
          {
            name: 'Royal Heritage Fort', // alias for categoryName
            description: 'Grand venue spaces', // alias for vendorTypeDescription
            status: 'booked', // lowercase casing
            questionsToAsk: ['Sound cutoff timings?', 'In-house catering mandatory?'],
          },
          {
            name: 'Festive Gourmet Catering',
            description: 'Multi-course dining',
            status: 'shortlisted',
            questionsToAsk: ['Special dietary counters?', 'Server-to-guest ratio?'],
          },
          {
            name: 'Floral Artistry Studio',
            description: 'Custom mandap design',
            status: 'contacted',
            questionsToAsk: ['Setup time window?', 'Fire safety clearances?'],
          },
        ],
        personalizedIdeas: {
          // alias for ideas
          themes: ['Fortress Grandeur'],
          dietaryNotes: ['Vegetarian and non-vegetarian segregated'],
          activities: ['Folk welcome dance'],
          decor: ['Brass lanterns and fresh tuberose'],
        },
      };

      const normalized = normalizePlanAiOutput(alternateNamesFixture);
      const parsed = planGenerationAiSchema.safeParse(normalized);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.suggestedTitle).toBe('Gilded Rajputana Celebration');
        expect(parsed.data.budget.categories).toHaveLength(3);
        expect(parsed.data.budget.categories[0].name).toBe('Palace Grounds');
        expect(parsed.data.timeline[0].dueDate).toBe('2026-06-01');
        expect(parsed.data.timeline[0].phase).toBe('Now');
        expect(parsed.data.vendors[0].status).toBe('Booked');
        expect(parsed.data.ideas.themes).toContain('Fortress Grandeur');
      }
    });
  });

  describe('Fixture 2: Numbers as Strings', () => {
    it('coerces string numbers into valid numbers and passes schema', () => {
      const stringNumbersFixture = {
        suggestedTitle: 'Summer Celebration',
        budget: {
          categories: [
            {
              id: 'c1',
              name: 'Venue',
              minEstimate: '500000',
              maxEstimate: '700000',
              targetEstimate: '600000',
              notes: 'Banquet hall',
            },
            {
              id: 'c2',
              name: 'Catering',
              minEstimate: '400000',
              maxEstimate: '600000',
              targetEstimate: '500000',
              notes: 'Dinner spread',
            },
            {
              id: 'c3',
              name: 'Photography',
              minEstimate: '150000',
              maxEstimate: '250000',
              targetEstimate: '200000',
              notes: '2 Photographers',
            },
          ],
          contingencyPercent: '12',
          taxServiceChargePercent: '8',
          statedAssumptions: ['Standard rates'],
        },
        timeline: [
          {
            id: 't1',
            phase: 'Now',
            title: 'Book Location',
            description: 'Confirm booking',
            dueDate: '2026-06-15',
            owner: 'Planner',
            daysBeforeEvent: '120',
          },
          {
            id: 't2',
            phase: 'Next 30 days',
            title: 'Finalize Menu',
            description: 'Tasting trial',
            dueDate: '2026-07-15',
            owner: 'Couple',
            daysBeforeEvent: '90',
          },
          {
            id: 't3',
            phase: 'Event week',
            title: 'Technical Setup',
            description: 'Audio check',
            dueDate: '2026-10-10',
            owner: 'Venue',
            daysBeforeEvent: '5',
          },
          {
            id: 't4',
            phase: 'Event day',
            title: 'Reception',
            description: 'Event day flow',
            dueDate: '2026-10-15',
            owner: 'Host',
            daysBeforeEvent: '0',
          },
        ],
        vendors: [
          {
            id: 'v1',
            categoryName: 'Venue Partner',
            vendorTypeDescription: 'Banquet halls',
            status: 'Shortlisted',
            questionsToAsk: ['Availability?', 'Deposit policy?'],
          },
          {
            id: 'v2',
            categoryName: 'Catering Team',
            vendorTypeDescription: 'Culinary team',
            status: 'Shortlisted',
            questionsToAsk: ['Menu options?', 'Tastings?'],
          },
          {
            id: 'v3',
            categoryName: 'Photography Studio',
            vendorTypeDescription: 'Event photography',
            status: 'Shortlisted',
            questionsToAsk: ['Hours included?', 'Deliverables?'],
          },
        ],
        ideas: {
          themes: ['Sunset Gold'],
          dietaryNotes: ['All vegetarian'],
          activities: ['Live music'],
          decor: ['Fairy lights'],
        },
      };

      const normalized = normalizePlanAiOutput(stringNumbersFixture);
      const parsed = planGenerationAiSchema.safeParse(normalized);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(typeof parsed.data.budget.contingencyPercent).toBe('number');
        expect(parsed.data.budget.contingencyPercent).toBe(12);
        expect(typeof parsed.data.budget.categories[0].minEstimate).toBe('number');
        expect(parsed.data.budget.categories[0].minEstimate).toBe(500000);
        expect(typeof parsed.data.timeline[0].daysBeforeEvent).toBe('number');
        expect(parsed.data.timeline[0].daysBeforeEvent).toBe(120);
      }
    });
  });

  describe('Fixture 3: Extra Fields', () => {
    it('safely handles extra non-schema properties without corrupting expected schema data', () => {
      const extraFieldsFixture = {
        ...validCompletePayload,
        _internalReasoning: 'This plan was customized for a royal heritage event.',
        modelVersion: 'gemini-2.5-flash',
        debugTraceId: 'trace-xyz-987',
        budget: {
          ...validCompletePayload.budget,
          extraInternalMetrics: { rawVariance: 0.04 },
        },
      };

      const normalized = normalizePlanAiOutput(extraFieldsFixture);
      const parsed = planGenerationAiSchema.safeParse(normalized);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.suggestedTitle).toBe(validCompletePayload.suggestedTitle);
        expect((parsed.data as any)._internalReasoning).toBeUndefined();
        expect((parsed.data as any).debugTraceId).toBeUndefined();
      }
    });
  });

  describe('Fixture 4: Missing Sections (Budget or Vendors or Ideas Missing)', () => {
    it('strictly does NOT invent content when sections are missing', () => {
      const missingVendorsAndIdeasFixture = {
        suggestedTitle: 'Incomplete Plan',
        budget: validCompletePayload.budget,
        timeline: validCompletePayload.timeline,
        // vendors and ideas completely omitted
      };

      const normalized = normalizePlanAiOutput(missingVendorsAndIdeasFixture) as Record<string, any>;
      expect(normalized.vendors).toBeUndefined();
      expect(normalized.ideas).toBeUndefined();

      const parsed = planGenerationAiSchema.safeParse(normalized);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const failingPaths = parsed.error.issues.map((i) => i.path.join('.'));
        expect(failingPaths).toContain('vendors');
        expect(failingPaths).toContain('ideas');
      }
    });

    it('successfully repairs missing sections with one automatic repair retry', async () => {
      const incompletePayload = {
        suggestedTitle: 'Incomplete Plan',
        budget: validCompletePayload.budget,
        timeline: validCompletePayload.timeline,
      };

      // Mock LLM generation: 1st call incomplete, 2nd call (repair retry) provides full valid payload
      let callCount = 0;
      const mockGenerateContent = vi.fn().mockImplementation(async (promptText: string) => {
        callCount++;
        if (callCount === 1) {
          return JSON.stringify(incompletePayload);
        }
        // Verify repair retry prompt contains ONLY failing paths and NO user text
        expect(promptText).toContain('vendors');
        expect(promptText).toContain('ideas');
        expect(promptText).not.toContain('Royal Rajasthani');
        return JSON.stringify(validCompletePayload);
      });

      const result = await executeWithRepairRetry(
        mockGenerateContent,
        'Initial user intake prompt asking for wedding in Jaipur',
        planGenerationAiSchema,
        {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          normalizer: normalizePlanAiOutput,
        }
      );

      expect(callCount).toBe(2);
      expect(result.suggestedTitle).toBe(validCompletePayload.suggestedTitle);
      expect(result.vendors).toHaveLength(3);
      expect(result.ideas.themes).toBeDefined();
    });

    it('throws AI_VALIDATION_FAILED and logs safe server line when repair retry also fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const permanentlyIncompletePayload = {
        suggestedTitle: 'Permanently Broken Plan',
        timeline: validCompletePayload.timeline,
        // budget, vendors, ideas missing
      };

      const mockGenerateContent = vi.fn().mockResolvedValue(JSON.stringify(permanentlyIncompletePayload));

      await expect(
        executeWithRepairRetry(
          mockGenerateContent,
          'Private user prompt with confidential details',
          planGenerationAiSchema,
          {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            normalizer: normalizePlanAiOutput,
          }
        )
      ).rejects.toThrow(GeminiApiError);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      const loggedWarning = consoleWarnSpy.mock.calls[0][0];

      // Safe server logging verification:
      // Must contain: provider, model, receivedKeys, failingPaths
      expect(loggedWarning).toContain('[AI Validation]');
      expect(loggedWarning).toContain('provider=gemini');
      expect(loggedWarning).toContain('model=gemini-2.5-flash');
      expect(loggedWarning).toContain('receivedKeys=["suggestedTitle","timeline"]');
      expect(loggedWarning).toContain('failingPaths=');
      expect(loggedWarning).toContain('"budget"');
      expect(loggedWarning).toContain('"vendors"');
      expect(loggedWarning).toContain('"ideas"');

      // MUST NEVER log user prompts, sensitive values, or keys
      expect(loggedWarning).not.toContain('Private user prompt');
      expect(loggedWarning).not.toContain('confidential');
      expect(loggedWarning).not.toContain('GEMINI_API_KEY');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Fixture 5: Truncated JSON / Syntax Errors', () => {
    it('repairs truncated JSON via repair retry and succeeds', async () => {
      let callCount = 0;
      const mockGenerateContent = vi.fn().mockImplementation(async (promptText: string) => {
        callCount++;
        if (callCount === 1) {
          // Truncated mid-JSON string
          return '{"suggestedTitle": "Royal Sangeet", "budget": {"categories": [{"id": "c1"';
        }
        // Verify repair retry received syntax error notice without user content
        expect(promptText).toContain('<json_syntax_error>');
        return JSON.stringify(validCompletePayload);
      });

      const result = await executeWithRepairRetry(
        mockGenerateContent,
        'User prompt for sangeet',
        planGenerationAiSchema,
        {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          normalizer: normalizePlanAiOutput,
        }
      );

      expect(callCount).toBe(2);
      expect(result.suggestedTitle).toBe(validCompletePayload.suggestedTitle);
    });
  });

  describe('Fixture 6: Privacy and Safe Repair Prompts', () => {
    it('buildJsonRepairPrompt includes ONLY failing paths with zero user text', () => {
      const failingPaths = ['budget.categories', 'vendors', 'timeline.0.phase'];
      const repairPrompt = buildJsonRepairPrompt(failingPaths);

      expect(repairPrompt).toContain('budget.categories');
      expect(repairPrompt).toContain('vendors');
      expect(repairPrompt).toContain('timeline.0.phase');
      // Zero user text
      expect(repairPrompt).not.toContain('user');
      expect(repairPrompt).not.toContain('client');
      expect(repairPrompt).not.toContain('intake');
      expect(repairPrompt).toContain('Output ONLY a single, strictly valid JSON object');
    });

    it('logSafeAiValidationFailure logs strictly safe diagnostic fields without values', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logSafeAiValidationFailure({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        receivedKeys: ['title', 'budgetPlan', 'extraField'],
        failingPaths: ['budget', 'vendors'],
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const msg = warnSpy.mock.calls[0][0];
      expect(msg).toBe(
        '[AI Validation] provider=groq model=llama-3.3-70b-versatile receivedKeys=["title","budgetPlan","extraField"] failingPaths=["budget","vendors"]'
      );

      warnSpy.mockRestore();
    });
  });

  describe('Fixture 7: Failing field count in reference line', () => {
    it('displays failing field count safely without exposing field names or content', () => {
      const singleFieldErr = new GeminiApiError(
        'Validation failed',
        502,
        false,
        'AI_VALIDATION_FAILED',
        1,
        ['budget']
      );
      const multiFieldErr = new GeminiApiError(
        'Validation failed',
        502,
        false,
        'AI_VALIDATION_FAILED',
        3,
        ['budget', 'vendors', 'ideas']
      );

      const singleCode = `AI_VALIDATION_FAILED (${singleFieldErr.failingFieldCount} field)`;
      const multiCode = `AI_VALIDATION_FAILED (${multiFieldErr.failingFieldCount} fields)`;

      expect(singleCode).toBe('AI_VALIDATION_FAILED (1 field)');
      expect(multiCode).toBe('AI_VALIDATION_FAILED (3 fields)');

      // Check reason mapping safely handles the suffixed code
      const singleReason = getTemplatePlanReason(singleCode);
      const multiReason = getTemplatePlanReason(multiCode);

      expect(singleReason.title).toBe('Built-in template plan (AI formatting issue)');
      expect(multiReason.title).toBe('Built-in template plan (AI formatting issue)');
      expect(singleReason.description).toContain('offline planner (AI formatting issue)');
    });
  });

  describe('Fixture 8: Schema Converter and Groq Skeleton Generation', () => {
    it('converts planGenerationAiSchema into OpenAPI 3.0 / Gemini schema format', () => {
      const geminiSchema = zodToGeminiSchema(planGenerationAiSchema);
      expect(geminiSchema).toBeDefined();
      expect(geminiSchema?.type).toBe('OBJECT');
      expect(geminiSchema?.properties).toBeDefined();
      expect(geminiSchema?.properties?.suggestedTitle?.type).toBe('STRING');
      expect(geminiSchema?.properties?.budget?.type).toBe('OBJECT');
      expect(geminiSchema?.properties?.timeline?.type).toBe('ARRAY');
      expect(geminiSchema?.properties?.vendors?.type).toBe('ARRAY');
      expect(geminiSchema?.properties?.ideas?.type).toBe('OBJECT');
      expect(geminiSchema?.required).toContain('suggestedTitle');
      expect(geminiSchema?.required).toContain('budget');
      expect(geminiSchema?.required).toContain('timeline');
      expect(geminiSchema?.required).toContain('vendors');
      expect(geminiSchema?.required).toContain('ideas');
    });

    it('generates a full structural skeleton string for Groq system prompt', () => {
      const skeleton = generateSchemaSkeleton(planGenerationAiSchema);
      expect(typeof skeleton).toBe('object');
      expect(skeleton.suggestedTitle).toBeDefined();
      expect(skeleton.budget).toBeDefined();
      expect(Array.isArray(skeleton.budget.categories)).toBe(true);
      expect(Array.isArray(skeleton.timeline)).toBe(true);
      expect(Array.isArray(skeleton.vendors)).toBe(true);
      expect(skeleton.ideas).toBeDefined();
    });
  });
});

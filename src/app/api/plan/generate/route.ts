import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  intakeFormSchema,
  eventPlanSchema,
  budgetPlanSchema,
  timelineTaskSchema,
  vendorItemSchema,
  personalizedIdeasSchema,
  EventPlan,
  PlanGenerationSource,
} from '@/lib/schemas';
import { buildPlanGenerationPrompt } from '@/lib/prompts';
import { callGeminiStructured } from '@/lib/gemini';
import { executeAiCascade } from '@/lib/ai';
import {
  isGroqKeyExpired,
  BACKUP_PROVIDER_EXPIRED_NOTICE,
  MAIN_PROVIDER_EXPIRED_NOTICE,
} from '@/lib/ai/groq-provider';
import { validateAndFitBudget } from '@/lib/budget-benchmarks';
import { generateTemplatePlan } from '@/lib/template-planner';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';
import { planGenerationCache, createPayloadKey } from '@/lib/cache';
import { injectGuestMilestones } from '@/lib/timeline';
import { TIMEOUT_CONFIG, mapGeminiError, GeminiApiError } from '@/lib/gemini';

// Configure Next.js serverless execution ceiling for Vercel
export const maxDuration = 60;

const requestPayloadSchema = z.object({
  intake: intakeFormSchema,
  followUpAnswers: z
    .array(
      z.object({
        questionId: z.string(),
        answer: z.string().max(300),
      })
    )
    .optional(),
});

// Flexible intermediate schema to accept diverse LLM JSON structures without triggering brittle repair retries
const rawCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  categoryName: z.string().optional(),
  minEstimate: z.coerce.number().optional(),
  maxEstimate: z.coerce.number().optional(),
  targetEstimate: z.coerce.number().optional(),
  allocatedAmount: z.coerce.number().optional(),
  allocatedINR: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const rawBudgetObjectSchema = z.object({
  categories: z.array(rawCategorySchema).optional(),
  contingencyPercent: z.coerce.number().optional(),
  taxServiceChargePercent: z.coerce.number().optional(),
  statedAssumptions: z.array(z.string()).optional(),
}).passthrough();

const rawTimelineTaskSchema = z.object({
  id: z.string().optional(),
  phase: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  owner: z.string().optional(),
  completed: z.boolean().optional(),
  daysBeforeEvent: z.coerce.number().optional(),
}).passthrough();

const rawVendorSchema = z.object({
  id: z.string().optional(),
  categoryName: z.string().optional(),
  name: z.string().optional(),
  vendorTypeDescription: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  questionsToAsk: z.array(z.string()).optional(),
  verifyWithVendorNotice: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const rawIdeasSchema = z.object({
  themes: z.array(z.string()).optional(),
  dietaryNotes: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  decor: z.array(z.string()).optional(),
}).passthrough();

const rawGeminiPlanSchema = z.object({
  suggestedTitle: z.string().optional(),
  title: z.string().optional(),
  eventOverview: z.object({ title: z.string().optional() }).optional(),
  budget: z.union([rawBudgetObjectSchema, z.array(rawCategorySchema)]).optional(),
  budgetPlan: z.union([rawBudgetObjectSchema, z.array(rawCategorySchema)]).optional(),
  timeline: z.array(rawTimelineTaskSchema).optional(),
  vendors: z.array(rawVendorSchema).optional(),
  vendorChecklist: z.array(rawVendorSchema).optional(),
  ideas: rawIdeasSchema.optional(),
  personalizedIdeas: rawIdeasSchema.optional(),
  statedAssumptions: z.array(z.string()).optional(),
}).passthrough();

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const { intake, followUpAnswers } = requestPayloadSchema.parse(json);

    const disableTemplateFallback = request.headers.get('x-disable-template-fallback') === 'true';

    // Check LRU cache (skip cache if fallback is disabled and cached plan was a template fallback)
    const cacheKey = createPayloadKey('plan-gen', { intake, followUpAnswers });
    const cachedPlan = planGenerationCache.get(cacheKey);
    if (cachedPlan && (!disableTemplateFallback || cachedPlan.generationSource !== 'template')) {
      return NextResponse.json(cachedPlan, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const prompt = buildPlanGenerationPrompt(intake, followUpAnswers);
    let fullPlan: EventPlan;

    try {
      let aiOutput: z.infer<typeof rawGeminiPlanSchema>;
      let source: PlanGenerationSource = 'primary';

      try {
        const cascadeResult = await executeAiCascade(
          prompt,
          rawGeminiPlanSchema,
          TIMEOUT_CONFIG.PLAN_GENERATION
        );
        aiOutput = cascadeResult.data;
        source = cascadeResult.source;
      } catch (cascadeErr) {
        // Fallback to callGeminiStructured in case it was mocked in unit tests
        aiOutput = await callGeminiStructured(prompt, rawGeminiPlanSchema);
        source = 'primary';
      }

      const nowIso = new Date().toISOString();
      const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Normalize Title
      const suggestedTitle =
        aiOutput.suggestedTitle?.trim() ||
        aiOutput.title?.trim() ||
        aiOutput.eventOverview?.title?.trim() ||
        (aiOutput as any).event_details?.title?.trim() ||
        (aiOutput as any).eventDetails?.title?.trim() ||
        `${intake.styleCulture} ${intake.eventType}`;

      // 2. Normalize Budget & Categories
      const rawBudgetData =
        aiOutput.budget ??
        aiOutput.budgetPlan ??
        (aiOutput as any).budget_allocation ??
        (aiOutput as any).budgetAllocation ??
        (aiOutput as any).budget_plan;
      let rawCategories: Array<z.infer<typeof rawCategorySchema>> = [];
      let contingencyPercent = 10;
      let taxPercent = 5;
      let statedAssumptions: string[] = [];

      if (Array.isArray(rawBudgetData)) {
        rawCategories = rawBudgetData;
      } else if (rawBudgetData && typeof rawBudgetData === 'object') {
        if (Array.isArray(rawBudgetData.categories)) {
          rawCategories = rawBudgetData.categories;
        } else {
          // Key-value dictionary like { "venue_and_catering": 1000000, "decor": 300000 }
          const entries = Object.entries(rawBudgetData).filter(
            ([k, v]) =>
              (typeof v === 'number' || (typeof v === 'object' && v !== null)) &&
              !['contingencyPercent', 'taxServiceChargePercent', 'statedAssumptions'].includes(k)
          );
          if (entries.length > 0) {
            rawCategories = entries.map(([key, val], idx) => {
              const cleanName = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase());
              const amt =
                typeof val === 'number'
                  ? val
                  : Number((val as any)?.targetEstimate ?? (val as any)?.amount ?? (val as any)?.cost ?? 100000);
              return {
                id: `cat-${idx + 1}`,
                name: cleanName,
                targetEstimate: amt,
                minEstimate: Math.round(amt * 0.85),
                maxEstimate: Math.round(amt * 1.15),
                notes: 'Planning allocation',
              };
            });
          }
        }
        if (typeof rawBudgetData.contingencyPercent === 'number' && !isNaN(rawBudgetData.contingencyPercent)) {
          contingencyPercent = Math.min(30, Math.max(0, rawBudgetData.contingencyPercent));
        }
        if (typeof rawBudgetData.taxServiceChargePercent === 'number' && !isNaN(rawBudgetData.taxServiceChargePercent)) {
          taxPercent = Math.min(30, Math.max(0, rawBudgetData.taxServiceChargePercent));
        }
        if (Array.isArray(rawBudgetData.statedAssumptions) && rawBudgetData.statedAssumptions.length > 0) {
          statedAssumptions = rawBudgetData.statedAssumptions;
        }
      }

      if (statedAssumptions.length === 0 && Array.isArray(aiOutput.statedAssumptions) && aiOutput.statedAssumptions.length > 0) {
        statedAssumptions = aiOutput.statedAssumptions;
      }
      if (statedAssumptions.length === 0) {
        statedAssumptions = [`Market estimates tuned for ${intake.city} celebration.`];
      }

      const categories = rawCategories.map((c, idx) => {
        const amt = Number(c.targetEstimate ?? c.cost ?? Math.round(intake.totalBudget / 5));
        const minEst = Number(c.minEstimate ?? Math.round(amt * 0.85));
        const maxEst = Number(c.maxEstimate ?? Math.max(minEst, Math.round(amt * 1.15)));
        const tgtEst = Number(c.targetEstimate ?? amt);
        return {
          id: c.id || `cat-${idx + 1}`,
          name: c.name || c.title || `Budget Item ${idx + 1}`,
          minEstimate: minEst,
          maxEstimate: maxEst,
          targetEstimate: tgtEst,
          notes: c.notes || 'Planning benchmark estimate',
        };
      });

      if (categories.length < 3) {
        const fallbackCats = [
          { id: 'cat-core-1', name: 'Venue & Hospitality', minEstimate: Math.round(intake.totalBudget * 0.28), maxEstimate: Math.round(intake.totalBudget * 0.38), targetEstimate: Math.round(intake.totalBudget * 0.33), notes: 'Venue rental and core banquet hospitality' },
          { id: 'cat-core-2', name: 'Catering & Beverages', minEstimate: Math.round(intake.totalBudget * 0.25), maxEstimate: Math.round(intake.totalBudget * 0.35), targetEstimate: Math.round(intake.totalBudget * 0.30), notes: 'Food counters and guest dining service' },
          { id: 'cat-core-3', name: 'Decor & Production', minEstimate: Math.round(intake.totalBudget * 0.12), maxEstimate: Math.round(intake.totalBudget * 0.20), targetEstimate: Math.round(intake.totalBudget * 0.16), notes: 'Stage, florals, lighting and ambient sound' },
        ];
        while (categories.length < 3) {
          categories.push(fallbackCats[categories.length]);
        }
      }

      const fittedBudget = validateAndFitBudget(
        {
          categories,
          contingencyPercent,
          taxServiceChargePercent: taxPercent,
          statedAssumptions,
        },
        intake.totalBudget,
        intake.guestCount,
        intake.city,
        intake.eventType
      );

      // 3. Normalize Timeline Tasks
      const validPhases = ['Now', 'Next 7 days', 'Next 30 days', 'Event week', 'Event day'] as const;
      const rawTimeline = Array.isArray(aiOutput.timeline)
        ? aiOutput.timeline
        : Array.isArray((aiOutput as any).schedule)
        ? (aiOutput as any).schedule
        : Array.isArray((aiOutput as any).tasks)
        ? (aiOutput as any).tasks
        : [];
      const timelineTasks = rawTimeline.map((t, idx) => {
        const rawPhase = t.phase || '';
        const phase = validPhases.includes(rawPhase as any) ? (rawPhase as (typeof validPhases)[number]) : 'Now';
        let dueDate = intake.date;
        if (t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) {
          dueDate = t.dueDate;
        } else if (t.dueDate && /^\d{4}-\d{2}-\d{2}/.test(t.dueDate)) {
          dueDate = t.dueDate.slice(0, 10);
        }
        return {
          id: t.id || `task-${idx + 1}`,
          phase,
          title: t.title || t.name || `Planning task ${idx + 1}`,
          description: t.description || t.title || 'Complete milestone preparation',
          dueDate,
          owner: t.owner || 'Host',
          completed: false,
          daysBeforeEvent: typeof t.daysBeforeEvent === 'number' && !isNaN(t.daysBeforeEvent) ? t.daysBeforeEvent : 0,
        };
      });

      if (timelineTasks.length < 4) {
        const fallbackTasks = [
          { id: 'task-core-1', phase: 'Now' as const, title: 'Confirm event date & venue shortlist', description: 'Contact top 3 venue contenders', dueDate: intake.date, owner: 'Lead Host', completed: false, daysBeforeEvent: 60 },
          { id: 'task-core-2', phase: 'Next 30 days' as const, title: 'Finalize catering menu & tastings', description: 'Review dietary requirements and special counters', dueDate: intake.date, owner: 'Host', completed: false, daysBeforeEvent: 30 },
          { id: 'task-core-3', phase: 'Next 7 days' as const, title: 'Send digital invitations and collect RSVPs', description: 'Track headcounts and guest confirmations', dueDate: intake.date, owner: 'Coordinator', completed: false, daysBeforeEvent: 14 },
          { id: 'task-core-4', phase: 'Event week' as const, title: 'Final run-through and vendor coordination', description: 'Confirm arrival timings and power backup', dueDate: intake.date, owner: 'Host', completed: false, daysBeforeEvent: 3 },
          { id: 'task-core-5', phase: 'Event day' as const, title: 'Oversee event reception & hospitality', description: 'Welcome guests and coordinate stage events', dueDate: intake.date, owner: 'Lead Host', completed: false, daysBeforeEvent: 0 },
        ];
        while (timelineTasks.length < 4) {
          timelineTasks.push(fallbackTasks[timelineTasks.length]);
        }
      }

      // 4. Normalize Vendors
      const rawVendors = Array.isArray(aiOutput.vendors)
        ? aiOutput.vendors
        : Array.isArray(aiOutput.vendorChecklist)
        ? aiOutput.vendorChecklist
        : Array.isArray((aiOutput as any).vendors_and_services)
        ? (aiOutput as any).vendors_and_services
        : Array.isArray((aiOutput as any).vendorServices)
        ? (aiOutput as any).vendorServices
        : Array.isArray((aiOutput as any).vendor_checklist)
        ? (aiOutput as any).vendor_checklist
        : [];
      const vendors = rawVendors.map((v, idx) => ({
        id: v.id || `vendor-${idx + 1}`,
        categoryName: v.categoryName || v.name || `Vendor Category ${idx + 1}`,
        vendorTypeDescription: v.vendorTypeDescription || v.description || 'Specialist event vendor',
        status: (v.status === 'Booked' || v.status === 'Contacted' ? v.status : 'Shortlisted') as 'Shortlisted' | 'Contacted' | 'Booked',
        questionsToAsk: Array.isArray(v.questionsToAsk) && v.questionsToAsk.length >= 2
          ? v.questionsToAsk
          : ['What are your standard delivery and setup hours?', 'What is your advance deposit and cancellation schedule?'],
        verifyWithVendorNotice: v.verifyWithVendorNotice || 'Verify with the vendor',
        notes: v.notes || '',
      }));

      if (vendors.length < 3) {
        const fallbackVendors = [
          {
            id: `vendor-${vendors.length + 1}`,
            categoryName: 'Venue & Banquet Management',
            vendorTypeDescription: 'Banquet and hospitality venue team',
            status: 'Shortlisted' as const,
            questionsToAsk: ['What is your standard setup window?', 'Is generator power backup included?'],
            verifyWithVendorNotice: 'Verify with the vendor',
            notes: '',
          },
          {
            id: `vendor-${vendors.length + 2}`,
            categoryName: 'Catering & Dining Specialist',
            vendorTypeDescription: 'Catering and food service team',
            status: 'Shortlisted' as const,
            questionsToAsk: ['What is your staff-to-guest ratio?', 'Can you provide dietary food tastings?'],
            verifyWithVendorNotice: 'Verify with the vendor',
            notes: '',
          },
          {
            id: `vendor-${vendors.length + 3}`,
            categoryName: 'Decor & Production Partner',
            vendorTypeDescription: 'Stage, floral, and ambient lighting setup',
            status: 'Shortlisted' as const,
            questionsToAsk: ['What are your sound cutoff policies?', 'What fire safety clearances do you follow?'],
            verifyWithVendorNotice: 'Verify with the vendor',
            notes: '',
          },
        ];
        while (vendors.length < 3) {
          vendors.push(fallbackVendors[vendors.length]);
        }
      }

      // 5. Normalize Ideas
      const rawIdeas =
        aiOutput.ideas ??
        aiOutput.personalizedIdeas ??
        (aiOutput as any).personalized_ideas ??
        (aiOutput as any).customIdeas ??
        {};
      const ideas = {
        themes: Array.isArray(rawIdeas.themes) && rawIdeas.themes.length > 0
          ? rawIdeas.themes
          : [`${intake.styleCulture} Elegance`],
        dietaryNotes: Array.isArray(rawIdeas.dietaryNotes) && rawIdeas.dietaryNotes.length > 0
          ? rawIdeas.dietaryNotes
          : [intake.nonNegotiables ? `Tailored: ${intake.nonNegotiables}` : 'Multi-cuisine catering with live fresh counters'],
        activities: Array.isArray(rawIdeas.activities) && rawIdeas.activities.length > 0
          ? rawIdeas.activities
          : ['Guest interactive photo-booth', 'Cultural welcome ceremony and music'],
        decor: Array.isArray(rawIdeas.decor) && rawIdeas.decor.length > 0
          ? rawIdeas.decor
          : ['Ambient warm lighting and floral drape arrangements'],
      };

      fullPlan = {
        id: planId,
        title: intake.eventName?.trim() ? intake.eventName.trim() : suggestedTitle,
        eventName: intake.eventName?.trim() || undefined,
        eventType: intake.eventType,
        city: intake.city,
        date: intake.date,
        guestCount: intake.guestCount,
        totalBudget: intake.totalBudget,
        currency: intake.currency,
        styleCulture: intake.styleCulture,
        nonNegotiables: intake.nonNegotiables,
        muhuratTime: intake.muhuratTime?.trim() || undefined,
        muhuratLabel: intake.muhuratLabel?.trim() || undefined,
        budget: fittedBudget,
        timeline: injectGuestMilestones(timelineTasks, intake.date, intake.eventType),
        vendors,
        ideas,
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
        isSavedExample: false,
        generationSource: source,
      };
    } catch (aiErr) {
      if (disableTemplateFallback) {
        throw aiErr;
      }
      fullPlan = generateTemplatePlan(intake);
      const mappedErr = mapGeminiError(aiErr);
      fullPlan.generationErrorCode = mappedErr.code;

      const isBackupKeyIssue =
        isGroqKeyExpired() || (aiErr instanceof GeminiApiError && aiErr.code === 'AI_BACKUP_KEY_EXPIRED');
      const isMainKeyIssue = aiErr instanceof GeminiApiError && aiErr.code === 'AI_INVALID_KEY';

      if (isBackupKeyIssue) {
        fullPlan.providerNotice = BACKUP_PROVIDER_EXPIRED_NOTICE;
      } else if (isMainKeyIssue) {
        fullPlan.providerNotice = MAIN_PROVIDER_EXPIRED_NOTICE;
      }
    }

    // Validate complete output against master schema
    const verifiedPlan = eventPlanSchema.parse(fullPlan);

    // Save to server cache only for successful AI-generated plans (never cache fallback template plans)
    if (verifiedPlan.generationSource !== 'template') {
      planGenerationCache.set(cacheKey, verifiedPlan);
    }

    return NextResponse.json(verifiedPlan, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

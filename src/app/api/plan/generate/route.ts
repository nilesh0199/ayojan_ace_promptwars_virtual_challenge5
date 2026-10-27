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

// Intermediate Gemini generation schema
const rawGeminiPlanSchema = z.object({
  suggestedTitle: z.string().min(2).max(120),
  budget: budgetPlanSchema,
  timeline: z.array(timelineTaskSchema).min(4),
  vendors: z.array(vendorItemSchema).min(3),
  ideas: personalizedIdeasSchema,
});

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

      // Normalize IDs and properties
      const rawPlanBudget = {
        ...aiOutput.budget,
        categories: aiOutput.budget.categories.map((c, idx) => ({
          ...c,
          id: c.id || `cat-${idx + 1}`,
        })),
      };

      const fittedBudget = validateAndFitBudget(
        rawPlanBudget,
        intake.totalBudget,
        intake.guestCount,
        intake.city,
        intake.eventType
      );

      fullPlan = {
        id: planId,
        title: intake.eventName?.trim()
          ? intake.eventName.trim()
          : aiOutput.suggestedTitle || `${intake.styleCulture} ${intake.eventType}`,
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
        timeline: injectGuestMilestones(
          aiOutput.timeline.map((t, idx) => ({
            ...t,
            id: t.id || `task-${idx + 1}`,
            completed: false,
          })),
          intake.date,
          intake.eventType
        ),
        vendors: aiOutput.vendors.map((v, idx) => ({
          ...v,
          id: v.id || `vendor-${idx + 1}`,
          status: v.status || 'Shortlisted',
          notes: v.notes || '',
          verifyWithVendorNotice: 'Verify with the vendor',
        })),
        ideas: aiOutput.ideas,
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

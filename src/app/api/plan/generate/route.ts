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
import { callGeminiStructured, GeminiApiError } from '@/lib/gemini';
import { executeAiCascade } from '@/lib/ai';
import {
  isGroqKeyExpired,
  BACKUP_PROVIDER_EXPIRED_NOTICE,
  MAIN_PROVIDER_EXPIRED_NOTICE,
} from '@/lib/ai/groq-provider';
import { generateTemplatePlan } from '@/lib/template-planner';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';
import { planGenerationCache, createPayloadKey } from '@/lib/cache';
import { injectGuestMilestones } from '@/lib/timeline';

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

    // Check LRU cache
    const cacheKey = createPayloadKey('plan-gen', { intake, followUpAnswers });
    const cachedPlan = planGenerationCache.get(cacheKey);
    if (cachedPlan) {
      return NextResponse.json(cachedPlan, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const prompt = buildPlanGenerationPrompt(intake, followUpAnswers);
    let fullPlan: EventPlan;
    const disableTemplateFallback = request.headers.get('x-disable-template-fallback') === 'true';

    try {
      let aiOutput: z.infer<typeof rawGeminiPlanSchema>;
      let source: PlanGenerationSource = 'primary';

      try {
        const cascadeResult = await executeAiCascade(prompt, rawGeminiPlanSchema);
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
      fullPlan = {
        id: planId,
        title: aiOutput.suggestedTitle || `${intake.styleCulture} ${intake.eventType}`,
        eventType: intake.eventType,
        city: intake.city,
        date: intake.date,
        guestCount: intake.guestCount,
        totalBudget: intake.totalBudget,
        currency: intake.currency,
        styleCulture: intake.styleCulture,
        nonNegotiables: intake.nonNegotiables,
        budget: {
          ...aiOutput.budget,
          categories: aiOutput.budget.categories.map((c, idx) => ({
            ...c,
            id: c.id || `cat-${idx + 1}`,
          })),
        },
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

    // Save to server cache
    planGenerationCache.set(cacheKey, verifiedPlan);

    return NextResponse.json(verifiedPlan, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

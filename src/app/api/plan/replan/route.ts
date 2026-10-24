import { NextResponse } from 'next/server';
import { replanRequestSchema, replanDiffResponseSchema } from '@/lib/schemas';
import { buildReplanningPrompt } from '@/lib/prompts';
import { callGeminiStructured, TIMEOUT_CONFIG } from '@/lib/gemini';
import { executeAiCascade } from '@/lib/ai';
import { generateTemplateRebalance } from '@/lib/template-planner';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';
import { validateAndFitBudget } from '@/lib/budget-benchmarks';

// Configure Next.js serverless execution ceiling for Vercel
export const maxDuration = 60;

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const { currentPlan, changes } = replanRequestSchema.parse(json);
    const disableFallback = request.headers.get('x-disable-template-fallback') === 'true';

    try {
      const prompt = buildReplanningPrompt(currentPlan, changes);
      let diffResult;
      try {
        const cascadeResult = await executeAiCascade(
          prompt,
          replanDiffResponseSchema,
          TIMEOUT_CONFIG.REPLAN
        );
        diffResult = cascadeResult.data;
      } catch {
        diffResult = await callGeminiStructured(prompt, replanDiffResponseSchema);
      }

      if (diffResult && diffResult.affectedBudgetCategories) {
        const targetBudget = changes.totalBudget ?? currentPlan.totalBudget;
        const rawBudget = {
          categories: diffResult.affectedBudgetCategories,
          contingencyPercent: diffResult.newContingencyPercent ?? currentPlan.budget.contingencyPercent,
          taxServiceChargePercent: currentPlan.budget.taxServiceChargePercent,
          statedAssumptions: currentPlan.budget.statedAssumptions,
        };
        const fitted = validateAndFitBudget(
          rawBudget,
          targetBudget,
          changes.guestCount ?? currentPlan.guestCount,
          currentPlan.city,
          currentPlan.eventType
        );
        diffResult.affectedBudgetCategories = fitted.categories;
      }

      return NextResponse.json(diffResult);
    } catch (aiErr) {
      if (disableFallback) {
        throw aiErr;
      }
      const templateDiff = generateTemplateRebalance(currentPlan, changes);
      return NextResponse.json(templateDiff);
    }
  } catch (err) {
    return handleApiError(err);
  }
}

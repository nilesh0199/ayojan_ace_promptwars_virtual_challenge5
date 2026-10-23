import { NextResponse } from 'next/server';
import { eventPlanSchema, riskRegisterSchema } from '@/lib/schemas';
import { buildRiskCheckPrompt } from '@/lib/prompts';
import { callGeminiStructured } from '@/lib/gemini';
import { executeAiCascade } from '@/lib/ai';
import { generateTemplateRisks } from '@/lib/template-planner';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const plan = eventPlanSchema.parse(json);
    const disableFallback = request.headers.get('x-disable-template-fallback') === 'true';

    try {
      const prompt = buildRiskCheckPrompt(plan);
      let riskData;
      try {
        const cascadeResult = await executeAiCascade(prompt, riskRegisterSchema);
        riskData = cascadeResult.data;
      } catch {
        riskData = await callGeminiStructured(prompt, riskRegisterSchema);
      }
      return NextResponse.json(riskData);
    } catch (aiErr) {
      if (disableFallback) {
        throw aiErr;
      }
      const templateRisks = generateTemplateRisks({
        eventType: plan.eventType,
        city: plan.city,
        date: plan.date,
        guestCount: plan.guestCount,
        totalBudget: plan.totalBudget,
        currency: plan.currency,
        styleCulture: plan.styleCulture,
        nonNegotiables: plan.nonNegotiables,
      });
      return NextResponse.json(templateRisks);
    }
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from 'next/server';
import { replanRequestSchema, replanDiffResponseSchema } from '@/lib/schemas';
import { buildReplanningPrompt } from '@/lib/prompts';
import { callGeminiStructured } from '@/lib/gemini';
import { executeAiCascade } from '@/lib/ai';
import { generateTemplateRebalance } from '@/lib/template-planner';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

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
        const cascadeResult = await executeAiCascade(prompt, replanDiffResponseSchema);
        diffResult = cascadeResult.data;
      } catch {
        diffResult = await callGeminiStructured(prompt, replanDiffResponseSchema);
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

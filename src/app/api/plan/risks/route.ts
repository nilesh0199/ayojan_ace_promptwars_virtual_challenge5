import { NextResponse } from 'next/server';
import { eventPlanSchema, riskRegisterSchema } from '@/lib/schemas';
import { buildRiskCheckPrompt } from '@/lib/prompts';
import { callGeminiStructured } from '@/lib/gemini';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed && safety.response) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const plan = eventPlanSchema.parse(json);

    const prompt = buildRiskCheckPrompt(plan);
    const riskData = await callGeminiStructured(prompt, riskRegisterSchema);

    return NextResponse.json(riskData);
  } catch (err) {
    return handleApiError(err);
  }
}

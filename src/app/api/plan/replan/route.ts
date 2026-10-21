import { NextResponse } from 'next/server';
import { replanRequestSchema, replanDiffResponseSchema } from '@/lib/schemas';
import { buildReplanningPrompt } from '@/lib/prompts';
import { callGeminiStructured } from '@/lib/gemini';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed && safety.response) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const { currentPlan, changes } = replanRequestSchema.parse(json);

    const prompt = buildReplanningPrompt(currentPlan, changes);
    const diffResult = await callGeminiStructured(prompt, replanDiffResponseSchema);

    return NextResponse.json(diffResult);
  } catch (err) {
    return handleApiError(err);
  }
}

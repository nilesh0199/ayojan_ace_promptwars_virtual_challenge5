import { NextResponse } from 'next/server';
import { z } from 'zod';
import { intakeFormSchema, followUpResponseSchema } from '@/lib/schemas';
import { buildFollowUpPrompt } from '@/lib/prompts';
import { callGeminiStructured } from '@/lib/gemini';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

const requestPayloadSchema = z.object({
  intake: intakeFormSchema,
  previousFollowUpsCount: z.number().int().min(0).max(5).default(0),
});

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed && safety.response) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const { intake, previousFollowUpsCount } = requestPayloadSchema.parse(json);

    // If max follow-ups (2) reached, don't even ask Gemini
    if (previousFollowUpsCount >= 2) {
      return NextResponse.json({
        needsFollowUp: false,
      });
    }

    const prompt = buildFollowUpPrompt(intake, previousFollowUpsCount);
    const result = await callGeminiStructured(prompt, followUpResponseSchema);

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

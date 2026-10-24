import { NextResponse } from 'next/server';
import { z } from 'zod';
import { intakeFormSchema, followUpResponseSchema } from '@/lib/schemas';
import { buildFollowUpPrompt } from '@/lib/prompts';
import { callGeminiStructured, TIMEOUT_CONFIG } from '@/lib/gemini';
import { executeAiCascade } from '@/lib/ai';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

// Configure Next.js serverless execution ceiling for Vercel
export const maxDuration = 60;

const requestPayloadSchema = z.object({
  intake: intakeFormSchema,
  previousFollowUpsCount: z.number().int().min(0).max(5).default(0),
});

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
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
    try {
      const cascadeResult = await executeAiCascade(
        prompt,
        followUpResponseSchema,
        TIMEOUT_CONFIG.FOLLOWUP
      );
      return NextResponse.json(cascadeResult.data);
    } catch {
      try {
        const result = await callGeminiStructured(prompt, followUpResponseSchema);
        return NextResponse.json(result);
      } catch {
        // Adaptive follow-ups are optional enhancement; if AI is busy or offline,
        // proceed gracefully without blocking the celebration plan generation.
        return NextResponse.json({
          needsFollowUp: false,
        });
      }
    }
  } catch (err) {
    return handleApiError(err);
  }
}

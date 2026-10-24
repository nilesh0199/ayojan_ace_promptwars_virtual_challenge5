import { NextResponse } from 'next/server';
import {
  askAiRequestSchema,
  askAiResponseSchema,
  AskAiResponse,
} from '@/lib/schemas';
import { buildAskAiPrompt } from '@/lib/prompts';
import { executeAiCascade } from '@/lib/ai';
import { callGeminiStructured, TIMEOUT_CONFIG } from '@/lib/gemini';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

// Configure Next.js serverless execution ceiling for Vercel
export const maxDuration = 60;

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  try {
    const json = await request.json();
    const validated = askAiRequestSchema.parse(json);

    const prompt = buildAskAiPrompt(
      validated.planSummary,
      validated.messages,
      validated.message
    );

    let output: AskAiResponse;
    try {
      const cascadeResult = await executeAiCascade(
        prompt,
        askAiResponseSchema,
        TIMEOUT_CONFIG.ASK_AI
      );
      output = cascadeResult.data;
    } catch {
      // Direct call fallback for tests / standalone mocks
      output = await callGeminiStructured(prompt, askAiResponseSchema);
    }

    return NextResponse.json({
      reply: output.reply.trim(),
    });
  } catch (error) {
    // If it's a validation error, handle it cleanly
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return handleApiError(error);
    }

    // Graceful helpful fallback if AI is momentarily busy
    return handleApiError(error);
  }
}

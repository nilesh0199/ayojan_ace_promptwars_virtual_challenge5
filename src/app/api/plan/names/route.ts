import { NextResponse } from 'next/server';
import {
  nameSuggestionRequestSchema,
  nameSuggestionResponseSchema,
  NameSuggestionResponse,
} from '@/lib/schemas';
import { buildNameSuggestionsPrompt } from '@/lib/prompts';
import { executeAiCascade } from '@/lib/ai';
import { callGeminiStructured } from '@/lib/gemini';
import { EVENT_NAME_EXAMPLES } from '@/lib/constants';
import { checkRequestSafety, handleApiError } from '@/lib/api-helper';

export async function POST(request: Request) {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  let eventTypeFallback = 'Wedding';

  try {
    const json = await request.json();
    const validated = nameSuggestionRequestSchema.parse(json);
    eventTypeFallback = validated.eventType;

    const prompt = buildNameSuggestionsPrompt(
      validated.eventType,
      validated.city,
      validated.styleCulture,
      validated.guestCount
    );

    let output: NameSuggestionResponse;
    try {
      const cascadeResult = await executeAiCascade(prompt, nameSuggestionResponseSchema);
      output = cascadeResult.data;
    } catch {
      // Direct call fallback for tests / standalone mocks
      output = await callGeminiStructured(prompt, nameSuggestionResponseSchema);
    }

    // Clean up suggestions: trimmed, unique, bounded
    const cleanedSuggestions = Array.from(
      new Set(output.suggestions.map((s) => s.trim()).filter((s) => s.length >= 3))
    ).slice(0, 6);

    if (cleanedSuggestions.length >= 3) {
      return NextResponse.json({ suggestions: cleanedSuggestions });
    }

    // If AI returned fewer than 3 valid suggestions, fall back to curated presets
    const fallbackList =
      EVENT_NAME_EXAMPLES[validated.eventType] || EVENT_NAME_EXAMPLES.Wedding;
    return NextResponse.json({ suggestions: fallbackList });
  } catch (error) {
    // If it's a validation error or client bad request, let handleApiError format it
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return handleApiError(error);
    }

    // For any AI or upstream error, gracefully return curated fallback names
    const fallbackList =
      EVENT_NAME_EXAMPLES[eventTypeFallback as keyof typeof EVENT_NAME_EXAMPLES] ||
      EVENT_NAME_EXAMPLES.Wedding;

    return NextResponse.json({
      suggestions: fallbackList,
      source: 'fallback-preset',
    });
  }
}

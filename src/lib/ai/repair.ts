import { z } from 'zod';
import { extractJsonFromResponse, GeminiApiError } from '../gemini';

/**
 * Builds a concise, targeted repair prompt instructing the model to rectify malformed JSON or schema errors.
 */
export function buildJsonRepairPrompt(originalPrompt: string, malformedOutput: string, errorDetail: string): string {
  const truncatedSnippet = malformedOutput.slice(0, 800);
  return `The previous response could not be parsed or failed schema validation.

Validation Error:
${errorDetail}

Previous Output Snippet:
${truncatedSnippet}

Original Instruction:
${originalPrompt.slice(0, 600)}

REPAIR DIRECTIVE:
Output ONLY a single, strictly valid JSON object that corrects the above error and strictly fulfills the required schema.
Do NOT include markdown fences, conversational text, explanations, or leading/trailing comments.`;
}

/**
 * Executes a raw generation call with an automatic single repair retry if the output is malformed JSON
 * or fails Zod schema validation.
 */
export async function executeWithRepairRetry<T>(
  generateRaw: (prompt: string, signal?: AbortSignal) => Promise<string>,
  prompt: string,
  schema: z.ZodType<T, any, any>,
  signal?: AbortSignal
): Promise<T> {
  const firstRaw = await generateRaw(prompt, signal);

  let firstParsed: unknown;
  let firstValidationError = '';

  try {
    const cleaned = extractJsonFromResponse(firstRaw);
    firstParsed = JSON.parse(cleaned);
    const validated = schema.safeParse(firstParsed);
    if (validated.success) {
      return validated.data;
    }
    firstValidationError = validated.error.message;
  } catch (parseErr) {
    firstValidationError = parseErr instanceof Error ? parseErr.message : 'Invalid JSON formatting';
  }

  // Attempt repair retry ONCE
  const repairPrompt = buildJsonRepairPrompt(prompt, firstRaw, firstValidationError);

  try {
    const repairRaw = await generateRaw(repairPrompt, signal);
    const cleanedRepair = extractJsonFromResponse(repairRaw);
    const repairParsed = JSON.parse(cleanedRepair);
    const validatedRepair = schema.safeParse(repairParsed);

    if (validatedRepair.success) {
      return validatedRepair.data;
    }

    throw new GeminiApiError(
      `Repaired response failed schema validation: ${validatedRepair.error.message}`,
      502,
      false,
      'AI_VALIDATION_FAILED'
    );
  } catch (repairErr) {
    if (repairErr instanceof GeminiApiError) {
      throw repairErr;
    }
    throw new GeminiApiError(
      `Malformed output after repair retry: ${repairErr instanceof Error ? repairErr.message : String(repairErr)}`,
      502,
      false,
      'AI_VALIDATION_FAILED'
    );
  }
}

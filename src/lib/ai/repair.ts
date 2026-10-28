import { z } from 'zod';
import { extractJsonFromResponse, GeminiApiError } from '../gemini';
import { logSafeAiValidationFailure } from './safe-logger';

/**
 * Builds a strict repair prompt containing ONLY the failing field paths.
 *
 * CRITICAL PRIVACY DIRECTIVE:
 * Never include user text, event names, descriptions, or untrusted payload values
 * in repair prompts. The model is sent ONLY the list of failing JSON paths.
 */
export function buildJsonRepairPrompt(failingPaths: string[]): string {
  const safePathList = failingPaths.length > 0 ? failingPaths : ['<root>'];
  return `The previously generated JSON failed schema validation.

FAILING FIELD PATHS:
${JSON.stringify(safePathList, null, 2)}

REPAIR DIRECTIVE:
Output ONLY a single, strictly valid JSON object that corrects the above field paths and strictly satisfies the required schema.
Do NOT include markdown fences, conversational text, explanations, or extraneous text.`.trim();
}

export interface RepairRetryOptions<T> {
  provider?: string;
  model?: string;
  normalizer?: (raw: unknown) => unknown;
  signal?: AbortSignal;
}

/**
 * Executes an AI generation call with an automatic single repair retry on validation failure.
 *
 * Mechanics:
 * 1. Generates the first raw response and parses JSON.
 * 2. Applies normalizer (fixing harmless variations like aliases, casing, numbers as strings).
 * 3. Validates against the strict Zod schema.
 * 4. If validation fails:
 *    - Logs one safe server line with provider, model, top-level received keys, and failing paths.
 *    - Sends back ONLY the failing field paths (zero user text) in an automatic repair retry.
 * 5. If repair also fails, logs the failure and throws AI_VALIDATION_FAILED with the failing field count
 *    so the cascade orchestrator falls back to the next provider.
 */
export async function executeWithRepairRetry<T>(
  generateRaw: (prompt: string, signal?: AbortSignal) => Promise<string>,
  prompt: string,
  schema: z.ZodType<T, any, any>,
  options?: RepairRetryOptions<T> | AbortSignal
): Promise<T> {
  const opts: RepairRetryOptions<T> =
    options && 'aborted' in options
      ? { signal: options }
      : (options as RepairRetryOptions<T>) || {};

  const signal = opts.signal;
  const normalizer = opts.normalizer;
  const provider = opts.provider || 'gemini';
  const model = opts.model || 'unknown';

  const firstRaw = await generateRaw(prompt, signal);

  let firstParsed: unknown;
  let failingPaths: string[] = [];

  try {
    const cleaned = extractJsonFromResponse(firstRaw);
    firstParsed = JSON.parse(cleaned);
    const normalized = normalizer ? normalizer(firstParsed) : firstParsed;
    const validated = schema.safeParse(normalized);
    if (validated.success) {
      return validated.data;
    }
    failingPaths = validated.error.issues.map((i) => i.path.join('.') || '<root>');
  } catch {
    failingPaths = ['<json_syntax_error>'];
  }

  // Safe server logging on initial validation failure (never logs values, prompts or keys)
  const receivedKeys =
    typeof firstParsed === 'object' && firstParsed !== null && !Array.isArray(firstParsed)
      ? Object.keys(firstParsed)
      : [];
  logSafeAiValidationFailure({
    provider,
    model,
    receivedKeys,
    failingPaths,
  });

  // Attempt automatic repair retry ONCE: send back ONLY failing field paths (no user text)
  const repairPrompt = buildJsonRepairPrompt(failingPaths);

  let repairParsed: unknown;
  let repairFailingPaths: string[] = [];

  try {
    const repairRaw = await generateRaw(repairPrompt, signal);
    const cleanedRepair = extractJsonFromResponse(repairRaw);
    repairParsed = JSON.parse(cleanedRepair);
    const normalizedRepair = normalizer ? normalizer(repairParsed) : repairParsed;
    const validatedRepair = schema.safeParse(normalizedRepair);

    if (validatedRepair.success) {
      return validatedRepair.data;
    }
    repairFailingPaths = validatedRepair.error.issues.map((i) => i.path.join('.') || '<root>');
  } catch {
    repairFailingPaths = ['<json_syntax_error>'];
  }

  // Safe server logging on repair validation failure
  const repairReceivedKeys =
    typeof repairParsed === 'object' && repairParsed !== null && !Array.isArray(repairParsed)
      ? Object.keys(repairParsed)
      : [];
  logSafeAiValidationFailure({
    provider,
    model,
    receivedKeys: repairReceivedKeys,
    failingPaths: repairFailingPaths,
  });

  const failingCount = repairFailingPaths.length || failingPaths.length || 1;
  throw new GeminiApiError(
    `AI response failed schema validation on ${failingCount} field(s) after repair retry.`,
    502,
    false,
    'AI_VALIDATION_FAILED',
    failingCount,
    repairFailingPaths.length > 0 ? repairFailingPaths : failingPaths
  );
}

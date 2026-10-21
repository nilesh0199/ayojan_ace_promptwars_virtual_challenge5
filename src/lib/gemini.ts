import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash';
const DEFAULT_TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

export interface GeminiCallOptions {
  timeoutMs?: number;
  maxRetries?: number;
  temperature?: number;
  customClient?: GoogleGenAI;
}

export class GeminiApiError extends Error {
  public statusCode: number;
  public isRetryable: boolean;

  constructor(message: string, statusCode = 500, isRetryable = false) {
    super(message);
    this.name = 'GeminiApiError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

/**
 * Extracts clean JSON string by trimming possible markdown fences.
 */
export function extractJsonFromResponse(rawText: string): string {
  const trimmed = rawText.trim();
  const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = trimmed.match(fenceRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Safely extracts error message from an unknown error value.
 */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err || 'Unknown error');
}

/**
 * Creates or retrieves the GoogleGenAI client using server-only environment variables.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiApiError(
      'Server configuration error: GEMINI_API_KEY is not set.',
      500,
      false
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Executes a Gemini request with structured output, retries, exponential backoff,
 * and optional fallback model support.
 */
export async function callGeminiStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: GeminiCallOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const client = options.customClient ?? getGeminiClient();

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  let lastError: Error | null = null;
  const modelsToAttempt = [primaryModel, fallbackModel];

  for (let modelIdx = 0; modelIdx < modelsToAttempt.length; modelIdx++) {
    const currentModel = modelsToAttempt[modelIdx];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let timerId: ReturnType<typeof setTimeout> | undefined;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            reject(new GeminiApiError(`Gemini request timed out after ${timeoutMs}ms`, 504, true));
          }, timeoutMs);
        });

        const executionPromise = client.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: options.temperature ?? 0.4,
          },
        });

        const response = await Promise.race([executionPromise, timeoutPromise]);
        const text = response.text;

        if (!text) {
          throw new GeminiApiError('Gemini returned an empty response', 502, true);
        }

        const cleanedJson = extractJsonFromResponse(text);
        let parsedData: unknown;

        try {
          parsedData = JSON.parse(cleanedJson);
        } catch (jsonErr) {
          throw new GeminiApiError(
            `Malformed JSON returned by AI model: ${toErrorMessage(jsonErr)}`,
            502,
            false
          );
        }

        const validatedResult = schema.safeParse(parsedData);
        if (!validatedResult.success) {
          throw new GeminiApiError(
            `Gemini response schema validation failed: ${validatedResult.error.message}`,
            502,
            false
          );
        }

        return validatedResult.data;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(toErrorMessage(err));
        const isRetryable =
          err instanceof GeminiApiError
            ? err.isRetryable
            : String(err).includes('429') ||
              String(err).includes('503') ||
              String(err).includes('overloaded');

        if (attempt < maxRetries && isRetryable) {
          const backoffTime = Math.pow(2, attempt) * 600;
          await new Promise((r) => setTimeout(r, backoffTime));
          continue;
        }

        // Break retry loop to try fallback model if available
        break;
      } finally {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
      }
    }
  }

  throw new GeminiApiError(
    `AI service is currently busy or unavailable. Please retry or load a saved example plan. (Details: ${toErrorMessage(lastError)})`,
    503,
    false
  );
}

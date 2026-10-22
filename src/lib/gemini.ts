import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

export const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash';
export const DEFAULT_TOTAL_BUDGET_MS = 25000;
export const DEFAULT_PER_ATTEMPT_TIMEOUT_MS = 8000;
export const PRIMARY_MAX_RETRIES = 2;
export const FALLBACK_MAX_RETRIES = 1;
export const CIRCUIT_BREAKER_FAIL_THRESHOLD = 3;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 60 * 1000; // 60 seconds

export type GeminiErrorCode =
  | 'AI_BUSY'
  | 'AI_TIMEOUT'
  | 'AI_NOT_CONFIGURED'
  | 'AI_INVALID_KEY'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_VALIDATION_FAILED'
  | 'AI_ERROR';

export interface GeminiCallOptions {
  totalBudgetMs?: number;
  perAttemptTimeoutMs?: number;
  primaryMaxRetries?: number;
  fallbackMaxRetries?: number;
  temperature?: number;
  customClient?: GoogleGenAI;
  jitterFn?: () => number;
}

export class GeminiApiError extends Error {
  public statusCode: number;
  public isRetryable: boolean;
  public code: GeminiErrorCode;

  constructor(
    message: string,
    statusCode = 500,
    isRetryable = false,
    code: GeminiErrorCode = 'AI_ERROR'
  ) {
    super(message);
    this.name = 'GeminiApiError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.code = code;
  }
}

/**
 * In-memory Circuit Breaker state.
 * After repeated overload failures (threshold = 3), skips the primary model
 * for ~60 seconds and utilizes the fallback model directly.
 */
interface CircuitBreakerState {
  consecutiveFailures: number;
  trippedUntil: number;
}

const primaryCircuitState: CircuitBreakerState = {
  consecutiveFailures: 0,
  trippedUntil: 0,
};

export function isPrimaryCircuitOpen(nowMs = Date.now()): boolean {
  return primaryCircuitState.trippedUntil > nowMs;
}

export function recordPrimaryFailure(isOverload: boolean, nowMs = Date.now()): void {
  if (!isOverload) return;
  primaryCircuitState.consecutiveFailures += 1;
  if (primaryCircuitState.consecutiveFailures >= CIRCUIT_BREAKER_FAIL_THRESHOLD) {
    primaryCircuitState.trippedUntil = nowMs + CIRCUIT_BREAKER_COOLDOWN_MS;
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `[Circuit Breaker] Primary model tripped after ${primaryCircuitState.consecutiveFailures} consecutive overload failures. Directing calls to fallback model for 60 seconds.`
      );
    }
  }
}

export function recordPrimarySuccess(): void {
  primaryCircuitState.consecutiveFailures = 0;
  primaryCircuitState.trippedUntil = 0;
}

export function resetCircuitBreaker(): void {
  primaryCircuitState.consecutiveFailures = 0;
  primaryCircuitState.trippedUntil = 0;
}

export function tripCircuitBreakerForTesting(
  cooldownMs = CIRCUIT_BREAKER_COOLDOWN_MS,
  nowMs = Date.now()
): void {
  primaryCircuitState.consecutiveFailures = CIRCUIT_BREAKER_FAIL_THRESHOLD;
  primaryCircuitState.trippedUntil = nowMs + cooldownMs;
}

export function getCircuitBreakerState(): {
  isOpen: boolean;
  consecutiveFailures: number;
  resetAt: number;
} {
  return {
    isOpen: isPrimaryCircuitOpen(),
    consecutiveFailures: primaryCircuitState.consecutiveFailures,
    resetAt: primaryCircuitState.trippedUntil,
  };
}

/**
 * Checks whether an error is caused by upstream overload or temporary transient unavailability.
 */
export function isOverloadOrTransientError(err: unknown): boolean {
  if (err instanceof GeminiApiError) {
    return (
      err.isRetryable ||
      err.statusCode === 503 ||
      err.statusCode === 429 ||
      err.statusCode === 504 ||
      err.code === 'AI_BUSY' ||
      err.code === 'AI_TIMEOUT'
    );
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  const lower = msg.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('429') ||
    lower.includes('unavailable') ||
    lower.includes('resource_exhausted') ||
    lower.includes('overloaded') ||
    lower.includes('high demand') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('504') ||
    lower.includes('deadline exceeded')
  );
}

/**
 * User-facing friendly error descriptions mapped from typed GeminiErrorCodes.
 * Maintains positive, reassuring copy without framing planning as failing.
 */
export interface FriendlyAiErrorInfo {
  title: string;
  message: string;
  actionHint: string;
}

export function getFriendlyAiError(
  code: GeminiErrorCode | string | null | undefined
): FriendlyAiErrorInfo {
  switch (code) {
    case 'AI_BUSY':
      return {
        title: 'High Demand on AI Services',
        message:
          'Gemini AI is currently experiencing high demand. Click Retry to try again momentarily, or explore a pre-built celebration plan.',
        actionHint: 'Your inputs are saved. You can retry immediately or explore a pre-built plan.',
      };
    case 'AI_TIMEOUT':
      return {
        title: 'Planning Request Timed Out',
        message:
          'The AI request took longer than expected to complete. Click Retry to run with a fresh connection, or load a saved example.',
        actionHint: 'Retrying will re-establish a fresh connection to Gemini.',
      };
    case 'AI_NOT_CONFIGURED':
      return {
        title: 'AI Service Configuration Needed',
        message:
          'Server configuration for Gemini AI is currently being set up. You can explore all features right now using our pre-built celebration plans.',
        actionHint: 'Saved celebration plans work offline with zero latency.',
      };
    case 'AI_INVALID_KEY':
      return {
        title: 'AI Authorization Update Needed',
        message:
          'Gemini API key is invalid or unauthorized. You can still explore and edit all celebration plans with our curated examples.',
        actionHint: 'Explore pre-built plans or verify server API credentials.',
      };
    case 'AI_MODEL_NOT_FOUND':
      return {
        title: 'Model Update in Progress',
        message:
          'The requested AI model is updating. Click Retry to connect to the active model, or explore a saved example celebration.',
        actionHint: 'Aayojan Ace will automatically route to available models on retry.',
      };
    case 'AI_VALIDATION_FAILED':
      return {
        title: 'Plan Refinement in Progress',
        message:
          'The AI response needed additional formatting adjustments. Click Retry to regenerate cleanly, or explore a saved celebration plan.',
        actionHint: 'A fresh generation typically succeeds cleanly.',
      };
    default:
      return {
        title: 'Celebration Planning Alert',
        message:
          'AI service is currently busy or unavailable. Please click Retry, or explore a pre-built celebration plan.',
        actionHint: 'You can retry in a few moments or jump straight into a pre-built plan.',
      };
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
 * Safe server-only logger: logs high-level operational alerts strictly without secrets,
 * API keys, prompts, or user text.
 */
function logGeminiServerAlert(meta: {
  type: string;
  code: GeminiErrorCode;
  status: number;
  model?: string;
  attempt?: number;
}): void {
  if (process.env.NODE_ENV === 'test') return;
  console.error(
    `[Gemini Server Alert] type=${meta.type} code=${meta.code} status=${meta.status}${
      meta.model ? ` model=${meta.model}` : ''
    }${meta.attempt !== undefined ? ` attempt=${meta.attempt}` : ''}`
  );
}

/**
 * Maps raw Gemini/SDK errors to friendly, distinct user-facing GeminiApiErrors
 * without leaking sensitive internal details or API keys.
 */
export function mapGeminiError(err: unknown): GeminiApiError {
  if (err instanceof GeminiApiError) return err;

  const msg = toErrorMessage(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('api key not valid') ||
    lower.includes('unauthorized') ||
    lower.includes('401')
  ) {
    logGeminiServerAlert({ type: 'Auth/Key', code: 'AI_INVALID_KEY', status: 401 });
    return new GeminiApiError(
      'Gemini API key is invalid or unauthorized. Please verify server environment variables or load a saved example plan.',
      401,
      false,
      'AI_INVALID_KEY'
    );
  }

  if (lower.includes('not found') || lower.includes('models/')) {
    logGeminiServerAlert({ type: 'ModelNotFound', code: 'AI_MODEL_NOT_FOUND', status: 404 });
    return new GeminiApiError(
      'Requested Gemini AI model was not found or is unsupported. Please check the configured model name or explore a saved example plan.',
      404,
      false,
      'AI_MODEL_NOT_FOUND'
    );
  }

  if (
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('504') ||
    lower.includes('deadline exceeded')
  ) {
    logGeminiServerAlert({ type: 'Timeout', code: 'AI_TIMEOUT', status: 504 });
    return new GeminiApiError(
      'AI planning request timed out waiting for generation. Please retry with concise requirements or load a saved example plan.',
      504,
      true,
      'AI_TIMEOUT'
    );
  }

  if (lower.includes('schema validation failed') || lower.includes('malformed json')) {
    logGeminiServerAlert({ type: 'Validation', code: 'AI_VALIDATION_FAILED', status: 502 });
    return new GeminiApiError(
      'Gemini response format requires refinement. Please retry or explore a saved example plan.',
      502,
      false,
      'AI_VALIDATION_FAILED'
    );
  }

  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('overloaded') ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand')
  ) {
    logGeminiServerAlert({ type: 'Overload/Quota', code: 'AI_BUSY', status: 429 });
    return new GeminiApiError(
      'Gemini AI is currently experiencing high demand. Please click Retry in a few moments, or explore a pre-built celebration plan.',
      429,
      true,
      'AI_BUSY'
    );
  }

  logGeminiServerAlert({ type: 'GenericError', code: 'AI_BUSY', status: 503 });
  return new GeminiApiError(
    'AI service is currently busy or unavailable. Please retry or load a saved example plan.',
    503,
    false,
    'AI_BUSY'
  );
}

/**
 * Creates or retrieves the GoogleGenAI client using server-only environment variables.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiApiError(
      'Server configuration error: GEMINI_API_KEY is not set. Please ensure GEMINI_API_KEY is configured in environment variables, or explore our saved example plans.',
      500,
      false,
      'AI_NOT_CONFIGURED'
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Executes a Gemini request with structured output, retries, jittered exponential backoff,
 * per-attempt timeouts, overall time budget, fallback model switching, and circuit breaker.
 */
export async function callGeminiStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: GeminiCallOptions = {}
): Promise<T> {
  const client = options.customClient ?? getGeminiClient();
  const totalBudgetMs = options.totalBudgetMs ?? DEFAULT_TOTAL_BUDGET_MS;
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? DEFAULT_PER_ATTEMPT_TIMEOUT_MS;
  const primaryMaxRetries = options.primaryMaxRetries ?? PRIMARY_MAX_RETRIES;
  const fallbackMaxRetries = options.fallbackMaxRetries ?? FALLBACK_MAX_RETRIES;

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  const startTime = Date.now();
  const deadline = startTime + totalBudgetMs;

  // Determine stage execution plan according to circuit breaker
  interface ModelStage {
    model: string;
    maxRetries: number;
    isPrimary: boolean;
  }

  const stages: ModelStage[] = [];
  if (isPrimaryCircuitOpen()) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `[Gemini Resilience] Primary model circuit is OPEN. Bypassing primary and routing directly to fallback model (${fallbackModel}).`
      );
    }
    stages.push({
      model: fallbackModel,
      maxRetries: fallbackMaxRetries,
      isPrimary: false,
    });
  } else {
    stages.push({
      model: primaryModel,
      maxRetries: primaryMaxRetries,
      isPrimary: true,
    });
    // Add fallback stage if different from primary
    if (fallbackModel !== primaryModel) {
      stages.push({
        model: fallbackModel,
        maxRetries: fallbackMaxRetries,
        isPrimary: false,
      });
    }
  }

  let lastError: unknown = null;

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];

    for (let attempt = 0; attempt <= stage.maxRetries; attempt++) {
      const remainingBudget = deadline - Date.now();
      if (remainingBudget <= 500) {
        throw new GeminiApiError(
          'AI planning request timed out waiting for generation. Please retry with concise requirements or load a saved example plan.',
          504,
          true,
          'AI_TIMEOUT'
        );
      }

      const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remainingBudget);
      let timerId: ReturnType<typeof setTimeout> | undefined;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            reject(
              new GeminiApiError(
                `Gemini request timed out after ${attemptTimeoutMs}ms`,
                504,
                true,
                'AI_TIMEOUT'
              )
            );
          }, attemptTimeoutMs);
        });

        const executionPromise = client.models.generateContent({
          model: stage.model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: options.temperature ?? 0.4,
          },
        });

        const response = await Promise.race([executionPromise, timeoutPromise]);
        const text = response.text;

        if (!text) {
          throw new GeminiApiError(
            'Gemini returned an empty response',
            502,
            true,
            'AI_VALIDATION_FAILED'
          );
        }

        const cleanedJson = extractJsonFromResponse(text);
        let parsedData: unknown;

        try {
          parsedData = JSON.parse(cleanedJson);
        } catch {
          throw new GeminiApiError(
            'Malformed JSON returned by AI model',
            502,
            false,
            'AI_VALIDATION_FAILED'
          );
        }

        const validatedResult = schema.safeParse(parsedData);
        if (!validatedResult.success) {
          throw new GeminiApiError(
            'Gemini response schema validation failed',
            502,
            false,
            'AI_VALIDATION_FAILED'
          );
        }

        // On successful primary call, reset circuit breaker consecutive failure counter
        if (stage.isPrimary) {
          recordPrimarySuccess();
        }

        return validatedResult.data;
      } catch (err: unknown) {
        lastError = err;
        const isOverload = isOverloadOrTransientError(err);

        if (stage.isPrimary) {
          recordPrimaryFailure(isOverload);
        }

        // Check if we should retry on the current model
        if (attempt < stage.maxRetries && isOverload) {
          const baseMs = Math.pow(2, attempt) * 400; // 400ms for attempt 0, 800ms for attempt 1
          const jitter = (options.jitterFn ? options.jitterFn() : Math.random()) * 250;
          const backoffMs = Math.floor(baseMs + jitter);
          const currentRemaining = deadline - Date.now();
          const sleepMs = Math.min(backoffMs, Math.max(0, currentRemaining - 500));

          if (sleepMs > 0) {
            await new Promise((r) => setTimeout(r, sleepMs));
          }
          continue;
        }

        // Retries exhausted for this model or non-retryable error; fall through to next stage (fallback model)
        break;
      } finally {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
      }
    }
  }

  if (lastError) {
    throw mapGeminiError(lastError);
  }

  throw new GeminiApiError(
    'AI service is currently busy or unavailable. Please retry or load a saved example plan.',
    503,
    false,
    'AI_BUSY'
  );
}

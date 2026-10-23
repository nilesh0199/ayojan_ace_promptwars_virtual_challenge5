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
  | 'AI_BACKUP_KEY_EXPIRED'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_VALIDATION_FAILED'
  | 'AI_ERROR';

export type GeminiKeyType = 'primary' | 'fallback';

export interface GeminiCallOptions {
  totalBudgetMs?: number;
  perAttemptTimeoutMs?: number;
  primaryMaxRetries?: number;
  fallbackMaxRetries?: number;
  temperature?: number;
  customClient?: GoogleGenAI;
  customFallbackClient?: GoogleGenAI;
  clientProvider?: (keyType: GeminiKeyType) => GoogleGenAI;
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
 * In-memory Circuit Breaker state tracking per (keyType, model) combination.
 * After repeated overload failures (threshold = 3), skips the combination
 * for ~60 seconds.
 */
export interface CircuitBreakerState {
  consecutiveFailures: number;
  trippedUntil: number;
}

const combinationCircuits = new Map<string, CircuitBreakerState>();

export function getCircuitKey(keyType: GeminiKeyType, model: string): string {
  return `${keyType}:${model}`;
}

export function isCombinationCircuitOpen(
  keyType: GeminiKeyType,
  model: string,
  nowMs = Date.now()
): boolean {
  const key = getCircuitKey(keyType, model);
  const state = combinationCircuits.get(key);
  return Boolean(state && state.trippedUntil > nowMs);
}

export function recordCombinationFailure(
  keyType: GeminiKeyType,
  model: string,
  isOverload: boolean,
  nowMs = Date.now()
): void {
  if (!isOverload) return;
  const key = getCircuitKey(keyType, model);
  const state = combinationCircuits.get(key) || { consecutiveFailures: 0, trippedUntil: 0 };
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= CIRCUIT_BREAKER_FAIL_THRESHOLD) {
    state.trippedUntil = nowMs + CIRCUIT_BREAKER_COOLDOWN_MS;
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `[Circuit Breaker] Combination (${keyType} key, model ${model}) tripped after ${state.consecutiveFailures} consecutive overload failures. Routing away for 60 seconds.`
      );
    }
  }
  combinationCircuits.set(key, state);
}

export function recordCombinationSuccess(keyType: GeminiKeyType, model: string): void {
  const key = getCircuitKey(keyType, model);
  combinationCircuits.set(key, { consecutiveFailures: 0, trippedUntil: 0 });
}

export function resetAllCircuitBreakers(): void {
  combinationCircuits.clear();
}

export function isPrimaryCircuitOpen(nowMs = Date.now()): boolean {
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  return isCombinationCircuitOpen('primary', primaryModel, nowMs);
}

export function recordPrimaryFailure(isOverload: boolean, nowMs = Date.now()): void {
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  recordCombinationFailure('primary', primaryModel, isOverload, nowMs);
}

export function recordPrimarySuccess(): void {
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  recordCombinationSuccess('primary', primaryModel);
}

export function resetCircuitBreaker(): void {
  resetAllCircuitBreakers();
}

export function tripCircuitBreakerForTesting(
  cooldownMs = CIRCUIT_BREAKER_COOLDOWN_MS,
  nowMs = Date.now(),
  keyType: GeminiKeyType = 'primary',
  model = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL
): void {
  const key = getCircuitKey(keyType, model);
  combinationCircuits.set(key, {
    consecutiveFailures: CIRCUIT_BREAKER_FAIL_THRESHOLD,
    trippedUntil: nowMs + cooldownMs,
  });
}

export function getCircuitBreakerState(
  keyType: GeminiKeyType = 'primary',
  model = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL
): {
  isOpen: boolean;
  consecutiveFailures: number;
  resetAt: number;
} {
  const key = getCircuitKey(keyType, model);
  const state = combinationCircuits.get(key) || { consecutiveFailures: 0, trippedUntil: 0 };
  return {
    isOpen: isCombinationCircuitOpen(keyType, model),
    consecutiveFailures: state.consecutiveFailures,
    resetAt: state.trippedUntil,
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
          'The main AI provider is no longer active. This app was built for the PromptWars Challenge 5, and its demo access key was valid for about two months. Plans still work with curated examples and the built-in planner.',
        actionHint: 'Explore pre-built plans or verify server API credentials.',
      };
    case 'AI_BACKUP_KEY_EXPIRED':
      return {
        title: 'Backup AI Provider Expired',
        message:
          'The backup AI provider is no longer active. This app was built for the PromptWars Challenge 5, and its demo access key was valid for about two months. Plans still work with the main AI and the built-in planner.',
        actionHint: 'Plans continue seamlessly using the main AI or built-in template planner.',
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
 * Checks whether an error is specifically quota or resource exhaustion (429 / RESOURCE_EXHAUSTED).
 */
export function isQuotaError(err: unknown): boolean {
  if (err instanceof GeminiApiError) {
    if (err.statusCode === 429) return true;
    const msg = err.message.toLowerCase();
    return msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted')
  );
}

/**
 * Checks whether an optional backup Gemini API key is configured.
 */
export function hasFallbackApiKey(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY_FALLBACK &&
      process.env.GEMINI_API_KEY_FALLBACK.trim().length > 0
  );
}

/**
 * Creates or retrieves the GoogleGenAI client using server-only environment variables.
 * Never logs, exposes, or returns the raw API key.
 */
export function getGeminiClient(keyType: GeminiKeyType = 'primary'): GoogleGenAI {
  const apiKey =
    keyType === 'fallback'
      ? process.env.GEMINI_API_KEY_FALLBACK
      : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiApiError(
      keyType === 'fallback'
        ? 'Server configuration error: GEMINI_API_KEY_FALLBACK is not set.'
        : 'Server configuration error: GEMINI_API_KEY is not set. Please ensure GEMINI_API_KEY is configured in environment variables, or explore our saved example plans.',
      500,
      false,
      'AI_NOT_CONFIGURED'
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Executes a Gemini request with structured output, retries, jittered exponential backoff,
 * per-attempt timeouts, overall time budget, fallback key support, fallback model switching,
 * and per-combination circuit breakers.
 *
 * Execution order on transient overload/quota:
 * 1. Primary key with primary model (with existing retries)
 * 2. Fallback key with primary model for quota errors (429 / RESOURCE_EXHAUSTED)
 * 3. Fallback model with primary key
 * 4. Fallback model with fallback key
 */
export async function callGeminiStructured<T>(
  prompt: string,
  schema: z.ZodType<T, any, any>,
  options: GeminiCallOptions = {}
): Promise<T> {
  const totalBudgetMs = options.totalBudgetMs ?? DEFAULT_TOTAL_BUDGET_MS;
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? DEFAULT_PER_ATTEMPT_TIMEOUT_MS;
  const primaryMaxRetries = options.primaryMaxRetries ?? PRIMARY_MAX_RETRIES;
  const fallbackMaxRetries = options.fallbackMaxRetries ?? FALLBACK_MAX_RETRIES;

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  const hasFallbackKey =
    hasFallbackApiKey() ||
    Boolean(options.customFallbackClient) ||
    Boolean(options.clientProvider);

  const resolveClientForStage = (keyType: GeminiKeyType): GoogleGenAI => {
    if (options.clientProvider) {
      return options.clientProvider(keyType);
    }
    if (keyType === 'fallback' && options.customFallbackClient) {
      return options.customFallbackClient;
    }
    if (options.customClient) {
      return options.customClient;
    }
    return getGeminiClient(keyType);
  };

  const startTime = Date.now();
  const deadline = startTime + totalBudgetMs;

  interface StageDefinition {
    keyType: GeminiKeyType;
    model: string;
    maxRetries: number;
    isQuotaOnlyFallback?: boolean;
  }

  const stageCandidates: StageDefinition[] = [];

  // Stage 1: Primary key + Primary model
  stageCandidates.push({
    keyType: 'primary',
    model: primaryModel,
    maxRetries: primaryMaxRetries,
  });

  // Stage 2: Fallback key + Primary model (for quota errors)
  if (hasFallbackKey) {
    stageCandidates.push({
      keyType: 'fallback',
      model: primaryModel,
      maxRetries: 1,
      isQuotaOnlyFallback: true,
    });
  }

  // Stage 3: Primary key + Fallback model (if fallback model differs from primary)
  if (fallbackModel !== primaryModel) {
    stageCandidates.push({
      keyType: 'primary',
      model: fallbackModel,
      maxRetries: fallbackMaxRetries,
    });

    // Stage 4: Fallback key + Fallback model
    if (hasFallbackKey) {
      stageCandidates.push({
        keyType: 'fallback',
        model: fallbackModel,
        maxRetries: fallbackMaxRetries,
      });
    }
  }

  let lastError: unknown = null;
  let previousWasQuota = false;

  for (let sIdx = 0; sIdx < stageCandidates.length; sIdx++) {
    const stage = stageCandidates[sIdx];

    // If stage is specifically a fallback key for quota errors, only execute if previous failure was quota
    if (stage.isQuotaOnlyFallback && !previousWasQuota) {
      continue;
    }

    // Check circuit breaker for this specific combination
    if (isCombinationCircuitOpen(stage.keyType, stage.model, Date.now())) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          `[Gemini Resilience] Circuit is OPEN for (${stage.keyType} key, model ${stage.model}). Skipping to next available candidate.`
        );
      }
      continue;
    }

    const client = resolveClientForStage(stage.keyType);

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

        // On successful call, reset combination circuit failures
        recordCombinationSuccess(stage.keyType, stage.model);

        return validatedResult.data;
      } catch (err: unknown) {
        lastError = err;
        const isOverload = isOverloadOrTransientError(err);
        previousWasQuota = isQuotaError(err);

        recordCombinationFailure(stage.keyType, stage.model, isOverload);

        // Check if we should retry on the current combination
        if (attempt < stage.maxRetries && isOverload) {
          const baseMs = Math.pow(2, attempt) * 400;
          const jitter = (options.jitterFn ? options.jitterFn() : Math.random()) * 250;
          const backoffMs = Math.floor(baseMs + jitter);
          const currentRemaining = deadline - Date.now();
          const sleepMs = Math.min(backoffMs, Math.max(0, currentRemaining - 500));

          if (sleepMs > 0) {
            await new Promise((r) => setTimeout(r, sleepMs));
          }
          continue;
        }

        // Retries exhausted for this combination; fall through to next candidate stage
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

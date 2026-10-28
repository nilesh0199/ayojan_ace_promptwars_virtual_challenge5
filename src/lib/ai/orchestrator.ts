import { z } from 'zod';
import { AiProvider, AiCallOptions, AiExecutionResult, AiProviderId } from './types';
import { GeminiProvider } from './gemini-provider';
import { GroqProvider, DEFAULT_GROQ_MODEL } from './groq-provider';
import {
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_TOTAL_BUDGET_MS,
  DEFAULT_PER_ATTEMPT_TIMEOUT_MS,
  PRIMARY_MAX_RETRIES,
  FALLBACK_MAX_RETRIES,
  GeminiApiError,
  isOverloadOrTransientError,
  isQuotaError,
  isDailyQuotaError,
  isDailyQuotaCombination,
  isCombinationCircuitOpen,
  recordCombinationFailure,
  recordCombinationSuccess,
  hasFallbackApiKey,
  logAiAttempt,
  mapGeminiError,
} from '../gemini';
import { GoogleGenAI } from '@google/genai';

export interface OrchestratorOptions extends AiCallOptions {
  totalBudgetMs?: number;
  perAttemptTimeoutMs?: number;
  primaryMaxRetries?: number;
  fallbackMaxRetries?: number;
  customGeminiClient?: GoogleGenAI;
  customGroqFetch?: typeof fetch;
  customGroqApiKey?: string;
}

interface CascadeStage {
  providerId: AiProviderId;
  model: string;
  maxRetries: number;
  isPrimary: boolean;
  createProvider: () => AiProvider;
  isQuotaOnlyStage?: boolean;
}

/**
 * Checks whether an error is eligible for fallback to secondary AI providers.
 * Eligible: overload (503), quota (429), timeout (504), invalid key (401), model not found (404),
 * or validation failure after repair retry.
 *
 * Why: Non-retryable operational errors (quota, invalid key, auth rejection) and permanent
 * validation failures should immediately advance to the next provider stage rather than
 * repeatedly hammering the failing endpoint.
 *
 * @param err - Unknown error caught during AI invocation.
 * @returns True if error justifies routing to the next cascade provider stage.
 */
export function isEligibleForProviderFallback(err: unknown): boolean {
  if (err instanceof GeminiApiError) {
    return (
      err.statusCode === 503 ||
      err.statusCode === 429 ||
      err.statusCode === 504 ||
      err.statusCode === 401 ||
      err.statusCode === 403 ||
      err.statusCode === 404 ||
      err.code === 'AI_BUSY' ||
      err.code === 'AI_QUOTA_EXHAUSTED' ||
      err.code === 'AI_TIMEOUT' ||
      err.code === 'AI_INVALID_KEY' ||
      err.code === 'AI_BACKUP_KEY_EXPIRED' ||
      err.code === 'AI_MODEL_NOT_FOUND' ||
      err.code === 'AI_VALIDATION_FAILED'
    );
  }
  return isOverloadOrTransientError(err);
}

/**
 * Executes structured JSON generation across the unified AI provider cascade:
 * 1. Gemini Primary Model (with exponential backoff & jitter)
 * 2. Gemini Fallback Model
 * 3. Groq Provider (if configured, on overload / quota / timeout / invalid-key)
 *
 * If all AI providers fail or time out, callers fall back to the built-in template planner.
 *
 * Why: Cloud AI services experience regional traffic spikes, rate limits, and outages.
 * A 4-tier cascade with per-attempt timeout bounds guarantees that user requests never
 * hang indefinitely and always return a complete, valid event plan.
 *
 * @param prompt - Fully formed system and user prompt string.
 * @param schema - Strict Zod schema defining the expected structured JSON output.
 * @param options - Orchestrator options including timeouts, normalizer, and custom test clients.
 * @returns AiExecutionResult containing parsed data and generation source ('primary' | 'backup').
 * @throws GeminiApiError if all stages fail and caller must fall back to template.
 */
export async function executeAiCascade<T>(
  prompt: string,
  schema: z.ZodType<T, any, any>,
  options: OrchestratorOptions = {}
): Promise<AiExecutionResult<T>> {
  const totalBudgetMs = options.totalBudgetMs ?? DEFAULT_TOTAL_BUDGET_MS;
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? DEFAULT_PER_ATTEMPT_TIMEOUT_MS;
  const primaryMaxRetries = options.primaryMaxRetries ?? PRIMARY_MAX_RETRIES;
  const fallbackMaxRetries = options.fallbackMaxRetries ?? FALLBACK_MAX_RETRIES;

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const groqModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  const startTime = Date.now();
  const deadline = startTime + totalBudgetMs;

  const groqProvider = new GroqProvider({
    apiKey: options.customGroqApiKey,
    fetchFn: options.customGroqFetch,
  });

  const stages: CascadeStage[] = [];

  // Stage 1: Gemini Primary Model
  stages.push({
    providerId: 'gemini',
    model: primaryModel,
    maxRetries: primaryMaxRetries,
    isPrimary: true,
    createProvider: () =>
      new GeminiProvider({
        keyType: 'primary',
        customClient: options.customGeminiClient,
      }),
  });

  // Stage 1b: Optional Fallback Key on Gemini Primary Model for quota exhaustion
  if (hasFallbackApiKey()) {
    stages.push({
      providerId: 'gemini',
      model: primaryModel,
      maxRetries: 1,
      isPrimary: true,
      isQuotaOnlyStage: true,
      createProvider: () => new GeminiProvider({ keyType: 'fallback' }),
    });
  }

  // Stage 2: Gemini Fallback Model
  if (fallbackModel !== primaryModel) {
    stages.push({
      providerId: 'gemini',
      model: fallbackModel,
      maxRetries: fallbackMaxRetries,
      isPrimary: false,
      createProvider: () =>
        new GeminiProvider({
          keyType: 'primary',
          customClient: options.customGeminiClient,
        }),
    });
  }

  // Stage 3: Groq Provider (if configured)
  if (groqProvider.isConfigured()) {
    stages.push({
      providerId: 'groq',
      model: groqModel,
      maxRetries: 1,
      isPrimary: false,
      createProvider: () => groqProvider,
    });
  }

  let lastError: unknown = null;
  let previousWasQuota = false;
  let candidatesCount = 0;
  let openCircuitsCount = 0;

  for (let sIdx = 0; sIdx < stages.length; sIdx++) {
    const stage = stages[sIdx];

    // Check quota-only constraint for secondary Gemini key
    if (stage.isQuotaOnlyStage && !previousWasQuota) {
      continue;
    }

    const provider = stage.createProvider();
    if (!provider.isConfigured()) {
      continue;
    }

    candidatesCount++;

    // Check circuit breaker for this specific (provider, model) combination
    if (isCombinationCircuitOpen(stage.providerId as any, stage.model, Date.now())) {
      openCircuitsCount++;
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          `[AI Cascade] Circuit is OPEN for (${stage.providerId}, model ${stage.model}). Skipping to next available candidate.`
        );
      }
      continue;
    }

    for (let attempt = 0; attempt <= stage.maxRetries; attempt++) {
      const remainingBudget = deadline - Date.now();
      if (remainingBudget <= 500) {
        throw new GeminiApiError(
          'AI planning request timed out waiting for generation across providers.',
          504,
          true,
          'AI_TIMEOUT'
        );
      }

      const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remainingBudget);
      const attemptStart = Date.now();

      try {
        const data = await provider.generateStructured(prompt, schema, {
          timeoutMs: attemptTimeoutMs,
          signal: options.signal,
          temperature: options.temperature,
          model: stage.model,
          normalizer: options.normalizer,
        });

        // Safe server-only attempt logging
        logAiAttempt({
          provider: stage.providerId,
          model: stage.model,
          status: 200,
          category: 'success',
          attempt: attempt + 1,
          durationMs: Date.now() - attemptStart,
        });

        // Record successful call in circuit breaker
        recordCombinationSuccess(stage.providerId as any, stage.model);

        return {
          data,
          source: stage.isPrimary ? 'primary' : 'backup',
          provider: stage.providerId,
          model: stage.model,
        };
      } catch (err: unknown) {
        lastError = err;
        const mapped = mapGeminiError(err);
        const durationMs = Date.now() - attemptStart;

        // Safe server-only attempt logging
        logAiAttempt({
          provider: stage.providerId,
          model: stage.model,
          status: mapped.statusCode,
          category: mapped.code,
          attempt: attempt + 1,
          durationMs,
        });

        const isDailyQuota = isDailyQuotaError(err);
        const isOverload = isOverloadOrTransientError(err);
        previousWasQuota = isQuotaError(err) || isDailyQuota;

        recordCombinationFailure(stage.providerId as any, stage.model, isOverload, Date.now(), isDailyQuota);

        // For a daily quota, do not retry this candidate model; break immediately to secondary provider or abort
        if (isDailyQuota) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(
              `[AI Cascade] Daily quota exhausted on (${stage.providerId}, model ${stage.model}). Disabling combination for 30 minutes and skipping retries.`
            );
          }
          break;
        }

        // If a primary model attempt timed out, reserve the remaining budget for the fallback model
        // instead of retrying and burning the entire budget on the timed-out primary model.
        const isTimeout = mapped.code === 'AI_TIMEOUT' || mapped.code === 'HOSTING_TIMEOUT';
        const remainingAfterThis = deadline - Date.now();
        if (stage.isPrimary && (isTimeout || remainingAfterThis < 12000)) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(
              `[AI Cascade] Primary model attempt timed out or budget low (${remainingAfterThis}ms remaining). Reserving budget for fallback model.`
            );
          }
          break;
        }

        // Check whether to retry the current candidate on genuine overload
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

        // Retries exhausted for this stage; check if error allows falling back to next provider
        if (isEligibleForProviderFallback(err)) {
          break;
        }

        // If error is not eligible for fallback (unrecognized terminal error), throw immediately
        throw err;
      }
    }
  }

  if (lastError) {
    if (lastError instanceof GeminiApiError) {
      throw lastError;
    }
    throw mapGeminiError(lastError);
  }

  // If all candidate stages were skipped due to open circuit breakers,
  // the models are in cooldown from temporary overload/quota spikes.
  if (candidatesCount > 0 && openCircuitsCount >= candidatesCount) {
    const hasDailyQuota = stages.some((s) => isDailyQuotaCombination(s.providerId, s.model));
    if (hasDailyQuota) {
      throw new GeminiApiError(
        "Today's AI capacity for this demo has been used. Prepared plans still work, or try again later.",
        429,
        false,
        'AI_QUOTA_EXHAUSTED'
      );
    }
    throw new GeminiApiError(
      'All configured AI models are currently cooling down due to temporary high demand. Please try again in a few moments, or explore a pre-built celebration plan.',
      503,
      true,
      'AI_BUSY'
    );
  }

  if (candidatesCount === 0) {
    throw new GeminiApiError(
      'No AI provider is configured. Please verify server environment variables or load a saved example plan.',
      500,
      false,
      'AI_NOT_CONFIGURED'
    );
  }

  // Last-resort fallback for unexpected provider cascade exhaustion
  throw new GeminiApiError(
    'AI service is currently busy or unavailable across configured providers. Please retry in a moment.',
    503,
    true,
    'AI_BUSY'
  );
}

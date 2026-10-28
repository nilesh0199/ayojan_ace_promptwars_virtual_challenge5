import { z } from 'zod';
import { AiProvider, AiCallOptions } from './types';
import { executeWithRepairRetry } from './repair';
import { GeminiApiError, isDailyQuotaError } from '../gemini';

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const GROQ_COMPLETIONS_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const BACKUP_PROVIDER_EXPIRED_NOTICE =
  'The backup AI provider is no longer active. This app was built for the PromptWars Challenge 5, and its demo access key was valid for about two months. Plans still work with the main AI and the built-in planner.';

export const MAIN_PROVIDER_EXPIRED_NOTICE =
  'The main AI provider is no longer active. This app was built for the PromptWars Challenge 5, and its demo access key was valid for about two months. Plans still work with curated examples and the built-in planner.';

let groqDisabledUntil = 0;
let hasLoggedBackupKeyExpired = false;

/**
 * Checks whether an ISO date string (e.g. "2026-12-22") has passed relative to nowMs.
 * For date-only format (YYYY-MM-DD), the date has passed once the calendar day has ended in UTC.
 */
export function isDatePassed(dateString: string | undefined | null, nowMs: number = Date.now()): boolean {
  if (!dateString) return false;
  const trimmed = dateString.trim();
  if (!trimmed) return false;

  let expiryTimestamp: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    expiryTimestamp = new Date(`${trimmed}T23:59:59.999Z`).getTime();
  } else {
    expiryTimestamp = new Date(trimmed).getTime();
  }

  if (isNaN(expiryTimestamp)) return false;
  return nowMs > expiryTimestamp;
}

/**
 * Checks whether the Groq backup provider key has expired based on GROQ_KEY_EXPIRES_ON or disable status.
 */
export function isGroqKeyExpired(nowMs: number = Date.now()): boolean {
  if (isGroqDisabled(nowMs)) {
    return true;
  }
  const expiresOn = process.env.GROQ_KEY_EXPIRES_ON;
  return isDatePassed(expiresOn, nowMs);
}

export type GroqDisabledReason = 'expired' | 'model-not-found';
let groqDisabledReason: GroqDisabledReason | null = null;

/**
 * Checks whether Groq has been temporarily or permanently disabled after an authorization rejection (401/403)
 * or missing model (404).
 */
export function isGroqDisabled(nowMs: number = Date.now()): boolean {
  return nowMs < groqDisabledUntil;
}

/**
 * Disables the Groq provider for at least 1 hour (or process lifetime) and logs once on server with no secrets.
 */
export function disableGroqProvider(
  durationMs: number = 365 * 24 * 3600 * 1000,
  reason: GroqDisabledReason = 'expired'
): void {
  groqDisabledUntil = Date.now() + durationMs;
  groqDisabledReason = reason;
  if (!hasLoggedBackupKeyExpired) {
    hasLoggedBackupKeyExpired = true;
    if (reason === 'model-not-found') {
      console.warn(
        '[AI Groq] Configured Groq model was not found (404). Groq provider is now disabled for this session.'
      );
    } else {
      console.warn(
        '[AI Groq] Backup AI provider key was rejected (401/403: invalid, expired or revoked). Groq provider is now disabled.'
      );
    }
  }
}

/**
 * Returns the reason why Groq provider was disabled ('expired' or 'model-not-found').
 */
export function getGroqDisabledReason(): GroqDisabledReason | null {
  return groqDisabledReason;
}

/**
 * Resets disabled state and one-time log flag for testing.
 */
export function resetGroqDisabledStateForTesting(): void {
  groqDisabledUntil = 0;
  groqDisabledReason = null;
  hasLoggedBackupKeyExpired = false;
}

/**
 * Checks whether an environment variable contains an obvious placeholder or dummy template.
 */
function isPlaceholder(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return (
    lower.startsWith('<') ||
    lower.startsWith('your_') ||
    lower.startsWith('gsk_your') ||
    lower.includes('placeholder') ||
    lower.includes('example')
  );
}

export class GroqProvider implements AiProvider {
  public readonly id = 'groq' as const;
  public readonly name = 'Groq Cloud' as const;
  public readonly defaultModel = DEFAULT_GROQ_MODEL;

  private apiKeyOverride?: string;
  private fetchFn?: typeof fetch;

  constructor(options?: { apiKey?: string; fetchFn?: typeof fetch }) {
    this.apiKeyOverride = options?.apiKey;
    this.fetchFn = options?.fetchFn;
  }

  /**
   * Returns true only when GROQ_API_KEY is configured with a valid non-placeholder secret
   * and the backup key is neither expired nor disabled.
   */
  public isConfigured(): boolean {
    const key = this.apiKeyOverride || process.env.GROQ_API_KEY;
    if (!key || key.trim().length === 0 || isPlaceholder(key)) {
      return false;
    }
    if (this.isExpired()) {
      return false;
    }
    return true;
  }

  /**
   * Returns true if the key format is configured regardless of expiry.
   */
  public isKeyConfigured(): boolean {
    const key = this.apiKeyOverride || process.env.GROQ_API_KEY;
    return Boolean(key && key.trim().length > 0 && !isPlaceholder(key));
  }

  public isExpired(nowMs: number = Date.now()): boolean {
    return isGroqKeyExpired(nowMs);
  }

  private getApiKey(): string {
    const key = this.apiKeyOverride || process.env.GROQ_API_KEY;
    if (!key || key.trim().length === 0 || isPlaceholder(key)) {
      throw new GeminiApiError(
        'Groq API key is not configured. Set GROQ_API_KEY in server environment variables or load a saved plan.',
        500,
        false,
        'AI_NOT_CONFIGURED'
      );
    }
    return key.trim();
  }

  public getModel(options?: AiCallOptions): string {
    return options?.model || process.env.GROQ_MODEL || this.defaultModel;
  }

  /**
   * Generates structured JSON adhering to the provided Zod schema using Groq's chat completions endpoint.
   */
  public async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T, any, any>,
    options?: AiCallOptions
  ): Promise<T> {
    if (this.isExpired()) {
      throw new GeminiApiError(
        'Groq backup AI provider key is expired or disabled.',
        401,
        false,
        'AI_BACKUP_KEY_EXPIRED'
      );
    }

    const apiKey = this.getApiKey();
    const model = this.getModel(options);
    const timeoutMs = options?.timeoutMs ?? 10000;
    const fetchToUse = this.fetchFn || fetch;

    const generateRaw = async (currentPrompt: string, signal?: AbortSignal): Promise<string> => {
      let timerId: ReturnType<typeof setTimeout> | undefined;

      const activeSignal = signal || options?.signal;
      if (activeSignal?.aborted) {
        throw new GeminiApiError('Request aborted by caller', 504, true, 'AI_TIMEOUT');
      }

      const abortPromise = new Promise<never>((_, reject) => {
        activeSignal?.addEventListener(
          'abort',
          () => reject(new GeminiApiError('Request aborted by caller', 504, true, 'AI_TIMEOUT')),
          { once: true }
        );

        if (timeoutMs > 0) {
          timerId = setTimeout(() => {
            reject(new GeminiApiError(`Groq planning request timed out after ${timeoutMs}ms.`, 504, true, 'AI_TIMEOUT'));
          }, timeoutMs);
        }
      });

      try {
        const requestPromise = fetchToUse(GROQ_COMPLETIONS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a professional celebration and event planning assistant. Output ONLY a valid JSON object matching the required structure. Never output markdown fences, code blocks, or conversational text.',
              },
              {
                role: 'user',
                content: currentPrompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: options?.temperature ?? 0.3,
          }),
        });

        const response = await Promise.race([requestPromise, abortPromise]);

        if (!response.ok) {
          const status = response.status;
          const errData = await response.json().catch(() => null);
          const errMsg =
            typeof errData?.error?.message === 'string'
              ? errData.error.message
              : typeof errData?.message === 'string'
              ? errData.message
              : '';
          const lowerMsg = errMsg.toLowerCase();

          if (status === 401 || status === 403) {
            disableGroqProvider();
            throw new GeminiApiError(
              'Groq authorization failed: backup AI provider key is invalid, expired, or revoked.',
              status,
              false,
              'AI_BACKUP_KEY_EXPIRED'
            );
          }
          if (
            status === 404 ||
            lowerMsg.includes('not found') ||
            lowerMsg.includes('does not exist') ||
            lowerMsg.includes('unknown model')
          ) {
            disableGroqProvider(365 * 24 * 3600 * 1000, 'model-not-found');
            throw new GeminiApiError(
              `Configured Groq model was not found: ${model}.`,
              404,
              false,
              'AI_MODEL_NOT_FOUND'
            );
          }
          if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('quota')) {
            if (isDailyQuotaError(errMsg || 'Groq quota exceeded')) {
              throw new GeminiApiError(
                "Today's AI capacity for this demo has been used. Prepared plans still work, or try again later.",
                429,
                false,
                'AI_QUOTA_EXHAUSTED'
              );
            }
            throw new GeminiApiError(
              'Groq API rate limit or quota exceeded.',
              429,
              true,
              'AI_BUSY'
            );
          }
          if (status === 504 || status === 408) {
            throw new GeminiApiError(
              'Groq API request timed out.',
              504,
              true,
              'AI_TIMEOUT'
            );
          }
          if (status >= 500) {
            throw new GeminiApiError(
              `Groq server temporarily unavailable (status ${status}).`,
              503,
              true,
              'AI_BUSY'
            );
          }
          if (status === 400 || status === 422) {
            throw new GeminiApiError(
              `Groq request validation failed: ${errMsg || 'Invalid request parameters'}.`,
              502,
              false,
              'AI_VALIDATION_FAILED'
            );
          }
          throw new GeminiApiError(
            `Groq API request failed with status ${status}.`,
            status,
            false,
            'AI_ERROR'
          );
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content || typeof content !== 'string') {
          throw new GeminiApiError('Groq returned empty response content', 502, true, 'AI_VALIDATION_FAILED');
        }

        return content;
      } catch (err) {
        if (err instanceof GeminiApiError) {
          throw err;
        }

        const msg = err instanceof Error ? err.message : String(err || '');
        if (
          activeSignal?.aborted ||
          msg.toLowerCase().includes('aborted') ||
          msg.toLowerCase().includes('timeout')
        ) {
          throw new GeminiApiError(
            `Groq planning request timed out after ${timeoutMs}ms.`,
            504,
            true,
            'AI_TIMEOUT'
          );
        }

        throw new GeminiApiError(
          'Network error while connecting to Groq AI service.',
          503,
          true,
          'AI_BUSY'
        );
      } finally {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
      }
    };

    return executeWithRepairRetry(generateRaw, prompt, schema, options?.signal);
  }
}

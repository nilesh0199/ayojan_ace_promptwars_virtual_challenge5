import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  GroqProvider,
  DEFAULT_GROQ_MODEL,
  GROQ_COMPLETIONS_ENDPOINT,
  isGroqKeyExpired,
  isGroqDisabled,
  disableGroqProvider,
  resetGroqDisabledStateForTesting,
} from '@/lib/ai/groq-provider';
import { GeminiProvider } from '@/lib/ai/gemini-provider';
import { executeAiCascade, isEligibleForProviderFallback } from '@/lib/ai/orchestrator';
import { executeWithRepairRetry } from '@/lib/ai/repair';
import {
  GeminiApiError,
  resetCircuitBreaker,
  recordCombinationFailure,
  isCombinationCircuitOpen,
} from '@/lib/gemini';
import { GoogleGenAI } from '@google/genai';

describe('AI Provider Abstraction, Groq Integration & Failover Cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
    resetGroqDisabledStateForTesting();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash';
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.GROQ_KEY_EXPIRES_ON;
    delete process.env.GEMINI_API_KEY_FALLBACK;
  });

  afterEach(() => {
    vi.useRealTimers();
    resetCircuitBreaker();
    resetGroqDisabledStateForTesting();
  });

  describe('GroqProvider Implementation', () => {
    const testSchema = z.object({
      planName: z.string(),
      estimatedCost: z.number(),
    });

    it('correctly detects configured vs unconfigured / placeholder API keys', () => {
      const providerNoKey = new GroqProvider();
      expect(providerNoKey.isConfigured()).toBe(false);

      process.env.GROQ_API_KEY = '   ';
      expect(providerNoKey.isConfigured()).toBe(false);

      process.env.GROQ_API_KEY = 'your_groq_api_key_here';
      expect(providerNoKey.isConfigured()).toBe(false);

      process.env.GROQ_API_KEY = '<insert_groq_key>';
      expect(providerNoKey.isConfigured()).toBe(false);

      process.env.GROQ_API_KEY = 'gsk_validProductionGroqSecretKey123';
      expect(providerNoKey.isConfigured()).toBe(true);
      expect(providerNoKey.defaultModel).toBe(DEFAULT_GROQ_MODEL);
    });

    it('executes chat completion with JSON mode and returns validated schema data', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ planName: 'Royal Sangeet', estimatedCost: 500000 }),
              },
            },
          ],
        }),
      });

      const provider = new GroqProvider({
        apiKey: 'gsk_testKey123',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const result = await provider.generateStructured('Plan a celebration', testSchema);
      expect(result.planName).toBe('Royal Sangeet');
      expect(result.estimatedCost).toBe(500000);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(GROQ_COMPLETIONS_ENDPOINT);
      expect(init.headers['Authorization']).toBe('Bearer gsk_testKey123');
      expect(init.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(init.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.model).toBe(DEFAULT_GROQ_MODEL);
    });

    it('handles 401 and 403 by mapping to AI_BACKUP_KEY_EXPIRED, disabling the provider, and logging once safely', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const secretKey = 'gsk_secretKey999ExpiredRevoked';

      const mockFetch401 = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid or expired API Key provided by caller' } }),
      });

      const provider = new GroqProvider({
        apiKey: secretKey,
        fetchFn: mockFetch401 as unknown as typeof fetch,
      });

      // Call 1: triggers 401
      await expect(provider.generateStructured('Test celebration', testSchema)).rejects.toMatchObject({
        statusCode: 401,
        code: 'AI_BACKUP_KEY_EXPIRED',
      });

      // Provider must be disabled now
      expect(isGroqDisabled()).toBe(true);
      expect(provider.isConfigured()).toBe(false);

      // Verify server log emitted once with zero secrets or user text
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const loggedMsg = consoleWarnSpy.mock.calls[0][0];
      expect(loggedMsg).toContain('401/403');
      expect(loggedMsg).not.toContain(secretKey);
      expect(loggedMsg).not.toContain('Test celebration');

      // Call 2: should be rejected immediately because provider is disabled, without invoking network fetch again
      await expect(provider.generateStructured('Another request', testSchema)).rejects.toMatchObject({
        code: 'AI_BACKUP_KEY_EXPIRED',
      });
      expect(mockFetch401).toHaveBeenCalledTimes(1); // No new network call
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1); // No duplicate log

      consoleWarnSpy.mockRestore();
    });

    it('handles 403 Forbidden by mapping to AI_BACKUP_KEY_EXPIRED', async () => {
      const mockFetch403 = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Access forbidden: key revoked' } }),
      });

      const provider = new GroqProvider({
        apiKey: 'gsk_revokedKey',
        fetchFn: mockFetch403 as unknown as typeof fetch,
      });

      await expect(provider.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 403,
        code: 'AI_BACKUP_KEY_EXPIRED',
      });
      expect(isGroqDisabled()).toBe(true);
    });

    it('evaluates GROQ_KEY_EXPIRES_ON accurately: before, on, and after the date using fake timers', async () => {
      vi.useFakeTimers();
      process.env.GROQ_API_KEY = 'gsk_validDemoKey123';
      process.env.GROQ_KEY_EXPIRES_ON = '2026-12-22';

      const provider = new GroqProvider();

      // State 1: Before the date (2026-12-21) -> Key is ACTIVE
      vi.setSystemTime(new Date('2026-12-21T14:30:00Z'));
      expect(isGroqKeyExpired()).toBe(false);
      expect(provider.isConfigured()).toBe(true);

      // State 2: On the date (2026-12-22) -> Key is still ACTIVE (the date has not passed yet)
      vi.setSystemTime(new Date('2026-12-22T18:00:00Z'));
      expect(isGroqKeyExpired()).toBe(false);
      expect(provider.isConfigured()).toBe(true);

      // State 3: After the date (2026-12-23) -> Date has passed, Key is EXPIRED
      vi.setSystemTime(new Date('2026-12-23T00:00:01Z'));
      expect(isGroqKeyExpired()).toBe(true);
      expect(provider.isConfigured()).toBe(false);

      // When expired, calling generateStructured directly fails with AI_BACKUP_KEY_EXPIRED
      await expect(provider.generateStructured('Prompt', testSchema)).rejects.toMatchObject({
        code: 'AI_BACKUP_KEY_EXPIRED',
      });

      vi.useRealTimers();
    });

    it('handles 429 Quota Exceeded by mapping to AI_BUSY', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit reached' } }),
      });

      const provider = new GroqProvider({
        apiKey: 'gsk_validKey',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(provider.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 429,
        code: 'AI_BUSY',
        isRetryable: true,
      });
    });

    it('handles timeout and abort signals cleanly with AI_TIMEOUT', async () => {
      const abortController = new AbortController();
      const mockFetch = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        });
      });

      const provider = new GroqProvider({
        apiKey: 'gsk_validKey',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const promise = provider.generateStructured('Test', testSchema, {
        signal: abortController.signal,
      });

      abortController.abort();
      await expect(promise).rejects.toMatchObject({
        statusCode: 504,
        code: 'AI_TIMEOUT',
      });
    });
  });

  describe('Malformed JSON Single Repair Retry', () => {
    const testSchema = z.object({
      category: z.string(),
      amount: z.number().positive(),
    });

    it('retries once with repair prompt on malformed JSON and succeeds', async () => {
      let callCount = 0;
      const generateRaw = vi.fn().mockImplementation(async (prompt: string) => {
        callCount++;
        if (callCount === 1) {
          // First attempt: broken JSON snippet
          return '{"category": "Decor", "amount": ';
        }
        // Second attempt (repair): valid JSON
        expect(prompt).toContain('REPAIR DIRECTIVE');
        return '{"category": "Decor", "amount": 75000}';
      });

      const result = await executeWithRepairRetry(generateRaw, 'Original instruction', testSchema);
      expect(result).toEqual({ category: 'Decor', amount: 75000 });
      expect(generateRaw).toHaveBeenCalledTimes(2);
    });

    it('retries once on schema mismatch and fails gracefully if repaired response still fails', async () => {
      const generateRaw = vi.fn().mockImplementation(async () => {
        // Returns negative amount both times
        return JSON.stringify({ category: 'Venue', amount: -500 });
      });

      await expect(
        executeWithRepairRetry(generateRaw, 'Original instruction', testSchema)
      ).rejects.toMatchObject({
        statusCode: 502,
        code: 'AI_VALIDATION_FAILED',
      });

      // Must attempt original call + exactly 1 repair retry
      expect(generateRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-Provider Cascade Orchestration', () => {
    const testSchema = z.object({
      status: z.string(),
    });

    it('routes to primary Gemini model when healthy', async () => {
      const mockGeminiClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({ status: 'primary-success' }),
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await executeAiCascade('Test', testSchema, {
        customGeminiClient: mockGeminiClient,
      });

      expect(result.source).toBe('primary');
      expect(result.provider).toBe('gemini');
      expect(result.model).toBe('gemini-3.8-flash');
      expect(result.data.status).toBe('primary-success');
    });

    it('cascades to Gemini fallback model when primary encounters overload (503)', async () => {
      let callIndex = 0;
      const mockGeminiClient = {
        models: {
          generateContent: vi.fn().mockImplementation(({ model }: { model: string }) => {
            callIndex++;
            if (model === 'gemini-3.8-flash') {
              throw new Error('503 Service Unavailable Overloaded');
            }
            return {
              text: JSON.stringify({ status: 'fallback-model-success' }),
            };
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await executeAiCascade('Test', testSchema, {
        customGeminiClient: mockGeminiClient,
        primaryMaxRetries: 0,
      });

      expect(result.source).toBe('backup');
      expect(result.provider).toBe('gemini');
      expect(result.model).toBe('gemini-3.5-flash');
      expect(result.data.status).toBe('fallback-model-success');
    });

    it('cascades to Groq when both Gemini models fail with overload', async () => {
      process.env.GROQ_API_KEY = 'gsk_validTestGroqKey';

      const mockGeminiClient = {
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error('503 Model Overloaded')),
        },
      } as unknown as GoogleGenAI;

      const mockGroqFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ status: 'groq-success' }) } }],
        }),
      });

      const result = await executeAiCascade('Test', testSchema, {
        customGeminiClient: mockGeminiClient,
        customGroqFetch: mockGroqFetch as unknown as typeof fetch,
        primaryMaxRetries: 0,
        fallbackMaxRetries: 0,
      });

      expect(result.source).toBe('backup');
      expect(result.provider).toBe('groq');
      expect(result.data.status).toBe('groq-success');
    });

    it('tracks independent circuit breakers per provider and model', () => {
      // Record 3 failures for primary gemini
      recordCombinationFailure('gemini' as any, 'gemini-3.8-flash', true);
      recordCombinationFailure('gemini' as any, 'gemini-3.8-flash', true);
      recordCombinationFailure('gemini' as any, 'gemini-3.8-flash', true);

      // Primary gemini circuit must be open
      expect(isCombinationCircuitOpen('gemini' as any, 'gemini-3.8-flash')).toBe(true);

      // Groq and fallback gemini circuits must remain CLOSED
      expect(isCombinationCircuitOpen('gemini' as any, 'gemini-3.5-flash')).toBe(false);
      expect(isCombinationCircuitOpen('groq' as any, DEFAULT_GROQ_MODEL)).toBe(false);
    });

    it('identifies eligible error types for fallback to Groq', () => {
      expect(isEligibleForProviderFallback(new GeminiApiError('Busy', 503, true, 'AI_BUSY'))).toBe(true);
      expect(isEligibleForProviderFallback(new GeminiApiError('Quota', 429, true, 'AI_BUSY'))).toBe(true);
      expect(isEligibleForProviderFallback(new GeminiApiError('Timeout', 504, true, 'AI_TIMEOUT'))).toBe(true);
      expect(isEligibleForProviderFallback(new GeminiApiError('Bad Key', 401, false, 'AI_INVALID_KEY'))).toBe(true);
      expect(isEligibleForProviderFallback(new GeminiApiError('Backup Expired', 401, false, 'AI_BACKUP_KEY_EXPIRED'))).toBe(true);
      expect(isEligibleForProviderFallback(new Error('Quota exceeded 429'))).toBe(true);
    });

    it('skips Groq entirely during cascade when GROQ_KEY_EXPIRES_ON has passed', async () => {
      vi.useFakeTimers();
      process.env.GROQ_API_KEY = 'gsk_validKey';
      process.env.GROQ_KEY_EXPIRES_ON = '2026-12-22';
      vi.setSystemTime(new Date('2026-12-23T00:00:01Z')); // After expiration

      const mockGeminiClient = {
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
        },
      } as unknown as GoogleGenAI;

      const mockGroqFetch = vi.fn();

      await expect(
        executeAiCascade('Test', testSchema, {
          customGeminiClient: mockGeminiClient,
          customGroqFetch: mockGroqFetch as unknown as typeof fetch,
          primaryMaxRetries: 0,
          fallbackMaxRetries: 0,
        })
      ).rejects.toMatchObject({
        code: 'AI_BUSY',
      });

      // Groq must NEVER be called when expired
      expect(mockGroqFetch).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('skips open circuit stages in cascade and selects next healthy provider', async () => {
      // Trip primary gemini circuit
      recordCombinationFailure('gemini' as any, 'gemini-3.8-flash', true);
      recordCombinationFailure('gemini' as any, 'gemini-3.8-flash', true);
      recordCombinationFailure('gemini' as any, 'gemini-3.8-flash', true);

      const mockGeminiClient = {
        models: {
          generateContent: vi.fn().mockImplementation(({ model }: { model: string }) => {
            if (model === 'gemini-3.8-flash') {
              throw new Error('Should not be called because circuit is open');
            }
            return {
              text: JSON.stringify({ status: 'fallback-after-circuit-skip' }),
            };
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await executeAiCascade('Test', testSchema, {
        customGeminiClient: mockGeminiClient,
      });

      expect(result.source).toBe('backup');
      expect(result.model).toBe('gemini-3.5-flash');
      expect(result.data.status).toBe('fallback-after-circuit-skip');
    });

    it('throws AI_BUSY when all AI providers in the cascade fail', async () => {
      const mockGeminiClient = {
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
        },
      } as unknown as GoogleGenAI;

      await expect(
        executeAiCascade('Test', testSchema, {
          customGeminiClient: mockGeminiClient,
          primaryMaxRetries: 0,
          fallbackMaxRetries: 0,
        })
      ).rejects.toMatchObject({
        code: 'AI_BUSY',
      });
    });

    it('enforces total budget and throws AI_TIMEOUT when remaining budget is under 500ms', async () => {
      await expect(
        executeAiCascade('Test', testSchema, {
          totalBudgetMs: 200,
        })
      ).rejects.toMatchObject({
        statusCode: 504,
        code: 'AI_TIMEOUT',
      });
    });
  });

  describe('GeminiProvider edge cases & error handling', () => {
    const testSchema = z.object({ value: z.string() });

    it('validates configuration status for primary and fallback keys', () => {
      process.env.GEMINI_API_KEY = 'valid-key';
      const primaryProvider = new GeminiProvider({ keyType: 'primary' });
      expect(primaryProvider.isConfigured()).toBe(true);

      const fallbackProvider = new GeminiProvider({ keyType: 'fallback' });
      expect(fallbackProvider.isConfigured()).toBe(false);

      process.env.GEMINI_API_KEY_FALLBACK = 'valid-fallback-key';
      expect(fallbackProvider.isConfigured()).toBe(true);
    });

    it('throws AI_VALIDATION_FAILED when Gemini returns empty or non-string text', async () => {
      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: '' }),
        },
      } as unknown as GoogleGenAI;

      const provider = new GeminiProvider({ customClient: mockClient });
      await expect(provider.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 502,
        code: 'AI_VALIDATION_FAILED',
      });
    });

    it('aborts immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: '{"value": "1"}' }),
        },
      } as unknown as GoogleGenAI;

      const provider = new GeminiProvider({ customClient: mockClient });
      await expect(
        provider.generateStructured('Test', testSchema, { signal: controller.signal })
      ).rejects.toMatchObject({
        statusCode: 504,
        code: 'AI_TIMEOUT',
      });
    });
  });

  describe('GroqProvider additional error handling', () => {
    const testSchema = z.object({ value: z.string() });

    it('throws AI_NOT_CONFIGURED when generating without an API key', async () => {
      const provider = new GroqProvider();
      await expect(provider.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 500,
        code: 'AI_NOT_CONFIGURED',
      });
    });

    it('handles 404 Model Not Found and 500 server error', async () => {
      const mockFetch404 = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Model not found' } }),
      });
      const provider404 = new GroqProvider({
        apiKey: 'gsk_test',
        fetchFn: mockFetch404 as unknown as typeof fetch,
      });
      await expect(provider404.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 404,
        code: 'AI_MODEL_NOT_FOUND',
      });

      const mockFetch500 = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal Server Error' } }),
      });
      const provider500 = new GroqProvider({
        apiKey: 'gsk_test',
        fetchFn: mockFetch500 as unknown as typeof fetch,
      });
      await expect(provider500.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 503,
        code: 'AI_BUSY',
      });
    });

    it('handles empty choices in Groq response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [] }),
      });
      const provider = new GroqProvider({
        apiKey: 'gsk_test',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      await expect(provider.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 502,
        code: 'AI_VALIDATION_FAILED',
      });
    });

    it('handles unexpected network fetch error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Fetch failed connect ECONNREFUSED'));
      const provider = new GroqProvider({
        apiKey: 'gsk_test',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      await expect(provider.generateStructured('Test', testSchema)).rejects.toMatchObject({
        statusCode: 503,
        code: 'AI_BUSY',
      });
    });
  });
});

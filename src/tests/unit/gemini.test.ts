import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractJsonFromResponse,
  callGeminiStructured,
  getGeminiClient,
  mapGeminiError,
  GeminiApiError,
  isPrimaryCircuitOpen,
  recordPrimaryFailure,
  recordPrimarySuccess,
  resetCircuitBreaker,
  tripCircuitBreakerForTesting,
  getCircuitBreakerState,
  getFriendlyAiError,
  isOverloadOrTransientError,
  GeminiErrorCode,
} from '@/lib/gemini';
import { handleApiError } from '@/lib/api-helper';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

describe('Gemini SDK Integration, Resilience & Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash';
  });

  afterEach(() => {
    vi.useRealTimers();
    resetCircuitBreaker();
  });

  it('extracts raw JSON when wrapped in markdown codeblocks', () => {
    const raw = '```json\n{"needsFollowUp": false}\n```';
    expect(extractJsonFromResponse(raw)).toBe('{"needsFollowUp": false}');

    const clean = '{"needsFollowUp": true}';
    expect(extractJsonFromResponse(clean)).toBe('{"needsFollowUp": true}');
  });

  it('successfully returns validated data when model responds cleanly', async () => {
    const mockSchema = z.object({
      greeting: z.string(),
      count: z.number(),
    });

    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({ greeting: 'Namaste', count: 5 }),
        }),
      },
    } as unknown as GoogleGenAI;

    const result = await callGeminiStructured('test prompt', mockSchema, {
      customClient: mockClient,
      primaryMaxRetries: 0,
    });

    expect(result.greeting).toBe('Namaste');
    expect(result.count).toBe(5);
  });

  describe('Retry & Exponential Backoff Logic with Timers', () => {
    it('retries transient 503 errors up to 2 times with backoff before succeeding', async () => {
      vi.useFakeTimers();

      const mockSchema = z.object({ value: z.number() });
      let callCount = 0;
      const generateContentMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new GeminiApiError('503 Service Unavailable', 503, true, 'AI_BUSY');
        }
        if (callCount === 2) {
          throw new GeminiApiError('429 Rate Limit Exceeded', 429, true, 'AI_BUSY');
        }
        return {
          text: JSON.stringify({ value: 108 }),
        };
      });

      const mockClient = {
        models: {
          generateContent: generateContentMock,
        },
      } as unknown as GoogleGenAI;

      const callPromise = callGeminiStructured('prompt', mockSchema, {
        customClient: mockClient,
        primaryMaxRetries: 2,
        jitterFn: () => 0.2, // 0.2 * 250 = 50ms deterministic jitter
      });

      // Advance timers for both backoff sleeps (400 + 50 = 450ms, then 800 + 50 = 850ms)
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(500);

      const result = await callPromise;
      expect(result.value).toBe(108);
      expect(generateContentMock).toHaveBeenCalledTimes(3);
    });

    it('identifies transient overload errors accurately with isOverloadOrTransientError', () => {
      expect(isOverloadOrTransientError(new Error('503 Service Unavailable'))).toBe(true);
      expect(isOverloadOrTransientError(new Error('429 RESOURCE_EXHAUSTED'))).toBe(true);
      expect(isOverloadOrTransientError(new Error('upstream UNAVAILABLE'))).toBe(true);
      expect(isOverloadOrTransientError(new Error('Server overloaded with high demand'))).toBe(true);
      expect(isOverloadOrTransientError(new Error('Request timed out after 8000ms'))).toBe(true);
      expect(isOverloadOrTransientError(new GeminiApiError('Busy', 429, true, 'AI_BUSY'))).toBe(true);
      expect(isOverloadOrTransientError(new Error('invalid syntax error'))).toBe(false);
    });
  });

  describe('Fallback Model Switching', () => {
    it('switches to fallback model when primary model exhausts retries', async () => {
      vi.useFakeTimers();

      const mockSchema = z.object({ source: z.string() });
      const calledModels: string[] = [];

      const generateContentMock = vi.fn().mockImplementation(async ({ model }: { model: string }) => {
        calledModels.push(model);
        if (model === 'gemini-3.8-flash') {
          throw new Error('503 Service Unavailable');
        }
        return {
          text: JSON.stringify({ source: 'fallback-success' }),
        };
      });

      const mockClient = {
        models: {
          generateContent: generateContentMock,
        },
      } as unknown as GoogleGenAI;

      const callPromise = callGeminiStructured('test prompt', mockSchema, {
        customClient: mockClient,
        primaryMaxRetries: 2,
        fallbackMaxRetries: 1,
        jitterFn: () => 0,
      });

      // Advance timers for backoff sleeps
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(500);

      const result = await callPromise;
      expect(result.source).toBe('fallback-success');

      // Primary was called 3 times (initial + 2 retries), then fallback called once
      expect(calledModels).toEqual([
        'gemini-3.8-flash',
        'gemini-3.8-flash',
        'gemini-3.8-flash',
        'gemini-3.5-flash',
      ]);
    });

    it('retries fallback model once before throwing final error', async () => {
      vi.useFakeTimers();

      const mockSchema = z.object({ ok: z.boolean() });
      const calledModels: string[] = [];

      const generateContentMock = vi.fn().mockImplementation(async ({ model }: { model: string }) => {
        calledModels.push(model);
        if (model === 'gemini-3.8-flash') {
          throw new Error('503 Service Unavailable');
        }
        // Fallback fails once with 429, then succeeds on retry
        if (calledModels.filter((m) => m === 'gemini-3.5-flash').length === 1) {
          throw new Error('429 Quota Exceeded');
        }
        return {
          text: JSON.stringify({ ok: true }),
        };
      });

      const mockClient = {
        models: {
          generateContent: generateContentMock,
        },
      } as unknown as GoogleGenAI;

      const callPromise = callGeminiStructured('prompt', mockSchema, {
        customClient: mockClient,
        primaryMaxRetries: 1,
        fallbackMaxRetries: 1,
        jitterFn: () => 0,
      });

      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);

      const result = await callPromise;
      expect(result.ok).toBe(true);
      expect(calledModels.filter((m) => m === 'gemini-3.5-flash').length).toBe(2);
    });
  });

  describe('Circuit Breaker Resilience', () => {
    it('trips the circuit breaker after 3 consecutive overload failures on primary model', () => {
      expect(isPrimaryCircuitOpen()).toBe(false);

      recordPrimaryFailure(true);
      expect(isPrimaryCircuitOpen()).toBe(false);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(1);

      recordPrimaryFailure(true);
      expect(isPrimaryCircuitOpen()).toBe(false);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(2);

      // Third consecutive failure trips circuit
      recordPrimaryFailure(true);
      expect(isPrimaryCircuitOpen()).toBe(true);
      expect(getCircuitBreakerState().isOpen).toBe(true);
    });

    it('bypasses primary model and directs directly to fallback when circuit is open', async () => {
      tripCircuitBreakerForTesting();
      expect(isPrimaryCircuitOpen()).toBe(true);

      const mockSchema = z.object({ modelUsed: z.string() });
      const calledModels: string[] = [];

      const mockClient = {
        models: {
          generateContent: vi.fn().mockImplementation(async ({ model }: { model: string }) => {
            calledModels.push(model);
            return {
              text: JSON.stringify({ modelUsed: model }),
            };
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await callGeminiStructured('prompt', mockSchema, {
        customClient: mockClient,
      });

      expect(result.modelUsed).toBe('gemini-3.5-flash');
      // Primary model was never attempted!
      expect(calledModels).toEqual(['gemini-3.5-flash']);
    });

    it('recovers after the 60-second cooldown period expires', () => {
      const now = 1000000;
      tripCircuitBreakerForTesting(60000, now);

      // During 60s cooldown
      expect(isPrimaryCircuitOpen(now + 30000)).toBe(true);
      expect(isPrimaryCircuitOpen(now + 59999)).toBe(true);

      // After 60s cooldown
      expect(isPrimaryCircuitOpen(now + 60001)).toBe(false);
    });

    it('resets consecutive failures counter upon successful primary model call', () => {
      recordPrimaryFailure(true);
      recordPrimaryFailure(true);
      expect(getCircuitBreakerState().consecutiveFailures).toBe(2);

      recordPrimarySuccess();
      expect(getCircuitBreakerState().consecutiveFailures).toBe(0);
      expect(isPrimaryCircuitOpen()).toBe(false);
    });
  });

  describe('Typed Error Code Mapping & Schema Enforcement', () => {
    it('maps invalid api key errors to 401 AI_INVALID_KEY', () => {
      const err = mapGeminiError(
        new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.')
      );
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AI_INVALID_KEY');
      expect(err.isRetryable).toBe(false);
      expect(err.message).toContain('Gemini API key is invalid or unauthorized');
    });

    it('maps model not found errors to 404 AI_MODEL_NOT_FOUND', () => {
      const err = mapGeminiError(new Error('models/gemini-unsupported is not found'));
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('AI_MODEL_NOT_FOUND');
      expect(err.isRetryable).toBe(false);
      expect(err.message).toContain('Requested Gemini AI model was not found');
    });

    it('maps quota / rate limit errors to 429 retryable AI_BUSY', () => {
      const err = mapGeminiError(new Error('RESOURCE_EXHAUSTED: quota exceeded 429'));
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('AI_BUSY');
      expect(err.isRetryable).toBe(true);
      expect(err.message).toContain('experiencing high demand');
    });

    it('maps timeout errors to 504 retryable AI_TIMEOUT', () => {
      const err = mapGeminiError(new Error('Request timed out after 25000ms'));
      expect(err.statusCode).toBe(504);
      expect(err.code).toBe('AI_TIMEOUT');
      expect(err.isRetryable).toBe(true);
      expect(err.message).toContain('timed out waiting for generation');
    });

    it('maps validation and malformed JSON to 502 AI_VALIDATION_FAILED', () => {
      const err = mapGeminiError(new Error('schema validation failed: missing field'));
      expect(err.statusCode).toBe(502);
      expect(err.code).toBe('AI_VALIDATION_FAILED');
      expect(err.message).toContain('Gemini response format requires refinement');
    });

    it('throws AI_NOT_CONFIGURED when GEMINI_API_KEY is not defined in environment', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => getGeminiClient()).toThrow();
      try {
        getGeminiClient();
      } catch (e) {
        expect((e as GeminiApiError).code).toBe('AI_NOT_CONFIGURED');
      }
    });

    it('throws AI_VALIDATION_FAILED when AI response violates schema', async () => {
      const mockSchema = z.object({
        requiredNumber: z.number(),
      });

      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({ requiredNumber: 'not-a-number' }),
          }),
        },
      } as unknown as GoogleGenAI;

      await expect(
        callGeminiStructured('prompt', mockSchema, {
          customClient: mockClient,
          primaryMaxRetries: 0,
          fallbackMaxRetries: 0,
        })
      ).rejects.toThrow();
    });

    it('provides friendly, reassuring title and copy for every typed GeminiErrorCode', () => {
      const errorCodes: GeminiErrorCode[] = [
        'AI_BUSY',
        'AI_TIMEOUT',
        'AI_NOT_CONFIGURED',
        'AI_INVALID_KEY',
        'AI_MODEL_NOT_FOUND',
        'AI_VALIDATION_FAILED',
        'AI_ERROR',
      ];

      for (const code of errorCodes) {
        const info = getFriendlyAiError(code);
        expect(info.title).toBeTruthy();
        expect(info.message).toBeTruthy();
        expect(info.actionHint).toBeTruthy();
        // Positive copy check: doesn't blame the user or use panic words
        expect(info.message.toLowerCase()).not.toContain('fatal');
        expect(info.message.toLowerCase()).not.toContain('crashed');
      }
    });
  });

  describe('Zero Upstream Leakage Check (Security)', () => {
    it('guarantees handleApiError never leaks raw upstream error JSON or secrets in responses', async () => {
      // Construct a hostile raw upstream error with sensitive data
      const upstreamError = new Error(
        'upstream server at 192.168.1.1:443 dumped {"apiKey": "AIzaSySecretApiKey12345", "internalDb": "postgres://user:pass@internal:5432"}'
      );

      const response = handleApiError(upstreamError);
      const data = await response.json();

      expect(data.error).toBe('AI Planning Service Alert');
      expect(data.code).toBe('AI_BUSY');
      expect(data.message).toBe(
        'AI service is currently busy or unavailable. Please retry or load a saved example plan.'
      );

      // Verify zero sensitive data is leaked
      const stringified = JSON.stringify(data);
      expect(stringified).not.toContain('192.168.1.1');
      expect(stringified).not.toContain('AIzaSySecretApiKey12345');
      expect(stringified).not.toContain('postgres://');
      expect(stringified).not.toContain('internalDb');
    });

    it('returns typed error code AI_VALIDATION_FAILED without leaking raw data on Zod validation error', async () => {
      const schema = z.object({ eventType: z.literal('Wedding') });
      const parseResult = schema.safeParse({ eventType: 'InvalidType' });
      if (!parseResult.success) {
        const response = handleApiError(parseResult.error);
        const data = await response.json();
        expect(data.error).toBe('Validation Error');
        expect(data.code).toBe('AI_VALIDATION_FAILED');
        expect(data.issues).toBeDefined();
      }
    });
  });

  describe('Backup Gemini API Key & Multi-Stage Execution Order', () => {
    it('executes fallback key with primary model specifically on quota (429/RESOURCE_EXHAUSTED) errors', async () => {
      const callLog: Array<{ keyType: string; model: string }> = [];
      const mockSchema = z.object({ success: z.boolean() });

      const clientProvider = (keyType: 'primary' | 'fallback') => {
        return {
          models: {
            generateContent: vi.fn().mockImplementation(async ({ model }: { model: string }) => {
              callLog.push({ keyType, model });
              if (keyType === 'primary' && model === 'gemini-3.8-flash') {
                throw new GeminiApiError('429 RESOURCE_EXHAUSTED Quota Exceeded', 429, true, 'AI_BUSY');
              }
              return {
                text: JSON.stringify({ success: true }),
              };
            }),
          },
        } as unknown as GoogleGenAI;
      };

      const result = await callGeminiStructured('test prompt', mockSchema, {
        clientProvider,
        primaryMaxRetries: 0,
      });

      expect(result.success).toBe(true);
      expect(callLog).toEqual([
        { keyType: 'primary', model: 'gemini-3.8-flash' },
        { keyType: 'fallback', model: 'gemini-3.8-flash' },
      ]);
    });

    it('skips fallback key on primary model when failure is general 503 overload and proceeds to fallback model', async () => {
      const callLog: Array<{ keyType: string; model: string }> = [];
      const mockSchema = z.object({ success: z.boolean() });

      const clientProvider = (keyType: 'primary' | 'fallback') => {
        return {
          models: {
            generateContent: vi.fn().mockImplementation(async ({ model }: { model: string }) => {
              callLog.push({ keyType, model });
              if (model === 'gemini-3.8-flash') {
                // 503 service unavailable is server overload, not quota
                throw new GeminiApiError('503 Service Unavailable', 503, true, 'AI_BUSY');
              }
              return {
                text: JSON.stringify({ success: true }),
              };
            }),
          },
        } as unknown as GoogleGenAI;
      };

      const result = await callGeminiStructured('test prompt', mockSchema, {
        clientProvider,
        primaryMaxRetries: 0,
      });

      expect(result.success).toBe(true);
      // Because 503 is not quota, fallback key with primary model is skipped, routing directly to primary key + fallback model
      expect(callLog).toEqual([
        { keyType: 'primary', model: 'gemini-3.8-flash' },
        { keyType: 'primary', model: 'gemini-3.5-flash' },
      ]);
    });

    it('cascades to fallback model with fallback key if primary key on fallback model also fails', async () => {
      const callLog: Array<{ keyType: string; model: string }> = [];
      const mockSchema = z.object({ success: z.boolean() });

      const clientProvider = (keyType: 'primary' | 'fallback') => {
        return {
          models: {
            generateContent: vi.fn().mockImplementation(async ({ model }: { model: string }) => {
              callLog.push({ keyType, model });
              if (keyType === 'primary') {
                throw new GeminiApiError('503 Overloaded', 503, true, 'AI_BUSY');
              }
              return {
                text: JSON.stringify({ success: true }),
              };
            }),
          },
        } as unknown as GoogleGenAI;
      };

      const result = await callGeminiStructured('test prompt', mockSchema, {
        clientProvider,
        primaryMaxRetries: 0,
        fallbackMaxRetries: 0,
      });

      expect(result.success).toBe(true);
      expect(callLog).toEqual([
        { keyType: 'primary', model: 'gemini-3.8-flash' },
        { keyType: 'primary', model: 'gemini-3.5-flash' },
        { keyType: 'fallback', model: 'gemini-3.5-flash' },
      ]);
    });

    it('tracks circuit breakers per key and model combination independently', async () => {
      // Trip primary key on primary model
      tripCircuitBreakerForTesting(60000, Date.now(), 'primary', 'gemini-3.8-flash');

      const callLog: Array<{ keyType: string; model: string }> = [];
      const mockSchema = z.object({ success: z.boolean() });

      const clientProvider = (keyType: 'primary' | 'fallback') => {
        return {
          models: {
            generateContent: vi.fn().mockImplementation(async ({ model }: { model: string }) => {
              callLog.push({ keyType, model });
              return {
                text: JSON.stringify({ success: true }),
              };
            }),
          },
        } as unknown as GoogleGenAI;
      };

      const result = await callGeminiStructured('test prompt', mockSchema, {
        clientProvider,
        primaryMaxRetries: 0,
      });

      expect(result.success).toBe(true);
      // Primary:gemini-3.8-flash was tripped, so it routes directly to primary:gemini-3.5-flash!
      expect(callLog).toEqual([
        { keyType: 'primary', model: 'gemini-3.5-flash' },
      ]);
    });

    it('guarantees neither primary nor fallback API keys are logged or returned', async () => {
      process.env.GEMINI_API_KEY = 'super-secret-primary-key-888';
      process.env.GEMINI_API_KEY_FALLBACK = 'super-secret-backup-key-999';

      const client = getGeminiClient('primary');
      expect(client).toBeDefined();

      const fallbackClient = getGeminiClient('fallback');
      expect(fallbackClient).toBeDefined();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await callGeminiStructured(
          'prompt',
          z.object({ item: z.string() }),
          {
            primaryMaxRetries: 0,
            customClient: {
              models: {
                generateContent: vi.fn().mockRejectedValue(new Error('Auth failed for key super-secret-primary-key-888')),
              },
            } as unknown as GoogleGenAI,
          }
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        expect(errMsg).not.toContain('super-secret-primary-key-888');
        expect(errMsg).not.toContain('super-secret-backup-key-999');
      }

      consoleSpy.mockRestore();
    });
  });
});

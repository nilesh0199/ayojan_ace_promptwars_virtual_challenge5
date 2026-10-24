import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapGeminiError,
  getFriendlyAiError,
  isOverloadOrTransientError,
  recordCombinationFailure,
  recordCombinationSuccess,
  isCombinationCircuitOpen,
  resetAllCircuitBreakers,
  TIMEOUT_CONFIG,
  GeminiApiError,
} from '@/lib/gemini';

describe('Error Classification, Visibility & Circuit Breaker Hardening', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  describe('mapGeminiError and isOverloadOrTransientError', () => {
    it('maps 401, 403, and 400 API_KEY_INVALID to AI_INVALID_KEY', () => {
      const err1 = new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.');
      const mapped1 = mapGeminiError(err1);
      expect(mapped1.code).toBe('AI_INVALID_KEY');
      expect(mapped1.statusCode).toBe(401);

      const err2 = new Error('Request failed with status code 401: Unauthorized');
      const mapped2 = mapGeminiError(err2);
      expect(mapped2.code).toBe('AI_INVALID_KEY');

      const err3 = new Error('400 Bad Request: invalid api key');
      const mapped3 = mapGeminiError(err3);
      expect(mapped3.code).toBe('AI_INVALID_KEY');
    });

    it('maps 404 and model not found to AI_MODEL_NOT_FOUND', () => {
      const err1 = new Error('models/gemini-3.8-flash is not found for API version v1beta');
      const mapped1 = mapGeminiError(err1);
      expect(mapped1.code).toBe('AI_MODEL_NOT_FOUND');
      expect(mapped1.statusCode).toBe(404);

      const err2 = new Error('Resource not found: Requested model was not found');
      const mapped2 = mapGeminiError(err2);
      expect(mapped2.code).toBe('AI_MODEL_NOT_FOUND');
    });

    it('maps 504 and timeouts to AI_TIMEOUT', () => {
      const err = new Error('Gateway timed out waiting for upstream server: 504 deadline exceeded');
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe('AI_TIMEOUT');
      expect(mapped.statusCode).toBe(504);
    });

    it('maps hosting timeouts to HOSTING_TIMEOUT', () => {
      const err = new Error('Task timed out after 60.00 seconds (function_invocation_timeout)');
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe('HOSTING_TIMEOUT');
      expect(mapped.statusCode).toBe(504);
    });

    it('maps network connection drops to AI_NETWORK_ERROR', () => {
      const err = new Error('fetch failed: connect ECONNREFUSED 142.250.190.42');
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe('AI_NETWORK_ERROR');
      expect(mapped.statusCode).toBe(503);
    });

    it('maps schema and malformed output to AI_VALIDATION_FAILED', () => {
      const err = new Error('ZodError: schema validation failed for event plan budget');
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe('AI_VALIDATION_FAILED');
      expect(mapped.statusCode).toBe(502);
    });

    it('maps genuine overload and quota errors to AI_BUSY only', () => {
      const errQuota = new Error('429 RESOURCE_EXHAUSTED: quota exceeded for quota metric');
      const mappedQuota = mapGeminiError(errQuota);
      expect(mappedQuota.code).toBe('AI_BUSY');
      expect(mappedQuota.statusCode).toBe(429);

      const errOverload = new Error('503 Service Unavailable: The model is overloaded. Please try again later.');
      const mappedOverload = mapGeminiError(errOverload);
      expect(mappedOverload.code).toBe('AI_BUSY');
      expect(mappedOverload.statusCode).toBe(429);
    });

    it('defaults unclassified errors to AI_ERROR, never incorrectly to AI_BUSY', () => {
      const genericErr = new Error('Unexpected internal database state');
      const mapped = mapGeminiError(genericErr);
      expect(mapped.code).toBe('AI_ERROR');
      expect(mapped.statusCode).toBe(500);
      expect(mapped.code).not.toBe('AI_BUSY');
    });

    it('isOverloadOrTransientError strictly isolates overload and excludes validation, model, or key errors', () => {
      expect(isOverloadOrTransientError(new GeminiApiError('Busy', 503, true, 'AI_BUSY'))).toBe(true);
      expect(isOverloadOrTransientError(new GeminiApiError('Quota', 429, true, 'AI_BUSY'))).toBe(true);
      expect(isOverloadOrTransientError('503 Service Unavailable')).toBe(true);
      expect(isOverloadOrTransientError('429 Resource Exhausted')).toBe(true);

      // Must be false:
      expect(isOverloadOrTransientError(new GeminiApiError('Validation', 502, false, 'AI_VALIDATION_FAILED'))).toBe(false);
      expect(isOverloadOrTransientError(new GeminiApiError('Key', 401, false, 'AI_INVALID_KEY'))).toBe(false);
      expect(isOverloadOrTransientError(new GeminiApiError('Model', 404, false, 'AI_MODEL_NOT_FOUND'))).toBe(false);
      expect(isOverloadOrTransientError('schema validation failed')).toBe(false);
      expect(isOverloadOrTransientError('models/gemini-3.8-flash not found')).toBe(false);
      expect(isOverloadOrTransientError('API_KEY_INVALID')).toBe(false);
    });
  });

  describe('getFriendlyAiError descriptions', () => {
    it('provides distinct, positive and clear messages for every typed error code', () => {
      const busy = getFriendlyAiError('AI_BUSY');
      expect(busy.title).toContain('Demand');
      expect(busy.message).toContain('high demand');

      const timeout = getFriendlyAiError('AI_TIMEOUT');
      expect(timeout.title).toContain('Timed Out');

      const hostingTimeout = getFriendlyAiError('HOSTING_TIMEOUT');
      expect(hostingTimeout.title).toContain('Hosting');

      const invalidKey = getFriendlyAiError('AI_INVALID_KEY');
      expect(invalidKey.title).toContain('Authorization');

      const modelNotFound = getFriendlyAiError('AI_MODEL_NOT_FOUND');
      expect(modelNotFound.title).toContain('Model Not Found');

      const validation = getFriendlyAiError('AI_VALIDATION_FAILED');
      expect(validation.title).toContain('Refinement');

      const network = getFriendlyAiError('AI_NETWORK_ERROR');
      expect(network.title).toContain('Network');

      const defaultErr = getFriendlyAiError(null);
      expect(defaultErr.title).toContain('Alert');
    });
  });

  describe('Circuit Breaker Stuck-Open Prevention and Selective Tripping', () => {
    const keyType = 'primary';
    const model = 'gemini-1.5-flash';

    it('trips the circuit breaker only after repeated genuine overload failures', () => {
      expect(isCombinationCircuitOpen(keyType, model)).toBe(false);

      // Overload failures 1, 2, 3
      recordCombinationFailure(keyType, model, true);
      expect(isCombinationCircuitOpen(keyType, model)).toBe(false);

      recordCombinationFailure(keyType, model, true);
      expect(isCombinationCircuitOpen(keyType, model)).toBe(false);

      recordCombinationFailure(keyType, model, true);
      // Tripped now
      expect(isCombinationCircuitOpen(keyType, model)).toBe(true);
    });

    it('NEVER trips the circuit breaker on validation or key errors (isOverload=false)', () => {
      for (let i = 0; i < 10; i++) {
        recordCombinationFailure(keyType, model, false);
      }
      expect(isCombinationCircuitOpen(keyType, model)).toBe(false);
    });

    it('auto-resets and cannot get stuck open once cooldown time passes', () => {
      const now = Date.now();
      // Trip it with a 1000ms cooldown
      recordCombinationFailure(keyType, model, true, now);
      recordCombinationFailure(keyType, model, true, now);
      recordCombinationFailure(keyType, model, true, now);
      expect(isCombinationCircuitOpen(keyType, model, now)).toBe(true);

      // Check after 65 seconds
      const future = now + 65 * 1000;
      expect(isCombinationCircuitOpen(keyType, model, future)).toBe(false);
    });

    it('recordCombinationSuccess immediately resets the failure counter', () => {
      recordCombinationFailure(keyType, model, true);
      recordCombinationFailure(keyType, model, true);
      recordCombinationSuccess(keyType, model);

      // Now 2 more failures should NOT trip it (because count was reset to 0)
      recordCombinationFailure(keyType, model, true);
      recordCombinationFailure(keyType, model, true);
      expect(isCombinationCircuitOpen(keyType, model)).toBe(false);
    });
  });

  describe('Timeout Configurations per Call Type', () => {
    it('sets appropriate budgets aligned with Vercel serverless ceilings', () => {
      expect(TIMEOUT_CONFIG.PLAN_GENERATION.totalBudgetMs).toBe(55000);
      expect(TIMEOUT_CONFIG.PLAN_GENERATION.perAttemptTimeoutMs).toBe(22000);
      expect(TIMEOUT_CONFIG.PLAN_GENERATION.primaryMaxBudgetMs).toBe(28000);

      expect(TIMEOUT_CONFIG.REPLAN.totalBudgetMs).toBe(45000);
      expect(TIMEOUT_CONFIG.RISKS.totalBudgetMs).toBe(30000);
      expect(TIMEOUT_CONFIG.FOLLOWUP.totalBudgetMs).toBe(15000);
      expect(TIMEOUT_CONFIG.NAMES.totalBudgetMs).toBe(15000);
      expect(TIMEOUT_CONFIG.ASK_AI.totalBudgetMs).toBe(20000);
    });
  });
});

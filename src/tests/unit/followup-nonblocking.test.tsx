import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  fetchFollowUpNonBlocking,
  PlanProvider,
  usePlan,
  FOLLOWUP_TIMEOUT_MS,
} from '@/components/plan-context';
import { AuthProvider } from '@/components/auth-context';
import { IntakeForm } from '@/components/intake-form';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import {
  getFriendlyAiError,
  getTemplatePlanReason,
  GeminiErrorCode,
} from '@/lib/gemini';
import { SAVED_EXAMPLES } from '@/data/savedExamples';
import { EventPlan, IntakeFormData } from '@/lib/schemas';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const testIntake: IntakeFormData = {
  eventType: 'Wedding',
  city: 'Udaipur',
  date: '2026-12-15',
  guestCount: 200,
  totalBudget: 1500000,
  currency: 'INR',
  styleCulture: 'Traditional Rajasthani',
  nonNegotiables: 'Vegetarian feast',
};

describe('Non-blocking Follow-up and Typed Error Representation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. fetchFollowUpNonBlocking Utility', () => {
    it('returns follow-up data on successful HTTP 200', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          needsFollowUp: true,
          questionId: 'q1',
          questionText: 'Outdoor lawn or royal palace courtyard?',
        }),
      } as unknown as Response);

      const result = await fetchFollowUpNonBlocking({
        intake: testIntake,
        previousFollowUpsCount: 0,
      });

      expect(result).not.toBeNull();
      expect(result?.needsFollowUp).toBe(true);
      expect(result?.questionText).toBe('Outdoor lawn or royal palace courtyard?');
    });

    it('returns null silently on HTTP 500 error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      } as unknown as Response);

      const result = await fetchFollowUpNonBlocking({
        intake: testIntake,
        previousFollowUpsCount: 0,
      });

      expect(result).toBeNull();
    });

    it('returns null silently on HTTP 503 error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service Unavailable', code: 'AI_BUSY' }),
      } as unknown as Response);

      const result = await fetchFollowUpNonBlocking({
        intake: testIntake,
        previousFollowUpsCount: 0,
      });

      expect(result).toBeNull();
    });

    it('returns null silently on network fetch failure / exception', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch (offline)'));

      const result = await fetchFollowUpNonBlocking({
        intake: testIntake,
        previousFollowUpsCount: 0,
      });

      expect(result).toBeNull();
    });

    it('returns null silently when aborted or timed out', async () => {
      const abortController = new AbortController();
      abortController.abort(); // already aborted

      const result = await fetchFollowUpNonBlocking(
        { intake: testIntake, previousFollowUpsCount: 0 },
        abortController.signal
      );

      expect(result).toBeNull();
    });

    it('has a short timeout limit <= 5000ms', () => {
      expect(FOLLOWUP_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
      expect(FOLLOWUP_TIMEOUT_MS).toBeLessThanOrEqual(5000);
    });
  });

  describe('2. Error Codes: getFriendlyAiError never claims High Demand for non-busy errors', () => {
    const nonBusyCodes: GeminiErrorCode[] = [
      'AI_TIMEOUT',
      'HOSTING_TIMEOUT',
      'AI_INVALID_KEY',
      'AI_MODEL_NOT_FOUND',
      'AI_VALIDATION_FAILED',
      'AI_NETWORK_ERROR',
      'AI_NOT_CONFIGURED',
      'AI_BACKUP_KEY_EXPIRED',
      'AI_ERROR',
    ];

    it.each(nonBusyCodes)('code "%s" does not use "High Demand" or "high demand" wording', (code) => {
      const info = getFriendlyAiError(code);
      expect(info.title.toLowerCase()).not.toContain('high demand');
      expect(info.message.toLowerCase()).not.toContain('high demand');
    });

    it('code "AI_BUSY" clearly communicates high demand', () => {
      const info = getFriendlyAiError('AI_BUSY');
      expect(info.title.toLowerCase()).toContain('high demand');
      expect(info.message.toLowerCase()).toContain('high demand');
    });
  });

  describe('3. Template Reason: getTemplatePlanReason names actual reason categories in plain words', () => {
    const errorReasonExpectations: Array<{
      code: GeminiErrorCode;
      expectedKeyword: string;
    }> = [
      { code: 'AI_INVALID_KEY', expectedKeyword: 'AI key needs update' },
      { code: 'AI_MODEL_NOT_FOUND', expectedKeyword: 'AI model not found' },
      { code: 'AI_TIMEOUT', expectedKeyword: 'AI timed out' },
      { code: 'HOSTING_TIMEOUT', expectedKeyword: 'Hosting time limit reached' },
      { code: 'AI_VALIDATION_FAILED', expectedKeyword: 'AI formatting issue' },
      { code: 'AI_NETWORK_ERROR', expectedKeyword: 'Network connection issue' },
      { code: 'AI_NOT_CONFIGURED', expectedKeyword: 'AI not configured' },
      { code: 'AI_BACKUP_KEY_EXPIRED', expectedKeyword: 'AI key expired' },
      { code: 'AI_BUSY', expectedKeyword: 'AI is busy' },
    ];

    it.each(errorReasonExpectations)(
      'maps code "$code" to friendly title containing "$expectedKeyword"',
      ({ code, expectedKeyword }) => {
        const reason = getTemplatePlanReason(code);
        expect(reason.title).toContain(expectedKeyword);
        expect(reason.description).toBeDefined();
        expect(reason.description.length).toBeGreaterThan(10);
      }
    );
  });

  describe('4. Plan Generation Flow: Follow-up failure never halts generation', () => {
    function TestGenerationTrigger() {
      const { startPlanGeneration, activePlan, isLoading, error, errorCode } = usePlan();
      return (
        <div>
          <button
            type="button"
            onClick={() => startPlanGeneration(testIntake)}
            data-testid="trigger-generate-btn"
          >
            Generate
          </button>
          <div data-testid="is-loading">{isLoading ? 'true' : 'false'}</div>
          {activePlan && <div data-testid="plan-title">{activePlan.title}</div>}
          {error && <div data-testid="error-message">{error}</div>}
          {errorCode && <div data-testid="error-code">{errorCode}</div>}
        </div>
      );
    }

    it('skips follow-up questions silently and generates plan when /api/plan/followup returns 500', async () => {
      const mockGeneratedPlan: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        title: 'Generated Udaipur Royal Wedding',
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/plan/followup')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Follow-up service internal failure' }),
          };
        }
        if (url.includes('/api/plan/generate')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockGeneratedPlan,
          };
        }
        return { ok: false, status: 404 };
      });

      render(
        <AuthProvider>
          <PlanProvider>
            <TestGenerationTrigger />
          </PlanProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-generate-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('plan-title').textContent).toBe(
          'Generated Udaipur Royal Wedding'
        );
      });

      expect(screen.queryByTestId('error-message')).toBeNull();
    });

    it('skips follow-up questions silently when /api/plan/followup fetch throws network error', async () => {
      const mockGeneratedPlan: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        title: 'Resilient Offline Wedding Plan',
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/plan/followup')) {
          throw new Error('Connection refused / offline');
        }
        if (url.includes('/api/plan/generate')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockGeneratedPlan,
          };
        }
        return { ok: false, status: 404 };
      });

      render(
        <AuthProvider>
          <PlanProvider>
            <TestGenerationTrigger />
          </PlanProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('trigger-generate-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('plan-title').textContent).toBe(
          'Resilient Offline Wedding Plan'
        );
      });

      expect(screen.queryByTestId('error-message')).toBeNull();
    });
  });

  describe('5. UI Error & Reference Line Display in IntakeForm and WorkspaceHeader', () => {
    it('displays typed error code, title, and data-testid="error-reference" for AI_INVALID_KEY without High Demand wording', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/plan/followup')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Skipped' }),
          };
        }
        if (url.includes('/api/plan/generate')) {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: 'AI Planning Service Alert',
              code: 'AI_INVALID_KEY',
              message:
                'The AI service key is missing, unauthorized, or expired in server configuration. You can continue planning with pre-built examples or the offline planner.',
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      render(
        <AuthProvider>
          <PlanProvider>
            <IntakeForm />
          </PlanProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /Generate Celebration Plan/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('AI Authorization Update Needed')).toBeInTheDocument();
      });

      const refEl = screen.getByTestId('error-reference');
      expect(refEl.textContent).toContain('Reference: AI_INVALID_KEY');

      const alert = screen.getByRole('alert');
      expect(alert.textContent?.toLowerCase()).not.toContain('high demand');
    });

    it('displays typed error code, title, and data-testid="error-reference" for AI_TIMEOUT', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/plan/followup')) {
          return { ok: false, status: 503, json: async () => ({}) };
        }
        if (url.includes('/api/plan/generate')) {
          return {
            ok: false,
            status: 504,
            json: async () => ({
              error: 'AI Planning Service Alert',
              code: 'AI_TIMEOUT',
              message:
                'The AI request took longer than expected to complete. Click Retry to run with a fresh connection, or load a saved example.',
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      render(
        <AuthProvider>
          <PlanProvider>
            <IntakeForm />
          </PlanProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /Generate Celebration Plan/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Planning Request Timed Out')).toBeInTheDocument();
      });

      const refEl = screen.getByTestId('error-reference');
      expect(refEl.textContent).toContain('Reference: AI_TIMEOUT');
      expect(screen.getByRole('alert').textContent?.toLowerCase()).not.toContain('high demand');
    });

    it('renders WorkspaceHeader template plan banner with named category and reference line for AI_MODEL_NOT_FOUND', () => {
      const templatePlan: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        generationSource: 'template',
        generationErrorCode: 'AI_MODEL_NOT_FOUND',
      };

      render(
        <AuthProvider>
          <PlanProvider initialPlan={templatePlan}>
            <WorkspaceHeader onOpenReplan={vi.fn()} activeTabName="Overview" />
          </PlanProvider>
        </AuthProvider>
      );

      expect(
        screen.getByText('Built-in template plan (AI model not found)')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Generated immediately by our deterministic offline planner \(AI model not found\)/i)
      ).toBeInTheDocument();

      const refEl = screen.getByTestId('error-reference');
      expect(refEl.textContent).toContain('Reference: AI_MODEL_NOT_FOUND');
    });

    it('renders WorkspaceHeader template plan banner with named category and reference line for AI_VALIDATION_FAILED', () => {
      const templatePlan: EventPlan = {
        ...SAVED_EXAMPLES.wedding,
        generationSource: 'template',
        generationErrorCode: 'AI_VALIDATION_FAILED',
      };

      render(
        <AuthProvider>
          <PlanProvider initialPlan={templatePlan}>
            <WorkspaceHeader onOpenReplan={vi.fn()} activeTabName="Overview" />
          </PlanProvider>
        </AuthProvider>
      );

      expect(
        screen.getByText('Built-in template plan (AI formatting issue)')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Generated immediately by our deterministic offline planner \(AI formatting issue\)/i)
      ).toBeInTheDocument();

      const refEl = screen.getByTestId('error-reference');
      expect(refEl.textContent).toContain('Reference: AI_VALIDATION_FAILED');
    });
  });
});

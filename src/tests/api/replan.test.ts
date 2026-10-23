import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/replan/route';
import * as geminiModule from '@/lib/gemini';
import { SAMPLE_WEDDING_PLAN } from '@/data/savedExamples';
import { apiLimiter } from '@/lib/ratelimit';

vi.mock('@/lib/gemini', async () => {
  const actual = await vi.importActual<typeof geminiModule>('@/lib/gemini');
  return {
    ...actual,
    callGeminiStructured: vi.fn(),
  };
});

describe('API /api/plan/replan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiLimiter.reset();
  });

  it('successfully returns replanning diff for affected categories', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce({
      summaryOfChanges: 'Adjusted catering budget for 50 additional guests.',
      why: 'Headcount directly scales meal costs.',
      tradeOffOptions: ['Option A: Rebalance decor'],
      affectedBudgetCategories: [
        {
          id: 'cat-catering',
          name: 'Traditional Catering & Live Counters',
          minEstimate: 900000,
          maxEstimate: 1100000,
          targetEstimate: 1000000,
          notes: 'Scaled to 350 guests',
        },
      ],
      affectedTimelineTasks: [],
      newContingencyPercent: 10,
    });

    const req = new Request('http://localhost:3000/api/plan/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPlan: SAMPLE_WEDDING_PLAN,
        changes: { guestCount: 350 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summaryOfChanges).toBeDefined();
    expect(data.affectedBudgetCategories).toHaveLength(1);
  });

  it('falls back to deterministic template rebalance when AI providers fail', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockRejectedValueOnce(
      new geminiModule.GeminiApiError('Service unavailable', 503, true, 'AI_BUSY')
    );

    const req = new Request('http://localhost:3000/api/plan/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPlan: SAMPLE_WEDDING_PLAN,
        changes: { guestCount: 350 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summaryOfChanges).toContain('Budget rebalanced');
    expect(data.affectedBudgetCategories.length).toBeGreaterThan(0);
  });

  it('propagates AI error when template fallback is explicitly disabled', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockRejectedValueOnce(
      new geminiModule.GeminiApiError('AI temporarily busy', 503, true, 'AI_BUSY')
    );

    const req = new Request('http://localhost:3000/api/plan/replan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-disable-template-fallback': 'true',
      },
      body: JSON.stringify({
        currentPlan: SAMPLE_WEDDING_PLAN,
        changes: { guestCount: 350 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe('AI_BUSY');
  });

  it('rejects invalid payloads with 400', async () => {
    const req = new Request('http://localhost:3000/api/plan/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPlan: { invalid: true } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects with 429 when rate limit is exceeded', async () => {
    for (let i = 0; i < 15; i++) {
      apiLimiter.check('127.0.0.1');
    }

    const req = new Request('http://localhost:3000/api/plan/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPlan: SAMPLE_WEDDING_PLAN,
        changes: { totalBudget: 2700000 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});

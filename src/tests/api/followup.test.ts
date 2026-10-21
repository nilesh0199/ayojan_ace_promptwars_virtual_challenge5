import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/followup/route';
import * as geminiModule from '@/lib/gemini';
import { apiLimiter } from '@/lib/ratelimit';

vi.mock('@/lib/gemini', async () => {
  const actual = await vi.importActual<typeof geminiModule>('@/lib/gemini');
  return {
    ...actual,
    callGeminiStructured: vi.fn(),
  };
});

describe('API /api/plan/followup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiLimiter.reset();
  });

  const validIntake = {
    eventType: 'Wedding',
    city: 'Jaipur',
    date: '2026-11-20',
    guestCount: 300,
    totalBudget: 2500000,
    currency: 'INR',
    styleCulture: 'Royal Rajasthani',
    nonNegotiables: 'Strict Jain catering',
  };

  it('returns valid follow-up evaluation from Gemini', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce({
      needsFollowUp: true,
      questionId: 'q1',
      questionText: 'Would you prefer open-air lawn or indoor AC banquet for the main banquet?',
      reason: 'Affects weather contingency planning',
    });

    const req = new Request('http://localhost:3000/api/plan/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake, previousFollowUpsCount: 0 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.needsFollowUp).toBe(true);
    expect(data.questionText).toBeDefined();
  });

  it('bypasses Gemini and returns needsFollowUp: false if previousFollowUpsCount >= 2', async () => {
    const req = new Request('http://localhost:3000/api/plan/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake, previousFollowUpsCount: 2 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.needsFollowUp).toBe(false);
    expect(geminiModule.callGeminiStructured).not.toHaveBeenCalled();
  });

  it('rejects invalid schema inputs with 400', async () => {
    const req = new Request('http://localhost:3000/api/plan/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: { eventType: 'Invalid' } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects oversized request bodies with 413', async () => {
    const req = new Request('http://localhost:3000/api/plan/followup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': '400000', // exceeds MAX_BODY_BYTES (300KB)
      },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });
});

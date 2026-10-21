import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/risks/route';
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

describe('API /api/plan/risks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiLimiter.reset();
  });

  it('generates a risk register for a valid plan', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce({
      assessedAt: '2026-10-21T10:00:00Z',
      risks: [
        {
          id: 'r1',
          category: 'Weather & Season',
          severity: 'High',
          potentialIssue: 'Unseasonal evening humidity or rain',
          rootCause: 'Open lawn without backup hall',
          mitigationTask: 'Book waterproof German hangar tenting',
        },
        {
          id: 'r2',
          category: 'Permits & Legal',
          severity: 'Medium',
          potentialIssue: 'Sound decibel cutoff',
          rootCause: 'City noise regulations',
          mitigationTask: 'Transition to acoustic indoor hall by 10 PM',
        },
        {
          id: 'r3',
          category: 'Dietary & Accessibility',
          severity: 'Critical',
          potentialIssue: 'Jain counter contamination',
          rootCause: 'Shared cutlery',
          mitigationTask: 'Enforce dedicated kitchen zone',
        },
      ],
    });

    const req = new Request('http://localhost:3000/api/plan/risks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_WEDDING_PLAN),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.risks).toHaveLength(3);
  });

  it('returns 400 on invalid plan payload', async () => {
    const req = new Request('http://localhost:3000/api/plan/risks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notAPlan: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    for (let i = 0; i < 15; i++) {
      apiLimiter.check('127.0.0.1');
    }

    const req = new Request('http://localhost:3000/api/plan/risks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_WEDDING_PLAN),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/names/route';
import { apiLimiter } from '@/lib/ratelimit';
import * as aiModule from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual<typeof aiModule>('@/lib/ai');
  return {
    ...actual,
    executeAiCascade: vi.fn(),
  };
});

describe('POST /api/plan/names (Event Name Suggestions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiLimiter.reset();
  });

  const validPayload = {
    eventType: 'Wedding',
    city: 'Jaipur',
    styleCulture: 'Royal Heritage with Sangeet',
    guestCount: 300,
  };

  it('returns creative name suggestions on valid input', async () => {
    vi.mocked(aiModule.executeAiCascade).mockResolvedValueOnce({
      data: {
        suggestions: [
          'Jaipur Heritage Vivah',
          'Aarav & Diya Royal Pheras',
          'Rajputana Courtyard Wedding',
          'Marigold & Palace Shaadi',
        ],
      },
      source: 'primary',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });

    const request = new Request('http://localhost:3000/api/plan/names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.suggestions).toBeDefined();
    expect(json.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(json.suggestions).toContain('Jaipur Heritage Vivah');
  });

  it('gracefully falls back to curated preset names if AI throws an error', async () => {
    vi.mocked(aiModule.executeAiCascade).mockRejectedValueOnce(new Error('AI rate limited'));

    const request = new Request('http://localhost:3000/api/plan/names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.suggestions).toBeDefined();
    expect(json.suggestions.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects invalid payloads with 400 Bad Request', async () => {
    const invalidPayload = {
      eventType: 'UnknownType', // Invalid
      city: 'J', // Too short
    };

    const request = new Request('http://localhost:3000/api/plan/names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

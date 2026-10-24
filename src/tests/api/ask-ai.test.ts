import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/ask/route';
import { apiLimiter } from '@/lib/ratelimit';
import * as aiModule from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual<typeof aiModule>('@/lib/ai');
  return {
    ...actual,
    executeAiCascade: vi.fn(),
  };
});

describe('POST /api/plan/ask (Ask AI Doubts Assistant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiLimiter.reset();
  });

  const validPayload = {
    planSummary: {
      title: 'Aarav & Diya Royal Pheras',
      eventType: 'Wedding',
      city: 'Jaipur',
      date: '2026-11-20',
      guestCount: 350,
      totalBudget: 2500000,
      currency: 'INR',
      styleCulture: 'Royal Rajasthani Heritage',
      muhuratTime: '11:30',
      muhuratLabel: 'Pheras',
    },
    messages: [
      { role: 'user', content: 'What time should we serve lunch after pheras?' },
      { role: 'assistant', content: 'We recommend opening live lunch counters around 12:45 PM.' },
    ],
    message: 'What should we prepare in case of afternoon rain?',
  };

  it('generates a helpful contextual advice reply on valid request', async () => {
    vi.mocked(aiModule.executeAiCascade).mockResolvedValueOnce({
      data: {
        reply:
          'For your Jaipur outdoor celebration, ensure an indoor banquet hall backup is reserved on-site and canopy tents are arranged for food counters.',
      },
      source: 'primary',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });

    const request = new Request('http://localhost:3000/api/plan/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.reply).toBeDefined();
    expect(json.reply).toContain('Jaipur outdoor celebration');
  });

  it('validates request schema and returns 400 for empty inquiry', async () => {
    const invalidPayload = {
      ...validPayload,
      message: '   ', // empty question
    };

    const request = new Request('http://localhost:3000/api/plan/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('validates request schema and returns 400 for missing plan summary', async () => {
    const request = new Request('http://localhost:3000/api/plan/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I cut costs?' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

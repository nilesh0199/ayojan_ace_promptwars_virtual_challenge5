import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/health/route';
import { disableGroqProvider, resetGroqDisabledStateForTesting } from '@/lib/ai/groq-provider';

describe('/api/health endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetGroqDisabledStateForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetGroqDisabledStateForTesting();
  });

  it('returns status 200 with ok status and configured services when GEMINI_API_KEY is present', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-secret-key-12345';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    const req = new Request('http://localhost:3000/api/health', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.gemini).toBe('configured');
    expect(body.groq).toBe('missing');
    expect(body.fallbackKey).toBe('missing');
    expect(body.model).toBe('configured');

    // Security check: Must NEVER leak secrets or API key in response payload
    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain('test-gemini-secret-key-12345');
  });

  it('reports groq as configured when GROQ_API_KEY is provided without leaking value', async () => {
    process.env.GEMINI_API_KEY = 'primary-key-abc';
    process.env.GROQ_API_KEY = 'gsk_secretGroqKey987654';

    const req = new Request('http://localhost:3000/api/health', {
      headers: { 'x-forwarded-for': '192.168.1.77' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.gemini).toBe('configured');
    expect(body.groq).toBe('configured');

    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain('gsk_secretGroqKey987654');
  });

  it('reports groq as expired when GROQ_KEY_EXPIRES_ON date has passed', async () => {
    vi.useFakeTimers();
    process.env.GEMINI_API_KEY = 'primary-key-abc';
    process.env.GROQ_API_KEY = 'gsk_secretGroqKey987654';
    process.env.GROQ_KEY_EXPIRES_ON = '2026-12-22';

    // Simulate time after the expiration date
    vi.setSystemTime(new Date('2026-12-23T00:00:01Z'));

    const req = new Request('http://localhost:3000/api/health', {
      headers: { 'x-forwarded-for': '192.168.1.78' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.gemini).toBe('configured');
    expect(body.groq).toBe('expired');

    // Security check: Never leak secrets
    expect(JSON.stringify(body)).not.toContain('gsk_secretGroqKey987654');
    vi.useRealTimers();
  });

  it('reports groq as expired when Groq provider was disabled after 401/403 rejection', async () => {
    process.env.GEMINI_API_KEY = 'primary-key-abc';
    process.env.GROQ_API_KEY = 'gsk_secretGroqKey987654';
    delete process.env.GROQ_KEY_EXPIRES_ON;

    disableGroqProvider();

    const req = new Request('http://localhost:3000/api/health', {
      headers: { 'x-forwarded-for': '192.168.1.79' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.groq).toBe('expired');

    resetGroqDisabledStateForTesting();
  });

  it('reports fallbackKey as configured when GEMINI_API_KEY_FALLBACK is provided without leaking value', async () => {
    process.env.GEMINI_API_KEY = 'primary-key-abc';
    process.env.GEMINI_API_KEY_FALLBACK = 'fallback-key-xyz-987';

    const req = new Request('http://localhost:3000/api/health', {
      headers: { 'x-forwarded-for': '192.168.1.99' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.gemini).toBe('configured');
    expect(body.fallbackKey).toBe('configured');

    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain('fallback-key-xyz-987');
    expect(bodyString).not.toContain('primary-key-abc');
  });

  it('returns status 503 and degraded status when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new Request('http://localhost:3000/api/health', {
      headers: { 'x-forwarded-for': '192.168.1.2' },
    });

    const res = await GET(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.gemini).toBe('missing');
  });

  it('enforces rate limiting when spamming requests from same IP', async () => {
    process.env.GEMINI_API_KEY = 'valid-key';
    const testIp = '10.99.88.77';

    let lastResponse: Response | null = null;
    // Exceed the token bucket rate limit
    for (let i = 0; i < 25; i++) {
      const req = new Request('http://localhost:3000/api/health', {
        headers: { 'x-forwarded-for': testIp },
      });
      lastResponse = await GET(req);
    }

    expect(lastResponse).not.toBeNull();
    expect(lastResponse!.status).toBe(429);
    const body = await lastResponse!.json();
    expect(body.error).toBe('Too Many Requests');
  });
});

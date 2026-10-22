import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('/api/health endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
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
    expect(body.model).toBe('configured');

    // Security check: Must NEVER leak secrets or API key in response payload
    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain('test-gemini-secret-key-12345');
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

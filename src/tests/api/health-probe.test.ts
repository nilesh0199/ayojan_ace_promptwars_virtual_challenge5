import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/health/probe/route';
import { timingSafeEqualString } from '@/lib/api-helper';
import { probeLimiter } from '@/lib/ratelimit';

describe('Protected Health Probe Endpoint (GET /api/health/probe)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    probeLimiter.reset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('constant-time string comparison validates matching tokens correctly', () => {
    expect(timingSafeEqualString('secret123', 'secret123')).toBe(true);
    expect(timingSafeEqualString('secret123', 'wrongtoken')).toBe(false);
    expect(timingSafeEqualString('secret123', 'secret12')).toBe(false);
    expect(timingSafeEqualString('', 'secret123')).toBe(false);
  });

  it('returns 404 Not Found when HEALTH_PROBE_TOKEN is not set (disabled by default)', async () => {
    delete process.env.HEALTH_PROBE_TOKEN;

    const req = new Request('http://localhost:3000/api/health/probe', {
      headers: { Authorization: 'Bearer test-token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Not Found');
  });

  it('returns 401 Unauthorized when Authorization header is missing', async () => {
    process.env.HEALTH_PROBE_TOKEN = 'super-secret-token-12345';

    const req = new Request('http://localhost:3000/api/health/probe');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 Unauthorized when Authorization token is invalid', async () => {
    process.env.HEALTH_PROBE_TOKEN = 'super-secret-token-12345';

    const req = new Request('http://localhost:3000/api/health/probe', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('enforces tight rate limiting (3 requests per minute)', async () => {
    process.env.HEALTH_PROBE_TOKEN = 'super-secret-token-12345';
    process.env.GEMINI_API_KEY = '<placeholder_key>';

    const makeRequest = () =>
      new Request('http://localhost:3000/api/health/probe', {
        headers: {
          Authorization: 'Bearer super-secret-token-12345',
          'x-forwarded-for': '198.51.100.42',
        },
      });

    // Calls 1, 2, 3 succeed
    const res1 = await GET(makeRequest());
    expect(res1.status).toBe(200);

    const res2 = await GET(makeRequest());
    expect(res2.status).toBe(200);

    const res3 = await GET(makeRequest());
    expect(res3.status).toBe(200);

    // Call 4 gets rate limited
    const res4 = await GET(makeRequest());
    expect(res4.status).toBe(429);
    expect(res4.headers.get('Retry-After')).toBeTruthy();
    const json4 = await res4.json();
    expect(json4.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('executes tiny test calls and never leaks secrets or raw error dumps', async () => {
    process.env.HEALTH_PROBE_TOKEN = 'super-secret-token-12345';
    process.env.GEMINI_API_KEY = 'valid-test-key-for-probe';
    process.env.GEMINI_MODEL = 'gemini-1.5-flash';

    // Mock fetch for tiny probe call
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      }),
    });
    global.fetch = fetchMock;

    const req = new Request('http://localhost:3000/api/health/probe', {
      headers: {
        Authorization: 'Bearer super-secret-token-12345',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.enabled).toBe(true);
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results.length).toBeGreaterThan(0);

    const primaryResult = json.results.find((r: any) => r.provider === 'gemini_primary');
    expect(primaryResult).toBeDefined();
    expect(primaryResult.status).toBe(200);
    expect(primaryResult.category).toBe('success');
    expect(typeof primaryResult.latencyMs).toBe('number');

    // Strict security check: Ensure NO secret keys or prompts exist in response string
    const stringified = JSON.stringify(json);
    expect(stringified).not.toContain('super-secret-token-12345');
    expect(stringified).not.toContain('valid-test-key-for-probe');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenBucketLimiter, getClientIp } from '@/lib/ratelimit';

describe('TokenBucketLimiter', () => {
  let limiter: TokenBucketLimiter;

  beforeEach(() => {
    limiter = new TokenBucketLimiter({
      maxTokens: 3,
      refillRatePerSecond: 1, // 1 token per second
    });
  });

  it('allows requests within capacity', () => {
    const res1 = limiter.check('client-1', 1000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check('client-1', 1000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check('client-1', 1000);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('rejects requests when bucket is exhausted', () => {
    limiter.check('client-2', 1000);
    limiter.check('client-2', 1000);
    limiter.check('client-2', 1000);

    const blocked = limiter.check('client-2', 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('refills tokens over elapsed time', () => {
    limiter.check('client-3', 1000);
    limiter.check('client-3', 1000);
    limiter.check('client-3', 1000);

    // 2 seconds later -> refills 2 tokens
    const later = limiter.check('client-3', 3000);
    expect(later.allowed).toBe(true);
    expect(later.remaining).toBe(1);
  });

  it('resets tracking when requested', () => {
    limiter.check('client-4', 1000);
    limiter.reset('client-4');

    const fresh = limiter.check('client-4', 1000);
    expect(fresh.remaining).toBe(2);
  });
});

describe('getClientIp', () => {
  it('extracts client IP from x-forwarded-for', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.195, 70.41.3.18',
    });
    expect(getClientIp(headers)).toBe('203.0.113.195');
  });

  it('extracts client IP from x-real-ip if forwarded-for missing', () => {
    const headers = new Headers({
      'x-real-ip': '198.51.100.1',
    });
    expect(getClientIp(headers)).toBe('198.51.100.1');
  });

  it('falls back to 127.0.0.1 when headers are absent', () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe('127.0.0.1');
  });
});

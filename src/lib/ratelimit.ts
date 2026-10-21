interface TokenBucket {
  tokens: number;
  lastRefillMs: number;
}

export interface RateLimitConfig {
  maxTokens: number;
  refillRatePerSecond: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 10,
  refillRatePerSecond: 0.5, // 1 token every 2 seconds
};

export class TokenBucketLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: RateLimitConfig;
  private maxStoredKeys: number;

  constructor(config: Partial<RateLimitConfig> = {}, maxStoredKeys = 1000) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxStoredKeys = maxStoredKeys;
  }

  /**
   * Checks and consumes one token for the given client identifier.
   */
  public check(key: string, nowMs: number = Date.now()): RateLimitResult {
    this.evictStaleKeys(nowMs);

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens,
        lastRefillMs: nowMs,
      };
      this.buckets.set(key, bucket);
    } else {
      // Refill tokens based on elapsed time
      const elapsedSeconds = Math.max(0, (nowMs - bucket.lastRefillMs) / 1000);
      const tokensToAdd = elapsedSeconds * this.config.refillRatePerSecond;
      bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefillMs = nowMs;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterSeconds: 0,
      };
    }

    const missingTokens = 1 - bucket.tokens;
    const retryAfterSeconds = Math.ceil(missingTokens / this.config.refillRatePerSecond);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  /**
   * Resets the bucket for a key (useful in tests).
   */
  public reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }

  /**
   * Prevents unbounded memory growth by pruning entries inactive for > 15 minutes.
   */
  private evictStaleKeys(nowMs: number): void {
    if (this.buckets.size <= this.maxStoredKeys) return;
    const staleThresholdMs = 15 * 60 * 1000;
    for (const [k, b] of this.buckets.entries()) {
      if (nowMs - b.lastRefillMs > staleThresholdMs) {
        this.buckets.delete(k);
      }
    }
  }
}

// Global singleton for API route usage
export const apiLimiter = new TokenBucketLimiter({
  maxTokens: 12,
  refillRatePerSecond: 0.5,
});

/**
 * Extracts a client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

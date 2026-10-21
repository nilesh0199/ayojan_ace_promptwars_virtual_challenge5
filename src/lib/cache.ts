interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleLruCache<T> {
  private capacity: number;
  private defaultTtlMs: number;
  private cache = new Map<string, CacheEntry<T>>();

  constructor(capacity = 100, defaultTtlMs = 10 * 60 * 1000) {
    this.capacity = capacity;
    this.defaultTtlMs = defaultTtlMs;
  }

  public get(key: string, nowMs = Date.now()): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (nowMs > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU order by deleting and re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  public set(key: string, value: T, ttlMs = this.defaultTtlMs, nowMs = Date.now()): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest item (first key in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: nowMs + ttlMs,
    });
  }

  public has(key: string, nowMs = Date.now()): boolean {
    return this.get(key, nowMs) !== undefined;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

/**
 * Creates a deterministic cache key from an object payload.
 */
export function createPayloadKey(prefix: string, payload: unknown): string {
  try {
    const serialized = JSON.stringify(payload, Object.keys(payload as object).sort());
    return `${prefix}:${serialized}`;
  } catch {
    return `${prefix}:${String(payload)}`;
  }
}

// Global server-side request cache
export const planGenerationCache = new SimpleLruCache<unknown>(50, 15 * 60 * 1000);

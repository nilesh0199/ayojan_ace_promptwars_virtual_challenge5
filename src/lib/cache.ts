import type { EventPlan } from './schemas';

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
 * Canonicalizes an arbitrary JSON data structure by recursively sorting object keys.
 *
 * Why: Object property insertion order varies across HTTP clients and JSON serializers.
 * Canonical key sorting guarantees identical cryptographic string hashes and cache hits
 * for semantically identical client intake payloads.
 *
 * @param val - Any JSON-compatible payload value, array, or object.
 * @returns Deterministically sorted payload structure.
 */
function canonicalize(val: unknown): unknown {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalize);
  }
  const sortedObj: Record<string, unknown> = {};
  for (const key of Object.keys(val as Record<string, unknown>).sort()) {
    sortedObj[key] = canonicalize((val as Record<string, unknown>)[key]);
  }
  return sortedObj;
}

/**
 * Creates a deterministic, order-independent cache key from a namespace prefix and payload.
 *
 * @param prefix - Cache namespace string (e.g. 'plan-gen', 'followup').
 * @param payload - Arbitrary request parameters (intake form, follow-up answers).
 * @returns Deterministic cache key string suitable for Map lookups.
 */
export function createPayloadKey(prefix: string, payload: unknown): string {
  try {
    return `${prefix}:${JSON.stringify(canonicalize(payload))}`;
  } catch {
    return `${prefix}:${String(payload)}`;
  }
}

/**
 * Global in-memory LRU cache for successful AI-generated plans.
 *
 * Why: 15-minute TTL and 50-plan capacity avoids wasteful AI token consumption
 * on rapid double-clicks or page reloads, while ensuring transient error states
 * and fallback template plans are never cached.
 */
export const planGenerationCache = new SimpleLruCache<EventPlan>(50, 15 * 60 * 1000);

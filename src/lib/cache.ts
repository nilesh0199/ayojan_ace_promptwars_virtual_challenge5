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
 * Creates a deterministic cache key from an object payload.
 */
export function createPayloadKey(prefix: string, payload: unknown): string {
  try {
    return `${prefix}:${JSON.stringify(canonicalize(payload))}`;
  } catch {
    return `${prefix}:${String(payload)}`;
  }
}

// Global server-side request cache
export const planGenerationCache = new SimpleLruCache<EventPlan>(50, 15 * 60 * 1000);

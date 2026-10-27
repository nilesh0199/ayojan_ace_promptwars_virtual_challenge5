import { describe, it, expect } from 'vitest';
import { SimpleLruCache, createPayloadKey } from '@/lib/cache';

describe('SimpleLruCache', () => {
  it('stores and retrieves items correctly', () => {
    const cache = new SimpleLruCache<string>(3, 5000);
    cache.set('a', 'alpha', 5000, 1000);
    expect(cache.get('a', 1000)).toBe('alpha');
    expect(cache.has('a', 1000)).toBe(true);
  });

  it('evicts least recently used items when capacity is reached', () => {
    const cache = new SimpleLruCache<number>(2, 5000);
    cache.set('k1', 1, 5000, 1000);
    cache.set('k2', 2, 5000, 1000);

    // Access k1 to make it most recently used
    cache.get('k1', 1050);

    // Insert k3 -> should evict k2
    cache.set('k3', 3, 5000, 1100);

    expect(cache.has('k1', 1100)).toBe(true);
    expect(cache.has('k2', 1100)).toBe(false);
    expect(cache.has('k3', 1100)).toBe(true);
  });

  it('expires entries after TTL elapses', () => {
    const cache = new SimpleLruCache<string>(5, 1000);
    cache.set('expiring', 'value', 1000, 1000);

    // Active before 2000
    expect(cache.get('expiring', 1500)).toBe('value');

    // Expired at 2001
    expect(cache.get('expiring', 2001)).toBeUndefined();
    expect(cache.has('expiring', 2001)).toBe(false);
  });

  it('clears all items on demand', () => {
    const cache = new SimpleLruCache<string>(5);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('updates existing keys without increasing capacity', () => {
    const cache = new SimpleLruCache<string>(3);
    cache.set('key', 'val1');
    cache.set('key', 'val2');
    expect(cache.get('key')).toBe('val2');
    expect(cache.size()).toBe(1);
  });

  it('creates deterministic payload keys irrespective of property order and handles non-objects', () => {
    const payload1 = { event: 'Wedding', budget: 1000, city: 'Jaipur' };
    const payload2 = { city: 'Jaipur', budget: 1000, event: 'Wedding' };

    const key1 = createPayloadKey('test', payload1);
    const key2 = createPayloadKey('test', payload2);

    expect(key1).toBe(key2);

    // Nested payload test: ensure nested fields are NOT stripped
    const nested1 = { intake: { city: 'Jaipur', guestCount: 300 }, followUps: [] };
    const nested2 = { followUps: [], intake: { guestCount: 300, city: 'Jaipur' } };
    const nestedDifferent = { intake: { city: 'Mumbai', guestCount: 300 }, followUps: [] };

    expect(createPayloadKey('plan', nested1)).toBe(createPayloadKey('plan', nested2));
    expect(createPayloadKey('plan', nested1)).not.toBe(createPayloadKey('plan', nestedDifferent));
    expect(createPayloadKey('plan', nested1)).toContain('Jaipur');

    const primKey = createPayloadKey('scalar', 'simple-string');
    expect(primKey).toBe('scalar:"simple-string"');

    const nullKey = createPayloadKey('null-test', null);
    expect(nullKey).toBe('null-test:null');
  });
});

import { describe, it, expect } from 'vitest';
import { toFirestoreDoc, fromFirestoreDoc } from '@/lib/firebase/mappers';
import { SAMPLE_WEDDING_PLAN } from '@/data/savedExamples';

describe('Firestore Data Mappers', () => {
  it('serializes an EventPlan into a Firestore document structure', () => {
    const doc = toFirestoreDoc(SAMPLE_WEDDING_PLAN);

    expect(doc.id).toBe(SAMPLE_WEDDING_PLAN.id);
    expect(doc.title).toBe(SAMPLE_WEDDING_PLAN.title);
    expect(doc.budget.categories).toHaveLength(SAMPLE_WEDDING_PLAN.budget.categories.length);
    expect(doc.timeline).toHaveLength(SAMPLE_WEDDING_PLAN.timeline.length);
    expect(doc.vendors).toHaveLength(SAMPLE_WEDDING_PLAN.vendors.length);
    expect(doc.ideas.themes).toEqual(SAMPLE_WEDDING_PLAN.ideas.themes);
  });

  it('reconstitutes a valid EventPlan from Firestore document data', () => {
    const doc = toFirestoreDoc(SAMPLE_WEDDING_PLAN);
    const restored = fromFirestoreDoc(doc);

    expect(restored.id).toBe(SAMPLE_WEDDING_PLAN.id);
    expect(restored.totalBudget).toBe(SAMPLE_WEDDING_PLAN.totalBudget);
    expect(restored.budget.categories[0].name).toBe(
      SAMPLE_WEDDING_PLAN.budget.categories[0].name
    );
  });

  it('throws an error when attempting to map invalid or non-object Firestore data', () => {
    expect(() => fromFirestoreDoc(null)).toThrow('expected an object');
    expect(() => fromFirestoreDoc('not-an-object')).toThrow('expected an object');
    expect(() => fromFirestoreDoc({ id: 'missing-all-fields' })).toThrow('Corrupted plan data');
  });
});

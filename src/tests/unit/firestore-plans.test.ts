import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveUserPlan,
  savePlanVersion,
  listPlanVersions,
  duplicateUserPlan,
  MAX_VERSIONS_PER_PLAN,
} from '@/lib/firebase/firestore';
import { SAVED_EXAMPLES } from '@/data/savedExamples';

// Mock Firebase Firestore SDK
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
    doc: vi.fn((...args) => ({ id: args[args.length - 1], path: args.join('/') })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    query: vi.fn((coll) => coll),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
  };
});

// Mock config
vi.mock('@/lib/firebase/config', () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

import { setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

describe('Firestore Plans & Versions Management', () => {
  const examplePlan = SAVED_EXAMPLES.wedding;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveUserPlan saves plan to users/{uid}/plans/{planId}', async () => {
    await saveUserPlan('user-test-1', examplePlan);
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: examplePlan.id }),
      expect.objectContaining({ id: examplePlan.id, title: examplePlan.title }),
      { merge: true }
    );
  });

  it('savePlanVersion saves snapshot and prunes older versions if count exceeds 20', async () => {
    // Mock 22 existing versions
    const mockDocs = Array.from({ length: 22 }, (_, i) => ({
      id: `v_${i}`,
      ref: { id: `v_${i}` },
    }));

    (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      size: 22,
      docs: mockDocs,
    });

    const versionId = await savePlanVersion('user-test-1', examplePlan.id, examplePlan);
    expect(versionId).toMatch(/^v_1_\d+$/);

    // Should have pruned the 2 oldest versions beyond 20
    expect(deleteDoc).toHaveBeenCalledTimes(2);
    expect(deleteDoc).toHaveBeenCalledWith(mockDocs[MAX_VERSIONS_PER_PLAN].ref);
    expect(deleteDoc).toHaveBeenCalledWith(mockDocs[MAX_VERSIONS_PER_PLAN + 1].ref);
  });

  it('listPlanVersions returns list of parsed version records', async () => {
    const mockSnapshots = [
      {
        id: 'v_2_123',
        data: () => ({
          versionNumber: 2,
          savedAt: '2026-10-22T10:00:00Z',
          planData: examplePlan,
        }),
      },
    ];

    (getDocs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSnapshots);

    const records = await listPlanVersions('user-test-1', examplePlan.id);
    expect(records).toHaveLength(1);
    expect(records[0].versionNumber).toBe(2);
    expect(records[0].plan.title).toBe(examplePlan.title);
  });

  it('duplicateUserPlan clones source plan with new ID, (Copy) title, version 1, and strips calendar event IDs', async () => {
    const planWithCalendar: typeof examplePlan = {
      ...examplePlan,
      timeline: examplePlan.timeline.map((t, idx) =>
        idx === 0 ? { ...t, googleCalendarEventId: 'old-calendar-event-id' } : t
      ),
    };

    (getDoc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      exists: () => true,
      data: () => planWithCalendar,
    });

    const duplicated = await duplicateUserPlan('user-test-1', examplePlan.id);

    expect(duplicated.id).not.toBe(examplePlan.id);
    expect(duplicated.title).toBe(`${examplePlan.title} (Copy)`);
    expect(duplicated.version).toBe(1);
    // Verified: Calendar IDs stripped from duplicate so sync is independent
    expect(duplicated.timeline[0].googleCalendarEventId).toBeUndefined();
    expect(setDoc).toHaveBeenCalled();
  });
});

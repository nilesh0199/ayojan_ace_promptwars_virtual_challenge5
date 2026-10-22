import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { EventPlan } from '../schemas';
import { toFirestoreDoc, fromFirestoreDoc } from './mappers';

export const MAX_VERSIONS_PER_PLAN = 20;

export interface PlanVersionRecord {
  id: string;
  versionNumber: number;
  savedAt: string;
  plan: EventPlan;
}

export interface PaginatedPlansResult {
  plans: EventPlan[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Saves or updates a plan in Firestore under /users/{uid}/plans/{planId}.
 */
export async function saveUserPlan(uid: string, plan: EventPlan): Promise<void> {
  if (!uid) throw new Error('Cannot save plan: User UID is required');
  const db = getFirebaseDb();
  const planRef = doc(db, 'users', uid, 'plans', plan.id);
  const docData = toFirestoreDoc(plan);
  await setDoc(planRef, docData, { merge: true });
}

/**
 * Saves a snapshot version under /users/{uid}/plans/{planId}/versions/{versionId}.
 * Enforces a strict ceiling of MAX_VERSIONS_PER_PLAN (20) by pruning older versions.
 */
export async function savePlanVersion(
  uid: string,
  planId: string,
  plan: EventPlan
): Promise<string> {
  if (!uid || !planId) throw new Error('Missing UID or PlanId');
  const db = getFirebaseDb();
  const versionsColl = collection(db, 'users', uid, 'plans', planId, 'versions');

  const versionId = `v_${plan.version}_${Date.now()}`;
  const versionRef = doc(versionsColl, versionId);

  const payload = {
    versionNumber: plan.version,
    savedAt: new Date().toISOString(),
    planData: toFirestoreDoc(plan),
  };

  await setDoc(versionRef, payload);

  // Prune older versions beyond 20
  try {
    const q = query(versionsColl, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.size > MAX_VERSIONS_PER_PLAN) {
      const docsToDelete = snapshot.docs.slice(MAX_VERSIONS_PER_PLAN);
      await Promise.all(docsToDelete.map((d) => deleteDoc(d.ref)));
    }
  } catch {
    // Non-blocking prune error
  }

  return versionId;
}

/**
 * Lists version history for a given plan.
 */
export async function listPlanVersions(
  uid: string,
  planId: string
): Promise<PlanVersionRecord[]> {
  if (!uid || !planId) return [];
  const db = getFirebaseDb();
  const versionsColl = collection(db, 'users', uid, 'plans', planId, 'versions');
  const q = query(versionsColl, orderBy('savedAt', 'desc'), limit(MAX_VERSIONS_PER_PLAN));
  const snapshot = await getDocs(q);

  const records: PlanVersionRecord[] = [];
  snapshot.forEach((docSnap) => {
    try {
      const data = docSnap.data();
      const plan = fromFirestoreDoc(data.planData);
      records.push({
        id: docSnap.id,
        versionNumber: data.versionNumber || plan.version,
        savedAt: data.savedAt || plan.updatedAt,
        plan,
      });
    } catch {
      // Ignore corrupt version entries
    }
  });

  return records;
}

/**
 * Restores a specific saved version into the active plan document.
 */
export async function restorePlanVersion(
  uid: string,
  planId: string,
  versionId: string
): Promise<EventPlan> {
  if (!uid || !planId || !versionId) throw new Error('Missing parameters to restore plan version');
  const db = getFirebaseDb();
  const versionRef = doc(db, 'users', uid, 'plans', planId, 'versions', versionId);
  const snap = await getDoc(versionRef);

  if (!snap.exists()) {
    throw new Error('Requested plan version not found in Firestore');
  }

  const restoredPlan = fromFirestoreDoc(snap.data().planData);

  // Fetch current main plan to increment version
  const currentPlan = await getUserPlan(uid, planId);
  const nextVersion = (currentPlan?.version || 1) + 1;

  const updatedPlan: EventPlan = {
    ...restoredPlan,
    id: planId,
    version: nextVersion,
    updatedAt: new Date().toISOString(),
  };

  await saveUserPlan(uid, updatedPlan);
  await savePlanVersion(uid, planId, updatedPlan);

  return updatedPlan;
}

/**
 * Clones a plan as an independent copy with a new UUID.
 */
export async function duplicateUserPlan(uid: string, planId: string): Promise<EventPlan> {
  if (!uid || !planId) throw new Error('Missing UID or PlanId');
  const source = await getUserPlan(uid, planId);
  if (!source) throw new Error('Source plan to duplicate does not exist');

  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const now = new Date().toISOString();

  // Strip calendar event IDs from duplicate so they do not share sync references
  const cleanTimeline = source.timeline.map((t) => ({
    ...t,
    googleCalendarEventId: undefined,
  }));

  const duplicatedPlan: EventPlan = {
    ...source,
    id: newId,
    title: `${source.title} (Copy)`.slice(0, 120),
    timeline: cleanTimeline,
    version: 1,
    createdAt: now,
    updatedAt: now,
    isSavedExample: false,
  };

  await saveUserPlan(uid, duplicatedPlan);
  await savePlanVersion(uid, newId, duplicatedPlan);

  return duplicatedPlan;
}

/**
 * Fetches all saved plans for the given user, ordered by most recently updated.
 */
export async function listUserPlans(uid: string): Promise<EventPlan[]> {
  if (!uid) return [];
  const db = getFirebaseDb();
  const plansColl = collection(db, 'users', uid, 'plans');
  const q = query(plansColl, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  const results: EventPlan[] = [];
  snapshot.forEach((docSnap) => {
    try {
      const plan = fromFirestoreDoc(docSnap.data());
      results.push(plan);
    } catch {
      // Gracefully ignore corrupt records
    }
  });

  return results;
}

/**
 * Paginated query for saved plans (capped at pageSize, default 50) with cursor support.
 */
export async function listUserPlansPaginated(
  uid: string,
  pageSize = 50,
  startAfterDocSnap: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<PaginatedPlansResult> {
  if (!uid) {
    return { plans: [], lastDoc: null, hasMore: false };
  }

  const db = getFirebaseDb();
  const plansColl = collection(db, 'users', uid, 'plans');

  const constraints: QueryConstraint[] = [orderBy('updatedAt', 'desc')];
  if (startAfterDocSnap) {
    constraints.push(startAfter(startAfterDocSnap));
  }
  // Request pageSize + 1 to detect hasMore
  constraints.push(limit(pageSize + 1));

  const q = query(plansColl, ...constraints);
  const snapshot = await getDocs(q);

  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const docsToReturn = hasMore ? docs.slice(0, pageSize) : docs;

  const plans: EventPlan[] = [];
  docsToReturn.forEach((d) => {
    try {
      plans.push(fromFirestoreDoc(d.data()));
    } catch {
      // Ignore corrupt records
    }
  });

  const lastDoc = docsToReturn.length > 0 ? docsToReturn[docsToReturn.length - 1] : null;

  return { plans, lastDoc, hasMore };
}

/**
 * Retrieves a single plan document by ID for a user.
 */
export async function getUserPlan(uid: string, planId: string): Promise<EventPlan | null> {
  if (!uid || !planId) return null;
  const db = getFirebaseDb();
  const planRef = doc(db, 'users', uid, 'plans', planId);
  const snapshot = await getDoc(planRef);

  if (!snapshot.exists()) {
    return null;
  }

  return fromFirestoreDoc(snapshot.data());
}

/**
 * Renames an existing saved plan.
 */
export async function renameUserPlan(
  uid: string,
  planId: string,
  newTitle: string
): Promise<void> {
  if (!uid || !planId) throw new Error('Missing UID or PlanId');
  const db = getFirebaseDb();
  const planRef = doc(db, 'users', uid, 'plans', planId);
  await updateDoc(planRef, {
    title: newTitle.trim(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Permanently deletes a plan document and any versions for the user.
 */
export async function deleteUserPlan(uid: string, planId: string): Promise<void> {
  if (!uid || !planId) throw new Error('Missing UID or PlanId');
  const db = getFirebaseDb();
  const planRef = doc(db, 'users', uid, 'plans', planId);

  // Attempt to delete subcollection versions
  try {
    const versionsColl = collection(db, 'users', uid, 'plans', planId, 'versions');
    const versionsSnap = await getDocs(versionsColl);
    await Promise.all(versionsSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // Non-blocking
  }

  await deleteDoc(planRef);
}

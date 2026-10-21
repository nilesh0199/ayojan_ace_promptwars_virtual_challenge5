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
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { EventPlan } from '../schemas';
import { toFirestoreDoc, fromFirestoreDoc } from './mappers';

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
 * Permanently deletes a plan document for the user.
 */
export async function deleteUserPlan(uid: string, planId: string): Promise<void> {
  if (!uid || !planId) throw new Error('Missing UID or PlanId');
  const db = getFirebaseDb();
  const planRef = doc(db, 'users', uid, 'plans', planId);
  await deleteDoc(planRef);
}

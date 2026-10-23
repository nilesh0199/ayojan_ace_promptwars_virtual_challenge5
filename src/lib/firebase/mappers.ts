import { EventPlan, eventPlanSchema } from '../schemas';

export interface FirestorePlanDoc {
  id: string;
  title: string;
  eventType: string;
  city: string;
  date: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  styleCulture: string;
  nonNegotiables: string;
  budget: {
    categories: Array<{
      id: string;
      name: string;
      minEstimate: number;
      maxEstimate: number;
      targetEstimate: number;
      notes: string;
    }>;
    contingencyPercent: number;
    taxServiceChargePercent: number;
    statedAssumptions: string[];
  };
  timeline: Array<{
    id: string;
    phase: string;
    title: string;
    description: string;
    dueDate: string;
    owner: string;
    estimatedCostLink?: string;
    completed: boolean;
    daysBeforeEvent: number;
    googleCalendarEventId?: string;
    isGuestMilestone?: boolean;
    isTimeSensitive?: boolean;
  }>;
  vendors: Array<{
    id: string;
    categoryName: string;
    vendorTypeDescription: string;
    status: string;
    questionsToAsk: string[];
    verifyWithVendorNotice: string;
    notes: string;
  }>;
  ideas: {
    themes: string[];
    dietaryNotes: string[];
    activities: string[];
    decor: string[];
  };
  createdAt: string;
  updatedAt: string;
  version: number;
  isSavedExample: boolean;
}

/**
 * Transforms an in-memory EventPlan object into a strictly serialized Firestore document representation.
 */
export function toFirestoreDoc(plan: EventPlan): FirestorePlanDoc {
  // Validate against Zod schema before mapping
  const validPlan = eventPlanSchema.parse(plan);

  return {
    id: validPlan.id,
    title: validPlan.title,
    eventType: validPlan.eventType,
    city: validPlan.city,
    date: validPlan.date,
    guestCount: validPlan.guestCount,
    totalBudget: validPlan.totalBudget,
    currency: validPlan.currency,
    styleCulture: validPlan.styleCulture,
    nonNegotiables: validPlan.nonNegotiables,
    budget: {
      categories: validPlan.budget.categories.map((c) => ({
        id: c.id,
        name: c.name,
        minEstimate: c.minEstimate,
        maxEstimate: c.maxEstimate,
        targetEstimate: c.targetEstimate,
        notes: c.notes,
      })),
      contingencyPercent: validPlan.budget.contingencyPercent,
      taxServiceChargePercent: validPlan.budget.taxServiceChargePercent,
      statedAssumptions: validPlan.budget.statedAssumptions,
    },
    timeline: validPlan.timeline.map((t) => {
      const item: Record<string, unknown> = {
        id: t.id,
        phase: t.phase,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        owner: t.owner,
        completed: Boolean(t.completed),
        daysBeforeEvent: t.daysBeforeEvent,
      };
      if (t.estimatedCostLink !== undefined && t.estimatedCostLink !== null && t.estimatedCostLink !== '') {
        item.estimatedCostLink = t.estimatedCostLink;
      }
      if (t.googleCalendarEventId) {
        item.googleCalendarEventId = t.googleCalendarEventId;
      }
      if (t.isGuestMilestone) {
        item.isGuestMilestone = true;
      }
      if (t.isTimeSensitive) {
        item.isTimeSensitive = true;
      }
      return item as FirestorePlanDoc['timeline'][number];
    }),
    vendors: validPlan.vendors.map((v) => ({
      id: v.id,
      categoryName: v.categoryName,
      vendorTypeDescription: v.vendorTypeDescription,
      status: v.status,
      questionsToAsk: v.questionsToAsk,
      verifyWithVendorNotice: v.verifyWithVendorNotice,
      notes: v.notes,
    })),
    ideas: {
      themes: validPlan.ideas.themes,
      dietaryNotes: validPlan.ideas.dietaryNotes,
      activities: validPlan.ideas.activities,
      decor: validPlan.ideas.decor,
    },
    createdAt: validPlan.createdAt,
    updatedAt: validPlan.updatedAt,
    version: validPlan.version,
    isSavedExample: validPlan.isSavedExample,
  };
}

/**
 * Parses and validates Firestore document snapshot data back into a typed EventPlan object.
 */
export function fromFirestoreDoc(data: unknown): EventPlan {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Firestore document data: expected an object');
  }

  const parsed = eventPlanSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Corrupted plan data in Firestore: ${parsed.error.message}`);
  }

  return parsed.data;
}

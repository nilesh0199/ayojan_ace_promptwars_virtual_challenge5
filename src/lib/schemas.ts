import { z } from 'zod';
import {
  EVENT_TYPES,
  TIMELINE_PHASES,
  VENDOR_STATUSES,
  RISK_SEVERITIES,
  CurrencyCode,
  VendorStatus,
  TimelinePhase,
  RiskSeverity,
} from './constants';

export type { VendorStatus, TimelinePhase, RiskSeverity };

export const currencyCodeSchema = z.enum([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'CAD',
  'AUD',
]);

/**
 * Intake form validation schema
 */
export const intakeFormSchema = z.object({
  eventType: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: 'Please select a valid event type' }),
  }),
  city: z
    .string()
    .trim()
    .min(2, 'City name must be at least 2 characters')
    .max(80, 'City name cannot exceed 80 characters'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date format (YYYY-MM-DD)')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid calendar date' }),
  guestCount: z.coerce
    .number({ invalid_type_error: 'Guest count must be a number' })
    .int('Guest count must be an integer')
    .min(2, 'Guest count must be at least 2')
    .max(50000, 'Guest count exceeds maximum supported size (50,000)'),
  totalBudget: z.coerce
    .number({ invalid_type_error: 'Total budget must be a number' })
    .positive('Budget must be greater than zero')
    .max(1000000000, 'Budget exceeds supported limit'),
  currency: currencyCodeSchema.default('INR'),
  styleCulture: z
    .string()
    .trim()
    .min(2, 'Style or culture description must be at least 2 characters')
    .max(300, 'Style or culture cannot exceed 300 characters'),
  nonNegotiables: z
    .string()
    .trim()
    .max(500, 'Non-negotiables cannot exceed 500 characters')
    .default(''),
});

export type IntakeFormData = z.infer<typeof intakeFormSchema>;

/**
 * Follow-up question schema
 */
export const followUpResponseSchema = z.object({
  needsFollowUp: z.boolean(),
  questionId: z.string().optional(),
  questionText: z.string().max(250).optional(),
  reason: z.string().max(200).optional(),
});

export type FollowUpResponse = z.infer<typeof followUpResponseSchema>;

/**
 * Budget category line schema
 */
export const budgetCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  minEstimate: z.number().nonnegative(),
  maxEstimate: z.number().nonnegative(),
  targetEstimate: z.number().nonnegative(),
  notes: z.string().max(300),
});

export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

/**
 * Complete Budget slice schema
 */
export const budgetPlanSchema = z.object({
  categories: z.array(budgetCategorySchema).min(3).max(15),
  contingencyPercent: z.number().min(0).max(30),
  taxServiceChargePercent: z.number().min(0).max(30),
  statedAssumptions: z.array(z.string().max(250)).min(1).max(10),
});

export type BudgetPlan = z.infer<typeof budgetPlanSchema>;

/**
 * Timeline task schema
 */
export const timelineTaskSchema = z.object({
  id: z.string(),
  phase: z.enum(TIMELINE_PHASES),
  title: z.string().min(2).max(150),
  description: z.string().max(300),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owner: z.string().max(60),
  estimatedCostLink: z.string().max(100).optional(),
  completed: z.boolean().default(false),
  daysBeforeEvent: z.number().int(),
});

export type TimelineTask = z.infer<typeof timelineTaskSchema>;

/**
 * Vendor checklist category schema
 */
export const vendorItemSchema = z.object({
  id: z.string(),
  categoryName: z.string().min(2).max(100),
  vendorTypeDescription: z.string().max(300),
  status: z.enum(VENDOR_STATUSES).default('Shortlisted'),
  questionsToAsk: z.array(z.string().max(250)).min(2).max(6),
  verifyWithVendorNotice: z.string().default('Verify with the vendor'),
  notes: z.string().max(300).default(''),
});

export type VendorItem = z.infer<typeof vendorItemSchema>;

/**
 * Personalized ideas schema
 */
export const personalizedIdeasSchema = z.object({
  themes: z.array(z.string().max(150)).min(1).max(5),
  dietaryNotes: z.array(z.string().max(200)).min(1).max(6),
  activities: z.array(z.string().max(200)).min(1).max(8),
  decor: z.array(z.string().max(200)).min(1).max(8),
});

export type PersonalizedIdeas = z.infer<typeof personalizedIdeasSchema>;

/**
 * Complete Full Event Plan Schema
 */
export const eventPlanSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(120),
  eventType: z.enum(EVENT_TYPES),
  city: z.string(),
  date: z.string(),
  guestCount: z.number(),
  totalBudget: z.number(),
  currency: currencyCodeSchema,
  styleCulture: z.string(),
  nonNegotiables: z.string(),
  budget: budgetPlanSchema,
  timeline: z.array(timelineTaskSchema).min(4),
  vendors: z.array(vendorItemSchema).min(3),
  ideas: personalizedIdeasSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().default(1),
  isSavedExample: z.boolean().default(false),
});

export type EventPlan = z.infer<typeof eventPlanSchema>;

/**
 * Replanning request & diff schemas
 */
export const replanRequestSchema = z.object({
  currentPlan: eventPlanSchema,
  changes: z.object({
    totalBudget: z.number().positive().optional(),
    guestCount: z.number().int().positive().optional(),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    modifiedCategory: z
      .object({
        categoryId: z.string(),
        newTargetEstimate: z.number().nonnegative(),
      })
      .optional(),
  }),
});

export type ReplanRequest = z.infer<typeof replanRequestSchema>;

export const replanDiffResponseSchema = z.object({
  summaryOfChanges: z.string().max(300),
  why: z.string().max(500),
  tradeOffOptions: z.array(z.string().max(300)).min(1).max(5),
  affectedBudgetCategories: z.array(budgetCategorySchema),
  affectedTimelineTasks: z.array(timelineTaskSchema),
  newContingencyPercent: z.number().min(0).max(30).optional(),
});

export type ReplanDiffResponse = z.infer<typeof replanDiffResponseSchema>;

/**
 * Risk Assessment Item schema
 */
export const riskItemSchema = z.object({
  id: z.string(),
  category: z.enum([
    'Dependencies',
    'Weather & Season',
    'Permits & Legal',
    'Dietary & Accessibility',
    'Payment Deadlines',
    'Single Point of Failure',
  ]),
  severity: z.enum(RISK_SEVERITIES),
  potentialIssue: z.string().max(250),
  rootCause: z.string().max(300),
  mitigationTask: z.string().max(300),
});

export type RiskItem = z.infer<typeof riskItemSchema>;

export const riskRegisterSchema = z.object({
  risks: z.array(riskItemSchema).min(3).max(12),
  assessedAt: z.string(),
});

export type RiskRegister = z.infer<typeof riskRegisterSchema>;

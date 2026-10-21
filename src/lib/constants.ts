/**
 * Core product constants for Aayojan Ace.
 * APP_NAME is isolated here to enable 1-line app re-branding.
 */
export const APP_NAME = 'Aayojan Ace';
export const APP_TAGLINE = 'Your celebration, perfectly planned.';
export const APP_ONE_LINER =
  'Aayojan Ace is an intelligent celebration and event planning assistant that organizes weddings, birthdays, and community events with adaptive budgets, timelines, and verified vendor checklists.';

export const DEFAULT_CURRENCY = 'INR';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'ar-AE' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
};

export const EVENT_TYPES = ['Wedding', 'Birthday', 'Community Event'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventPreset {
  id: string;
  title: string;
  eventType: EventType;
  defaultCity: string;
  suggestedGuests: number;
  suggestedBudget: number;
  styleCulture: string;
  nonNegotiables: string;
  description: string;
}

export const EVENT_PRESETS: EventPreset[] = [
  {
    id: 'indian-wedding',
    title: 'Indian Wedding',
    eventType: 'Wedding',
    defaultCity: 'Jaipur',
    suggestedGuests: 350,
    suggestedBudget: 2500000,
    styleCulture: 'Traditional Royal Rajasthani with Sangeet & Mehendi',
    nonNegotiables: 'Authentic regional catering (strict Jain counter), live Shehnai, venue with open lawn',
    description: 'Multi-day celebratory wedding with traditional ceremonies, rituals, and grand feast.',
  },
  {
    id: 'housewarming',
    title: 'Griha Pravesh / Housewarming',
    eventType: 'Community Event',
    defaultCity: 'Bengaluru',
    suggestedGuests: 60,
    suggestedBudget: 150000,
    styleCulture: 'Warm Traditional Pooja followed by contemporary buffet brunch',
    nonNegotiables: 'Auspicious muhurat timing compliance, eco-friendly floral rangoli, satvik prasad',
    description: 'Intimate blessing ceremony and celebratory brunch for family and close neighbors.',
  },
  {
    id: 'diwali-gathering',
    title: 'Diwali / Festival Gathering',
    eventType: 'Community Event',
    defaultCity: 'Mumbai',
    suggestedGuests: 120,
    suggestedBudget: 300000,
    styleCulture: 'Festive Diyas & Marigold theme with live acoustic music and mithai stalls',
    nonNegotiables: 'Zero firecrackers, handcrafted sweet boxes for all guests, children craft station',
    description: 'Vibrant residential society or family festive evening celebrating light and togetherness.',
  },
  {
    id: 'college-fest',
    title: 'College Annual Fest / Cultural Evening',
    eventType: 'Community Event',
    defaultCity: 'Delhi',
    suggestedGuests: 800,
    suggestedBudget: 600000,
    styleCulture: 'Youth indie-rock fusion, food truck park, and battle of the bands',
    nonNegotiables: 'Campus security approval & permits, strict 10 PM decibel cutoff, ambulance on standby',
    description: 'High-energy inter-college festival with student performances and guest artist concert.',
  },
];

export const TIMELINE_PHASES = [
  'Now',
  'Next 7 days',
  'Next 30 days',
  'Event week',
  'Event day',
] as const;
export type TimelinePhase = (typeof TIMELINE_PHASES)[number];

export const VENDOR_STATUSES = [
  'Shortlisted',
  'Contacted',
  'Quoted',
  'Booked',
  'Contract received',
] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const RISK_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const PLANNER_DISCLAIMER =
  'Notice: All figures provided are planning estimates, not guaranteed vendor quotes. Aayojan Ace does not call, contract, or execute bookings with third-party vendors. Never enter sensitive personal identification or financial credentials.';

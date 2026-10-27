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
    id: 'nikah-walima',
    title: 'Nikah & Walima',
    eventType: 'Wedding',
    defaultCity: 'Hyderabad',
    suggestedGuests: 250,
    suggestedBudget: 1200000,
    styleCulture: 'Traditional Hyderabadi Nikah followed by celebratory Walima reception',
    nonNegotiables: 'Certified halal Mughlai feast, optional partition for separate family seating, ceremony timing set by family & religious guidance',
    description: 'Sacred Nikah solemnization followed by an elegant Walima banquet with authentic Hyderabadi hospitality.',
  },
  {
    id: 'church-wedding',
    title: 'Church Wedding & Reception',
    eventType: 'Wedding',
    defaultCity: 'Kochi',
    suggestedGuests: 200,
    suggestedBudget: 1000000,
    styleCulture: 'Solemn Christian Nuptial Mass & Evening Dinner Reception',
    nonNegotiables: 'Church and officiant coordination with rehearsal, reception venue with dance floor, ceremony timing confirmed with church',
    description: 'Traditional church nuptials and blessing followed by a lively dinner reception with live music and cake cutting.',
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

/**
 * Standard guest communication milestone offsets (in days before celebration).
 * Configured as named constants so offsets are transparent and maintainable.
 */
export const GUEST_MILESTONE_OFFSETS = {
  SAVE_THE_DATE_DAYS: 56, // 8 weeks before (Weddings only)
  INVITATIONS_DAYS: 21, // 3 weeks before (All event types)
  RSVP_FOLLOWUP_DAYS: 10, // 10 days before
  FINAL_HEADCOUNT_DAYS: 5, // 5 days before
} as const;

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

export const AUTHOR_NAME = 'Nilesh Thipe';

export const CONTACT_LINKS = {
  linkedIn: 'https://www.linkedin.com/in/nilesh-h-thipe-372291253',
  github: 'https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5',
  githubProfile: 'https://github.com/nilesh0199',
} as const;

export const POPULAR_INDIAN_CITIES = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Jaipur',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Udaipur',
  'Goa',
  'Chandigarh',
] as const;

export const QUICK_GUEST_PICKS = [25, 50, 100, 200, 300, 500];

export const QUICK_BUDGET_PICKS = [
  { label: '₹1 Lakh', value: 100000 },
  { label: '₹2.5 Lakh', value: 250000 },
  { label: '₹5 Lakh', value: 500000 },
  { label: '₹10 Lakh', value: 1000000 },
  { label: '₹20 Lakh', value: 2000000 },
  { label: '₹35 Lakh', value: 3500000 },
  { label: '₹50 Lakh', value: 5000000 },
];

export const STYLE_CULTURE_CHIPS: Record<EventType, string[]> = {
  Wedding: [
    'Traditional Royal Heritage',
    'Minimalist Elegant',
    'Garden / Outdoor Lawn',
    'Eco-Friendly Zero-Waste',
    'Rajasthani Grandeur',
    'Maharashtrian Traditional',
    'South Indian Classical',
    'Punjabi Vibrant Sangeet',
    'Modern Fusion',
  ],
  Birthday: [
    'Artisan Garden Gathering',
    'Vibrant Themed Party',
    'Minimalist Dinner & Music',
    'Kids Adventure Play',
    'Retro Bollywood Night',
    'Outdoor Sunset Picnic',
  ],
  'Community Event': [
    'Diwali Mela & Rangoli',
    'Holi Milan & Cultural Evening',
    'Society Sports & Banquet',
    'Navratri Dandiya Raas',
    'Eco-Friendly Green Mela',
    'Senior Citizens Felicitation',
  ],
};

export const NON_NEGOTIABLE_CHIPS: Record<EventType, string[]> = {
  Wedding: [
    'Pure vegetarian menu',
    'Dedicated Jain food counter',
    'Wheelchair accessible venue',
    'Live shehnai / instrumental music',
    'Candid photographer & drone',
    'Ample guest valet parking',
    'Air-conditioned indoor backup hall',
    'Eco-friendly compostable tableware',
  ],
  Birthday: [
    'Custom allergen-free cake',
    'Dedicated kids play coordinator',
    'Wheelchair accessible seating',
    'Acoustic sound curfew by 10 PM',
    'Covered rain backup area',
    'Reserved senior seating zone',
  ],
  'Community Event': [
    'Zero firecrackers policy',
    'Certified accessibility ramp',
    'Electrical safety certification',
    'First aid & emergency doctor on site',
    'Separate dry & wet waste segregation',
    'Sound decibel monitoring indoor backup',
  ],
};

export const EVENT_NAME_EXAMPLES: Record<EventType, string[]> = {
  Wedding: [
    'Aarav & Diya’s Royal Pheras',
    'Faizan & Ayesha’s Royal Nikah',
    'Joshua & Maria’s Church Nuptials',
    'Heritage Courtyard Shaadi',
  ],
  Birthday: [
    'Vihaan’s 1st Safari Milestone',
    'Amina’s 25th Garden Dawat',
    'David’s 50th Jubilee Banquet',
    'Golden Milestone Gala',
  ],
  'Community Event': [
    'Anand Mela Diwali Society Gathering',
    'Grand Eid Milan Community Dawat',
    'St. Jude’s Annual Christmas Carnival',
    'Green Horizon Eco Cultural Night',
  ],
};

export const ASK_AI_STARTER_QUESTIONS: Record<EventType, string[]> = {
  Wedding: [
    'How should we structure pheras and dinner timings around the muhurat?',
    'What vendor questions are critical for a pure Jain catering counter?',
    'How can we reduce decor costs without losing traditional aesthetics?',
    'What are standard milestone timelines for wedding invitations and RSVPs?',
  ],
  Birthday: [
    'What are fun interactive activities for mixed-age guests?',
    'How do we manage sound curfews and catering proportions for 50 people?',
    'What are good photography checklist items for a milestone birthday?',
    'How can we build a memorable party within our target budget?',
  ],
  'Community Event': [
    'What safety permits and decibel limits apply for residential gatherings?',
    'How can we organize food kiosks to minimize lines and food waste?',
    'What accessibility accommodations should be prioritized for senior residents?',
    'How do we structure volunteer responsibilities across event week?',
  ],
};

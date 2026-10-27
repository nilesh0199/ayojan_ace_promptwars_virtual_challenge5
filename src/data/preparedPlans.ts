import { EventPlan, RiskRegister, TimelineTask } from '../lib/schemas';
import { EVENT_PRESETS, EventPreset, DEFAULT_CURRENCY } from '../lib/constants';
import {
  injectGuestMilestones,
  reflowTimelineDates,
  formatDateISO,
  parseDateISO,
} from '../lib/timeline';
import {
  SAMPLE_WEDDING_PLAN,
  SAMPLE_BIRTHDAY_PLAN,
  SAMPLE_COMMUNITY_PLAN,
  SAMPLE_WEDDING_RISKS,
  SAMPLE_BIRTHDAY_RISKS,
  SAMPLE_COMMUNITY_RISKS,
} from './savedExamples';

export const PREPARED_PLAN_DELAY_MS = 3000;
export const PREPARED_PLAN_REDUCED_MOTION_DELAY_MS = 1000;

export const SAFEGUARDS_CHECK_DELAY_MS = 4000;
export const SAFEGUARDS_CHECK_REDUCED_MOTION_DELAY_MS = 1000;

export const PREPARED_PLAN_LOADING_MESSAGES = [
  'Opening your prepared plan...',
  'Setting your dates...',
  'Arranging your workspace...',
] as const;

export const SAFEGUARDS_LOADING_MESSAGES = [
  'Auditing municipal noise cutoffs and local police curfew hours...',
  'Evaluating seasonal weather patterns and sheltered space contingency...',
  'Stress-testing vendor delivery handoffs and samagri/ritual dependencies...',
  'Verifying strict dietary separation protocols (Jain, Halal, allergens)...',
  'Finalizing operational safeguards and risk mitigation register...',
] as const;

export interface PreparedPlanEntry {
  plan: EventPlan;
  risks: RiskRegister;
}

// ---------------------------------------------------------------------------
// 1. Preset 1: Indian Wedding in Jaipur with 350 guests (₹25 Lakh)
// ---------------------------------------------------------------------------
const BASE_DATE_WEDDING = '2026-11-28';

const INDIAN_WEDDING_BASE_TASKS: TimelineTask[] = [
  {
    id: 'task-iw-1',
    phase: 'Now',
    title: 'Inspect shortlist of Jaipur heritage lawn venues',
    description: 'Review courtyard accessibility, power infrastructure, and overnight setup policies.',
    dueDate: '2026-08-10',
    owner: 'Lead Family Coordinator',
    estimatedCostLink: 'Heritage Courtyard & Banquet Lawn',
    completed: true,
    daysBeforeEvent: 110,
  },
  {
    id: 'task-iw-2',
    phase: 'Now',
    title: 'Conduct catering tasting with separate Jain kitchen protocol',
    description: 'Confirm strict root-vegetable exclusions, dedicated cookware, and sanitization for Jain buffet line.',
    dueDate: '2026-09-09',
    owner: 'Family Food Committee',
    estimatedCostLink: 'Traditional Regional & Jain Catering',
    completed: false,
    daysBeforeEvent: 80,
  },
  {
    id: 'task-iw-3',
    phase: 'Next 30 days',
    title: 'Finalize floral color palette and mandap dimensions',
    description: 'Review mockups with decor team for sunset phera backdrop and walkway brass urlis.',
    dueDate: '2026-10-14',
    owner: 'Couple & Decor Lead',
    estimatedCostLink: 'Mandap, Floral Decor & Ambient Lighting',
    completed: false,
    daysBeforeEvent: 45,
  },
  {
    id: 'task-iw-4',
    phase: 'Next 30 days',
    title: 'Confirm photography shot list and family group schedule',
    description: 'Share family tree and must-have portrait sequences to ensure smooth coordination post-jaimala.',
    dueDate: '2026-10-29',
    owner: 'Couple',
    estimatedCostLink: 'Photography, Candid Cinema & Drone',
    completed: false,
    daysBeforeEvent: 30,
  },
  {
    id: 'task-iw-5',
    phase: 'Event week',
    title: 'Sound permit verification and diesel generator load test',
    description: 'Verify local municipal 10 PM sound compliance certificate and run generator changeover test.',
    dueDate: '2026-11-23',
    owner: 'Venue Manager',
    estimatedCostLink: 'Heritage Courtyard & Banquet Lawn',
    completed: false,
    daysBeforeEvent: 5,
  },
  {
    id: 'task-iw-6',
    phase: 'Event day',
    title: 'Morning coordinator inspection of phera samagri & lawn setup',
    description: 'Verify holy fire platform setup, seating covers, and warm welcome drink readiness.',
    dueDate: '2026-11-28',
    owner: 'Head Event Coordinator',
    estimatedCostLink: 'Heritage Courtyard & Banquet Lawn',
    completed: false,
    daysBeforeEvent: 0,
  },
];

export const PRESET_INDIAN_WEDDING_PLAN: EventPlan = {
  id: 'preset-indian-wedding-jaipur',
  title: 'Royal Rajasthani Heritage Wedding',
  eventType: 'Wedding',
  city: 'Jaipur',
  date: BASE_DATE_WEDDING,
  guestCount: 350,
  totalBudget: 2500000,
  currency: 'INR',
  styleCulture: 'Traditional Royal Rajasthani with Sangeet & Mehendi',
  nonNegotiables: 'Authentic regional catering (strict Jain counter), live Shehnai, venue with open lawn',
  budget: {
    categories: [
      {
        id: 'cat-iw-venue',
        name: 'Heritage Courtyard & Banquet Lawn',
        minEstimate: 550000,
        maxEstimate: 750000,
        targetEstimate: 650000,
        notes: 'Covers 2-day booking of heritage courtyard, dining lawn, and green rooms.',
      },
      {
        id: 'cat-iw-catering',
        name: 'Traditional Regional & Jain Catering',
        minEstimate: 720000,
        maxEstimate: 920000,
        targetEstimate: 820000,
        notes: 'Calculated for 350 guests across High Tea, Sangeet live counters, and multi-course grand feast.',
      },
      {
        id: 'cat-iw-decor',
        name: 'Mandap, Floral Decor & Ambient Lighting',
        minEstimate: 280000,
        maxEstimate: 380000,
        targetEstimate: 330000,
        notes: 'Locally sourced marigold chandeliers, brass lanterns, fabric drapes, and mandap structure.',
      },
      {
        id: 'cat-iw-photo',
        name: 'Photography, Candid Cinema & Drone',
        minEstimate: 160000,
        maxEstimate: 220000,
        targetEstimate: 190000,
        notes: 'Two candid photographers, traditional videographer, and drone coverage for barat.',
      },
      {
        id: 'cat-iw-music',
        name: 'Live Shehnai, Folk Musicians & DJ',
        minEstimate: 80000,
        maxEstimate: 120000,
        targetEstimate: 100000,
        notes: 'Live Shehnai/Nagada for phera rituals and acoustic sound setup for sangeet.',
      },
      {
        id: 'cat-iw-favors',
        name: 'Stationery, Invitations & Guest Favors',
        minEstimate: 40000,
        maxEstimate: 60000,
        targetEstimate: 50000,
        notes: 'Handcrafted welcome boxes, printed itinerary scrolls, and digital cards.',
      },
    ],
    contingencyPercent: 10,
    taxServiceChargePercent: 4,
    statedAssumptions: [
      'Estimates reflect mid-range economical Indian market benchmarks as planning estimates, not guaranteed quotes.',
      'Guest count of 350 is treated as upper ceiling for per-plate catering calculations.',
      'Contracts assume reservations confirmed 4 months in advance during peak wedding season.',
      'All vendor quotes must be verified independently before executing agreements.',
    ],
  },
  timeline: injectGuestMilestones(
    INDIAN_WEDDING_BASE_TASKS,
    BASE_DATE_WEDDING,
    'Wedding',
    '2026-06-01'
  ),
  vendors: [
    {
      id: 'ven-iw-1',
      categoryName: 'Heritage Haveli / Palace Lawn',
      vendorTypeDescription: 'Historic property with open lawn and guest accommodations',
      status: 'Quoted',
      questionsToAsk: [
        'What is your strict policy on outdoor amplification decibels after 10 PM?',
        'Are outside caterers permitted, or is there an empanelled caterer royalty fee?',
        'Does the rental fee include generator fuel backup and air-cooled green rooms for the bridal party?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Ensure contract explicitly defines room check-in hours and service tax breakdown.',
    },
    {
      id: 'ven-iw-2',
      categoryName: 'Regional & Jain Specialty Caterer',
      vendorTypeDescription: 'Caterer specializing in authentic Rajasthani cuisine with strict Jain segregation',
      status: 'Shortlisted',
      questionsToAsk: [
        'How do you physically segregate Jain dishes during preparation and live counter presentation?',
        'What is your server-to-guest ratio during peak dining hours?',
        'What happens to surplus prepared food at the conclusion of the banquet?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Request a live tasting session with elder family members before signing.',
    },
    {
      id: 'ven-iw-3',
      categoryName: 'Candid Documentary Photographer',
      vendorTypeDescription: 'Photo and cinema team skilled in natural lighting and cultural rituals',
      status: 'Contacted',
      questionsToAsk: [
        'How many primary photographers and assistant shooters will be on site on the wedding day?',
        'What is your delivery turnaround schedule for the teaser video and high-resolution raw photo archive?',
        'Do you provide physical archival leather photo albums as part of the package?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Check portfolio for past dusk lighting coverage at outdoor heritage properties.',
    },
    {
      id: 'ven-iw-4',
      categoryName: 'Live Shehnai & Classical Folk Ensemble',
      vendorTypeDescription: 'Traditional Rajasthani folk artists and classical ceremonial musicians',
      status: 'Shortlisted',
      questionsToAsk: [
        'Do you bring your own acoustic microphones and sound monitoring monitors?',
        'What is the traditional repertoire performed during the barat and phera ceremonies?',
        'What are the dress code requirements for the musicians during the formal rituals?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Coordinate arrival time 1 hour before barat assembly.',
    },
  ],
  ideas: {
    themes: [
      'Gilded Rajputana: Terracotta urns, fresh marigold chandeliers, and brass thali setups',
      'Twilight Pheras: Warm candlelit walkway leading to an open-dome mandap under starlight',
    ],
    dietaryNotes: [
      'Distinct dual buffet lines: one dedicated Pure Satvik/Jain without onion or garlic, one traditional Rajasthani vegetarian.',
      'Live chaat counter featuring Jaipur specialties with customizable spice levels.',
    ],
    activities: [
      'Pre-wedding traditional Mehendi lounge with local folk singers and interactive dhol players.',
      'Interactive turban-tying station (safa) for wedding guests with personalized lapel pins.',
    ],
    decor: [
      'Marigold flower curtains creating natural partitions between dining and ceremony lawns.',
      'Handcrafted blue pottery tableware and brass urli bowls with floating rose petals.',
    ],
  },
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
  version: 1,
  isSavedExample: true,
  generationSource: 'primary',
};

export const PRESET_INDIAN_WEDDING_RISKS: RiskRegister = {
  risks: [
    {
      id: 'risk-iw-1',
      category: 'Dependencies',
      severity: 'High',
      potentialIssue: 'Vendor delivery delay during peak afternoon setup hours',
      rootCause: 'Heavy weekend transit congestion and overlapping bookings in Jaipur heritage areas',
      mitigationTask: 'Mandate arrival and setup completion 2 hours prior to guest arrival with written vendor confirmation.',
    },
    {
      id: 'risk-iw-2',
      category: 'Weather & Season',
      severity: 'Medium',
      potentialIssue: 'Open-lawn evening dew and sudden temperature drops affecting elderly guests',
      rootCause: 'Desert climate temperature swing between afternoon sunshine and late-evening pheras',
      mitigationTask: 'Station patio gas heaters around dining lawns and keep emergency pashmina shawls accessible.',
    },
    {
      id: 'risk-iw-3',
      category: 'Permits & Legal',
      severity: 'Medium',
      potentialIssue: 'Sound curfew enforcement and municipal decibel limits after 10 PM',
      rootCause: 'Local city administration enforcement near residential heritage zones',
      mitigationTask: 'Obtain municipal sound NOC in advance and schedule outdoor amplified music to conclude by 10:00 PM.',
    },
    {
      id: 'risk-iw-4',
      category: 'Dietary & Accessibility',
      severity: 'High',
      potentialIssue: 'Accidental root-vegetable contamination in dedicated Jain buffet line',
      rootCause: 'High guest volume dining concurrently at combined live counters',
      mitigationTask: 'Establish a physically segregated kitchen and counter marked with clear signage and dedicated servers.',
    },
    {
      id: 'risk-iw-5',
      category: 'Single Point of Failure',
      severity: 'High',
      potentialIssue: 'Power grid tripping from high-wattage sound and lawn lighting equipment',
      rootCause: 'Heritage property standard electrical outlets overloaded by heavy amplification gear',
      mitigationTask: 'Confirm on-site silent diesel generator with automatic changeover switch for continuous audio and stage power.',
    },
  ],
  assessedAt: '2026-06-01T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// 2. Preset 2: Griha Pravesh / Housewarming in Bengaluru with 60 guests (₹1.5 Lakh)
// ---------------------------------------------------------------------------
const BASE_DATE_HOUSEWARMING = '2026-10-15';

const HOUSEWARMING_BASE_TASKS: TimelineTask[] = [
  {
    id: 'task-hw-1',
    phase: 'Now',
    title: 'Consult priest and finalize auspicious pooja samagri list',
    description: 'Verify ritual ingredients, havan kund safety requirements, and milk-boiling vessel.',
    dueDate: '2026-09-15',
    owner: 'Host Family',
    estimatedCostLink: 'Traditional Pooja Samagri & Priests Dakshina',
    completed: true,
    daysBeforeEvent: 30,
  },
  {
    id: 'task-hw-2',
    phase: 'Next 30 days',
    title: 'Confirm satvik catering and brunch buffet menu',
    description: 'Lock in South Indian breakfast items, filter coffee counter, and satvik prasad portions.',
    dueDate: '2026-09-25',
    owner: 'Host',
    estimatedCostLink: 'Satvik Catering & Brunch Buffet',
    completed: false,
    daysBeforeEvent: 20,
  },
  {
    id: 'task-hw-3',
    phase: 'Event week',
    title: 'Source fresh mango leaves, marigolds, and brass urlis for rangoli',
    description: 'Arrange eco-friendly floral entryway arch and natural rice powder rangoli materials.',
    dueDate: '2026-10-08',
    owner: 'Host Family',
    estimatedCostLink: 'Eco-Friendly Floral Decor & Toran',
    completed: false,
    daysBeforeEvent: 7,
  },
  {
    id: 'task-hw-4',
    phase: 'Event day',
    title: 'Ceremonial milk boiling and inaugural blessing pooja',
    description: 'Carry out milk overflow ritual, havan blessings, and welcome neighbors for prasad brunch.',
    dueDate: '2026-10-15',
    owner: 'Host & Family Elders',
    estimatedCostLink: 'Traditional Pooja Samagri & Priests Dakshina',
    completed: false,
    daysBeforeEvent: 0,
  },
];

export const PRESET_HOUSEWARMING_PLAN: EventPlan = {
  id: 'preset-housewarming-bengaluru',
  title: 'Traditional Griha Pravesh & Housewarming',
  eventType: 'Community Event',
  city: 'Bengaluru',
  date: BASE_DATE_HOUSEWARMING,
  guestCount: 60,
  totalBudget: 150000,
  currency: 'INR',
  styleCulture: 'Warm Traditional Pooja followed by contemporary buffet brunch',
  nonNegotiables: 'Auspicious muhurat timing compliance, eco-friendly floral rangoli, satvik prasad',
  budget: {
    categories: [
      {
        id: 'cat-hw-pooja',
        name: 'Traditional Pooja Samagri & Priests Dakshina',
        minEstimate: 20000,
        maxEstimate: 28000,
        targetEstimate: 24000,
        notes: 'Covers Vedic priest honorarium, navagraha homa samagri, and auspicious bronze vessels.',
      },
      {
        id: 'cat-hw-food',
        name: 'Satvik Catering & Brunch Buffet',
        minEstimate: 55000,
        maxEstimate: 75000,
        targetEstimate: 65000,
        notes: 'Traditional South Indian brunch for 60 guests: idli-vada, pongal, kesari bath, and filter coffee.',
      },
      {
        id: 'cat-hw-decor',
        name: 'Eco-Friendly Floral Decor & Toran',
        minEstimate: 16000,
        maxEstimate: 24000,
        targetEstimate: 20000,
        notes: 'Fresh mango leaf torans, marigold door garlands, and entrance floor rangoli.',
      },
      {
        id: 'cat-hw-gifts',
        name: 'Housewarming Return Gifts & Sweets',
        minEstimate: 12000,
        maxEstimate: 18000,
        targetEstimate: 15000,
        notes: 'Jute favor bags with sweet boxes, coconut, and brass diya mementos for all visiting families.',
      },
    ],
    contingencyPercent: 10,
    taxServiceChargePercent: 5,
    statedAssumptions: [
      'Intimate celebration held in newly purchased residential apartment and clubhouse.',
      'Guest count of 60 includes immediate family and residential neighbors.',
      'Pricing estimates reflect current Bengaluru suburban market averages.',
    ],
  },
  timeline: injectGuestMilestones(
    HOUSEWARMING_BASE_TASKS,
    BASE_DATE_HOUSEWARMING,
    'Community Event',
    '2026-08-01'
  ),
  vendors: [
    {
      id: 'ven-hw-1',
      categoryName: 'Vedic Pooja Samagri & Ritual Specialist',
      vendorTypeDescription: 'Experienced ceremonial ritual provider and samagri sourcing',
      status: 'Shortlisted',
      questionsToAsk: [
        'Do you provide the complete havan kund setup with fireproof base insulation?',
        'What specific samagri items must the family prepare versus what you bring?',
        'Can you perform rituals in both Sanskrit and regional vernacular for family members?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Confirm priest arrival 45 minutes prior to auspicious muhurat window.',
    },
    {
      id: 'ven-hw-2',
      categoryName: 'Traditional Satvik Brunch Caterer',
      vendorTypeDescription: 'Catering vendor specialized in pure vegetarian festive brunch with zero onion or garlic',
      status: 'Quoted',
      questionsToAsk: [
        'How many service staff will be present for the buffet setup and hot beverage refilling?',
        'Do you supply biodegradable areca nut leaf plates and steel filter coffee tumblers?',
        'What time will your team arrive for dining area setup and warming tray prep?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Ensure filter coffee counter remains active throughout guest arrivals.',
    },
    {
      id: 'ven-hw-3',
      categoryName: 'Eco-Friendly Floral & Toran Stylist',
      vendorTypeDescription: 'Artisan floral designer using organic marigolds, mango leaves, and clay urlis',
      status: 'Shortlisted',
      questionsToAsk: [
        'Do you use 100% natural biodegradable threads for hanging torans without tape damage to doors?',
        'What is your setup timeline on the morning of the pooja?',
        'Can you supply water urlis with floating rose petals for the living room walkway?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Request setup completion 1 hour before priest arrival.',
    },
  ],
  ideas: {
    themes: [
      'Mangala Gauri: Traditional brass urlis, marigold strings, and auspicious vermillion doorway accents',
      'Verdant Harmony: Eco-friendly plant sapling return favors in terracotta planters',
    ],
    dietaryNotes: [
      'Strictly pure vegetarian satvik preparation without onion or garlic for all pooja offerings.',
      'Warm badam milk and fresh tender coconut water welcome drinks.',
    ],
    activities: [
      'Inaugural ceremonial milk-boiling ceremony observed together by all attendees.',
      'Interactive rangoli completion by visiting neighborhood children and family.',
    ],
    decor: [
      'Fresh mango leaf and marigold toran over the main apartment threshold.',
      'Floor rangoli composed of organic crushed rice powder and naturally dried flower petals.',
    ],
  },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  version: 1,
  isSavedExample: true,
  generationSource: 'primary',
};

export const PRESET_HOUSEWARMING_RISKS: RiskRegister = {
  risks: [
    {
      id: 'risk-hw-1',
      category: 'Weather & Season',
      severity: 'Medium',
      potentialIssue: 'Apartment balcony breeze extinguishing havan fire or blowing smoke into living area',
      rootCause: 'High-rise apartment airflow through open balcony doors during morning homa',
      mitigationTask: 'Set up temporary draft barrier screens and keep apartment smoke detectors covered during ritual.',
    },
    {
      id: 'risk-hw-2',
      category: 'Dietary & Accessibility',
      severity: 'Medium',
      potentialIssue: 'Limited seating space in apartment living room for elderly family members',
      rootCause: 'Living room cleared of furniture to accommodate pooja matting',
      mitigationTask: 'Arrange a designated row of comfortable cushioned chairs near the ritual area for senior attendees.',
    },
    {
      id: 'risk-hw-3',
      category: 'Single Point of Failure',
      severity: 'High',
      potentialIssue: 'Elevator congestion during concurrent arrival of 60 guests',
      rootCause: 'Residential society with dual elevators servicing multiple floors during morning peak',
      mitigationTask: 'Stagger guest arrival windows across 45 minutes and alert building security regarding visitor parking.',
    },
  ],
  assessedAt: '2026-08-01T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// 3. Preset 3: Diwali / Festival Gathering in Mumbai with 120 guests (₹3 Lakh)
// ---------------------------------------------------------------------------
const BASE_DATE_DIWALI = '2026-11-01';

const DIWALI_BASE_TASKS: TimelineTask[] = [
  {
    id: 'task-dg-1',
    phase: 'Now',
    title: 'Obtain residential society committee clearance and timing permit',
    description: 'Formalize event lawn hours, waste segregation protocols, and sound clearance.',
    dueDate: '2026-09-27',
    owner: 'Society Secretary',
    estimatedCostLink: 'Society Lawn Canopy & Acoustic Sound',
    completed: true,
    daysBeforeEvent: 35,
  },
  {
    id: 'task-dg-2',
    phase: 'Next 30 days',
    title: 'Procure bulk handcrafted earthen diyas from local artisan cooperative',
    description: 'Support local potters by securing 800 terracotta diyas and organic mustard oil.',
    dueDate: '2026-10-07',
    owner: 'Decor Subcommittee',
    estimatedCostLink: 'Handmade Clay Diyas, Lights & Marigold Decor',
    completed: false,
    daysBeforeEvent: 25,
  },
  {
    id: 'task-dg-3',
    phase: 'Event week',
    title: 'Conduct electrical load check and position fire safety buckets',
    description: 'Verify safe wiring conduits over walkways and place dry sand/water safety buckets.',
    dueDate: '2026-10-27',
    owner: 'Safety Lead',
    estimatedCostLink: 'Society Lawn Canopy & Acoustic Sound',
    completed: false,
    daysBeforeEvent: 5,
  },
  {
    id: 'task-dg-4',
    phase: 'Event day',
    title: 'Society lawn diya illumination and welcome sweet distribution',
    description: 'Guide community lamp lighting with senior residents and manage live food stalls.',
    dueDate: '2026-11-01',
    owner: 'Youth Volunteer Lead',
    estimatedCostLink: 'Live Festive Food Kiosks & Mithai Stalls',
    completed: false,
    daysBeforeEvent: 0,
  },
];

export const PRESET_DIWALI_PLAN: EventPlan = {
  id: 'preset-diwali-mumbai',
  title: 'Diwali Festival of Lights Gathering',
  eventType: 'Community Event',
  city: 'Mumbai',
  date: BASE_DATE_DIWALI,
  guestCount: 120,
  totalBudget: 300000,
  currency: 'INR',
  styleCulture: 'Festive Diyas & Marigold theme with live acoustic music and mithai stalls',
  nonNegotiables: 'Zero firecrackers, handcrafted sweet boxes for all guests, children craft station',
  budget: {
    categories: [
      {
        id: 'cat-dg-tent',
        name: 'Society Lawn Canopy & Acoustic Sound',
        minEstimate: 70000,
        maxEstimate: 95000,
        targetEstimate: 82000,
        notes: 'Covers weather-resistant shamiyana canopy, cultural stage, and low-decibel acoustic audio.',
      },
      {
        id: 'cat-dg-food',
        name: 'Live Festive Food Kiosks & Mithai Stalls',
        minEstimate: 95000,
        maxEstimate: 130000,
        targetEstimate: 112000,
        notes: 'Live snack kiosks (chaat, pav bhaji, hot jalebis) and festive mithai boxes for all 120 families.',
      },
      {
        id: 'cat-dg-decor',
        name: 'Handmade Clay Diyas, Lights & Marigold Decor',
        minEstimate: 30000,
        maxEstimate: 45000,
        targetEstimate: 38000,
        notes: '800 clay diyas, brass lanterns, fabric drapes, and natural flower petal carpets.',
      },
      {
        id: 'cat-dg-kids',
        name: 'Children Craft Workshop & Resident Mementos',
        minEstimate: 18000,
        maxEstimate: 26000,
        targetEstimate: 22000,
        notes: 'Eco-pottery masterclass for youth and commemorative mementos for senior residents.',
      },
    ],
    contingencyPercent: 10,
    taxServiceChargePercent: 5,
    statedAssumptions: [
      'Society common amenities fund covers water and baseline electricity consumption.',
      'Resident youth committee volunteers assist in queue coordination and welcoming.',
      'Pricing targets represent vetted local vendor estimates for suburban Mumbai.',
    ],
  },
  timeline: injectGuestMilestones(
    DIWALI_BASE_TASKS,
    BASE_DATE_DIWALI,
    'Community Event',
    '2026-08-15'
  ),
  vendors: [
    {
      id: 'ven-dg-1',
      categoryName: 'Community Stage & Acoustic Audio Hire',
      vendorTypeDescription: 'Local provider for fire-retardant shamiyana, low-decibel audio, and cable ramps',
      status: 'Quoted',
      questionsToAsk: [
        'Are your canopy fabrics certified flame-retardant?',
        'Do you supply rubber cable ramps over walkways to prevent tripping hazards for seniors?',
        'What is your staff breakdown schedule post-event to avoid midnight noise?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Request safety inspection report and electrical load documentation.',
    },
    {
      id: 'ven-dg-2',
      categoryName: 'Live Festive Chaat & Mithai Caterer',
      vendorTypeDescription: 'Multi-stall festive food vendor with biodegradable areca leaf serviceware',
      status: 'Shortlisted',
      questionsToAsk: [
        'Can your live kiosks comfortably serve 120 guests across a 90-minute evening rush?',
        'Do you provide 100% biodegradable areca nut leaf plates and wooden forks?',
        'What safety containment is utilized around high-heat frying burners?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Confirm water refill dispenser integration next to dining stalls.',
    },
    {
      id: 'ven-dg-3',
      categoryName: 'Eco-Artisan Diya & Rangoli Cooperative',
      vendorTypeDescription: 'Local potter group providing terracotta diyas and natural rice powder colors',
      status: 'Shortlisted',
      questionsToAsk: [
        'Are the earthen lamps unglazed and safely soaked in water prior to delivery?',
        'Do you supply cotton wicks and cold-pressed mustard oil in bulk containers?',
        'What is your delivery timing to the society clubhouse on celebration morning?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Coordinate placement of diyas along stone walkways away from dry foliage.',
    },
  ],
  ideas: {
    themes: [
      'Anandotsav: Warm earthen lamps, marigold entrance arch, and inter-floor rangoli contest',
      'Zero-Waste Festival: Digital community brochure, compostable plates, and seed-paper greeting cards',
    ],
    dietaryNotes: [
      'Multi-regional food kiosks: Mumbai chaat, South Indian mini uttapams, and live hot jalebis.',
      'Sugar-free sweet alternatives for diabetic and senior residents.',
    ],
    activities: [
      'Inter-generational diya painting competition for kids and grandparents.',
      'Acoustic flute recital followed by traditional group dandiya raas.',
    ],
    decor: [
      'Geometric floor rangoli created with natural dyed rice powder and marigold petals.',
      'Hanging brass urlis filled with water and floating night-blooming jasmine.',
    ],
  },
  createdAt: '2026-08-15T10:00:00.000Z',
  updatedAt: '2026-08-15T10:00:00.000Z',
  version: 1,
  isSavedExample: true,
  generationSource: 'primary',
};

export const PRESET_DIWALI_RISKS: RiskRegister = {
  risks: [
    {
      id: 'risk-dg-1',
      category: 'Permits & Legal',
      severity: 'High',
      potentialIssue: 'Society residential noise restriction violation after 10 PM',
      rootCause: 'Outdoor sound equipment playing past prescribed residential society quiet hours',
      mitigationTask: 'Set calibrated automatic volume limiters and transition to acoustic music by 9:30 PM.',
    },
    {
      id: 'risk-dg-2',
      category: 'Weather & Season',
      severity: 'Medium',
      potentialIssue: 'Coastal Mumbai evening humidity and breeze extinguishing open diyas',
      rootCause: 'Coastal wind blowing across open residential complex lawn',
      mitigationTask: 'Place open flame diyas inside perforated glass lanterns and deep terracotta saucers.',
    },
    {
      id: 'risk-dg-3',
      category: 'Dietary & Accessibility',
      severity: 'Medium',
      potentialIssue: 'Special dietary confusion for senior residents managing diabetes',
      rootCause: 'Dessert stalls offering high-sugar festive mithai without clear labelling',
      mitigationTask: 'Designate a clearly marked sugar-free and vegan dessert counter with nutritional placards.',
    },
  ],
  assessedAt: '2026-08-15T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// 4. Preset 4: College Annual Fest in Delhi with 800 guests (₹6 Lakh)
// ---------------------------------------------------------------------------
const BASE_DATE_COLLEGE_FEST = '2026-11-20';

const COLLEGE_FEST_BASE_TASKS: TimelineTask[] = [
  {
    id: 'task-cf-1',
    phase: 'Now',
    title: 'Campus administrative clearances and police sound NOC approval',
    description: 'Secure dean approval, campus police timing permit, and fire safety department inspection.',
    dueDate: '2026-10-06',
    owner: 'Student Welfare Lead',
    estimatedCostLink: 'Concert Stage, Truss & Line-Array Sound',
    completed: true,
    daysBeforeEvent: 45,
  },
  {
    id: 'task-cf-2',
    phase: 'Next 30 days',
    title: 'Sign sound, lighting, and heavy trussing contract',
    description: 'Lock in line-array acoustic system, digital mixing console, and heavy stage rigging.',
    dueDate: '2026-10-21',
    owner: 'Technical Head',
    estimatedCostLink: 'Concert Stage, Truss & Line-Array Sound',
    completed: false,
    daysBeforeEvent: 30,
  },
  {
    id: 'task-cf-3',
    phase: 'Event week',
    title: 'Inspect crowd barricades, emergency corridor, and ambulance stationing',
    description: 'Verify crowd separation barriers, dedicated medical evacuation pathway, and first-aid crew.',
    dueDate: '2026-11-13',
    owner: 'Security & Safety Lead',
    estimatedCostLink: 'Campus Security, Crowd Barricades & Medical Standby',
    completed: false,
    daysBeforeEvent: 7,
  },
  {
    id: 'task-cf-4',
    phase: 'Event day',
    title: 'Morning soundcheck and indie band competition commencement',
    description: 'Oversee stage soundcheck, wristband gate verification, and headliner artist hospitality.',
    dueDate: '2026-11-20',
    owner: 'Fest President',
    estimatedCostLink: 'Concert Stage, Truss & Line-Array Sound',
    completed: false,
    daysBeforeEvent: 0,
  },
];

export const PRESET_COLLEGE_FEST_PLAN: EventPlan = {
  id: 'preset-college-fest-delhi',
  title: 'Campus Fusion Cultural Fest',
  eventType: 'Community Event',
  city: 'Delhi',
  date: BASE_DATE_COLLEGE_FEST,
  guestCount: 800,
  totalBudget: 600000,
  currency: 'INR',
  styleCulture: 'Youth indie-rock fusion, food truck park, and battle of the bands',
  nonNegotiables: 'Campus security approval & permits, strict 10 PM decibel cutoff, ambulance on standby',
  budget: {
    categories: [
      {
        id: 'cat-cf-stage',
        name: 'Concert Stage, Truss & Line-Array Sound',
        minEstimate: 180000,
        maxEstimate: 240000,
        targetEstimate: 210000,
        notes: 'Covers 40x30ft elevated concert stage, aluminum truss, line-array speakers, and stage monitor wedges.',
      },
      {
        id: 'cat-cf-security',
        name: 'Campus Security, Crowd Barricades & Medical Standby',
        minEstimate: 70000,
        maxEstimate: 100000,
        targetEstimate: 85000,
        notes: 'Mojo barricades, licensed private security bouncers, on-site ambulance, and paramedic crew.',
      },
      {
        id: 'cat-cf-food',
        name: 'Food Truck Courtyard Infrastructure & Power',
        minEstimate: 85000,
        maxEstimate: 115000,
        targetEstimate: 100000,
        notes: 'Sanitation stations, 3-phase commercial electrical supply for food trucks, and waste bins.',
      },
      {
        id: 'cat-cf-artists',
        name: 'Artist Hospitality & Sound Engineering',
        minEstimate: 65000,
        maxEstimate: 95000,
        targetEstimate: 80000,
        notes: 'Green room hospitality, sound engineer mixing fee, and local transport for guest performers.',
      },
      {
        id: 'cat-cf-promo',
        name: 'Band Competition Trophies & Campus Promo',
        minEstimate: 25000,
        maxEstimate: 35000,
        targetEstimate: 30000,
        notes: 'Custom metal trophies, printed campus wristbands, and digital entry verification QR scanners.',
      },
    ],
    contingencyPercent: 10,
    taxServiceChargePercent: 5,
    statedAssumptions: [
      'Campus university grounds provided at zero venue rental to student council.',
      'Guest count of 800 regulated through digital student ID wristbands.',
      'Pricing estimates reflect Delhi student festival production market standards.',
    ],
  },
  timeline: injectGuestMilestones(
    COLLEGE_FEST_BASE_TASKS,
    BASE_DATE_COLLEGE_FEST,
    'Community Event',
    '2026-08-20'
  ),
  vendors: [
    {
      id: 'ven-cf-1',
      categoryName: 'Concert Stage, Truss & Line-Array Sound Vendor',
      vendorTypeDescription: 'Professional concert production team with calibrated decibel limiters',
      status: 'Quoted',
      questionsToAsk: [
        'Does your line-array sound system provide uniform acoustic coverage for 800 attendees without distortion?',
        'Do you provide an independent certified sound engineer for artist soundchecks?',
        'What is your load-in and electrical testing timeline on festival morning?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Confirm structural stability certification for outdoor lighting truss.',
    },
    {
      id: 'ven-cf-2',
      categoryName: 'Campus Event Security & Crowd Management Agency',
      vendorTypeDescription: 'Licensed private security firm experienced in university crowd flow',
      status: 'Shortlisted',
      questionsToAsk: [
        'How many licensed male and female security guards are deployed across entrance gates and barricades?',
        'What is your crowd de-escalation protocol in the event of stage rush?',
        'Do your team members carry two-way walkie-talkies operating on dedicated frequencies?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Coordinate briefing meeting with college proctorial board.',
    },
    {
      id: 'ven-cf-3',
      categoryName: 'Mobile Food Truck Park Coordinator',
      vendorTypeDescription: 'Manager for diverse campus food trucks with certified commercial food safety',
      status: 'Shortlisted',
      questionsToAsk: [
        'Do all participating food trucks possess valid commercial food hygiene certificates?',
        'Do trucks bring their own grease collection trays and fire extinguishers?',
        'What is the electricity wattage requirement per vehicle?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Designate food truck zone away from emergency medical exit route.',
    },
  ],
  ideas: {
    themes: [
      'Indie Velocity: Industrial stage trussing, neon wire typography, and urban food truck alley',
      'Acoustic Sunset: Chill-out acoustic lawn zone with pallet seating and fairy lights',
    ],
    dietaryNotes: [
      'Budget-friendly campus food trucks: gourmet burgers, momos, kathi rolls, and craft sodas.',
      'Hydration water refill stations with eco-friendly paper cones.',
    ],
    activities: [
      'Battle of the Bands featuring collegiate original songwriting.',
      'Live graffiti art mural where students collaborate throughout the day.',
    ],
    decor: [
      'Overhead festoon lighting string lines across the open quadrangle.',
      'Upcycled oil drum trash bins painted by the college fine arts society.',
    ],
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
  version: 1,
  isSavedExample: true,
  generationSource: 'primary',
};

export const PRESET_COLLEGE_FEST_RISKS: RiskRegister = {
  risks: [
    {
      id: 'risk-cf-1',
      category: 'Permits & Legal',
      severity: 'Critical',
      potentialIssue: 'Delhi police 10 PM sharp amplified sound curfew shutdown',
      rootCause: 'City-wide anti-noise pollution laws strictly enforced in Delhi university zones',
      mitigationTask: 'Structure headline performance to conclude by 9:45 PM and incorporate audio automatic cutoffs.',
    },
    {
      id: 'risk-cf-2',
      category: 'Single Point of Failure',
      severity: 'High',
      potentialIssue: 'Main stage electrical power overload during headliner band performance',
      rootCause: 'Concurrent draw of high-wattage concert lighting and heavy bass subwoofers',
      mitigationTask: 'Provide a dedicated 125 kVA silent diesel generator solely for audio equipment.',
    },
    {
      id: 'risk-cf-3',
      category: 'Dependencies',
      severity: 'High',
      potentialIssue: 'Student gate crush during peak artist entry',
      rootCause: 'Uncontrolled rush of non-registered attendees at campus entrance gates',
      mitigationTask: 'Implement double-tier barcode verification and physical zigzag queue control barricades.',
    },
    {
      id: 'risk-cf-4',
      category: 'Weather & Season',
      severity: 'Medium',
      potentialIssue: 'Late-autumn Delhi smog or sudden temperature drop impacting crowd comfort',
      rootCause: 'November seasonal air quality variation in Delhi NCR',
      mitigationTask: 'Provide hot tea stalls and indoor auditorium standby space if outdoor air quality deteriorates.',
    },
  ],
  assessedAt: '2026-08-20T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// 5. Preset 5: Nikah & Walima in Hyderabad with 250 guests (₹12 Lakh)
// ---------------------------------------------------------------------------
const BASE_DATE_NIKAH_WALIMA = '2026-11-20';

const NIKAH_WALIMA_BASE_TASKS: TimelineTask[] = [
  {
    id: 'task-nw-1',
    phase: 'Now',
    title: 'Shortlist & inspect Hyderabad function halls with partition capability',
    description: 'Verify spacious hall layout with option for separate seating partition, stage sightlines, and guest parking capacity.',
    dueDate: '2026-08-05',
    owner: 'Family Elders & Host',
    estimatedCostLink: 'Heritage Function Hall & Banquet (Partition-Ready)',
    completed: true,
    daysBeforeEvent: 107,
  },
  {
    id: 'task-nw-2',
    phase: 'Now',
    title: 'Conduct Halal Mughlai catering tasting & finalize Dawat menu',
    description: 'Verify certified halal mutton procurement, Dum Biryani spice balance, Sheermal softness, and traditional Double ka Meetha.',
    dueDate: '2026-09-02',
    owner: 'Food Committee Lead',
    estimatedCostLink: 'Authentic Hyderabadi Halal Catering (Dum Biryani, Mirchi ka Salan, Sheermal)',
    completed: false,
    daysBeforeEvent: 79,
  },
  {
    id: 'task-nw-3',
    phase: 'Next 30 days',
    title: 'Coordinate with Qazi & verify Nikahnama registration documentation',
    description: 'Review official marriage registration requirements, Nikahnama details, witnesses identification, and ritual timing.',
    dueDate: '2026-10-10',
    owner: 'Host & Family Elder',
    estimatedCostLink: 'Logistics, Ittar Welcome & Ceremonial Documents',
    completed: false,
    daysBeforeEvent: 41,
  },
  {
    id: 'task-nw-4',
    phase: 'Next 30 days',
    title: 'Confirm stage decor, lighting, and separate lounge partitioning setup',
    description: 'Finalize floral archway, low diwan seating with bolsters, mogra hangings, and acoustic setup for speeches.',
    dueDate: '2026-10-25',
    owner: 'Couple & Decor Team',
    estimatedCostLink: 'Stage Backdrop, Floral Walkway & Elegant Seating Decor',
    completed: false,
    daysBeforeEvent: 26,
  },
  {
    id: 'task-nw-5',
    phase: 'Event week',
    title: 'Final walkthrough of banquet partitions, prayer area, and ittar welcome desk',
    description: 'Ensure clean ablution/prayer facilities, clear guest reception flow, and welcome trays with natural ittar and rosewater.',
    dueDate: '2026-11-16',
    owner: 'Lead Coordinator',
    estimatedCostLink: 'Heritage Function Hall & Banquet (Partition-Ready)',
    completed: false,
    daysBeforeEvent: 4,
  },
  {
    id: 'task-nw-6',
    phase: 'Event day',
    title: 'Morning coordination of Nikahnama documentation desk & stage readiness',
    description: 'Ensure Qazi table, signed certificates, pens, dry fruit/misri welcome boxes, and microphone sound check are ready.',
    dueDate: '2026-11-20',
    owner: 'Head Coordinator',
    estimatedCostLink: 'Heritage Function Hall & Banquet (Partition-Ready)',
    completed: false,
    daysBeforeEvent: 0,
  },
];

export const PRESET_NIKAH_WALIMA_PLAN: EventPlan = {
  id: 'preset-nikah-walima-hyderabad',
  title: 'Hyderabadi Nikah & Walima Celebration',
  eventType: 'Wedding',
  city: 'Hyderabad',
  date: BASE_DATE_NIKAH_WALIMA,
  guestCount: 250,
  totalBudget: 1200000,
  currency: 'INR',
  styleCulture: 'Traditional Hyderabadi Nikah followed by celebratory Walima reception',
  nonNegotiables: 'Certified halal Mughlai feast, optional partition for separate family seating, ceremony timing set by family & religious guidance',
  budget: {
    categories: [
      {
        id: 'cat-nw-venue',
        name: 'Heritage Function Hall & Banquet (Partition-Ready)',
        minEstimate: 240000,
        maxEstimate: 300000,
        targetEstimate: 270000,
        notes: 'Covers main hall rental with flexible decorative partition panels, stage, and bridal suites.',
      },
      {
        id: 'cat-nw-catering',
        name: 'Authentic Hyderabadi Halal Catering (Dum Biryani, Mirchi ka Salan, Sheermal)',
        minEstimate: 360000,
        maxEstimate: 440000,
        targetEstimate: 400000,
        notes: 'Per-plate allocation for 250 guests including Dum Biryani, starters, Mirchi ka Salan, and desserts with certified halal procurement.',
      },
      {
        id: 'cat-nw-decor',
        name: 'Stage Backdrop, Floral Walkway & Elegant Seating Decor',
        minEstimate: 120000,
        maxEstimate: 160000,
        targetEstimate: 140000,
        notes: 'Includes floral stage backdrop, entrance archway, fragrant mogra/jasmine strings, and banquet table linen.',
      },
      {
        id: 'cat-nw-photo',
        name: 'Traditional & Candid Photography & Videography',
        minEstimate: 75000,
        maxEstimate: 105000,
        targetEstimate: 90000,
        notes: 'Comprehensive coverage of Nikah solemnization, family portraits, and Walima banquet with option for female photographers.',
      },
      {
        id: 'cat-nw-attire',
        name: 'Bridal Khada Dupatta & Groom Sherwani Styling',
        minEstimate: 60000,
        maxEstimate: 80000,
        targetEstimate: 70000,
        notes: 'Traditional zardozi-embroidered Hyderabadi Khada Dupatta ensemble and groom sherwani.',
      },
      {
        id: 'cat-nw-logistics',
        name: 'Logistics, Ittar Welcome & Ceremonial Documents',
        minEstimate: 40000,
        maxEstimate: 60000,
        targetEstimate: 50000,
        notes: 'Traditional ittar and rosewater guest welcome, Nikahnama calligraphy, and personalized guest sweet/dry-fruit boxes.',
      },
    ],
    contingencyPercent: 8,
    taxServiceChargePercent: 5,
    statedAssumptions: [
      'Estimates reflect mid-range economical Indian market benchmarks as planning estimates, not guaranteed quotes.',
      'Guest count of 250 is treated as upper ceiling for per-plate halal catering calculations.',
      'Ceremony and reception schedules are aligned with family preferences and religious guidance.',
      'All vendor quotes must be verified independently before executing agreements.',
    ],
  },
  timeline: injectGuestMilestones(
    NIKAH_WALIMA_BASE_TASKS,
    BASE_DATE_NIKAH_WALIMA,
    'Wedding',
    '2026-06-01'
  ),
  vendors: [
    {
      id: 'ven-nw-1',
      categoryName: 'Function Hall & Banquet Lawn',
      vendorTypeDescription: 'Spacious celebration hall with partition infrastructure and bridal suites',
      status: 'Quoted',
      questionsToAsk: [
        'Can the hall accommodate an optional central partition for separate family seating if desired?',
        'What are the generator power backup and air conditioning capabilities during peak evening hours?',
        'Is dedicated parking and valet assistance provided for 100+ vehicles?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Confirm acoustic isolation between sections if partition is deployed.',
    },
    {
      id: 'ven-nw-2',
      categoryName: 'Certified Halal Specialty Caterer',
      vendorTypeDescription: 'Catering house renowned for authentic Hyderabadi Dum Biryani and traditional dawat menus',
      status: 'Shortlisted',
      questionsToAsk: [
        'Can you provide documentation confirming 100% certified halal meat procurement?',
        'What is your live food service protocol and server-to-guest ratio for 250 guests?',
        'Do you provide copper deg presentation and authentic clay-oven tandoor setups?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Schedule tasting session for Dum Biryani and sweet dishes with family elders.',
    },
    {
      id: 'ven-nw-3',
      categoryName: 'Stage & Floral Decorator',
      vendorTypeDescription: 'Decorator experienced with royal Mughal arches, fresh florals, and cultural backdrops',
      status: 'Contacted',
      questionsToAsk: [
        'Do you offer traditional Hyderabadi stage setups featuring zardozi drapes, chandeliers, and fresh mogra?',
        'Can you design matching decorative partitions that seamlessly integrate with the banquet theme?',
        'What is the teardown schedule and cleanup timeline post-event?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Check past portfolio photographs for similar-sized Hyderabad venues.',
    },
    {
      id: 'ven-nw-4',
      categoryName: 'Candid Documentary Photographer',
      vendorTypeDescription: 'Professional wedding photography and cinematography team with cultural expertise',
      status: 'Shortlisted',
      questionsToAsk: [
        'Can you provide female photographers and videographers for designated ladies seating areas if requested?',
        'What is the delivery timeline for edited ceremony highlights and family portrait albums?',
        'Do you cover both Nikah solemnization and evening Walima banquet reception?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Clarify deliverables: digital archive, teaser video, and leather-bound album.',
    },
  ],
  ideas: {
    themes: [
      'Nizami Heritage & Modern Elegance: Soft ivory, gold lattice jali backdrops, and emerald accents',
      'Royal Mogra Court: Fragrant white florals, warm candlelight, and velvet bolster lounge seating',
    ],
    dietaryNotes: [
      'Authentic Hyderabadi Dum Biryani, Mirchi ka Salan, Baghara Baingan, Mutton Shikampur Kebab, and Sheermal.',
      'Dessert table featuring authentic Double ka Meetha, Qubani ka Meetha with clotted cream, and dry-fruit Halwa.',
      'Strict certified halal meat procurement and dedicated vegetarian counter.',
    ],
    activities: [
      'Warm traditional welcome with fragrant ittar daan and rosewater sprinkle upon guest arrival.',
      'Solemn Nikahnama signing ceremony witnessed by family elders.',
      'Arsi Mushaf ceremony where bride and groom share their first mirror reflection as a married couple.',
      'Walima dawat banquet with seated family dining and congratulatory blessings.',
    ],
    decor: [
      'Graceful scalloped arch backdrop with warm ambient fairy lighting and brass lanterns.',
      'Cascading strands of fragrant mogra (jasmine) and rich red roses along the walkway.',
      'Comfortable diwan seating with velvet bolsters in lounge corners for elders.',
    ],
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
  version: 1,
  isSavedExample: true,
  generationSource: 'primary',
};

export const PRESET_NIKAH_WALIMA_RISKS: RiskRegister = {
  risks: [
    {
      id: 'risk-nw-1',
      category: 'Dietary & Accessibility',
      severity: 'High',
      potentialIssue: 'Halal meat supply chain verification and fresh preparation timing',
      rootCause: 'High volume demands during peak wedding dates causing supplier delays',
      mitigationTask: 'Partner only with certified caterers providing advance procurement receipts and designated prep shifts.',
    },
    {
      id: 'risk-nw-2',
      category: 'Single Point of Failure',
      severity: 'Medium',
      potentialIssue: 'Separate seating partition layout restricting banquet buffet flow or stage sightlines',
      rootCause: 'Fixed structural columns or narrow banquet corridor dimensions',
      mitigationTask: 'Review venue layout map in advance and ensure dual buffet stations for smooth guest access on both sides.',
    },
    {
      id: 'risk-nw-3',
      category: 'Weather & Season',
      severity: 'Medium',
      potentialIssue: 'Parking bottlenecks and approach road congestion near historic Hyderabad function hall clusters',
      rootCause: 'Narrow approach lanes and simultaneous events at neighboring banquet halls',
      mitigationTask: 'Contract professional valet service with dedicated off-site overflow parking lot and traffic wardens.',
    },
    {
      id: 'risk-nw-4',
      category: 'Dependencies',
      severity: 'Low',
      potentialIssue: 'Qazi documentation delay or witness scheduling conflict',
      rootCause: 'Last-minute paperwork verification on the wedding day',
      mitigationTask: 'Complete preliminary documentation and witness verification with the Qazi office 3 days prior.',
    },
  ],
  assessedAt: '2026-08-20T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// 6. Preset 6: Church Wedding & Reception in Kochi with 200 guests (₹10 Lakh)
// ---------------------------------------------------------------------------
const BASE_DATE_CHURCH_WEDDING = '2026-11-22';

const CHURCH_WEDDING_BASE_TASKS: TimelineTask[] = [
  {
    id: 'task-cw-1',
    phase: 'Now',
    title: 'Reserve church date & initiate parish priest clearance',
    description: 'Confirm church availability, meet parish priest, submit pre-marital documentation, and schedule banns publication.',
    dueDate: '2026-08-08',
    owner: 'Couple & Parish Coordinator',
    estimatedCostLink: 'Church Ceremony Offering & Reception Banquet Lawn',
    completed: true,
    daysBeforeEvent: 106,
  },
  {
    id: 'task-cw-2',
    phase: 'Now',
    title: 'Book reception banquet lawn & confirm evening sound cutoff rules',
    description: 'Inspect outdoor lawn, air-conditioned banquet hall, dance floor space, and municipal acoustic curfew policies.',
    dueDate: '2026-08-28',
    owner: 'Family Lead',
    estimatedCostLink: 'Church Ceremony Offering & Reception Banquet Lawn',
    completed: false,
    daysBeforeEvent: 86,
  },
  {
    id: 'task-cw-3',
    phase: 'Next 30 days',
    title: 'Coordinate nuptial liturgy booklet, choir hymns, and church lector list',
    description: 'Select readings, hymns, prayer intentions, and print ceremonial order of service booklets.',
    dueDate: '2026-10-12',
    owner: 'Choir Lead & Couple',
    estimatedCostLink: 'Tiered Wedding Cake, Favors & Liturgy Booklets',
    completed: false,
    daysBeforeEvent: 41,
  },
  {
    id: 'task-cw-4',
    phase: 'Next 30 days',
    title: 'Tasting session for Syrian Christian dawat & multi-tier wedding cake',
    description: 'Sample Appam and stew, Kerala roast dishes, coastal fish delicacies, and tiered wedding fruitcake with marzipan.',
    dueDate: '2026-10-26',
    owner: 'Food Committee',
    estimatedCostLink: 'Traditional Syrian Christian & Coastal Continental Banquet',
    completed: false,
    daysBeforeEvent: 27,
  },
  {
    id: 'task-cw-5',
    phase: 'Event week',
    title: 'Conduct church wedding rehearsal with officiant, bridal party & lectors',
    description: 'Full walkthrough of processional entry, vow exchanges, ring blessing, and recessional order.',
    dueDate: '2026-11-19',
    owner: 'Bridal Party & Officiant',
    estimatedCostLink: 'Church Ceremony Offering & Reception Banquet Lawn',
    completed: false,
    daysBeforeEvent: 3,
  },
  {
    id: 'task-cw-6',
    phase: 'Event day',
    title: 'Morning coordinator check of church pew posies, liturgy booklets & reception setup',
    description: 'Verify floral pew ties, altar candles, sound check with choir, and reception cake table readiness.',
    dueDate: '2026-11-22',
    owner: 'Event Coordinator',
    estimatedCostLink: 'Church Ceremony Offering & Reception Banquet Lawn',
    completed: false,
    daysBeforeEvent: 0,
  },
];

export const PRESET_CHURCH_WEDDING_PLAN: EventPlan = {
  id: 'preset-church-wedding-kochi',
  title: 'Classic Kerala Church Wedding & Reception',
  eventType: 'Wedding',
  city: 'Kochi',
  date: BASE_DATE_CHURCH_WEDDING,
  guestCount: 200,
  totalBudget: 1000000,
  currency: 'INR',
  styleCulture: 'Solemn Christian Nuptial Mass & Evening Dinner Reception',
  nonNegotiables: 'Church and officiant coordination with rehearsal, reception venue with dance floor, ceremony timing confirmed with church',
  budget: {
    categories: [
      {
        id: 'cat-cw-venue',
        name: 'Church Ceremony Offering & Reception Banquet Lawn',
        minEstimate: 200000,
        maxEstimate: 260000,
        targetEstimate: 230000,
        notes: 'Covers parish church offering, air-conditioned reception banquet hall with outdoor lawn, and green rooms.',
      },
      {
        id: 'cat-cw-catering',
        name: 'Traditional Syrian Christian & Coastal Continental Banquet',
        minEstimate: 310000,
        maxEstimate: 390000,
        targetEstimate: 350000,
        notes: 'Covers buffet service for 200 guests with Appam, stew, roast meats, coastal delicacies, and vegetarian spread.',
      },
      {
        id: 'cat-cw-decor',
        name: 'Church Floral Pews, Entrance Arch & Reception Stage',
        minEstimate: 100000,
        maxEstimate: 140000,
        targetEstimate: 120000,
        notes: 'White lilies, baby breath pew posies, fairy light canopy, and elegant stage backdrop.',
      },
      {
        id: 'cat-cw-photo',
        name: 'Ceremony Documentary, Choir & Reception Cinematography',
        minEstimate: 65000,
        maxEstimate: 95000,
        targetEstimate: 80000,
        notes: 'Discreet non-intrusive church sanctuary coverage, family portraits, and evening reception cinema.',
      },
      {
        id: 'cat-cw-music',
        name: 'Live Acoustic Band & Reception Sound Setup',
        minEstimate: 40000,
        maxEstimate: 60000,
        targetEstimate: 50000,
        notes: 'Live acoustic ensemble/band for reception entrance, first dance, and sound amplification system.',
      },
      {
        id: 'cat-cw-logistics',
        name: 'Tiered Wedding Cake, Favors & Liturgy Booklets',
        minEstimate: 35000,
        maxEstimate: 55000,
        targetEstimate: 45000,
        notes: 'Three-tiered rich plum cake with marzipan, printed order of service booklets, and guest favor boxes.',
      },
    ],
    contingencyPercent: 8,
    taxServiceChargePercent: 5,
    statedAssumptions: [
      'Estimates reflect mid-range economical Indian market benchmarks as planning estimates, not guaranteed quotes.',
      'Guest count of 200 is treated as upper ceiling for per-plate catering calculations.',
      'Church ceremony timings and liturgy are confirmed directly with the parish priest.',
      'All vendor quotes must be verified independently before executing agreements.',
    ],
  },
  timeline: injectGuestMilestones(
    CHURCH_WEDDING_BASE_TASKS,
    BASE_DATE_CHURCH_WEDDING,
    'Wedding',
    '2026-06-01'
  ),
  vendors: [
    {
      id: 'ven-cw-1',
      categoryName: 'Church & Reception Banquet Hall',
      vendorTypeDescription: 'Parish church coordination and celebration venue with banquet hall and lawn',
      status: 'Quoted',
      questionsToAsk: [
        'What are the church guidelines regarding floral attachments to pews and tossing rice/petals outside?',
        'What is the evening sound and music curfew for the reception banquet lawn?',
        'Is bridal suite available for dress changing before the reception?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Confirm parish donation, security deposit, and cleaning fees.',
    },
    {
      id: 'ven-cw-2',
      categoryName: 'Kerala Christian & Fusion Caterer',
      vendorTypeDescription: 'Catering service specializing in traditional Syrian Christian dawat and continental options',
      status: 'Shortlisted',
      questionsToAsk: [
        'Can you provide live Appam stations alongside traditional slow-cooked beef/mutton and fish molee?',
        'Do you provide complete glassware, cutlery, and service staff for ceremonial toasts?',
        'What is the contingency plan for food warmth if outdoor reception begins slightly late?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Ensure vegetarian guest alternatives are clearly marked and staffed.',
    },
    {
      id: 'ven-cw-3',
      categoryName: 'Botanical Floral & Stage Decorator',
      vendorTypeDescription: 'Stylist skilled in minimalist church florals, eucalyptus greenery, and reception lighting',
      status: 'Contacted',
      questionsToAsk: [
        'How early does the church permit access for pew posies and altar floral setup?',
        'Can church arrangements be repurposed for the reception venue entrance or cake table?',
        'What style of fairy-light canopy and stage backdrop do you recommend for an evening lawn?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Confirm flower choices: white lilies, baby breath, and seasonal greens.',
    },
    {
      id: 'ven-cw-4',
      categoryName: 'Wedding Photojournalist & Filmmaker',
      vendorTypeDescription: 'Discreet documentary photography and cinematic highlight video team',
      status: 'Shortlisted',
      questionsToAsk: [
        'Are your photographers familiar with church sanctum protocols and flash restrictions during the service?',
        'Do you cover the formal wedding rehearsal as well as the nuptial day?',
        'What is the delivery timeline for the highlight trailer and wedding album?',
      ],
      verifyWithVendorNotice: 'Verify with the vendor',
      notes: 'Review past church wedding galleries to assess natural low-light capability.',
    },
  ],
  ideas: {
    themes: [
      'Ivory & Emerald Garden Nuptials: Clean botanical greenery, white blooms, and warm amber festoon lighting',
      'Coastal Elegance: Soft linen textures, wooden elements, and maritime evening breezes',
    ],
    dietaryNotes: [
      'Appam with vegetable and chicken stew, Kerala fish molee, slow-cooked beef/lamb roast, and fresh dinner rolls.',
      'Dedicated vegetarian and vegan buffet counter with paneer delicacies and Kerala payasam.',
      'Three-tiered rich fruitcake with royal icing and marzipan for the ceremonial cake cutting.',
    ],
    activities: [
      'Solemn choir prelude and processional entry into the church.',
      'Exchange of nuptial vows and blessing of rings administered by the officiant.',
      'Official signing of the church marriage register with family witnesses.',
      'Celebratory reception entrance, toast to the newlyweds, cake cutting, and couple first dance.',
    ],
    decor: [
      'Delicate white lily and baby breath pew posies tied with satin ribbons.',
      'Fairy-lit reception canopy and glowing warm festoon lights across the open lawn.',
      'Botanical eucalyptus table runners with pillar candles in glass hurricane vases.',
    ],
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
  version: 1,
  isSavedExample: true,
  generationSource: 'primary',
};

export const PRESET_CHURCH_WEDDING_RISKS: RiskRegister = {
  risks: [
    {
      id: 'risk-cw-1',
      category: 'Permits & Legal',
      severity: 'Medium',
      potentialIssue: 'Strict church sanctuary rules and restrictions on flash photography',
      rootCause: 'Parish sanctity regulations during sacred religious ceremonies',
      mitigationTask: 'Brief photography team in advance on sanctuary boundaries and use high-ISO low-light camera lenses without flash.',
    },
    {
      id: 'risk-cw-2',
      category: 'Weather & Season',
      severity: 'High',
      potentialIssue: 'Coastal rain or high humidity affecting outdoor reception lawn',
      rootCause: 'Kochi coastal weather patterns and sudden tropical evening showers',
      mitigationTask: 'Ensure reception venue includes a weather-proof transparent marquee or immediate indoor banquet hall switchover.',
    },
    {
      id: 'risk-cw-3',
      category: 'Dependencies',
      severity: 'Medium',
      potentialIssue: 'Guest transit delays between church ceremony and evening reception venue',
      rootCause: 'Peak evening traffic across city junctions and bridge corridors',
      mitigationTask: 'Provide coordinated guest shuttle buses and allow a generous 90-minute transit and buffer window in the program.',
    },
    {
      id: 'risk-cw-4',
      category: 'Single Point of Failure',
      severity: 'Low',
      potentialIssue: 'Church acoustic feedback or choir microphone imbalance',
      rootCause: 'Echo characteristics in high-ceiling stone church sanctuaries',
      mitigationTask: 'Conduct audio soundcheck during the wedding rehearsal with choir and lectors.',
    },
  ],
  assessedAt: '2026-08-20T10:00:00.000Z',
};

// ---------------------------------------------------------------------------
// 5. Re-export Risks for Existing Saved Examples (Wedding, Birthday, Community)
// ---------------------------------------------------------------------------
export {
  SAMPLE_WEDDING_RISKS,
  SAMPLE_BIRTHDAY_RISKS,
  SAMPLE_COMMUNITY_RISKS,
};

// ---------------------------------------------------------------------------
// 6. Registry of All Prepared Plans
// ---------------------------------------------------------------------------
export const PREPARED_PLANS: Record<string, PreparedPlanEntry> = {
  // The six editable presets
  'indian-wedding': {
    plan: PRESET_INDIAN_WEDDING_PLAN,
    risks: PRESET_INDIAN_WEDDING_RISKS,
  },
  'nikah-walima': {
    plan: PRESET_NIKAH_WALIMA_PLAN,
    risks: PRESET_NIKAH_WALIMA_RISKS,
  },
  'church-wedding': {
    plan: PRESET_CHURCH_WEDDING_PLAN,
    risks: PRESET_CHURCH_WEDDING_RISKS,
  },
  housewarming: {
    plan: PRESET_HOUSEWARMING_PLAN,
    risks: PRESET_HOUSEWARMING_RISKS,
  },
  'diwali-gathering': {
    plan: PRESET_DIWALI_PLAN,
    risks: PRESET_DIWALI_RISKS,
  },
  'college-fest': {
    plan: PRESET_COLLEGE_FEST_PLAN,
    risks: PRESET_COLLEGE_FEST_RISKS,
  },
  // The three saved examples
  wedding: {
    plan: SAMPLE_WEDDING_PLAN,
    risks: SAMPLE_WEDDING_RISKS,
  },
  birthday: {
    plan: SAMPLE_BIRTHDAY_PLAN,
    risks: SAMPLE_BIRTHDAY_RISKS,
  },
  community: {
    plan: SAMPLE_COMMUNITY_PLAN,
    risks: SAMPLE_COMMUNITY_RISKS,
  },
};

// ---------------------------------------------------------------------------
// 7. Pure Helpers: Date Computation, Reflow & Matching
// ---------------------------------------------------------------------------

/**
 * Computes a target event date about 4 months ahead of referenceDate.
 * Defaults to 120 days in the future.
 */
export function computeDefaultPreparedDate(
  referenceDate: string = formatDateISO(new Date())
): string {
  const ref = parseDateISO(referenceDate);
  const future = new Date(ref.getTime() + 120 * 24 * 60 * 60 * 1000);
  return formatDateISO(future);
}

/**
 * Creates an instantiated copy of a prepared plan where:
 * 1. Event date is relative to referenceDate (~4 months ahead unless user chosen).
 * 2. All task due dates are computed via reflowTimelineDates with clampPastDates: true,
 *    ensuring NO task due date is ever in the past.
 * 3. Tasks that cannot meet their normal lead time are marked `isTimeSensitive = true`.
 * 4. Muhurat time is left empty.
 */
export function createPreparedPlanInstance(
  basePlan: EventPlan,
  userChosenDate?: string,
  referenceDate: string = formatDateISO(new Date()),
  customEventName?: string
): EventPlan {
  const targetEventDate =
    userChosenDate && /^\d{4}-\d{2}-\d{2}$/.test(userChosenDate.trim())
      ? userChosenDate.trim()
      : computeDefaultPreparedDate(referenceDate);

  const reflow = reflowTimelineDates(
    basePlan.timeline,
    basePlan.date,
    targetEventDate,
    referenceDate,
    { clampPastDates: true }
  );

  return {
    ...basePlan,
    ...(customEventName && customEventName.trim() ? { eventName: customEventName.trim() } : {}),
    date: targetEventDate,
    timeline: reflow.updatedTasks,
    muhuratTime: undefined,
    muhuratLabel: undefined,
    isSavedExample: true,
    generationSource: 'primary',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves a prepared plan and its populated risk register with relative reflowed dates.
 */
export function getPreparedPlan(
  keyOrPresetId: string,
  userChosenDate?: string,
  referenceDate: string = formatDateISO(new Date()),
  customEventName?: string
): { plan: EventPlan; risks: RiskRegister } | null {
  const entry = PREPARED_PLANS[keyOrPresetId];
  if (!entry) return null;

  const planInstance = createPreparedPlanInstance(
    entry.plan,
    userChosenDate,
    referenceDate,
    customEventName
  );
  const risksInstance: RiskRegister = {
    ...entry.risks,
    assessedAt: new Date().toISOString(),
  };

  return {
    plan: planInstance,
    risks: risksInstance,
  };
}

/**
 * Retrieves the complete prepared safeguards check for a plan if it corresponds
 * to a saved example or preset.
 */
export function findPreparedRisksForPlan(plan: EventPlan): RiskRegister {
  if (PREPARED_PLANS[plan.id]) {
    return { ...PREPARED_PLANS[plan.id].risks, assessedAt: new Date().toISOString() };
  }
  for (const entry of Object.values(PREPARED_PLANS)) {
    if (
      entry.plan.eventType === plan.eventType &&
      entry.plan.city.toLowerCase() === plan.city.toLowerCase()
    ) {
      return { ...entry.risks, assessedAt: new Date().toISOString() };
    }
  }
  for (const entry of Object.values(PREPARED_PLANS)) {
    if (entry.plan.eventType === plan.eventType) {
      return { ...entry.risks, assessedAt: new Date().toISOString() };
    }
  }
  return { ...PREPARED_PLANS['indian-wedding'].risks, assessedAt: new Date().toISOString() };
}

/**
 * Pure function that checks whether all form values equal a preset's default values,
 * ignoring the event date and celebration name (custom name needs no AI processing and is applied directly to the loaded preset).
 * If ANY planning detail was changed (city, guests, budget, style, non-negotiables,
 * muhurat, currency), returns null.
 */
export function findMatchingPreset(formData: {
  eventType: string;
  city: string;
  guestCount: number;
  totalBudget: number;
  currency?: string;
  styleCulture: string;
  nonNegotiables: string;
  eventName?: string;
  muhuratTime?: string;
  muhuratLabel?: string;
}): EventPreset | null {
  // If muhurat time was entered, it has been customized
  if (formData.muhuratTime && formData.muhuratTime.trim().length > 0) return null;
  if (formData.muhuratLabel && formData.muhuratLabel.trim().length > 0) return null;
  // If currency was changed from INR, it has been customized
  if (formData.currency && formData.currency !== DEFAULT_CURRENCY) return null;

  for (const preset of EVENT_PRESETS) {
    const isEventTypeMatch = preset.eventType === formData.eventType;
    const isCityMatch =
      preset.defaultCity.trim().toLowerCase() === formData.city.trim().toLowerCase();
    const isGuestMatch = preset.suggestedGuests === Number(formData.guestCount);
    const isBudgetMatch = preset.suggestedBudget === Number(formData.totalBudget);
    const isStyleMatch = preset.styleCulture.trim() === formData.styleCulture.trim();
    const isNonNegMatch = preset.nonNegotiables.trim() === formData.nonNegotiables.trim();

    if (
      isEventTypeMatch &&
      isCityMatch &&
      isGuestMatch &&
      isBudgetMatch &&
      isStyleMatch &&
      isNonNegMatch
    ) {
      return preset;
    }
  }

  return null;
}

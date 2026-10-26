import {
  EventPlan,
  IntakeFormData,
  BudgetPlan,
  TimelineTask,
  VendorItem,
  PersonalizedIdeas,
  RiskRegister,
  RiskItem,
  ReplanDiffResponse,
  ReplanRequest,
  eventPlanSchema,
  riskRegisterSchema,
  replanDiffResponseSchema,
} from './schemas';
import { injectGuestMilestones } from './timeline';
import { validateAndFitBudget } from './budget-benchmarks';
import { formatTime12h } from './time';

/**
 * Standard category distribution configurations by celebration event type.
 * Ratios are designed to sum to 100% of the allocated category pool.
 */
interface CategoryTemplate {
  name: string;
  share: number; // Decimal share of category subtotal (e.g. 0.40)
  minFactor: number; // Factor for minEstimate (e.g. 0.85)
  maxFactor: number; // Factor for maxEstimate (e.g. 1.20)
  notes: string;
}

const WEDDING_CATEGORIES: CategoryTemplate[] = [
  {
    name: 'Venue & Banquet Hall',
    share: 0.38,
    minFactor: 0.88,
    maxFactor: 1.15,
    notes: 'Primary reception venue, banquet rental, and basic hospitality infrastructure.',
  },
  {
    name: 'Catering & Food Service',
    share: 0.24,
    minFactor: 0.85,
    maxFactor: 1.2,
    notes: 'Full multi-course meal service, welcome drinks, and standard tableware service.',
  },
  {
    name: 'Decor, Floral & Staging',
    share: 0.15,
    minFactor: 0.82,
    maxFactor: 1.25,
    notes: 'Stage backdrop, floral arrangements, entrance arch, and atmospheric ambient lighting.',
  },
  {
    name: 'Photography & Cinematography',
    share: 0.09,
    minFactor: 0.9,
    maxFactor: 1.15,
    notes: 'Full-day event coverage, candid photography, teaser edit, and photo album.',
  },
  {
    name: 'Attire, Styling & Beauty',
    share: 0.06,
    minFactor: 0.8,
    maxFactor: 1.2,
    notes: 'Ceremonial outfits, hair & makeup artist sessions, and wardrobe accessories.',
  },
  {
    name: 'Music, Sound & DJ',
    share: 0.05,
    minFactor: 0.85,
    maxFactor: 1.15,
    notes: 'PA sound system, professional DJ or acoustic instrumentalist, and wireless microphones.',
  },
  {
    name: 'Invitations & Guest Favors',
    share: 0.03,
    minFactor: 0.8,
    maxFactor: 1.2,
    notes: 'Digital/print invitation suites, welcome gift hampers, and guest favors.',
  },
];

const BIRTHDAY_CATEGORIES: CategoryTemplate[] = [
  {
    name: 'Venue & Banquet Rental',
    share: 0.42,
    minFactor: 0.85,
    maxFactor: 1.15,
    notes: 'Private party hall, banquet room, or outdoor lawn rental with standard seating.',
  },
  {
    name: 'Catering, Snacks & Beverages',
    share: 0.25,
    minFactor: 0.85,
    maxFactor: 1.2,
    notes: 'Buffet meal, finger foods, mocktails, and beverage service for all attendees.',
  },
  {
    name: 'Theme Styling & Balloon Decor',
    share: 0.15,
    minFactor: 0.8,
    maxFactor: 1.25,
    notes: 'Custom photo-booth backdrop, balloon garland arch, and themed table centerpieces.',
  },
  {
    name: 'Custom Cake & Desserts',
    share: 0.08,
    minFactor: 0.85,
    maxFactor: 1.2,
    notes: 'Signature multi-tier customized birthday cake and matching dessert platter.',
  },
  {
    name: 'Entertainment, Emcee & Games',
    share: 0.06,
    minFactor: 0.85,
    maxFactor: 1.2,
    notes: 'Party host/emcee, interactive group party games, and children entertainment activities.',
  },
  {
    name: 'Photography & Return Favors',
    share: 0.04,
    minFactor: 0.8,
    maxFactor: 1.15,
    notes: 'Event candid photography coverage and personalized guest return gift bags.',
  },
];

const COMMUNITY_CATEGORIES: CategoryTemplate[] = [
  {
    name: 'Ground, Stage & Tent Infrastructure',
    share: 0.35,
    minFactor: 0.85,
    maxFactor: 1.18,
    notes: 'Open ground or community hall rental, weather-resistant tenting, and elevated stage.',
  },
  {
    name: 'Food & Refreshment Counters',
    share: 0.28,
    minFactor: 0.85,
    maxFactor: 1.2,
    notes: 'Community buffet stations, mineral drinking water dispensers, and refreshment booths.',
  },
  {
    name: 'Sound, AV, Stage Lighting & Generator',
    share: 0.16,
    minFactor: 0.88,
    maxFactor: 1.15,
    notes: 'High-output PA sound equipment, wireless mics, spotlights, and backup diesel generator.',
  },
  {
    name: 'Signage, Publicity & Printed Materials',
    share: 0.09,
    minFactor: 0.8,
    maxFactor: 1.25,
    notes: 'Welcome flex banners, directional arrows, registration desks, and schedule brochures.',
  },
  {
    name: 'Waste Management, Sanitation & First Aid',
    share: 0.07,
    minFactor: 0.85,
    maxFactor: 1.15,
    notes: 'Segregated waste bins, municipal disposal fees, mobile sanitation, and medical first-aid kit.',
  },
  {
    name: 'Security, Badges & Activity Prizes',
    share: 0.05,
    minFactor: 0.8,
    maxFactor: 1.2,
    notes: 'Security marshals, attendee identification wristbands, and community contest prizes.',
  },
];

/**
 * Standard vendor screening profiles with discovery questions.
 * Never invents vendor names or phone numbers.
 */
interface VendorTemplate {
  categoryName: string;
  vendorTypeDescription: string;
  questionsToAsk: string[];
}

const DEFAULT_VENDOR_TEMPLATES: Record<string, VendorTemplate[]> = {
  Wedding: [
    {
      categoryName: 'Venue Partner',
      vendorTypeDescription: 'Licensed wedding banquet hall, heritage property, or resort venue coordinator.',
      questionsToAsk: [
        'Does the rental package include in-house catering, tables, chairs, and basic linens?',
        'What are the strict municipal sound curfew hours and amplified music restrictions?',
        'What is your cancellation policy and advance booking deposit schedule?',
      ],
    },
    {
      categoryName: 'Catering Service',
      vendorTypeDescription: 'Professional wedding catering team experienced in multi-course banquet service.',
      questionsToAsk: [
        'Do you provide live tasting sessions prior to final menu confirmation?',
        'How do you manage separate dietary preparation for vegetarian, vegan, and allergic guests?',
        'What ratio of service staff to guest count do you guarantee during peak dining hours?',
      ],
    },
    {
      categoryName: 'Decor & Production',
      vendorTypeDescription: 'Event production and floral styling team specializing in thematic backdrops.',
      questionsToAsk: [
        'Can we inspect a 3D layout or past portfolio of similar venues you have decorated?',
        'Are fresh florals sourced locally, and what are backup plans in case of seasonal weather changes?',
        'What is the load-in setup duration required before guests start arriving?',
      ],
    },
    {
      categoryName: 'Photography & Film',
      vendorTypeDescription: 'Documentary and portrait wedding photographer and videography team.',
      questionsToAsk: [
        'Will the lead photographer personally shoot the event or assign associate shooters?',
        'What is the delivery timeline for teaser photos, edited highlight reels, and the full gallery?',
        'Do you bring backup camera bodies, lenses, lighting, and duplicate memory cards on-site?',
      ],
    },
  ],
  Birthday: [
    {
      categoryName: 'Party Venue',
      vendorTypeDescription: 'Private celebration venue, family banquet room, or party lounge host.',
      questionsToAsk: [
        'Can we bring external specialty cakes and custom theme decorations?',
        'What is the policy on extension hours if guests wish to celebrate longer?',
        'Are audio-visual equipment and background music speakers included in the booking fee?',
      ],
    },
    {
      categoryName: 'Cake & Confectionery',
      vendorTypeDescription: 'Artisan baker and custom confectionery specialist.',
      questionsToAsk: [
        'How far in advance must the final design and flavor selection be confirmed?',
        'Do you offer refrigerated delivery directly to the venue at a scheduled arrival time?',
        'Can you accommodate nut-free, eggless, or gluten-free cake tiers?',
      ],
    },
    {
      categoryName: 'Theme Decorator',
      vendorTypeDescription: 'Balloon stylist and thematic photo backdrop decorator.',
      questionsToAsk: [
        'How long before the party start time will your setup team finish the backdrop?',
        'Are the balloons biodegradable, and do you handle post-event teardown and disposal?',
        'Can you incorporate custom name neon signs or personalized cutouts?',
      ],
    },
  ],
  'Community Event': [
    {
      categoryName: 'Ground & Tent Logistics',
      vendorTypeDescription: 'Municipal ground, auditorium, or open lawn infrastructure provider.',
      questionsToAsk: [
        'What municipal fire permits and local authority NOCs are required for this assembly?',
        'What is the maximum rated electrical capacity, and is a dedicated generator mandatory?',
        'Where are emergency exits, vehicular loading docks, and attendee parking located?',
      ],
    },
    {
      categoryName: 'Sound & Audio-Visual',
      vendorTypeDescription: 'Public address (PA) sound engineer and stage AV equipment supplier.',
      questionsToAsk: [
        'Does the sound package include roaming wireless microphones and sound monitor speakers?',
        'Will a dedicated sound technician remain on-site throughout the entire program?',
        'What waterproof rain protection is provided for outdoor electrical cables and speakers?',
      ],
    },
    {
      categoryName: 'Community Catering & Refreshments',
      vendorTypeDescription: 'Bulk community meal supplier and mobile refreshment station vendor.',
      questionsToAsk: [
        'What food safety licenses (e.g. FSSAI/Health Department) are held by your team?',
        'How are temperature-controlled hot holding stations powered at the venue?',
        'What protocols are established for hygienic food distribution and disposable cutlery?',
      ],
    },
  ],
};

/**
 * Generates personalized creative ideas deterministically from intake parameters.
 */
function generateTemplateIdeas(intake: IntakeFormData): PersonalizedIdeas {
  const style = intake.styleCulture ? intake.styleCulture.trim() : 'Contemporary';

  if (intake.eventType === 'Wedding') {
    return {
      themes: [
        `${style} Elegance with Timeless Royal Accents`,
        'Garden Bloom Sunset Soiree with Ambient Fairy Lights',
        'Traditional Cultural Grandeur with Heritage Textures',
      ],
      dietaryNotes: [
        'Include clearly marked vegetarian and vegan banquet counters',
        'Provide dedicated nut-free and gluten-sensitive meal options',
        'Feature regional cultural dessert stations with sugar-free alternatives',
      ],
      activities: [
        'Interactive live Polaroid guestbook memory station',
        'Curated acoustic musical performance during dinner banquet',
        'Coordinated family choreographed celebration dance',
      ],
      decor: [
        'Warm ambient fairy lights, crystal chandeliers, and brass lanterns',
        'Fresh local floral mandap/canopy with draped pastel chiffon',
        'Custom calligraphy welcome mirror sign at main foyer entrance',
      ],
    };
  }

  if (intake.eventType === 'Birthday') {
    return {
      themes: [
        `${style} Celebration Spectacular`,
        'Retro Neon Glow Fest with Fun Interactive Lighting',
        'Whimsical Pastel Carnival with Playful Accents',
      ],
      dietaryNotes: [
        'Offer kid-friendly and allergen-labeled finger snacks',
        'Feature eggless and dairy-free specialty cupcake options',
        'Provide refreshing mocktail and fruit punch beverage stations',
      ],
      activities: [
        'High-energy party game coordinator with trivia and prizes',
        'Instant photo booth with fun novelty props and print strips',
        'Cake cutting ceremony accompanied by custom celebratory music',
      ],
      decor: [
        'Double-layered organic balloon garland arch with custom milestone number',
        'Personalized photo timeline bunting showcasing memorable milestones',
        'Color-coordinated table runners with theme centerpieces',
      ],
    };
  }

  return {
    themes: [
      `${style} Community Unity Festival`,
      'Eco-Conscious Green Gathering & Cultural Fair',
      'Neighborhood Heritage Celebration with Local Talent',
    ],
    dietaryNotes: [
      'Multi-cuisine community food stalls catering to diverse community tastes',
      'Free hygienic filtered drinking water refilling stations',
      'Clear allergen placards on all community food distribution counters',
    ],
    activities: [
      'Community talent showcase and recognition awards ceremony',
      'Interactive collaborative group art or memory wall',
      'Friendly inter-group trivia or sports showcase',
    ],
    decor: [
      'Vibrant fabric pennant bunting and sustainable paper lanterns',
      'Clear directional signage and welcoming registration gate banners',
      'Centrally elevated stage with branded backdrop banner',
    ],
  };
}

/**
 * Builds base phased timeline tasks before guest milestones injection.
 */
function buildBaseTimelineTasks(intake: IntakeFormData, leadDays: number): TimelineTask[] {
  // Safe helper to determine reasonable offset in days
  const capOffset = (desiredDays: number) => Math.min(desiredDays, Math.max(1, leadDays - 1));

  if (intake.eventType === 'Wedding') {
    return [
      {
        id: 'task-tpl-1',
        phase: 'Now',
        title: 'Finalize venue and banquet hall reservation',
        description: `Confirm primary wedding venue in ${intake.city} and sign booking agreement.`,
        dueDate: intake.date,
        owner: 'Hosts',
        completed: false,
        daysBeforeEvent: capOffset(60),
      },
      {
        id: 'task-tpl-2',
        phase: 'Next 30 days',
        title: 'Book core catering tasting and menu selection',
        description: `Schedule tasting session with wedding caterer for ${intake.guestCount} guests.`,
        dueDate: intake.date,
        owner: 'Food Committee',
        completed: false,
        daysBeforeEvent: capOffset(45),
      },
      {
        id: 'task-tpl-3',
        phase: 'Next 30 days',
        title: 'Confirm floral styling, staging and decorator',
        description: 'Review 3D stage mockups and finalize floral themes and ambient lighting.',
        dueDate: intake.date,
        owner: 'Hosts',
        completed: false,
        daysBeforeEvent: capOffset(30),
      },
      {
        id: 'task-tpl-4',
        phase: 'Next 30 days',
        title: 'Lock photographer and cinematography team',
        description: 'Sign photography contract, confirm lead shooters, and outline shot list.',
        dueDate: intake.date,
        owner: 'Hosts',
        completed: false,
        daysBeforeEvent: capOffset(25),
      },
      {
        id: 'task-tpl-5',
        phase: 'Next 7 days',
        title: 'Schedule attire fittings and beauty consultation',
        description: 'Finalize ceremonial outfits and confirm makeup artist arrival time.',
        dueDate: intake.date,
        owner: 'Couples / Hosts',
        completed: false,
        daysBeforeEvent: capOffset(14),
      },
      {
        id: 'task-tpl-6',
        phase: 'Event week',
        title: 'Conduct on-site venue walk-through and vendor sound check',
        description: 'Walk through venue layout with sound team, decorator, and banquet manager.',
        dueDate: intake.date,
        owner: 'Coordinator',
        completed: false,
        daysBeforeEvent: capOffset(3),
      },
      {
        id: 'task-tpl-7',
        phase: 'Event day',
        title: intake.muhuratTime
          ? `Ceremony & Muhurat rituals at ${formatTime12h(intake.muhuratTime)}${intake.muhuratLabel ? ` (${intake.muhuratLabel})` : ''}`
          : 'Early morning vendor load-in and ceremony coordination',
        description: intake.muhuratTime
          ? `Muhurat scheduled at ${formatTime12h(intake.muhuratTime)}${intake.muhuratLabel ? ` for ${intake.muhuratLabel}` : ''}. Verify stage readiness, ritual samagri, and pandit coordination.`
          : 'Verify stage readiness, sound microphones, and hospitality reception desks.',
        dueDate: intake.date,
        owner: 'Coordinator',
        completed: false,
        daysBeforeEvent: 0,
      },
    ];
  }

  if (intake.eventType === 'Birthday') {
    return [
      {
        id: 'task-tpl-1',
        phase: 'Now',
        title: 'Reserve birthday party venue or hall',
        description: `Secure party hall booking in ${intake.city} for ${intake.guestCount} guests.`,
        dueDate: intake.date,
        owner: 'Host',
        completed: false,
        daysBeforeEvent: capOffset(30),
      },
      {
        id: 'task-tpl-2',
        phase: 'Next 30 days',
        title: 'Order custom theme cake and dessert platter',
        description: 'Confirm cake design, flavor tiers, delivery time, and candles.',
        dueDate: intake.date,
        owner: 'Host',
        completed: false,
        daysBeforeEvent: capOffset(18),
      },
      {
        id: 'task-tpl-3',
        phase: 'Next 30 days',
        title: 'Confirm balloon styling and photo backdrop',
        description: 'Finalize balloon color palette, backdrop arch, and custom milestone sign.',
        dueDate: intake.date,
        owner: 'Host',
        completed: false,
        daysBeforeEvent: capOffset(15),
      },
      {
        id: 'task-tpl-4',
        phase: 'Next 7 days',
        title: 'Organize interactive games, prizes and party favors',
        description: 'Prepare return gift hampers and outline party playlist and game rules.',
        dueDate: intake.date,
        owner: 'Host',
        completed: false,
        daysBeforeEvent: capOffset(7),
      },
      {
        id: 'task-tpl-5',
        phase: 'Event week',
        title: 'Confirm final catering order and food delivery schedule',
        description: 'Recheck headcount, finger food quantities, and beverage stock.',
        dueDate: intake.date,
        owner: 'Host',
        completed: false,
        daysBeforeEvent: capOffset(2),
      },
      {
        id: 'task-tpl-6',
        phase: 'Event day',
        title: 'Venue decor setup, cake delivery and party reception',
        description: 'Inspect balloon backdrop, receive cake in cool storage, and greet guests.',
        dueDate: intake.date,
        owner: 'Host',
        completed: false,
        daysBeforeEvent: 0,
      },
    ];
  }

  // Community Event
  return [
    {
      id: 'task-tpl-1',
      phase: 'Now',
      title: 'Secure ground booking and municipal assembly permits',
      description: `Confirm ground/hall in ${intake.city} and obtain sound permit approvals.`,
      dueDate: intake.date,
      owner: 'Organizing Committee',
      completed: false,
      daysBeforeEvent: capOffset(45),
    },
    {
      id: 'task-tpl-2',
      phase: 'Next 30 days',
      title: 'Finalize sound, stage, AV and backup generator contract',
      description: 'Book sound engineer, public address speakers, microphones, and backup power.',
      dueDate: intake.date,
      owner: 'Technical Lead',
      completed: false,
      daysBeforeEvent: capOffset(30),
    },
    {
      id: 'task-tpl-3',
      phase: 'Next 30 days',
      title: 'Arrange community volunteer roles and shift schedules',
      description: 'Assign volunteers to registration, hospitality, stage, and first-aid desks.',
      dueDate: intake.date,
      owner: 'Volunteer Coordinator',
      completed: false,
      daysBeforeEvent: capOffset(18),
    },
    {
      id: 'task-tpl-4',
      phase: 'Next 7 days',
      title: 'Print banners, directional signs and programs',
      description: 'Receive flex banners, registration charts, and schedule handouts.',
      dueDate: intake.date,
      owner: 'Logistics Lead',
      completed: false,
      daysBeforeEvent: capOffset(7),
    },
    {
      id: 'task-tpl-5',
      phase: 'Event week',
      title: 'Sanitation, waste bins and first-aid station setup',
      description: 'Position segregated waste bins, drinking water stations, and medical kits.',
      dueDate: intake.date,
      owner: 'Safety Team',
      completed: false,
      daysBeforeEvent: capOffset(2),
    },
    {
      id: 'task-tpl-6',
      phase: 'Event day',
      title: 'Stage setup, volunteer briefing and gate opening',
      description: 'Test sound microphones, run final briefing, and welcome community attendees.',
      dueDate: intake.date,
      owner: 'Organizing Committee',
      completed: false,
      daysBeforeEvent: 0,
    },
  ];
}

/**
 * Calculates due date string (YYYY-MM-DD) by subtracting daysBeforeEvent from eventDate.
 */
function calculateDueDate(eventDateStr: string, daysBefore: number): string {
  try {
    const eventTime = new Date(`${eventDateStr}T00:00:00Z`).getTime();
    if (isNaN(eventTime)) return eventDateStr;
    const taskTime = eventTime - daysBefore * 24 * 60 * 60 * 1000;
    return new Date(taskTime).toISOString().split('T')[0];
  } catch {
    return eventDateStr;
  }
}

/**
 * Assigns chronological phase label based on remaining days.
 */
function assignPhase(daysBefore: number): TimelineTask['phase'] {
  if (daysBefore === 0) return 'Event day';
  if (daysBefore <= 7) return 'Event week';
  if (daysBefore <= 14) return 'Next 7 days';
  if (daysBefore <= 30) return 'Next 30 days';
  return 'Now';
}

/**
 * Built-in deterministic template planner.
 * Generates an end-to-end complete EventPlan strictly in pure TypeScript with zero network calls.
 * Guaranteed to pass Zod schema validation for any valid intake form data.
 */
export function generateTemplatePlan(
  intake: IntakeFormData,
  options?: { planId?: string; now?: Date }
): EventPlan {
  const planId = options?.planId || `plan_tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const nowIso = (options?.now || new Date()).toISOString();

  // 1. Calculate deterministic budget categories
  const categoryTemplates =
    intake.eventType === 'Wedding'
      ? WEDDING_CATEGORIES
      : intake.eventType === 'Birthday'
        ? BIRTHDAY_CATEGORIES
        : COMMUNITY_CATEGORIES;

  const contingencyPercent = 10;
  const taxServiceChargePercent = 5;

  // Category allowance pool = totalBudget / (1 + (contingency + tax) / 100)
  const multiplier = 1 + (contingencyPercent + taxServiceChargePercent) / 100;
  const categoryPool = Math.max(100, Math.floor(intake.totalBudget / multiplier));

  const categories = categoryTemplates.map((tpl, idx) => {
    const targetEstimate = Math.max(10, Math.round(categoryPool * tpl.share));
    const minEstimate = Math.max(5, Math.round(targetEstimate * tpl.minFactor));
    const maxEstimate = Math.max(targetEstimate, Math.round(targetEstimate * tpl.maxFactor));

    return {
      id: `cat-${idx + 1}`,
      name: tpl.name,
      targetEstimate,
      minEstimate,
      maxEstimate,
      notes: tpl.notes,
    };
  });

  const rawBudget: BudgetPlan = {
    categories,
    contingencyPercent,
    taxServiceChargePercent,
    statedAssumptions: [
      `Budget targets benchmarked for ${intake.city} with an expected guest count of ${intake.guestCount}.`,
      'Contingency reserve set at 10% to accommodate unexpected scope adjustments or price surges.',
      'Taxes and service allowance calculated at standard 5% statutory estimate.',
      'All estimates are indicative planning benchmarks; verify formal binding quotes with selected vendors.',
    ],
  };

  const budget = validateAndFitBudget(
    rawBudget,
    intake.totalBudget,
    intake.guestCount,
    intake.city,
    intake.eventType
  );

  // 2. Timeline tasks with lead time calculation
  const eventTime = new Date(`${intake.date}T00:00:00Z`).getTime();
  const nowTime = (options?.now || new Date()).getTime();
  const leadDays = Math.max(0, Math.ceil((eventTime - nowTime) / (24 * 60 * 60 * 1000)));

  const baseTasks = buildBaseTimelineTasks(intake, leadDays).map((t, idx) => {
    const safeDaysBefore = Math.min(t.daysBeforeEvent, Math.max(0, leadDays - 1));
    const dueDate = calculateDueDate(intake.date, safeDaysBefore);
    return {
      ...t,
      id: `task-${idx + 1}`,
      daysBeforeEvent: safeDaysBefore,
      dueDate,
      phase: assignPhase(safeDaysBefore),
      completed: false,
    };
  });

  // Inject guest invitation milestones (Save-the-date, Invitations, RSVP, Headcount)
  const finalTimeline = injectGuestMilestones(baseTasks, intake.date, intake.eventType);

  // 3. Vendors
  const vendorTemplates =
    DEFAULT_VENDOR_TEMPLATES[intake.eventType] || DEFAULT_VENDOR_TEMPLATES.Wedding;

  const vendors: VendorItem[] = vendorTemplates.map((v, idx) => ({
    id: `vendor-${idx + 1}`,
    categoryName: v.categoryName,
    vendorTypeDescription: v.vendorTypeDescription,
    status: 'Shortlisted',
    questionsToAsk: v.questionsToAsk,
    verifyWithVendorNotice: 'Verify with the vendor',
    notes: 'Template screening guidance. Verify availability and licensing directly with local professionals.',
  }));

  // 4. Personalized Ideas
  const ideas = generateTemplateIdeas(intake);

  // 5. Construct full EventPlan
  const planTitle = intake.eventName?.trim()
    ? intake.eventName.trim()
    : intake.styleCulture
      ? `${intake.styleCulture} ${intake.eventType}`
      : `${intake.eventType} Celebration in ${intake.city}`;

  const fullPlan: EventPlan = {
    id: planId,
    title: planTitle,
    eventName: intake.eventName?.trim() || undefined,
    eventType: intake.eventType,
    city: intake.city,
    date: intake.date,
    guestCount: intake.guestCount,
    totalBudget: intake.totalBudget,
    currency: intake.currency,
    styleCulture: intake.styleCulture || 'Classic celebration styling',
    nonNegotiables: intake.nonNegotiables || 'Punctual vendor schedule and quality dining experience',
    muhuratTime: intake.muhuratTime?.trim() || undefined,
    muhuratLabel: intake.muhuratLabel?.trim() || undefined,
    budget,
    timeline: finalTimeline,
    vendors,
    ideas,
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
    isSavedExample: false,
    generationSource: 'template',
  };

  // Validate output against Zod schema to guarantee contract integrity
  return eventPlanSchema.parse(fullPlan);
}

/**
 * Deterministic template risk register generator.
 * Produces structured operational safeguards conforming strictly to riskRegisterSchema.
 */
export function generateTemplateRisks(intake: IntakeFormData): RiskRegister {
  const risks: RiskItem[] = [
    {
      id: 'risk-tpl-1',
      category: 'Dependencies',
      severity: 'High',
      potentialIssue: 'Vendor delivery delay during peak setup hours',
      rootCause: `Heavy weekend transit congestion and overlapping bookings in ${intake.city}`,
      mitigationTask:
        'Mandate arrival and setup completion 2 hours prior to guest arrival with written vendor confirmation.',
    },
    {
      id: 'risk-tpl-2',
      category: 'Weather & Season',
      severity: 'Medium',
      potentialIssue: 'Adverse weather impact on outdoor gathering zones',
      rootCause: 'Unpredictable seasonal rainfall or extreme temperature variations',
      mitigationTask:
        'Reserve covered banquet pavilion backup or arrange waterproof overhead tenting with portable cooling/heating.',
    },
    {
      id: 'risk-tpl-3',
      category: 'Permits & Legal',
      severity: 'Medium',
      potentialIssue: 'Sound curfew and amplified audio enforcement',
      rootCause: 'Local municipal residential decibel limits and police curfews',
      mitigationTask:
        'Obtain municipal sound NOC in advance and schedule outdoor amplified music to conclude by 10:00 PM.',
    },
    {
      id: 'risk-tpl-4',
      category: 'Dietary & Accessibility',
      severity: 'Medium',
      potentialIssue: 'Special dietary cross-contamination or allergen reactions',
      rootCause: `${intake.guestCount} guests with diverse dietary restrictions dining concurrently`,
      mitigationTask:
        'Display prominent allergen placards and establish dedicated vegetarian and nut-free food prep stations.',
    },
    {
      id: 'risk-tpl-5',
      category: 'Payment Deadlines',
      severity: 'Low',
      potentialIssue: 'Dispute over advance deposits and milestone balances',
      rootCause: 'Verbal agreements without written itemized payment schedule',
      mitigationTask:
        'Execute written receipts specifying advance deposit terms and release final balance only upon delivery.',
    },
    {
      id: 'risk-tpl-6',
      category: 'Single Point of Failure',
      severity: 'High',
      potentialIssue: 'Power grid tripping from high-wattage sound and lighting equipment',
      rootCause: 'Standard venue electrical outlets overloaded by heavy amplification gear',
      mitigationTask:
        'Confirm on-site silent diesel generator with automatic changeover switch for continuous audio and stage power.',
    },
  ];

  const register: RiskRegister = {
    risks,
    assessedAt: new Date().toISOString(),
  };

  return riskRegisterSchema.parse(register);
}

/**
 * Deterministic template replanning rebalancer.
 * Used as last-resort fallback when replanning is requested during network outages.
 */
export function generateTemplateRebalance(
  currentPlan: EventPlan,
  changes: ReplanRequest['changes']
): ReplanDiffResponse {
  const newBudget = changes.totalBudget ?? currentPlan.totalBudget;
  const ratio = currentPlan.totalBudget > 0 ? newBudget / currentPlan.totalBudget : 1;

  const affectedBudgetCategories = currentPlan.budget.categories.map((cat) => {
    if (changes.modifiedCategory && cat.id === changes.modifiedCategory.categoryId) {
      return {
        ...cat,
        targetEstimate: changes.modifiedCategory.newTargetEstimate,
        minEstimate: Math.round(changes.modifiedCategory.newTargetEstimate * 0.9),
        maxEstimate: Math.round(changes.modifiedCategory.newTargetEstimate * 1.15),
      };
    }

    const newTarget = Math.round(cat.targetEstimate * ratio);
    return {
      ...cat,
      targetEstimate: newTarget,
      minEstimate: Math.round(cat.minEstimate * ratio),
      maxEstimate: Math.round(cat.maxEstimate * ratio),
    };
  });

  const rawRebalanced: BudgetPlan = {
    categories: affectedBudgetCategories,
    contingencyPercent: currentPlan.budget.contingencyPercent,
    taxServiceChargePercent: currentPlan.budget.taxServiceChargePercent,
    statedAssumptions: currentPlan.budget.statedAssumptions,
  };

  const fitted = validateAndFitBudget(
    rawRebalanced,
    newBudget,
    changes.guestCount ?? currentPlan.guestCount,
    currentPlan.city,
    currentPlan.eventType
  );

  const diffResponse: ReplanDiffResponse = {
    summaryOfChanges: `Budget rebalanced to accommodate ${changes.totalBudget ? 'total budget update' : 'requested parameter changes'}.`,
    why: 'Deterministic proportional adjustment applied across category estimates while preserving contingency margins.',
    tradeOffOptions: [
      'Accept proportional category scaling across all expense lines',
      'Lock high-priority categories and adjust non-essential allowances individually',
    ],
    affectedBudgetCategories: fitted.categories,
    affectedTimelineTasks: currentPlan.timeline.slice(0, 4),
    newContingencyPercent: currentPlan.budget.contingencyPercent,
  };

  return replanDiffResponseSchema.parse(diffResponse);
}

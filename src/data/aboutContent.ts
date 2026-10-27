import { APP_NAME, APP_TAGLINE, AUTHOR_NAME, CONTACT_LINKS } from '@/lib/constants';

export interface AboutCard {
  title: string;
  badge: string;
  description: string;
}

export interface HowItWorksStep {
  step: number;
  title: string;
  summary: string;
  detail: string;
}

export interface BuiltWithItem {
  name: string;
  role: string;
}

export const ABOUT_PROJECT = {
  appName: APP_NAME,
  tagline: APP_TAGLINE,
  authorName: AUTHOR_NAME,
  contactLinks: CONTACT_LINKS,

  whyTheName: {
    heading: 'Why the name Aayojan Ace?',
    cards: [
      {
        title: 'Aayojan (आयोजन)',
        badge: 'Aayojan',
        description:
          'Aayojan (आयोजन) is a Hindi word meaning the organizing and arranging of an event or function, which is exactly what the app does for weddings, birthdays and community celebrations.',
      },
      {
        title: 'Ace',
        badge: 'Ace',
        description:
          'An ace is someone who is top-class and expert at what they do, so the planning is handled with skill, accuracy and confidence.',
      },
    ],
    summary:
      'Together, Aayojan Ace means expert celebration planning: every event organized with care, from the first budget to the last guest.',
  },

  whatItIs: {
    heading: 'What Aayojan Ace Is',
    lead: `${APP_NAME} is an intelligent celebration and event planning companion tailored for Indian and multicultural festivities. Whether you are organizing a royal multi-day wedding in Jaipur, an intimate Griha Pravesh pooja in Bengaluru, a milestone birthday, or a vibrant society Diwali gathering, ${APP_NAME} structures your celebration into practical, actionable blueprints.`,
    body: 'Traditional event planning often suffers from fragmented spreadsheets, unrealistic budget creep, and missed ritual timings. Aayojan Ace harmonizes culture, budget discipline, and timelines into one unified workspace with realistic cost caps, milestone dates, curated vendor checklists, and personalized ideas.',
  },

  whyItWasMade: {
    heading: 'Why It Was Made',
    lead: `${APP_NAME} was built for the PromptWars Challenge 5 · Celebration & Event Planner. The goal was to demonstrate how state-of-the-art agentic AI, robust software architecture, and strict validation can transform complex, emotionally significant event planning into an accessible, delightful, and error-free digital experience.`,
    pillars: [
      {
        title: 'Strict Math',
        description:
          'Guaranteed hard budget ceiling where category targets, tax, and contingency never exceed total funds.',
      },
      {
        title: 'Cultural Context',
        description:
          'Native support for ceremony and muhurat timings, regional traditions, satvik catering, and local vendor questions.',
      },
      {
        title: 'Zero Lock-in',
        description:
          'Direct export to Google Calendar, standard .ics files, print-ready reports, and local-first guest mode.',
      },
    ],
  },

  howItWorksSteps: [
    {
      step: 1,
      title: 'Intake & Curated Presets',
      summary: 'Pick a cultural preset or describe your unique celebration.',
      detail:
        'Select an event preset (Indian Wedding, Griha Pravesh, Diwali Gathering, Nikah & Walima, Church Wedding, or College Fest) or specify custom celebration parameters. Submitting an unchanged preset opens a schema-valid plan instantly with reflowed dates, while custom entries route to our AI generation pipeline.',
    },
    {
      step: 2,
      title: 'Multi-Tier AI Orchestrator',
      summary: 'Configurable Gemini models with automatic failover.',
      detail:
        'Google Gemini synthesizes an itemized blueprint validated strictly against Zod schemas. If the primary model faces heavy traffic, the orchestrator seamlessly falls back to backup providers or deterministic templates.',
    },
    {
      step: 3,
      title: 'Hard Budget Fitting',
      summary: 'Zero budget overrun with mathematical certainty.',
      detail:
        'Every line item undergoes mathematical post-processing and benchmarking so that vendor subtotal plus contingency and tax never exceed your stated ceiling funds.',
    },
    {
      step: 4,
      title: 'Actionable Workspace',
      summary: 'Timelines, calendars, risks, and vendor checklists.',
      detail:
        'Manage your phased timeline, sync directly to Google Calendar or .ics files, evaluate dynamic risk registers, print clean event reports, and clarify doubts with AI assistance.',
    },
  ],

  builtWith: [
    { name: 'Google Antigravity', role: 'Agentic AI Pair Programming' },
    { name: 'Google Gemini', role: 'Configurable AI Models' },
    { name: 'Firebase Auth & Firestore', role: 'Google Sign-in & Secure Cloud Sync' },
    { name: 'Next.js 14 & Vercel', role: 'App Router, Tailwind CSS, Strict TS' },
    { name: 'GSAP & Lenis', role: 'ScrollTrigger, MatchMedia & Reduced Motion' },
  ],

  responsibleAi: {
    heading: 'Responsible AI & Planning Estimates',
    text: `All financial ranges, vendor costs, and timeline estimates generated by ${APP_NAME} are advisory planning guides and benchmarks, not legally binding commercial quotes. Market conditions, local vendor availability, seasonal peak dates, and custom decor requirements will influence actual market rates. Always independently negotiate, verify credentials, and obtain written contracts directly with vendors before committing deposits or making financial decisions.`,
  },

  privacySummary: {
    heading: 'Data Privacy & Governance',
    lead: `${APP_NAME} collects only the celebration parameters you enter directly: event type, date, guest count, city, budget, and cultural preferences.`,
    highlights: [
      'We never collect or store credit cards, bank accounts, or government IDs.',
      'AI prompts transmit celebration context for plan synthesis only, never private credentials.',
      'Guest mode stores plans exclusively in local browser session storage.',
    ],
    linkText: 'Read Full Privacy Policy',
    linkHref: '/privacy',
  },

  termsSummary: {
    heading: 'Terms & Estimate Boundaries',
    lead: `Clear, transparent guidelines governing your use of ${APP_NAME}.`,
    highlights: [
      'Estimates are advisory planning guides for reference only, not commercial quotes.',
      'No agency relationship: all vendor agreements are contracted directly between you and the vendor.',
      'Safe, open data: export and download your celebration blueprints at any time with zero lock-in.',
    ],
    linkText: 'Read Full Terms of Service',
    linkHref: '/terms',
  },
};

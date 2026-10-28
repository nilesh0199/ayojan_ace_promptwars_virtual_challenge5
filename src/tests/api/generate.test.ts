import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/generate/route';
import * as geminiModule from '@/lib/gemini';
import { apiLimiter } from '@/lib/ratelimit';
import { planGenerationCache } from '@/lib/cache';

vi.mock('@/lib/gemini', async () => {
  const actual = await vi.importActual<typeof geminiModule>('@/lib/gemini');
  return {
    ...actual,
    callGeminiStructured: vi.fn(),
  };
});

describe('API /api/plan/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiLimiter.reset();
    planGenerationCache.clear();
  });

  const validIntake = {
    eventType: 'Wedding',
    city: 'Jaipur',
    date: '2026-11-20',
    guestCount: 300,
    totalBudget: 2500000,
    currency: 'INR',
    styleCulture: 'Royal Rajasthani Heritage',
    nonNegotiables: 'Strict Jain counter',
  };

  const mockAiOutput = {
    suggestedTitle: 'Royal Rajasthani Wedding',
    budget: {
      categories: [
        {
          id: 'cat-1',
          name: 'Venue',
          minEstimate: 600000,
          maxEstimate: 800000,
          targetEstimate: 700000,
          notes: 'Heritage lawn',
        },
        {
          id: 'cat-2',
          name: 'Catering',
          minEstimate: 700000,
          maxEstimate: 900000,
          targetEstimate: 800000,
          notes: 'Jain counter',
        },
        {
          id: 'cat-3',
          name: 'Decor',
          minEstimate: 300000,
          maxEstimate: 500000,
          targetEstimate: 400000,
          notes: 'Marigolds',
        },
      ],
      contingencyPercent: 10,
      taxServiceChargePercent: 8,
      statedAssumptions: ['Peak season estimate'],
    },
    timeline: [
      {
        id: 't-1',
        phase: 'Now',
        title: 'Book lawn',
        description: 'Verify capacity',
        dueDate: '2026-07-01',
        owner: 'Coordinator',
        completed: false,
        daysBeforeEvent: 140,
      },
      {
        id: 't-2',
        phase: 'Next 30 days',
        title: 'Floral design mockup',
        description: 'Review mandap',
        dueDate: '2026-08-01',
        owner: 'Couple',
        completed: false,
        daysBeforeEvent: 110,
      },
      {
        id: 't-3',
        phase: 'Event week',
        title: 'Generator test',
        description: 'Power backup check',
        dueDate: '2026-11-15',
        owner: 'Venue',
        completed: false,
        daysBeforeEvent: 5,
      },
      {
        id: 't-4',
        phase: 'Event day',
        title: 'Barat reception',
        description: 'Welcome drinks',
        dueDate: '2026-11-20',
        owner: 'Lead Host',
        completed: false,
        daysBeforeEvent: 0,
      },
      {
        id: 't-5',
        phase: 'Next 7 days',
        title: 'Finalize seating chart',
        description: 'Review table placements',
        dueDate: '2026-11-13',
        owner: 'Host',
        completed: false,
        daysBeforeEvent: 7,
      },
    ],
    vendors: [
      {
        id: 'v-1',
        categoryName: 'Heritage Lawn',
        vendorTypeDescription: 'Palace lawn venue',
        status: 'Shortlisted',
        questionsToAsk: ['Sound cutoff policy?', 'Generator backup included?'],
        verifyWithVendorNotice: 'Verify with the vendor',
        notes: '',
      },
      {
        id: 'v-2',
        categoryName: 'Satvik Caterer',
        vendorTypeDescription: 'Jain cuisine specialist',
        status: 'Shortlisted',
        questionsToAsk: ['Segregated kitchen protocol?', 'Guest server ratio?'],
        verifyWithVendorNotice: 'Verify with the vendor',
        notes: '',
      },
      {
        id: 'v-3',
        categoryName: 'Documentary Cinema',
        vendorTypeDescription: 'Natural light wedding filmmaker',
        status: 'Shortlisted',
        questionsToAsk: ['Raw footage delivery schedule?', 'Drone clearances?'],
        verifyWithVendorNotice: 'Verify with the vendor',
        notes: '',
      },
    ],
    ideas: {
      themes: ['Gilded Rajputana'],
      dietaryNotes: ['Dedicated pure Jain buffet'],
      activities: ['Live folk shehnai'],
      decor: ['Marigold chandeliers'],
    },
  };

  it('generates a full verified plan on valid input', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce(mockAiOutput);

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.id).toBeDefined();
    expect(plan.budget.categories).toHaveLength(3);
    expect(plan.timeline.length).toBeGreaterThanOrEqual(5);
    expect(plan.timeline.some((t: { isGuestMilestone?: boolean }) => t.isGuestMilestone)).toBe(true);
    expect(plan.vendors).toHaveLength(3);
    expect(res.headers.get('X-Cache')).toBe('MISS');
  });

  it('serves cached responses on identical duplicate requests', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce(mockAiOutput);

    const req1 = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Second call with same payload -> cache HIT
    const req2 = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    expect(res2.headers.get('X-Cache')).toBe('HIT');
    expect(geminiModule.callGeminiStructured).toHaveBeenCalledTimes(1);
  });

  it('falls back to built-in template planner when AI service is busy', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockRejectedValueOnce(
      new geminiModule.GeminiApiError('Service busy', 503, true, 'AI_BUSY')
    );

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.generationSource).toBe('template');
    expect(plan.budget.categories.length).toBeGreaterThanOrEqual(4);
    expect(plan.timeline.length).toBeGreaterThanOrEqual(4);
  });

  it('attaches calm provider notice to template plan when backup provider key is expired', async () => {
    vi.useFakeTimers();
    process.env.GROQ_API_KEY = 'gsk_validDemoKey';
    process.env.GROQ_KEY_EXPIRES_ON = '2026-12-22';
    vi.setSystemTime(new Date('2026-12-23T00:00:01Z'));

    vi.mocked(geminiModule.callGeminiStructured).mockRejectedValueOnce(
      new geminiModule.GeminiApiError('Primary overloaded', 503, true, 'AI_BUSY')
    );

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.generationSource).toBe('template');
    expect(plan.providerNotice).toContain('The backup AI provider is no longer active.');
    expect(plan.providerNotice).toContain('PromptWars Challenge 5');

    vi.useRealTimers();
    delete process.env.GROQ_KEY_EXPIRES_ON;
    delete process.env.GROQ_API_KEY;
  });

  it('attaches main provider notice to template plan when main Gemini key is invalid', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockRejectedValueOnce(
      new geminiModule.GeminiApiError('Gemini key unauthorized', 401, false, 'AI_INVALID_KEY')
    );

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.generationSource).toBe('template');
    expect(plan.providerNotice).toContain('The main AI provider is no longer active.');
    expect(plan.providerNotice).toContain('PromptWars Challenge 5');
  });

  it('handles Gemini service errors with 503 when fallback is disabled', async () => {
    vi.mocked(geminiModule.callGeminiStructured).mockRejectedValueOnce(
      new geminiModule.GeminiApiError('Service busy', 503, true, 'AI_BUSY')
    );

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-disable-template-fallback': 'true' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('AI Planning Service Alert');
    expect(data.code).toBe('AI_BUSY');
  });

  it('enforces rate limits with 429 when threshold exceeded', async () => {
    // Exhaust limiter
    for (let i = 0; i < 15; i++) {
      apiLimiter.check('127.0.0.1');
    }

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('Too Many Requests');
  });

  it('resiliently normalizes alternative AI structures and fills sparse items', async () => {
    const alternativeAiOutput = {
      title: 'Alternative Royal Celebration',
      budgetPlan: [
        { name: 'Palace Hall', targetEstimate: 800000 },
        { name: 'Catering', cost: 700000 },
      ],
      timeline: [
        {
          title: 'Initial Venue Visit',
          phase: 'Now',
          dueDate: '2026-11-20T10:00:00.000Z',
          daysBeforeEvent: 30,
        },
      ],
      vendorChecklist: [
        {
          name: 'Royal Caterers',
          description: 'Authentic cuisine',
          status: 'Booked',
          questionsToAsk: ['Are tastings available?', 'What is the deposit?'],
        },
      ],
      personalizedIdeas: {
        themes: ['Grand Heritage'],
      },
      statedAssumptions: ['Custom assumptions list'],
    };

    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce(alternativeAiOutput as any);

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intake: {
          ...validIntake,
          eventName: 'Pooja & Rohan Nuptials',
          muhuratTime: '10:30',
          muhuratLabel: 'Lagna Muhurat',
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.title).toBe('Pooja & Rohan Nuptials');
    expect(plan.eventName).toBe('Pooja & Rohan Nuptials');
    expect(plan.muhuratTime).toBe('10:30');
    expect(plan.muhuratLabel).toBe('Lagna Muhurat');
    // Sparse budget categories were filled up to at least 3
    expect(plan.budget.categories.length).toBeGreaterThanOrEqual(3);
    // Sparse timeline tasks were filled up to at least 4
    expect(plan.timeline.length).toBeGreaterThanOrEqual(4);
    // Sparse vendors were filled up to at least 3
    expect(plan.vendors.length).toBeGreaterThanOrEqual(3);
    expect(plan.budget.statedAssumptions).toContain('Custom assumptions list');
  });

  it('normalizes empty ideas and unknown phases gracefully', async () => {
    const sparseAiOutput = {
      eventOverview: { title: 'Minimalist Gathering' },
      budget: {
        categories: [
          { name: 'Venue', minEstimate: 200000, maxEstimate: 300000, targetEstimate: 250000 },
          { name: 'Food', minEstimate: 300000, maxEstimate: 400000, targetEstimate: 350000 },
          { name: 'Audio', minEstimate: 100000, maxEstimate: 150000, targetEstimate: 120000 },
        ],
      },
      timeline: [
        { title: 'Step 1', phase: 'UnknownPhase', dueDate: 'invalid-date' },
        { title: 'Step 2', phase: 'Now' },
        { title: 'Step 3', phase: 'Next 7 days' },
        { title: 'Step 4', phase: 'Event week' },
      ],
      vendors: [
        { categoryName: 'V1', questionsToAsk: ['Q1', 'Q2'] },
        { categoryName: 'V2', questionsToAsk: ['Q1', 'Q2'] },
        { categoryName: 'V3', questionsToAsk: ['Q1', 'Q2'] },
      ],
      ideas: {},
    };

    vi.mocked(geminiModule.callGeminiStructured).mockResolvedValueOnce(sparseAiOutput as any);

    const req = new Request('http://localhost:3000/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake: validIntake }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.title).toBe('Minimalist Gathering');
    expect(plan.ideas.themes.length).toBeGreaterThanOrEqual(1);
    expect(plan.ideas.dietaryNotes.length).toBeGreaterThanOrEqual(1);
    const step1 = plan.timeline.find((t: { title: string }) => t.title === 'Step 1');
    expect(step1).toBeDefined();
    expect(step1?.dueDate).toBe(validIntake.date);
  });
});

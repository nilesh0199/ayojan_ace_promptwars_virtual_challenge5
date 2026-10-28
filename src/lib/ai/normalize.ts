import { TIMELINE_PHASES } from '../constants';

/**
 * Normalizes raw AI output to fix harmless variations:
 * - casing on phases and vendor statuses
 * - known top-level aliases (budgetPlan -> budget, vendorChecklist -> vendors, personalizedIdeas -> ideas)
 * - numbers passed as strings (e.g. "100000" -> 100000)
 * - full ISO timestamps in dueDate (extracting YYYY-MM-DD)
 * - missing item IDs (cat-1, task-1, vendor-1)
 *
 * CRITICAL RULE: Never invents content to fill missing sections.
 * Missing sections (budget, timeline, vendors, ideas) remain missing
 * so strict schema validation and repair retries function properly.
 */
export function normalizePlanAiOutput(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return raw;
  }

  const obj = raw as Record<string, any>;

  // 1. Title: harmless alias resolution
  const suggestedTitle =
    obj.suggestedTitle ??
    obj.title ??
    obj.eventOverview?.title ??
    obj.event_details?.title ??
    obj.eventDetails?.title;

  // 2. Budget: harmless alias & number coercion
  const rawBudget =
    obj.budget ??
    obj.budgetPlan ??
    obj.budget_plan ??
    obj.budget_allocation ??
    obj.budgetAllocation;

  let budget: any = undefined;

  if (Array.isArray(rawBudget)) {
    // Array of categories directly
    budget = {
      categories: normalizeCategories(rawBudget),
      contingencyPercent: 10,
      taxServiceChargePercent: 5,
      statedAssumptions: ['Planning allocation estimate'],
    };
  } else if (rawBudget && typeof rawBudget === 'object') {
    let rawCats: any[] | undefined = undefined;
    if (Array.isArray(rawBudget.categories)) {
      rawCats = rawBudget.categories;
    } else {
      // Key-value dictionary e.g. { "venue": 100000, "decor": 50000 }
      const entries = Object.entries(rawBudget).filter(
        ([k, v]) =>
          !['contingencyPercent', 'taxServiceChargePercent', 'statedAssumptions'].includes(k) &&
          (typeof v === 'number' ||
            (typeof v === 'string' && !isNaN(Number(v))) ||
            (typeof v === 'object' && v !== null))
      );
      if (entries.length > 0) {
        rawCats = entries.map(([key, val], idx) => {
          const cleanName = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
          const amt =
            typeof val === 'number'
              ? val
              : typeof val === 'string' && !isNaN(Number(val))
              ? Number(val)
              : Number((val as any)?.targetEstimate ?? (val as any)?.cost ?? (val as any)?.amount ?? 100000);
          return {
            id: `cat-${idx + 1}`,
            name: cleanName,
            targetEstimate: amt,
            minEstimate: Math.round(amt * 0.85),
            maxEstimate: Math.round(amt * 1.15),
            notes: 'Planning allocation',
          };
        });
      }
    }

    budget = {
      categories: rawCats ? normalizeCategories(rawCats) : undefined,
      contingencyPercent:
        typeof rawBudget.contingencyPercent !== 'undefined'
          ? Number(rawBudget.contingencyPercent)
          : 10,
      taxServiceChargePercent:
        typeof rawBudget.taxServiceChargePercent !== 'undefined'
          ? Number(rawBudget.taxServiceChargePercent)
          : 5,
      statedAssumptions:
        Array.isArray(rawBudget.statedAssumptions) && rawBudget.statedAssumptions.length > 0
          ? rawBudget.statedAssumptions.map(String)
          : Array.isArray(obj.statedAssumptions) && obj.statedAssumptions.length > 0
          ? obj.statedAssumptions.map(String)
          : ['Planning allocation estimate'],
    };
  }

  // 3. Timeline: harmless phase casing, date slicing, string number coercion
  const rawTimeline =
    obj.timeline ??
    obj.schedule ??
    obj.tasks;

  const timeline = Array.isArray(rawTimeline)
    ? rawTimeline.map((t: any, idx: number) => {
        if (typeof t !== 'object' || t === null) return t;
        const rawPhase = String(t.phase || '').trim();
        // Case-insensitive phase matching
        const matchedPhase =
          TIMELINE_PHASES.find((p) => p.toLowerCase() === rawPhase.toLowerCase()) || t.phase;

        let dueDate = t.dueDate;
        if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
          dueDate = dueDate.slice(0, 10);
        }

        const taskTitle =
          typeof t.title === 'string'
            ? t.title.trim()
            : typeof t.name === 'string'
            ? t.name.trim()
            : t.title;

        return {
          id: typeof t.id === 'string' && t.id.trim() ? t.id.trim() : `task-${idx + 1}`,
          phase: matchedPhase,
          title: taskTitle,
          description:
            typeof t.description === 'string'
              ? t.description.trim()
              : taskTitle ?? '',
          dueDate,
          owner: typeof t.owner === 'string' && t.owner.trim() ? t.owner.trim() : 'Host',
          completed: Boolean(t.completed),
          daysBeforeEvent:
            typeof t.daysBeforeEvent !== 'undefined'
              ? Math.round(Number(t.daysBeforeEvent))
              : 0,
        };
      })
    : undefined;

  // 4. Vendors: harmless alias resolution, status casing
  const rawVendors =
    obj.vendors ??
    obj.vendorChecklist ??
    obj.vendor_checklist ??
    obj.vendors_and_services ??
    obj.vendorServices;

  const vendors = Array.isArray(rawVendors)
    ? rawVendors.map((v: any, idx: number) => {
        if (typeof v !== 'object' || v === null) return v;
        const rawStatus = String(v.status || '').trim().toLowerCase();
        let status = 'Shortlisted';
        if (rawStatus === 'booked') status = 'Booked';
        else if (rawStatus === 'contacted') status = 'Contacted';
        else if (rawStatus === 'shortlisted') status = 'Shortlisted';

        return {
          id: typeof v.id === 'string' && v.id.trim() ? v.id.trim() : `vendor-${idx + 1}`,
          categoryName:
            typeof v.categoryName === 'string'
              ? v.categoryName.trim()
              : typeof v.name === 'string'
              ? v.name.trim()
              : v.categoryName,
          vendorTypeDescription:
            typeof v.vendorTypeDescription === 'string'
              ? v.vendorTypeDescription.trim()
              : typeof v.description === 'string'
              ? v.description.trim()
              : v.vendorTypeDescription ?? '',
          status,
          questionsToAsk: Array.isArray(v.questionsToAsk)
            ? v.questionsToAsk.map(String)
            : v.questionsToAsk,
          verifyWithVendorNotice: 'Verify with the vendor',
          notes: typeof v.notes === 'string' ? v.notes.trim() : '',
        };
      })
    : undefined;

  // 5. Ideas: harmless alias resolution
  const rawIdeas =
    obj.ideas ??
    obj.personalizedIdeas ??
    obj.personalized_ideas;

  const ideas =
    rawIdeas && typeof rawIdeas === 'object'
      ? {
          themes: Array.isArray(rawIdeas.themes) ? rawIdeas.themes.map(String) : undefined,
          dietaryNotes: Array.isArray(rawIdeas.dietaryNotes)
            ? rawIdeas.dietaryNotes.map(String)
            : undefined,
          activities: Array.isArray(rawIdeas.activities)
            ? rawIdeas.activities.map(String)
            : undefined,
          decor: Array.isArray(rawIdeas.decor) ? rawIdeas.decor.map(String) : undefined,
        }
      : undefined;

  return {
    suggestedTitle:
      typeof suggestedTitle === 'string' ? suggestedTitle.trim() : suggestedTitle,
    budget,
    timeline,
    vendors,
    ideas,
  };
}

function normalizeCategories(rawCats: any[]): any[] {
  return rawCats.map((c: any, idx: number) => {
    if (typeof c !== 'object' || c === null) return c;
    const targetAmt =
      typeof c.targetEstimate !== 'undefined'
        ? Number(c.targetEstimate)
        : typeof c.allocatedAmount !== 'undefined'
        ? Number(c.allocatedAmount)
        : typeof c.cost !== 'undefined'
        ? Number(c.cost)
        : typeof c.amount !== 'undefined'
        ? Number(c.amount)
        : undefined;

    const minAmt =
      typeof c.minEstimate !== 'undefined'
        ? Number(c.minEstimate)
        : typeof targetAmt === 'number' && !isNaN(targetAmt)
        ? Math.round(targetAmt * 0.85)
        : undefined;

    const maxAmt =
      typeof c.maxEstimate !== 'undefined'
        ? Number(c.maxEstimate)
        : typeof targetAmt === 'number' && !isNaN(targetAmt)
        ? Math.round(targetAmt * 1.15)
        : undefined;

    return {
      id: typeof c.id === 'string' && c.id.trim() ? c.id.trim() : `cat-${idx + 1}`,
      name:
        typeof c.name === 'string'
          ? c.name.trim()
          : typeof c.categoryName === 'string'
          ? c.categoryName.trim()
          : typeof c.title === 'string'
          ? c.title.trim()
          : c.name,
      minEstimate: minAmt,
      maxEstimate: maxAmt,
      targetEstimate: targetAmt ?? minAmt ?? 0,
      notes: typeof c.notes === 'string' ? c.notes.trim() : 'Planning allocation',
    };
  });
}

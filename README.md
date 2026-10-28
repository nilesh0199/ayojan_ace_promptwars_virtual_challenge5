# Aayojan Ace

> "Your celebration, perfectly planned."

- **Live Demonstration**: [https://ayojan-ace.vercel.app/](https://ayojan-ace.vercel.app/)
- **Source Code Repository**: [https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5](https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5)

Aayojan Ace is an intelligent, culture-aware celebration and event planning assistant designed specifically for Indian weddings, milestone birthdays, and community gatherings. Its name reflects its mission: *Aayojan* (आयोजन) is the Hindi word for organizing an event, while *Ace* signifies expert execution. Built with Next.js, Google Gemini, and Firebase, it transforms minimal celebration parameters into an actionable, comprehensive event plan featuring realistic budget allocations, a phased milestone timeline with invitation deadlines, vendor interview questions, and personalized cultural concepts. When circumstances change, Aayojan Ace intelligently rebalances only the affected components, presenting transparent before-and-after diffs with complete version history and deterministic arithmetic guarantees.

---

## The Challenge

> *"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."*  
> — *PromptWars Challenge 5: Celebration & Event Planner*

### What It Does
Organizing milestone celebrations involves balancing complex cultural traditions, multi-vendor coordination, tight budgets, and shifting timelines. Traditional spreadsheets are prone to calculation errors, lack cultural understanding, and cannot adapt when budgets or guest counts change.

Aayojan Ace solves this by combining the creative synthesis of generative AI with the reliability of deterministic code. Users enter their celebration type, city, date, guest count, total budget, style or culture, and non-negotiables—or pick from curated Indian regional presets. Aayojan Ace immediately produces an itemized, realistic budget strictly fitted within their financial ceiling, an event timeline reflowed to their exact calendar date, actionable vendor discovery checklists, and culturally aligned rituals and dietary recommendations.

---

## How This Meets the Challenge

Every core requirement mandated by the challenge brief is delivered with dedicated screens, pure business logic, and automated tests:

- **Weddings, Birthdays, and Community Events**:
  - **Screen**: Landing Page ([`src/app/page.tsx`](file:///src/app/page.tsx)) and Plan Creator ([`src/app/plan/page.tsx`](file:///src/app/plan/page.tsx)) with Intake Form ([`src/components/intake-form.tsx`](file:///src/components/intake-form.tsx)).
  - **Feature**: Professional landing page with GSAP ScrollTrigger and Lenis smooth scrolling. Dedicated Plan Creator with native support for Indian Weddings, Birthdays, and Community Events, plus six editable presets: *Indian Wedding* (Jaipur), *Nikah & Walima* (Hyderabad), *Church Wedding & Reception* (Kochi), *Griha Pravesh / Housewarming* (Bengaluru), *Diwali Community Gathering* (Mumbai), and *College Annual Fest* (Delhi). Submitting an unchanged preset or clicking an example plan triggers an honest 3-second preparation loader (1 second under reduced motion) that computes reflowed dates relative to today and opens a prepared, schema-valid plan with realistic benchmark budgets and populated risk registers without external AI calls. Modifying any detail immediately directs the request to Google Gemini (or backup AI) to synthesize a custom plan.
  - **Source Files**: [`src/lib/constants.ts`](file:///src/lib/constants.ts) (`EVENT_TYPES`, `EVENT_PRESETS`), [`src/data/preparedPlans.ts`](file:///src/data/preparedPlans.ts), and [`src/data/savedExamples.ts`](file:///src/data/savedExamples.ts).

- **Budgets**:
  - **Screen**: Workspace Budget Tab ([`src/components/workspace/tab-budget.tsx`](file:///src/components/workspace/tab-budget.tsx)).
  - **Feature**: Itemized category ledger lines with Min, Target, and Max estimate ranges, stated planning assumptions, a 5-10% contingency buffer, a standard statutory tax allowance, and a horizontal stacked allocation bar. Hard ceiling validator enforces that all category targets plus contingency and tax never exceed total budget.
  - **Source Files**: [`src/lib/budget.ts`](file:///src/lib/budget.ts) (`calculateBudgetSummary`, `formatCurrency`) and [`src/lib/budget-benchmarks.ts`](file:///src/lib/budget-benchmarks.ts) (`validateAndFitBudget`).

- **Timelines**:
  - **Screen**: Workspace Timeline Tab ([`src/components/workspace/tab-timeline.tsx`](file:///src/components/workspace/tab-timeline.tsx)).
  - **Feature**: Phased vertical milestone track (*Now*, *Next 7 days*, *Next 30 days*, *Event week*, *Event day*), each task featuring an exact calendar due date, assigned owner, linked category cost, and interactive completion checkboxes. Includes pure client-side `.ics` export with 1-day advance alarms and code-driven date reflow.
  - **Source Files**: [`src/lib/timeline.ts`](file:///src/lib/timeline.ts) (`reflowTimelineDates`) and [`src/lib/ics.ts`](file:///src/lib/ics.ts) (`generateTimelineIcs`).

- **Vendor Checklists**:
  - **Screen**: Workspace Vendors Tab ([`src/components/workspace/tab-vendors.tsx`](file:///src/components/workspace/tab-vendors.tsx)).
  - **Feature**: Screening checklist categories with contract lifecycle status dropdowns (*Shortlisted*, *Contacted*, *Quoted*, *Booked*, *Contract received*), prominent **"Verify with the vendor"** label, and key discovery interview questions. Strictly recommends vendor roles and screening criteria; never invents fake contact details or fixed quotes.
  - **Source Files**: [`src/components/workspace/tab-vendors.tsx`](file:///src/components/workspace/tab-vendors.tsx) and [`src/lib/schemas.ts`](file:///src/lib/schemas.ts) (`vendorItemSchema`).

- **Personalized Ideas**:
  - **Screen**: Workspace Ideas Tab ([`src/components/workspace/tab-ideas.tsx`](file:///src/components/workspace/tab-ideas.tsx)).
  - **Feature**: Creative concepts tailored to regional Indian traditions, detailed menu and dietary guidelines (dedicated Pure Jain counter protocols, satvik catering, vegan options, allergy awareness), interactive guest rituals, and cultural decor accents.
  - **Source Files**: [`src/components/workspace/tab-ideas.tsx`](file:///src/components/workspace/tab-ideas.tsx) and [`src/lib/schemas.ts`](file:///src/lib/schemas.ts) (`personalizedIdeasSchema`).

---

## HOW GENAI IS USED

Aayojan Ace treats Generative AI as an intelligent synthesis engine, using deterministic algorithms to enforce math, validation, and boundaries.

### 1. Plan Generation
- **What It Does**: Crafts a complete, cohesive celebration blueprint from intake parameters in a single structured call.
- **Input Received**: Event type, city, date, guest count, total budget, currency, style or culture, non-negotiables, optional event name, and optional ceremony / muhurat time (as advised by your priest, pandit, imam or pastor).
- **Structured Output Returned**: Schema-validated JSON containing budget categories (with min/target/max estimates and assumptions), phased timeline tasks (with timing offsets and owners), vendor checklist (with screening questions), and personalized cultural ideas.
- **Guardrails**: Output is validated against `eventPlanSchema` via Zod. Estimates are passed to `validateAndFitBudget()` which enforces realistic Indian city tier benchmarks (Metro, Tier-2, Tier-3) and scales categories so total committed costs never exceed the user's budget ceiling.
- **Source Files**: [`src/app/api/plan/generate/route.ts`](file:///src/app/api/plan/generate/route.ts), [`src/lib/prompts.ts`](file:///src/lib/prompts.ts) (`buildPlannerPrompt`), and [`src/lib/budget-benchmarks.ts`](file:///src/lib/budget-benchmarks.ts).

### 2. Adaptive Follow-Up Clarifications
- **What It Does**: Identifies ambiguous, missing, or conflicting requirements before generating a plan.
- **Input Received**: Initial user intake parameters.
- **Structured Output Returned**: `FollowUpResponse` containing `needsFollowUp: boolean`, an optional clarifying question with up to 4 suggested quick-response options, and an explanation of why clarification helps.
- **Guardrails**: Strictly limited to at most 1 follow-up question per session to avoid intake fatigue. Users can skip at any time with a dedicated "Skip and generate plan" button.
- **Source Files**: [`src/app/api/plan/followup/route.ts`](file:///src/app/api/plan/followup/route.ts) and [`src/lib/prompts.ts`](file:///src/lib/prompts.ts) (`buildFollowUpPrompt`).

### 3. Budget-Aware Replanning
- **What It Does**: When parameters change mid-planning (such as a budget cut, headcount increase, or date change), the AI rebalances *only the affected items* rather than regenerating the entire plan.
- **Input Received**: Complete current plan JSON plus the specific user changes (e.g. `totalBudget: 400000`, `guestCount: 200`, or a single category adjustment).
- **Structured Output Returned**: `ReplanDiffResponse` containing modified budget items, modified timeline tasks, a clear summary of what changed, the reasoning behind each adjustment, and 2-3 trade-off options (e.g., "Shift venue to an off-peak weekday to preserve luxury catering").
- **Guardrails**: Pure TypeScript diff engine ([`src/lib/diff.ts`](file:///src/lib/diff.ts)) compares the proposal with the active plan. The user reviews a visual before/after diff modal and explicitly clicks "Accept Changes" or "Keep Current Plan". Accepted diffs push the previous state onto an undo stack and create an immutable version snapshot.
- **Source Files**: [`src/app/api/plan/replan/route.ts`](file:///src/app/api/plan/replan/route.ts) and [`src/lib/diff.ts`](file:///src/lib/diff.ts).

### 4. Operational Risk Check ("What Could Go Wrong")
- **What It Does**: Conducts a proactive contingency audit identifying realistic operational risks specific to the host city, season, and event scale.
- **Input Received**: Full active celebration plan context.
- **Structured Output Returned**: `RiskRegister` containing categorized risks (weather contingencies, municipal noise permits and 10 PM sound cutoffs, single points of failure, dietary cross-contamination, and vendor payment schedules), each with a severity rating (`low`, `medium`, `high`) and actionable prevention protocols.
- **Guardrails**: Scoped strictly to operational event mechanics; avoids sensationalism. In-memory caching prevents duplicate calls for the same plan.
- **Source Files**: [`src/app/api/plan/risks/route.ts`](file:///src/app/api/plan/risks/route.ts) and [`src/lib/prompts.ts`](file:///src/lib/prompts.ts) (`buildRiskCheckPrompt`).

### 5. Culturally Aware Event Name Suggestions
- **What It Does**: Suggests 4 creative, elegant celebration titles suited to the event type, regional style, and city.
- **Input Received**: Event type, city, style/culture, and optional host names.
- **Structured Output Returned**: `NameSuggestionsResponse` containing an array of 4 distinct names (e.g. "Aarav & Diya's Royal Pheras", "The Mehta Golden Jubilee", "Basant Community Utsav").
- **Guardrails**: Validated with Zod; falls back immediately to a curated regional title generator if the AI provider is unavailable. Rate-limited to prevent abuse.
- **Source Files**: [`src/app/api/plan/names/route.ts`](file:///src/app/api/plan/names/route.ts) and [`src/components/workspace/workspace-header.tsx`](file:///src/components/workspace/workspace-header.tsx).

### 6. Ask AI (Celebration Doubts & Questions)
- **What It Does**: Provides an in-workspace interactive advisory tab where users ask specific questions or explore options for their active celebration.
- **Input Received**: Compact context of the active plan (city, date, guest count, budget, ceremony / muhurat timing as advised by officiant, style) plus the user's specific inquiry.
- **Structured Output Returned**: `AskAiResponse` containing a focused, practical answer formatted with safe Markdown bolding and bullet lists.
- **Guardrails**: Character limit capped at 500 characters. Answers are parsed through a safe text renderer with zero raw HTML injection. Rate-limited to 15 requests per minute per IP.
- **Source Files**: [`src/app/api/plan/ask/route.ts`](file:///src/app/api/plan/ask/route.ts) and [`src/components/workspace/tab-ask-ai.tsx`](file:///src/components/workspace/tab-ask-ai.tsx).

### Where GenAI Is Deliberately NOT Used
To ensure absolute reliability, mathematical accuracy, and user safety, generative AI is intentionally bypassed for all core calculations:
- **Budget Math and Hard Ceiling Enforcement**: Summing category targets, computing contingency allowances, calculating statutory taxes, detecting over-budget states, and scaling allocations are handled entirely in pure TypeScript ([`src/lib/budget.ts`](file:///src/lib/budget.ts) and [`src/lib/budget-benchmarks.ts`](file:///src/lib/budget-benchmarks.ts)). AI models frequently make arithmetic errors; deterministic code never does.
- **Timeline Date Reflow**: When an event date is rescheduled, shifting task due dates, recalculating days-before-event offsets, and reassigning milestone phases are computed in pure TypeScript ([`src/lib/timeline.ts`](file:///src/lib/timeline.ts)).
- **Guest Invitation Milestones**: Critical guest outreach deadlines (Save-the-Date at 8 weeks, Invitations at 3 weeks, RSVP follow-ups at 10 days, Final headcount at 5 days) are deterministically injected by code to ensure timing accuracy.
- **Ceremony / Muhurat Time**: Auspicious or ceremony timing is entered strictly by the user as advised by their priest, pandit, imam or pastor. Aayojan Ace never invents or guesses a ceremony / muhurat time, honoring cultural and religious respect.
- **Calendar & PDF Exports**: Google Calendar URL templates, standard RFC 5545 `.ics` file generation, and executive PDF reports are generated entirely via deterministic client-side routines.

### Guardrails & Safety Architecture
- **Structured Output Schema Enforcement**:
  - **Google Gemini**: The plan schema (`planGenerationAiSchema`) is converted into an OpenAPI 3.0 / Gemini `SchemaUnion` via `zodToGeminiSchema()` and supplied as `config.responseSchema` with `responseMimeType: 'application/json'`. This binds Gemini's token sampling to constrained decoding, guaranteeing that the model returns the exact field names (`suggestedTitle`, `budget`, `timeline`, `vendors`, `ideas`).
  - **Groq Cloud**: Configured with JSON mode (`response_format: { type: 'json_object' }`). The exact required field names and an illustrative structural JSON skeleton generated via `generateSchemaSkeleton()` are injected directly into the system prompt.
- **Explicit Small Normalizer (`normalizePlanAiOutput`)**:
  - Fixes harmless formatting variations without syntactic friction: casing on phases and vendor statuses, known top-level aliases (`budgetPlan` -> `budget`, `vendorChecklist` -> `vendors`, `personalizedIdeas` -> `ideas`, `title` -> `suggestedTitle`), string-encoded numbers coerced into JavaScript numbers, and ISO timestamp date slicing (`YYYY-MM-DD`).
  - **Strict Content Integrity Rule**: The normalizer strictly **never invents content** to fill missing sections. If an AI response omits required sections (such as budget, timeline, vendors, or ideas), the fields remain missing/undefined so that strict Zod validation fails cleanly.
- **Private Single Repair Retry on Validation Failure**:
  - If schema validation fails, the system executes an automated single repair retry via `executeWithRepairRetry()`.
  - The repair prompt sends back **only the list of failing field paths** (e.g. `["budget.categories", "vendors"]`) and zero user text, completely shielding user prompt data from retry payloads.
  - If the repaired JSON still fails validation, the system falls back seamlessly to the next AI provider in the cascade, and ultimately to the built-in deterministic template planner.
- **Safe Server-Side Operational Logging**:
  - On every validation failure, the server logs exactly one safe line containing provider, model, received top-level keys, and failing field paths:
    `[AI Validation] provider=<p> model=<m> receivedKeys=[...] failingPaths=[...]`
  - Values, user prompts, and API keys are strictly never logged.
  - In the event of a validation fallback, the UI displays the failing field count in the Reference line (e.g., `Reference: AI_VALIDATION_FAILED (3 fields)`) without exposing internal field names or sensitive content.
- **Delimited Untrusted Inputs**: All user-provided strings are sanitized, JSON-encoded, and wrapped within explicit `<<<USER_INPUT_DATA>>>` boundary tags with instructions instructing the model to treat content as passive data.
- **No Fabricated Vendor Entities**: Prompts explicitly forbid generating fake telephone numbers, fabricated company names, or guaranteed quotes. Vendors are listed by professional role with screening questions.
- **Estimate Ranges with Stated Assumptions**: All financial figures present Minimum, Target, and Maximum ranges accompanied by transparent planning assumptions.
- **Zero Raw Error Leakage & Quota Awareness**: Upstream API errors, model timeouts, and status codes are never displayed directly to users. The backend maps errors to typed error codes (`AI_BUSY`, `AI_QUOTA_EXHAUSTED`, `AI_TIMEOUT`, `AI_NOT_CONFIGURED`, `AI_INVALID_KEY`, `AI_MODEL_NOT_FOUND`, `AI_VALIDATION_FAILED`, `AI_BACKUP_KEY_EXPIRED`). Daily quota exhaustion (429 with daily/per-day limits) is cleanly differentiated from short rate limits; daily exhaustion trips a 30-minute circuit breaker cooldown and displays a calm UI explanation with buttons for "Load a prepared plan" and "Retry later".
- **Request Conservation**: Adaptive follow-ups (`/api/plan/followup`) are dispatched only when user intake is genuinely ambiguous or contradictory (evaluated via local heuristic `isIntakeUnclear`), guaranteeing plan generation operates as a single AI call whenever possible.
- **Cache Optimization**: In-memory LRU cache uses deterministic canonical payload keys so identical generation requests reuse cached plans instantly with zero latency or token burn, while errors and template fallbacks are never cached.

### Multi-Provider Resilience Hierarchy
Aayojan Ace incorporates a 4-tier provider cascade with per-model circuit breakers and a total execution time budget:
1. **Google Gemini Primary Model**: Primary AI engine configured via `GEMINI_MODEL` with up to 2 retries using exponential backoff and randomized jitter.
2. **Google Gemini Fallback Model**: Secondary Gemini model configured via `GEMINI_FALLBACK_MODEL`, automatically invoked if the primary model encounters capacity limits or server unavailability.
3. **Groq Cloud Provider**: Optional secondary AI provider using OpenAI-compatible chat completions with JSON mode. Fully configurable through `GROQ_MODEL` with no hardcoded dependencies. If Groq reports model-not-found (404), it disables Groq for the session with `AI_MODEL_NOT_FOUND`. Hardened against key expiration (`GROQ_KEY_EXPIRES_ON`) and 401/403 rejection.
4. **Built-in Deterministic Template Planner (`template-planner.ts`)**: Last-resort fallback that runs locally with zero external network dependency, generating a complete, realistic, schema-verified plan in under 1 millisecond.
- **Visual Non-Primary Indicators**: When a plan is drafted by a backup AI provider or the built-in template planner, an accessible banner and badge appear with a single-click **"Try again with AI"** option.

---

## ✅ Quality

---

### 🖌️ Code quality

- **TypeScript `strict`**: TypeScript `strict` mode enforced across the codebase; zero untyped `any`, zero `@ts-ignore`, zero non-null assertions in financial, timeline, and boundary logic.
- **ESLint & CI Hygiene**: ESLint with `next/core-web-vitals`, `jsx-a11y`, and `react-hooks`; zero console statements outside documented allowlist; zero unallowlisted `eslint-disable` comments; automated CI pipeline running `lint`, `typecheck`, and `test:coverage`.
- **Pure Domain Engine**: Business logic lives only in `src/lib/` as pure, deterministic functions (`budget.ts`, `timeline.ts`, `diff.ts`, `ics.ts`, `budget-benchmarks.ts`); components render and dispatch, nothing more. API handlers are thin: guard (`checkRequestSafety`), validate (`schema.safeParse`), call (`executeAiCascade`), validate (`safeParse`), respond.
- **Small, Single-Purpose Modules**: Every component is modular and focused (all under 250 lines) with one shared canonical schema layer ([`src/lib/schemas.ts`](file:///src/lib/schemas.ts)) used across client forms, server routes, AI constrained decoding, and test fixtures.
- **Automated Architecture Tests**: Continuous structural enforcement ([`src/tests/architecture/conventions.test.ts`](file:///src/tests/architecture/conventions.test.ts)) verifying `src/lib` never imports UI/app code, all API handlers export `maxDuration`, zero `dangerouslySetInnerHTML` outside theme bootstrap, zero unallowlisted `eslint-disable`, and centralized model constants.
- **100% Test Pass Rate & High Coverage**: **605 tests passing across 51 test suites** with **91.65% line coverage**, **97.12% function coverage**, zero warnings, and automated WCAG 2.1 AA accessibility verification (`jest-axe`) on all dialogs and screens in both light and dark modes.

---

### 1. Layered Architecture & Separation of Concerns
The codebase strictly enforces three architectural tiers, verified continuously by automated architecture tests:
- **Pure Business Logic Layer (`src/lib/`)**: Houses all domain calculations, financial formulas, date reflow algorithms, calendar generators, prompt builders, schema definitions, and provider cascade orchestrators. It has **zero dependencies** on UI components, React hooks, or Next.js App Router views. All modules are 100% testable in pure Node.js environments.
- **UI Presentation Layer (`src/components/`)**: Composed of accessible React presentation components, modals, and design-system controls. Components consume business logic through typed context stores and never perform rogue arithmetic or unvalidated data mutations.
- **Route & Infrastructure Layer (`src/app/`)**: Next.js App Router pages and serverless API handlers. Every plan API route enforces `maxDuration = 60`, wraps requests in unified safety checks, and handles errors through a centralized error mapper.

### 2. Strict TypeScript & Boundary Validation
- **Strict Typing (`strict: true`, `noImplicitAny: true`)**: Zero usage of untyped `any` across domain models. All interfaces, input forms, and API payloads are strictly inferred from Zod schemas (`z.infer<typeof schema>`).
- **Validation at Every Boundary**:
  1. *Client Intake Boundary*: Form inputs are validated in real-time with `intakeFormSchema` before triggering server network requests.
  2. *API Ingress Boundary*: Handlers validate incoming JSON payloads with dedicated Zod schemas (`requestPayloadSchema`, `replanRequestPayloadSchema`, `askAiRequestSchema`).
  3. *AI Structured Output Boundary*: Model responses are constrained by OpenAPI 3.0 / Gemini schemas (`zodToGeminiSchema()`) or Groq JSON mode with schema skeletons, validated against `planGenerationAiSchema` via `safeParse()`.
  4. *Benchmark & Hard Ceiling Boundary*: AI allocations pass through `validateAndFitBudget()` to enforce Indian market tiers and ensure category sums plus tax and contingency never exceed the user's budget ceiling.
  5. *Master Plan Boundary*: Completed plans are verified against the master `eventPlanSchema` before caching and client transmission.
  6. *Cloud Persistence Boundary*: Firestore security rules enforce field whitelisting, string lengths, and array boundaries at the database storage layer.

### 3. Centralized Typed Error Codes & Safe Logging
- **Exhaustive Error Code Union**: All server errors map to a typed `GeminiErrorCode` union (`'AI_BUSY' | 'AI_QUOTA_EXHAUSTED' | 'AI_TIMEOUT' | 'AI_NOT_CONFIGURED' | 'AI_INVALID_KEY' | 'AI_BACKUP_KEY_EXPIRED' | 'AI_MODEL_NOT_FOUND' | 'AI_VALIDATION_FAILED' | 'AI_NETWORK_ERROR' | 'HOSTING_TIMEOUT' | 'AI_ERROR'`).
- **Safe Server-Only Operational Logging**: Schema validation failures log diagnostic metadata only (`provider`, `model`, `receivedKeys`, `failingPaths`). User prompts, payload values, and API keys are strictly never logged. The user-facing Reference line displays only the failing field count (e.g. `Reference: AI_VALIDATION_FAILED (3 fields)`), preventing any leakage of internal schema structures.

### 4. Comprehensive Testing Strategy
The test suite spans 5 distinct testing tiers to guarantee end-to-end correctness:
1. **Unit Tests (`src/tests/unit/`)**: Verify pure algorithms in isolation—budget allocation math, Indian market benchmarks, timeline date reflow, guest communication offsets, ICS calendar serialization, Google Calendar URLs, before/after diff computation, LRU caching, token bucket rate limiting, and error mapping.
2. **API Route Tests (`src/tests/api/`)**: Integration tests against Next.js route handlers (`/api/plan/generate`, `/api/plan/followup`, `/api/plan/replan`, `/api/plan/risks`, `/api/plan/names`, `/api/plan/ask`, `/api/health`, `/api/health/probe`), testing valid generation, caching, rate limiting, and error failover.
3. **Component & User-Event Tests (`src/tests/components/`)**: Test interactive UI components (`IntakeForm`, `AiLoader`, `ReplanModal`, `PrintModal`, `SavePromptModal`, `TabAskAi`, `WorkspaceHeader`, `ThemeToggle`) using `@testing-library/react` and `@testing-library/user-event`.
4. **Accessibility (a11y) Tests (`src/tests/components/accessibility.test.tsx`)**: Automated WCAG 2.1 AA audits using `jest-axe` across every screen, dialog, and modal in both Light and Dark themes.
5. **Architecture & Convention Tests (`src/tests/architecture/conventions.test.ts`)**: Automated structural tests verifying codebase conventions:
   - `src/lib` has zero imports from `src/components` or `src/app`.
   - Every API route exports `maxDuration` (with documented health ping allowlist).
   - Zero `dangerouslySetInnerHTML` outside the documented layout theme bootstrap script.
   - Zero unallowlisted `eslint-disable` comments in `src`.
   - Zero `console.log` statements in `src`.
   - Zero dynamic computed `process.env[name]` accesses for `NEXT_PUBLIC_*` variables.
   - Centralized model name declarations exclusively in canonical constants.
   - Unified API endpoint safety checks and error mappers.

### 5. Verification Commands
```bash
# Run ESLint validation
npm run lint

# Run TypeScript typecheck
npm run typecheck

# Run test suite
npm test

# Run full test suite with v8 coverage report
npm run test:coverage

# Build optimized production bundle
npm run build
```

### 6. Checklist: How to Add a New AI Feature Safely
To introduce a new generative AI capability while preserving Aayojan Ace's safety and resilience guarantees, follow this checklist:
1. **Define Schema**: Create a strict Zod schema in [`src/lib/schemas.ts`](file:///src/lib/schemas.ts) with explicit string bounds, array ceilings, and default values.
2. **Delimit Inputs**: In [`src/lib/prompts.ts`](file:///src/lib/prompts.ts), wrap all untrusted user parameters using `wrapUntrustedData()` with system instructions treating content as passive data.
3. **Wire Provider Cascade**: Connect the prompt to [`executeAiCascade()`](file:///src/lib/ai/orchestrator.ts) or [`callGeminiStructured()`](file:///src/lib/gemini.ts) with normalizer support and automatic repair retries.
4. **Add Safe Error Mapping**: Ensure error handling catches exceptions through [`mapGeminiError()`](file:///src/lib/gemini.ts) and logs diagnostics exclusively via [`logSafeAiValidationFailure()`](file:///src/lib/ai/safe-logger.ts).
5. **Protect API Endpoint**: Secure the route handler with `checkRequestSafety(request)`, payload validation (`schema.parse()`), and centralized error mapping via `handleApiError(err)`.
6. **Provide Offline Template Fallback**: Implement a deterministic code fallback in [`src/lib/template-planner.ts`](file:///src/lib/template-planner.ts) to guarantee immediate offline response on complete provider unavailability.
7. **Write Fixture Tests**: Add unit tests in `src/tests/` with recorded malformed-output fixtures testing casing variations, aliases, missing fields, and truncated JSON.
8. **Verify Pipeline**: Run `npm run lint`, `npm run typecheck`, and `npm run test:coverage` to confirm all architecture conventions pass and coverage exceeds thresholds.

---

## Judging Criteria Evidence

### 1. Code Quality
- **Strict TypeScript**: `strict: true` and `noImplicitAny: true` enforced across the entire codebase. Zero `any` types; all API contracts and data models are strictly inferred from Zod schemas (`z.infer<typeof schema>`). Zero `@ts-ignore` comments in `src/`.
- **Clean ESLint**: Zero warnings, zero errors (`✔ No ESLint warnings or errors`) with Next.js Core Web Vitals, `jsx-a11y`, and `react-hooks`.
- **Layer Separation**: Strict separation between pure business logic ([`src/lib/`](file:///src/lib/)), UI presentation components ([`src/components/`](file:///src/components/)), and App Router endpoints ([`src/app/api/`](file:///src/app/api/)).
- **Architecture Tests**: Automated structural enforcement in CI ([`src/tests/architecture/conventions.test.ts`](file:///src/tests/architecture/conventions.test.ts)) guaranteeing layer boundaries, mandatory `maxDuration`, zero dangerous patterns, and centralized constants.
- **Documentation**: Comprehensive docstrings, architecture documentation ([`ARCHITECTURE.md`](file:///ARCHITECTURE.md)), architecture decision records ([`docs/DECISIONS.md`](file:///docs/DECISIONS.md)), and threat model ([`SECURITY.md`](file:///SECURITY.md)).

### 2. Security
- **Strict Server-Only Secrets**: `GEMINI_API_KEY`, `GEMINI_API_KEY_FALLBACK`, and `GROQ_API_KEY` are accessed strictly within server-side API routes and are excluded from client bundles.
- **Delimited Prompt Injection Defense**: User text is wrapped in `<<<USER_INPUT_DATA>>>` delimiters with system directives to treat input as passive data.
- **Token Bucket Rate Limiting**: Token bucket algorithm in [`src/lib/ratelimit.ts`](file:///src/lib/ratelimit.ts) (12 tokens max, 0.5 refill/sec, 15-minute stale eviction, 300KB request body ceiling).
- **HTTP Security Headers & CSP**: Configured in [`next.config.mjs`](file:///next.config.mjs) with strict Content Security Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- **Hardened Cloud Firestore Rules**: Published in [`firestore.rules`](file:///firestore.rules) enforcing document ownership (`request.auth.uid == userId`), strict key whitelisting (`keys().hasOnly([...])`), string length bounds, bounded array sizes, and immutable version snapshots (`allow update: if false;`).

### 3. Efficiency
- **Optimized Bundle Sizes (Next.js Production Build)**:
  - Shared First Load JS: **87.2 kB** (0.0 kB increase from baseline; GSAP and Lenis strictly localized)
  - Plan Creator / Home Route: **286 kB** (Route size: **9.32 kB**)
  - Saved Plans Route: **283 kB** (Route size: **6.7 kB**)
  - About Route: **283 kB** (Route size: **817 B**)
  - Privacy & Terms Routes: **283 kB** (Route size: **817 B**)
  - Workspace Route: **339 kB** (Route size: **62.6 kB**)
- **In-Memory LRU Cache**: Server-side cache in [`src/lib/cache.ts`](file:///src/lib/cache.ts) prevents redundant AI calls for identical celebration configurations.
- **Focused Replanning Payloads**: Replanning transmits only modified fields, significantly reducing token consumption and round-trip latency.
- **Fast Local Operations**: Date reflow, `.ics` file generation, budget calculations, and template planning run client-side in under 5 milliseconds.

### 4. Testing
- **100% Test Pass Rate**: **605 tests passed across 51 test suites**.
- **High Code Coverage (v8)**:
  - **Lines**: **91.65%** (Threshold: $\ge 85\%$)
  - **Branches**: **81.37%** (Threshold: $\ge 80\%$)
  - **Functions**: **97.12%**
  - **Statements**: **91.65%**
- **Comprehensive Test Spectrum**:
  - Unit tests for budget benchmarks, math, timeline reflow, calendar URLs, `.ics` generation, cache, rate limiting, and diff computation.
  - Component tests for IntakeForm, AiLoader, PrintModal, ReplanModal, SavePromptModal, TabAskAi, WorkspaceHeader, and ThemeToggle.
  - API endpoint integration tests for `/api/plan/generate`, `/api/plan/followup`, `/api/plan/replan`, `/api/plan/risks`, `/api/plan/names`, `/api/plan/ask`, and `/api/health`.
  - Automated accessibility suites running `jest-axe` across both Light and Dark themes.

### 5. Accessibility (a11y)
- **WCAG 2.1 AA Compliance**: Verified with automated `jest-axe` tests across all pages and interactive modals in both Light and Dark themes.
- **Motion Accessibility & GSAP Guardrails**: Every GSAP motion sequence is wrapped in `gsap.matchMedia()` targeting `(prefers-reduced-motion: no-preference)`. Under `prefers-reduced-motion: reduce`, all animations are skipped, rendering content instantly with standard CSS layout and visibility. Animations strictly modify only `transform` and `opacity`, never animate elements within `aria-live` or the `AiLoader`, and automatically clean up context and tweens on unmount.
- **Lenis Smooth Scroll Safeguards**: Lenis is initialized exclusively on narrative content pages (`/about`, `/privacy`, `/terms`). It is completely disabled when `prefers-reduced-motion: reduce` is active, on touch devices (`ontouchstart` or `maxTouchPoints > 0`), and during print media. All interactive inner scroll containers carry `data-lenis-prevent`.
- **Contrast Ratios**: Custom color palette in [`tailwind.config.ts`](file:///tailwind.config.ts) guarantees high contrast ($\ge 4.5:1$ for body text, $\ge 3:1$ for UI controls, $\ge 7:1$ for print). Verified by [`src/tests/unit/contrast.test.ts`](file:///src/tests/unit/contrast.test.ts).
- **Accessible AI Loading State**: `AiLoader` uses `role="status"` and `aria-live="polite"`. Respects `prefers-reduced-motion` by displaying a static icon instead of CSS rotation.
- **Keyboard Navigation**: Focus traps on all dialogs, Esc key to dismiss, Enter key to confirm, and visible `:focus-visible` outline rings throughout.
- **Touch Accessibility**: Minimum 44px touch targets on all buttons, chips, and navigation links.

### 6. Problem Statement Alignment
- **Tailored to Diverse Celebrations**: Direct support for weddings, milestone birthdays, and community gatherings with six comprehensive presets: *Indian Wedding* (Jaipur), *Nikah & Walima* (Hyderabad), *Church Wedding & Reception* (Kochi), *Griha Pravesh* (Bengaluru), *Diwali Utsav* (Mumbai), and *College Annual Fest* (Delhi).
- **Cultural & Religious Inclusivity**: Built-in support for ceremony and auspicious timing (*Ceremony / muhurat time as advised by your priest, pandit, imam or pastor*), Muslim celebrations (Nikah solemnization, certified halal feast, optional separate seating partition, timing set by family & religious guidance), Christian celebrations (church and parish officiant coordination, wedding rehearsal, reception timing confirmed with church), Hindu regional rituals (Pheras, Sangeet, Haldi, Pooja), and dietary accommodations (dedicated Pure Jain counters, certified halal catering, satvik protocols, vegan options).
- **Practical Planning Deliverables**: Complete budget ledgers, phased timelines, vendor screening questions with "Verify with the vendor" badges, risk registers, `.ics` calendar sync, and printable executive reports.

---

## Feature Tour

- **Plan Creator & Idea Chips**: Intake form with quick-pick chips for popular Indian cities, guest count tiers, budget amounts, regional styles, and non-negotiables. Includes AI event name suggestions and optional ceremony / muhurat time selection.
- **8-Tab Celebration Workspace**:
  - *Overview*: Executive summary fact sheet, ceremony / muhurat timing card (as advised by your priest, pandit, imam or pastor) with inline editor, budget allocation bar, milestone summary, and collapsible on-screen Master Plan report.
  - *Budget*: Itemized category ledger with Min/Target/Max estimate ranges, stated assumptions, 5-10% contingency buffer, tax allowance, and over-budget visual warnings.
  - *Timeline*: Phased milestone track (*Now*, *Next 7 days*, *Next 30 days*, *Event week*, *Event day*), interactive completion checkboxes, and date reflow.
  - *Vendors*: Screening categories with contract status dropdowns (*Shortlisted*, *Contacted*, *Quoted*, *Booked*, *Contract received*), "Verify with the vendor" badges, and discovery interview questions.
  - *Ideas*: Cultural themes, dietary & satvik protocols, guest rituals, and cultural decor accents.
  - *Risks*: Contingency analysis covering weather, noise cutoffs, dependency failure points, satvik/Jain protocols, and vendor payment schedules.
  - *Reminders*: Warning-free Google Calendar URL templates, standard `.ics` export with 1-day `VALARM` notifications, and advanced auto-sync OAuth panel.
  - *Ask AI*: Interactive celebration doubts tab scoped to plan context with starter chips, 500-char input, `AiLoader`, and markdown rendering.
- **Budget-Aware Replanning Diff Modal**: When plans change, users review a side-by-side comparison of old vs. new values, explanation of changes, and trade-offs before accepting.
- **Guest Invitations & Draft Modal**: Timeline tasks for invitations feature a "Draft invite" button generating customized messages with one-click Copy, WhatsApp sharing (`wa.me`), and Email sharing (`mailto`).
- **Cloud Persistence & Version Snapshots**: Dual-tier storage supporting friction-free guest mode (in-memory & local storage) and authenticated cloud mode (Google Auth + Firestore). Automatic subcollection version snapshots capped at 20 versions per plan.
- **Workspace Header Actions**:
  - *Inline Title Editing*: Click pencil icon to edit celebration name directly; Enter saves, Esc cancels.
  - *Change Plan*: Switch to another plan or create a new one, with unsaved changes confirmation dialog.
  - *Delete Plan*: Accessible confirmation dialog permanently deleting cloud plans or clearing memory in guest mode.
  - *Print & PDF Export*: Multi-scope dialog allowing export of the full master plan report or the current tab only.
- **About Page (`/about`)**: Explains what Aayojan Ace is, why it was created for PromptWars Challenge 5, author Nilesh Thipe, how it works, tech stack, responsible-AI notes, and contact links.
- **Editorial Design System**: Custom light paper notebook and dark surface themes with editorial typography (Playfair Display serif headings and JetBrains Mono data labels).
- **Mobile Responsive Layout**: Desktop left rail switches seamlessly to a thumb-accessible fixed bottom bar on mobile viewports.

---

## Architecture

### Data Flow Diagram
```
[ Browser / Client ]
  │
  ├── 1. Intake Form ───────► POST /api/plan/followup (Check ambiguity)
  │                                   │
  │   ◄── Clarifying Question ────────┘ (Max 1 question, optional)
  │
  ├── 2. Generate Plan ─────► POST /api/plan/generate
  │                                   │
  │                                   ├──► Server Cache Check (LRU)
  │                                   │        │ (Cache hit)
  │                                   │        └──────────────┐
  │                                   ▼                       ▼
  │                         [ AI Orchestrator ]       [ Return Plan ]
  │                                   │                       ▲
  │                                   ├── 1. Gemini Primary   │
  │                                   ├── 2. Gemini Fallback  │
  │                                   ├── 3. Groq Provider    │
  │                                   └── 4. Template Planner │
  │                                               │           │
  │                                               └───────────┘
  │
  ├── 3. Active Workspace ──► Pure TypeScript Engines:
  │                             ├── validateAndFitBudget() [Hard Ceiling]
  │                             ├── reflowTimelineDates() [Date Shift]
  │                             ├── computePlanDiff() [Rebalance Diff]
  │                             └── generateTimelineIcs() [RFC 5545]
  │
  └── 4. Cloud Persistence ─► Firebase Auth (Google Sign-In)
                                      │
                                      ▼
                              Cloud Firestore:
                                └── /users/{uid}/plans/{planId}
                                      └── /versions/{versionId}
```

### Folder Structure
- `src/app/`: Next.js App Router pages (`/`, `/workspace`, `/saved`, `/about`, `/privacy`, `/terms`) and API routes (`/api/health`, `/api/plan/generate`, `/api/plan/followup`, `/api/plan/replan`, `/api/plan/risks`, `/api/plan/names`, `/api/plan/ask`).
- `src/components/`: Modular React components, including `app-shell.tsx`, `navigation.tsx`, `intake-form.tsx`, `ai-loader.tsx`, `auth-context.tsx`, `plan-context.tsx`, `theme-provider.tsx`, and `workspace/` tab views.
- `src/lib/`: Pure, testable business logic:
  - `ai/`: AI Provider abstraction (`gemini-provider.ts`, `groq-provider.ts`, `orchestrator.ts`, `repair.ts`).
  - `budget.ts` & `budget-benchmarks.ts`: Deterministic budget math, city tier baselines, and hard ceiling enforcement.
  - `timeline.ts`: Date reflow and guest communication milestone injection.
  - `diff.ts`: Before/after replanning diff engine.
  - `ics.ts`: RFC 5545 iCalendar generation with 1-day advance alarms.
  - `google-calendar.ts`: Warning-free URL template builders and OAuth auto-sync.
  - `prompts.ts`: Delimited prompt constructors with prompt-injection defense.
  - `schemas.ts`: Master Zod validation schemas.
  - `ratelimit.ts`: Token bucket rate limiter.
  - `cache.ts`: Server-side in-memory LRU cache.
  - `firebase/`: Firebase configuration, auth helpers, Firestore CRUD, and data mappers.
- `src/data/`: Curated offline plan presets and prepared plans (`preparedPlans.ts`, `savedExamples.ts`).
- `src/tests/`: Automated test suite containing 38 test files across unit, component, API, and accessibility specs.
- `firestore.rules`: Production Cloud Firestore security rules with document ownership and schema validation.

For in-depth architectural patterns, see [`ARCHITECTURE.md`](file:///ARCHITECTURE.md). For threat modeling and defense controls, see [`SECURITY.md`](file:///SECURITY.md).

---

## Tech Stack

- **Framework**: Next.js 14.2 (App Router, Server-side API handlers, Static Page Optimization)
- **UI Library**: React 18 with TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS with custom editorial design tokens and print stylesheet
- **Animation & Micro-interactions**: GSAP 3.15 with `@gsap/react` 2.1 (purposeful header reveal, card stagger, budget fill, and tab transition respecting `prefers-reduced-motion`)
- **Smooth Scrolling**: Lenis 1.3 (content pages `/about`, `/privacy`, `/terms` only; strictly bypassed under reduced motion, on touch devices, and during printing)
- **Icons**: Lucide React
- **Primary AI Provider**: Google Gemini API (`@google/genai` SDK with models configured through server environment variables)
- **Secondary Backup AI Provider**: Groq Cloud API (`llama-3.3-70b-versatile` with JSON mode)
- **Built-in Fallback**: Deterministic Template Planner (<1ms offline generation)
- **Data Validation**: Zod 3.23 (Runtime schema validation for all inputs, outputs, and Firestore payloads)
- **Authentication & Database**: Firebase Auth (Google Sign-In with session persistence) and Cloud Firestore
- **Testing**: Vitest 2.1, React Testing Library, and jest-axe
- **Deployment**: Vercel Serverless Edge Platform
- **AI Development Environment**: Google Antigravity

---

## Getting Started

### Prerequisites
- Node.js 18.18 or higher (Node 20+ recommended)
- npm 9 or higher
- A Google AI Studio API Key ([https://aistudio.google.com/](https://aistudio.google.com/))
- A Firebase Project with Authentication (Google provider enabled) and Cloud Firestore

### Installation
1. Clone the repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

### Environment Variables Configuration
Configure the following keys in your `.env.local` file:

- **`GEMINI_API_KEY`** (Required, Server-only): Secret API key from Google AI Studio.
- **`GEMINI_API_KEY_FALLBACK`** (Optional, Server-only): Backup Gemini key from a secondary Google Cloud project to handle project-level 429 quota exhaustion.
- **`GEMINI_MODEL`** (Optional, Server-only): Primary Gemini model configured in your Google AI Studio project.
- **`GEMINI_FALLBACK_MODEL`** (Optional, Server-only): Fallback Gemini model configured in your Google AI Studio project.
- **`HEALTH_PROBE_TOKEN`** (Optional, Server-only): Secret token to enable the protected production health probe endpoint (`GET /api/health/probe`). When set, verifies live provider connectivity using constant-time token comparison and tight rate limiting.
- **`GROQ_API_KEY`** (Optional, Server-only): Secret key from Groq Console for secondary AI failover.
- **`GROQ_MODEL`** (Optional, Server-only): Groq model selection. Default: `llama-3.3-70b-versatile`.
- **`GROQ_KEY_EXPIRES_ON`** (Optional, Server-only): ISO date (e.g. `2026-12-22`) after which the backup key is skipped without making network calls.
- **`NEXT_PUBLIC_FIREBASE_API_KEY`** (Required, Client-safe): Firebase Web SDK API key.
- **`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`** (Required, Client-safe): Firebase Auth domain (e.g. `your-app.firebaseapp.com`).
- **`NEXT_PUBLIC_FIREBASE_PROJECT_ID`** (Required, Client-safe): Firebase project identifier.
- **`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`** (Required, Client-safe): Firebase Storage bucket.
- **`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`** (Required, Client-safe): Firebase Cloud Messaging sender ID.
- **`NEXT_PUBLIC_FIREBASE_APP_ID`** (Required, Client-safe): Firebase web application identifier.

*Important Note on `NEXT_PUBLIC_*` Variables*: In Next.js, client-side environment variables are statically inlined at **build time**. If you update Firebase variables, you must restart your local dev server (`npm run dev`) or trigger a redeploy on Vercel.

### Firebase & Google Cloud Setup
1. In the **Firebase Console**, create a project and enable **Authentication**. Under Sign-in method, enable **Google**.
2. Under **Authorized domains**, ensure `localhost` and your Vercel deployment domain (e.g. `ayojan-ace.vercel.app`) are added.
3. In **Firestore Database**, create a database in production mode and deploy the security rules from [`firestore.rules`](file:///firestore.rules).
4. In **Google Cloud Console**, if you wish to use the optional advanced Google Calendar auto-sync feature, enable the **Google Calendar API** on your project.

### Running Locally
- Start development server:
  ```bash
  npm run dev
  ```
- Run linter:
  ```bash
  npm run lint
  ```
- Run typecheck:
  ```bash
  npm run typecheck
  ```
- Run automated tests:
  ```bash
  npm run test
  ```
- Run test coverage:
  ```bash
  npm run test:coverage
  ```
- Build for production:
  ```bash
  npm run build
  ```

### Deployment on Vercel
1. Import the repository into Vercel.
2. In Project Settings &rarr; **Environment Variables**, add all server-side (`GEMINI_*`, `GROQ_*`) and client-side (`NEXT_PUBLIC_FIREBASE_*`) variables.
3. Deploy. Because `NEXT_PUBLIC_*` values are baked into bundles during compilation, any future change to Firebase settings requires triggering a **Redeploy**.

---

## Landing Page & Motion Architecture

Aayojan Ace features a bespoke, professional editorial landing page at `/` powered by **GSAP (ScrollTrigger, @gsap/react)** and **Lenis** smooth scrolling:

- **Desktop 60/40 Grid**: Left 60% features large fluid typography (*Fraunces*) with smooth plum-to-crimson glossy gradient and looping specular sheen; right 40% hosts the vertically centered access panel with "Get started with Google" (popup with automatic redirect fallback), "Try as Guest", and session detection.
- **Sticky Header**: Constant header with wordmark linking to `/`, fixed "Start plan" button opening `/plan`, Google Sign-in / Avatar, and theme toggle. Features `scroll-padding-top` to prevent content occlusion.
- **Moving Word Band**: Horizontal scrolling marquee scrubbed by ScrollTrigger showcasing core planning facets: *Budgets*, *Timelines*, *Vendors*, *Ideas*, *Guests*, *Ceremony times*, *Reminders*.
- **"How It Works" Sequence**: Pinned multi-step orchestration on desktop ($\ge 768px$) and graceful vertical reveals on mobile ($< 768px$).
- **Shared About Content Module**: Both the landing page and `/about` share `src/data/aboutContent.ts` to ensure consistency without code duplication.
- **Privacy & Terms Summaries**: Concise plain-language summaries taken directly from `/privacy` and `/terms`, ending with direct links.
- **Reduced Motion & Accessibility**: Strictly skips Lenis smooth scrolling, parallax, and scrubbing under `prefers-reduced-motion: reduce`, on touch devices, and during print. Full keyboard navigation and anchor jumps are preserved. Scoped contrast tokens in both light (cream `#FAF1E0`, card `#FFF9EE`, band `#F3E4CB`, purple `#4A1D7A`, aubergine `#2A1A3A`, crimson `#B91C3C`) and dark (deep aubergine `#1B0F26`, card `#261636`, cream `#F8EEDC`, lighter purple `#C4A5F5`, softer red `#FF6B81`) exceed WCAG AA 4.5:1 (3:1 for large display text and UI controls).

---

## Privacy and Responsible AI

- **Planning Estimates, Not Guaranteed Quotes**: All budget figures, vendor fees, and timeline milestones are advisory planning estimates. Aayojan Ace does not contact vendors, sign contracts, or disburse funds.
- **Vendor Verification Required**: Users must independently interview, evaluate, and verify all third-party vendors before making financial deposits.
- **Data Transmission Notice**: Celebration details entered in the intake form are transmitted to Google Gemini (or Groq Cloud when enabled) to generate the plan.
- **No Sensitive Financial Information**: Never enter credit card numbers, bank account credentials, government ID numbers, or passwords into celebration notes or inputs.
- **Privacy Policy & Terms**: Complete privacy practices and terms of service are published at [`/privacy`](file:///src/app/privacy/page.tsx) and [`/terms`](file:///src/app/terms/page.tsx).

---

## Limitations and Future Work

### Current Limitations
- **No Direct Vendor Booking**: Aayojan Ace provides interview screening questions and checklists but does not execute direct bookings or payment transactions.
- **In-Memory Rate Limiting**: The token bucket rate limiter runs in server process memory; in serverless environments with many instances, limits are enforced per instance rather than through a shared Redis cache.
- **Static Indian City Benchmarks**: City tier benchmarks cover major metro, tier-2, and tier-3 regions; remote rural locations default to tier-3 estimates.

### Future Work
- Multi-currency localization for destination weddings outside India.
- Collaborative multi-user editing for family members and planning committees via Firestore real-time listeners.
- SMS / WhatsApp RSVP automated response ingestion via webhook integrations.
- Vendor quote PDF parsing to automatically update itemized budget ledgers against actual vendor estimates.

---

## Author

- **Author**: **Nilesh Thipe**
- **LinkedIn**: [https://www.linkedin.com/in/nilesh-h-thipe-372291253](https://www.linkedin.com/in/nilesh-h-thipe-372291253)
- **GitHub**: [https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5](https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5)

---

## License

This project is licensed under the **MIT License**. See the [`LICENSE`](file:///LICENSE) file for details.

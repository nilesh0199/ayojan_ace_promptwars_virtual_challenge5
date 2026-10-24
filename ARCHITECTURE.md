# Aayojan Ace Technical Architecture

This document describes the architectural philosophy, system design patterns, and engineering choices underpinning Aayojan Ace.

---

## 1. Architectural Philosophy: Deterministic Core with GenAI Augmentation

In celebration planning, AI models are creative synthesis engines, not authoritative calculators. Aayojan Ace adheres to three fundamental boundaries:

1. **AI Proposes, Code Decides**: Gemini proposes category allocations, task deadlines, and potential vendor screening questions. Pure TypeScript algorithms compute all sums, category ratios, over-budget flags, date reflow shifts, and diffs.
2. **Untrusted Data Isolation**: All client inputs are treated strictly as passive data inside designated prompt blocks (`<<<USER_INPUT_DATA>>>`). No model output is directly rendered without strict Zod schema validation.
3. **Graceful Degradation**: Core features function offline or during API congestion via three static JSON presets (`SAVED_EXAMPLES`), in-memory LRU request caching, and model fallback cascades.

---

## 2. Directory Structure & Layer Separation

```
src/
├── app/                  # Next.js App Router (Routes & Server API Handlers)
│   ├── about/            # About page with creator, architecture & contact links
│   ├── api/health/       # Config & service health check endpoint
│   ├── api/plan/         # Server-only API routes (/followup, /generate, /replan, /risks, /names, /ask)
│   ├── workspace/        # 8-Tab Celebration Workspace (Overview, Budget, Timeline, Vendors, Ideas, Risks, Reminders, Ask AI)
│   ├── saved/            # Cloud and Static Saved Plans
│   ├── privacy/          # Plain language Privacy Policy
│   ├── terms/            # Terms of Service & Disclaimers
│   ├── globals.css       # Design tokens & print stylesheet
│   └── layout.tsx        # Shell root with font loading and providers
├── components/           # UI Components
│   ├── workspace/        # Workspace sub-views (Header, Tabs, Replan Modal)
│   ├── ai-loader.tsx     # Reusable animated AI loader with cancellation
│   ├── navigation.tsx    # Desktop Rail + Mobile Bottom Bar
│   ├── theme-provider.tsx# Light/Dark/System Theme Context
│   ├── auth-context.tsx  # Firebase Auth State Context
│   └── plan-context.tsx  # Client Plan Store, Undo Stack, and Local Storage
├── lib/                  # Pure Business Logic (Zero UI / Testable)
│   ├── budget.ts         # Deterministic ledger math, formatting, alerts
│   ├── budget-benchmarks.ts # Indian city tier baselines and hard ceiling budget fitter
│   ├── timeline.ts       # Date reflow algorithm & guest milestone injection
│   ├── diff.ts           # Before/After replanning diff engine
│   ├── ics.ts            # RFC 5545 calendar export generator with 1-day alarms
│   ├── google-calendar.ts# Google Calendar URL templates & reminders
│   ├── prompts.ts        # Delimited prompt constructors & injection defense
│   ├── schemas.ts        # Master Zod validation models
│   ├── gemini.ts         # GoogleGenAI SDK wrapper, retries & fallback
│   ├── ratelimit.ts      # Token bucket rate limiter per client IP
│   ├── cache.ts          # Server-side LRU memory cache
│   └── firebase/         # Client Auth & Firestore subcollection persistence
├── data/                 # Static JSON Plan Presets (Wedding, Birthday, Community)
└── tests/                # Automated Vitest Suite (Unit, API, Components, a11y)
```

---

## 3. Data Flow Architecture

### Plan Generation Flow
```
[User Intake] -> [Client Validation (Zod)]
                      │
                      ▼
         [POST /api/plan/followup]
        (Check Ambiguity / Contradictions)
                      │
           ┌──────────┴──────────┐
      Needs Follow-Up?      No Follow-Up
           │                     │
      (Ask 1 Question)           │
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
         [POST /api/plan/generate]
         (Cache Check -> Gemini SDK)
                      │
                      ▼
       [Deterministic ID & State Hydration]
                      │
                      ▼
       [Active Plan Store (plan-context)] -> [Sync to Local Storage]
```

### Budget-Aware Replanning Flow
When the user edits total budget, guest count, event date, or a single category:
1. Client packages `currentPlan` + `changes` payload.
2. Server executes `buildReplanningPrompt()` and requests Gemini to rebalance **only the affected items**.
3. Response is validated with `replanDiffResponseSchema`.
4. Client runs `computePlanDiff()` in [`diff.ts`](file:///src/lib/diff.ts) to calculate item-level deltas.
5. User reviews the diff modal showing what changed, why, and trade-off options.
6. On **Accept**: The existing plan is pushed to the `planHistory` undo stack, the diff is applied creating Version $N+1$, and active state is updated.
7. On **Reject**: Proposed diff is discarded with zero mutation to active plan.

---

## 4. Pure Business Logic Algorithms

### 4.1. Deterministic Budget Math (`budget.ts` and `budget-benchmarks.ts`)
```ts
const subtotalTarget = categories.reduce((sum, cat) => sum + cat.targetEstimate, 0);
const contingencyAmount = Math.round((subtotalTarget * contingencyPercent) / 100);
const taxServiceChargeAmount = Math.round((subtotalTarget * taxServiceChargePercent) / 100);
const totalCommitted = subtotalTarget + contingencyAmount + taxServiceChargeAmount;
const remainingBudget = totalBudget - totalCommitted;
const isOverBudget = remainingBudget < 0;
```
All percentages and remaining funds are computed in native code with zero LLM arithmetic hallucinations. Additionally, `validateAndFitBudget()` in [`budget-benchmarks.ts`](file:///src/lib/budget-benchmarks.ts) validates AI outputs against regional Indian benchmarks (Metro, Tier-2, Tier-3) and enforces that total committed funds never exceed `totalBudget` as a strict hard ceiling, scaling non-core allocations first while protecting essential categories (venue, catering, photography).

### 4.2. Local Timeline Date Reflow (`timeline.ts`)
Each task stores `daysBeforeEvent = (EventDate - DueDate)`.
When the event date shifts from $D_{\text{old}}$ to $D_{\text{new}}$:
- New Task Due Date $= D_{\text{new}} - \text{daysBeforeEvent}$.
- Tasks whose new deadline falls prior to today are flagged as overdue.
- Phases (`Now`, `Next 7 days`, `Next 30 days`, `Event week`, `Event day`) are dynamically recalculated.
- Summary notice is generated entirely in pure code.

---

## 5. Persistence Strategy: Dual-Tier Storage

1. **Guest Tier (Zero Friction)**:
   - Plans are held in React context and mirrored to browser `localStorage` under `aayojan_ace_active_plan`.
   - Allows users to explore, customize, export `.ics`, and print without forcing upfront login.
2. **Cloud Tier (Google Auth + Firestore)**:
   - When the user presses "Save to Cloud", guest users are prompted with an accessible OAuth modal with the official Google-branded button.
   - Plans are stored under `/users/{uid}/plans/{planId}`.
   - Sparse undefined fields (`estimatedCostLink`, `googleCalendarEventId`) are eliminated prior to serialization to comply with Firestore SDK requirements.
   - Strict Firestore security rules enforce authentication, user ownership, exact key enumeration (`keys().hasOnly([...])`), bounded array lists, string length caps, immutable versions (`allow update: if false`), and Firestore's native 1 MiB document ceiling.

---

## 6. Integrations & Advanced Resilience

### 6.1. Warning-Free Google Calendar & Calendar Session Architecture
- **Warning-Free Primary Path**: Direct web template URLs (`calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&ctz=...`) let users add individual milestones to their Google Calendar without OAuth verification screens. A prominent `.ics` export bundles all milestones with 1-day advance alarm reminders (`VALARM`).
- **Advanced OAuth Auto-Sync**: An optional collapsible panel requests narrow `calendar.events` scope with `login_hint` and `include_granted_scopes`. Tokens are stored strictly in-memory per session and immediately purged on 401 or user sign-out.

### 6.2. AI Provider Abstraction, Multi-Provider Cascading & Built-in Template Planner
- **Universal Provider Abstraction (`AiProvider`)**: All AI generation conforms to the `AiProvider` interface (`id`, `name`, `defaultModel`, `isConfigured()`, `generateStructured()`), featuring timeout and abort signal support via `AbortController`.
- **GroqProvider (Secondary AI)**: Server-only implementation calling Groq's OpenAI-compatible completions endpoint (`GROQ_COMPLETIONS_ENDPOINT`) with JSON object mode (`llama-3.3-70b-versatile`). Enabled only when `GROQ_API_KEY` is present.
- **Automated Schema Repair Retry**: If any provider emits malformed JSON or invalid schema properties, an automatic targeted repair instruction with error details is sent once before declaring failure.
- **Multi-Stage Failover Hierarchy**:
  1. Gemini Primary Model (configured via `GEMINI_MODEL`) [up to 2 retries with exponential backoff & jitter]
  2. Gemini Fallback Model (configured via `GEMINI_FALLBACK_MODEL`) [1 retry]
  3. Groq Provider (if configured, on overload / quota / timeout / invalid-key) [1 retry]
  4. Built-in Deterministic Template Planner (zero network fallback)
- **Built-in Deterministic Template Planner (`template-planner.ts`)**: Pure code fallback engine generating complete celebration plans from intake parameters: proportional category budget splits (with 10% contingency & 5% tax), phased timeline with injected guest milestones, vendor screening questions, creative cultural ideas, and risk register. Runs offline in <1ms.
- **Independent Circuit Breakers**: Failure tracking and 60-second cooldown timers managed per `(provider, model)` pair.
- **UI Non-Primary Plan Indicators**: Plans drafted by backup AI or template display an accessible notification banner and badge (`Cpu` / `FileText` icon + descriptive text), with an instant **"Try again with AI"** button.

### 6.3. Code-Injected Guest Communication Milestones
- **Deterministic Milestone Injection**: Pure TypeScript function `injectGuestMilestones()` embeds milestones with fixed timing offsets: Save-the-date (8 weeks, wedding only), Invitations (3 weeks, all), RSVP follow-up (10 days), Final headcount (5 days).
- **Tight Schedule Clamping**: If event date is closer than offset allows, task due date clamps to tomorrow and is marked `isTimeSensitive` with visual alert badge.
- **Draft Invite Modal**: Interactive modal generating customizable invitation messages with live preview, copy feedback, WhatsApp (`wa.me`), and Email (`mailto`) actions.

### 6.4. Multi-Scope Print & PDF Export Architecture
- **Print Scope Control**: Users choose between "Full event report" (default) or "Current tab only".
- **Dedicated Report Component**: `<FullEventReport />` renders an executive summary fact sheet, comprehensive budget ledger with assumptions, complete timeline with guest milestones, vendor interview questions, creative cultural ideas, operational risk register, and planning disclaimer.
- **Print Stylesheet**: `@media print` forces a light paper theme (`#111111` on white) regardless of active dark mode, readable borders, repeating table headers (`thead`), and page-break avoidance.

---

## 7. Layout & Responsiveness Strategy

- **Full-Width Canvas**: The app shell occupies 100% viewport width and `min-height: 100dvh`. No artificial container bottlenecks leaving blank side margins.
- **Responsive Navigation**:
  - Desktop ($\ge 768\text{px}$): Left-hand navigation rail with collapsed metadata and theme switch.
  - Mobile ($< 768\text{px}$): Fixed bottom navigation bar with safe-area padding and minimum 44px touch targets.
- **Print Optimization**: Dedicated `@media print` rules strip navigation chrome and format ledgers for crisp paper export or PDF generation.

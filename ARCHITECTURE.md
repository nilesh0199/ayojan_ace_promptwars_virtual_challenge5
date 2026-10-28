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
│   ├── page.tsx          # Professional Landing Page (GSAP ScrollTrigger + Lenis)
│   ├── plan/             # Celebration Plan Creator (Intake form, presets, 12h ceremony picker)
│   ├── about/            # About page with creator, architecture & contact links
│   ├── api/health/       # Config & service health check endpoint
│   │   └── probe/        # Protected diagnostic health probe endpoint
│   ├── api/plan/         # Server-only API routes (/followup, /generate, /replan, /risks, /names, /ask)
│   ├── workspace/        # 8-Tab Celebration Workspace (Overview, Budget, Timeline, Vendors, Ideas, Risks, Reminders, Ask AI)
│   ├── saved/            # Cloud and Static Saved Plans
│   ├── privacy/          # Plain language Privacy Policy
│   ├── terms/            # Terms of Service & Disclaimers
│   ├── globals.css       # Design tokens & print stylesheet
│   └── layout.tsx        # Shell root with font loading and providers
├── components/           # UI Presentation Components (No Business Calculations)
│   ├── landing/          # Landing Page components (Header, Hero, WordBand, HowItWorks, About, PrivacyTerms, CTA, Footer, ScrollEffects)
│   ├── workspace/        # Workspace sub-views (Header, Tabs, Replan Modal)
│   ├── ai-loader.tsx     # Reusable animated AI loader with cancellation
│   ├── navigation.tsx    # Desktop Rail + Mobile Bottom Bar
│   ├── theme-provider.tsx# Light/Dark/System Theme Context
│   ├── auth-context.tsx  # Firebase Auth State Context
│   └── plan-context.tsx  # Client Plan Store, Undo Stack, and Local Storage
├── lib/                  # Pure Business Logic (Zero UI / Testable)
│   ├── ai/               # AI Provider Abstraction, Failover Cascade & Normalization
│   │   ├── types.ts           # AiProvider, AiCallOptions, AiExecutionResult contracts
│   │   ├── orchestrator.ts    # Unified multi-tier failover cascade with time budgets
│   │   ├── gemini-provider.ts # Google Gemini structured output provider
│   │   ├── groq-provider.ts   # Groq Cloud JSON mode provider
│   │   ├── repair.ts          # Automatic single repair retry on validation failure
│   │   ├── normalize.ts       # Small explicit normalizer for harmless variations
│   │   ├── safe-logger.ts     # Safe server-only diagnostic logging (no leaks)
│   │   ├── schema-converter.ts# OpenAPI 3.0 / Gemini & skeleton generator
│   │   └── index.ts           # Barrel exports for AI subsystem
│   ├── api-helper.ts     # Shared request safety checks and global error mappers
│   ├── budget.ts         # Deterministic ledger math, formatting, alerts
│   ├── budget-benchmarks.ts # Indian city tier baselines and hard ceiling budget fitter
│   ├── constants.ts      # Shared application constants, event types, and presets
│   ├── diff.ts           # Before/After replanning diff engine
│   ├── gemini.ts         # GoogleGenAI SDK wrapper, retries & circuit breaker
│   ├── google-calendar.ts# Warning-free Google Calendar URL templates & reminders
│   ├── ics.ts            # RFC 5545 calendar export generator with 1-day alarms
│   ├── prompts.ts        # Delimited prompt constructors & injection defense
│   ├── ratelimit.ts      # Token bucket rate limiter per client IP with stale eviction
│   ├── schemas.ts        # Master Zod validation models
│   ├── template-planner.ts # Offline deterministic regional plan generator (<1ms)
│   ├── time.ts           # Time parsing and 12h/24h conversion helpers
│   ├── timeline.ts       # Date reflow algorithm & guest milestone injection
│   ├── cache.ts          # Server-side canonical LRU memory cache
│   └── firebase/         # Client Auth & Firestore subcollection persistence
│       ├── config.ts     # Firebase initialization and literal env variable accesses
│       └── mappers.ts    # Firestore document sanitization and mapping
├── data/                 # Static JSON Plan Presets (Wedding, Birthday, Community)
├── docs/                 # Architecture Decision Records (ADRs)
│   └── DECISIONS.md      # Foundational technical and product decision rationale
└── tests/                # Automated Vitest Suite (Unit, API, Components, a11y, Architecture)
    ├── api/              # API route integration tests
    ├── architecture/     # Structural dependency, secret isolation & convention tests
    ├── components/       # React component unit and user-event tests
    └── unit/             # Pure business logic unit tests
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

---

## 8. Motion, Micro-interactions & Smooth Scrolling Architecture (GSAP & Lenis)

### 8.1. Isolated Client-Only Loading Strategy
- **Shared Bundle Zero-Growth**: GSAP, `@gsap/react`, and Lenis are dynamically imported on the Landing Page (`src/components/landing/landing-scroll-effects.tsx`) and within isolated workspace client components (`workspace-header.tsx`, `tab-overview.tsx`, `tab-budget.tsx`, `workspace/page.tsx`). Lenis is also mounted on narrative content pages (`/about`, `/privacy`, `/terms`) via `<SmoothScroll />`.
- **No Global Leakage**: Neither GSAP nor Lenis is imported into `layout.tsx`, `app-shell.tsx`, `navigation.tsx`, or the plan creator route (`/plan`). The shared entry chunk First Load JS remains protected and well below threshold boundaries.

### 8.2. Landing Page GSAP ScrollTrigger + Lenis Orchestration
The Landing Page (`/`) uses a unified animation architecture:
1. **Unified Ticker Loop**: `lenis.on('scroll', ScrollTrigger.update)` synchronizes Lenis with GSAP ScrollTrigger, while `gsap.ticker.add((time) => lenis.raf(time * 1000))` and `gsap.ticker.lagSmoothing(0)` drive smooth scrolling through a single coordinated loop.
2. **Hero Entrance & Parallax**: Header, title, tagline, and action panel reveal with staggered opacity and transforms on load, followed by subtle parallax drift on scroll.
3. **Horizontal Scrubbing Word Band**: The marquee band (*Budgets*, *Timelines*, *Vendors*, *Ideas*, *Guests*, *Ceremony times*, *Reminders*) is scrubbed horizontally in sync with page scroll.
4. **"How It Works" Sequence**: Pinned multi-step sequence on desktop screens ($\ge 768px$) transitioning smoothly through the 4 planning phases, with simple vertical reveals on mobile ($< 768px$).
5. **Closing CTA Scale-In**: Closing banner scales smoothly into resting view as it enters the viewport.
6. **Strict Guardrails**: Animations strictly operate on `transform` and `opacity`. Under `prefers-reduced-motion: reduce`, on touch devices, or during print, Lenis and GSAP scrubbing are disabled completely, rendering static content with `clearProps`. All triggers are killed and Lenis destroyed on component unmount.

### 8.3. Workspace GSAP Micro-interactions
Four purposeful micro-interactions enhance visual hierarchy without distracting from planning tasks:
1. **Workspace Header Reveal**: Subtle downward slide and fade (`opacity: 0, y: -8` $\to$ `1, 0`) upon workspace mounting.
2. **Overview Cards Staggered Rise**: Gentle staggered upward entrance (`opacity: 0, y: 12` $\to$ `1, 0`, 60ms stagger) across metric and cultural cards.
3. **Stacked Budget Bar Fill**: Smooth scale-in along the X-axis (`scaleX: 0` $\to$ `1`, `transformOrigin: 'left center'`) on initial ledger load.
4. **Soft Tab-Content Fade**: Gentle transition (`opacity: 0.7, y: 4` $\to$ `1, 0`, 250ms) across workspace tab switches.

### 8.4. Strict Guardrails & Accessibility
- **Transform & Opacity Only**: All tweens operate strictly on CSS `transform` and `opacity` properties to prevent layout reflows and guarantee 60fps GPU acceleration.
- **prefers-reduced-motion**: Every animation is wrapped in `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`. When reduced motion is preferred, animations are bypassed entirely, displaying content immediately in its natural resting state.
- **Progressive Enhancement / No Flash**: Components render in natural CSS without `display: none` or `opacity: 0` stylesheets. If JavaScript is unavailable or errors out, all content remains completely visible and accessible.
- **ARIA Live & Loader Exemption**: No animations target elements inside `[role="status"]`, `[role="alert"]`, `[aria-live]`, or the `AiLoader`.
- **Automatic Lifecycle Cleanup**: Every `useGSAP` hook automatically scopes and tears down tweens on component unmount via context reversion (`mm.revert()`).

### 8.5. Lenis Smooth Scrolling Architecture on Narrative Content Pages
- **Content Pages Only**: Smooth scrolling is active exclusively on narrative documentation routes (`/about`, `/privacy`, `/terms`). It is strictly barred from the planner, workspace, saved plans, dialogs, and modals.
- **Bypass Conditions**: Lenis initialization is skipped entirely if:
  1. `prefers-reduced-motion: reduce` is active.
  2. Touch device detected (`'ontouchstart' in window` or `navigator.maxTouchPoints > 0`).
  3. Print media is detected (`window.matchMedia('print').matches` or `beforeprint` event).
- **Single RAF Loop**: Lenis is driven strictly by a single `requestAnimationFrame` loop (never combined with GSAP ticker), which is cancelled and destroyed on unmount.
- **Inner Scroll Containment**: Every nested scroll container (dialog backdrops, modal bodies, dropdowns, overflow tables) is tagged with `data-lenis-prevent` to prevent scroll hijacking.

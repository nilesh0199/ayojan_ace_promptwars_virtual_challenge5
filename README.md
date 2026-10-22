# Aayojan Ace

> "Your celebration, perfectly planned."

- **Live Demonstration**: [https://ayojan-ace.vercel.app/](https://ayojan-ace.vercel.app/)
- **Source Code Repository**: [https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5](https://github.com/nilesh0199/ayojan_ace_promptwars_virtual_challenge5)

### Product Visual Progressions (Screenshots)
- **Light Editorial Notebook Theme**: `![Aayojan Ace - Light Theme Interface](screenshots/light-theme-workspace.png)`
- **Dark Editorial Surface Theme**: `![Aayojan Ace - Dark Theme Interface](screenshots/dark-theme-workspace.png)`
- **Mobile Responsive Full-Width Layout**: `![Aayojan Ace - Mobile Bottom Nav & Full Width](screenshots/mobile-responsive.png)`
- **Budget-Aware Replanning Diff Modal**: `![Aayojan Ace - Replanning Diff & Trade-Offs](screenshots/replanning-diff-modal.png)`

---

## The Challenge

> *"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."*
> — *PromptWars Challenge 5: Celebration & Event Planner*

### What It Does
Aayojan Ace is an intelligent celebration and event planning assistant that takes minimal intake (event type, city, date, guest count, total budget, style/culture, and non-negotiables) and immediately crafts a realistic, comprehensive celebration plan. Whenever parameters change—whether an unexpected budget adjustment, guest count shift, or date change—Aayojan Ace intelligently rebalances only the affected elements, displaying explicit before/after diffs with trade-off options and full undo history.

---

## How This Meets the Challenge

Every core capability mandated by the challenge brief is delivered with dedicated screens, pure business logic, and automated tests:

- **Weddings, Birthdays, and Community Events**:
  - *Screen*: Start / Plan Creator ([`src/app/page.tsx`](file:///src/app/page.tsx)) and Presets Picker ([`src/components/intake-form.tsx`](file:///src/components/intake-form.tsx)).
  - *Feature*: Direct selection for Wedding, Birthday, and Community Event, plus editable regional presets: *Indian Wedding*, *Griha Pravesh / Housewarming*, *Diwali Community Gathering*, and *College Annual Fest*.
  - *Source File*: [`src/lib/constants.ts`](file:///src/lib/constants.ts) (`EVENT_TYPES`, `EVENT_PRESETS`).

- **Budgets**:
  - *Screen*: Workspace Budget Tab ([`src/components/workspace/tab-budget.tsx`](file:///src/components/workspace/tab-budget.tsx)).
  - *Feature*: Category ledger lines with Min, Target, and Max estimate ranges, stated planning assumptions, a 10% contingency buffer, a statutory tax/service allowance, and a horizontal stacked allocation bar (no generic pie charts). Over-budget conditions trigger instant visual warnings.
  - *Source File*: [`src/lib/budget.ts`](file:///src/lib/budget.ts) (`calculateBudgetSummary`, `formatCurrency`).

- **Timelines**:
  - *Screen*: Workspace Timeline Tab ([`src/components/workspace/tab-timeline.tsx`](file:///src/components/workspace/tab-timeline.tsx)).
  - *Feature*: Phased vertical milestone track (*Now*, *Next 7 days*, *Next 30 days*, *Event week*, *Event day*), each item featuring an exact due date, assigned owner, linked category cost, and interactive completion checkboxes. Includes pure client-side `.ics` export and instant code-based date reflow.
  - *Source File*: [`src/lib/timeline.ts`](file:///src/lib/timeline.ts) (`reflowTimelineDates`) and [`src/lib/ics.ts`](file:///src/lib/ics.ts) (`generateTimelineIcs`).

- **Vendor Checklists**:
  - *Screen*: Workspace Vendors Tab ([`src/components/workspace/tab-vendors.tsx`](file:///src/components/workspace/tab-vendors.tsx)).
  - *Feature*: Screening checklist categories with contract lifecycle status dropdowns (*Shortlisted*, *Contacted*, *Quoted*, *Booked*, *Contract received*), prominent **"Verify with the vendor"** label, and key discovery screening questions.
  - *Guardrail*: Strictly recommends vendor *types* and vital screening questions; never fabricates fake names, phone numbers, or fixed prices.
  - *Source File*: [`src/lib/schemas.ts`](file:///src/lib/schemas.ts) (`vendorItemSchema`).

- **Personalized Ideas**:
  - *Screen*: Workspace Ideas Tab ([`src/components/workspace/tab-ideas.tsx`](file:///src/components/workspace/tab-ideas.tsx)).
  - *Feature*: Creative concepts tailored to regional culture, detailed menu and dietary guidelines (*dedicated Pure Jain counter protocols, vegan options, allergy awareness*), interactive guest rituals, and cultural decor accents.
  - *Source File*: [`src/components/workspace/tab-ideas.tsx`](file:///src/components/workspace/tab-ideas.tsx) and [`src/lib/schemas.ts`](file:///src/lib/schemas.ts) (`personalizedIdeasSchema`).

- **Cloud Persistence & Version Snapshots (Firestore)**:
  - *Screen*: Saved Plans ([`src/app/saved/page.tsx`](file:///src/app/saved/page.tsx)) and Workspace Header.
  - *Feature*: Debounced automatic persistence to `users/{uid}/plans/{planId}`, subcollection version snapshots under `users/{uid}/plans/{planId}/versions` capped at the latest 20 versions per plan, duplicate, rename, delete with confirmation, and one-click version restore. Paginated query capped at 50 with "load more".
  - *Guest Mode*: Guest plans persist in schema-validated localStorage; upon sign-in, an accessible one-click banner prompts to import the guest plan directly into Firestore.
  - *Source File*: [`src/lib/firebase/firestore.ts`](file:///src/lib/firebase/firestore.ts) and [`firestore.rules`](file:///firestore.rules).

- **Google Calendar Milestone Reminders**:
  - *Screen*: Workspace Timeline Tab Reminders Panel ([`src/components/workspace/tab-timeline.tsx`](file:///src/components/workspace/tab-timeline.tsx)).
  - *Feature*: "Connect Google Calendar" requesting narrow `calendar.events` scope via `GoogleAuthProvider`. Access tokens stored in memory ONLY (never in Firestore, localStorage, or logs). Automatically creates 9:00 AM local time events with 1-day email (1440 min) and 1-hour popup (60 min) alerts via Google Calendar REST API. Idempotent sync updates existing events using `task.googleCalendarEventId`. Includes "Remove Reminders" control, hard cap of 60 events, concurrency limits, and retry backoff on 429/503.
  - *Source File*: [`src/lib/google-calendar.ts`](file:///src/lib/google-calendar.ts) and [`src/lib/firebase/auth.ts`](file:///src/lib/firebase/auth.ts).

- **Server Config Health Check & Error Mapping**:
  - *Screen*: API Health Endpoint ([`src/app/api/health/route.ts`](file:///src/app/api/health/route.ts)) and Global Alert Banners.
  - *Feature*: Rate-limited health check returning short status booleans/strings (`{ status: "ok" | "degraded", gemini: "configured" | "missing", model: "configured" | "missing" }`) without ever exposing secrets. Startup check detects missing `NEXT_PUBLIC_FIREBASE_*` variables and names them. Granular client error mapping for missing API key, invalid key, model not found, quota/busy, and timeout.
  - *Source File*: [`src/app/api/health/route.ts`](file:///src/app/api/health/route.ts) and [`src/lib/gemini.ts`](file:///src/lib/gemini.ts).

- **Budget-Aware Replanning (The Hero Feature)**:
  - *Screen*: Workspace Header & Replan Modal ([`src/components/workspace/replan-modal.tsx`](file:///src/components/workspace/replan-modal.tsx)).
  - *Feature*: Users can modify total budget, guest count, event date, or a single category allocation. Gemini rebalances *only the affected items*, returning a structured diff with "What changed", "Why", and "Trade-off options". Users can Accept or Reject, with an undoable version history stack.
  - *Source File*: [`src/lib/diff.ts`](file:///src/lib/diff.ts) (`computePlanDiff`, `applyReplanDiff`).

- **Operational Safeguards Check**:
  - *Screen*: Workspace Risks Tab ([`src/components/workspace/tab-risks.tsx`](file:///src/components/workspace/tab-risks.tsx)).
  - *Feature*: Proactive contingency assessment covering seasonal weather in the host city, municipal sound permits, dependency failure points, dietary cross-contamination, and payment milestones.
  - *Source File*: [`src/app/api/plan/risks/route.ts`](file:///src/app/api/plan/risks/route.ts) and [`src/lib/prompts.ts`](file:///src/lib/prompts.ts) (`buildRiskCheckPrompt`).

- **Adaptive Clarification**:
  - *Screen*: Start / Plan Creator Intake Card ([`src/components/intake-form.tsx`](file:///src/components/intake-form.tsx)).
  - *Feature*: Gemini analyzes intake parameters for missing or contradictory information, asking *one* friendly clarification question at a time (max 2 per plan) before generating the draft.
  - *Source File*: [`src/app/api/plan/followup/route.ts`](file:///src/app/api/plan/followup/route.ts) and [`src/lib/prompts.ts`](file:///src/lib/prompts.ts) (`buildFollowUpPrompt`).

---

## Judging Criteria Evidence

### 1. Code Quality
- **Clear Architectural Separation**: Pure business logic ([`src/lib/`](file:///src/lib/)) is decoupled from UI presentation ([`src/components/`](file:///src/components/)) and network I/O ([`src/app/api/`](file:///src/app/api/)).
- **TypeScript Strict Mode**: Enforced in [`tsconfig.json`](file:///tsconfig.json) (`"strict": true`, `"noImplicitAny": true`). Zero TypeScript errors across the entire codebase (`tsc --noEmit` exits with code 0).
- **Static Code Analysis**: ESLint configured in [`.eslintrc.json`](file:///.eslintrc.json) extending `next/core-web-vitals` with Prettier formatting in [`.prettierrc`](file:///.prettierrc). `npm run lint` passes with 0 errors and 0 warnings.
- **Typed Error Hierarchy**: Custom `GeminiApiError` class with union `GeminiErrorCode` (`'AI_BUSY' | 'AI_TIMEOUT' | 'AI_NOT_CONFIGURED' | 'AI_INVALID_KEY' | 'AI_MODEL_NOT_FOUND' | 'AI_VALIDATION_FAILED' | 'AI_ERROR'`) in [`src/lib/gemini.ts`](file:///src/lib/gemini.ts). Uniformly handled by [`src/lib/api-helper.ts`](file:///src/lib/api-helper.ts) with friendly, positive UI error mapping.
- **Documentation & JSDoc**: Comprehensive JSDoc annotations across all public pure functions, with architectural decisions detailed in [`ARCHITECTURE.md`](file:///ARCHITECTURE.md).

### 2. Security
- **Server-Only API Key**: `GEMINI_API_KEY` is loaded exclusively inside server-side route handlers ([`src/lib/gemini.ts`](file:///src/lib/gemini.ts)). Never bundled into client JavaScript.
- **Zero Raw Upstream Error Leakage**: `handleApiError` and `mapGeminiError` ensure raw upstream JSON, stack traces, internal IPs, and API keys are strictly never returned to the browser. Only sanitized, typed error codes and reassuring copy are rendered.
- **Safe Server-Only Logging**: Server alerts log high-level metadata (code, status, attempt, model) strictly without secrets, prompts, or user inputs.
- **Zod Schema Validation**: Both incoming request payloads and outgoing Gemini JSON outputs are validated against strict Zod schemas with number limits and string length bounds in [`src/lib/schemas.ts`](file:///src/lib/schemas.ts).
- **Prompt Injection Defense**: Untrusted user inputs are wrapped inside explicit `<<<USER_INPUT_DATA>>>` delimiters with system directives to ignore instructions inside data ([`src/lib/prompts.ts`](file:///src/lib/prompts.ts)).
- **Token Bucket Rate Limiting**: Per-IP rate limiting module ([`src/lib/ratelimit.ts`](file:///src/lib/ratelimit.ts)) blocks automated spam with HTTP 429 and `Retry-After` headers.
- **Content Security Policy & COOP Headers**: Strict CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups` configured in [`next.config.mjs`](file:///next.config.mjs).
- **In-Memory Calendar Token Storage**: Google Calendar OAuth tokens are held strictly in runtime memory and expire naturally; they are never stored in Firestore, localStorage, cookies, or logs.
- **Firestore Security Rules**: User-scoped access control in [`firestore.rules`](file:///firestore.rules) ensures documents under `/users/{uid}/plans/{planId}` and subcollection `/versions/{versionId}` can only be read or written by the authenticated owner (`request.auth.uid == userId`). Requires `data.id == planId`, enforces strict key enumeration via `keys().hasOnly([...])` rejecting unauthorized fields, validates `createdAt`/`updatedAt` timestamp strings, bounds list sizes (`timeline <= 100`, `vendors <= 50`, `categories <= 30`), enforces immutable version snapshots (`allow update: if false`), and relies on Firestore's native 1 MiB document size ceiling.
- **Startup Environment Verification**: `getMissingFirebaseConfigVars` ([`src/lib/firebase/config.ts`](file:///src/lib/firebase/config.ts)) verifies required `NEXT_PUBLIC_FIREBASE_*` keys on startup using static literal property accesses (ensuring reliable Next.js build-time inlining) and displays an accessible alert naming missing variables without exposing secret values. Empty strings, whitespace, and placeholder templates (e.g. `<...>`, `your_...`, `mock-...`) are flagged as missing. Note: `NEXT_PUBLIC_*` values are inlined into client JS at build time, so Vercel requires a redeploy after environment variable changes, and local development requires updating `.env.local` followed by a dev server restart (`npm run dev`).
- **Zero Committed Secrets**: Strict [`.gitignore`](file:///.gitignore) and template [`.env.example`](file:///.env.example). Full security posture documented in [`SECURITY.md`](file:///SECURITY.md).

### 3. Efficiency
- **Overload Resilience & Circuit Breaker**:
  - *Exponential Backoff & Jitter*: On HTTP 503, 429, or `UNAVAILABLE` responses, retries up to 2 times with exponential backoff and random jitter (`400ms * 2^attempt + jitter`), keeping connection spikes smooth.
  - *Fallback Model Switching*: If the primary model (`gemini-3.8-flash`) exhausts retries, automatically switches to `GEMINI_FALLBACK_MODEL` (`gemini-3.5-flash`, with 1 retry).
  - *In-Memory Circuit Breaker*: After 3 consecutive overload failures on the primary model, trips for ~60 seconds, bypassing the primary model and directly utilizing the fallback model to prevent repeated latency penalties.
  - *Total Time Budget & Per-Attempt Timeouts*: Enforces a 25-second overall ceiling and 8-second per-attempt timeout so requests finish well within hosting platform time limits.
- **Server Components & Minimal Hydration**: Informational pages (`/privacy`, `/terms`) are statically rendered Server Components. Client components are scoped strictly to interactive nodes.
- **Structured JSON Output**: Gemini calls utilize `responseMimeType: 'application/json'` to minimize response token consumption and guarantee deterministic parsing.
- **Minimal Replanning Payloads**: Replanning prompts transmit only the current state slice and requested modification, returning only the affected budget lines and tasks rather than re-generating the entire plan.
- **In-Memory Server LRU Cache**: Duplicate plan generation requests are cached in memory for 15 minutes ([`src/lib/cache.ts`](file:///src/lib/cache.ts)), skipping redundant AI calls (`X-Cache: HIT`).
- **Pure Code Math**: Ledger sums, contingency calculations, percentage distributions, and date reflows execute instantly in client code with zero AI round-trips.
- **Measured Production Build Bundle Sizes**:
  - Shared First Load JS: **87.2 kB**
  - Route `/` (Start / Intake): **4.29 kB** (First Load: 266 kB)
  - Route `/workspace` (7 Tabs): **18 kB** (First Load: 280 kB)
  - Route `/saved` (Search & Versions): **6.5 kB** (First Load: 269 kB)
  - Route `/privacy` & `/terms`: **190 B** (First Load: 262 kB)
  - API Routes: **0 B** client overhead (Server-rendered on demand)

### 4. Testing
- **Test Stack**: Vitest + React Testing Library + `jest-axe` + mocked Gemini SDK (no live API calls during tests).
- **Enforced Coverage Thresholds**: Configured in [`vitest.config.ts`](file:///vitest.config.ts) requiring $\ge 85\%$ lines and $\ge 80\%$ branches for `lib/` and `api/`.
- **Actual Coverage Results (Real Run Output)**:
  - Statements: **95.81%** (Threshold $\ge 85\%$ met)
  - Branches: **84.35%** (Threshold $\ge 80\%$ met)
  - Functions: **100.00%**
  - Lines: **95.81%** (Threshold $\ge 85\%$ met)
  - Total Tests: **26 test suites passed, 155 unit/API/component/a11y tests passed cleanly (0 failed)**.
- **Coverage By Module**:
  - `src/app/api/health/route.ts`: 100% lines, 93.33% branches
  - `src/app/api/plan/followup`: 100% lines, 100% branches
  - `src/app/api/plan/replan`: 100% lines, 100% branches
  - `src/app/api/plan/risks`: 100% lines, 100% branches
  - `src/app/api/plan/generate`: 100% lines, 66.66% branches
  - `src/lib/diff.ts`: 100% lines, 96.42% branches
  - `src/lib/prompts.ts`: 100% lines, 100% branches
  - `src/lib/schemas.ts`: 100% lines, 100% branches
  - `src/lib/ics.ts`: 100% lines, 75% branches
  - `src/lib/google-calendar.ts`: 94.59% lines, 69.04% branches
  - `src/lib/api-helper.ts`: 100% lines, 100% branches
  - `src/lib/timeline.ts`: 98.94% lines, 87.5% branches
  - `src/lib/budget.ts`: 96.82% lines, 57.89% branches
  - `src/lib/cache.ts`: 96.36% lines, 94.73% branches
  - `src/lib/ratelimit.ts`: 92% lines, 94.44% branches
  - `src/lib/gemini.ts`: 88.14% lines, 83.47% branches
  - `src/lib/firebase/mappers.ts`: 100% lines, 100% branches

### 5. Accessibility (WCAG 2.2 AA)
- **Semantic Landmark Hierarchy**: `<header>`, `<nav>`, `<main id="main-content">`, `<aside>` landmark structure with one `<h1>` per view.
- **Skip-to-Content**: Accessible skip link placed at the very top of `<body>` bypassing navigation directly to `#main-content`.
- **Mathematical Contrast Token Verification**: Unit test [`src/tests/unit/contrast.test.ts`](file:///src/tests/unit/contrast.test.ts) computes relative luminance and contrast ratios, proving all text tokens meet WCAG AA ($\ge 4.5:1$) and UI components meet $\ge 3:1$ in both Light and Dark themes.
- **Visible Focus Rings & Focus Trapping**: All interactive controls feature visible `:focus-visible` styling (`outline: 2px solid var(--color-accent)`). Modal dialogs trap focus and restore focus on dismiss.
- **Screen Reader Announcements**: `aria-live="polite"` regions communicate AI generation progress, error alerts, calendar sync progression, and date reflow updates.
- **Automated `jest-axe` Audits**: Every main screen (Home, Workspace, Saved Plans, Timeline Reminders, Privacy, Terms, 404, ThemeToggle) tested with `jest-axe` in light and dark themes with **0 violations** ([`src/tests/components/accessibility.test.tsx`](file:///src/tests/components/accessibility.test.tsx), [`src/tests/components/saved-plans-and-reminders-a11y.test.tsx`](file:///src/tests/components/saved-plans-and-reminders-a11y.test.tsx)).

### 6. Problem Statement Alignment
- Every challenge requirement is satisfied and cross-referenced in Section 3 ("How This Meets the Challenge") and Section 7 ("How Gemini is Used").

---

## Google Services & Tools Used

- **Google Gemini API**: Server-side planning intelligence via the official `@google/genai` SDK using `gemini-3.8-flash` with fallback to `gemini-3.5-flash`.
- **Firebase Authentication**: Google OAuth with popup and mobile redirect fallback enabling seamless guest-to-cloud transition.
- **Cloud Firestore**: User-isolated persistent storage for celebration plans and versions subcollections (`users/{uid}/plans/{planId}/versions`).
- **Google Calendar REST API**: Milestone reminder scheduling via `https://www.googleapis.com/calendar/v3/calendars/primary/events` with 1-day email and 1-hour popup reminders and private properties.
- **Google Antigravity**: Advanced agentic coding assistant used to design, build, test, and verify the application.
- **Vercel**: Global edge deployment target for Next.js App Router.
*(No other third-party services or tools are utilized.)*

---

## Architecture

### Data Flow Diagram
```
[User Browser / Mobile]
   │
   ├─► Local State (React Plan Context + localStorage)
   │
   ▼ HTTPS (Encrypted, Strict CSP)
[Next.js Server API Routes]
   │
   ├─► Check Token Bucket Rate Limiter (Per IP)
   ├─► Check In-Memory LRU Cache
   │
   ▼
[Google Gemini API] ──► Validated via Zod Schemas ──► Returns Clean Plan / Diff
   │
   ▼
[Cloud Firestore] (When user clicks "Save to Cloud" via Firebase Auth)
```

### Folder Structure
- `src/app`: App Router views (`/`, `/workspace`, `/saved`, `/privacy`, `/terms`, `/not-found`) and API handlers (`/api/plan/*`).
- `src/components`: UI components, navigation rails, theme provider, and workspace tab panels.
- `src/lib`: Decoupled pure business logic (`budget.ts`, `timeline.ts`, `diff.ts`, `ics.ts`, `prompts.ts`, `schemas.ts`, `ratelimit.ts`, `cache.ts`).
- `src/data`: Static JSON example plans (`savedExamples.ts`).
- `src/tests`: Automated test suite (`unit/`, `api/`, `components/`).

### How Core Systems Work
- **Replanning Engine**: Captures user parameter changes, sends the current plan slice to Gemini, computes itemized deltas using `computePlanDiff()`, presents before/after trade-off choices, and allows instant Accept or Reject with version history rollback.
- **Contingency Check**: Assesses dependencies, seasonal weather, sound curfews, and dietary protocols, producing structured mitigations.
- **Date Reflow**: Pure mathematical shift function calculating `newEventDate - daysBeforeEvent`, checking overdue tasks against the current date, and regrouping phases.

---

## How Gemini Is Used

All calls to Gemini use the official `@google/genai` SDK from server-side route handlers:

- **Adaptive Clarification (`/api/plan/followup`)**:
  - *Purpose*: Checks if critical details are missing or contradictory.
  - *Behavior*: Asks at most 1 short question at a time (max 2 per plan).
  - *Schema*: `followUpResponseSchema`.
- **Plan Generation (`/api/plan/generate`)**:
  - *Purpose*: Generates realistic budget category lines, phased timeline tasks, vendor types, and cultural ideas.
  - *Schema*: `rawGeminiPlanSchema`.
- **Budget-Aware Replanning (`/api/plan/replan`)**:
  - *Purpose*: Rebalances only the affected budget categories and timeline milestones when parameters change.
  - *Schema*: `replanDiffResponseSchema`.
- **Operational Safeguards (`/api/plan/risks`)**:
  - *Purpose*: Identifies operational risks, seasonal factors, and permit deadlines with mitigations.
  - *Schema*: `riskRegisterSchema`.

### Model Hierarchy & Guardrails
- **Primary Model**: `gemini-3.8-flash` configured via `GEMINI_MODEL`.
- **Automatic Fallback**: `gemini-3.5-flash` configured via `GEMINI_FALLBACK_MODEL`, automatically invoked if the primary model encounters transient overload (HTTP 429/503).
- **Vendor Guardrail**: Strict system prompts instruct the model: *"ABSOLUTE RULE: NEVER INVENT SPECIFIC VENDOR NAMES, PHONE NUMBERS, OR EXACT QUOTES. Suggest vendor TYPES and questions to ask."*

---

## Getting Started

### Prerequisites
- Node.js 18.18+ or 20+ (tested on Node v24.12.0)
- npm 9+ (tested on npm 11.6.2)

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure the variables:
- `GEMINI_API_KEY`: Server-only secret key from Google AI Studio.
- `GEMINI_MODEL`: Primary Gemini model (default: `gemini-3.8-flash`).
- `GEMINI_FALLBACK_MODEL`: Fallback Gemini model (default: `gemini-3.5-flash`).
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase Web API key.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain for Google Sign-in.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project identifier.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket.
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Firebase sender ID.
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase web application ID.

### Firebase & Google Cloud Setup Steps
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Under **Authentication > Sign-in method**, enable the **Google** provider and save.
3. Under **Authentication > Settings > Authorized domains**, add `localhost` and your Vercel deployment domain: `ayojan-ace.vercel.app`.
4. Under **Firestore Database > Rules**, paste the exact rules from [`firestore.rules`](file:///firestore.rules) and click **Publish**.
5. Register a Web App in project settings (`Project Settings > General > Your apps`) and copy the config keys to `.env.local` or Vercel.
6. Open the [Google Cloud Console](https://console.cloud.google.com/) for the same Firebase project:
   - Navigate to **APIs & Services > Library**, search for **Google Calendar API**, and click **Enable**.
   - Navigate to **APIs & Services > OAuth consent screen**, set user type to **External**, add scopes (`calendar.events`), and add your email under test users if in testing mode.
   - Under **APIs & Services > Credentials**, ensure the OAuth 2.0 Web Client includes `https://ayojan-ace.vercel.app` in **Authorized JavaScript origins** and `https://<PROJECT_ID>.firebaseapp.com/__/auth/handler` in **Authorized redirect URIs**.

### Running Locally
```bash
# Start development server
npm run dev

# Run TypeScript type check
npm run typecheck

# Run ESLint
npm run lint

# Run Vitest test suite with coverage
npm run test:coverage

# Build Next.js production bundle
npm run build
```

---

## Deployment on Vercel

1. Push the code to your GitHub repository on `main`.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Settings > Environment Variables**, add the 9 variables listed in `.env.example`.
4. Ensure `GEMINI_API_KEY` is checked for **Server / Edge** and NOT marked public.
5. In the Firebase Console, add your Vercel domain (`your-project.vercel.app`) to **Authorized domains**.
6. Trigger the deployment. Vercel will run `npm run build` and publish the site.

---

## Responsible AI & Privacy

- **Planning Estimates, Not Quotes**: All numbers are indicative planning estimates for budgeting reference, not guaranteed contractual quotes.
- **Independent Verification**: Users are instructed to verify quotes, availability, and agreements directly with licensed vendors.
- **Privacy Notice**: Event details are processed via Google Gemini API; users are advised never to enter government IDs, credit card numbers, or passwords.
- **Data Sovereignty**: Unauthenticated plans reside solely in the user's browser. Authenticated plans can be permanently deleted at any time from the Saved Plans view.
- Review our plain language policies at `/privacy` ([`src/app/privacy/page.tsx`](file:///src/app/privacy/page.tsx)) and `/terms` ([`src/app/terms/page.tsx`](file:///src/app/terms/page.tsx)).

---

## Limitations & Future Work

- **Multi-Day Itinerary Sub-Tabs**: Detailed multi-day Indian wedding schedules (e.g., distinct Haldi, Sangeet, and Reception sub-tracks) are planned for v2.
- **Offline Progressive Web App (PWA)**: Full offline Service Worker caching of API responses for rural venues with limited connectivity.
- **Realtime Family Collaboration**: Multi-user concurrent presence and live sync via Firebase Realtime Database.

---

## License & Credits

- Licensed under the **MIT License** ([`LICENSE`](file:///LICENSE)).
- Built with **Google Antigravity**, **Next.js**, **Google Gemini**, and **Firebase**.

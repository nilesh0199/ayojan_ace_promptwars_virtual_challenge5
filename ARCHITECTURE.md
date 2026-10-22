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
│   ├── api/health/       # Config & service health check endpoint
│   ├── api/plan/         # Server-only API routes (/followup, /generate, /replan, /risks)
│   ├── workspace/        # 7-Tab Celebration Workspace
│   ├── saved/            # Cloud and Static Saved Plans
│   ├── privacy/          # Plain language Privacy Policy
│   ├── terms/            # Terms of Service & Disclaimers
│   ├── globals.css       # Design tokens & print stylesheet
│   └── layout.tsx        # Shell root with font loading and providers
├── components/           # UI Components
│   ├── workspace/        # Workspace sub-views (Header, Tabs, Replan Modal)
│   ├── navigation.tsx    # Desktop Rail + Mobile Bottom Bar
│   ├── theme-provider.tsx# Light/Dark/System Theme Context
│   ├── auth-context.tsx  # Firebase Auth State Context
│   └── plan-context.tsx  # Client Plan Store, Undo Stack, and Local Storage
├── lib/                  # Pure Business Logic (Zero UI / Testable)
│   ├── budget.ts         # Deterministic ledger math, formatting, alerts
│   ├── timeline.ts       # Date reflow algorithm & phase assignment
│   ├── diff.ts           # Before/After replanning diff engine
│   ├── ics.ts            # RFC 5545 calendar export generator
│   ├── google-calendar.ts# Google Calendar REST API integration & reminders
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

### 4.1. Deterministic Budget Math (`budget.ts`)
```ts
const subtotalTarget = categories.reduce((sum, cat) => sum + cat.targetEstimate, 0);
const contingencyAmount = Math.round((subtotalTarget * contingencyPercent) / 100);
const taxServiceChargeAmount = Math.round((subtotalTarget * taxServiceChargePercent) / 100);
const totalCommitted = subtotalTarget + contingencyAmount + taxServiceChargeAmount;
const remainingBudget = totalBudget - totalCommitted;
const isOverBudget = remainingBudget < 0;
```
All percentages and remaining funds are computed in native code with zero LLM arithmetic hallucinations.

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
   - When the user presses "Save to Cloud", guest users are prompted with an accessible OAuth modal.
   - Plans are stored under `/users/{uid}/plans/{planId}`.
   - Strict Firestore security rules enforce authentication, user ownership, schema verification, and document size ceilings (<400KB).

---

## 6. Layout & Responsiveness Strategy

- **Full-Width Canvas**: The app shell occupies 100% viewport width and `min-height: 100dvh`. No artificial container bottlenecks leaving blank side margins.
- **Responsive Navigation**:
  - Desktop ($\ge 768\text{px}$): Left-hand navigation rail with collapsed metadata and theme switch.
  - Mobile ($< 768\text{px}$): Fixed bottom navigation bar with safe-area padding and minimum 44px touch targets.
- **Print Optimization**: Dedicated `@media print` rules strip navigation chrome and format ledgers for crisp paper export or PDF generation.

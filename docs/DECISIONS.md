# Architecture Decision Records (ADRs)

This document records the foundational architectural decisions for Aayojan Ace, detailing the business and technical context, alternatives evaluated, rationale, and consequences of each decision.

---

## ADR-001: Deterministic Code for Budget Math & Hard Ceiling Enforcement

### Context
Milestone celebration planning requires absolute financial accuracy. A planning assistant that computes incorrect sums, rounds unpredictably, or allows line items to exceed the user's hard budget ceiling loses host trust instantly. Large Language Models (LLMs) are probabilistic next-token predictors that struggle with multi-step arithmetic, floating-point rounding, and constraint-satisfaction problems.

### Decision
Generative AI is **strictly forbidden** from computing final budget totals, category sums, contingency allowances, or tax allocations.
1. The AI provider is asked only for rough proportional category allocations.
2. A pure TypeScript algorithm ([`validateAndFitBudget()`](file:///src/lib/budget-benchmarks.ts)) deterministically computes the multiplier for contingency and statutory tax allowances.
3. If the sum of category targets exceeds the allowable subtotal, code proportionally rescales allocations down to fit strictly within the ceiling, with the final category absorbing integer rounding remainders.
4. If a user's budget is lean for their guest count and city tier, code automatically prepends honest market benchmark notices and trade-off options into stated assumptions.

### Consequences
- **Positive**: Guaranteed zero financial overruns; mathematical sums are 100% reproducible and verifiable via automated tests.
- **Positive**: Complete decoupling of creative regional theme synthesis from arithmetic.
- **Negative**: Category allocations may be shifted slightly from the model's raw suggestion to preserve hard mathematical ceilings.

---

## ADR-002: Multi-Tier Provider Cascade & Per-Combination Circuit Breakers

### Context
Public generative AI APIs experience regional traffic spikes, quota exhaustion (429), server overload (503), gateway timeouts (504), and credential expiration. Relying on a single AI endpoint or API key creates a single point of failure that breaks user workflows during live demonstrations or peak planning hours.

### Decision
Implement a 4-tier resilient execution cascade ([`executeAiCascade()`](file:///src/lib/ai/orchestrator.ts)) coupled with independent per-combination circuit breakers ([`src/lib/gemini.ts`](file:///src/lib/gemini.ts)):
1. **Gemini Primary Model** (`GEMINI_MODEL`, default `gemini-flash-lite-latest`) with exponential backoff and randomized jitter.
2. **Gemini Fallback Model** (`GEMINI_FALLBACK_MODEL`, default `gemini-3.5-flash-lite`) if the primary model is busy or overloaded.
3. **Groq Cloud Provider** (OpenAI-compatible completions with JSON mode) if configured and secondary key is active.
4. **Built-in Deterministic Template Planner** ([`src/lib/template-planner.ts`](file:///src/lib/template-planner.ts)) as a zero-network local fallback generating a complete, realistic, schema-verified plan in $<1\text{ms}$.

Independent circuit breakers track failure counts per `(keyType, model)` pair. Overload and quota failures trip a cooldown (60 seconds for transient overload, 30 minutes for daily exhaustion), preventing wasted retries on failing endpoints while keeping healthy models accessible. Schema validation errors never trip circuit breakers.

### Consequences
- **Positive**: Zero single points of failure; guaranteed plan generation even during complete cloud provider outages.
- **Positive**: Clear visual non-primary indicators in the UI with a single-click "Try again with AI" option.
- **Negative**: Requires maintaining and synchronizing multiple AI provider adapters and schema converters.

---

## ADR-003: Prepared Regional Plans & Honest Loading Feedback

### Context
Many hosts exploring celebration planners want to review realistic, comprehensive examples (such as a 300-guest Jaipur heritage wedding, a Hyderabad Nikah, or a Kochi church wedding) before entering their own private event parameters. Generating full plans via live LLM calls for every preset selection incurs latency, burns API quota, and risks transient provider failures during initial onboarding.

### Decision
Curate six authentic regional Indian celebration presets ([`src/data/preparedPlans.ts`](file:///src/data/preparedPlans.ts), [`src/data/savedExamples.ts`](file:///src/data/savedExamples.ts)):
1. When a user selects an unchanged preset or clicks a saved example, the application resolves the plan entirely from local memory without making external AI calls.
2. Timelines are dynamically reflowed relative to today's date using pure calendar math ([`reflowTimelineDates()`](file:///src/lib/timeline.ts)).
3. An honest 3-second preparation loader (1 second under `prefers-reduced-motion`) provides realistic pacing, reassuring hosts while preventing UI disorientation.
4. If a user modifies *any* field (budget, guest count, city, non-negotiables), the request is immediately routed to the live AI cascade for bespoke generation.

### Consequences
- **Positive**: Zero API quota consumption and instantaneous availability for standard regional celebration archetypes.
- **Positive**: Reliable offline demonstration capability for evaluators.
- **Negative**: Prepared plans must be periodically audited to maintain realistic market benchmark prices.

---

## ADR-004: Dual-Tier Storage & Ephemeral Session Authentication

### Context
Celebration hosts frequently collaborate on shared devices or explore event ideas in public environments. Persisting sensitive authentication tokens or celebration budgets indefinitely in browser `localStorage` risks unauthorized access and credential leakage. Conversely, requiring mandatory sign-in before exploring the tool causes high user drop-off.

### Decision
Implement a dual-tier storage and authentication model:
1. **Friction-Free Guest Mode**: Default state. Plans are stored ephemerally in React state and synced to browser `localStorage` for continuity. No personal identification required.
2. **Authenticated Cloud Mode**: Users can explicitly sign in via Google OAuth to persist plans to Cloud Firestore under `/users/{userId}/plans/{planId}`.
3. **Session-Only OAuth Tokens**: Google Calendar access tokens for calendar auto-sync are kept strictly in runtime memory (`useRef` / React state) and never written to `localStorage`, Firestore, or cookies. Tokens are wiped immediately upon sign-out, session expiration, or 401 response.
4. **Hardened Firestore Security Rules**: Root collections deny all access. User plan collections enforce `request.auth.uid == userId`, strict key whitelisting, and immutable subcollection version snapshots (`allow update: if false;`).

### Consequences
- **Positive**: Zero credential exposure in local storage; guest privacy is respected.
- **Positive**: Friction-free initial onboarding with optional cloud backup.
- **Negative**: Guests on private browsing sessions must export or save to cloud before clearing browsing data.

---

## ADR-005: In-Memory Token Bucket Rate Limiting with Stale Eviction

### Context
Public API routes (`/api/plan/generate`, `/api/plan/replan`, `/api/plan/ask`) must be defended against automated Denial-of-Service (DoS) and brute-force token exhaustion. Deploying external distributed rate limiters (e.g. Redis / Upstash) introduces external network latency, cloud costs, and third-party operational dependencies.

### Decision
Deploy an in-memory Token Bucket rate limiter ([`TokenBucketLimiter`](file:///src/lib/ratelimit.ts)):
1. Configured with a burst capacity of 10-12 tokens and a refill rate of 0.5 tokens/sec (1 token every 2 seconds) per client IP address.
2. A strict request body ceiling of 300KB (`MAX_BODY_BYTES`) prevents memory exhaustion attacks.
3. Automated stale key eviction removes IP buckets inactive for $>15$ minutes, bounding memory consumption in long-running Node.js processes.
4. A dedicated, tighter limiter (`probeLimiter`: 3 req/min) protects diagnostic endpoints.

### Consequences
- **Positive**: Zero external infrastructure dependencies; sub-microsecond latency checks.
- **Positive**: Accommodates natural human bursts (rapid tab switches, quick parameter edits) while throttling automated scrapers.
- **Negative**: In serverless multi-instance environments without sticky sessions, rate limits apply per container rather than globally.

---

## ADR-006: Range Estimates & Stated Assumptions Instead of Fixed Quotes

### Context
Celebration costs vary widely based on vendor availability, seasonality, regional auspicious dates (*muhurat* dates), and bespoke customizations. Providing a single fixed number (e.g. "Venue: ₹5,00,000") misleads hosts into believing the assistant has negotiated a guaranteed contract price, causing friction when real vendor quotes arrive.

### Decision
All financial figures across the application present Minimum, Target, and Maximum estimate ranges accompanied by explicit planning assumptions:
1. Every category line item specifies `minEstimate`, `targetEstimate`, and `maxEstimate` ([`budgetCategorySchema`](file:///src/lib/schemas.ts)).
2. The user interface prominently labels estimates as "Planning benchmark estimates, not guaranteed vendor quotes."
3. Stated planning assumptions are itemized alongside the budget (e.g. "Peak wedding season rate card in Jaipur", "Mid-range banquet hospitality").
4. Vendor checklists explicitly display a **"Verify with the vendor"** badge and provide discovery interview questions rather than fictitious contact details.

### Consequences
- **Positive**: Ethical, realistic financial guidance that sets proper expectations with clients and hosts.
- **Positive**: Accommodates real-world vendor price variance and contingency negotiations.
- **Negative**: Requires displaying range brackets in the UI rather than simple single-value totals.

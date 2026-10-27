// scripts/reproduce-plan-call.mjs
// Calls /api/plan/followup and /api/plan/generate with a sample 300-guest wedding payload.
// Uses a unique timestamp in the non-negotiables to bypass LRU cache.
// Never prints any secret or key.

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';
const runId = Date.now().toString(36);

const samplePayload = {
  intake: {
    eventType: 'Wedding',
    city: 'Jaipur',
    date: '2027-04-15',
    guestCount: 300,
    totalBudget: 2500000,
    currency: 'INR',
    styleCulture: 'Traditional Royal Rajasthani with Mehendi and Sangeet',
    nonNegotiables: `Dedicated Jain catering counter with separate preparation area, live Shehnai ensemble [Run-${runId}]`,
  },
};

const followupPayload = {
  intake: samplePayload.intake,
  previousFollowUpsCount: 0,
};

async function testEndpoint(name, url, body, headers = {}) {
  console.log(`\n========================================`);
  console.log(`Calling: ${name} -> ${url}`);
  console.log(`========================================`);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const latency = Date.now() - start;
    console.log(`Status: ${res.status} ${res.statusText} (${latency}ms)`);
    const xCache = res.headers.get('x-cache') || 'NONE';
    console.log(`X-Cache: ${xCache}`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      console.log('Response JSON keys:', Object.keys(data));
      if (data.code || data.error || data.message || data.generationErrorCode) {
        console.log('Error info:', {
          code: data.code,
          generationErrorCode: data.generationErrorCode,
          generationSource: data.generationSource,
          providerNotice: data.providerNotice,
          error: data.error,
          message: data.message,
        });
      }
      if (data.id && data.title) {
        console.log('Plan summary:', {
          id: data.id,
          title: data.title,
          source: data.generationSource,
          generationErrorCode: data.generationErrorCode,
          isSavedExample: data.isSavedExample,
          tasksCount: data.timeline?.length,
          categoriesCount: data.budget?.categories?.length,
        });
      }
      if (data.needsFollowUp !== undefined) {
        console.log('Follow-up info:', {
          needsFollowUp: data.needsFollowUp,
          questionText: data.questionText,
          options: data.options,
        });
      }
    } else {
      const text = await res.text();
      console.log('Response text (first 300 chars):', text.slice(0, 300));
    }
  } catch (err) {
    console.log(`Fetch failed after ${Date.now() - start}ms:`, err.message);
  }
}

async function run() {
  console.log('Target app URL:', BASE_URL);
  await testEndpoint('1. Followup Check', `${BASE_URL}/api/plan/followup`, followupPayload);
  await testEndpoint('2. Plan Generate (Default - with template fallback)', `${BASE_URL}/api/plan/generate`, samplePayload);
  await testEndpoint('3. Plan Generate (Raw AI error with fallback disabled)', `${BASE_URL}/api/plan/generate`, samplePayload, {
    'x-disable-template-fallback': 'true',
  });
}

run();

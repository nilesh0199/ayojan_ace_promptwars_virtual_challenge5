import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { z } from 'zod';

// Load .env.local if present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

// Mask key safely: NEVER print actual key characters
function maskKey(key) {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return 'NOT SET (Missing)';
  }
  const trimmed = key.trim();
  if (trimmed.startsWith('<') || trimmed.startsWith('your_')) {
    return 'SET (Placeholder: invalid)';
  }
  return `CONFIGURED (Present, length=${trimmed.length} chars, masked)`;
}

// Error categorization helper
function categorizeError(status, message) {
  const lower = (message || '').toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    (status === 400 && (lower.includes('api_key_invalid') || lower.includes('invalid api key') || lower.includes('api key not valid'))) ||
    lower.includes('api_key_invalid') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  ) {
    return 'invalid key';
  }
  if (status === 404 || lower.includes('not found') || lower.includes('models/')) {
    return 'model not found';
  }
  if (status === 429 || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'quota';
  }
  if (status === 503 || lower.includes('overload') || lower.includes('unavailable') || lower.includes('high demand')) {
    return 'overload';
  }
  if (status === 504 || status === 408 || lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
    return 'timeout';
  }
  if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('fetch failed') || lower.includes('network')) {
    return 'network';
  }
  if (lower.includes('json') || lower.includes('validation') || lower.includes('schema') || lower.includes('parse')) {
    return 'malformed output';
  }
  return `unclassified (status=${status})`;
}

// Zod schema for plan generation validation
const samplePlanSchema = z.object({
  budget: z.object({
    total: z.number().positive(),
    categories: z.array(
      z.object({
        name: z.string(),
        allocated: z.number().nonnegative(),
        percentage: z.number().nonnegative(),
      })
    ).min(3),
  }),
  timeline: z.array(
    z.object({
      title: z.string(),
      phase: z.string(),
    })
  ).min(3),
  vendors: z.array(
    z.object({
      category: z.string(),
      name: z.string(),
      estimatedCost: z.number().nonnegative(),
    })
  ).min(2),
  ideas: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ).min(1),
});

async function diagnoseGemini(label, apiKey, modelName) {
  console.log(`\n======================================================`);
  console.log(`DIAGNOSING: ${label}`);
  console.log(`======================================================`);
  console.log(`Key Status:       ${maskKey(apiKey)}`);
  console.log(`Configured Model: ${modelName || 'NOT SET'}`);

  if (!apiKey || apiKey.trim().length === 0 || apiKey.startsWith('<')) {
    console.log(`[SKIP] Provider cannot be called because API key is missing or placeholder.`);
    return { status: 'skipped', reason: 'missing_key' };
  }

  const cleanKey = apiKey.trim();

  // 1. List available models
  console.log(`\n--- Step 1: Listing Available Models via Google AI Studio ---`);
  let availableModels = [];
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const startList = performance.now();
    const res = await fetch(listUrl);
    const listDuration = Math.round(performance.now() - startList);
    const resJson = await res.json();

    if (!res.ok) {
      const errCat = categorizeError(res.status, JSON.stringify(resJson));
      console.log(`Failed to list models. HTTP Status: ${res.status} (${listDuration}ms)`);
      console.log(`Error Category: ${errCat}`);
      console.log(`Upstream Error: ${resJson.error?.message || 'Unknown error'}`);
    } else if (resJson.models) {
      availableModels = resJson.models
        .filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''));

      console.log(`Available models supporting generateContent (${availableModels.length} models found in ${listDuration}ms):`);
      console.log(`  Sample available: ${availableModels.slice(0, 8).join(', ')}...`);

      const modelMatched = availableModels.includes(modelName);
      if (modelMatched) {
        console.log(`  MATCH: Configured model "${modelName}" IS present in available models list.`);
      } else {
        console.log(`  MISMATCH: Configured model "${modelName}" is NOT found in Google's supported models list!`);
        console.log(`  Hint: Google Gemini models currently available include:`);
        const flashModels = availableModels.filter((m) => m.includes('flash') || m.includes('pro'));
        console.log(`  ${flashModels.slice(0, 6).join(', ')}`);
      }
    }
  } catch (err) {
    console.log(`Network error while listing models: ${err.message}`);
  }

  // 2. Tiny Test Call
  console.log(`\n--- Step 2: Tiny Test Call (One-word reply, 5 tokens max) ---`);
  let tinySuccess = false;
  try {
    const tinyUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    const startTiny = performance.now();
    const res = await fetch(tinyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with exactly one word: OK' }] }],
        generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
      }),
    });
    const tinyDuration = Math.round(performance.now() - startTiny);
    const resJson = await res.json();

    if (res.ok) {
      tinySuccess = true;
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      console.log(`Result: SUCCESS`);
      console.log(`HTTP Status: ${res.status}`);
      console.log(`Latency:     ${tinyDuration}ms`);
      console.log(`Reply:       "${text}"`);
    } else {
      const errCat = categorizeError(res.status, JSON.stringify(resJson));
      console.log(`Result: FAILED`);
      console.log(`HTTP Status:    ${res.status}`);
      console.log(`Latency:        ${tinyDuration}ms`);
      console.log(`Error Category: ${errCat}`);
      console.log(`Upstream Message: ${resJson.error?.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`Tiny call threw network exception: ${err.message}`);
  }

  // 3. Realistic Plan Generation (Sample 300-guest wedding in Jaipur)
  console.log(`\n--- Step 3: Realistic Plan Generation (300-guest Jaipur Wedding) ---`);
  if (!tinySuccess) {
    console.log(`[SKIPPED] Realistic plan generation skipped because tiny test call failed for model "${modelName}".`);
    return;
  }

  try {
    const planPrompt = `You are a celebration planner. Generate an itemized JSON celebration plan for:
Event: Wedding in Jaipur, India
Date: 2027-02-15
Guests: 300
Budget: 2500000 INR
Style: Royal Rajasthani Heritage
Non-negotiables: Vegetarian catering, grand baraat, drone photography

Respond ONLY with a valid JSON object matching:
{
  "budget": {
    "total": 2500000,
    "categories": [
      { "name": "string", "allocated": number, "percentage": number }
    ]
  },
  "timeline": [
    { "title": "string", "phase": "string" }
  ],
  "vendors": [
    { "category": "string", "name": "string", "estimatedCost": number }
  ],
  "ideas": [
    { "title": "string", "description": "string" }
  ]
}`;

    const planUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    const startPlan = performance.now();
    const res = await fetch(planUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: planPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });
    const planDuration = Math.round(performance.now() - startPlan);
    const resJson = await res.json();

    if (!res.ok) {
      const errCat = categorizeError(res.status, JSON.stringify(resJson));
      console.log(`Realistic Generation FAILED.`);
      console.log(`HTTP Status:    ${res.status}`);
      console.log(`Total Latency:  ${planDuration}ms`);
      console.log(`Error Category: ${errCat}`);
      console.log(`Message:        ${resJson.error?.message || 'Unknown'}`);
      return;
    }

    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log(`HTTP Status:   ${res.status}`);
    console.log(`Total Latency: ${planDuration}ms`);

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.log(`JSON Parse Failed: ${parseErr.message}`);
      console.log(`Failed Step: JSON Parsing`);
      return;
    }

    const validation = samplePlanSchema.safeParse(parsed);
    if (validation.success) {
      console.log(`Zod Validation: PASSED`);
      console.log(`Categories:     ${validation.data.budget.categories.length}`);
      console.log(`Timeline Tasks: ${validation.data.timeline.length}`);
      console.log(`Vendors:        ${validation.data.vendors.length}`);
    } else {
      console.log(`Zod Validation: FAILED`);
      console.log(`Failed Step: Schema Validation`);
      console.log(`Issues:`, validation.error.issues);
    }
  } catch (err) {
    console.log(`Realistic generation threw exception: ${err.message}`);
  }
}

async function diagnoseGroq(apiKey, modelName) {
  console.log(`\n======================================================`);
  console.log(`DIAGNOSING: Backup Provider (Groq)`);
  console.log(`======================================================`);
  console.log(`Key Status:       ${maskKey(apiKey)}`);
  console.log(`Configured Model: ${modelName || 'NOT SET'}`);

  if (!apiKey || apiKey.trim().length === 0 || apiKey.startsWith('<')) {
    console.log(`[INFO] Backup Groq provider is NOT configured (optional).`);
    return;
  }

  const cleanKey = apiKey.trim();

  // Check expiration date
  const expiresOn = process.env.GROQ_KEY_EXPIRES_ON;
  if (expiresOn) {
    const expDate = new Date(expiresOn);
    if (!isNaN(expDate.getTime()) && Date.now() > expDate.getTime()) {
      console.log(`[NOTICE] Backup key expired on ${expiresOn} per GROQ_KEY_EXPIRES_ON.`);
    }
  }

  // 1. List Groq models
  console.log(`\n--- Step 1: Listing Groq Models ---`);
  let groqModels = [];
  try {
    const startList = performance.now();
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${cleanKey}` },
    });
    const listDuration = Math.round(performance.now() - startList);
    const data = await res.json();
    if (res.ok && data.data) {
      groqModels = data.data.map((m) => m.id);
      console.log(`Groq models count: ${groqModels.length} (${listDuration}ms)`);
      console.log(`Sample: ${groqModels.slice(0, 6).join(', ')}`);
      const matched = groqModels.includes(modelName);
      console.log(`Configured model "${modelName}" in Groq: ${matched ? 'MATCHED' : 'NOT FOUND'}`);
    } else {
      const cat = categorizeError(res.status, JSON.stringify(data));
      console.log(`Groq models check failed. HTTP ${res.status}: ${cat}`);
    }
  } catch (err) {
    console.log(`Groq models listing network error: ${err.message}`);
  }

  // 2. Tiny Test Call
  console.log(`\n--- Step 2: Tiny Test Call to Groq ---`);
  try {
    const startTiny = performance.now();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
      }),
    });
    const duration = Math.round(performance.now() - startTiny);
    const data = await res.json();
    if (res.ok) {
      console.log(`Result: SUCCESS (HTTP ${res.status}, ${duration}ms)`);
      console.log(`Reply: "${data.choices?.[0]?.message?.content?.trim()}"`);
    } else {
      const cat = categorizeError(res.status, JSON.stringify(data));
      console.log(`Result: FAILED (HTTP ${res.status}, ${duration}ms, category: ${cat})`);
      console.log(`Error: ${data.error?.message || 'Unknown'}`);
    }
  } catch (err) {
    console.log(`Groq tiny call threw exception: ${err.message}`);
  }
}

async function run() {
  console.log(`======================================================`);
  console.log(`AAYOJAN ACE — AI PROVIDER DIAGNOSTIC SUITE`);
  console.log(`Safe local inspection. No secrets or keys are printed.`);
  console.log(`======================================================`);

  const primaryKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackKey = process.env.GEMINI_API_KEY_FALLBACK || primaryKey;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash';

  await diagnoseGemini('Gemini Primary Provider', primaryKey, primaryModel);
  await diagnoseGemini('Gemini Fallback Model', fallbackKey, fallbackModel);

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  await diagnoseGroq(groqKey, groqModel);

  console.log(`\n======================================================`);
  console.log(`DIAGNOSTIC COMPLETE`);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});

import { NextResponse } from 'next/server';
import { probeLimiter, getClientIp } from '@/lib/ratelimit';
import { timingSafeEqualString } from '@/lib/api-helper';
import {
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODEL,
} from '@/lib/gemini';
import { DEFAULT_GROQ_MODEL } from '@/lib/ai/groq-provider';

export const maxDuration = 30;

function categorizeStatus(status: number, rawMessage: string): string {
  const lower = (rawMessage || '').toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    (status === 400 && (lower.includes('api_key_invalid') || lower.includes('invalid api key') || lower.includes('api key not valid'))) ||
    lower.includes('unauthorized') ||
    lower.includes('api_key_invalid')
  ) {
    return 'invalid_key';
  }
  if (status === 404 || lower.includes('not found') || lower.includes('models/')) {
    return 'model_not_found';
  }
  if (status === 429 || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'quota';
  }
  if (status === 503 || lower.includes('overloaded') || lower.includes('unavailable') || lower.includes('high demand')) {
    return 'overload';
  }
  if (status === 504 || status === 408 || lower.includes('timeout') || lower.includes('deadline')) {
    return 'timeout';
  }
  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('econnrefused')) {
    return 'network';
  }
  if (lower.includes('json') || lower.includes('validation')) {
    return 'malformed';
  }
  return status >= 200 && status < 300 ? 'success' : 'error';
}

export async function GET(request: Request) {
  // 1. Feature flag: enabled ONLY when HEALTH_PROBE_TOKEN is defined
  const expectedToken = process.env.HEALTH_PROBE_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // 2. Constant-time token authentication check
  const authHeader = request.headers.get('authorization') || '';
  const providedToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!providedToken || !timingSafeEqualString(providedToken, expectedToken)) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 3. Strict rate limiting: 3 calls per minute per client IP
  const clientIp = getClientIp(request.headers);
  const rateResult = probeLimiter.check(clientIp);
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Probe rate limit exceeded. Please wait ${rateResult.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateResult.retryAfterSeconds),
        },
      }
    );
  }

  // 4. Perform tiny test calls for each configured provider
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const groqModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  const results: Array<{
    provider: string;
    model: string;
    status: number;
    category: string;
    latencyMs: number;
  }> = [];

  // Tiny call helper for Gemini
  const probeGemini = async (label: string, apiKey: string | undefined, model: string) => {
    if (!apiKey || apiKey.trim().length === 0 || apiKey.startsWith('<') || apiKey.startsWith('your_')) {
      results.push({
        provider: label,
        model,
        status: 400,
        category: 'not_configured',
        latencyMs: 0,
      });
      return;
    }

    const cleanKey = apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'OK' }] }],
          generationConfig: { maxOutputTokens: 2, temperature: 0.1 },
        }),
      });
      clearTimeout(timer);

      const latencyMs = Math.round(performance.now() - start);
      const resJson = await res.json().catch(() => ({}));
      const category = res.ok ? 'success' : categorizeStatus(res.status, JSON.stringify(resJson));

      results.push({
        provider: label,
        model,
        status: res.status,
        category,
        latencyMs,
      });
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.includes('abort') || msg.includes('timeout');
      results.push({
        provider: label,
        model,
        status: isTimeout ? 504 : 503,
        category: isTimeout ? 'timeout' : 'network',
        latencyMs,
      });
    }
  };

  await probeGemini('gemini_primary', process.env.GEMINI_API_KEY, primaryModel);

  if (fallbackModel !== primaryModel || process.env.GEMINI_API_KEY_FALLBACK) {
    await probeGemini(
      'gemini_fallback',
      process.env.GEMINI_API_KEY_FALLBACK || process.env.GEMINI_API_KEY,
      fallbackModel
    );
  }

  // Tiny call for Groq (if configured)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey && !groqKey.startsWith('<') && !groqKey.startsWith('your_')) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 2,
        }),
      });
      clearTimeout(timer);

      const latencyMs = Math.round(performance.now() - start);
      const resJson = await res.json().catch(() => ({}));
      const category = res.ok ? 'success' : categorizeStatus(res.status, JSON.stringify(resJson));

      results.push({
        provider: 'groq',
        model: groqModel,
        status: res.status,
        category,
        latencyMs,
      });
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.includes('abort') || msg.includes('timeout');
      results.push({
        provider: 'groq',
        model: groqModel,
        status: isTimeout ? 504 : 503,
        category: isTimeout ? 'timeout' : 'network',
        latencyMs,
      });
    }
  }

  return NextResponse.json({
    enabled: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

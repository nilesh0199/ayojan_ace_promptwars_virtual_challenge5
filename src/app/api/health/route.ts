import { NextResponse } from 'next/server';
import { checkRequestSafety } from '@/lib/api-helper';
import {
  isGroqKeyExpired,
  isGroqDisabled,
  getGroqDisabledReason,
  DEFAULT_GROQ_MODEL,
} from '@/lib/ai/groq-provider';
import {
  isDailyQuotaCombination,
  DEFAULT_PRIMARY_MODEL,
} from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
  );
  const fallbackKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY_FALLBACK && process.env.GEMINI_API_KEY_FALLBACK.trim().length > 0
  );
  const groqKeyConfigured = Boolean(
    process.env.GROQ_API_KEY &&
      process.env.GROQ_API_KEY.trim().length > 0 &&
      !process.env.GROQ_API_KEY.startsWith('<') &&
      !process.env.GROQ_API_KEY.startsWith('your_')
  );
  const modelConfigured = Boolean(
    (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0) || true
  );

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  let geminiStatus: 'configured' | 'missing' | 'quota-exhausted' | 'model-not-found' = 'missing';
  if (!geminiConfigured) {
    geminiStatus = 'missing';
  } else if (isDailyQuotaCombination('primary', primaryModel)) {
    geminiStatus = 'quota-exhausted';
  } else {
    geminiStatus = 'configured';
  }

  let fallbackStatus: 'configured' | 'missing' | 'quota-exhausted' = 'missing';
  if (fallbackKeyConfigured) {
    if (isDailyQuotaCombination('fallback', primaryModel)) {
      fallbackStatus = 'quota-exhausted';
    } else {
      fallbackStatus = 'configured';
    }
  }

  const groqModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  let groqStatus: 'configured' | 'missing' | 'quota-exhausted' | 'model-not-found' | 'expired' = 'missing';
  if (groqKeyConfigured) {
    if (isGroqDisabled()) {
      const reason = getGroqDisabledReason();
      groqStatus = reason === 'model-not-found' ? 'model-not-found' : 'expired';
    } else if (isGroqKeyExpired()) {
      groqStatus = 'expired';
    } else if (isDailyQuotaCombination('groq', groqModel)) {
      groqStatus = 'quota-exhausted';
    } else {
      groqStatus = 'configured';
    }
  }

  const isHealthy = geminiConfigured && modelConfigured && geminiStatus !== 'quota-exhausted';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      gemini: geminiStatus,
      groq: groqStatus,
      fallbackKey: fallbackStatus,
      model: modelConfigured ? 'configured' : 'missing',
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

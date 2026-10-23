import { NextResponse } from 'next/server';
import { checkRequestSafety } from '@/lib/api-helper';
import { isGroqKeyExpired } from '@/lib/ai/groq-provider';

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

  let groqStatus: 'configured' | 'missing' | 'expired' = 'missing';
  if (groqKeyConfigured) {
    groqStatus = isGroqKeyExpired() ? 'expired' : 'configured';
  }

  const isHealthy = geminiConfigured && modelConfigured;

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      gemini: geminiConfigured ? 'configured' : 'missing',
      groq: groqStatus,
      fallbackKey: fallbackKeyConfigured ? 'configured' : 'missing',
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

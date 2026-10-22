import { NextResponse } from 'next/server';
import { checkRequestSafety } from '@/lib/api-helper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const safety = checkRequestSafety(request);
  if (!safety.allowed) {
    return safety.response;
  }

  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
  );
  const modelConfigured = Boolean(
    (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0) || true
  );

  const isHealthy = geminiConfigured && modelConfigured;

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      gemini: geminiConfigured ? 'configured' : 'missing',
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

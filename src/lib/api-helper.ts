import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { GeminiApiError } from './gemini';
import { apiLimiter, getClientIp } from './ratelimit';

export const MAX_BODY_BYTES = 300 * 1024; // 300 KB ceiling to prevent DoS

export type SafetyCheckResult =
  | { allowed: true; clientIp: string }
  | { allowed: false; response: NextResponse; clientIp: string };

/**
 * Standard security check for incoming API route requests:
 * 1. Checks content length
 * 2. Enforces token bucket rate limiting per client IP
 */
export function checkRequestSafety(request: Request): SafetyCheckResult {
  const clientIp = getClientIp(request.headers);
  const contentLength = Number(request.headers.get('content-length') || 0);

  if (contentLength > MAX_BODY_BYTES) {
    return {
      allowed: false,
      clientIp,
      response: NextResponse.json(
        {
          error: 'Payload Too Large',
          message: `Request body exceeds maximum permissible size of ${MAX_BODY_BYTES / 1024}KB`,
        },
        { status: 413 }
      ),
    };
  }

  const rateCheck = apiLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      clientIp,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit reached. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds),
          },
        }
      ),
    };
  }

  return { allowed: true, clientIp };
}

/**
 * Global API error mapper that converts domain errors into consistent JSON responses.
 * Never leaks secrets or full stack traces to the client.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid request payload format or parameters',
        issues: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  if (err instanceof GeminiApiError) {
    return NextResponse.json(
      {
        error: 'AI Planning Service Alert',
        message: err.message,
      },
      { status: err.statusCode }
    );
  }

  const genericMessage =
    err instanceof Error ? err.message : 'An unexpected server error occurred';

  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'Failed to process plan request. Please retry.',
      debugMessage: process.env.NODE_ENV === 'development' ? genericMessage : undefined,
    },
    { status: 500 }
  );
}

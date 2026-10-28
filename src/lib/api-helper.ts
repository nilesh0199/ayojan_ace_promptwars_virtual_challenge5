import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ZodError } from 'zod';
import { GeminiApiError, mapGeminiError } from './gemini';
import { apiLimiter, getClientIp } from './ratelimit';

/**
 * Constant-time string comparison to defend against timing attacks.
 *
 * Why: Standard string equality (`a === b`) short-circuits on the first mismatched
 * character, exposing microsecond timing differences that allow attackers to deduce
 * secret tokens character-by-character. Constant-time byte comparison prevents this.
 *
 * @param a - Untrusted user-provided string token.
 * @param b - Expected secret token.
 * @returns True if strings are byte-for-byte identical.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

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
          code: 'PAYLOAD_TOO_LARGE',
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
          code: 'RATE_LIMIT_EXCEEDED',
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
 * Never leaks raw upstream error JSON, stack traces, or secrets to the client.
 * Returns typed error codes and friendly, positive messages.
 *
 * Why: Cloud providers return raw JSON with internal IP addresses, upstream endpoints,
 * and occasional auth diagnostics. Intercepting every unhandled error guarantees zero
 * information disclosure while providing structured error codes for client recovery.
 *
 * @param err - Caught error object from an API route handler.
 * @returns Clean Next.js JSON response with status code, typed error code, and friendly message.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        code: 'AI_VALIDATION_FAILED',
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
        code: err.code,
        message: err.message,
      },
      { status: err.statusCode }
    );
  }

  const mapped = mapGeminiError(err);
  return NextResponse.json(
    {
      error: 'AI Planning Service Alert',
      code: mapped.code,
      message: mapped.message,
    },
    { status: mapped.statusCode }
  );
}

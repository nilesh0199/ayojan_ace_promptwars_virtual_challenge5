import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractJsonFromResponse,
  callGeminiStructured,
  getGeminiClient,
  GeminiApiError,
} from '@/lib/gemini';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

describe('Gemini SDK Integration & Extraction', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash';
  });

  it('extracts raw JSON when wrapped in markdown codeblocks', () => {
    const raw = '```json\n{"needsFollowUp": false}\n```';
    expect(extractJsonFromResponse(raw)).toBe('{"needsFollowUp": false}');

    const clean = '{"needsFollowUp": true}';
    expect(extractJsonFromResponse(clean)).toBe('{"needsFollowUp": true}');
  });

  it('successfully returns validated data when model responds cleanly', async () => {
    const mockSchema = z.object({
      greeting: z.string(),
      count: z.number(),
    });

    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({ greeting: 'Namaste', count: 5 }),
        }),
      },
    } as unknown as GoogleGenAI;

    const result = await callGeminiStructured('test prompt', mockSchema, {
      customClient: mockClient,
      maxRetries: 0,
    });

    expect(result.greeting).toBe('Namaste');
    expect(result.count).toBe(5);
  });

  it('attempts fallback model when primary model fails', async () => {
    const mockSchema = z.object({
      status: z.string(),
    });

    const generateContentMock = vi
      .fn()
      // First call (primary model) fails with 503
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      // Second call (fallback model) succeeds
      .mockResolvedValueOnce({
        text: JSON.stringify({ status: 'ok-from-fallback' }),
      });

    const mockClient = {
      models: {
        generateContent: generateContentMock,
      },
    } as unknown as GoogleGenAI;

    const result = await callGeminiStructured('test prompt', mockSchema, {
      customClient: mockClient,
      maxRetries: 0,
    });

    expect(result.status).toBe('ok-from-fallback');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('throws GeminiApiError when AI response violates schema', async () => {
    const mockSchema = z.object({
      requiredNumber: z.number(),
    });

    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({ requiredNumber: 'not-a-number' }),
        }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      callGeminiStructured('prompt', mockSchema, {
        customClient: mockClient,
        maxRetries: 0,
      })
    ).rejects.toThrow();
  });

  it('throws when model returns empty text or malformed JSON', async () => {
    const mockSchema = z.object({ status: z.string() });

    const emptyClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: '' }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      callGeminiStructured('prompt', mockSchema, {
        customClient: emptyClient,
        maxRetries: 0,
      })
    ).rejects.toThrow();

    const malformedClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: '{ unclosed json' }),
      },
    } as unknown as GoogleGenAI;

    await expect(
      callGeminiStructured('prompt', mockSchema, {
        customClient: malformedClient,
        maxRetries: 0,
      })
    ).rejects.toThrow();
  });

  it('throws GeminiApiError when GEMINI_API_KEY is not defined in environment', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => getGeminiClient()).toThrow('GEMINI_API_KEY is not set');
  });
});

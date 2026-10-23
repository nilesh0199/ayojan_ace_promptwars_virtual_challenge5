import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { AiProvider, AiCallOptions } from './types';
import { executeWithRepairRetry } from './repair';
import {
  DEFAULT_PRIMARY_MODEL,
  getGeminiClient,
  GeminiKeyType,
  GeminiApiError,
  mapGeminiError,
} from '../gemini';

export class GeminiProvider implements AiProvider {
  public readonly id = 'gemini' as const;
  public readonly name = 'Google Gemini' as const;
  public readonly defaultModel = DEFAULT_PRIMARY_MODEL;

  private keyType: GeminiKeyType;
  private customClient?: GoogleGenAI;

  constructor(options?: { keyType?: GeminiKeyType; customClient?: GoogleGenAI }) {
    this.keyType = options?.keyType || 'primary';
    this.customClient = options?.customClient;
  }

  public isConfigured(): boolean {
    if (this.customClient) return true;
    const key =
      this.keyType === 'fallback'
        ? process.env.GEMINI_API_KEY_FALLBACK
        : process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0 && !key.startsWith('<') && !key.startsWith('your_'));
  }

  public getModel(options?: AiCallOptions): string {
    return options?.model || process.env.GEMINI_MODEL || this.defaultModel;
  }

  public async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T, any, any>,
    options?: AiCallOptions
  ): Promise<T> {
    const client = this.customClient || getGeminiClient(this.keyType);
    const model = this.getModel(options);
    const timeoutMs = options?.timeoutMs ?? 10000;

    const generateRaw = async (currentPrompt: string, signal?: AbortSignal): Promise<string> => {
      const activeSignal = signal || options?.signal;
      if (activeSignal?.aborted) {
        throw new GeminiApiError('Request aborted by caller', 504, true, 'AI_TIMEOUT');
      }

      let timerId: ReturnType<typeof setTimeout> | undefined;

      const abortPromise = new Promise<never>((_, reject) => {
        activeSignal?.addEventListener(
          'abort',
          () => reject(new GeminiApiError('Request aborted by caller', 504, true, 'AI_TIMEOUT')),
          { once: true }
        );

        if (timeoutMs > 0) {
          timerId = setTimeout(() => {
            reject(new GeminiApiError(`Gemini request timed out after ${timeoutMs}ms`, 504, true, 'AI_TIMEOUT'));
          }, timeoutMs);
        }
      });

      try {
        const executionPromise = client.models.generateContent({
          model,
          contents: currentPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: options?.temperature ?? 0.4,
          },
        });

        const response = await Promise.race([executionPromise, abortPromise]);
        const text = response.text;

        if (!text || typeof text !== 'string') {
          throw new GeminiApiError('Gemini returned empty response', 502, true, 'AI_VALIDATION_FAILED');
        }

        return text;
      } catch (err) {
        if (err instanceof GeminiApiError) {
          throw err;
        }
        throw mapGeminiError(err);
      } finally {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
      }
    };

    return executeWithRepairRetry(generateRaw, prompt, schema, options?.signal);
  }
}

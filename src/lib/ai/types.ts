import { z } from 'zod';
import { GeminiErrorCode } from '../gemini';
import { PlanGenerationSource } from '../schemas';

export type AiProviderId = 'gemini' | 'groq';

export interface AiCallOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  temperature?: number;
  model?: string;
  jitterFn?: () => number;
  normalizer?: (raw: unknown) => unknown;
}

/**
 * Universal interface for AI model execution.
 * Decouples provider-specific networking from business logic.
 */
export interface AiProvider {
  readonly id: AiProviderId;
  readonly name: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T, any, any>,
    options?: AiCallOptions
  ): Promise<T>;
}

export interface AiExecutionResult<T> {
  data: T;
  source: PlanGenerationSource;
  provider: AiProviderId | 'template';
  model: string;
}

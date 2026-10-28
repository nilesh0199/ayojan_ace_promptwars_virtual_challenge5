export interface SafeValidationLogParams {
  provider: string;
  model: string;
  receivedKeys: string[];
  failingPaths: string[];
}

/**
 * Logs a single safe server line on schema validation failure.
 *
 * SECURITY DIRECTIVE:
 * - NEVER log user prompts or client input.
 * - NEVER log raw field values or payload bodies.
 * - NEVER log API keys or secrets.
 * - ONLY log safe metadata: provider identifier, model name, top-level key names received, and failing field paths.
 */
export function logSafeAiValidationFailure(params: SafeValidationLogParams): void {
  console.warn(
    `[AI Validation] provider=${params.provider} model=${params.model} receivedKeys=${JSON.stringify(
      params.receivedKeys
    )} failingPaths=${JSON.stringify(params.failingPaths)}`
  );
}

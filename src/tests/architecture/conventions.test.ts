import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Architecture & Convention Tests
 *
 * Enforces structural integrity, dependency direction, secret isolation,
 * API safety standards, and code hygiene across the entire codebase.
 */
describe('Architecture & Convention Conformance', () => {
  // Resolve paths relative to project root
  const projectRoot = path.resolve(__dirname, '../../..');
  const srcDir = path.join(projectRoot, 'src');
  const libDir = path.join(srcDir, 'lib');
  const apiDir = path.join(srcDir, 'app', 'api');

  /**
   * Helper to recursively collect source files ending in .ts or .tsx
   * excluding node_modules, .next, and tests themselves.
   */
  function getSourceFiles(dir: string, includeTests = false): string[] {
    let files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        if (!includeTests && entry.name === 'tests') continue;
        files = files.concat(getSourceFiles(fullPath, includeTests));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  function toRelativePath(filePath: string): string {
    return path.relative(projectRoot, filePath).replace(/\\/g, '/');
  }

  // --------------------------------------------------------------------------
  // Rule 1: src/lib does not import from src/components or src/app
  // --------------------------------------------------------------------------
  describe('Rule 1: Layered Dependency Direction', () => {
    it('enforces that src/lib has zero imports from src/components or src/app', () => {
      const libFiles = getSourceFiles(libDir);
      const violations: string[] = [];

      const forbiddenPatterns = [
        /@\/components\b/,
        /@\/app\b/,
        /\.\.\/components\b/,
        /\.\.\/app\b/,
        /\.\.\/\.\.\/components\b/,
        /\.\.\/\.\.\/app\b/,
      ];

      for (const file of libFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check import statements
          if (line.trim().startsWith('import ') || line.includes('import(')) {
            for (const pattern of forbiddenPatterns) {
              if (pattern.test(line)) {
                violations.push(`${toRelativePath(file)}:${index + 1}: ${line.trim()}`);
              }
            }
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 2: Every route under src/app/api exports maxDuration
  // --------------------------------------------------------------------------
  describe('Rule 2: API Route Serverless Execution Ceiling', () => {
    const MAX_DURATION_ALLOWLIST = new Map<string, string>([
      [
        'src/app/api/health/route.ts',
        'Lightweight synchronous ping check does not need extended serverless ceiling',
      ],
    ]);

    it('enforces that API routes export maxDuration or are documented in allowlist', () => {
      const apiRouteFiles = getSourceFiles(apiDir).filter((f) => f.endsWith('route.ts'));
      const missingExport: string[] = [];

      for (const file of apiRouteFiles) {
        const relPath = toRelativePath(file);
        if (MAX_DURATION_ALLOWLIST.has(relPath)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const hasMaxDuration =
          /\bexport\s+(const|let|var)\s+maxDuration\s*=\s*\d+/.test(content);

        if (!hasMaxDuration) {
          missingExport.push(relPath);
        }
      }

      expect(missingExport).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 3: No dangerouslySetInnerHTML
  // --------------------------------------------------------------------------
  describe('Rule 3: Cross-Site Scripting (XSS) Prevention', () => {
    const DANGEROUSLY_SET_ALLOWLIST = new Map<string, string>([
      [
        'src/app/layout.tsx',
        'Inline theme bootstrap script preventing flash of unstyled content (FOUC)',
      ],
    ]);

    it('enforces zero dangerouslySetInnerHTML usage outside the documented allowlist', () => {
      const allSrcFiles = getSourceFiles(srcDir);
      const violations: string[] = [];

      for (const file of allSrcFiles) {
        const relPath = toRelativePath(file);
        if (DANGEROUSLY_SET_ALLOWLIST.has(relPath)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('dangerouslySetInnerHTML')) {
          violations.push(relPath);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 4: No eslint-disable comments in src
  // --------------------------------------------------------------------------
  describe('Rule 4: Lint Rule Integrity & Documented Exceptions', () => {
    const ESLINT_DISABLE_ALLOWLIST = new Map<string, string>([
      [
        'src/app/saved/page.tsx',
        'Controlled mount-time subscription to cloud-saved plans (react-hooks/exhaustive-deps)',
      ],
      [
        'src/components/ai-loader.tsx',
        'Timer interval cleanup bound to active phase index (react-hooks/exhaustive-deps)',
      ],
      [
        'src/components/app-shell.tsx',
        'Google user profile avatar rendering with cross-origin fallback (@next/next/no-img-element)',
      ],
      [
        'src/components/landing/landing-header.tsx',
        'Google user profile avatar rendering (@next/next/no-img-element)',
      ],
      [
        'src/components/navigation.tsx',
        'Google user profile avatar rendering (@next/next/no-img-element)',
      ],
      [
        'src/components/plan-context.tsx',
        'Controlled synchronization of active plan state to browser storage (react-hooks/exhaustive-deps)',
      ],
      [
        'src/components/workspace/tab-timeline.tsx',
        'Initial phase filter selection on tab mount (react-hooks/exhaustive-deps)',
      ],
      [
        'src/lib/gemini.ts',
        'Server-side operational error alert logging without leaking secrets (no-console)',
      ],
    ]);

    it('enforces zero eslint-disable comments in src outside the documented allowlist', () => {
      const allSrcFiles = getSourceFiles(srcDir);
      const unallowlisted: string[] = [];

      for (const file of allSrcFiles) {
        const relPath = toRelativePath(file);
        const content = fs.readFileSync(file, 'utf8');

        if (content.includes('eslint-disable')) {
          if (!ESLINT_DISABLE_ALLOWLIST.has(relPath)) {
            unallowlisted.push(relPath);
          }
        }
      }

      expect(unallowlisted).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 5: No console.log in src outside an explicit allowlist
  // --------------------------------------------------------------------------
  describe('Rule 5: Clean Logging & Information Disclosure Prevention', () => {
    const CONSOLE_LOG_ALLOWLIST = new Set<string>();

    it('enforces zero console.log statements in src outside allowlist', () => {
      const allSrcFiles = getSourceFiles(srcDir);
      const violations: string[] = [];

      for (const file of allSrcFiles) {
        const relPath = toRelativePath(file);
        if (CONSOLE_LOG_ALLOWLIST.has(relPath)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Exclude comments
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

          if (/\bconsole\.log\s*\(/.test(line)) {
            violations.push(`${relPath}:${index + 1}: ${trimmed}`);
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 6: No process.env access with computed keys for NEXT_PUBLIC variables
  // --------------------------------------------------------------------------
  describe('Rule 6: Literal Build-Time Environment Variable Inlining', () => {
    it('enforces literal property access for NEXT_PUBLIC variables to guarantee bundler inlining', () => {
      const allSrcFiles = getSourceFiles(srcDir);
      const violations: string[] = [];

      for (const file of allSrcFiles) {
        const relPath = toRelativePath(file);
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Exclude comments
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

          // Detect dynamic computed access like process.env[someVar]
          if (/process\.env\s*\[\s*[^'"`\]]+\s*\]/.test(line)) {
            violations.push(`${relPath}:${index + 1}: ${trimmed}`);
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 7: No hardcoded Gemini or Groq model names outside constants and docs
  // --------------------------------------------------------------------------
  describe('Rule 7: Centralized AI Model Name Configuration', () => {
    const MODEL_DECLARATION_ALLOWLIST = new Map<string, string>([
      [
        'src/lib/gemini.ts',
        'Declares canonical DEFAULT_PRIMARY_MODEL and DEFAULT_FALLBACK_MODEL constants',
      ],
      [
        'src/lib/ai/groq-provider.ts',
        'Declares canonical DEFAULT_GROQ_MODEL constant',
      ],
    ]);

    it('enforces that AI model strings are declared exclusively in canonical constants', () => {
      const allSrcFiles = getSourceFiles(srcDir);
      const violations: string[] = [];

      // Pattern matching model naming strings in quotes
      const modelPattern = /['"`](gemini-[a-z0-9\.\-]+|llama-[a-z0-9\.\-]+)['"`]/i;

      for (const file of allSrcFiles) {
        const relPath = toRelativePath(file);
        if (MODEL_DECLARATION_ALLOWLIST.has(relPath)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const trimmed = line.trim();
          // Exclude comments and documentation
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

          if (modelPattern.test(trimmed)) {
            violations.push(`${relPath}:${index + 1}: ${trimmed}`);
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Rule 8: Each API route uses shared validation and rate limiting helpers
  // --------------------------------------------------------------------------
  describe('Rule 8: Unified API Endpoint Guardrails & Protection', () => {
    const API_ROUTE_SPECIAL_CASES = new Map<string, string>([
      [
        'src/app/api/health/probe/route.ts',
        'Internal diagnostic health probe using dedicated constant-time token comparison and custom probeLimiter',
      ],
      [
        'src/app/api/health/route.ts',
        'Public health check ping endpoint; verified by checkRequestSafety but handles no dynamic request body payload',
      ],
    ]);

    it('enforces that user-facing API routes utilize checkRequestSafety, handleApiError, and schema validation', () => {
      const apiRouteFiles = getSourceFiles(apiDir).filter((f) => f.endsWith('route.ts'));
      const missingGuardrails: string[] = [];

      for (const file of apiRouteFiles) {
        const relPath = toRelativePath(file);
        if (API_ROUTE_SPECIAL_CASES.has(relPath)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');

        const hasSafetyCheck = content.includes('checkRequestSafety');
        const hasErrorHandler = content.includes('handleApiError');
        const hasSchemaValidation =
          content.includes('.parse(') || content.includes('.safeParse(');

        if (!hasSafetyCheck || !hasErrorHandler || !hasSchemaValidation) {
          missingGuardrails.push(
            `${relPath} (safety: ${hasSafetyCheck}, error: ${hasErrorHandler}, schema: ${hasSchemaValidation})`
          );
        }
      }

      expect(missingGuardrails).toEqual([]);
    });

    it('enforces that the public health check route still executes rate-limiting checks', () => {
      const healthRoute = path.join(apiDir, 'health', 'route.ts');
      const content = fs.readFileSync(healthRoute, 'utf8');
      expect(content).toContain('checkRequestSafety');
    });

    it('enforces that the internal diagnostic health probe executes constant-time auth checks', () => {
      const probeRoute = path.join(apiDir, 'health', 'probe', 'route.ts');
      const content = fs.readFileSync(probeRoute, 'utf8');
      expect(content).toContain('timingSafeEqualString');
      expect(content).toContain('probeLimiter');
    });
  });
});

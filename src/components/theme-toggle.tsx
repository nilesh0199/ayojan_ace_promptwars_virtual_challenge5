'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Color theme selection"
      className="inline-flex items-center rounded-full border border-rule bg-paper-card p-1 shadow-sm"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        title="Light theme"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === 'light'
            ? 'bg-accent text-accent-text font-medium shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-paper-subtle'
        }`}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Switch to Light theme</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        title="Dark theme"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === 'dark'
            ? 'bg-accent text-accent-text font-medium shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-paper-subtle'
        }`}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Switch to Dark theme</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        aria-pressed={theme === 'system'}
        title="System theme"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === 'system'
            ? 'bg-accent text-accent-text font-medium shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-paper-subtle'
        }`}
      >
        <Monitor className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Switch to System theme</span>
      </button>
    </div>
  );
}

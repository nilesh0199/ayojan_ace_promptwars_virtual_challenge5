'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon, Monitor } from 'lucide-react';

export interface ThemeToggleProps {
  variant?: 'default' | 'landing';
}

export function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isLanding = variant === 'landing';

  return (
    <div
      role="group"
      aria-label="Color theme selection"
      className={`inline-flex items-center rounded-full p-1 transition-colors ${
        isLanding
          ? 'border border-[#0F172A]/15 dark:border-[#F8FAFC]/15 bg-[#FFFFFF] dark:bg-[#111C3A] shadow-xs'
          : 'border border-rule bg-paper-card shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        title="Light theme"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          isLanding
            ? theme === 'light'
              ? 'bg-[#0F172A] text-white font-medium shadow-xs focus-visible:ring-2 focus-visible:ring-[#E11D48]'
              : 'text-[#0F172A]/70 dark:text-[#F8FAFC]/70 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#EAE6DC]/60 dark:hover:bg-[#162347]'
            : theme === 'light'
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
          isLanding
            ? theme === 'dark'
              ? 'bg-[#FB7185] text-[#0A1128] font-medium shadow-xs focus-visible:ring-2 focus-visible:ring-[#FB7185]'
              : 'text-[#0F172A]/70 dark:text-[#F8FAFC]/70 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#EAE6DC]/60 dark:hover:bg-[#162347]'
            : theme === 'dark'
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
          isLanding
            ? theme === 'system'
              ? 'bg-[#0F172A] text-white font-medium shadow-xs focus-visible:ring-2 focus-visible:ring-[#E11D48]'
              : 'text-[#0F172A]/70 dark:text-[#F8FAFC]/70 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#EAE6DC]/60 dark:hover:bg-[#162347]'
            : theme === 'system'
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

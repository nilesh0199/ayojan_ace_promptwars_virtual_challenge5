import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--color-paper)',
          card: 'var(--color-paper-card)',
          subtle: 'var(--color-paper-subtle)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          faint: 'var(--color-ink-faint)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          text: 'var(--color-accent-text)',
          subtle: 'var(--color-accent-subtle)',
        },
        marigold: {
          DEFAULT: 'var(--color-marigold)',
          subtle: 'var(--color-marigold-subtle)',
          text: 'var(--color-marigold-text)',
        },
        rule: {
          DEFAULT: 'var(--color-rule)',
          strong: 'var(--color-rule-strong)',
        },
        state: {
          error: 'var(--color-error)',
          'error-subtle': 'var(--color-error-subtle)',
          success: 'var(--color-success)',
          'success-subtle': 'var(--color-success-subtle)',
          warning: 'var(--color-warning)',
        },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        screen: '100dvh',
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
};

export default config;

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: [
        'src/lib/firebase/auth.ts',
        'src/lib/firebase/config.ts',
        'src/lib/firebase/firestore.ts',
        'src/**/*.d.ts',
        'src/tests/**',
      ],
      thresholds: {
        lines: 85,
        branches: 80,
      },
    },
  },
});

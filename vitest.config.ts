/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Content Swiss Knife.
 *
 * Scope: deterministic utility functions only (output-validator, html-cleaner, etc.).
 * Angular components are intentionally excluded — they require the full Angular
 * testing module and are not the regression-risk target here.
 *
 * Environment: happy-dom provides DOMParser / querySelectorAll for the
 * output-validator image lazy-loading checks without a real browser.
 */
export default defineConfig({
  test: {
    // happy-dom is lighter than jsdom and sufficient for DOMParser used in output-validator.
    environment: 'happy-dom',

    // Glob pattern: *.spec.ts under src/ (Angular-adjacent, happy-dom), plus *.spec.js
    // under server/ (Node, no DOM — see environmentMatchGlobs below).
    include: ['src/**/*.spec.ts', 'server/**/*.spec.js'],

    // server/ is plain Node (Express, no DOM); everything else keeps the default
    // environment set above (happy-dom).
    environmentMatchGlobs: [['server/**', 'node']],

    // Detailed output — show each test name, not just pass/fail summary.
    reporter: ['verbose'],

    // Coverage via V8 (zero-config, no Babel required).
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // Fail the run if coverage drops below these thresholds.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // TypeScript path aliases (mirrors tsconfig.json "paths").
    alias: {
      '@/': new URL('./', import.meta.url).pathname,
    },
  },
});

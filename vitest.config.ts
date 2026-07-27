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

    // The TipTap round-trip specs parse HTML containing real-looking video
    // <iframe src="https://...">s (schema fidelity tests, not real browsing).
    // Without this, happy-dom actually attempts a network fetch for those
    // iframes and logs noisy aborted-request errors after the test run.
    environmentOptions: {
      happyDOM: {
        settings: {
          navigation: { disableChildFrameNavigation: true },
          disableIframePageLoading: true,
        },
      },
    },

    // *.spec.ts under src/, plus the corpus reconciliation harness under test/.
    // test/ is included deliberately: render-reconciliation.spec.ts compares the renderer against
    // real accepted artifacts committed in test/fixtures/corpus/. Without this entry that harness
    // is dead code that reports success by never running. See test/render-reconciliation.report.md.
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],

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

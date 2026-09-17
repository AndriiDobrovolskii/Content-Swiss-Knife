/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';

/**
 * Vitest configuration for Content Swiss Knife — the LOGIC runner.
 *
 * Scope: deterministic TypeScript that needs no Angular compilation — validators,
 * renderers, prompt builders, the Zod domain models, and the corpus harness under test/.
 *
 * COMPONENT TESTS DO NOT RUN HERE. They live in `*.component.spec.ts` and are executed by
 * the Angular `unit-test` builder (`npm run test:components`), which compiles them through
 * the Angular compiler and provides TestBed. That file-name suffix is the ONLY boundary
 * between the two runners, which is why it is excluded below rather than filtered by path:
 * a component spec picked up here would run without Angular compilation and fail for a
 * reason that has nothing to do with the code under test.
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

    // Hand the `*.component.spec.ts` suffix to the Angular unit-test builder. Vitest's own
    // defaults (node_modules, dist, …) are spread back in — replacing `exclude` wholesale
    // would otherwise make this runner try to execute everything under node_modules.
    exclude: [...configDefaults.exclude, '**/*.component.spec.ts'],

    // Detailed output — show each test name, not just pass/fail summary.
    reporter: ['verbose'],

    // Coverage via V8 (zero-config, no Babel required).
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/**/*.ts',
        'src/prompt-core/**/*.ts',
        'src/render/**/*.ts',
        'src/domain/**/*.ts',
      ],
      exclude: ['src/**/*.spec.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // Fail the run if coverage drops below these thresholds.
      //
      // The global floor stays where it has always been. The per-directory floors below are
      // higher because those directories are genuinely better covered (measured, not
      // aspirational: domain 100/95.8/100/100, render 99.3/92.9/100/100, prompt-core
      // 98.4/89.7/100/99.5 at the time they were added). Without them, one global number
      // lets a well-covered directory mask a decaying one — the scope is part of the number.
      //
      // They sit a few points under the measured values so ordinary churn does not trip
      // them. Lowering one to make a run go green is an AGENTS.md §7.7 violation; raising
      // one after real improvement is welcome.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        'src/domain/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        'src/render/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        'src/prompt-core/**': { lines: 95, functions: 95, branches: 85, statements: 95 },
      },
    },

    // TypeScript path aliases (mirrors tsconfig.json "paths").
    alias: {
      '@/': new URL('./', import.meta.url).pathname,
    },
  },
});

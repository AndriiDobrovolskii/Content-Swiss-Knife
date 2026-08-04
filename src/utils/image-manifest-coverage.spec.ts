/**
 * image-manifest-coverage.spec.ts
 *
 * Regression guard for the "9/14-images regression" (M1 Ultra SafetyPro, 2026-07-15) on the Doc
 * path: `runDocGate` never called `validateGeneratedHtml` (correctly), which left image-manifest
 * coverage completely unchecked for every Doc-pipeline store until this validator was wired in.
 *
 * Same bar as output-validator.spec.ts's `image-manifest-missing / image-manifest-duplicate /
 * image-unknown-src` suite (`src/utils/output-validator.spec.ts:728-763`) — same rule names, same
 * severities — just reading `figures[].file` instead of regex-matching `<img src>`.
 *
 * RUN: npm run test
 */
import { describe, it, expect } from 'vitest';
import { validateImageManifestCoverageDoc } from './image-manifest-coverage';

const findRule = (issues: ReturnType<typeof validateImageManifestCoverageDoc>, rule: string) =>
  issues.find(i => i.rule === rule);
const expectNoRule = (issues: ReturnType<typeof validateImageManifestCoverageDoc>, rule: string) =>
  expect(issues.some(i => i.rule === rule)).toBe(false);

const MANIFEST = [{ urlFilename: 'a.jpg' }, { urlFilename: 'b.jpg' }];

describe('validateImageManifestCoverageDoc', () => {
  describe('happy path', () => {
    it('passes when every manifest image appears exactly once and no unknown filename exists', () => {
      const issues = validateImageManifestCoverageDoc(
        [{ file: 'a.jpg' }, { file: 'b.jpg' }], MANIFEST, 'Doc (base)',
      );
      expect(issues).toEqual([]);
    });
  });

  describe('failure path', () => {
    it('flags a manifest image absent from figures[] as an error, naming the JSON path', () => {
      const issues = validateImageManifestCoverageDoc([{ file: 'a.jpg' }], MANIFEST, 'Doc (base)');
      const hit = findRule(issues, 'image-manifest-missing');
      expect(hit?.severity).toBe('error');
      expect(hit?.detail).toContain('b.jpg');
      expect(hit?.detail).toContain('figures[]');
      expect(hit?.context).toBe('Doc (base)');
    });

    it('flags a manifest image that appears more than once in figures[]', () => {
      const issues = validateImageManifestCoverageDoc(
        [{ file: 'a.jpg' }, { file: 'a.jpg' }, { file: 'b.jpg' }], MANIFEST, 'Doc (base)',
      );
      const hit = findRule(issues, 'image-manifest-duplicate');
      expect(hit?.severity).toBe('error');
      expect(hit?.detail).toContain('a.jpg');
      expect(hit?.detail).toContain('2 times');
    });

    it('flags a figures[] filename absent from the manifest, addressed by figures[N].file', () => {
      const issues = validateImageManifestCoverageDoc(
        [{ file: 'a.jpg' }, { file: 'b.jpg' }, { file: 'invented-name.jpg' }], MANIFEST, 'Doc (base)',
      );
      const hit = findRule(issues, 'image-unknown-src');
      expect(hit?.severity).toBe('error');
      expect(hit?.detail).toContain('invented-name.jpg');
      expect(hit?.path).toBe('figures[2].file');
    });

    it('reports all three rules together when the document mixes every failure mode', () => {
      const issues = validateImageManifestCoverageDoc(
        [{ file: 'a.jpg' }, { file: 'a.jpg' }, { file: 'invented.jpg' }], MANIFEST, 'Doc (base)',
      );
      expect(findRule(issues, 'image-manifest-duplicate')).toBeDefined(); // a.jpg x2
      expect(findRule(issues, 'image-manifest-missing')).toBeDefined();   // b.jpg absent
      expect(findRule(issues, 'image-unknown-src')).toBeDefined();        // invented.jpg
    });
  });

  describe('null/undefined safety', () => {
    it('no-ops when manifest is undefined', () => {
      expect(validateImageManifestCoverageDoc([{ file: 'a.jpg' }], undefined, 'Doc (base)')).toEqual([]);
    });

    it('no-ops when manifest is an empty array', () => {
      expect(validateImageManifestCoverageDoc([{ file: 'a.jpg' }], [], 'Doc (base)')).toEqual([]);
    });

    it('still reports every manifest image as missing when figures[] is empty', () => {
      const issues = validateImageManifestCoverageDoc([], MANIFEST, 'Doc (base)');
      expect(issues.filter(i => i.rule === 'image-manifest-missing')).toHaveLength(2);
    });
  });
});

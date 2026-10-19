/**
 * app.component.no-operator-notes.spec.ts - US-9.1 FR-44 item 3 (b) (task breakdown P9b; owner task T46).
 *
 * The operator-notes feature is withdrawn (Story v5, 2026-10-19). A stored history entry may still carry an `operatorNotes`
 * property (NFR-13: no migration), but it must be NOT SHOWN and NOT SENT: `restoreHistory` must not read it back into any form
 * state, and `buildGeneratorInput` must not put it into the `ProductInput` handed to the orchestrator.
 *
 * HONEST LIMIT (plan W8 item 3, R9; stated, accepted): no spec instantiates `AppComponent` (heavy DI, `templateUrl`,
 * `effect()`, `localStorage` in the constructor; rejected at US-2.2), so "not shown, not sent" is pinned here as the ABSENCE
 * OF THE READING CODE in the two methods, as source text under the logic runner (precedent
 * `app.component.template-wiring.spec.ts`), not by executing `restoreHistory`. A future regression that re-adds a reader is
 * caught here and by the source-scan spec, not by behaviour. The net-diff oracle `git diff 6546db8 -- src/app/app.component.ts`
 * (empty) is the verification-stage evidence (task T50).
 *
 * The method bodies are sliced from their signature to the first closing `\n  }\n` at class-member indentation. The premise
 * tests fail loudly if a method is renamed, so a pin cannot pass by finding nothing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ts = readFileSync(join(process.cwd(), 'src', 'app', 'app.component.ts'), 'utf8').replace(/\r\n/g, '\n');

/** The text of a class method, from its signature to the first `\n  }\n` that closes it. */
function methodBody(signature: string): string {
  const at = ts.indexOf(signature);
  if (at < 0) throw new Error(`method signature not found in app.component.ts: ${signature}`);
  const end = ts.indexOf('\n  }\n', at);
  if (end < 0) throw new Error(`end of method not found: ${signature}`);
  return ts.slice(at, end);
}

const RESTORE = (): string => methodBody('restoreHistory(item: HistoryItem) {');
const BUILD = (): string => methodBody('private buildGeneratorInput(): ProductInput | null {');
const NOTES_TOKEN = /operator[ _-]?notes?/i;

describe('FR-44 item 3 (b): premise - the two methods are found and are the real ones', () => {
  it('restoreHistory restores the pre-Story form fields', () => {
    const body = RESTORE();
    expect(body).toContain('this.productName.set(item.input.name)');
    expect(body).toContain('this.supplementalContent.set(item.input.supplementalContent');
    expect(body).toContain('this.orchestrator.content.set(item.output)');
  });

  it('buildGeneratorInput assembles the ProductInput the orchestrator receives', () => {
    const body = BUILD();
    expect(body).toContain('supplementalContent: this.supplementalContent()');
    expect(body).toContain('customInstructions: this.customInstructions()');
    expect(body).toContain('imageManifest: manifest.length > 0 ? manifest : undefined');
  });
});

describe('FR-44 item 3 (b): a stored operatorNotes is not shown (restoreHistory) and not sent (buildGeneratorInput)', () => {
  it('restoreHistory names no operatorNotes', () => {
    expect(RESTORE()).not.toMatch(NOTES_TOKEN);
  });

  it('buildGeneratorInput names no operatorNotes and spreads no notes state into the input', () => {
    const body = BUILD();
    expect(body).not.toMatch(NOTES_TOKEN);
    expect(body).not.toMatch(/\.\.\.this\.\w*[Nn]otes\w*\./);
  });
});

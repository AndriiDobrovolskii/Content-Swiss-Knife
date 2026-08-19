/**
 * ua-translation-style-guide.spec.ts
 *
 * UA_TRANSLATION_STYLE_GUIDE was adapted from a supplied source prompt, and four of its rules were
 * deliberately changed because the original wording collides with code that runs downstream of the
 * model. Those four changes are invisible to anyone reading the guide as prose — it looks like a
 * perfectly reasonable Ukrainian style guide either way — so this suite exists to make a
 * well-intentioned "restore the original wording" edit fail loudly instead of silently
 * reintroducing the conflict.
 *
 * Each assertion below names the code it protects.
 */
import { describe, it, expect } from 'vitest';
import { UA_TRANSLATION_STYLE_GUIDE } from './ua-translation-style-guide';
import { SENTENCE_LENGTH_BANDS, NUMBER_FORMAT_RULES } from './constants';

describe('UA_TRANSLATION_STYLE_GUIDE — B4 sentence length stays bound to the validator', () => {
  const UK = SENTENCE_LENGTH_BANDS['uk-ua'];

  /**
   * The source text said "~25 words". validateSentenceLength errors above SENTENCE_LENGTH_BANDS
   * ['uk-ua'].ceiling (20), so shipping 25 would license output the repair gate then has to fix.
   * Asserted against the imported object, never against hardcoded literals: that is what makes
   * this test still meaningful if a band is ever re-tuned.
   */
  it('states the real band and ceiling from SENTENCE_LENGTH_BANDS', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toContain(`${UK.body[0]}–${UK.body[1]} words`);
    expect(UA_TRANSLATION_STYLE_GUIDE).toContain(`${UK.ceiling} words is a HARD CEILING`);
  });

  it('does not carry the original "~25 words" limit that contradicts the ceiling', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).not.toMatch(/~?25 words/);
  });
});

describe('UA_TRANSLATION_STYLE_GUIDE — E9 stays silent on thousands grouping', () => {
  /**
   * Two independent reasons, both recorded in the guide's closing comment:
   * stripThousandsSeparators() undoes any grouping downstream (and cannot be made locale-aware
   * without breaking specs-grounding's numeric anchor), AND both hosts already rule on grouping in
   * the same prompt. So the guide must neither restate it nor contradict it.
   *
   * REGRESSION GUARD: an earlier draft said "do NOT insert any thousands separator", which
   * contradicted NUMBER_FORMAT_RULES — "uk-UA: thousands non-breaking space" — a few thousand
   * characters earlier in the same system prompt, leaving the model to pick a winner. Asserted
   * against the real constant so this fails if either text drifts into disagreement.
   */
  it('does not contradict NUMBER_FORMAT_RULES, which mandates grouping for uk-UA', () => {
    expect(NUMBER_FORMAT_RULES).toContain('uk-UA / ru-UA: decimal comma, thousands non-breaking space');
    expect(UA_TRANSLATION_STYLE_GUIDE).not.toMatch(/thousands separator/i);
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/Thousands grouping is governed by/i);
  });

  it('does not carry the original «25 000» nbsp-thousands example as a positive instruction', () => {
    // U+00A0 and a regular space alike — the source wrote it with a non-breaking space.
    expect(UA_TRANSLATION_STYLE_GUIDE).not.toMatch(/25[  ]000 грн/);
  });

  it('still requires the decimal comma, which fixDecimalSeparator does agree with', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toContain('0,4');
  });
});

describe('UA_TRANSLATION_STYLE_GUIDE — E-block typography is scoped to visible text', () => {
  /**
   * The en-dash-in-URL substitution is the documented origin of restoreMediaSrcs
   * (structural-parity.ts — `L2-Pro-32–300`, all seven images 404'd). That restorer covers `src`
   * and nothing else, so `href` and data-* attributes are protected by this scope statement alone.
   */
  it('declares attribute values out of scope before stating any typography rule', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/VISIBLE TEXT ONLY/);
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/href, src, class, id, style, data-\*/);
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/Substituting a dash inside a URL breaks the link/i);
  });

  it('scopes the en-dash range rule itself to visible text, not just the block preamble', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/Ranges in visible text/i);
  });

  it('has a self-check step for typographic characters leaking into URLs', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/inside a URL, href, src, filename or version string/i);
  });
});

describe('UA_TRANSLATION_STYLE_GUIDE — C3 register directive is absent', () => {
  /**
   * EXPERT3D's uk-UA ToV mandates formal «Ви»; Center 3D Print's Style B confines second person to
   * the CTA and validateSecondPersonScope warns on «ви» anywhere else. buildPromptC already injects
   * whichever applies, so a blanket register rule here would fight both.
   */
  it('does not tell the model to address the reader as lowercase «ви»', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).not.toMatch(/Address the reader as/i);
    expect(UA_TRANSLATION_STYLE_GUIDE).not.toMatch(/«ви» \(lowercase\)/);
  });

  it('explicitly defers form of address to the store Tone of Voice instruction', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/set by the\s+store's Tone of Voice instruction/i);
  });
});

describe('UA_TRANSLATION_STYLE_GUIDE — content carried over from the source prompt', () => {
  it('keeps the anti-anglicism rule — the reason a Ukrainian-specific guide exists at all', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toContain('«друк» not «прінт»');
    expect(UA_TRANSLATION_STYLE_GUIDE).toContain('«ПЗ» not «софт»');
  });

  it('keeps E8 non-breaking space between number and unit — ensureUnitSpaces() agrees with it', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/Non-breaking space \(U\+00A0\) between a number and its unit/i);
  });

  it('keeps the fidelity, anti-calque, terminology and structure rule blocks', () => {
    for (const block of [
      '[A — FIDELITY]', '[B — ANTI-CALQUE', '[C — REGISTER]',
      '[D — TERMINOLOGY]', '[E — TYPOGRAPHY]', '[F — STRUCTURE]', '[SELF-CHECK',
    ]) {
      expect(UA_TRANSLATION_STYLE_GUIDE).toContain(block);
    }
  });

  it('states the priority ladder so fidelity outranks typography on conflict', () => {
    expect(UA_TRANSLATION_STYLE_GUIDE).toMatch(/Never sacrifice a higher level for a lower one/i);
  });
});

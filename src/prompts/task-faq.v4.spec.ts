/**
 * task-faq.v4.spec.ts — FR-13 / AC-8, the FAQ half (task breakdown T11).
 *
 * WHAT CHANGES AND WHAT DOES NOT. v4 carries three numbers into the FAQ prompt — 3–5
 * question/answer pairs, 2–4 factual sentences per answer, and 150–400 words. Two of the three are
 * already stated (`task-faq.ts`), so only the word range and the schema label are new.
 *
 * THE TRIGGER IS UNCHANGED, AND THAT IS THE HALF MOST AT RISK. OD-10 settled that a FAQ is produced
 * only when supplemental content is supplied; v4 §9 is «Рекомендовано», not mandatory. Making the
 * FAQ unconditional is explicitly out of scope and would be scope creep against an APPROVED
 * Specification, so the negative is asserted here rather than left to a reviewer's memory.
 *
 * FR-13's OTHER HALF — "FAQ HTML never appears inside the description body" — is a property of the
 * call architecture, which this Story does not change: the FAQ is a separate artifact produced by a
 * separate call and nothing makes its markup reachable from `renderDescription`. It is asserted
 * below as the absence of any description-body section from the FAQ contract, which is the part a
 * prompt edit could actually break.
 */
import { describe, it, expect } from 'vitest';

import { buildPromptFaq } from './task-faq';

const payload = () =>
  buildPromptFaq(
    'Ortur H20 20 W',
    '<p>Laser engraver.</p>',
    'Power: 20 W',
    '[Supplemental] review notes',
    'Ukrainian (uk-UA)',
    '€',
  );

describe('FR-13 — the FAQ prompt carries v4 §9’s numbers', () => {
  /** 🔵 CHARACTERIZATION — already stated today; the assertion is that T11 does not lose it. */
  it('states 3–5 question/answer pairs', () => {
    expect(payload().userContent).toMatch(/3[–-]5 question\/answer pairs/);
  });

  /** 🔵 CHARACTERIZATION — already stated today. */
  it('states 2–4 factual sentences per answer', () => {
    expect(payload().userContent).toMatch(/2[–-]4 sentences, factual/);
  });

  it('states the 150–400 word range v4 adds', () => {
    expect(payload().userContent).toMatch(/150\s*[–-]\s*400/);
  });

  it('no longer labels the artifact Schema v3.0', () => {
    expect(payload().userContent).not.toContain('Schema v3.0');
  });
});

describe('FR-13 / OD-10 — the trigger and the call architecture are unchanged', () => {
  /**
   * The FAQ call takes supplemental content as an argument; nothing in the prompt makes it
   * unconditional, and nothing in this Story may. Asserted as: the contract never tells the model
   * to produce a FAQ regardless of sources — it tells it to return an empty response instead.
   */
  it('still tells the model to return nothing when the sources answer no question', () => {
    expect(payload().userContent).toMatch(/return an empty\s+response/i);
  });

  it('keeps the FAQ a standalone artifact with no description-body sections in its contract', () => {
    const { userContent } = payload();
    expect(userContent).toMatch(/Emit exactly one artifact/);
    expect(userContent).not.toMatch(/killerSpecs|keyBenefits|packageContents|schemaVersion/);
  });

  /** The CMS FAQ module supplies the schema; the artifact stays schema-free (FR-26, AGENTS.md §4). */
  it('keeps FAQPage/schema.org markup out of the artifact', () => {
    expect(payload().userContent).toMatch(/FAQPage\/schema\.org markup stay out/);
  });

  /** One cached system block, unchanged — this Story does not touch the FAQ call architecture. */
  it('keeps the single cached system block the FAQ call has always had', () => {
    expect(payload().systemBlocks).toHaveLength(1);
    expect(payload().systemBlocks[0].cache).toBe(true);
  });
});

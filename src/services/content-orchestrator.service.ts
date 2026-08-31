import { Injectable, signal, inject } from '@angular/core';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from '@/src/services/history.service';
import { ProductInput, GeneratedContent, WebsiteOption, ImageManifestEntry } from '../app/types';
import { cleanHtmlStructure, stripCodeFences } from '../utils/html-cleaner';
import { wrapVideoFigures } from '../utils/video-figure';
import { wrapImageFigures } from '../utils/image-figure';
import { fixNumberFormatting } from '../utils/number-format-fixer';
import { fixDecimalSeparator } from '../utils/decimal-separator';
import { restoreIdentifierDots } from '../utils/identifier-decimal';
import {
  extractVideoEmbeds, restoreMissingVideos, validateVideoCoverage, validateVideoCoverageDoc, SourceVideoEmbed,
} from '../utils/video-manifest';
import { normalizeSeoNumbers } from '../utils/seo-number-format';
import { normalizeTerminology, canonicalizeMultiInOne } from '../utils/terminology-normalize';
import { validateGeneratedHtml, validateSeoMetadata, ValidationIssue } from '../utils/output-validator';
import {
  validateSpecsGrounding, validateSpecsGroundingDoc, isAlreadyCyrillic, inspectGroundedTranslation,
  describeGroundingFailure, type GroundingInspection,
} from '../utils/specs-grounding';
import { validateSpecCountParity, validateSpecCountParityDoc, expectedSpecParameterLabels } from '../utils/spec-count-parity';
import { validateAltNumericFidelity, validateAltNumericFidelityDoc } from '../utils/alt-numeric-fidelity';
import { validateImageManifestCoverageDoc } from '../utils/image-manifest-coverage';
import { validateBulletLeadPunctuationDoc, normalizeBulletLeadPunctuation } from '../utils/bullet-lead-punctuation';
import { normalizeConsumablesBulletLeadPunctuation } from '../utils/consumables-bullet-lead-punctuation';
import { validateBulletLeadPunctuationDoc, normalizeBulletLeadPunctuation, normalizeRawBulletLeadPunctuation } from '../utils/bullet-lead-punctuation';
import { validateSecondPersonScope, validateSecondPersonScopeDoc } from '../utils/tov-second-person';
import { dedupeIssues } from '../utils/validation-issues';
import { validateHeadingStyle, validateHeadingStyleDoc } from '../utils/heading-style';
import { validateSentenceLength, validateSentenceLengthDoc } from '../utils/sentence-length';
import { cyrillizeUnits } from '../utils/unit-cyrillize';
import { validateProductNameConsistency, validateProductNameH1SlugAgreement } from '../utils/product-name-consistency';
import { validateSlugs } from '../utils/slug-validator';
import { buildPromptA } from '../prompts/task-a';
import { buildPromptADoc } from '../prompts/task-a-doc';
import { buildPromptAConsumablesDoc } from '../prompts/task-a-consumables-doc';
import { usesDocPipeline, usesConsumablesDocPipeline } from '../prompt-core/doc-pipeline-flag';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import { ConsumablesDescriptionDocSchema } from '../domain/consumables-doc.schema';
import { renderDescription } from '../render/render-description';
import { renderConsumablesDoc } from '../render/render-consumables';
import type { RenderContext } from '../render/render-description';
import { normalizeDocProse } from '../render/doc-prose-transforms';
import { renderContextFor, getRenderRules } from '../prompt-core/store-render-rules';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import type { ConsumablesDescriptionDoc } from '../domain/consumables-doc';
import { docSchemaIssues, assertDocRendered, isUnrepairableGenerationError, providerDetail } from '../render/doc-schema-issues';
import { buildPromptB } from '../prompts/task-b';
import { buildPromptSlug } from '../prompts/task-slug';
import { buildSpecsCanonicalizePrompt } from '../prompts/task-specs-canonicalize';
import { normalizeSlug, ensureUniqueSlugs, slugsToLocalizedNames, stripSlugStopwords, enforceSlugLength } from '../prompt-core/slug-utils';
import { getStore, getLangsForStore, isoToHumanLang, taskLangToIso, isExpert3dStore, buildNativeLangOverlay, buildMasterUaOverlay, bcp47ToTaskCLang, masterScriptFor } from '../prompt-core/constants';
import { buildPromptC } from '../prompts/task-c';
import { validateStructuralParity, restoreMediaSrcs } from '../utils/structural-parity';
import { buildTranslatePrompt } from '../prompts/task-translate';
import { validateTranslationIntegrity, withTranslateFeedback } from '../utils/translation-integrity';
import { stripLeakedPreamble, scanForLeakedPreamble } from '../utils/llm-output-integrity';
import { buildPromptFaq } from '../prompts/task-faq';
import { buildOptimizerPrompt } from '../prompts/optimizer';
import { buildReadabilityPrompt } from '../prompts/readability';
import { buildKeywordsPrompt } from '../prompts/keywords';
import { buildImageAltPrompt } from '../prompts/image-alt';
import { buildCopywriterPrompt } from '../prompts/copywriter';
import { validateCopywriterIntegrity, withCopywriterFeedback } from '../utils/copywriter-integrity';
import { SlugResponse, SeoResponse } from '../app/types';
import {
  runRepairGate, appendRepairFeedback, toArtifactReport, RepairArtifactReport, RepairReportMeta, RepairGateResult,
} from '../utils/repair-gate';
import { createBlockRepairExecutor } from '../utils/block-tier';
import { createDocBlockRepairExecutor } from '../utils/doc-tier';
import { trimConsumablesToLimit } from '../utils/consumables-trim';
import { PromptPayload } from '../prompt-core/payload';
import { mergeSmallSpecCategories } from '../utils/spec-category-merge';
import { validateSpecCategoryShape, validateSpecCategoryShapeDoc } from '../utils/spec-category-shape';
import { finalizeTablesForDisplay } from '../utils/table-finalize';
import { validateLanguageConsistency } from '../utils/language-consistency';

/**
 * Disables `meta-description-currency` at every validateSeoMetadata call site — and says so, rather
 * than leaving a bare `''` that reads like an oversight. It was read as exactly that once, and
 * "fixed" by wiring the store's real symbol through; the rule then demanded something no model can
 * produce. Three facts, each sufficient on its own:
 *
 *   1. task-b.ts:61 (FROZEN) instructs the opposite — "Do NOT invent prices, discounts, currency
 *      values, or availability — not provided here; those are emitted separately via Schema.org
 *      Offer."
 *   2. task-b.ts's own resolveCurrencySymbol is @deprecated and unused: "Currency is no longer
 *      injected into the Task B prompt. Price is not available at this pipeline stage."
 *   3. ProductInput (app/types.ts) carries no price field at all, so there is no source for a
 *      figure to put a symbol next to.
 *
 * The rule in output-validator.ts is not broken and needs no change — it simply has no input on
 * this pipeline. See src/services/seo-currency-wiring.spec.ts, which fails if this is re-wired.
 */
const NO_CURRENCY_CHECK = '';

/**
 * Result of one Doc-path Task A generation attempt (produceTaskADoc).
 *
 * `doc: null` means the raw model output failed ProductDescriptionDocSchema.parse() (or never
 * arrived as parseable JSON at all) — `issues` then carries docSchemaIssues() output so the repair
 * gate's validate() has something to report other than "empty-output". `doc` non-null always pairs
 * with `issues: []`: a successfully parsed Doc has nothing to say about the failure it didn't have.
 */
export interface DocAttempt {
  doc: ProductDescriptionDoc | null;
  issues: ValidationIssue[];
  /**
   * Count of bullets-block lead/text collisions normalizeRawBulletLeadPunctuation fixed in this
   * attempt's raw JSON before schema validation — undefined/0 when nothing needed fixing. Threaded
   * through the return value rather than updated in place: produceTaskADoc doesn't have the gate
   * label needed to update bulletLeadFixTally itself (see runDocGate's produce closure, which does).
   */
  preValidationFixed?: number;
}

/** The consumables sibling of DocAttempt — same contract, ConsumablesDescriptionDoc instead. */
export interface ConsumablesDocAttempt {
  doc: ConsumablesDescriptionDoc | null;
  issues: ValidationIssue[];
  /**
   * Count of bullet-lead/text collisions normalizeConsumablesBulletLeadPunctuation fixed in this
   * attempt's raw JSON before schema validation — undefined/0 when nothing needed fixing. Threaded
   * through the return value rather than updated in place: produceTaskAConsumablesDoc doesn't have
   * the gate label needed to update bulletLeadFixTally itself (see runConsumablesDocGate's produce
   * closure, which does).
   */
  preValidationFixed?: number;
}

// ── Orchestrator ────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ContentOrchestratorService {
  private llm = inject(LlmService);
  private retrieval = inject(RetrievalService);
  private historyService = inject(HistoryService);

  // State signals
  isGenerating = signal(false);
  progressMessage = signal('');

  suggestedKeywords = signal<string[]>([]);
  isSuggestingKeywords = signal(false);

  content = signal<GeneratedContent>({
    mainHtmlUa: '',
    translations: {},
    seoData: null,
    slugData: null
  });

  optimizerOutput = signal<string>('');
  translatorOutput = signal<string>('');
  copywriterOutput = signal<string>('');
  readabilityScore = signal<any | null>(null);

  // Post-generation acceptance-criteria check results (see output-validator.ts).
  validationIssues = signal<ValidationIssue[]>([]);
  // Per-artifact repair-gate attempt history for the current generation run (see repair-gate.ts).
  repairReport = signal<RepairArtifactReport[]>([]);
  repairReportMeta = signal<RepairReportMeta | null>(null);
  maxRepairs = signal(1);

  /** Tracks the product+store key of the last successfully generated slug, so the main
   *  pipeline and standalone SEO can reuse the localized names without a second LLM call.
   *  Key format: "${website.name}::${name.trim()}". Cleared implicitly on mismatch. */
  private approvedSlugKey = signal<string | null>(null);
  private slugKey(input: ProductInput): string {
    return `${input.website.name}::${input.name.trim()}`;
  }

  /**
   * The block-scoped repair rung for one locale.
   *
   * Always the fast model and never extended thinking: the task is rewriting one paragraph against
   * an explicit instruction, not composing anything. Deep Thinking governs generation, not repair.
   */
  private blockRepairer(locale: string, taskLabel: string, input: ProductInput) {
    return createBlockRepairExecutor({
      generate: payload => this.llm.generateText(payload, false, {
        taskLabel: `Block repair — ${taskLabel}`,
        productName: input.name,
        store: input.website.name,
        lang: locale,
      }),
      languageLabel: `${isoToHumanLang(locale)} (${locale})`,
      onResult: summary => this.recordBlockPatchSummary(taskLabel, summary),
    });
  }

  /**
   * The block-scoped repair rung for one locale, Doc pipeline sibling of blockRepairer.
   *
   * Always the fast model and never extended thinking — same reasoning as blockRepairer: the task
   * is rewriting a handful of prose fields against an explicit instruction, not composing anything.
   */
  private docBlockRepairer(locale: string, taskLabel: string, input: ProductInput) {
    return createDocBlockRepairExecutor({
      generate: payload => this.llm.generateText(payload, false, {
        taskLabel: `Doc block repair — ${taskLabel}`,
        productName: input.name,
        store: input.website.name,
        lang: locale,
      }),
      languageLabel: `${isoToHumanLang(locale)} (${locale})`,
      onResult: summary => this.recordBlockPatchSummary(taskLabel, summary),
    });
  }

  /**
   * Shared by blockRepairer and docBlockRepairer: both funnel into the same taskLabel-keyed tally,
   * so the "Local patches" section of the repair report (repair-gate.ts's formatRepairReportMarkdown)
   * cannot tell which executor produced a patch, and does not need to — the report is keyed by
   * artifact label, not by pipeline.
   */
  private recordBlockPatchSummary(
    taskLabel: string,
    summary: { applied: number; rejected: number; rejections: string[] },
  ): void {
    if (summary.applied === 0 && summary.rejected === 0) return;
    // Accumulated, not replaced: the rung can run on more than one ladder pass, and a report
    // showing only the last pass would understate what was rewritten.
    const running = this.blockPatchTally.get(taskLabel) ?? { applied: 0, rejected: 0, rejections: [] };
    this.blockPatchTally.set(taskLabel, {
      applied: running.applied + summary.applied,
      rejected: running.rejected + summary.rejected,
      rejections: [...running.rejections, ...summary.rejections],
    });
    console.info(
      `[block-repair] ${taskLabel}: ${summary.applied} applied, ${summary.rejected} rejected`,
      summary.rejections,
    );
  }

  /**
   * Per-artifact block-patch tallies for the current run, keyed by the gate's label.
   *
   * `resolved` is deliberately absent: the executor can only count what it spliced. Whether a
   * finding actually went away is decided by re-validation, which only the gate sees, so
   * toArtifactReport fills that field in.
   */
  private blockPatchTally = new Map<
    string,
    Omit<NonNullable<RepairArtifactReport['blockPatches']>, 'resolved'>
  >();

  /**
   * Per-artifact pre-validation-normalization tallies for the current run, keyed by the gate's
   * label — same shape and lifecycle as blockPatchTally, for the same reason: runDocGate's
   * produce() closure is the only place that sees both the normalizer's return value and which
   * gate call it belongs to, and toArtifactReport needs the sum once the gate finishes.
   */
  private bulletLeadFixTally = new Map<string, number>();

  /** toArtifactReport's preValidationFixes shape for one gate label, or undefined when nothing
   *  was normalized for it — matches `blockPatchTally.get(label)`'s "undefined when absent" contract. */
  private preValidationFixesFor(label: string): RepairArtifactReport['preValidationFixes'] {
    const count = this.bulletLeadFixTally.get(label);
    return count ? [{ rule: 'bullet-lead-collision', count }] : undefined;
  }

  /**
   * `input.specs` is usually pasted verbatim from a manufacturer sheet (typically English), but
   * the master HTML is generated natively in Ukrainian — grounding `validateSpecsGrounding`
   * against the raw source would false-positive on every translated spec-row label (see
   * specs-grounding.ts DESIGN). Localize once per generation (never per repair attempt — the
   * repair loop reuses this same string across all its attempts) via the cheap fast-model
   * Translator prompt; skip the call entirely when the specs are already Cyrillic.
   * Fails open on BOTH the catch path AND the success path: '' means "grounding disabled for
   * this run" whenever the translation call throws, comes back empty, or comes back in the
   * wrong script (sanitizeGroundedTranslation) — never a silent fallback to the untranslated
   * input, which is what turned this guard into a data-deletion machine on the Ortur H20
   * incident. Callers must surface groundingDisabled (see the `specs-grounding-disabled` issue
   * below) rather than let '' pass unnoticed.
   */
  private async groundingSpecs(input: ProductInput): Promise<GroundingInspection> {
    if (!input.specs?.trim()) return { text: '' };
    if (isAlreadyCyrillic(input.specs)) return { text: input.specs };
    try {
      const translated = await this.llm.generateText(
        // 'internal-matching-only' — NOT a display translation. This output is anchor text for
        // validateSpecsGrounding, which matches spec rows by stemmed label; the Ukrainian style
        // guide's anti-calque rules would reword exactly what has to stay matchable.
        buildTranslatePrompt(input.specs, 'Ukrainian', 'internal-matching-only'),
        false, // fast model — a cheap lookup call, not master generation
        { taskLabel: 'Specs translation (grounding)', productName: input.name, store: input.website.name, lang: 'uk-UA' },
      );
      const inspection = inspectGroundedTranslation(translated, masterScriptFor(input.website.name));
      if (inspection.failure) {
        console.warn(
          `[groundingSpecs] Specs grounding DISABLED for "${input.name}": ` +
          describeGroundingFailure(inspection.failure),
        );
      }
      return inspection;
    } catch (err) {
      // The ERROR OBJECT, not a message: the stack trace is what says whether this was a timeout,
      // a 4xx, or a bug on our side. It used to be swallowed whole, leaving the run with a warning
      // that named the wrong cause.
      console.error(`[groundingSpecs] Specs translation threw for "${input.name}".`, err);
      return { text: '', failure: { kind: 'provider-error' } };
    }
  }

  /**
   * Every sanctioned origin for a number+unit in an alt/figcaption, joined for
   * validateAltNumericFidelity.
   *
   * MUST stay in sync with NUMERIC_SOURCE_FIDELITY_RULES, which permits [Technical Specs], [Raw
   * Description] and the image's own manifest caption. A gate stricter than the rule the model
   * was given would fail correct output and burn the repair budget — so the raw description and
   * the product name are included even though the defect itself was a spec-table figure.
   *
   * Uses the RAW input.specs, not groundingSpecs: the validator compares canonicalized numbers
   * and ignores unit spelling, and digits survive translation unchanged, so the untranslated
   * source is the better choice here — it is always available, including on the runs where
   * grounding is disabled.
   */
  private numericFidelitySources(input: ProductInput, manifest?: ImageManifestEntry[]): string {
    return [
      input.specs,
      input.description,
      input.name,
      ...(manifest ?? []).flatMap(e => [e.visionDescription, e.altText]),
    ].filter(Boolean).join('\n');
  }

  /**
   * Produces the uk-UA master Task A artifact via the plain-HTML path — shared between generate()
   * and generateUaContent(). Both callers target the same locale ('uk-UA') and post-process the
   * HTML identically, so this used to be two ~70-line near-duplicates.
   *
   * The Doc-pipeline sibling is produceTaskADoc()/runDocGate() below — this method no longer
   * branches on useDocPipeline (removed), because every remaining caller only reaches it when the
   * Doc pipeline is NOT enrolled for the store.
   *
   * Returns restoredVideos rather than mutating caller state directly — callers stash it in their
   * own per-request closure variable, same as before, because the validate array and the
   * restoredVideos warning both need to read the LAST produce() call's result after runRepairGate
   * resolves, not just this one.
   */
  private async produceTaskAArtifact(opts: {
    payload: PromptPayload;
    useThinking: boolean;
    input: ProductInput;
    videoEmbeds: SourceVideoEmbed[];
    // docSchemaIssues context, and the llm meta.taskLabel.
    contextLabel: string;
  }): Promise<{ html: string; restoredVideos: SourceVideoEmbed[] }> {
    const { payload, useThinking, input, videoEmbeds, contextLabel } = opts;

    let html = await this.llm.generateText(payload, useThinking, { taskLabel: contextLabel, productName: input.name, store: input.website.name, lang: 'uk-UA' });
    html = stripCodeFences(html);
    // BEFORE wrapVideoFigures, so a restored embed goes through exactly the same figure and
    // attribute contract as one the model emitted itself.
    const restoration = restoreMissingVideos(html, videoEmbeds, input.name, 'uk-UA');
    html = restoration.html;
    const restoredVideos = restoration.restored;
    html = wrapVideoFigures(html, input.name, 'uk-UA');
    html = wrapImageFigures(html);
    html = fixNumberFormatting(html, input.name);
    // Immediately after fixNumberFormatting, which has already stripped thousands separators —
    // so the decimal pass sees one unambiguous number shape per value.
    html = fixDecimalSeparator(html, 'uk-UA');
    // The inverse: a comma the MODEL wrote inside an identifier (F/2,0, 2,4G). Nothing else
    // catches those — the validator only looks for the opposite. Safe next to the forward
    // pass, which only ever touches a decimal followed by a unit.
    html = restoreIdentifierDots(html, 'uk-UA');
    // AFTER fixNumberFormatting so the cyrillizer sees a canonical NUM<NBSP>UNIT shape, and
    // BEFORE normalizeTerminology so its Cyrillic word-boundary lookarounds see final
    // orthography. Both neighbours are idempotent and independent, so this is a documented
    // convention rather than a correctness requirement.
    html = cyrillizeUnits(html, 'uk-UA');
    html = normalizeTerminology(html, 'uk-UA');
    html = canonicalizeMultiInOne(html, 'uk-UA');
    return { html, restoredVideos };
  }

  /**
   * Produces the uk-UA master Task A artifact via the Doc pipeline: the model emits a
   * ProductDescriptionDoc (JSON), which is schema-validated and returned WHOLE — no rendering, no
   * prose normalization, no HTML transforms. That happens exactly once, in runDocGate(), after the
   * gate has accepted a Doc, not on every attempt here.
   *
   * Mirrors the pre-Task-2 Doc branch's try/catch structure, the isUnrepairableGenerationError
   * initial-attempt throw, and the raw-payload debug log verbatim — the only behavioral change is
   * the return shape (DocAttempt instead of {html, docIssues, restoredVideos}) and the absence of
   * normalizeDocProse/renderDescription.
   */
  private async produceTaskADoc(opts: {
    payload: PromptPayload;
    useThinking: boolean;
    isInitialAttempt: boolean;
    input: ProductInput;
    // docSchemaIssues context — matches the HTML sibling's contextLabel.
    contextLabel: string;
    // llm meta.taskLabel for this call — distinct from contextLabel so telemetry can tell a Doc
    // call from an HTML call for the same artifact.
    docTaskLabel: string;
  }): Promise<DocAttempt> {
    const { payload, useThinking, isInitialAttempt, input, contextLabel, docTaskLabel } = opts;

    // Kept outside the try so a schema failure can still log what the model actually sent —
    // without this, debugging a hallucinated Doc means reproducing the call by hand.
    let raw: unknown;
    try {
      raw = await this.llm.generateJson<ProductDescriptionDoc>(payload, useThinking, { taskLabel: docTaskLabel, productName: input.name, store: input.website.name, lang: 'uk-UA' });
      // Pre-parse fix-up: eliminates any bullets-block lead/text collision (keyBenefits/
      // functionality/compatibility) BEFORE the schema's own refine can throw on it — see
      // normalizeRawBulletLeadPunctuation's header comment for why this must run here, not
      // post-parse like normalizeBulletLeadPunctuation. `raw` itself is left untouched: the catch
      // block below still logs the model's true, unmodified output for debugging.
      const { raw: candidate, fixed } = normalizeRawBulletLeadPunctuation(raw);
      // parse(), not safeParse(): an invalid Doc must reach the repair gate as a thrown error
      // rather than be treated as valid.
      //
      // The return value is DISCARDED and `candidate` is cast instead. Without strictNullChecks —
      // which this repo does not enable — zod's inferred type comes back all-optional and does
      // not satisfy ProductDescriptionDoc. See the TSCONFIG NOTE at the foot of
      // description-doc.schema.ts; this is the same workaround, not a new one. parse() still
      // does the validating, so nothing is weakened.
      ProductDescriptionDocSchema.parse(candidate);
      return { doc: candidate as ProductDescriptionDoc, issues: [], preValidationFixed: fixed };
    } catch (err) {
      // …unless the provider refused to produce anything in the first place, AND this is the
      // initial attempt (no `best` yet exists to fall back to — repair-gate.ts:112). A
      // truncation or a safety block is a property of the request, so every remaining attempt
      // would fail identically — and on this path that is up to 3 more deep calls of several
      // minutes each. Throwing escapes the gate (runRepairGate awaits produce() bare here),
      // which is the correct outcome here: fail in one attempt with the provider's own
      // instruction ("lower the thinking level") instead of an hour later with "empty-output".
      //
      // On a REPAIR attempt (repair-gate.ts:339) `best` already holds a usable artifact from
      // an earlier attempt. Throwing here would discard it and abort the whole run over a
      // request that just can't be repaired further — so this falls through to the
      // convert-not-rethrow path below instead, same as any other failed repair attempt.
      if (isInitialAttempt && isUnrepairableGenerationError(err)) throw new Error(providerDetail(err) ?? String(err));
      // Convert, do not rethrow: a null doc plus real issues lets the gate spend a repair
      // attempt, and appendRepairFeedback then tells the model WHICH FIELD failed rather than
      // "empty-output". runDocGate's post-gate guard refuses to ship a null doc if every
      // attempt fails.
      const issues = docSchemaIssues(err, contextLabel);
      // The raw payload, not just the Zod issues — a hallucinated Doc is far easier to debug
      // with what the model actually sent than with "specs.categories.0: expected array". Only
      // logged when generateJson itself succeeded; a network/parse failure never set raw.
      if (raw !== undefined) console.error(`[${contextLabel}] raw model output failed schema validation:`, raw);
      return { doc: null, issues };
    }
  }

  /**
   * The Doc-pipeline gate: validates the ProductDescriptionDoc ITSELF against the Task 1 Doc-reading
   * validators, and renders it to HTML exactly once — after the gate has accepted a Doc, not on
   * every repair attempt. This is the fix for the bug this task exists to close: the old
   * produceTaskAArtifact Doc branch rendered on every attempt and then validated the RENDERED HTML
   * with DOM-based checks, which could only ever confirm what a pure, deterministic renderer already
   * guarantees structurally — burning repair budget on findings that could never occur.
   *
   * Returns RepairGateResult<string> — the same shape the plain-HTML runRepairGate<string> call
   * produces — so every line of code after the gate call site (recordGeneration, assertDocRendered,
   * the destructure, toArtifactReport, mergeSmallSpecCategories, …) stays oblivious to which pipeline
   * ran.
   */
  private async runDocGate(opts: {
    label: string;
    contextLabel: string;
    docTaskLabel: string;
    maxRepairs: number;
    basePayload: PromptPayload;
    useThinking: boolean;
    locale: string;
    localeIso: string;
    input: ProductInput;
    groundingSpecs: string;
    allowedSpecParams: string[];
    groundingDisabled: boolean;
    grounding: GroundingInspection;
    videoEmbeds: SourceVideoEmbed[];
    imgManifest?: ImageManifestEntry[];
    onAttempt: (n: number, c: number) => void;
  }): Promise<RepairGateResult<string>> {
    let isFirstAttempt = true;
    const produce = async (payload: PromptPayload): Promise<DocAttempt> => {
      const initial = isFirstAttempt;
      isFirstAttempt = false;
      const attempt = await this.produceTaskADoc({
        payload, useThinking: opts.useThinking, isInitialAttempt: initial, input: opts.input,
        contextLabel: opts.contextLabel, docTaskLabel: opts.docTaskLabel,
      });
      // Deterministic, zero-cost, and provably complete for the scenario/text half of this rule
      // (see the function's own doc comment) — runs on EVERY attempt, not just the first, so a
      // full-regen that reintroduces a collision gets cleaned up too. The bullets-block half of
      // this collision class is now fixed pre-parse instead, inside produceTaskADoc
      // (normalizeRawBulletLeadPunctuation) — attempt.doc can no longer contain one by the time it
      // gets here, so this call is effectively applications.items[].scenario-only in practice now,
      // but stays as-is since it's still correct and still the only thing that fixes that field.
      if (!attempt.doc) return attempt;
      const { doc, fixed } = normalizeBulletLeadPunctuation(attempt.doc);
      const totalFixed = (attempt.preValidationFixed ?? 0) + fixed;
      if (totalFixed > 0) {
        // Accumulated, not replaced — mirrors blockPatchTally: this closure runs once per
        // produce() call, and a report showing only the last attempt would understate the total.
        // Sums both the pre-parse (bullets-block) and post-parse (scenario) contributions into one
        // entry, so the Repair Gate Report shows a single combined count under
        // rule: 'bullet-lead-collision' rather than splitting them.
        this.bulletLeadFixTally.set(opts.label, (this.bulletLeadFixTally.get(opts.label) ?? 0) + totalFixed);
        console.info(`[bullet-lead-punctuation] ${opts.label}: ${totalFixed} lead(s) normalized before validation`);
      }
      return { ...attempt, doc };
    };

    const result = await runRepairGate<DocAttempt>({
      label: opts.label,
      maxRepairs: opts.maxRepairs,
      basePayload: opts.basePayload,
      produce,
      validate: (attempt) => {
        if (!attempt.doc) return attempt.issues;
        const doc = attempt.doc;
        return [
          ...validateSpecsGroundingDoc(doc, opts.groundingSpecs, opts.label, opts.allowedSpecParams,
            { labelAnchorTrusted: !!opts.groundingSpecs }),
          ...validateSpecCountParityDoc(doc, opts.input.specs, opts.input.name, opts.label),
          ...validateAltNumericFidelityDoc(doc, this.numericFidelitySources(opts.input, opts.imgManifest), opts.label),
          ...validateSecondPersonScopeDoc(doc, opts.localeIso, opts.input.website.name),
          ...validateHeadingStyleDoc(doc, opts.localeIso, opts.input.website.name, opts.input.name),
          ...validateSentenceLengthDoc(doc, opts.localeIso, opts.label),
          ...validateVideoCoverageDoc(doc.videos, opts.videoEmbeds, opts.label),
          // CONTENT checks, not renderer invariants — see the final-review fix wave's Critical #1/#2.
          // Which images the model puts into figures[] and how it groups §7 rows into categories are
          // both model judgment calls; renderDescription() faithfully renders whatever shape it is
          // handed and guarantees neither. Dropping either from the Doc-path gate reopened real
          // incidents (image-manifest: "9/14-images regression", M1 Ultra SafetyPro, 2026-07-15;
          // spec-category-collapse: Center 3D Print / Ortur H20, 2026-07-26) for every Doc-enrolled
          // store — see image-manifest-coverage.ts and spec-category-shape.ts's *Doc siblings.
          ...validateImageManifestCoverageDoc(doc.figures, opts.imgManifest, opts.label),
          ...validateSpecCategoryShapeDoc(doc, opts.label, { templateId: opts.input.templateId, locale: opts.locale }),
          // A bold bullet lead with no separator before its text renders as one glued word in
          // EVERY store's house style — a mechanical fact, not a judgement call, hence error
          // severity (see bullet-lead-punctuation.ts for why this is not a renderer fix).
          ...validateBulletLeadPunctuationDoc(doc, opts.label),
          ...(opts.groundingDisabled ? [{
            severity: 'warning' as const,
            rule: 'specs-grounding-disabled',
            detail:
              'Specs grounding was DISABLED for this run — §7 rows were NOT verified against the '
              + 'source specifications. Cause: '
              + (opts.grounding.failure ? describeGroundingFailure(opts.grounding.failure) : 'unknown')
              + '.',
            context: opts.label,
          }] : []),
        ];
      },
      withFeedback: appendRepairFeedback,
      // Field-scoped rung live for `heading-product-name-stuffing` (repair-strategy.ts) — a
      // warning-severity rule that never reaches full regeneration (resolveLadder never appends
      // 'full-regen' after a warning's own ladder), so this is one of the instruments that can fix
      // it.
      //
      // maxFieldRepairs is intentionally left at the default (repair-gate.ts's own `?? 3`) rather
      // than 0 — that used to be an explicit, documented choice to keep the ladder off entirely
      // because nothing on the Doc path had a strategy to run. That is no longer true: this now
      // activates the ladder for every Doc-emitted rule with a registered strategy — today
      // `heading-product-name-stuffing` and `sentence-too-long`.
      repairField: async payload => stripCodeFences(await this.llm.generateText(
        payload, false, { taskLabel: `${opts.label} heading repair`, productName: opts.input.name, store: opts.input.website.name, lang: opts.localeIso },
      )),
      // Block-scoped rung, Doc-shaped. `sentence-too-long`'s ladder is ['block-scoped',
      // 'block-scoped'] (repair-strategy.ts) — this is what runs it: doc-tier.ts's executor patches
      // the Doc directly (there is no HTML yet at this point — rendering happens once, after the
      // gate settles, see this method's own doc comment above), so the rendered artifact ships with
      // the fix already applied rather than shipping the warning to the final report unrepaired.
      repairBlocks: async (attempt, issues) => {
        if (!attempt.doc) return attempt;
        const doc = await this.docBlockRepairer(opts.localeIso, opts.label, opts.input)(attempt.doc, issues);
        return doc === attempt.doc ? attempt : { ...attempt, doc };
      },
      onAttempt: opts.onAttempt,
    });

    // Every attempt failed the schema → nothing to render. Return the empty-artifact sentinel
    // ('' — the same thing `html.trim()` would see from a genuinely empty HTML artifact) rather
    // than throwing here. THROWING HERE WAS THE BUG (final-review fix wave, Important #3): it
    // unwound past both call sites' `recordGeneration(...)` call, which their own comments say
    // must fire "BEFORE the guard below, so a generation that never validated is counted rather
    // than lost with the exception" — but a throw from inside runDocGate happens before the call
    // site ever gets control back, so recordGeneration never ran and 'failed-schema' was
    // unrecordable, exactly the outcome doc-pipeline-flag.ts's rollout monitoring depends on being
    // able to see. The call sites already guard this: `if (useDocPipeline)
    // assertDocRendered(htmlAResult.artifact, ...)` runs AFTER their recordGeneration call, so
    // returning '' here (instead of throwing) restores that original order — assertDocRendered is
    // now called in exactly one place, at the call sites, not inside this method too.
    if (!result.artifact.doc) return { ...result, artifact: '' };

    // The ONE render call for this Task A generation — see the method doc comment above. Runs
    // AFTER every Tier-1 validator above, which is an ORDER FLIP from the old HTML path (there,
    // normalizeDocProse-equivalent transforms ran, then validation read the transformed HTML).
    // Confirmed harmless today — e.g. validateAltNumericFidelityDoc's number-matching is
    // separator-insensitive to normalizeDocProse's number-format fixes — but a future validator
    // that is NOT insensitive to normalizeDocProse's transforms would validate pre-normalization
    // text here. Worth checking when adding one.
    const html = renderDescription(
      normalizeDocProse(result.artifact.doc, opts.locale),
      renderContextFor(opts.input.website.name, opts.input.brandFolder, opts.input.modelFolder),
    );

    return { ...result, artifact: html };
  }

  /**
   * Consumables sibling of produceTaskADoc — same contract, ConsumablesDescriptionDocSchema instead
   * of ProductDescriptionDocSchema. Only reachable when usesConsumablesDocPipeline() is true (see
   * doc-pipeline-flag.ts), which is off by default pending a live probe.
   */
  private async produceTaskAConsumablesDoc(opts: {
    payload: PromptPayload;
    useThinking: boolean;
    isInitialAttempt: boolean;
    input: ProductInput;
    contextLabel: string;
    docTaskLabel: string;
  }): Promise<ConsumablesDocAttempt> {
    const { payload, useThinking, isInitialAttempt, input, contextLabel, docTaskLabel } = opts;

    let raw: unknown;
    try {
      raw = await this.llm.generateJson<ConsumablesDescriptionDoc>(payload, useThinking, { taskLabel: docTaskLabel, productName: input.name, store: input.website.name, lang: 'uk-UA' });
      // Pre-parse fix-up: eliminates any bullet-lead/text collision (features/applications/storage)
      // BEFORE the schema's own refine can throw on it — see consumables-bullet-lead-punctuation.ts's
      // header comment for why this must run here, not post-parse like the plain pipeline's
      // normalizeBulletLeadPunctuation. `raw` itself is left untouched: the catch block below still
      // logs the model's true, unmodified output for debugging.
      const { raw: candidate, fixed } = normalizeConsumablesBulletLeadPunctuation(raw);
      // parse(), not safeParse() or its return value: an invalid Doc must reach the repair gate as
      // a thrown error. The return value is DISCARDED and `candidate` is cast instead — same
      // TSCONFIG workaround as produceTaskADoc's identical comment above: without strictNullChecks,
      // zod's inferred type comes back all-optional and does not satisfy ConsumablesDescriptionDoc.
      // parse() still does the validating, so nothing is weakened.
      ConsumablesDescriptionDocSchema.parse(candidate);
      return { doc: candidate as ConsumablesDescriptionDoc, issues: [], preValidationFixed: fixed };
    } catch (err) {
      // Same escape hatch as produceTaskADoc — see its comment for the full rationale.
      if (isInitialAttempt && isUnrepairableGenerationError(err)) throw new Error(providerDetail(err) ?? String(err));
      const issues = docSchemaIssues(err, contextLabel);
      if (raw !== undefined) console.error(`[${contextLabel}] raw model output failed schema validation:`, raw);
      return { doc: null, issues };
    }
  }

  /**
   * The consumables Doc-pipeline gate. Unlike runDocGate, this renders on EVERY attempt (not once
   * after acceptance) and validates the rendered HTML with the SAME validators already proven for
   * the plain-HTML consumables path — no new *Doc-suffixed validator family needed. That family
   * exists for the main pipeline because runDocGate validates pre-render specifically to skip
   * structural checks the renderer already guarantees; here, rendering first is what lets the
   * existing string validators apply unmodified, and rendering is pure and cheap (unlike the LLM
   * call), so paying for it on every attempt costs nothing that matters.
   *
   * Returns RepairGateResult<string> — same shape as runDocGate and the plain-HTML gate — so every
   * line of code after the call site stays oblivious to which of the three pipelines ran.
   */
  private async runConsumablesDocGate(opts: {
    label: string;
    contextLabel: string;
    docTaskLabel: string;
    maxRepairs: number;
    basePayload: PromptPayload;
    useThinking: boolean;
    locale: string;
    localeIso: string;
    input: ProductInput;
    groundingSpecs: string;
    allowedSpecParams: string[];
    groundingDisabled: boolean;
    grounding: GroundingInspection;
    imgManifest?: ImageManifestEntry[];
    onAttempt: (n: number, c: number) => void;
  }): Promise<RepairGateResult<string>> {
    // Figures are modelled now (see consumables-doc.ts), so ctx.imageBaseUrl is load-bearing. Built
    // directly rather than via renderContextFor(), which THROWS for a store with an empty
    // imageBaseUrl (Expert-3DPrinter) — buildImageBlock (task-a.ts) already forces that store's
    // manifest to "None — skip all <img>", so its consumables generations never populate `figures`
    // and must keep working, exactly as the plain-HTML path does today. getRenderRules() answers
    // '' for that store without throwing, which is what we want here.
    const ctx: RenderContext = {
      imageBaseUrl: getRenderRules(opts.input.website.name).imageBaseUrl,
      storeName: opts.input.website.name,
      brandFolder: opts.input.brandFolder,
      modelFolder: opts.input.modelFolder,
    };

    // runRepairGate's produce signature is `(payload) => Promise<T>` — it does not pass an
    // isInitialAttempt flag. Tracked via closure, same pattern runDocGate's own produce uses.
    let isFirstAttempt = true;
    const produce = async (payload: PromptPayload): Promise<{ html: string | null; issues: ValidationIssue[] }> => {
      const initial = isFirstAttempt;
      isFirstAttempt = false;
      const attempt = await this.produceTaskAConsumablesDoc({
        payload, useThinking: opts.useThinking, isInitialAttempt: initial, input: opts.input,
        contextLabel: opts.contextLabel, docTaskLabel: opts.docTaskLabel,
      });
      // Same tally, same reporting path as runDocGate's produce closure (see its own comment) —
      // opts.label is in scope here but not inside produceTaskAConsumablesDoc, which is why the
      // count is threaded through the attempt instead of applied there directly.
      if (attempt.preValidationFixed) {
        this.bulletLeadFixTally.set(opts.label, (this.bulletLeadFixTally.get(opts.label) ?? 0) + attempt.preValidationFixed);
        console.info(`[bullet-lead-punctuation] ${opts.label}: ${attempt.preValidationFixed} lead(s) normalized before validation`);
      }
      if (!attempt.doc) return { html: null, issues: attempt.issues };
      return { html: renderConsumablesDoc(attempt.doc, ctx), issues: [] };
    };

    const result = await runRepairGate<{ html: string | null; issues: ValidationIssue[] }>({
      label: opts.label,
      maxRepairs: opts.maxRepairs,
      basePayload: opts.basePayload,
      produce,
      validate: (attempt) => {
        if (attempt.html === null) return attempt.issues;
        const html = attempt.html;
        // Copied 1:1 from the plain-HTML consumables validate array (see generate()'s and
        // generateUaContent()'s non-Doc branch) — reused unmodified, minus video coverage, which is
        // moot for consumables (§C has no §3 slot, so videoEmbeds is always [] there too).
        return [
          ...validateGeneratedHtml(html, opts.contextLabel, opts.input.name, opts.locale, { templateId: opts.input.templateId, imageManifest: opts.imgManifest }),
          ...validateSpecsGrounding(html, opts.groundingSpecs, opts.contextLabel, opts.allowedSpecParams,
            { labelAnchorTrusted: !!opts.groundingSpecs }),
          ...validateSpecCountParity(html, opts.input.specs, opts.input.name, opts.contextLabel),
          ...validateAltNumericFidelity(html, this.numericFidelitySources(opts.input, opts.imgManifest), opts.contextLabel),
          ...validateSecondPersonScope(html, opts.localeIso, opts.input.website.name),
          ...validateHeadingStyle(html, opts.localeIso, opts.input.website.name, opts.input.name),
          ...validateSentenceLength(html, opts.localeIso, opts.contextLabel),
          // Always a no-op for consumables — see validateSpecCategoryShape's own carve-out — kept
          // for exact parity with the plain-HTML branch rather than special-cased away here.
          ...validateSpecCategoryShape(html, opts.contextLabel, { templateId: opts.input.templateId, locale: opts.locale }),
          ...(opts.groundingDisabled ? [{
            severity: 'warning' as const,
            rule: 'specs-grounding-disabled',
            detail:
              'Specs grounding was DISABLED for this run — §7 rows were NOT verified against the '
              + 'source specifications. Cause: '
              + (opts.grounding.failure ? describeGroundingFailure(opts.grounding.failure) : 'unknown')
              + '.',
            context: opts.contextLabel,
          }] : []),
        ];
      },
      withFeedback: appendRepairFeedback,
      // Block-scoped rung, reusing the HTML executor unchanged: this gate validates the RENDERED
      // HTML (see produce() above), not the Doc — the Doc is a local variable inside produce() and
      // is never carried in the gate's artifact state, so there is nothing Doc-shaped to patch here.
      // The Doc is never persisted separately from the rendered HTML anywhere in this codebase, so
      // patching the HTML directly is complete, not a shortcut around a "real" source of truth.
      repairBlocks: async (attempt, issues) => {
        if (!attempt.html) return attempt;
        const html = await this.blockRepairer(opts.localeIso, opts.label, opts.input)(attempt.html, issues);
        return html === attempt.html ? attempt : { ...attempt, html };
      },
      onAttempt: opts.onAttempt,
    });

    // Every attempt failed the schema → nothing to render. Same '' sentinel and same rationale as
    // runDocGate's identical guard — see its comment for why throwing here would be the bug.
    return { ...result, artifact: result.artifact.html ?? '' };
  }

  async generate(input: ProductInput, useThinking = false): Promise<void> {
    // Reuse an editor-approved slug ONLY when it was approved for THIS exact product+store
    // (from a prior standalone Slug run); otherwise start clean. This makes the approved
    // localized name authoritative across H1/title/URL without ever reusing a stale name.
    const reusedSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: reusedSlug, website: input.website, faqArtifacts: {}, mainHtmlLocale: 'uk-UA' });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
    this.bulletLeadFixTally.clear();
    this.repairReportMeta.set({ product: input.name, store: input.website.name, generatedAt: new Date().toISOString() });

    // Manifest handed to the validator for coverage enforcement (image-manifest-missing /
    // image-unknown-src): every uploaded image must ship in every language version.
    // Expert-3DPrinter is image-free by policy — no manifest, no coverage check.
    const imgManifest = input.website.name === 'Expert-3DPrinter' ? undefined : input.imageManifest;

    const isConsumables = input.templateId === 'consumables-resin';
    // Video embeds the source supplied — the output is obliged to contain every one of them.
    // Consumables mode has no §3 to put a video in, so it opts out entirely.
    const videoEmbeds = isConsumables ? [] : extractVideoEmbeds(input.description);
    const repairBudget = isConsumables ? 2 : this.maxRepairs();
    // Extra headroom for the master specifically when an image manifest exists — Task A
    // doesn't reliably hit "exactly N images" on the first pass, and a dropped image is a
    // hard error (see checkImageManifestCoverage). Translations don't need this: they inherit
    // whatever the master ends up shipping via masterImageManifest below.
    //
    // A smaller floor of 2 applies even without an image manifest: a full-document regeneration
    // is the only repair instrument the Doc pipeline has for a schema-shape failure today (see
    // doc-schema-issues.ts / repair-strategy.ts), and a single attempt (this.maxRepairs()'s
    // default of 1) proved too narrow a window for that reroll to land — a live run exhausted it
    // on a "keyBenefits" bullets Block with too few items (2026-08-17).
    const masterRepairBudget = Math.max(repairBudget, imgManifest ? 3 : 2);

    await this.withProgress(async () => {
      const { seoLangs, transLangs } = getLangsForStore(input.website.name);
      // Localized once for the whole run — every repair-gate attempt below reuses this same
      // string instead of re-translating on each pass (see groundingSpecs doc comment).
      const grounding = await this.groundingSpecs(input);
      const groundingSpecs = grounding.text;
      // Distinguishes "no specs supplied" (guard legitimately inert) from "specs supplied but
      // the grounding source failed its post-condition" (guard silently off). The Ortur H20
      // incident this guards against was invisible for exactly this reason — a console.warn is
      // not observability for editors who never open devtools.
      const groundingDisabled = !!input.specs?.trim() && !groundingSpecs;
      // Same source of truth as validateSpecCountParity's expected count — see design note D4
      // (specs-grounding fail-open PR): deriving the repair model's "allowed parameters" list
      // from the same function that derives the expected row count means the two can't disagree.
      const allowedSpecParams = expectedSpecParameterLabels(input.specs, input.name);

      // Step 1 — Generate the uk-UA MASTER HTML (with one repair attempt on hard errors). Every
      // other locale is a Task C translation of this artifact (Step 4) — see buildMasterUaOverlay.
      this.progressMessage.set(useThinking ? 'Generating HTML Description (Deep Thinking)…' : 'Generating HTML Description…');
      const masterInput: ProductInput = {
        ...input,
        // The SAME Ukrainian text that will ground §7, not the English sheet.
        //
        // Two translations of one English parameter is what made spec-row-not-grounded a coin
        // flip: the model rendered "Alarm Method" as "Спосіб сповіщення" for the table while
        // groundingSpecs rendered it some other way for the check, and stem-matching those two
        // is unreliable by construction. Feeding the model the text the check will use makes
        // them agree because they are the same string, not because two passes happened to align.
        //
        // Falls back to the raw sheet when grounding is off, which is exactly the old behaviour.
        specs: groundingSpecs || input.specs,
        customInstructions: [
          input.customInstructions?.trim(),
          buildMasterUaOverlay(input.website.name),
        ].filter(Boolean).join('\n\n'),
      };
      // ── Doc pipeline, per-store rollout ────────────────────────────────────────
      // Opt-in and narrow on purpose: the live probe passed 4/4, but on ONE product, ONE store,
      // ONE locale. That settles feasibility, not reliability. See doc-pipeline-flag.ts.
      const useDocPipeline = usesDocPipeline(input.website.name, input.templateId);
      // Separate, independent gate for the NEW consumables document model — off by default pending
      // a live probe. See doc-pipeline-flag.ts. Mutually exclusive with useDocPipeline: consumables
      // never satisfies usesDocPipeline() (proven impossible — see its own doc comment).
      const useConsumablesDocPipeline = usesConsumablesDocPipeline(input.templateId);
      const basePayloadA = useDocPipeline
        ? buildPromptADoc(masterInput, 'Ukrainian (uk-UA)')
        : useConsumablesDocPipeline
        ? buildPromptAConsumablesDoc(masterInput, 'Ukrainian (uk-UA)')
        : buildPromptA(masterInput, 'Ukrainian (uk-UA)');
      // What the LAST produce call had to splice back — plain-HTML path only (restoreMissingVideos
      // is a string-splicing mechanism; the Doc path's own validateVideoCoverageDoc, wired inside
      // runDocGate, covers video coverage there without this stash).
      let restoredVideos: SourceVideoEmbed[] = [];
      const produceHtmlA = async (payload: PromptPayload): Promise<string> => {
        const result = await this.produceTaskAArtifact({
          payload, useThinking, input, videoEmbeds, contextLabel: 'HTML (base)',
        });
        restoredVideos = result.restoredVideos;
        return result.html;
      };
      const htmlAResult = useDocPipeline
        ? await this.runDocGate({
            label: 'HTML (base)', contextLabel: 'HTML (base)', docTaskLabel: 'Doc (base)',
            maxRepairs: masterRepairBudget, basePayload: basePayloadA, useThinking,
            locale: 'uk-UA', localeIso: 'uk-UA', input, groundingSpecs, allowedSpecParams,
            groundingDisabled, grounding, videoEmbeds, imgManifest,
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing HTML (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          })
        : useConsumablesDocPipeline
        ? await this.runConsumablesDocGate({
            label: 'HTML (base)', contextLabel: 'HTML (base)', docTaskLabel: 'Doc (base, consumables)',
            maxRepairs: masterRepairBudget, basePayload: basePayloadA, useThinking,
            locale: 'uk-UA', localeIso: 'uk-UA', input, groundingSpecs, allowedSpecParams,
            groundingDisabled, grounding, imgManifest,
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing HTML (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          })
        : await runRepairGate<string>({
            label: 'HTML (base)',
            maxRepairs: masterRepairBudget,
            basePayload: basePayloadA,
            produce: produceHtmlA,
            validate: html => [
              ...validateGeneratedHtml(html, 'HTML (base)', input.name, 'uk-UA', { templateId: input.templateId, imageManifest: imgManifest }),
              // Trusted exactly when the model was given this same text (see masterInput.specs). If
              // grounding fell back to the English sheet, a label mismatch says nothing about the row
              // and must not cost a regeneration.
              ...validateSpecsGrounding(html, groundingSpecs, 'HTML (base)', allowedSpecParams,
                { labelAnchorTrusted: !!groundingSpecs }),
              ...validateSpecCountParity(html, input.specs, input.name, 'HTML (base)'),
              // Image text may not carry a figure the source never stated — the prompt-side rule
              // (NUMERIC_SOURCE_FIDELITY_RULES) reduces the rate; this is the deterministic gate.
              ...validateAltNumericFidelity(html, this.numericFidelitySources(input, imgManifest), 'HTML (base)'),
              // Style B second-person scope — warning tier while the block-slicing heuristic is
              // measured on real generations; inert for every store except Center 3D Print.
              ...validateSecondPersonScope(html, 'uk-UA', input.website.name),
              // Style B section headings must be functional, not bare nominal topics. Warning tier
              // while the verb heuristic is measured; inert for every store except Center 3D Print.
              ...validateHeadingStyle(html, 'uk-UA', input.website.name, input.name),
              // Per-locale sentence ceiling — language-level, so every store, not just C3D.
              ...validateSentenceLength(html, 'uk-UA', 'HTML (base)'),
              // §7 must not collapse into one catch-all category — runs on the master only, since
              // Task C's countSpecCategories + validateStructuralParity carry the shape onward.
              ...validateSpecCategoryShape(html, 'HTML (base)', { templateId: input.templateId, locale: 'uk-UA' }),
              // Should never fire: restoreMissingVideos ran in produce. That is the point — this is
              // the assertion that the deterministic layer worked, not the mechanism that makes it.
              ...validateVideoCoverage(html, videoEmbeds, 'HTML (base)'),
              // Placement by code rather than by the model. Warning tier: the artifact is correct,
              // but the editor should know the anchor was chosen mechanically.
              ...restoredVideos.map(e => ({
                severity: 'warning' as const,
                rule: 'video-embed-restored',
                detail:
                  `The model omitted the source video embed (${e.src}); it was re-inserted `
                  + 'automatically before §7. Check that it sits with a sensible lead-in paragraph.',
                context: 'HTML (base)',
              })),
              ...(groundingDisabled ? [{
                severity: 'warning' as const,
                rule: 'specs-grounding-disabled',
                // The cause is named, not guessed. The old wording asserted the script explanation
                // even when the call had thrown, which made the one observable signal actively
                // misleading — and three different causes produce this same state.
                detail:
                  'Specs grounding was DISABLED for this run — §7 rows were NOT verified against the '
                  + 'source specifications. Cause: '
                  + (grounding.failure ? describeGroundingFailure(grounding.failure) : 'unknown')
                  + '.',
                context: 'HTML (base)',
              }] : []),
            ],
            withFeedback: appendRepairFeedback,
            // Block-scoped rung. Runs BEFORE any full regeneration and is the only instrument a
            // warning can reach — see resolveLadder. Wired here rather than after the gate so a
            // translation inherits already-repaired prose from the master. Unconditional here — this
            // branch only ever runs when useDocPipeline is false.
            repairBlocks: this.blockRepairer('uk-UA', 'HTML (base)', input),
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing HTML (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          });
      // Outcome is recorded BEFORE the guard below, so a generation that never validated is
      // counted rather than lost with the exception. Fire-and-forget — telemetry must not be able
      // to fail a generation that otherwise succeeded.
      void this.llm.recordGeneration({
        store: input.website.name,
        locale: 'uk-UA',
        productName: input.name,
        pipeline: useDocPipeline ? 'doc' : useConsumablesDocPipeline ? 'consumables-doc' : 'html',
        outcome: !htmlAResult.artifact.trim() ? 'failed-schema'
          : htmlAResult.repairsUsed > 0 ? 'repaired'
          : 'ok',
        repairsUsed: htmlAResult.repairsUsed,
      });

      // Every attempt failed the schema → the gate's best result is ''. Saving that would be a
      // silent data loss; fail loudly instead. Inert on the HTML path, which cannot produce ''.
      if (useDocPipeline || useConsumablesDocPipeline) assertDocRendered(htmlAResult.artifact, 'HTML (base)', htmlAResult.finalIssues);
      const { artifact: htmlEn, finalIssues: htmlIssues, repairsUsed: aRepairs } = htmlAResult;
      if (aRepairs > 0) console.info(`[repair-gate] HTML (base): ${aRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('HTML (base)', htmlAResult, this.blockPatchTally.get('HTML (base)'), this.preValidationFixesFor('HTML (base)'))]);
      // Deterministic §7 category merge (dissolve <3-row categories into "Загальні відомості",
      // placed first) — runs once here, before this HTML is used for Slug/SEO grounding or
      // handed to Task C, so every downstream consumer sees the same, already-merged master.
      const mergedHtmlEn = mergeSmallSpecCategories(htmlEn);
      // mainHtmlUa now holds the uk-UA MASTER — see mainHtmlLocale. Renamed to versions['uk-UA'] in PR #1.
      const finalMasterHtml = isConsumables ? trimConsumablesToLimit(mergedHtmlEn) : mergedHtmlEn;
      this.content.update(c => ({ ...c, mainHtmlUa: finalMasterHtml }));
      // Scope translation image-manifest validation to what the master actually shipped, not
      // the raw upload manifest — a translation must mirror the master (validateStructuralParity
      // already enforces this byte-for-byte); requiring it to also contain manifest images the
      // master itself dropped is an unsatisfiable, contradictory validation (see 2026-07-15
      // es-ES regression: repair feedback for "missing" manifest images the master never had
      // drove the model to invent structure instead of translating).
      const masterImageManifest = imgManifest?.filter(({ urlFilename }) => finalMasterHtml.includes(urlFilename));
      this.validationIssues.set(
        isConsumables
          ? validateGeneratedHtml(finalMasterHtml, 'HTML (base)', input.name, 'uk-UA', { templateId: input.templateId, imageManifest: imgManifest })
          : htmlIssues,
      );

      // Step 2 — SEO slugs FIRST. The localized `name` per locale is the single source of
      // truth for the storefront product-name field (→ H1) AND the Task B title core.
      // Reuse an editor-approved slug if present for THIS product+store; else generate.
      // Non-blocking either way: a slug failure must not abort SEO/translations/FAQ.
      let localizedNames: Record<string, string> | undefined;
      if (reusedSlug?.slugs?.length) {
        localizedNames = slugsToLocalizedNames(reusedSlug.slugs);
      } else {
        try {
          this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);
          const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, mergedHtmlEn);
          // Deep Thinking Mode now governs Slug/SEO/Task C too, not just the uk-UA master.
          // Gated the same way as SEO metadata below: validateSlugs feeds this loop directly now,
          // so slug-name-designator-lost / slug-charset / slug-duplicate get a real repair attempt
          // instead of only being reported after the fact by runOutputValidation.
          const slugResult = await runRepairGate<SlugResponse>({
            label: 'Slugs',
            maxRepairs: this.maxRepairs(),
            basePayload: promptSlug,
            produce: async payload => this.normalizeSlugResponse(
              await this.llm.generateJson<SlugResponse>(payload, useThinking, { taskLabel: 'Slug', productName: input.name, store: input.website.name }),
            ),
            validate: json => validateSlugs(json, input.name),
            withFeedback: appendRepairFeedback,
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing slugs (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          });
          const { artifact: slugData, repairsUsed: slugRepairs } = slugResult;
          if (slugRepairs > 0) console.info(`[repair-gate] Slugs: ${slugRepairs} repair(s) applied`);
          this.repairReport.update(r => [...r, toArtifactReport('Slugs', slugResult)]);
          this.content.update(c => ({ ...c, slugData }));
          this.approvedSlugKey.set(this.slugKey(input));
          localizedNames = slugsToLocalizedNames(slugData.slugs);
        } catch (e) {
          console.warn('[Slugs] Generation failed; SEO H1 falls back to formula.', e);
          this.validationIssues.update(issues => [
            ...issues,
            { severity: 'warning', rule: 'slug-generation-failed', detail: 'Slug generation failed — H1 and meta_title fall back to the English formula for all locales. Re-run Slug separately or regenerate.', context: 'Slugs' },
          ]);
        }
      }

      // Step 3 — Generate SEO Metadata. Localized names (if any) are consumed VERBATIM as
      // h1 + title core; HTML context still feeds meta_description's hard spec.
      this.progressMessage.set(`Generating SEO Metadata for ${seoLangs.join(', ')}…`);
      const promptB = buildPromptB(input.website.name, input.name, seoLangs, mergedHtmlEn, localizedNames);
      const seoResult = await runRepairGate({
        label: 'SEO metadata',
        maxRepairs: this.maxRepairs(),
        basePayload: promptB,
        // Deep Thinking Mode now governs Slug/SEO/Task C too, not just the uk-UA master.
        produce: async (payload) => this.canonicalizeSeoData(await this.llm.generateJson(payload, useThinking, { taskLabel: 'SEO metadata', productName: input.name, store: input.website.name }), input.name),
        validate: (json) => validateSeoMetadata(json, NO_CURRENCY_CHECK),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      const { artifact: seoJson, repairsUsed: bRepairs } = seoResult;
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('SEO metadata', seoResult)]);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      // Step 4 — Translation from the uk-UA master (Task C, fast model). Every non-master locale —
      // INCLUDING English — is a structure-preserving translation, never an independent generation.
      // Structural parity against the master is enforced deterministically, not merely requested in
      // the prompt: a translation that is not isomorphic to the master is a failed translation.
      // wrapVideoFigures/wrapImageFigures are NOT re-run here — the master already carries fully
      // wrapped figures/videos, and wrapVideoFigures is not idempotent (re-running it on
      // already-wrapped HTML nests a second <figure> and duplicates the <figcaption>).
      // Sequential, not Promise.all — matches every other loop here and avoids provider rate limits.
      for (const lang of transLangs) {
        const locale = taskLangToIso(lang, input.website.name);
        const isExpert3d = isExpert3dStore(input.website.name);

        this.progressMessage.set(`Translating to ${lang}…`);

        const basePayloadC = buildPromptC(
          finalMasterHtml,
          lang,
          input.website.name,
          getStore(input.website.name).group,
          input.templateId,
          { localizedName: localizedNames?.[locale], sourceLocale: 'uk-UA' },
        );

        // How many media srcs the LAST produce call had to put back — read by validate below, the
        // same closure-stash pattern restoredVideos uses on the master path.
        let restoredSrcs = 0;
        const htmlLangResult = await runRepairGate<string>({
          label: `HTML (${lang})`,
          maxRepairs: repairBudget,
          basePayload: basePayloadC,
          produce: async (payload) => {
            // Deep Thinking Mode now governs Slug/SEO/Task C too, not just the uk-UA master.
            let html = await this.llm.generateText(payload, useThinking, { taskLabel: `HTML (${lang})`, productName: input.name, store: input.website.name, lang: locale });
            html = stripCodeFences(html);
            if (isExpert3d && (lang === 'ES' || lang === 'PT')) {
              html = this.applySpanishExpert3dReplacements(html);
            }
            // Covers ru-UA, a real Center 3D Print target; a no-op for pl/de/en.
            html = normalizeTerminology(cyrillizeUnits(restoreIdentifierDots(fixDecimalSeparator(fixNumberFormatting(html, input.name), locale), locale), locale), locale);
            html = canonicalizeMultiInOne(html, locale);
            // TIER 0 — deterministic, no LLM. A real es-ES artifact shipped with all seven image
            // URLs broken because the model rewrote the folder's ASCII hyphen as an EN DASH
            // (U+2013), Spanish typography applied inside a URL. Detection worked; the repair gate
            // then spent its whole budget and the model never fixed it, because re-prompting in
            // Spanish reproduces the same substitution. The master's src list is known, so the
            // right value never has to be asked for.
            const restoration = restoreMediaSrcs(html, finalMasterHtml);
            restoredSrcs = restoration.restored;
            return restoration.html;
          },
          validate: (html) => [
            ...validateGeneratedHtml(html, `HTML (${lang})`, input.name, locale, { templateId: input.templateId, imageManifest: masterImageManifest }),
            ...validateStructuralParity(finalMasterHtml, html, `HTML (${lang})`),
            // Checked here (not just in the post-hoc runOutputValidation pass) so a heading that
            // regressed back to the full product name during translation — HEADING_FIDELITY
            // (task-c.ts) tells the model not to, but telling is not enforcing — gets a real
            // repair attempt via repairBlocks below, instead of only being reported after the
            // artifact already shipped (the 2026-08 EXPERT3D Ortur F10 10W en-ES/es-ES/pt-PT gap).
            ...validateHeadingStyle(html, locale, input.website.name, input.name),
            // Surfaced as a WARNING, not silently. The artifact is correct now, but a model that
            // keeps rewriting URLs is a real signal — swallowing the fix would hide it and make the
            // next regression invisible.
            ...(restoredSrcs > 0 ? [{
              severity: 'warning' as const,
              rule: 'media-src-restored',
              detail: `${restoredSrcs} media src(s) diverged from the uk-UA master and were restored deterministically. The translation model altered a URL — check for typographic substitution (e.g. an EN DASH for a hyphen).`,
              context: `HTML (${lang})`,
            }] : []),
          ],
          withFeedback: appendRepairFeedback,
          // Safe against structural parity: validateStructuralParity counts tags, and a rewrite
          // inside one block changes no tag count — rejectPatch refuses any patch that is not
          // exactly one element with the original's tag and attributes.
          repairBlocks: this.blockRepairer(locale, `HTML (${lang})`, input),
          onAttempt: (n, c) =>
            this.progressMessage.set(`Repairing ${lang} translation (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
        });
        const { artifact: htmlLang, finalIssues: langFinalIssues, repairsUsed: langRepairs } = htmlLangResult;
        if (langRepairs > 0) console.info(`[repair-gate] HTML (${lang}): ${langRepairs} repair(s) applied`);
        this.repairReport.update(r => [...r, toArtifactReport(`HTML (${lang})`, htmlLangResult, this.blockPatchTally.get(`HTML (${lang})`))]);
        if (langFinalIssues.length > 0) {
          this.validationIssues.update(issues => [...issues, ...langFinalIssues]);
        }
        const finalLangHtml = isConsumables ? trimConsumablesToLimit(htmlLang) : htmlLang;
        this.content.update(c => ({
          ...c,
          translations: { ...c.translations, [lang]: finalLangHtml }
        }));
      }

      // Step 5 — FAQ artifacts (schema-free, for Journal theme native module fields).
      // Optional: runs only when Supplemental Content is supplied. Description and specs
      // are still passed to the builder as grounding context, but they do not trigger it.
      if (input.supplementalContent?.trim()) {
        const store = getStore(input.website.name);
        for (const isoCode of store.languages) {
          const humanLang = isoToHumanLang(isoCode);
          const faqLocaleOverlay = buildNativeLangOverlay(
            bcp47ToTaskCLang(isoCode, store.group), humanLang, input.website.name,
          );

          this.progressMessage.set(`Generating FAQ artifact (${isoCode})…`);
          const basePayloadFaq = buildPromptFaq(
            input.name, input.description, input.specs,
            input.supplementalContent ?? '', humanLang, store.currencySymbol,
            faqLocaleOverlay,
          );
          const validateFaqHtml = (html: string): ValidationIssue[] => {
            const issues = validateGeneratedHtml(html, `FAQ (${isoCode})`, input.name, isoCode);
            if (html && !html.trim().startsWith('<')) {
              issues.push({
                severity: 'error', rule: 'non-html-output',
                detail: 'Output is not HTML (does not start with "<").',
                context: `FAQ (${isoCode})`,
              });
            }
            return issues;
          };
          const faqResult = await runRepairGate<string>({
            label: `FAQ (${isoCode})`,
            maxRepairs: this.maxRepairs(),
            basePayload: basePayloadFaq,
            produce: async (payload) => {
              let html = await this.llm.generateText(payload, useThinking, { taskLabel: `FAQ (${isoCode})`, productName: input.name, store: input.website.name, lang: isoCode });
              html = stripCodeFences(html);
              // The FAQ is validated by the same validateGeneratedHtml as the master, so it must
              // get the same deterministic normalizers. Without them the gate reports unit-spacing
              // and latin-unit-in-cyrillic-text findings that no instrument can reach (the FAQ had
              // no block rung either) — held to the master's standard without the master's tooling.
              // Ordering mirrors produceHtmlA above and is documented there.
              html = fixNumberFormatting(html, input.name);
              html = fixDecimalSeparator(html, isoCode);
              html = restoreIdentifierDots(html, isoCode);
              html = cyrillizeUnits(html, isoCode);
              html = normalizeTerminology(html, isoCode);
              return canonicalizeMultiInOne(html, isoCode);
            },
            validate: validateFaqHtml,
            withFeedback: appendRepairFeedback,
            // Without this rung a FAQ warning was unreachable by ANY instrument: the block pass is
            // the only thing that can act on a warning (see the master gate's note), and the FAQ
            // gate simply had none. That is why the L2 Pro report listed three FAQ warnings under
            // "not repaired" with no patch attempts against them. blockRepairer makes no
            // assumptions about document shape, so it is safe on the FAQ's schema-free HTML.
            repairBlocks: this.blockRepairer(isoCode, `FAQ (${isoCode})`, input),
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing FAQ (${isoCode}) (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          });
          const { artifact: faqHtml, repairsUsed: faqRepairs } = faqResult;
          if (faqRepairs > 0) console.info(`[repair-gate] FAQ (${isoCode}): ${faqRepairs} repair(s) applied`);
          this.repairReport.update(r => [...r, toArtifactReport(`FAQ (${isoCode})`, faqResult, this.blockPatchTally.get(`FAQ (${isoCode})`))]);
          if (faqHtml.startsWith('<')) {
            this.content.update(c => ({ ...c, faqArtifacts: { ...c.faqArtifacts, [isoCode]: faqHtml } }));
          } else {
            console.warn(`[FAQ] No usable artifact for ${isoCode}: model returned non-HTML after repair. Skipped.`);
          }
        }
      }

      // Post-generation acceptance-criteria check (non-blocking — reports only).
      this.runOutputValidation(input.website.name, input.name, input.templateId, 'uk-UA');

      // Deterministic table-shape finalization (§2 killer-specs → 2-col, §7 → one colspan
      // table) — runs strictly AFTER runOutputValidation() so checkLeadInCapitalization's
      // marker-text detection always sees the pre-transform 3-column shape. Applied to the
      // master and every translation independently; validateStructuralParity already enforces
      // they share the same (merged) category structure, so no cross-locale drift is possible.
      this.content.update(c => ({
        ...c,
        mainHtmlUa: finalizeTablesForDisplay(c.mainHtmlUa, 'uk-UA', input.website.name),
        translations: Object.fromEntries(
          Object.entries(c.translations).map(([lang, html]) =>
            [lang, finalizeTablesForDisplay(html, taskLangToIso(lang, input.website.name), input.website.name)]),
        ),
      }));

      this.historyService.add(input, this.content());
      this.progressMessage.set('Done!');
    }, 'Error during generation.', 'Generation failed. Check console for details.');
  }

  /** Native uk-UA generation: Task A is called directly in Ukrainian (no English base,
   *  no Task C translation loop). SEO/slug/FAQ are scoped to uk-UA only. Mirrors generate()'s
   *  repair gates and validators for the artifacts it shares. */
  async generateUaContent(input: ProductInput, useThinking = false): Promise<void> {
    const UA_ISO = 'uk-UA';
    const UA_BASE_LANGUAGE = 'Ukrainian (uk-UA)';

    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: null, website: input.website, faqArtifacts: {}, mainHtmlLocale: UA_ISO });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
    this.bulletLeadFixTally.clear();
    this.repairReportMeta.set({ product: input.name, store: input.website.name, generatedAt: new Date().toISOString() });

    // Manifest handed to the validator for coverage enforcement (image-manifest-missing /
    // image-unknown-src): every uploaded image must ship in every language version.
    // Expert-3DPrinter is image-free by policy — no manifest, no coverage check.
    const imgManifest = input.website.name === 'Expert-3DPrinter' ? undefined : input.imageManifest;

    const isConsumables = input.templateId === 'consumables-resin';
    // See the sibling comment in generate().
    const videoEmbeds = isConsumables ? [] : extractVideoEmbeds(input.description);
    const repairBudget = isConsumables ? 2 : this.maxRepairs();

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);
      // Localized once for the whole run — every repair-gate attempt below reuses this same
      // string instead of re-translating on each pass (see groundingSpecs doc comment).
      const grounding = await this.groundingSpecs(input);
      const groundingSpecs = grounding.text;
      // Distinguishes "no specs supplied" (guard legitimately inert) from "specs supplied but
      // the grounding source failed its post-condition" (guard silently off). See the sibling
      // groundingDisabled comment in the base-HTML generate() path above.
      const groundingDisabled = !!input.specs?.trim() && !groundingSpecs;
      // Same source of truth as validateSpecCountParity's expected count — see the sibling
      // allowedSpecParams comment in the base-HTML generate() path above.
      const allowedSpecParams = expectedSpecParameterLabels(input.specs, input.name);

      // Step 1 — Task A generated NATIVELY in Ukrainian (no English base, no Task C).
      // Image manifest figcaption/alt text is sourced in English (Vision pre-pass output), so a
      // custom-instructions override is injected here to make Task A translate it into Ukrainian
      // instead of copying it verbatim — the normal pipeline gets this for free from Task C, which
      // this native path skips entirely.
      this.progressMessage.set(useThinking ? 'Generating Ukrainian Description (Deep Thinking)…' : 'Generating Ukrainian Description…');
      const uaInput: ProductInput = {
        ...input,
        // Same substitution as generate()'s masterInput — see the rationale there.
        specs: groundingSpecs || input.specs,
        customInstructions: [
          input.customInstructions?.trim(),
          buildMasterUaOverlay(input.website.name),
        ].filter(Boolean).join('\n\n'),
      };
      // Same per-store rollout as generate() — see the sibling comment there and
      // doc-pipeline-flag.ts. UA Description targets the same locale ('uk-UA') the Doc pipeline
      // already renders in generate(), so a store's enrollment applies here identically.
      const useDocPipelineUa = usesDocPipeline(input.website.name, input.templateId);
      // See the sibling comment in generate().
      const useConsumablesDocPipelineUa = usesConsumablesDocPipeline(input.templateId);
      const basePayloadA = useDocPipelineUa
        ? buildPromptADoc(uaInput, UA_BASE_LANGUAGE)
        : useConsumablesDocPipelineUa
        ? buildPromptAConsumablesDoc(uaInput, UA_BASE_LANGUAGE)
        : buildPromptA(uaInput, UA_BASE_LANGUAGE);
      // See the sibling comment in generate() — plain-HTML path only.
      let restoredVideos: SourceVideoEmbed[] = [];
      const produceHtmlUa = async (payload: PromptPayload): Promise<string> => {
        const result = await this.produceTaskAArtifact({
          payload, useThinking, input, videoEmbeds, contextLabel: 'HTML (uk-UA)',
        });
        restoredVideos = result.restoredVideos;
        return result.html;
      };
      const htmlUaResult = useDocPipelineUa
        ? await this.runDocGate({
            label: 'HTML (uk-UA)', contextLabel: 'HTML (uk-UA)', docTaskLabel: 'Doc (uk-UA)',
            maxRepairs: repairBudget, basePayload: basePayloadA, useThinking,
            locale: UA_ISO, localeIso: UA_ISO, input, groundingSpecs, allowedSpecParams,
            groundingDisabled, grounding, videoEmbeds, imgManifest,
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing description (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          })
        : useConsumablesDocPipelineUa
        ? await this.runConsumablesDocGate({
            label: 'HTML (uk-UA)', contextLabel: 'HTML (uk-UA)', docTaskLabel: 'Doc (uk-UA, consumables)',
            maxRepairs: repairBudget, basePayload: basePayloadA, useThinking,
            locale: UA_ISO, localeIso: UA_ISO, input, groundingSpecs, allowedSpecParams,
            groundingDisabled, grounding, imgManifest,
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing description (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          })
        : await runRepairGate<string>({
            label: 'HTML (uk-UA)',
            maxRepairs: repairBudget,
            basePayload: basePayloadA,
            produce: produceHtmlUa,
            validate: html => [
              ...validateGeneratedHtml(html, 'HTML (uk-UA)', input.name, UA_ISO, { templateId: input.templateId, imageManifest: imgManifest }),
              // Same reasoning as the sibling call in generate().
              ...validateSpecsGrounding(html, groundingSpecs, 'HTML (uk-UA)', allowedSpecParams,
                { labelAnchorTrusted: !!groundingSpecs }),
              ...validateSpecCountParity(html, input.specs, input.name, 'HTML (uk-UA)'),
              // Image-text numeric gate — see the identical hook in generate() for rationale.
              ...validateAltNumericFidelity(html, this.numericFidelitySources(input, imgManifest), 'HTML (uk-UA)'),
              // Style B second-person scope — see the identical hook in generate() for rationale.
              ...validateSecondPersonScope(html, UA_ISO, input.website.name),
              // Style B heading check — see the identical hook in generate() for rationale.
              ...validateHeadingStyle(html, UA_ISO, input.website.name, input.name),
              ...validateSentenceLength(html, UA_ISO, 'HTML (uk-UA)'),
              // §7 category-collapse guard — see the identical hook in generate() for rationale.
              ...validateSpecCategoryShape(html, 'HTML (uk-UA)', { templateId: input.templateId, locale: UA_ISO }),
              // Video coverage + automatic-placement notice — see the identical hook in generate().
              ...validateVideoCoverage(html, videoEmbeds, 'HTML (uk-UA)'),
              ...restoredVideos.map(e => ({
                severity: 'warning' as const,
                rule: 'video-embed-restored',
                detail:
                  `The model omitted the source video embed (${e.src}); it was re-inserted `
                  + 'automatically before §7. Check that it sits with a sensible lead-in paragraph.',
                context: 'HTML (uk-UA)',
              })),
              ...(groundingDisabled ? [{
                severity: 'warning' as const,
                rule: 'specs-grounding-disabled',
                // The cause is named, not guessed. The old wording asserted the script explanation
                // even when the call had thrown, which made the one observable signal actively
                // misleading — and three different causes produce this same state.
                detail:
                  'Specs grounding was DISABLED for this run — §7 rows were NOT verified against the '
                  + 'source specifications. Cause: '
                  + (grounding.failure ? describeGroundingFailure(grounding.failure) : 'unknown')
                  + '.',
                context: 'HTML (uk-UA)',
              }] : []),
            ],
            withFeedback: appendRepairFeedback,
            // Same rung as generate()'s master gate — this standalone path runs the same validators,
            // so leaving it out would make sentence-too-long repairable in one entry point and merely
            // reported in the other. Unconditional here — this branch only ever runs when
            // useDocPipelineUa is false.
            repairBlocks: this.blockRepairer(UA_ISO, 'HTML (uk-UA)', input),
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing description (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          });
      // Outcome is recorded BEFORE the guard below, so a generation that never validated is
      // counted rather than lost with the exception. Fire-and-forget, same as generate() —
      // telemetry must not be able to fail a generation that otherwise succeeded. UA Description
      // generations were not recorded at all before this change, Doc or not.
      void this.llm.recordGeneration({
        store: input.website.name,
        locale: UA_ISO,
        productName: input.name,
        pipeline: useDocPipelineUa ? 'doc' : useConsumablesDocPipelineUa ? 'consumables-doc' : 'html',
        outcome: !htmlUaResult.artifact.trim() ? 'failed-schema'
          : htmlUaResult.repairsUsed > 0 ? 'repaired'
          : 'ok',
        repairsUsed: htmlUaResult.repairsUsed,
      });
      // Every attempt failed the schema → the gate's best result is ''. Saving that would be a
      // silent data loss; fail loudly instead. See the identical guard in generate() — inert on
      // the HTML path, which cannot produce ''.
      if (useDocPipelineUa || useConsumablesDocPipelineUa) assertDocRendered(htmlUaResult.artifact, 'HTML (uk-UA)', htmlUaResult.finalIssues);
      const { artifact: htmlUa, finalIssues: htmlIssues, repairsUsed: aRepairs } = htmlUaResult;
      if (aRepairs > 0) console.info(`[repair-gate] HTML (uk-UA): ${aRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('HTML (uk-UA)', htmlUaResult, this.blockPatchTally.get('HTML (uk-UA)'), this.preValidationFixesFor('HTML (uk-UA)'))]);
      // Deterministic §7 category merge — see the identical hook in generate() for rationale.
      const mergedHtmlUa = mergeSmallSpecCategories(htmlUa);
      const finalHtmlUa = isConsumables ? trimConsumablesToLimit(mergedHtmlUa) : mergedHtmlUa;
      this.content.update(c => ({ ...c, mainHtmlUa: finalHtmlUa }));
      this.validationIssues.set(
        isConsumables
          ? validateGeneratedHtml(finalHtmlUa, 'HTML (uk-UA)', input.name, UA_ISO, { templateId: input.templateId, imageManifest: imgManifest })
          : htmlIssues,
      );

      // Step 2 — Slug for ALL site languages, grounded in the uk-UA description. Localized name
      // is the single source of truth for H1 + Task B title core. Non-blocking: a slug failure
      // must not abort SEO/FAQ.
      let localizedNames: Record<string, string> | undefined;
      try {
        this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);
        const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, finalHtmlUa);
        // Deep Thinking Mode now governs Slug/SEO too, not just the uk-UA master.
        // See generate()'s Step 2 for why this is a runRepairGate call now instead of a bare
        // generateJson: validateSlugs must feed a real repair loop, not just runOutputValidation.
        const slugResult = await runRepairGate<SlugResponse>({
          label: 'Slugs',
          maxRepairs: this.maxRepairs(),
          basePayload: promptSlug,
          produce: async payload => this.normalizeSlugResponse(
            await this.llm.generateJson<SlugResponse>(payload, useThinking, { taskLabel: 'Slug', productName: input.name, store: input.website.name, lang: UA_ISO }),
          ),
          validate: json => validateSlugs(json, input.name),
          withFeedback: appendRepairFeedback,
          onAttempt: (n, c) =>
            this.progressMessage.set(`Repairing slugs (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
        });
        const { artifact: slugData, repairsUsed: slugRepairs } = slugResult;
        if (slugRepairs > 0) console.info(`[repair-gate] Slugs: ${slugRepairs} repair(s) applied`);
        this.repairReport.update(r => [...r, toArtifactReport('Slugs', slugResult)]);
        this.content.update(c => ({ ...c, slugData }));
        this.approvedSlugKey.set(this.slugKey(input));
        localizedNames = slugsToLocalizedNames(slugData.slugs);
      } catch (e) {
        console.warn('[Slugs] uk-UA slug generation failed; H1 falls back to formula.', e);
        this.validationIssues.update(issues => [
          ...issues,
          { severity: 'warning', rule: 'slug-generation-failed', detail: 'Slug generation failed — H1 and meta_title fall back to the formula.', context: 'Slugs' },
        ]);
      }

      // Step 3 — SEO metadata for ALL site languages, grounded in the uk-UA description.
      this.progressMessage.set(`Generating SEO Metadata for ${seoLangs.join(', ')}…`);
      const promptB = buildPromptB(input.website.name, input.name, seoLangs, finalHtmlUa, localizedNames);
      const seoResult = await runRepairGate({
        label: 'SEO metadata',
        maxRepairs: this.maxRepairs(),
        basePayload: promptB,
        // Deep Thinking Mode now governs Slug/SEO too, not just the uk-UA master.
        produce: async (payload) => this.canonicalizeSeoData(await this.llm.generateJson(payload, useThinking, { taskLabel: 'SEO metadata', productName: input.name, store: input.website.name, lang: UA_ISO }), input.name),
        validate: (json) => validateSeoMetadata(json, NO_CURRENCY_CHECK),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      const { artifact: seoJson, repairsUsed: bRepairs } = seoResult;
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('SEO metadata', seoResult)]);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      // Step 4 — FAQ artifact (uk-UA only). Runs ONLY when Supplemental Content is supplied.
      if (input.supplementalContent?.trim()) {
        const store = getStore(input.website.name);
        this.progressMessage.set('Generating FAQ artifact (uk-UA)…');
        const basePayloadFaq = buildPromptFaq(
          input.name, input.description, input.specs,
          input.supplementalContent ?? '', isoToHumanLang(UA_ISO), store.currencySymbol,
        );
        const validateFaqHtml = (html: string): ValidationIssue[] => {
          const issues = validateGeneratedHtml(html, 'FAQ (uk-UA)', input.name, UA_ISO);
          if (html && !html.trim().startsWith('<')) {
            issues.push({
              severity: 'error', rule: 'non-html-output',
              detail: 'Output is not HTML (does not start with "<").',
              context: 'FAQ (uk-UA)',
            });
          }
          return issues;
        };
        const faqResult = await runRepairGate<string>({
          label: 'FAQ (uk-UA)',
          maxRepairs: this.maxRepairs(),
          basePayload: basePayloadFaq,
          produce: async (payload) => {
            let html = await this.llm.generateText(payload, useThinking, { taskLabel: 'FAQ (uk-UA)', productName: input.name, store: input.website.name, lang: UA_ISO });
            html = stripCodeFences(html);
            // Same normalizer chain as the sibling FAQ produce in generate() — see the rationale there.
            html = fixNumberFormatting(html, input.name);
            html = fixDecimalSeparator(html, UA_ISO);
            html = restoreIdentifierDots(html, UA_ISO);
            html = cyrillizeUnits(html, UA_ISO);
            html = normalizeTerminology(html, UA_ISO);
            return canonicalizeMultiInOne(html, UA_ISO);
          },
          validate: validateFaqHtml,
          withFeedback: appendRepairFeedback,
          // Same rung as the sibling FAQ gate in generate() — see the rationale there.
          repairBlocks: this.blockRepairer(UA_ISO, 'FAQ (uk-UA)', input),
          onAttempt: (n, c) =>
            this.progressMessage.set(`Repairing FAQ (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
        });
        const { artifact: faqHtml, repairsUsed: faqRepairs } = faqResult;
        if (faqRepairs > 0) console.info(`[repair-gate] FAQ (uk-UA): ${faqRepairs} repair(s) applied`);
        this.repairReport.update(r => [...r, toArtifactReport('FAQ (uk-UA)', faqResult, this.blockPatchTally.get('FAQ (uk-UA)'))]);
        if (faqHtml.startsWith('<')) {
          this.content.update(c => ({ ...c, faqArtifacts: { ...c.faqArtifacts, [UA_ISO]: faqHtml } }));
        } else {
          console.warn('[FAQ] No usable uk-UA artifact: model returned non-HTML after repair. Skipped.');
        }
      }

      // Post-generation acceptance-criteria check (non-blocking — reports only).
      this.runOutputValidation(input.website.name, input.name, input.templateId, UA_ISO);

      // Deterministic table-shape finalization — see the identical hook in generate() for
      // rationale. Master-only here (no translations loop in this native uk-UA path).
      this.content.update(c => ({ ...c, mainHtmlUa: finalizeTablesForDisplay(c.mainHtmlUa, UA_ISO, input.website.name) }));

      this.historyService.add(input, this.content());
      this.progressMessage.set('Done!');
    }, 'Error during Ukrainian generation.', 'Ukrainian generation failed. Check console for details.');
  }

  async generateSeoMetadata(input: ProductInput, useThinking = false): Promise<void> {
    // Reuse slugData ONLY if it was approved for THIS exact product+store, so a Slug→SEO
    // standalone run feeds the approved localized name to B as h1 + title core. Otherwise
    // clear it (and B falls back to the English formula → independence preserved).
    const existingSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: existingSlug, website: input.website });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
    this.bulletLeadFixTally.clear();
    this.repairReportMeta.set({ product: input.name, store: input.website.name, generatedAt: new Date().toISOString() });

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);
      this.progressMessage.set(`Generating SEO Metadata for ${seoLangs.join(', ')}…`);

      const localizedNames = existingSlug?.slugs?.length
        ? slugsToLocalizedNames(existingSlug.slugs)
        : undefined;
      const promptB = buildPromptB(input.website.name, input.name, seoLangs, input.description, localizedNames);
      const seoResult = await runRepairGate({
        label: 'SEO metadata',
        maxRepairs: this.maxRepairs(),
        basePayload: promptB,
        produce: async (payload) => this.canonicalizeSeoData(await this.llm.generateJson(payload, useThinking, { taskLabel: 'SEO metadata', productName: input.name, store: input.website.name }), input.name),
        validate: (json) => validateSeoMetadata(json, NO_CURRENCY_CHECK),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      const { artifact: seoJson, repairsUsed: bRepairs } = seoResult;
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('SEO metadata', seoResult)]);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      this.validationIssues.set(validateSeoMetadata(this.content().seoData, NO_CURRENCY_CHECK));

      this.historyService.add(input, this.content());
      this.progressMessage.set('SEO Generation Done!');
    }, 'Error during SEO generation.', 'SEO Generation failed.');
  }

  async generateSlugs(input: ProductInput, useThinking = false): Promise<void> {
    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: null, website: input.website });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
    this.bulletLeadFixTally.clear();
    this.repairReportMeta.set({ product: input.name, store: input.website.name, generatedAt: new Date().toISOString() });

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);
      this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);

      const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, input.description);
      const slugResult = await runRepairGate<SlugResponse>({
        label: 'Slugs',
        maxRepairs: this.maxRepairs(),
        basePayload: promptSlug,
        produce: async payload => this.normalizeSlugResponse(
          await this.llm.generateJson<SlugResponse>(payload, useThinking, { taskLabel: 'Slug', productName: input.name, store: input.website.name }),
        ),
        validate: json => validateSlugs(json, input.name),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing slugs (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      const { artifact: slugData, finalIssues: slugFinalIssues, repairsUsed: slugRepairs } = slugResult;
      if (slugRepairs > 0) console.info(`[repair-gate] Slugs: ${slugRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('Slugs', slugResult)]);
      this.content.update(c => ({ ...c, slugData }));
      this.approvedSlugKey.set(this.slugKey(input));

      this.validationIssues.set(slugFinalIssues);

      this.historyService.add(input, this.content());
      this.progressMessage.set('Slug Generation Done!');
    }, 'Error during slug generation.', 'Slug Generation failed.');
  }

  private normalizeSlugResponse(raw: SlugResponse): SlugResponse {
    const slugs = (raw.slugs ?? []).map(s => {
      const base = normalizeSlug(stripSlugStopwords(s.name), s.language);
      return { ...s, slug: enforceSlugLength(s.name, base, s.language) };
    });
    const unique = ensureUniqueSlugs(slugs);
    return {
      site_name: raw.site_name ?? '',
      slugs: slugs.map((s, i) => ({
        ...s,
        slug: unique[i],
        name: canonicalizeMultiInOne(s.name, s.language),
      })),
    };
  }

  /** Keeps "N-in-N"/"N в N" hyphenation in sync with the HTML body's canonical form — see
   *  canonicalizeMultiInOne (S4, 2026-07-16 EXPERT3D audit: body/metadata drifted apart). */
  /**
   * normalizeSeoNumbers runs LAST and its position matters: it inserts NBSP between a number and
   * its unit, so it lengthens meta_description. Because this whole method runs inside the repair
   * gate's `produce`, `validate` measures the post-formatting string — a description that crosses
   * 155 chars only after formatting is caught rather than shipped under a stale measurement.
   */
  private canonicalizeSeoData(seo: SeoResponse, productName = ''): SeoResponse {
    return normalizeSeoNumbers({
      ...seo,
      seo_data: (seo.seo_data ?? []).map(item => ({
        ...item,
        h1: canonicalizeMultiInOne(item.h1, item.language),
        meta_title: canonicalizeMultiInOne(item.meta_title, item.language),
        meta_description: canonicalizeMultiInOne(item.meta_description, item.language),
      })),
    }, productName);
  }

  async generateKeywords(name: string, description: string): Promise<void> {
    this.isSuggestingKeywords.set(true);
    this.suggestedKeywords.set([]);
    try {
      const keywords = await this.llm.generateJson<string[]>(buildKeywordsPrompt(name, description), false, { taskLabel: 'Keywords', productName: name });
      let list = Array.isArray(keywords) ? keywords : [];
      // Low-stakes suggestion output, not shipped customer-facing content — a deterministic
      // strip-and-warn is proportionate here; no repair-gate retry (see llm-output-integrity.ts).
      if (scanForLeakedPreamble(list).length > 0) {
        list = list.map(k => stripLeakedPreamble(k));
        console.warn('[Keywords] stripped leaked preamble from one or more entries');
      }
      this.suggestedKeywords.set(list);
    } catch (e) {
      console.error(e);
      alert('Failed to generate keyword suggestions.');
    } finally {
      this.isSuggestingKeywords.set(false);
    }
  }

  async optimize(htmlInput: string, productName = '', useThinking = false): Promise<void> {
    this.optimizerOutput.set('');
    this.progressMessage.set('Optimizing HTML…');
    await this.withProgress(async () => {
      // Wrapped in the repair gate as a deterministic backstop against mid-document language
      // drift: optimizer.ts's SCOPE OVERRIDE is the first line of defense but has proven
      // unreliable against a strong contextual cue (store name / image domain) — see
      // language-consistency.ts's header comment for the reproduced xTool F2 / impresora-3d.es
      // case (EN hook, ES from §2 onward).
      const result = await runRepairGate<string>({
        label: 'Optimizer',
        maxRepairs: 1,
        basePayload: buildOptimizerPrompt(htmlInput, productName),
        produce: async payload => {
          let out = await this.llm.generateText(payload, useThinking, { taskLabel: 'Optimizer', productName });
          out = stripCodeFences(out);
          out = cleanHtmlStructure(out);
          // No locale guess: table-finalize.ts derives the killer-specs header fallback from the
          // document's own already-localized header text when no known locale is passed.
          // Small-category consolidation is delegated to the LLM itself (see optimizer.ts
          // PHASE 1) since it requires inventing a new label, which a locale-less deterministic
          // step can't do safely.
          // No storeName either, deliberately: the Optimizer accepts arbitrary pasted HTML that
          // may come from any store or none. It would also be inert — with no locale,
          // getKillerSpecsHeaders returns undefined for every store map alike.
          return finalizeTablesForDisplay(out);
        },
        validate: html => validateLanguageConsistency(html, htmlInput),
        withFeedback: (payload, errors) => appendRepairFeedback(payload, errors),
      });
      this.optimizerOutput.set(result.artifact);
      this.progressMessage.set('Optimization Complete!');
    }, 'Error during optimization.', 'Optimization failed.');
  }

  async cleanStructureOnly(htmlInput: string): Promise<void> {
    this.optimizerOutput.set('');
    this.progressMessage.set('Cleaning HTML structure locally…');
    await this.withProgress(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      // Same composition as the LLM optimize() path (see above): cleanHtmlStructure builds
      // the section.specs envelope for legacy tables, finalizeTablesForDisplay then decorates
      // it. Without this second call the Fast button never reached the store's §7 theme.
      this.optimizerOutput.set(finalizeTablesForDisplay(cleanHtmlStructure(htmlInput)));
      this.progressMessage.set('Structure Cleaned!');
    }, 'Error while cleaning.', 'Cleaning failed');
  }

  async translate(content: string, targetLang: string, useThinking = false): Promise<void> {
    // Clear any stale result and bail on blank/whitespace input — avoids a wasted paid LLM call.
    if (!content || !content.trim()) { this.translatorOutput.set(''); return; }
    this.translatorOutput.set('');
    this.progressMessage.set(`Translating to ${targetLang}…`);
    await this.withProgress(async () => {
      // Store-agnostic pure translation — NOT the generation pipeline's store-coupled Task C.
      const isMarkup = content.trim().startsWith('<');
      const result = await runRepairGate<string>({
        label: 'Translator',
        maxRepairs: 1,
        basePayload: buildTranslatePrompt(content, targetLang, 'user-facing-content'),
        produce: async payload =>
          stripCodeFences(await this.llm.generateText(payload, useThinking, { taskLabel: 'Translator', lang: targetLang })),
        validate: translated => validateTranslationIntegrity(translated, content),
        withFeedback: withTranslateFeedback,
      });

      // No figure rewrapping and no store-specific URL/contact replacement here — the Translator
      // preserves input structure verbatim and carries no store coupling.
      let artifact = result.artifact;
      if (result.finalIssues.length > 0) {
        // The one repair attempt above didn't clear the leaked-preamble check — apply the
        // deterministic heuristic strip as a last resort before giving up. See
        // translation-integrity.ts's header for why this can't just be a blind regex strip.
        const healed = stripLeakedPreamble(artifact, isMarkup);
        if (validateTranslationIntegrity(healed, content).length === 0) {
          console.warn('[Translator] shipped after heuristic preamble strip — repair gate did not resolve it', { targetLang });
          artifact = healed;
        } else {
          throw new Error('Translation failed an integrity check after repair — refusing to ship a corrupted result.');
        }
      }

      this.translatorOutput.set(artifact);
      this.progressMessage.set('Translation Complete!');
    }, 'Error during translation.', 'Translation failed.');
  }

  async rewrite(website: WebsiteOption, text: string, useThinking = false): Promise<void> {
    this.copywriterOutput.set('');
    this.progressMessage.set('Rewriting content…');
    await this.withProgress(async () => {
      const isMarkup = text.trim().startsWith('<');
      const result = await runRepairGate<string>({
        label: 'Copywriter',
        maxRepairs: 1,
        basePayload: buildCopywriterPrompt(website, text),
        produce: async payload =>
          stripCodeFences(await this.llm.generateText(payload, useThinking, { taskLabel: 'Copywriter', store: website.name })),
        validate: rewritten => validateCopywriterIntegrity(rewritten, text),
        withFeedback: withCopywriterFeedback,
      });

      let artifact = result.artifact;
      if (result.finalIssues.length > 0) {
        const healed = stripLeakedPreamble(artifact, isMarkup);
        if (validateCopywriterIntegrity(healed, text).length === 0) {
          console.warn('[Copywriter] shipped after heuristic preamble strip — repair gate did not resolve it', { store: website.name });
          artifact = healed;
        } else {
          throw new Error('Rewrite failed an integrity check after repair — refusing to ship a corrupted result.');
        }
      }

      this.copywriterOutput.set(artifact);
      this.progressMessage.set('Content Rewritten!');
    }, 'Error during rewriting.', 'Rewrite failed.');
  }

  async analyzeReadability(text: string): Promise<void> {
    this.readabilityScore.set(null);
    this.progressMessage.set('Analyzing readability…');
    await this.withProgress(async () => {
      const result = await this.llm.generateJson(buildReadabilityPrompt(text), false, { taskLabel: 'Readability' });
      // Low-stakes analysis output, not shipped customer-facing content — a deterministic
      // strip-and-warn is proportionate here; no repair-gate retry (see llm-output-integrity.ts).
      if (result && scanForLeakedPreamble(result).length > 0) {
        if (typeof result.optimizedText === 'string') result.optimizedText = stripLeakedPreamble(result.optimizedText, result.optimizedText.trim().startsWith('<'));
        if (Array.isArray(result.issues)) result.issues = result.issues.map((s: string) => stripLeakedPreamble(s));
        if (Array.isArray(result.suggestions)) result.suggestions = result.suggestions.map((s: string) => stripLeakedPreamble(s));
        console.warn('[Readability] stripped leaked preamble from one or more fields');
      }
      this.readabilityScore.set(result);
      this.progressMessage.set('Analysis Complete!');
    }, 'Error during readability analysis.', 'Analysis failed.');
  }

  /**
   * Runs deterministic acceptance-criteria checks across all generated artifacts and
   * MERGES the results into the validationIssues signal. Errors are also logged so they
   * are visible during development. Never throws — validation is advisory.
   */
  private runOutputValidation(storeName: string, productName?: string, templateId?: string, mainLocale?: string): void {
    const c = this.content();
    // The localized product name only exists from step 2 onward, which is why the name-consistency
    // checks live here and not in the master repair gate — at gate time there is nothing to
    // compare the body against.
    const localizedNames = c.slugData?.slugs?.length ? slugsToLocalizedNames(c.slugData.slugs) : undefined;
    const masterLocale = mainLocale ?? 'uk-UA';
    const issues: ValidationIssue[] = [
      ...validateGeneratedHtml(c.mainHtmlUa, mainLocale ? `HTML (${mainLocale})` : 'HTML (base)', productName, mainLocale, { templateId }),
      ...Object.entries(c.translations).flatMap(([lang, html]) => [
        ...validateGeneratedHtml(html, `HTML (${lang})`, productName, taskLangToIso(lang, storeName), { templateId }),
        ...validateStructuralParity(c.mainHtmlUa, html, `HTML (${lang})`),
        // Language-level, so every target locale gets its own band — the master gate only ever
        // sees uk-UA. de-DE's ceiling of 18 is the tightest in the table.
        ...validateSentenceLength(html, taskLangToIso(lang, storeName), `HTML (${lang})`),
        ...validateProductNameConsistency(
          html, localizedNames?.[taskLangToIso(lang, storeName)], taskLangToIso(lang, storeName), `HTML (${lang})`,
        ),
        // Heading product-name stuffing is a TRANSLATION failure as much as a generation one:
        // the master can drop the name from a heading and the translator put it back, which is
        // exactly what de-DE and pl-PL did. The Style B half of this validator is inert for
        // non-C3D stores and non-Cyrillic locales, so only the global check fires here.
        ...validateHeadingStyle(html, taskLangToIso(lang, storeName), storeName, productName),
      ]),
      // Also run in the repair gate, where they reach the downloadable .md report. Repeating
      // them here puts them in the on-screen panel too; dedupeIssues collapses the overlap.
      ...validateHeadingStyle(c.mainHtmlUa, masterLocale, storeName, productName),
      ...validateSentenceLength(c.mainHtmlUa, masterLocale, `HTML (${masterLocale})`),
      ...validateProductNameConsistency(c.mainHtmlUa, localizedNames?.[masterLocale], masterLocale, `HTML (${masterLocale})`),
      ...validateSeoMetadata(c.seoData, NO_CURRENCY_CHECK),
      ...validateSlugs(c.slugData ?? null, productName),
      ...validateProductNameH1SlugAgreement(c.seoData, c.slugData ?? null),
    ];
    // MERGE, never set. This runs LAST in the pipeline, after the signal already holds the
    // repair gate's final issues, the per-language final issues and any slug-generation
    // warning. Overwriting silently discarded all of them — which made every WARNING-severity
    // check invisible, since warnings have no effect other than being displayed. The download
    // button that would have surfaced them in the .md report is itself gated on
    // validationWarningCount() > 0, so the report became unreachable too.
    this.validationIssues.update(prev => dedupeIssues([...prev, ...issues]));
    const errors = issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      console.warn(`[output-validator] ${errors.length} acceptance-criteria error(s):`, errors);
    }
  }

  resetState() {
    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: null, faqArtifacts: {} });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
    this.bulletLeadFixTally.clear();
    this.repairReportMeta.set(null);
    this.optimizerOutput.set('');
    this.translatorOutput.set('');
    this.copywriterOutput.set('');
    this.readabilityScore.set(null);
    this.suggestedKeywords.set([]);
    this.progressMessage.set('');
    this.isGenerating.set(false);
    this.isSuggestingKeywords.set(false);
  }

  async extractContent(type: 'url' | 'pdf', data: string): Promise<string> {
    this.isGenerating.set(true);
    this.progressMessage.set(type === 'url' ? 'Fetching URL content…' : 'Analyzing PDF document…');
    try {
      if (type === 'url') {
        return await this.retrieval.fetchUrl(data);
      } else {
        return await this.llm.extractFromPdf(data);
      }
    } finally {
      this.isGenerating.set(false);
      this.progressMessage.set('');
    }
  }

  /**
   * One-time, user-reviewable normalization of Tech Specs source text into a canonical
   * "| Item | Specification |" Markdown table. NOT auto-applied — the result is written back into
   * the same editable field by the caller (SourceInputComponent.canonicalize()) so a human reviews
   * it before it ever reaches `input.specs`. Deliberately does not translate — groundingSpecs()
   * still handles uk-UA localization as a separate step.
   */
  async canonicalizeSpecs(text: string): Promise<string> {
    const result = await this.llm.generateText(
      buildSpecsCanonicalizePrompt(text),
      false, // fast model — structuring, not creative generation
      { taskLabel: 'Specs canonicalize' },
    );
    const cleaned = stripCodeFences(result).trim();
    const tableStart = cleaned.indexOf('|');
    return tableStart > 0 ? cleaned.slice(tableStart).trim() : cleaned;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async withProgress(
    task: () => Promise<void>,
    errorMsg: string,
    alertMsg = errorMsg,
  ): Promise<void> {
    this.isGenerating.set(true);
    try { await task(); }
    catch (error) {
      this.progressMessage.set(errorMsg);
      console.error(error);
      alert(alertMsg);
    } finally {
      this.isGenerating.set(false);
    }
  }

  private applySpanishExpert3dReplacements(content: string): string {
    let result = content;

    const badTag = '<a href="https://impresora-3d.es/kupiti-3d-printer/">«Наші контакти»</a>';
    const goodTag = '<a href="https://impresora-3d.es/contactos/">Contactos</a>';
    result = result.split(badTag).join(goodTag);

    const urlReplacements = [
      {
        old: [
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-form-4/',
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-form-4'
        ],
        new: 'https://impresora-3d.es/product/bomba-de-resina-formlabs-para-form-4/'
      },
      {
        old: [
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-high-volume-resin/',
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-high-volume-resin'
        ],
        new: 'https://impresora-3d.es/product/bomba-de-resina-formlabs-para-form-3/'
      },
      {
        old: [
          'https://3ddevice.com.ua/en/contacts/',
          'https://3ddevice.com.ua/contacts-ua/',
          'https://3ddevice.com.ua/ru/magazin-3d-printerov-kontakty/',
          'https://3ddevice.com.ua/en/contacts',
          'https://3ddevice.com.ua/contacts-ua',
          'https://3ddevice.com.ua/ru/magazin-3d-printerov-kontakty',
          'https://impresora-3d.es/kupiti-3d-printer/',
          'https://impresora-3d.es/pro-nas/',
          'https://impresora-3d.es/pro-nas'
        ],
        new: 'https://impresora-3d.es/contactos/'
      }
    ];

    urlReplacements.forEach(rule => {
      rule.old.forEach(url => {
        result = result.split(url).join(rule.new);
      });
    });

    // EXPERT3D ToV — deterministic calque fixes. Case-insensitive to catch sentence-initial
    // capitals; plural form of 'producción puente' maps to plural replacement.
    const calqueReplacements: Array<[RegExp, (m: string) => string]> = [
      [/de extremo a extremo/gi, (m) => {
        const r = 'de principio a fin';
        return /^[A-ZÁÉÍÓÚÑÜ]/.test(m) ? r[0].toUpperCase() + r.slice(1) : r;
      }],
      [/producci[oó]n puentes?/gi, (m) => {
        const r = /puentes$/i.test(m) ? 'producciones de transición' : 'producción de transición';
        return /^[A-ZÁÉÍÓÚÑÜ]/.test(m) ? r[0].toUpperCase() + r.slice(1) : r;
      }],
    ];
    calqueReplacements.forEach(([re, replacer]) => {
      result = result.replace(re, replacer);
    });

    return result;
  }

}
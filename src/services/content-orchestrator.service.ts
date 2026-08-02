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
import { extractVideoEmbeds, restoreMissingVideos, validateVideoCoverage, SourceVideoEmbed } from '../utils/video-manifest';
import { normalizeSeoNumbers } from '../utils/seo-number-format';
import { normalizeTerminology, canonicalizeMultiInOne } from '../utils/terminology-normalize';
import { validateGeneratedHtml, validateSeoMetadata, ValidationIssue } from '../utils/output-validator';
import {
  validateSpecsGrounding, isAlreadyCyrillic, inspectGroundedTranslation,
  describeGroundingFailure, type GroundingInspection,
} from '../utils/specs-grounding';
import { validateSpecCountParity, expectedSpecParameterLabels } from '../utils/spec-count-parity';
import { validateAltNumericFidelity } from '../utils/alt-numeric-fidelity';
import { validateSecondPersonScope } from '../utils/tov-second-person';
import { dedupeIssues } from '../utils/validation-issues';
import { validateHeadingStyle } from '../utils/heading-style';
import { validateSentenceLength } from '../utils/sentence-length';
import { cyrillizeUnits } from '../utils/unit-cyrillize';
import { validateProductNameConsistency, validateProductNameH1SlugAgreement } from '../utils/product-name-consistency';
import { validateSlugs } from '../utils/slug-validator';
import { buildPromptA } from '../prompts/task-a';
import { buildPromptADoc } from '../prompts/task-a-doc';
import { usesDocPipeline } from '../prompt-core/doc-pipeline-flag';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import { renderDescription } from '../render/render-description';
import { normalizeDocProse } from '../render/doc-prose-transforms';
import { renderContextFor } from '../prompt-core/store-render-rules';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { docSchemaIssues, assertDocRendered } from '../render/doc-schema-issues';
import { buildPromptB } from '../prompts/task-b';
import { buildPromptSlug } from '../prompts/task-slug';
import { buildSpecsCanonicalizePrompt } from '../prompts/task-specs-canonicalize';
import { normalizeSlug, ensureUniqueSlugs, slugsToLocalizedNames } from '../prompt-core/slug-utils';
import { getStore, getLangsForStore, isoToHumanLang, taskLangToIso, isExpert3dStore, buildNativeLangOverlay, buildMasterUaOverlay, bcp47ToTaskCLang, masterScriptFor, currencySymbolFor } from '../prompt-core/constants';
import { buildPromptC } from '../prompts/task-c';
import { validateStructuralParity, restoreMediaSrcs } from '../utils/structural-parity';
import { buildTranslatePrompt } from '../prompts/task-translate';
import { buildPromptFaq } from '../prompts/task-faq';
import { buildOptimizerPrompt } from '../prompts/optimizer';
import { buildReadabilityPrompt } from '../prompts/readability';
import { buildKeywordsPrompt } from '../prompts/keywords';
import { buildImageAltPrompt } from '../prompts/image-alt';
import { buildCopywriterPrompt } from '../prompts/copywriter';
import { SlugResponse, SeoResponse } from '../app/types';
import { runRepairGate, appendRepairFeedback, toArtifactReport, RepairArtifactReport, RepairReportMeta } from '../utils/repair-gate';
import { createBlockRepairExecutor } from '../utils/block-tier';
import { trimConsumablesToLimit } from '../utils/consumables-trim';
import { PromptPayload } from '../prompt-core/payload';
import { mergeSmallSpecCategories } from '../utils/spec-category-merge';
import { validateSpecCategoryShape } from '../utils/spec-category-shape';
import { finalizeTablesForDisplay } from '../utils/table-finalize';
import { validateLanguageConsistency } from '../utils/language-consistency';
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
      onResult: summary => {
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
      },
    });
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
        buildTranslatePrompt(input.specs, 'Ukrainian'),
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

  async generate(input: ProductInput, useThinking = false): Promise<void> {
    // Reuse an editor-approved slug ONLY when it was approved for THIS exact product+store
    // (from a prior standalone Slug run); otherwise start clean. This makes the approved
    // localized name authoritative across H1/title/URL without ever reusing a stale name.
    const reusedSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: reusedSlug, website: input.website, faqArtifacts: {}, mainHtmlLocale: 'uk-UA' });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
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
    const masterRepairBudget = imgManifest ? Math.max(repairBudget, 3) : repairBudget;

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
      const basePayloadA = useDocPipeline
        ? buildPromptADoc(masterInput, 'Ukrainian (uk-UA)')
        : buildPromptA(masterInput, 'Ukrainian (uk-UA)');
      // What the LAST produce call had to splice back. Read by the validate array below, which
      // runs against that same artifact, to surface automatic placement as a warning.
      let restoredVideos: SourceVideoEmbed[] = [];
      // Doc-path failures from the LAST produce call, read by the validate array below — same
      // closure-stash pattern as restoredVideos above. Without this a rejected Doc would throw out
      // of produce(), and runRepairGate does not catch (repair-gate.ts:112, :339).
      let docIssues: ValidationIssue[] = [];
      const produceHtmlA = async (payload: PromptPayload): Promise<string> => {
        // The Doc path returns HTML too — renderDescription() builds it — so the repair gate and
        // every downstream validator below keep working unchanged. That is what keeps this switch
        // contained to these few lines instead of rippling through the whole method.
        if (useDocPipeline) {
          docIssues = [];
          try {
          const raw = await this.llm.generateJson<ProductDescriptionDoc>(payload, useThinking, { taskLabel: 'Doc (base)', productName: input.name, store: input.website.name, lang: 'uk-UA' });
          // parse(), not safeParse(): an invalid Doc must reach the repair gate as a thrown error
          // rather than be rendered into plausible-looking wrong HTML.
          //
          // The return value is DISCARDED and `raw` is used instead. Without strictNullChecks —
          // which this repo does not enable — zod's inferred type comes back all-optional and does
          // not satisfy ProductDescriptionDoc. See the TSCONFIG NOTE at the foot of
          // description-doc.schema.ts; this is the same workaround, not a new one. parse() still
          // does the validating, so nothing is weakened.
          ProductDescriptionDocSchema.parse(raw);
          const doc = raw;
          // Prose normalization moves here from the HTML chain below — same transforms, same order.
          // stripCodeFences, wrapVideoFigures and wrapImageFigures have no job on this path: JSON
          // parsing replaces the first, and the renderer emits canonical figures directly.
          return renderDescription(
            normalizeDocProse(doc, 'uk-UA'),
            renderContextFor(input.website.name, input.brandFolder, input.modelFolder),
          );
          } catch (err) {
            // Convert, do not rethrow: an empty artifact plus real issues lets the gate spend a
            // repair attempt, and appendRepairFeedback then tells the model WHICH FIELD failed
            // rather than "empty-output". assertDocRendered below refuses to ship the '' if every
            // attempt fails.
            docIssues = docSchemaIssues(err, 'HTML (base)');
            return '';
          }
        }
        let html = await this.llm.generateText(payload, useThinking, { taskLabel: 'HTML (base)', productName: input.name, store: input.website.name, lang: 'uk-UA' });
        html = stripCodeFences(html);
        // BEFORE wrapVideoFigures, so a restored embed goes through exactly the same figure and
        // attribute contract as one the model emitted itself.
        const restoration = restoreMissingVideos(html, videoEmbeds, input.name, 'uk-UA');
        html = restoration.html;
        restoredVideos = restoration.restored;
        html = wrapVideoFigures(html, input.name, 'uk-UA');
        html = wrapImageFigures(html);
        html = fixNumberFormatting(html);
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
        return html;
      };
      const htmlAResult = await runRepairGate<string>({
        label: 'HTML (base)',
        maxRepairs: masterRepairBudget,
        basePayload: basePayloadA,
        produce: produceHtmlA,
        validate: html => [
          // First, so a rejected Doc reads as the cause rather than as the empty-output symptom
          // every other rule would report against ''.
          ...docIssues,
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
          ...validateHeadingStyle(html, 'uk-UA', input.website.name),
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
        // translation inherits already-repaired prose from the master.
        // Block-scoped repair slices and patches HTML. On the Doc path the HTML is a RENDERED
        // artifact, so patching it would desync it from the Doc that produced it and the next
        // regeneration would silently discard the fix. Full-regen repair (withFeedback) still
        // applies there — it reuses basePayload.systemBlocks by reference, so the retry is still
        // told to emit JSON.
        repairBlocks: useDocPipeline ? undefined : this.blockRepairer('uk-UA', 'HTML (base)', input),
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
        pipeline: useDocPipeline ? 'doc' : 'html',
        outcome: !htmlAResult.artifact.trim() ? 'failed-schema'
          : htmlAResult.repairsUsed > 0 ? 'repaired'
          : 'ok',
        repairsUsed: htmlAResult.repairsUsed,
      });

      // Every attempt failed the schema → the gate's best result is ''. Saving that would be a
      // silent data loss; fail loudly instead. Inert on the HTML path, which cannot produce ''.
      if (useDocPipeline) assertDocRendered(htmlAResult.artifact, 'HTML (base)', htmlAResult.finalIssues);
      const { artifact: htmlEn, finalIssues: htmlIssues, repairsUsed: aRepairs } = htmlAResult;
      if (aRepairs > 0) console.info(`[repair-gate] HTML (base): ${aRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('HTML (base)', htmlAResult, this.blockPatchTally.get('HTML (base)'))]);
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
          const rawSlug = await this.llm.generateJson<SlugResponse>(promptSlug, useThinking, { taskLabel: 'Slug', productName: input.name, store: input.website.name });
          const slugData = this.normalizeSlugResponse(rawSlug);
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
        produce: async (payload) => this.canonicalizeSeoData(await this.llm.generateJson(payload, useThinking, { taskLabel: 'SEO metadata', productName: input.name, store: input.website.name })),
        validate: (json) => validateSeoMetadata(json, currencySymbolFor(input.website.name)),
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
            html = normalizeTerminology(cyrillizeUnits(restoreIdentifierDots(fixDecimalSeparator(fixNumberFormatting(html), locale), locale), locale), locale);
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
              html = fixNumberFormatting(html);
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
      const basePayloadA = buildPromptA(uaInput, UA_BASE_LANGUAGE);
      // See the sibling comment in generate().
      let restoredVideos: SourceVideoEmbed[] = [];
      const produceHtmlUa = async (payload: PromptPayload): Promise<string> => {
        let html = await this.llm.generateText(payload, useThinking, { taskLabel: 'HTML (uk-UA)', productName: input.name, store: input.website.name, lang: UA_ISO });
        html = stripCodeFences(html);
        const restoration = restoreMissingVideos(html, videoEmbeds, input.name, UA_ISO);
        html = restoration.html;
        restoredVideos = restoration.restored;
        html = wrapVideoFigures(html, input.name, UA_ISO);
        html = wrapImageFigures(html);
        html = fixNumberFormatting(html);
        // Ordering rationale as in generate()'s master produce.
        html = fixDecimalSeparator(html, UA_ISO);
        // See the sibling comment in generate()'s master produce.
        html = restoreIdentifierDots(html, UA_ISO);
        html = cyrillizeUnits(html, UA_ISO);
        html = normalizeTerminology(html, UA_ISO);
        html = canonicalizeMultiInOne(html, UA_ISO);
        return html;
      };
      const htmlUaResult = await runRepairGate<string>({
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
          ...validateHeadingStyle(html, UA_ISO, input.website.name),
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
        // reported in the other.
        repairBlocks: this.blockRepairer(UA_ISO, 'HTML (uk-UA)', input),
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing description (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      const { artifact: htmlUa, finalIssues: htmlIssues, repairsUsed: aRepairs } = htmlUaResult;
      if (aRepairs > 0) console.info(`[repair-gate] HTML (uk-UA): ${aRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('HTML (uk-UA)', htmlUaResult, this.blockPatchTally.get('HTML (uk-UA)'))]);
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
        const rawSlug = await this.llm.generateJson<SlugResponse>(promptSlug, useThinking, { taskLabel: 'Slug', productName: input.name, store: input.website.name, lang: UA_ISO });
        const slugData = this.normalizeSlugResponse(rawSlug);
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
        produce: async (payload) => this.canonicalizeSeoData(await this.llm.generateJson(payload, useThinking, { taskLabel: 'SEO metadata', productName: input.name, store: input.website.name, lang: UA_ISO })),
        validate: (json) => validateSeoMetadata(json, currencySymbolFor(input.website.name)),
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
            html = fixNumberFormatting(html);
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
        produce: async (payload) => this.canonicalizeSeoData(await this.llm.generateJson(payload, useThinking, { taskLabel: 'SEO metadata', productName: input.name, store: input.website.name })),
        validate: (json) => validateSeoMetadata(json, currencySymbolFor(input.website.name)),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      const { artifact: seoJson, repairsUsed: bRepairs } = seoResult;
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.repairReport.update(r => [...r, toArtifactReport('SEO metadata', seoResult)]);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      this.validationIssues.set(validateSeoMetadata(this.content().seoData, currencySymbolFor(input.website.name)));

      this.historyService.add(input, this.content());
      this.progressMessage.set('SEO Generation Done!');
    }, 'Error during SEO generation.', 'SEO Generation failed.');
  }

  async generateSlugs(input: ProductInput, useThinking = false): Promise<void> {
    this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: null, website: input.website });
    this.validationIssues.set([]);
    this.repairReport.set([]);
    this.blockPatchTally.clear();
    this.repairReportMeta.set({ product: input.name, store: input.website.name, generatedAt: new Date().toISOString() });

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);
      this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);

      const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, input.description);
      const rawSlug = await this.llm.generateJson<SlugResponse>(promptSlug, useThinking, { taskLabel: 'Slug', productName: input.name, store: input.website.name });
      const slugData = this.normalizeSlugResponse(rawSlug);
      this.content.update(c => ({ ...c, slugData }));
      this.approvedSlugKey.set(this.slugKey(input));

      this.validationIssues.set(validateSlugs(slugData));

      this.historyService.add(input, this.content());
      this.progressMessage.set('Slug Generation Done!');
    }, 'Error during slug generation.', 'Slug Generation failed.');
  }

  private normalizeSlugResponse(raw: SlugResponse): SlugResponse {
    const slugs = (raw.slugs ?? []).map(s => ({ ...s, slug: normalizeSlug(s.slug || s.name) }));
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
  private canonicalizeSeoData(seo: SeoResponse): SeoResponse {
    return normalizeSeoNumbers({
      ...seo,
      seo_data: (seo.seo_data ?? []).map(item => ({
        ...item,
        h1: canonicalizeMultiInOne(item.h1, item.language),
        meta_title: canonicalizeMultiInOne(item.meta_title, item.language),
        meta_description: canonicalizeMultiInOne(item.meta_description, item.language),
      })),
    });
  }

  async generateKeywords(name: string, description: string): Promise<void> {
    this.isSuggestingKeywords.set(true);
    this.suggestedKeywords.set([]);
    try {
      const keywords = await this.llm.generateJson<string[]>(buildKeywordsPrompt(name, description), false, { taskLabel: 'Keywords', productName: name });
      this.suggestedKeywords.set(Array.isArray(keywords) ? keywords : []);
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
      this.optimizerOutput.set(cleanHtmlStructure(htmlInput));
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
      const prompt = buildTranslatePrompt(content, targetLang);
      let translated = await this.llm.generateText(prompt, useThinking, { taskLabel: 'Translator', lang: targetLang });
      translated = stripCodeFences(translated);
      // No figure rewrapping and no store-specific URL/contact replacement here — the Translator
      // preserves input structure verbatim and carries no store coupling.
      this.translatorOutput.set(translated);
      this.progressMessage.set('Translation Complete!');
    }, 'Error during translation.', 'Translation failed.');
  }

  async rewrite(website: WebsiteOption, text: string, useThinking = false): Promise<void> {
    this.copywriterOutput.set('');
    this.progressMessage.set('Rewriting content…');
    await this.withProgress(async () => {
      const prompt = buildCopywriterPrompt(website, text);
      let rewritten = await this.llm.generateText(prompt, useThinking, { taskLabel: 'Copywriter', store: website.name });
      rewritten = stripCodeFences(rewritten);
      this.copywriterOutput.set(rewritten);
      this.progressMessage.set('Content Rewritten!');
    }, 'Error during rewriting.', 'Rewrite failed.');
  }

  async analyzeReadability(text: string): Promise<void> {
    this.readabilityScore.set(null);
    this.progressMessage.set('Analyzing readability…');
    await this.withProgress(async () => {
      const result = await this.llm.generateJson(buildReadabilityPrompt(text), false, { taskLabel: 'Readability' });
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
      ]),
      // Also run in the repair gate, where they reach the downloadable .md report. Repeating
      // them here puts them in the on-screen panel too; dedupeIssues collapses the overlap.
      ...validateHeadingStyle(c.mainHtmlUa, masterLocale, storeName),
      ...validateSentenceLength(c.mainHtmlUa, masterLocale, `HTML (${masterLocale})`),
      ...validateProductNameConsistency(c.mainHtmlUa, localizedNames?.[masterLocale], masterLocale, `HTML (${masterLocale})`),
      ...validateSeoMetadata(c.seoData, currencySymbolFor(storeName)),
      ...validateSlugs(c.slugData ?? null),
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
import { ProductInput, ImageManifestEntry, CONTENT_TEMPLATES } from '../app/types';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { getStore, isExpert3dStore, CONSUMABLES_SIMPLIFIED_SCHEMA, EXPERT3D_TOV_BASE_OVERLAY } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

// ── Standard full-schema instruction (Schema v3.0 §1–§9) ──────────────────

const TASK_A_INSTRUCTION =
  `TASK A — GENERATE BASE-LANGUAGE HTML DESCRIPTION
OUTPUT: pure HTML body only (no JSON, no Markdown, no code fences).
Rewrite the input into an attractive, high-fact-density description: ~80% linguistic uniqueness,
100% technical fidelity. Add <hr> after each </section>. Follow [CONTENT STRUCTURE] exactly.
Before writing, reconcile any conflicting component counts or repeated figures in the input per
[SOURCE FIDELITY]; the body must never show two different counts of the same thing. Preserve the
input's story shape per [NARRATIVE FIDELITY], and keep every image's alt, figcaption and lead-in
consistent with its manifest caption per the IMAGE GROUNDING LOCK.
CRITICAL: §2 (Killer Specs table) has NO H2 heading and NO <section> wrapper — place the Killer
Specs table directly after the hook paragraph without any surrounding heading or section element.`;

// ── Consumables instruction (replaces §1–§9 entirely) ─────────────────────

const TASK_A_CONSUMABLES_INSTRUCTION =
  `TASK A — GENERATE BASE-LANGUAGE HTML DESCRIPTION (CONSUMABLES MODE)
OUTPUT: pure HTML body only (no JSON, no Markdown, no code fences).
This product is a CONSUMABLE MATERIAL (filament / resin / adhesive).
Apply the CONSUMABLES SIMPLIFIED SCHEMA below. Do NOT use Schema v3.0 §1–§9.
No Killer Specs table. No Functionality section. No CTA-TRUST block.
Hard visible-text limit: ≤ 2500 characters (strip all HTML tags before counting).

${CONSUMABLES_SIMPLIFIED_SCHEMA}`;

// ── Image-manifest helper ──────────────────────────────────────────────────

/** Screen-reader alt/figcaption inferred from the filename — the fallback SOURCE for entries
 *  whose vision analysis failed ('error') or was never run ('pending'):
 *  "high-prec-scan-0-02mm-acc.jpg" → "high prec scan 0 02mm acc". The LLM turns this raw token
 *  stream into a contextual description, but in DESCRIPTIVE MODE only (see the IMAGE GROUNDING
 *  LOCK): it may name the object the filename denotes and must not invent any comparison or
 *  causal claim the filename does not itself carry. */
function altSeedFromFilename(urlFilename: string): string {
  return urlFilename.replace(/\.[a-z0-9]+$/i, '').replace(/-+/g, ' ').trim();
}

/** A filename or caption that signals a side-by-side / before-after / metric comparison. These
 *  are exactly the images where a wrong caption becomes a factual error rather than a vague
 *  label, so the manifest tags them and the master prompt locks the surrounding prose to the
 *  contrast. Product-agnostic — matches on comparison grammar, never on a device or part name. */
function isComparisonImage(urlFilename: string, caption: string): boolean {
  return /(?:^|[-_])(vs|versus|compare|comparison|before|after|waste)(?:[-_]|$)/i.test(urlFilename)
    || /\b(vs|versus|compared|less|more|reduc)/i.test(caption);
}

function buildImageBlock(input: ProductInput, baseUrl: string): string {
  if (input.website.name === 'Expert-3DPrinter') return '[IMAGE MANIFEST]\nNone — skip all <img>.';
  // EVERY uploaded image ships. A vision-analysis failure ('error') or a skipped analysis
  // ('pending') only degrades the alt/figcaption SOURCE to the filename — it never drops the
  // image. The old `status === 'done'` filter is what silently shipped 9/14 images when
  // analyzeImage() calls failed (M1 Ultra SafetyPro regression, 2026-07-15).
  const entries: ImageManifestEntry[] = (input.imageManifest ?? [])
    .slice().sort((a, b) => a.order - b.order);
  if (entries.length === 0) return '[IMAGE MANIFEST]\nNone provided — do not emit <img> tags.';
  const brand = input.brandFolder ? input.brandFolder + '/' : '';
  const model = input.modelFolder ? input.modelFolder + '/' : '';
  const lines = entries.map((e, i) => {
    const caption = e.altText?.trim() || e.visionDescription?.trim() || altSeedFromFilename(e.urlFilename);
    const inferred = !e.altText?.trim() && !e.visionDescription?.trim();
    // Flag precedence: an inferred (filename-only) seed is the weakest signal, so its
    // descriptive-mode restriction wins even when the filename also looks comparative — the
    // model has no verified contrast to preserve. A vision-backed comparison caption gets the
    // COMPARISON tag so the surrounding prose keeps the contrast and its direction.
    const flag = inferred
      ? ' (FILENAME-INFERRED — descriptive mode: name only the object; no comparative or causal claim)'
      : (isComparisonImage(e.urlFilename, caption)
        ? ' (COMPARISON — caption states a contrast; alt, figcaption and lead-in must preserve WHAT differs and its direction, and add nothing beyond it)'
        : '');
    return `${i + 1}. ${e.urlFilename} — caption: "${caption}"${flag}`;
  }).join('\n');
  const example = baseUrl ? `${baseUrl}${brand}${model}${entries[0].urlFilename}` : '';
  return `[IMAGE MANIFEST] — COUNT=${entries.length}. HARD RULE: the output contains exactly ${entries.length} <img> tags — every file below appears exactly once, filename copied VERBATIM (never invent, rename, merge, or drop a file); anchor each image to the paragraph that discusses its subject, following listed order unless [NARRATIVE FIDELITY] places the subject elsewhere (see PLACEMENT rules in [IMAGE HANDLING]). Each "caption" is the SOURCE OF TRUTH for that image per the IMAGE GROUNDING LOCK:
${lines}
[URL] base=${baseUrl} brandFolder=${input.brandFolder || '(none)'} modelFolder=${input.modelFolder || '(none)'}
Build src as {base}{brandFolder}/{modelFolder}/{filename}. ${example ? 'Example: ' + example : ''}`;
}

// ── Main prompt builder ────────────────────────────────────────────────────

export function buildPromptA(input: ProductInput, baseLanguageOverride?: string): PromptPayload {
  const store = getStore(input.website.name);
  const isUs = store.group === 'US';
  const isExpert3d = isExpert3dStore(input.website.name);
  const baseLanguage = baseLanguageOverride ?? (isUs ? 'American English (en-US)' : 'European English (en-GB)');
  const isConsumables = input.templateId === 'consumables-resin';

  // Template hint is skipped for consumables — the simplified schema is self-contained
  // and the heading/focus fields from CONTENT_TEMPLATES are irrelevant in consumables mode.
  let template = '';
  if (!isConsumables && (input.templateId || input.customTemplate)) {
    const t = CONTENT_TEMPLATES.find(x => x.id === input.templateId);
    const s = { ...(t?.structure ?? {}), ...(input.customTemplate ?? {}) };
    template = `\n[TEMPLATE] title=${s.titlePattern ?? ''}; headings=${s.headingStructure?.join(' → ') ?? ''}; focus=${s.bodyFocus ?? ''}; keywords=${s.keywordStrategy ?? ''}`;
  }

  const custom = input.customInstructions?.trim()
    ? `\n[USER INSTRUCTIONS]\n${input.customInstructions.trim()}`
    : '';

  // Reinforcement in the user turn so the model can't miss the mode switch.
  const consumablesMode = isConsumables
    ? '\n[CONSUMABLES MODE ACTIVE] Apply §C1–§C6 only. Hard limit ≤ 2500 stripped chars.'
    : '';

  const userContent =
    `[INPUT DATA]
[Store Name]: ${input.website.name}
[Base Language]: ${baseLanguage}
[Product Name]: ${input.name}
[Raw Description]: ${input.description}
[Technical Specs]: ${input.specs}
[Supplemental Content]: ${input.supplementalContent || 'None provided.'}
${buildImageBlock(input, store.imageBaseUrl)}${template}${custom}${consumablesMode}

Generate the description in ${baseLanguage}. Primary keyword "${input.name}" used ~1–2× per section.`;

  return {
    systemBlocks: [
      { text: MASTER_SYSTEM_PROMPT, cache: true },
      // Cache key differs per schema type — correct behaviour, two independent cache slots.
      { text: isConsumables ? TASK_A_CONSUMABLES_INSTRUCTION : TASK_A_INSTRUCTION, cache: true },
      // EXPERT3D-only ToV voice block. Appended as a cached suffix so the shared
      // master+task prefix stays byte-stable (cache hit) for all other stores.
      ...(isExpert3d ? [{ text: EXPERT3D_TOV_BASE_OVERLAY, cache: true }] : []),
    ],
    userContent,
  };
}
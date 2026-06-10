import { ProductInput, ImageManifestEntry, CONTENT_TEMPLATES } from '../app/types';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { getStore } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

const TASK_A_INSTRUCTION = `TASK A — GENERATE BASE-LANGUAGE HTML DESCRIPTION
OUTPUT: pure HTML body only (no JSON, no Markdown, no code fences).
Rewrite the input into an attractive, high-fact-density description: ~80% linguistic uniqueness,
100% technical fidelity. Add <hr> after each </section>. Follow [CONTENT STRUCTURE] exactly.`;

function buildImageBlock(input: ProductInput, baseUrl: string): string {
  if (input.website.name === 'Expert-3DPrinter') return '[IMAGE MANIFEST]\nNone — skip all <img>.';
  const done: ImageManifestEntry[] = (input.imageManifest ?? [])
    .filter(e => e.status === 'done').sort((a, b) => a.order - b.order);
  if (done.length === 0) return '[IMAGE MANIFEST]\nNone provided — do not emit <img> tags.';
  const brand = input.brandFolder ? input.brandFolder + '/' : '';
  const model = input.modelFolder ? input.modelFolder + '/' : '';
  const lines = done.map((e, i) => `${i + 1}. ${e.urlFilename} — "${e.altText || e.visionDescription}"`).join('\n');
  const example = baseUrl ? `${baseUrl}${brand}${model}${done[0].urlFilename}` : '';
  return `[IMAGE MANIFEST] — use ALL ${done.length}; each exactly once; sequential order:
${lines}
[URL] base=${baseUrl} brandFolder=${input.brandFolder || '(none)'} modelFolder=${input.modelFolder || '(none)'}
Build src as {base}{brandFolder}/{modelFolder}/{filename}. ${example ? 'Example: ' + example : ''}`;
}

export function buildPromptA(input: ProductInput): PromptPayload {
  const store = getStore(input.website.name);
  const isUs = store.group === 'US';
  const baseLanguage = isUs ? 'American English (en-US)' : 'European English (en-GB)';

  let template = '';
  if (input.templateId || input.customTemplate) {
    const t = CONTENT_TEMPLATES.find(x => x.id === input.templateId);
    const s = { ...(t?.structure ?? {}), ...(input.customTemplate ?? {}) };
    template = `\n[TEMPLATE] title=${s.titlePattern ?? ''}; headings=${s.headingStructure?.join(' → ') ?? ''}; focus=${s.bodyFocus ?? ''}; keywords=${s.keywordStrategy ?? ''}`;
  }
  const custom = input.customInstructions?.trim() ? `\n[USER INSTRUCTIONS]\n${input.customInstructions.trim()}` : '';

  const userContent = `[INPUT DATA]
[Store Name]: ${input.website.name}
[Base Language]: ${baseLanguage}
[Product Name]: ${input.name}
[Raw Description]: ${input.description}
[Technical Specs]: ${input.specs}
[Supplemental Content]: ${input.supplementalContent || 'None provided.'}
${buildImageBlock(input, store.imageBaseUrl)}${template}${custom}

Generate the description in ${baseLanguage}. Primary keyword "${input.name}" used ~1–2× per section.`;

  return {
    systemBlocks: [
      { text: MASTER_SYSTEM_PROMPT, cache: true },
      { text: TASK_A_INSTRUCTION,   cache: true },
    ],
    userContent,
  };
}

import { ProductInput, ImageManifestEntry, CONTENT_TEMPLATES } from '../app/types';
import { SYSTEM_INSTRUCTION } from './system-instruction';

const IMAGE_BASE_URLS: Record<string, string> = {
  'EXPERT3D': 'https://impresora-3d.es/image/catalog/products/',
  'Impresora-3D': 'https://impresora-3d.es/image/catalog/products/',
  '3DDevice': 'https://3ddevice.com.ua/image/catalog/products/',
  '3DPrinter': 'https://3dprinter.com.ua/image/catalog/products/',
  '3DScanner': 'https://3dscanner.com.ua/image/catalog/Products/',
  'Center 3D Print': 'https://center3dprint.com/image/catalog/Products/',
};

const US_MEASUREMENT_RULES = `[MEASUREMENT SYSTEM — MIXED US STANDARD]
Apply these specific unit conversions (standard for the US 3D printing industry):

CONVERT to Imperial:
- Printer Dimensions → inches (e.g., 18.5" x 18.5" x 20")
- Build Volume (Print Area) → inches
- Printer Weight → lbs
- Filament Spool Weight → lbs (or oz for small samples)

KEEP in Metric (DO NOT CONVERT):
- Layer Thickness → microns (μm)
- Filament Diameter → mm (e.g., 1.75 mm)
- Nozzle Diameter → mm
- Temperature → °C (do not convert to Fahrenheit)
- Print Speed → mm/s
- Resin Volume → L or ml`;

const EXPERT3D_BRANDS = ['Raise3D', 'Formlabs', 'xTool', 'Shining3D', 'XGRIDS', 'PUDU', 'Metal3D'];
const OTHER_BRANDS = [
  'KLEMA', 'Formlabs', 'CreatBot', 'Raise3D', 'UltiMaker', 'MakerBot', 'Markforged',
  'Omni 3D', 'Shining3D', 'Peel 3D', 'Creaform', 'Revopoint', 'Scantech', 'Surphaser',
  'Thunk3D', 'E-PLUS 3D', 'Fastform', 'xTool', 'Magigoo', 'Aesub', 'Bambu Lab', 'PUDU', 'Metal3D'
];

function getOfficialBrand(productName: string, storeName: string): string {
  const brands = ['EXPERT3D', 'Impresora-3D'].includes(storeName) ? EXPERT3D_BRANDS : OTHER_BRANDS;
  return brands.find(b => productName.toLowerCase().includes(b.toLowerCase())) ?? '';
}

function buildImageHandlingBlock(input: ProductInput, imageBaseUrl: string): string {
  const isExpertUS = input.website.name === 'Expert-3DPrinter';
  if (isExpertUS) {
    return `[IMAGE HANDLING]
- Expert-3DPrinter store: skip all <img> generation entirely. Do not emit any <img> tags.`;
  }

  const lazyRule = `- Lazy loading rule (strict):
    First image:  <img src="URL" alt="…" style="max-width: 100%; height: auto; display: block; margin: 15px 0;" />
    Other images: <img src="URL" alt="…" style="max-width: 100%; height: auto; display: block; margin: 15px 0;" loading="lazy" />
- Placement: every <img> must be preceded by a <p> lead-in. No orphan images. No two adjacent <img>.`;

  const doneEntries: ImageManifestEntry[] = (input.imageManifest ?? [])
    .filter(e => e.status === 'done')
    .sort((a, b) => a.order - b.order);

  if (doneEntries.length > 0) {
    const brandPath = input.brandFolder ? `${input.brandFolder}/` : '';
    const modelPath = input.modelFolder ? `${input.modelFolder}/` : '';
    const manifestLines = doneEntries
      .map((e, i) => `${i + 1}. ${e.urlFilename} — "${e.altText || e.visionDescription}"`)
      .join('\n');
    const exampleUrl = imageBaseUrl
      ? `${imageBaseUrl}${brandPath}${modelPath}${doneEntries[0].urlFilename}`
      : '';

    return `[IMAGE HANDLING — MANDATORY ⛔]
- IGNORE all <img> tags in [Raw Description]. Never reuse original image URLs.

[Image Manifest] — YOU MUST USE ALL ${doneEntries.length} IMAGES. Every image below must appear exactly once in the output. Skipping any image is a critical error.
${manifestLines}

[URL CONSTRUCTION]
[Brand Folder]: ${input.brandFolder || '(none)'}
[Model Folder]: ${input.modelFolder || '(none)'}
Build each src as: {Base URL}{brandFolder}/{modelFolder}/{urlFilename} — no double slashes.
${imageBaseUrl ? `Base URL for ${input.website.name}: ${imageBaseUrl}` : ''}
${exampleUrl ? `Example of correct URL: ${exampleUrl}` : ''}

[ALT TEXT GENERATION — SEO & A11y]
The alt attribute is pre-filled from vision analysis (shown after "—" in the manifest above).
- Use it as-is, or refine it to be more specific about the product name.
- Format: describe what is visually shown (e.g., "Blue laser IR scanning mode interface of [Product Name]").
- NEVER keyword-stuff. The alt text must describe image content for screen readers and AI crawlers.
- If the vision description is empty, infer alt text from the filename (e.g., "high-prec-scan-0-02mm-acc.jpg" → "Demonstration of 0.02 mm high-precision scanning accuracy on [Product Name]").

[PLACEMENT — STRICT RULES ⛔]
Distribute all ${doneEntries.length} images sequentially to match the logical flow of the description:
1. MANDATORY LEAD-IN: Every <img> MUST be immediately preceded by a <p> paragraph that introduces or references the image (e.g., "The image below illustrates…", "As seen in this demonstration…").
2. NO ORPHAN IMAGES: Never insert an <img> without a leading <p> directly above it.
3. NO CONSECUTIVE IMAGES: Never place two or more <img> tags next to each other. Meaningful text (paragraph, list, or header) MUST separate every image.
4. SEQUENTIAL ORDER: Follow the manifest order — image #1 goes first, image #2 second, etc.

${lazyRule}`;
  }

  // No manifest — fallback (unchanged behaviour)
  return `[IMAGE HANDLING]
- IGNORE all <img> tags in [Raw Description]. Never reuse original image URLs.
- Generate <img> tags ONLY if [Image Base URL] is non-empty and exact filenames are
  identifiable from the input or context.
${lazyRule}`;
}

/**
 * Builds Task A prompt — generates base-language HTML product description.
 *
 * CRITICAL: This prompt must NOT produce schema.org/Product in the body.
 * The CMS outputs JSON-LD Product at page level; a second Product entity = GSC error.
 */
export function buildPromptA(input: ProductInput): string {
  const storeName = input.website.name;
  const isUsSite = input.website.group === 'US';
  const baseLanguage = isUsSite ? 'American English (en-US)' : 'European English (en-GB)';
  const imageBaseUrl = IMAGE_BASE_URLS[storeName] ?? '';
  const officialBrand = getOfficialBrand(input.name, storeName);

  const systemInstruction = SYSTEM_INSTRUCTION.replace('{{STORE_NAME}}', storeName);

  let templateContext = '';
  if (input.templateId || input.customTemplate) {
    const template = CONTENT_TEMPLATES.find(t => t.id === input.templateId);
    const structure = { ...(template?.structure ?? {}), ...(input.customTemplate ?? {}) };
    templateContext = `
[CONTENT TEMPLATE INSTRUCTIONS]
- Title Pattern: ${structure.titlePattern ?? ''}
- Heading Structure: ${structure.headingStructure?.join(' → ') ?? ''}
- Body Focus: ${structure.bodyFocus ?? ''}
- Keyword Strategy: ${structure.keywordStrategy ?? ''}`;
  }

  const customInstructionsBlock = input.customInstructions?.trim()
    ? `\n[USER-PROVIDED INSTRUCTIONS]\n${input.customInstructions.trim()}\n`
    : '';

  const brandGuarantee = officialBrand
    ? `As an official representative of ${officialBrand}, we guarantee the best price, authorized service, and official warranty.`
    : '';

  return `${systemInstruction}

TASK A — GENERATE BASE-LANGUAGE HTML DESCRIPTION
OUTPUT: Pure HTML body only. No JSON, no Markdown, no code fences, no SEO metadata.

[INPUT DATA]
[Product Name]: ${input.name}
[Raw Description]: ${input.description}
[Technical Specs]: ${input.specs}
[Supplemental Content]: ${input.supplementalContent || 'None provided.'}
[Store Name]: ${storeName}
[Base Language]: ${baseLanguage}
${imageBaseUrl ? `[Image Base URL]: ${imageBaseUrl}` : ''}
${customInstructionsBlock}${templateContext}

[TASK]
Rewrite the provided description into an attractive, human-like, high-converting,
high-fact-density product description. Uniqueness target: ~80% linguistic difference
from the input, but 100% technical fidelity.

[MICRODATA ARCHITECTURE — CRITICAL ⛔]
The store CMS already outputs a complete JSON-LD Product block at page level.
The description body MUST NOT contain a second Product entity.
- DO NOT include <div itemscope itemtype="https://schema.org/Product">.
- DO NOT include any element with itemtype="https://schema.org/Product".
- DO NOT include <span itemprop="name">, itemprop="category", or itemprop="description">.
- The hook paragraph is plain HTML with absolutely no microdata attributes.
Allowed schema in the body: PropertyValue (spec rows), FAQPage, HowTo.

${isUsSite ? US_MEASUREMENT_RULES : '[MEASUREMENT] Use standard Metric units (mm, kg, °C).'}

[STYLE & GEO GUIDELINES]
- Featured-snippet opening: first sentence is a "What is / Best for" statement.
  Ban fluff openers ("In the modern world…"). Start with facts.
- Expert perspective: explain WHY specs matter.
- Semantic chunking: benefit-driven H2/H3 headers that reflect user search intent.
- Lists: use <ul><li> ONLY for key features, capabilities, or "What's in the box".
  All technical parameters go into tables.
- Rhythm & burstiness: mix short punchy sentences with longer descriptive ones.
- LSI keywords: use industry terminology ("Z-axis stability", "thermal runaway protection").
- Prohibited clichés unless strictly factual: "ideal solution", "cutting-edge", "perfect choice".
- NO AUDIENCE ATTRIBUTION ⛔: do NOT state or imply who the product is "for" (e.g. "for beginners",
  "for professionals", "for enthusiasts") unless the source input explicitly names a target audience.
  Describe what the product does and how it does it — let the reader self-qualify.

[CONTENT STRUCTURE]
1. HOOK PARAGRAPH (40–75 words, plain HTML — no microdata, no wrapper div):
   "[Product Name] is a [Category] [designed for / built for / that enables] [Application or Use-Case],
   featuring [Key Specs]."
   [Application] = a concrete use-case or workflow (e.g. "large-format FDM printing", "multi-material
   production runs"), NOT a user type. Do not write "for beginners", "for professionals", etc. unless
   the source input explicitly states a target audience.

2. QUICK SPECS TABLE (3–4 killer specs):
   <div class="table-responsive"><table class="table table-striped table-hover table-bordered">

3. EXPERT DEEP DIVE & PROFESSIONAL VERDICT:
   Rephrase the description. Use <h3> for logical clusters, <ul> for feature lists.
   EEAT block:
   <div class="expert-insight" style="background: #f9f9f9; padding: 15px; border-left: 4px solid #333; margin: 20px 0;">
     <strong>Expert Verdict:</strong> [Professional analysis — 2–3 sentences]
   </div>

3b. EXPERT TECH-TIP (EEAT) — MANDATORY ⛔:
   In addition to the Expert Verdict above, emit exactly ONE separate <blockquote> containing a
   concrete, practical tip about using or maintaining this product (e.g. filament handling,
   retraction settings, calibration, nozzle care). This is a distinct element from the Expert Verdict
   div — do NOT merge the two. Base the tip on real product facts from the input; never invent specs.
   Format:
   <blockquote style="border-left: 4px solid #555; padding: 10px 20px; margin: 20px 0; background: #f5f5f5;">
     <strong>Tech Tip:</strong> [Actionable professional advice grounded in the product's specs]
   </blockquote>

4. TECHNICAL SPECIFICATIONS (strict table format):
   Wrapper: <section class="specs">
   Header: <h2>Technical specifications of the ${input.name}</h2>
   - <h3> per specification category; every category has its own table.
   - Wrap each table in <div class="table-responsive">.
   - Table classes: table table-striped table-hover table-bordered.
   - Every row carries microdata + A11y:
     <tr itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">
       <th scope="row" itemprop="name">Property Name</th>
       <td itemprop="value">Value with Units</td>
     </tr>
   - First column is always <th scope="row">.
   - COMPLETENESS IS MANDATORY ⛔: reproduce EVERY specification row present in [Technical Specs].
     Before writing the tables, silently count how many distinct categories and how many total
     rows the input contains, then emit exactly that many. Do NOT summarize, merge, or drop rows
     to keep the section short. A spec table that contains fewer rows than the input is a critical failure.
   - Process the input top to bottom; if a category has 11 rows in the source (e.g. a cutting module),
     the matching output table has 11 rows. Common categories that must NOT be skipped when present:
     Cooling, Supported Filament Type, Electrical Requirements, Environment, Electronics, Software,
     Network Control, Wi-Fi, and any optional add-on module (e.g. Cutting Module).
   - DO NOT CHANGE: keep numerical values and units exactly as in the source.
   - DIMENSION SEPARATOR ⛔: always use the multiplication sign × (U+00D7) between dimension values,
     never an asterisk * or the letter x. Apply this consistently in both spec table cells and
     running text: "330 × 320 × 325 mm", not "330*320*325 mm" or "330x320x325 mm".

5. PACKAGE CONTENTS:
   <h2>What's in the box</h2> followed by a <ul> list (only if package contents are in the input).

6. SUPPLEMENTAL CONTENT (FAQ / HowTo) — include ONLY if present in [Supplemental Content]:
   - FAQ (when input has Q/A pairs):
     YOU MUST REPRODUCE EVERY question/answer pair found in [Supplemental Content] ⛔.
     If the input lists 10 questions, output exactly 10 <div itemprop="mainEntity"> blocks.
     Do NOT select a "best few" or summarize the set — each source question becomes one FAQ entry.
     You may rephrase the question wording for clarity, but never drop a question.
     <section itemscope itemtype="https://schema.org/FAQPage">
       <div itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
         <h3 itemprop="name">Question</h3>
         <div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
           <p itemprop="text">Answer</p>
         </div>
       </div>
     </section>
   - HowTo (when input has numbered procedure):
     <section itemscope itemtype="https://schema.org/HowTo">
       <h2 itemprop="name">How to [Task]</h2>
       <p itemprop="description">Brief description.</p>
       <div itemprop="step" itemscope itemtype="https://schema.org/HowToStep">
         <h3 itemprop="name">Step title</h3>
         <p itemprop="text">Step description.</p>
       </div>
     </section>
   Do NOT fabricate steps — only use content present in the input.

7. TRUST SECTION & BRAND GUARANTEE:
   <h2>Why choose ${storeName}?</h2>, body wrapped in <p class="cta">.
   - Mention expert experience since 2012.${brandGuarantee ? `\n   - Include this exact sentence: "${brandGuarantee}"` : ''}

[VIDEO HANDLING]
TYPE A — iframe embeds (YouTube/Vimeo): preserve exactly, place in Deep Dive section.
TYPE B — direct MP4/CDN/OGV URL:
  <div style="text-align:center;">
    <video width="100%" height="auto" controls style="max-width: 800px; border: 1px solid #ccc; border-radius: 8px;">
      <source src="[VIDEO_URL]" type="video/[FORMAT]">
      [Fallback text in ${baseLanguage}]
    </video>
  </div>
  Detect format by extension. Precede every embed with a lead-in <p>.

${buildImageHandlingBlock(input, imageBaseUrl)}

[SEO]
- Primary keyword: "${input.name}", used naturally ~1–2 times per section.
- H2 headers are benefit-driven and reflect user search intent.

[FORMAT]
Add <hr> after each closing </section>. Output the HTML body only.
Generate the text in ${baseLanguage}.`;
}
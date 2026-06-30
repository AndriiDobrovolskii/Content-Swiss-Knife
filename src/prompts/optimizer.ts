export function buildOptimizerPrompt(htmlInput: string, productName = ''): string {
  const contextInstruction = productName ? ` + "${productName}"` : '';
  return `🛠️ Role
You are an Advanced HTML Parser & SEO Optimizer. Refactor dirty HTML into clean, semantic, high-performance HTML5.

⚡️ Execution Pipeline (follow strictly)
PHASE 1 — Structural Cleanup
1. Remove <noscript> tags and content.
2. Unwrap <div class="wpb-content-wrapper">…</div> — keep inner HTML.
3. Smart Image Extraction:
   - <a href…><img …></a> → keep only <img …>.
   - <picture>…<img …>…</picture> → keep only <img …>.
   - WordPress captions → extract <img> + <p>Caption text</p>.
4. Heading Hygiene: remove <strong>, <b>, <span> inside <h2>/<h3>/<h4> but keep text.
5. Tag Replacement:
   - <pre>…</pre> → <small>…</small>
   - <p><br /></p> → <br>
   - <b>…</b> → <strong>…</strong>

PHASE 2 — Image Optimization
For every <img>:
- If data-src present: move to src, remove data-src.
- REMOVE: class, style, loading, decoding, srcset, sizes, border.
- KEEP: width, height, alt, title. Never invent dimensions.
- Alt text: if missing/empty, generate 4–8 words based on context${contextInstruction}.
- Title attribute: REMOVE entirely.

PHASE 3 — Semantic Highlighting
- Bold High-Value Technical Specs only (44.2 MPa, 70 °C, 1.93 GPa).
- Do NOT bold standard volumes/weights, ABS/PLA/PETG acronyms in paragraphs.
- Max 1 highlight per paragraph.
- In lists: <li><strong>Nozzle:</strong> 0.4 mm</li>.

⛔ Output Restrictions
- NEVER output Python code, scripts, or explanations.
- Raw HTML Only — no markdown code blocks.
- Do not close <div> tags not opened in the input.

📥 Input HTML:
${htmlInput}`;
}

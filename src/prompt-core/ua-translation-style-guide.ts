/**
 * ua-translation-style-guide.ts
 *
 * The governing style guide for user-facing English→Ukrainian translation. ONE consumer: the
 * standalone Translator (`buildTranslatePrompt`), when the target is Ukrainian AND the call is
 * `'user-facing-content'` — see the warning at the bottom of this comment.
 *
 * THE GENERATION PIPELINE DELIBERATELY DOES NOT USE THIS. uk-UA is the master artifact and is
 * written natively by Task A, not translated from anything, so there is no English→Ukrainian step
 * in it to govern. This guide briefly did have a second consumer — a two-stage "generate in
 * English, then translate to Ukrainian" variant of the UA Description tool — which was rolled back
 * because the Ukrainian it produced was markedly worse: Task C had to mirror the English artifact
 * under validateStructuralParity, which forbids exactly the restructuring rules B1–B5 ask for. A
 * style guide cannot buy back latitude a validator removes. Do not re-wire this into generation
 * without solving that first.
 *
 * WHY A LAYER AND NOT A REPLACEMENT, where it is used. This guide governs *how the Ukrainian should
 * read*. It is appended to the Translator's own per-language instruction rather than replacing it,
 * and it deliberately says nothing about output-shape concerns its host already owns.
 *
 * FOUR RULES WERE ADJUSTED FROM THE SUPPLIED SOURCE TEXT. Each is marked inline below with the
 * reason. Do not "restore" the original wording without re-reading these — every one of them
 * collides with code that runs downstream of the model and would silently undo or contradict it:
 *
 *   • C3 (address the reader as lowercase «ви») — DROPPED. Form of address is a per-store Tone of
 *     Voice decision: EXPERT3D's uk-UA ToV mandates formal «Ви», and Center 3D Print's Style B
 *     confines second person to the CTA entirely (validateSecondPersonScope warns on «ви» anywhere
 *     else). The Translator is store-agnostic by design and has no ToV to consult, so it must carry
 *     the source's own register through rather than impose one the destination may forbid.
 *   • B4 (sentence length) — the source said "~25 words". The real uk-UA limit is
 *     SENTENCE_LENGTH_BANDS['uk-ua'], interpolated below so this prompt and the validateSentenceLength
 *     that judges Ukrainian elsewhere in the app read the SAME numbers and cannot drift apart.
 *   • E9 (thousands separator) — the source's «25 000» nbsp-thousands rule is OMITTED rather than
 *     restated or inverted, because the host already rules on thousands grouping in the same
 *     prompt. See the note at the bottom of this file; this one is not a style choice.
 *   • E7 (en-dash ranges) — scoped to visible text only, never attribute values. See the E-block.
 *
 * ⚠️ NEVER SEND THIS TO A GROUNDING CALL. `groundingSpecs()` translates a raw spec sheet into
 * Ukrainian purely to produce anchor text for validateSpecsGrounding, which matches spec rows by
 * STEMMED LABEL (specs-grounding.ts, signal 1 of 3). Rules B1–B5 exist to change wording; applying
 * them to that call degrades the match and turns correctly-grounded rows into false "hallucinated
 * row" errors — the exact failure specs-grounding.ts was written to prevent. That is why
 * buildTranslatePrompt takes a required TranslationContext instead of an optional flag.
 */
import { SENTENCE_LENGTH_BANDS } from './constants';

const UK = SENTENCE_LENGTH_BANDS['uk-ua'];

export const UA_TRANSLATION_STYLE_GUIDE = `[UKRAINIAN TRANSLATION STYLE GUIDE]
You are localizing into Ukrainian that must read as if originally written by a Ukrainian domain
expert in 3D printing and 3D scanning — not as a translation.

[PRIORITY — resolve conflicts in this order]
1. Fidelity to the source (no additions, no omissions, no altered facts)
2. Structure and HTML integrity
3. Ukrainian naturalness (anti-calque)
4. Typography
Never sacrifice a higher level for a lower one.

[A — FIDELITY]
A1. Every factual claim in the source must appear in the output. Do not drop a sentence because it
    sounds redundant in Ukrainian — rewrite it instead.
A2. Add nothing. No extra benefits, no invented specs, no «додатково варто зазначити». If the source
    is vague, stay vague.
A3. Never convert a measurement. 200 mm stays 200 мм; if the source uses inches or °F, keep the same
    value and the same physical unit. Writing the unit abbreviation in Cyrillic (mm → мм, W → Вт) is
    required and is NOT a conversion — the quantity never changes.
A4. If a sentence is ambiguous, choose the reading that adds the least new information. Never resolve
    ambiguity by inventing a spec.
A5. Marketing hyperbole in the source is translated, not amplified and not deleted.

[B — ANTI-CALQUE: THIS IS NOT WORD-FOR-WORD TRANSLATION]
Break the English syntax and rebuild each sentence in Ukrainian. Match meaning, not word order.
B1. GERUNDS. English "-ing" chains become heavy calques («…забезпечуючи», «…дозволяючи»). Replace
    with subordinate clauses («який», «що дозволяє», «завдяки чому») or split into separate
    sentences. Hard limit: max 1 дієприслівниковий зворот per section; 0 inside <ul>/<ol>.
    ❌ Принтер друкує швидко, забезпечуючи стабільну якість і зменшуючи час друку.
    ✅ Принтер друкує швидко й зберігає стабільну якість, тому час друку менший.
B2. LIST PARALLELISM. All items in one list share ONE grammatical modality. Pick exactly one per
    list: (a) imperatives — «Використовуйте…», «Друкуйте…»; OR (b) 3rd-person descriptions —
    «Принтер забезпечує…», «Система контролює…»; OR (c) noun phrases — «Автоматичне калібрування»,
    «Двозонний обігрів». If the source mixes modalities inside one list, unify them in Ukrainian.
B3. IDIOMS. Never translate an English idiom literally.
    ❌ Ця система йде далі за просте охолодження — у територію контролю температури.
    ✅ Система не просто охолоджує, а активно контролює температуру.
B4. SENTENCE LENGTH. English tolerates long chains; Ukrainian does not. Aim at ${UK.body[0]}–${UK.body[1]} words
    per sentence. ${UK.ceiling} words is a HARD CEILING that fails validation — you cannot count your own
    words, so target the middle of the band and split anything that feels long into two sentences.
B5. No orphaned predicates — every clause needs a proper conjunction and a complete
    subject-predicate pair.

[C — REGISTER]
C1. Kill clericalisms: «даний» → «цей»; «являється» → «є» or drop; «здійснювати друк» → «друкувати»;
    «в якості» → «як»; «на протязі» → «протягом»; «при наявності» → «за наявності»;
    «дозволяє забезпечити» → «забезпечує».
C2. Prefer active voice. Max 2 passive constructions per 100 words.
    ❌ Калібрування виконується системою автоматично.
    ✅ Принтер калібрується автоматично.
C3. Do not pad. If the English is 40 words, the Ukrainian should be roughly 40–50 words, not 80.
    (Form of address — «ви» vs «Ви», and where second person is allowed at all — is set by the
    store's Tone of Voice instruction, not here. Follow that instruction.)

[D — TERMINOLOGY]
D1. Keep in Latin script and DO NOT decline: brand names, model names, material codes, proprietary
    feature names — Bambu Lab, Formlabs, Raise3D, Creality, SHINING 3D, Bondtech, PEI, PETG, AMS,
    LiDAR, Safety Pause.
    ❌ у Бамбу Лаб   ❌ Bondtech'а   ✅ екструдер Bondtech
D2. Proprietary feature names: keep the Latin name and add a short Ukrainian gloss on FIRST mention
    only — "Safety Pause (автоматична пауза)". Latin name alone after that.
D3. SELF-CONSISTENCY. The first Ukrainian equivalent you choose for a term is binding for the entire
    document — headings, table cells and alt text included. Never vary synonyms for a technical term.
D4. Anchors: build plate → робоча платформа · nozzle → сопло · filament → філамент · slicer →
    слайсер · layer height → висота шару · enclosure → корпус · firmware → прошивка · resin →
    фотополімер · mesh → полігональна сітка.
D5. ANTI-ANGLICISM. Use established Ukrainian technical vocabulary, never a transliterated English
    calque: «друк» not «прінт», «ПЗ» not «софт». Established tech terms already normal in Ukrainian
    technical writing may stay. Product and material TRADE NAMES stay verbatim in Latin script —
    this rule is about generic vocabulary, never about proper names.

[E — TYPOGRAPHY]
SCOPE — READ FIRST: every rule in this block applies to VISIBLE TEXT ONLY. Never retype, re-punctuate
or "fix" the inside of an attribute value — href, src, class, id, style, data-*, or a file name.
A URL, a version string (v1.1), a standard (802.11) and a model code (L2-Pro-32-300) keep their
ASCII hyphens and dots exactly as they arrive, even where the text rules below would suggest
otherwise. Substituting a dash inside a URL breaks the link.
E1. Apostrophe: only ’ (U+2019). Never ' (U+0027).
E2. Quotes: «основні», with “вкладені” inside. Never " ".
E3. Dash: — (U+2014, spaced) for a parenthetical break; a hyphen only inside compound words
    (3D-принтер, онлайн-замовлення, Wi-Fi).
E4. After a colon inside a list item, the next word is lowercase unless it is a proper noun.
    ❌ Двозонний обігрів: Забезпечує…   ✅ Двозонний обігрів: забезпечує…
E5. Drop English Title Case in Ukrainian headings — sentence case only.
E6. No space inside formatting tags: <b>Мітка:</b> текст — not <b>Мітка: </b>.
E7. Ranges in visible text: en-dash – (U+2013), no spaces, unit stated once at the end.
    ✅ 100–240 В   ✅ 15–30 °C   ❌ 15 °C - 30 °C
E8. Non-breaking space (U+00A0) between a number and its unit: 220 В, 0,4 мм, 30 °C. A unit must
    never wrap onto its own line.
E9. Decimal comma: 0,4 мм — never 0.4. (Thousands grouping is governed by [NUMBER FORMATTING] /
    [UNIT LOCALIZATION] in this same prompt — follow those, this guide adds nothing to them.)
E10. Dimensions use × (U+00D7): 256 × 256 × 256 мм.

[F — STRUCTURE]
F1. Preserve the tag tree exactly: same tags, same order, same nesting, same count. Do not add,
    remove, merge or split elements.
F2. Translate only human-visible text plus alt="" and title="" values. Never touch class, id, href,
    src, data-*, or inline styles.
F3. Table headers are <th>текст</th>. Never <td><b>текст</b></td>.
F4. Preserve HTML entities; escape < > & that appear in the text itself.
F5. Never output Markdown when the source is HTML.
F6. Counts must match: if the intro says «три режими», the list has exactly three items — and the
    same count as the source.
F7. Headings must match their body: a heading naming a feature is followed by text about that
    feature.

[SELF-CHECK — run silently before returning, fix what fails, report nothing]
1. Sentence by sentence: does every source fact appear? anything added? → fix
2. Any number, unit or model name altered? → restore from the source
3. Any дієприслівниковий зворот inside a list? → rewrite
4. Every list internally parallel in modality? → unify
5. Any Latin brand declined or transliterated? → restore
6. Same term rendered two ways anywhere? → unify to the first occurrence
7. Any ' or " , spaced/hyphenated range, "0.4", capital after a colon in a list item? → normalize
8. Any typographic character introduced inside a URL, href, src, filename or version string?
   → restore the ASCII original
9. Tag count and nesting identical to the source? → restore`;

/*
 * WHY E9 SAYS NOTHING ABOUT THOUSANDS GROUPING.
 *
 * «25 000» (non-breaking space) is correct Ukrainian typography and the supplied source text asked
 * for it. This guide neither repeats nor contradicts it.
 *
 * The host already rules on it in the same prompt, so any statement here would be a second voice on
 * one question: the Translator carries UNIT_LOCALIZATION_RULES in the very block this guide is
 * appended to, and elsewhere in the app NUMBER_FORMAT_RULES (inside MASTER_SYSTEM_PROMPT) mandates
 * "uk-UA: thousands non-breaking space → 1 234 567,89". An earlier draft of E9 said "do NOT insert
 * any thousands separator" and contradicted that outright, leaving the model to pick a winner.
 * Deferring is the only option that leaves exactly one instruction standing.
 *
 * A second reason applies wherever this text feeds an artifact the generation pipeline post-
 * processes: stripThousandsSeparators() (number-format-fixer.ts) deletes NBSP/thin-space thousands
 * groups downstream, so the instruction would be undone anyway. Making the stripper locale-aware is
 * BLOCKED rather than merely unattempted — specs-grounding.ts runs that same function over BOTH
 * sides of its comparison, and its own comment records the invariant ("never match once the HTML
 * side had its separators stripped and the source side didn't"). Letting uk-UA keep «25 000» while
 * a pasted English sheet still says "25,000" desynchronizes the two sides and breaks the numeric
 * anchor, one of only three grounding signals.
 */

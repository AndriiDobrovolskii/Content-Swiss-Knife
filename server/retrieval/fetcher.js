// server/retrieval/fetcher.js
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const FETCH_TIMEOUT_MS = 15000;
const JINA_TIMEOUT_MS = 30000;        // Jina renders JS — allow more time
const MAX_MAIN_TEXT = 12000;          // cap on extracted body text only
const MIN_USABLE_TEXT = 200;          // below this, fall back to body text

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en;q=0.9'
};

// Direct fetch. Returns HTML on success, or null on ANY failure so the caller
// can fall through to Jina. A 403/503 usually means anti-bot, not a code error.
async function fetchHtmlDirect(url) {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Fallback: Jina Reader renders the page in a real browser and returns clean text.
// Optional JINA_API_KEY raises the rate limit (server-side env only — never in the bundle).
// NOTE: Jina respects site anti-bot blocks; it does not circumvent them.
async function fetchViaJina(url) {
  try {
    const headers = { 'Accept': 'text/plain' };
    if (process.env.JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
    }
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers,
      signal: AbortSignal.timeout(JINA_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length >= MIN_USABLE_TEXT ? text : null;
  } catch {
    return null;
  }
}

// (1) Structured data: schema.org/Product JSON-LD first, then Open Graph / meta fallback.
function extractStructured($) {
  const fields = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const json = JSON.parse(raw);
      const nodes = Array.isArray(json) ? json : (json['@graph'] || [json]);
      for (const node of nodes) {
        const t = node?.['@type'];
        const isProduct = t === 'Product' || (Array.isArray(t) && t.includes('Product'));
        if (!isProduct) continue;

        fields.name ??= node.name;
        fields.sku ??= node.sku;
        fields.brand ??= typeof node.brand === 'string' ? node.brand : node.brand?.name;
        fields.description ??= node.description;

        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offer) {
          fields.price ??= offer.price;
          fields.currency ??= offer.priceCurrency;
        }
        if (Array.isArray(node.additionalProperty)) {
          fields.specs ??= node.additionalProperty
            .filter(p => p?.name && p?.value != null)
            .map(p => `${p.name}: ${p.value}`)
            .join('\n');
        }
      }
    } catch {
      /* ignore malformed JSON-LD blocks; continue with the rest */
    }
  });

  // Open Graph / meta fallback
  fields.name ??= $('meta[property="og:title"]').attr('content');
  fields.description ??=
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content');

  return fields;
}

// (2) Main readable content via Mozilla Readability (Firefox reader-mode algorithm).
function extractMainText(html) {
  try {
    const { document } = parseHTML(html);
    const article = new Readability(document).parse();
    if (article?.textContent) {
      return article.textContent.replace(/\s{2,}/g, ' ').trim();
    }
  } catch {
    /* fall through to cheerio fallback */
  }
  return '';
}

// (3) Cheerio body-text fallback — still far better than regex: drops chrome elements.
function fallbackBodyText($) {
  $('script, style, noscript, nav, footer, header, aside, form, svg').remove();
  const text = $('main').text() || $('article').text() || $('body').text() || '';
  return text.replace(/\s{2,}/g, ' ').trim();
}

function assemble(fields, mainText) {
  const head = [];
  if (fields.name) head.push(`Product: ${fields.name}`);
  if (fields.brand) head.push(`Brand: ${fields.brand}`);
  if (fields.sku) head.push(`SKU: ${fields.sku}`);
  if (fields.price) {
    head.push(`Price: ${fields.price}${fields.currency ? ' ' + fields.currency : ''}`);
  }
  if (fields.specs) head.push(`Specifications:\n${fields.specs}`);
  if (fields.description) head.push(`Summary:\n${fields.description}`);

  const header = head.length ? head.join('\n') + '\n\n---\n\n' : '';
  const body = (mainText || '').slice(0, MAX_MAIN_TEXT);
  return (header + body).trim();
}

export async function fetchUrl(url) {
  // 1) Direct fetch + full structured pipeline (fast path; covers own stores).
  const html = await fetchHtmlDirect(url);
  if (html) {
    const $ = cheerio.load(html);
    const fields = extractStructured($);
    let mainText = extractMainText(html);
    if (mainText.length < MIN_USABLE_TEXT) mainText = fallbackBodyText($);

    const result = assemble(fields, mainText);
    // Accept if we got solid structured data OR enough body text. A short result
    // with no structured fields usually means a JS-only shell — fall through to Jina.
    const hasStructured = !!(fields.name && (fields.specs || fields.description));
    if (result && (hasStructured || mainText.length >= MIN_USABLE_TEXT)) {
      return result;
    }
  }

  // 2) Fallback: Jina Reader (different network fingerprint + JS rendering).
  const jinaText = await fetchViaJina(url);
  if (jinaText) return jinaText.slice(0, MAX_MAIN_TEXT + 2000);

  // 3) Both failed — clear, actionable message surfaced to the user.
  throw new Error(
    `Could not retrieve content from ${url}. The site likely blocks automated access or ` +
    `renders entirely via JavaScript. Try the PDF/Markdown source, or paste the content manually.`
  );
}

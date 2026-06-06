// server/retrieval/fetcher.js
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const FETCH_TIMEOUT_MS = 15000;
const MAX_MAIN_TEXT = 12000;          // cap on extracted body text only
const MIN_USABLE_TEXT = 200;          // below this, fall back to body text

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en;q=0.9'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.text();
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
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const fields = extractStructured($);
  let mainText = extractMainText(html);
  if (mainText.length < MIN_USABLE_TEXT) {
    mainText = fallbackBodyText($);
  }

  const result = assemble(fields, mainText);
  if (!result) {
    throw new Error(`No extractable content at ${url}`);
  }
  return result;
}

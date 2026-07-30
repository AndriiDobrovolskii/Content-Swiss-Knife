/**
 * derive-ctx.mjs
 *
 * Reconstructs a RenderContext from an accepted artifact, for the reconciliation corpus.
 *
 *   node test/tools/derive-ctx.mjs <artifact.html> <imageBaseUrl> <storeName>
 *
 * WHY A TOOL AND NOT A ONE-OFF: the corpus is two items today and has to reach six. Six hand
 * parses of a URL is six chances to put a folder in the wrong field, and the failure would look
 * like a renderer bug rather than a typo in a fixture.
 *
 * WHY imageBaseUrl IS AN ARGUMENT: it belongs to STORE_REGISTRY (src/prompt-core/constants.ts),
 * which is TypeScript this plain-node script cannot import. Passing it in keeps the registry the
 * single source of truth and makes the human-supplied part explicit in the command that produced
 * the file, rather than a second copy of the map rotting in here.
 *
 * KNOWN AMBIGUITY, and it is real: figureSrc() builds `{base}{brand}/{model}/{file}`, so a path
 * with three folder segments after the base has no unique split — brand="a", model="b/c" and
 * brand="a/b", model="c" render byte-identically. This tool takes the FIRST segment as the brand
 * and leaves the remainder as the model. Rendering is unaffected; the ctx simply is not uniquely
 * determined by the artifact, which matters only if someone later reads brandFolder as a fact
 * about the product rather than about the URL.
 */
import { readFileSync } from 'node:fs';

const [artifactPath, imageBaseUrl, storeName] = process.argv.slice(2);

if (!artifactPath || !imageBaseUrl) {
  console.error('usage: node test/tools/derive-ctx.mjs <artifact.html> <imageBaseUrl> [storeName]');
  process.exit(1);
}

const html = readFileSync(artifactPath, 'utf8');
const srcs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);

if (srcs.length === 0) {
  // An image-free artifact is legitimate (Expert-3DPrinter ships none by policy), but then there
  // is nothing to derive and the caller should say so rather than get a silent empty context.
  console.error(`${artifactPath}: no <img src> found — nothing to derive.`);
  process.exit(2);
}

const outside = srcs.filter(s => !s.startsWith(imageBaseUrl));
if (outside.length > 0) {
  // Every image must sit under the store's base, or the base passed in is the wrong one and every
  // folder derived below would be garbage.
  console.error(`${artifactPath}: ${outside.length} image(s) do not start with the given base.\n  e.g. ${outside[0]}`);
  process.exit(3);
}

const folders = srcs.map(s => s.slice(imageBaseUrl.length).split('/').slice(0, -1).join('/'));
const distinct = [...new Set(folders)];
if (distinct.length > 1) {
  console.error(`${artifactPath}: images live in ${distinct.length} different folders: ${distinct.join(', ')}`);
  process.exit(4);
}

const [brandFolder, ...rest] = distinct[0].split('/').filter(Boolean);
const ctx = {
  imageBaseUrl,
  ...(brandFolder ? { brandFolder } : {}),
  ...(rest.length ? { modelFolder: rest.join('/') } : {}),
  ...(storeName ? { storeName } : {}),
};

console.log(JSON.stringify(ctx, null, 2));
